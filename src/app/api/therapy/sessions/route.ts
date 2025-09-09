import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import {
  requireRole,
  auditLog,
  validateInput,
  errorResponse,
  successResponse,
  paginatedResponse,
  verifyClientConsent,
} from '@/lib/api-middleware';
import { encryptJSON, decryptJSON } from '@/lib/encryption-exports';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schemas
const getSessionsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  clientId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  sortBy: z.enum(['date', 'client', 'duration']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSessionSchema = z.object({
  clientId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180), // 15 min to 3 hours
  type: z.enum(['individual', 'couples', 'family', 'group', 'teletherapy']),
  location: z.enum(['office', 'virtual', 'home_visit']).default('office'),
  goals: z.array(z.string()).optional(),
  preparationNotes: z.string().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    endDate: z.string().datetime(),
    dayOfWeek: z.number().min(0).max(6),
  }).optional(),
});

const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  actualStart: z.string().datetime().optional(),
  actualEnd: z.string().datetime().optional(),
  sessionNotes: z.object({
    presenting_issues: z.string(),
    interventions_used: z.array(z.string()),
    client_response: z.string(),
    homework_assigned: z.string().optional(),
    risk_assessment: z.object({
      suicidal_ideation: z.boolean(),
      homicidal_ideation: z.boolean(),
      self_harm: z.boolean(),
      substance_use: z.boolean(),
      notes: z.string().optional(),
    }),
    progress_indicators: z.array(z.string()),
    plan_for_next_session: z.string(),
  }).optional(),
  billing: z.object({
    cpt_code: z.string(),
    units: z.number(),
    modifier: z.string().optional(),
    diagnosis_codes: z.array(z.string()),
  }).optional(),
});

// GET /api/therapy/sessions - Get therapy sessions
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 30, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params = validateInput(getSessionsSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      clientId: searchParams.get('clientId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    }) as any;
    
    // Build query filters
    const where: any = {
      professionalId: (session as any).user.id,
      type: { in: ['individual', 'couples', 'family', 'group', 'teletherapy'] },
    };
    
    if (params.clientId) {
      // Verify consent for specific client
      const hasConsent = await verifyClientConsent((session as any).user.id, params.clientId);
      if (!hasConsent) {
        return errorResponse(null, 'No consent to access this client');
      }
      where.userId = params.clientId;
    }
    
    if (params.status) {
      where.status = params.status;
    }
    
    if (params.startDate || params.endDate) {
      where.scheduledAt = {};
      if (params.startDate) {
        where.scheduledAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.scheduledAt.lte = new Date(params.endDate);
      }
    }
    
    // Get total count
    const total = await prisma.appointment.count({ where });
    
    // Get sessions with pagination
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: params.sortBy === 'date'
        ? { scheduledAt: params.sortOrder }
        : params.sortBy === 'duration'
        ? { duration: params.sortOrder }
        : { scheduledAt: params.sortOrder },
    });
    
    // Decrypt session notes
    const sessions = appointments.map(appointment => {
      let decryptedNotes = null;
      
      if (appointment.encryptedNotes) {
        try {
          decryptedNotes = decryptJSON(appointment.encryptedNotes as string);
        } catch (error) {
          console.error('Failed to decrypt session notes:', error);
        }
      }
      
      return {
        id: appointment.id,
        clientId: appointment.userId,
        clientName: `${appointment.User.firstName || ''} ${appointment.User.lastName || ''}`.trim() || 'Anonymous',
        clientEmail: appointment.User.email,
        clientAvatar: appointment.User.avatarUrl,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        meetingUrl: appointment.meetingUrl,
        notes: decryptedNotes,
        createdAt: appointment.createdAt,
      };
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_sessions',
      'therapy_sessions',
      undefined,
      { count: sessions.length, page: params.page, filters: params },
      'success',
      req
    );
    
    return paginatedResponse(
      sessions,
      total,
      params.page,
      params.limit,
      'Sessions retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve sessions');
  }
}

// POST /api/therapy/sessions - Create new therapy session
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(createSessionSchema, body) as any;
    
    // Verify consent for client
    const hasConsent = await verifyClientConsent((session as any).user.id, data.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to schedule session with this client');
    }
    
    // Check for scheduling conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: (session as any).user.id,
        scheduledAt: {
          gte: new Date(new Date(data.scheduledAt).getTime() - data.duration * 60000),
          lte: new Date(new Date(data.scheduledAt).getTime() + data.duration * 60000),
        },
        status: { in: ['scheduled', 'in_progress'] },
      },
    });
    
    if (conflictingAppointment) {
      return errorResponse(null, 'Time slot conflicts with another appointment');
    }
    
    // Create session(s)
    const sessions = [];
    
    if (data.recurringPattern) {
      // Create recurring sessions
      const startDate = new Date(data.scheduledAt);
      const endDate = new Date(data.recurringPattern.endDate);
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Encrypt preparation notes
        const encryptedNotes = data.preparationNotes
          ? encryptJSON({
              notes: data.preparationNotes,
              goals: data.goals,
              location: data.location,
              createdBy: (session as any).user.id,
            })
          : null;
        
        const appointment = await (prisma.appointment as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            userId: data.clientId,
            professionalId: (session as any).user.id,
            scheduledAt: new Date(currentDate),
            duration: data.duration,
            type: data.type,
            status: 'scheduled',
            encryptedNotes,
            meetingUrl: data.location === 'virtual' 
              ? `https://therapy.astralcore.com/session/${Date.now()}`
              : null,
          },
        });
        
        sessions.push(appointment);
        
        // Move to next occurrence
        switch (data.recurringPattern.frequency) {
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'biweekly':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        }
      }
    } else {
      // Create single session
      const encryptedNotes = data.preparationNotes
        ? encryptJSON({
            notes: data.preparationNotes,
            goals: data.goals,
            location: data.location,
            createdBy: (session as any).user.id,
          })
        : null;
      
      const appointment = await (prisma.appointment as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: data.clientId,
          professionalId: (session as any).user.id,
          scheduledAt: new Date(data.scheduledAt),
          duration: data.duration,
          type: data.type,
          status: 'scheduled',
          encryptedNotes,
          meetingUrl: data.location === 'virtual'
            ? `https://therapy.astralcore.com/session/${Date.now()}`
            : null,
        },
      });
      
      sessions.push(appointment);
    }
    
    // Create notifications for client
    await Promise.all(
      sessions.map(appointment =>
        (prisma.notification as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            userId: data.clientId,
            type: 'appointment_scheduled',
            title: 'Therapy Session Scheduled',
            message: `Your ${data.type} therapy session is scheduled for ${new Date(appointment.scheduledAt).toLocaleString()}`,
            isPriority: false,
            metadata: {
              appointmentId: appointment.id,
              therapistId: (session as any).user.id,
            },
          },
        })
      )
    );
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'create_session',
      'therapy_sessions',
      sessions[0].id,
      {
        clientId: data.clientId,
        sessionsCreated: sessions.length,
        type: data.type,
        recurring: !!data.recurringPattern,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        sessions: sessions.map(s => ({
          id: s.id,
          scheduledAt: s.scheduledAt,
          duration: s.duration,
          type: s.type,
          status: s.status,
        })),
      },
      `${sessions.length} session(s) scheduled successfully`,
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create session');
  }
}

// PUT /api/therapy/sessions - Update therapy session
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(updateSessionSchema, body) as any;
    
    // Get existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.sessionId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Session not found');
    }
    
    if (appointment.professionalId !== (session as any).user.id) {
      return errorResponse(null, 'Unauthorized to update this session');
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.status) {
      updateData.status = data.status;
    }
    
    // Handle session notes encryption
    if (data.sessionNotes) {
      // Check for high-risk indicators
      const riskAssessment = data.sessionNotes.risk_assessment;
      if (riskAssessment && 
          (riskAssessment.suicidal_ideation || 
           riskAssessment.homicidal_ideation || 
           riskAssessment.self_harm)) {
        
        // Create safety alert
        await (prisma.safetyAlert as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            type: 'high_risk_client',
            severity: 'critical',
            userId: appointment.userId,
            context: 'therapy_session',
            indicators: [
              riskAssessment.suicidal_ideation && 'suicidal_ideation',
              riskAssessment.homicidal_ideation && 'homicidal_ideation',
              riskAssessment.self_harm && 'self_harm',
            ].filter(Boolean) as string[],
            handled: false,
            actions: [],
            notes: riskAssessment.notes || null,
          },
        });
        
        // Create high-priority notification for crisis team
        await (prisma.notification as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            userId: (session as any).user.id,
            type: 'crisis_alert',
            title: 'High Risk Client Alert',
            message: 'Immediate attention required for client risk assessment',
            isPriority: true,
            metadata: {
              clientId: appointment.userId,
              sessionId: appointment.id,
              riskFactors: [
                riskAssessment.suicidal_ideation && 'suicidal_ideation',
                riskAssessment.homicidal_ideation && 'homicidal_ideation',
                riskAssessment.self_harm && 'self_harm',
              ].filter(Boolean),
            },
          },
        });
      }
      
      // Encrypt and store session notes
      const existingNotes = appointment.encryptedNotes
        ? decryptJSON(appointment.encryptedNotes as string)
        : {};
      
      const updatedNotes = {
        ...existingNotes,
        sessionNotes: data.sessionNotes,
        billing: data.billing,
        lastUpdatedBy: (session as any).user.id,
        lastUpdatedAt: new Date().toISOString(),
      };
      
      updateData.encryptedNotes = encryptJSON(updatedNotes);
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: data.sessionId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
    
    // Audit log with HIPAA compliance
    await (auditLog as any)(
      (session as any).user.id,
      'update_session',
      'therapy_sessions',
      data.sessionId,
      {
        status: data.status,
        hasNotes: !!data.sessionNotes,
        hasBilling: !!data.billing,
        riskAssessment: data.sessionNotes?.risk_assessment 
          ? {
              hasRisk: data.sessionNotes.risk_assessment.suicidal_ideation ||
                       data.sessionNotes.risk_assessment.homicidal_ideation ||
                       data.sessionNotes.risk_assessment.self_harm,
            }
          : null,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        sessionId: updatedAppointment.id,
        status: updatedAppointment.status,
        updatedAt: updatedAppointment.updatedAt,
      },
      'Session updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update session');
  }
}

// DELETE /api/therapy/sessions - Cancel therapy session
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 10, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Get session ID from query params
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const reason = req.nextUrl.searchParams.get('reason') || 'therapist_cancelled';
    
    if (!sessionId) {
      return errorResponse(null, 'Session ID is required');
    }
    
    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: sessionId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Session not found');
    }
    
    if (appointment.professionalId !== (session as any).user.id) {
      return errorResponse(null, 'Unauthorized to cancel this session');
    }
    
    // Cancel appointment (don't delete for audit trail)
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: sessionId },
      data: {
        status: 'cancelled',
        encryptedNotes: encryptJSON({
          cancellation: {
            reason,
            cancelledBy: (session as any).user.id,
            cancelledAt: new Date().toISOString(),
          },
        }),
        updatedAt: new Date(),
      },
    });
    
    // Notify client
    await (prisma.notification as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: appointment.userId,
        type: 'appointment_cancelled',
        title: 'Therapy Session Cancelled',
        message: `Your therapy session scheduled for ${new Date(appointment.scheduledAt).toLocaleString()} has been cancelled`,
        isPriority: true,
        metadata: {
          appointmentId: sessionId,
          reason,
        },
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'cancel_session',
      'therapy_sessions',
      sessionId,
      {
        clientId: appointment.userId,
        scheduledAt: appointment.scheduledAt,
        reason,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        sessionId: cancelledAppointment.id,
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      'Session cancelled successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to cancel session');
  }
}