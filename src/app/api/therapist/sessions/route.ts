import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption';
import { z } from 'zod';

// Validation schema for sessions
const SessionSchema = z.object({
  clientId: z.string(),
  scheduledTime: z.string(),
  duration: z.number().min(15).max(180), // 15 to 180 minutes
  type: z.enum(['VIDEO', 'IN_PERSON', 'PHONE']),
  sessionType: z.enum(['INDIVIDUAL', 'GROUP', 'FAMILY', 'COUPLES']),
  billingCode: z.string().optional(),
  fee: z.number().optional(),
  copay: z.number().optional(),
  notesEncrypted: z.string().optional()
});

// GET /api/therapist/sessions - Get sessions for the therapist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and verify they are a therapist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden - Therapist access only' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const upcoming = searchParams.get('upcoming') === 'true';
    const today = searchParams.get('today') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      therapistId: user.id
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    // Date filtering
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (today) {
      where.scheduledTime = {
        gte: todayStart,
        lt: todayEnd
      };
    } else if (upcoming) {
      where.scheduledTime = { gte: now };
      where.status = 'SCHEDULED';
    } else if (startDate && endDate) {
      where.scheduledTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      where.scheduledTime = { gte: new Date(startDate) };
    } else if (endDate) {
      where.scheduledTime = { lte: new Date(endDate) };
    }

    // Get sessions with pagination
    const [sessions, total] = await Promise.all([
      prisma.therapistSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: upcoming || today ? 
          { scheduledTime: 'asc' } : 
          { scheduledTime: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              clientNumber: true,
              email: true,
              phone: true,
              riskLevel: true,
              status: true
            }
          },
          sessionNotes: {
            select: {
              id: true,
              sessionDate: true,
              supervisorReview: true
            }
          }
        }
      }),
      prisma.therapistSession.count({ where })
    ]);

    // Decrypt notes for sessions if they exist
    const decryptedSessions = sessions.map(session => {
      const decrypted = { ...session };
      
      if (session.notesEncrypted) {
        try {
          decrypted.notesEncrypted = decryptApiField(session.notesEncrypted as any);
        } catch (error) {
          console.error('Failed to decrypt session notes:', error);
          decrypted.notesEncrypted = null;
        }
      }
      
      delete decrypted.notesEncrypted;
      return decrypted;
    });

    // Get statistics for dashboard
    const stats = await prisma.therapistSession.groupBy({
      by: ['status'],
      where: {
        therapistId: user.id,
        scheduledTime: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1), // Start of current month
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) // Start of next month
        }
      },
      _count: true
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      sessions: decryptedSessions,
      statistics: {
        scheduled: statsMap.scheduled || 0,
        completed: statsMap.completed || 0,
        cancelled: statsMap.cancelled || 0,
        noShow: statsMap.no_show || 0,
        total: total
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/therapist/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and verify they are a therapist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden - Therapist access only' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = SessionSchema.parse(body);

    // Verify client belongs to therapist
    const client = await prisma.therapistClient.findFirst({
      where: {
        id: validatedData.clientId,
        therapistId: user.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check for scheduling conflicts
    const scheduledTime = new Date(validatedData.scheduledTime);
    const endTime = new Date(scheduledTime.getTime() + validatedData.duration * 60000);

    const conflictingSession = await prisma.therapistSession.findFirst({
      where: {
        therapistId: user.id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          {
            AND: [
              { scheduledTime: { lte: scheduledTime } },
              { scheduledTime: { gt: new Date(scheduledTime.getTime() - validatedData.duration * 60000) } }
            ]
          },
          {
            AND: [
              { scheduledTime: { lt: endTime } },
              { scheduledTime: { gte: scheduledTime } }
            ]
          }
        ]
      }
    });

    if (conflictingSession) {
      return NextResponse.json(
        { error: 'Scheduling conflict - another session is already booked at this time' },
        { status: 409 }
      );
    }

    // Encrypt notes if provided
    const encryptedNotes = validatedData.notesEncrypted ? 
      encryptApiField(validatedData.notesEncrypted) : null;

    // Create the session
    const therapistSession = await (prisma.therapistSession as any).create({
        data: {
          id: generatePrismaCreateFields().id,therapistId: user.id,
        clientId: validatedData.clientId,
        scheduledTime: scheduledTime,
        duration: validatedData.duration,
        type: validatedData.type as any,
        sessionType: validatedData.sessionType as any,
        status: 'SCHEDULED',
        billingCode: validatedData.billingCode,
        fee: validatedData.fee,
        copay: validatedData.copay,
        notesEncrypted: encryptedNotes
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clientNumber: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Update client's next session date
    await prisma.therapistClient.update({
      where: { id: validatedData.clientId },
      data: {
        nextSessionDate: scheduledTime,
        totalSessions: { increment: 1 }
      }
    });

    // Create notification for upcoming session (if applicable)
    if (scheduledTime.getTime() - Date.now() <= 24 * 60 * 60 * 1000) { // Within 24 hours
      await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
          type: 'SESSION_REMINDER',
          title: 'Upcoming Session',
          message: `Session with ${client.firstName} ${client.lastName} scheduled for ${scheduledTime.toLocaleString()}`,
          isPriority: true,
          metadata: {
            sessionId: therapistSession.id,
            clientId: client.id
          }
        }
      });
    }

    // Log the action for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id ,
        action: 'CREATE_SESSION',
        resource: 'TherapistSession',
        resourceId: therapistSession.id,
        outcome: 'success',
        details: {
          clientId: validatedData.clientId,
          scheduledTime: scheduledTime.toISOString()
        }
      }
    });

    // Return created session
    const response = {
      ...therapistSession,
      notes: validatedData.notesEncrypted
    };
    delete response.notesEncrypted;

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// PATCH /api/therapist/sessions - Update session status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and verify they are a therapist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden - Therapist access only' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, status: newStatus } = body;

    if (!sessionId || !newStatus) {
      return NextResponse.json(
        { error: 'sessionId and status are required' },
        { status: 400 }
      );
    }

    // Verify session belongs to therapist
    const existingSession = await prisma.therapistSession.findFirst({
      where: {
        id: sessionId,
        therapistId: user.id
      },
      include: {
        client: true
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session status
    const updatedSession = await prisma.therapistSession.update({
      where: { id: sessionId },
      data: { 
        status: newStatus.toUpperCase()
      }
    });

    // Update client session counts based on status change
    if (newStatus === 'COMPLETED' && existingSession.status !== 'COMPLETED') {
      await prisma.therapistClient.update({
        where: { id: existingSession.clientId },
        data: {
          completedSessions: { increment: 1 },
          lastSessionDate: existingSession.scheduledTime
        }
      });
    } else if (newStatus === 'NO_SHOW' && existingSession.status !== 'NO_SHOW') {
      await prisma.therapistClient.update({
        where: { id: existingSession.clientId },
        data: {
          missedSessions: { increment: 1 }
        }
      });
    }

    // Log the action for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id ,
        action: 'UPDATE_SESSION_STATUS',
        resource: 'TherapistSession',
        resourceId: sessionId,
        outcome: 'success',
        details: {
          oldStatus: existingSession.status,
          newStatus: newStatus.toUpperCase()
        }
      }
    });

    return NextResponse.json({
      message: 'Session status updated successfully',
      session: updatedSession
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating session status:', error);
    return NextResponse.json(
      { error: 'Failed to update session status' },
      { status: 500 }
    );
  }
}