import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { withCrisisCounselor, withRateLimit, AuthenticatedRequest, withHelper } from '@/lib/auth-middleware-exports';
import { notifyCounselors, CrisisEvents, emitEmergencyBroadcast } from '@/lib/websocket-exports';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Escalation schema
const createEscalationSchema = z.object({
  alertId: z.string().uuid().optional(),
  reportId: z.string().uuid().optional(),
  reason: z.string().min(1).max(1000),
  urgency: z.number().min(1).max(5),
  requestedAction: z.string().min(1).max(500),
  additionalInfo: z.string().max(2000).optional(),
});

// POST /api/crisis/escalations - Create escalation
export async function POST(request: NextRequest) {
  return withHelper(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const validation = createEscalationSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.error.issues },
          { status: 400 }
        );
      }

      const data = validation.data;
      const escalatedBy = req.user!.id;

      // Verify at least one reference exists
      if (!data.alertId && !data.reportId) {
        return NextResponse.json(
          { error: 'Either alertId or reportId must be provided' },
          { status: 400 }
        );
      }

      // Create high-priority alert for escalation
      const escalationAlert = await (prisma.safetyAlert as any).create({
        data: {
          id: generatePrismaCreateFields().id,type: 'escalation',
          severity: data.urgency.toString(),
          userId: escalatedBy,
          context: `ESCALATION: ${data.reason}`,
          indicators: [
            `Urgency: ${data.urgency}`,
            `Action Required: ${data.requestedAction}`,
            data.alertId ? `Alert: ${data.alertId}` : '',
            data.reportId ? `Report: ${data.reportId}` : '',
          ].filter(Boolean),
          handled: false,
          actions: [],
          notes: data.additionalInfo,
        },
      });

      // Create priority notification for all crisis counselors
      const counselors = await prisma.user.findMany({
        where: {
          role: 'CRISIS_COUNSELOR',
          isActive: true,
        },
        select: { id: true },
      });

      await Promise.all(
        counselors.map(counselor =>
          (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: counselor.id,
              type: 'escalation',
              title: 'URGENT: Crisis Escalation',
              message: `Escalation requested: ${data.reason}`,
              isPriority: true,
              metadata: JSON.stringify({
                escalationId: escalationAlert.id,
                urgency: data.urgency,
                requestedAction: data.requestedAction,
              }),
            },
          }).catch(console.error)
        )
      );

      // Broadcast emergency if urgency is critical (5)
      if (data.urgency === 5) {
        emitEmergencyBroadcast(
          `Critical escalation: ${data.requestedAction}`,
          'critical'
        );
      }

      // Notify via WebSocket
      notifyCounselors(CrisisEvents.ALERT_UPDATED as any, {
        escalationId: escalationAlert.id,
        alertId: data.alertId,
        reportId: data.reportId,
        reason: data.reason,
        urgency: data.urgency,
        escalatedBy,
        timestamp: new Date(),
      });

      // Log escalation
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: escalatedBy,
          action: 'create_escalation',
          resource: 'safety_alert',
          resourceId: escalationAlert.id,
          details: {
            alertId: data.alertId,
            reportId: data.reportId,
            reason: data.reason,
            urgency: data.urgency,
            requestedAction: data.requestedAction,
          },
          outcome: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: escalationAlert.id,
          ...data,
          escalatedBy,
          createdAt: escalationAlert.detectedAt,
        },
        message: 'Escalation created successfully. Crisis counselors have been notified.',
        timestamp: new Date(),
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating escalation:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: req.user!.id,
          action: 'create_escalation',
          resource: 'safety_alert',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to create escalation' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/crisis/escalations/[id] - Update escalation (counselors only)
export async function PUT(request: NextRequest) {
  return withCrisisCounselor(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const escalationId = searchParams.get('id');

      if (!escalationId) {
        return NextResponse.json(
          { error: 'Escalation ID required' },
          { status: 400 }
        );
      }

      const { status, reviewNotes, actionTaken } = body;

      // Find the escalation alert
      const escalation = await prisma.safetyAlert.findUnique({
        where: { 
          id: escalationId,
          type: 'escalation',
        },
      });

      if (!escalation) {
        return NextResponse.json(
          { error: 'Escalation not found' },
          { status: 404 }
        );
      }

      // Update escalation
      const updateData: any = {
        handledBy: req.user!.id,
      };

      if (status === 'resolved' || status === 'completed') {
        updateData.handled = true;
        updateData.handledAt = new Date();
      }

      if (reviewNotes) {
        updateData.notes = (escalation.notes || '') + `\n\nReview: ${reviewNotes}`;
      }

      if (actionTaken) {
        updateData.actions = [...escalation.actions, actionTaken];
      }

      const updated = await prisma.safetyAlert.update({
        where: { id: escalationId },
        data: updateData,
      });

      // Log update
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'update_escalation',
          resource: 'safety_alert',
          resourceId: escalationId,
          details: {
            status,
            reviewNotes: reviewNotes ? 'provided' : null,
            actionTaken,
          },
          outcome: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Escalation updated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error updating escalation:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'update_escalation',
          resource: 'safety_alert',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to update escalation' },
        { status: 500 }
      );
    }
  });
}