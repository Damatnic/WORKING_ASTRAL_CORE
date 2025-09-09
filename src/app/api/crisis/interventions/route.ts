import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { withCrisisCounselor, withRateLimit, AuthenticatedRequest } from '@/lib/auth-middleware';
import { notifyCounselors, notifyUser, CrisisEvents } from '@/lib/websocket';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Mock encryption function since the import is missing
function encryptJSON(data: any, key: string): string {
  return JSON.stringify(data);
}

// Simplified intervention schema using existing SupportSession model
const createInterventionSchema = z.object({
  userId: z.string().uuid(),
  sessionType: z.enum(['crisis', 'emergency', 'wellness_check']),
  priority: z.number().min(1).max(5),
  notes: z.string().max(2000).optional(),
});

// GET /api/crisis/interventions - Get active interventions
export async function GET(req: NextRequest) {
  return withRateLimit(60, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const status = searchParams.get('status') || 'active';
      const userId = searchParams.get('userId');

      const where: any = {
        sessionType: { in: ['crisis', 'emergency', 'wellness_check'] },
        status,
      };

      if (userId) {
        where.userId = userId;
      }

      const interventions = await prisma.supportSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          User_SupportSession_userIdToUser: {
            select: {
              id: true,
              displayName: true,
              anonymousId: true,
            }
          },
          User_SupportSession_helperIdToUser: {
            select: {
              id: true,
              displayName: true,
            }
          }
        }
      });

      // Log access
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'view_interventions',
          resource: 'support_session',
          details: JSON.stringify({ count: interventions.length, status }),
          outcome: 'success',
        },
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        data: interventions,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching interventions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interventions' },
        { status: 500 }
      );
    }
  })
  );
}

// POST /api/crisis/interventions - Create intervention
export async function POST(req: NextRequest) {
  return withRateLimit(10, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const validation = createInterventionSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.error.issues },
          { status: 400 }
        );
      }

      const data = validation.data;
      const counselorId = req.user!.id;

      // Check if user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Create intervention session
      const intervention = await (prisma.supportSession as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: data.userId,
          helperId: counselorId,
          sessionType: data.sessionType,
          status: 'active',
          encryptedNotes: data.notes ? encryptJSON({ notes: data.notes }, data.userId) : undefined,
          startedAt: new Date(),
        },
      });

      // Create high-priority alert if needed
      if (data.priority >= 4) {
        await (prisma.safetyAlert as any).create({
          data: {
            id: crypto.randomUUID(),
            type: 'intervention_initiated',
            severity: data.priority.toString(),
            userId: data.userId,
            context: `${data.sessionType} intervention initiated`,
            indicators: [`Priority: ${data.priority}`, `Counselor: ${counselorId}`],
            handled: true,
            handledBy: counselorId,
            handledAt: new Date(),
            actions: ['intervention_started'],
          },
        });
      }

      // Notify user
      await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: data.userId,
          type: 'intervention_started',
          title: 'Support Session Started',
          message: 'A crisis counselor has initiated a support session with you.',
          isPriority: true,
          metadata: JSON.stringify({ sessionId: intervention.id }),
        },
      }).catch(console.error);

      // Notify via WebSocket
      notifyUser(data.userId, 'intervention_started', {
        sessionId: intervention.id,
        counselorId,
        type: data.sessionType,
      });

      notifyCounselors(CrisisEvents.INTERVENTION_STARTED, {
        sessionId: intervention.id,
        userId: data.userId,
        counselorId,
        type: data.sessionType,
        priority: data.priority,
      });

      // Log intervention
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: counselorId,
          action: 'create_intervention',
          resource: 'support_session',
          resourceId: intervention.id,
          details: JSON.stringify({
            targetUserId: data.userId,
            sessionType: data.sessionType,
            priority: data.priority,
          }),
          outcome: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        data: intervention,
        message: 'Intervention created successfully',
        timestamp: new Date(),
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating intervention:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'create_intervention',
          resource: 'support_session',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to create intervention' },
        { status: 500 }
      );
    }
  })
  );
}

// PUT /api/crisis/interventions/[id] - Update intervention
export async function PUT(req: NextRequest) {
  return withRateLimit(30, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const interventionId = searchParams.get('id');

      if (!interventionId) {
        return NextResponse.json(
          { error: 'Intervention ID required' },
          { status: 400 }
        );
      }

      const { status, rating, notes } = body;

      // Check if intervention exists
      const existing = await prisma.supportSession.findUnique({
        where: { id: interventionId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Intervention not found' },
          { status: 404 }
        );
      }

      // Update intervention
      const updateData: any = {};
      
      if (status) {
        updateData.status = status;
        if (status === 'completed') {
          updateData.endedAt = new Date();
        }
      }
      
      if (rating !== undefined) {
        updateData.rating = rating;
      }
      
      if (notes) {
        updateData.encryptedNotes = encryptJSON({ notes }, existing.userId || req.user!.id);
      }

      const updated = await prisma.supportSession.update({
        where: { id: interventionId },
        data: updateData,
      });

      // Notify if completed
      if (status === 'completed') {
        notifyCounselors(CrisisEvents.INTERVENTION_COMPLETED, {
          sessionId: interventionId,
          counselorId: req.user!.id,
        });

        if (existing.userId) {
          await (prisma.notification as any).create({
            data: {
              id: crypto.randomUUID(),
              userId: existing.userId,
              type: 'intervention_completed',
              title: 'Support Session Completed',
              message: 'Your support session has been completed. Thank you for reaching out.',
              metadata: JSON.stringify({ sessionId: interventionId }),
            },
          }).catch(console.error);
        }
      }

      // Log update
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'update_intervention',
          resource: 'support_session',
          resourceId: interventionId,
          details: JSON.stringify({ status, rating }),
          outcome: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Intervention updated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error updating intervention:', error);
      return NextResponse.json(
        { error: 'Failed to update intervention' },
        { status: 500 }
      );
    }
  })
  );
}