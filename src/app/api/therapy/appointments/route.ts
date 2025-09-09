import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import {
  requireRole,
  auditLog,
  validateInput,
  errorResponse,
  successResponse,
  paginatedResponse,
} from '@/lib/api-middleware';
import { encryptJSON, decryptJSON } from '@/lib/encryption-exports';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schemas
const getAppointmentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  clientId: z.string().uuid().optional(),
  view: z.enum(['day', 'week', 'month']).default('week'),
});

const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180),
  type: z.enum(['initial', 'follow_up', 'crisis', 'group', 'teletherapy']),
  location: z.enum(['office', 'virtual', 'phone']).default('office'),
  notes: z.string().optional(),
  recurring: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    endDate: z.string().datetime(),
  }).optional(),
  reminders: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
    timing: z.array(z.enum(['24h', '2h', '15m'])).default(['24h', '2h']),
  }).optional(),
});

const updateAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(180).optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
});

const confirmAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  confirmed: z.boolean(),
  message: z.string().optional(),
});

// GET /api/therapy/appointments
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 30, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    const sessionUser = (session as any).user;
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params = validateInput(getAppointmentsSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      clientId: searchParams.get('clientId'),
      view: searchParams.get('view'),
    });
    
    // Calculate date range based on view
    let dateRange = { start: new Date(), end: new Date() };
    const now = new Date();
    
    if (params.startDate && params.endDate) {
      dateRange.start = new Date(params.startDate);
      dateRange.end = new Date(params.endDate);
    } else {
      switch (params.view) {
        case 'day':
          dateRange.start = new Date(now.setHours(0, 0, 0, 0));
          dateRange.end = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          dateRange = { start: weekStart, end: weekEnd };
          break;
        case 'month':
          dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
          dateRange.end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
      }
    }
    
    // Build query filters
    const where: any = {
      professionalId: sessionUser.id,
      scheduledAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };
    
    if (params.status) {
      where.status = params.status;
    }
    
    if (params.clientId) {
      where.userId = params.clientId;
    }
    
    // Get total count
    const total = await prisma.appointment.count({ where });
    
    // Get appointments with pagination
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            UserProfile: {
              select: {
                preferredCommunication: true,
                notificationSettings: true,
              },
            },
          },
        },
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { scheduledAt: 'asc' },
    });
    
    // Decrypt notes and format appointments
    const formattedAppointments = appointments.map(apt => {
      let decryptedNotes = null;
      
      if (apt.encryptedNotes) {
        try {
          decryptedNotes = decryptJSON(apt.encryptedNotes as string);
        } catch (error) {
          console.error('Failed to decrypt appointment notes:', error);
        }
      }
      
      return {
        id: apt.id,
        clientId: apt.userId,
        clientName: `${apt.User.firstName || ''} ${apt.User.lastName || ''}`.trim() || 'Anonymous',
        clientEmail: apt.User.email,
        clientPhone: apt.User.phoneNumber,
        clientAvatar: apt.User.avatarUrl,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
        meetingUrl: apt.meetingUrl,
        notes: decryptedNotes?.notes,
        location: decryptedNotes?.location || 'office',
        confirmed: decryptedNotes?.confirmed || false,
        reminders: decryptedNotes?.reminders,
        createdAt: apt.createdAt,
      };
    });
    
    // Calculate availability gaps for scheduling
    const availabilityGaps = calculateAvailabilityGaps(appointments, dateRange);
    
    // Get statistics
    const stats = {
      total,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      noShow: appointments.filter(a => a.status === 'no_show').length,
    };
    
    // Audit log
    await (auditLog as any)(
      sessionUser.id,
      'view_appointments',
      'therapy_appointments',
      undefined,
      { 
        count: formattedAppointments.length,
        dateRange,
        view: params.view,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        appointments: formattedAppointments,
        stats,
        availabilityGaps,
        pagination: {
          total,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(total / params.limit),
        },
      },
      'Appointments retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve appointments');
  }
}

// POST /api/therapy/appointments
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    const sessionUser = (session as any).user;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(createAppointmentSchema, body);
    
    // Check for scheduling conflicts
    const conflictWindow = 15; // 15 minutes buffer
    const startTime = new Date(data.scheduledAt);
    const endTime = new Date(startTime.getTime() + data.duration * 60000);
    
    const conflicts = await prisma.appointment.findMany({
      where: {
        professionalId: sessionUser.id,
        status: { in: ['scheduled', 'confirmed'] },
        OR: [
          {
            scheduledAt: {
              gte: new Date(startTime.getTime() - conflictWindow * 60000),
              lte: endTime,
            },
          },
          {
            AND: [
              { scheduledAt: { lte: startTime } },
              {
                scheduledAt: {
                  gte: new Date(startTime.getTime() - 180 * 60000), // Max appointment duration
                },
              },
            ],
          },
        ],
      },
    });
    
    if (conflicts.length > 0) {
      return errorResponse(null, 'Time slot conflicts with existing appointment');
    }
    
    // Create appointments (handle recurring)
    const appointments = [];
    
    if (data.recurring) {
      const endDate = new Date(data.recurring.endDate);
      const currentDate = new Date(data.scheduledAt);
      
      while (currentDate <= endDate) {
        const encryptedNotes = encryptJSON({
          notes: data.notes,
          location: data.location,
          reminders: data.reminders,
          recurring: true,
          seriesId: `${sessionUser.id}_${Date.now()}`,
          createdBy: sessionUser.id,
        });
        
        const appointment = await (prisma.appointment as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            userId: data.clientId,
            professionalId: sessionUser.id,
            scheduledAt: new Date(currentDate),
            duration: data.duration,
            type: data.type,
            status: 'scheduled',
            encryptedNotes,
            meetingUrl: data.location === 'virtual'
              ? `https://therapy.astralcore.com/room/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        
        appointments.push(appointment);
        
        // Move to next occurrence
        switch (data.recurring.frequency) {
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
      // Single appointment
      const encryptedNotes = encryptJSON({
        notes: data.notes,
        location: data.location,
        reminders: data.reminders,
        createdBy: sessionUser.id,
      });
      
      const appointment = await (prisma.appointment as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: data.clientId,
          professionalId: sessionUser.id,
          scheduledAt: new Date(data.scheduledAt),
          duration: data.duration,
          type: data.type,
          status: 'scheduled',
          encryptedNotes,
          meetingUrl: data.location === 'virtual'
            ? `https://therapy.astralcore.com/room/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      appointments.push(appointment);
    }
    
    // Schedule reminders
    for (const appointment of appointments) {
      if (data.reminders?.email || data.reminders?.push) {
        for (const timing of data.reminders.timing || ['24h', '2h']) {
          const reminderTime = new Date(appointment.scheduledAt);
          
          switch (timing) {
            case '24h':
              reminderTime.setHours(reminderTime.getHours() - 24);
              break;
            case '2h':
              reminderTime.setHours(reminderTime.getHours() - 2);
              break;
            case '15m':
              reminderTime.setMinutes(reminderTime.getMinutes() - 15);
              break;
          }
          
          if (reminderTime > new Date()) {
            await (prisma.notification as any).create({
              data: {
                id: generatePrismaCreateFields().id,
                userId: data.clientId,
                type: 'appointment_reminder',
                title: 'Upcoming Therapy Appointment',
                message: `You have a therapy appointment ${timing === '24h' ? 'tomorrow' : timing === '2h' ? 'in 2 hours' : 'in 15 minutes'}`,
                isPriority: timing === '15m',
                metadata: {
                  appointmentId: appointment.id,
                  scheduledAt: appointment.scheduledAt,
                  duration: appointment.duration,
                  type: appointment.type,
                  location: data.location,
                  meetingUrl: appointment.meetingUrl,
                },
                createdAt: reminderTime,
              },
            });
          }
        }
      }
    }
    
    // Send immediate confirmation
    await (prisma.notification as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: data.clientId,
        type: 'appointment_scheduled',
        title: 'Appointment Scheduled',
        message: `Your therapy appointment has been scheduled for ${new Date(data.scheduledAt).toLocaleString()}`,
        isPriority: false,
        metadata: {
          appointmentId: appointments[0].id,
          appointmentsCount: appointments.length,
          recurring: !!data.recurring,
        },
      },
    });
    
    // Audit log
    await (auditLog as any)(
      sessionUser.id,
      'create_appointment',
      'therapy_appointments',
      appointments[0].id,
      {
        clientId: data.clientId,
        appointmentsCreated: appointments.length,
        type: data.type,
        recurring: !!data.recurring,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        appointments: appointments.map(apt => ({
          id: apt.id,
          scheduledAt: apt.scheduledAt,
          duration: apt.duration,
          type: apt.type,
          status: apt.status,
          meetingUrl: apt.meetingUrl,
        })),
      },
      `${appointments.length} appointment(s) scheduled successfully`,
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create appointment');
  }
}

// PUT /api/therapy/appointments
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    const sessionUser = (session as any).user;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(updateAppointmentSchema, body);
    
    // Get existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Appointment not found');
    }
    
    if (appointment.professionalId !== sessionUser.id) {
      return errorResponse(null, 'Unauthorized to update this appointment');
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.scheduledAt) {
      // Check for conflicts if rescheduling
      const conflicts = await prisma.appointment.findMany({
        where: {
          professionalId: sessionUser.id,
          id: { not: data.appointmentId },
          status: { in: ['scheduled', 'confirmed'] },
          scheduledAt: {
            gte: new Date(new Date(data.scheduledAt).getTime() - 15 * 60000),
            lte: new Date(new Date(data.scheduledAt).getTime() + (data.duration || appointment.duration) * 60000),
          },
        },
      });
      
      if (conflicts.length > 0) {
        return errorResponse(null, 'New time conflicts with existing appointment');
      }
      
      updateData.scheduledAt = new Date(data.scheduledAt);
    }
    
    if (data.duration) {
      updateData.duration = data.duration;
    }
    
    if (data.status) {
      updateData.status = data.status;
      
      // Handle status-specific actions
      if (data.status === 'cancelled' || data.status === 'no_show') {
        // Store cancellation reason
        const existingNotes = appointment.encryptedNotes
          ? decryptJSON(appointment.encryptedNotes as string)
          : {};
        
        existingNotes.cancellation = {
          status: data.status,
          reason: data.cancelReason,
          cancelledBy: sessionUser.id,
          cancelledAt: new Date().toISOString(),
        };
        
        updateData.encryptedNotes = encryptJSON(existingNotes);
        
        // Notify client
        await (prisma.notification as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            userId: appointment.userId,
            type: data.status === 'cancelled' ? 'appointment_cancelled' : 'appointment_no_show',
            title: data.status === 'cancelled' ? 'Appointment Cancelled' : 'Missed Appointment',
            message: data.status === 'cancelled'
              ? `Your appointment has been cancelled. ${data.cancelReason || ''}`
              : 'You missed your scheduled appointment. Please contact us to reschedule.',
            isPriority: true,
            metadata: {
              appointmentId: appointment.id,
              reason: data.cancelReason,
            },
          },
        });
      }
    }
    
    if (data.notes !== undefined) {
      const existingNotes = appointment.encryptedNotes
        ? decryptJSON(appointment.encryptedNotes as string)
        : {};
      
      existingNotes.notes = data.notes;
      existingNotes.lastUpdatedBy = sessionUser.id;
      existingNotes.lastUpdatedAt = new Date().toISOString();
      
      updateData.encryptedNotes = encryptJSON(existingNotes);
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      sessionUser.id,
      'update_appointment',
      'therapy_appointments',
      data.appointmentId,
      {
        clientId: appointment.userId,
        changes: Object.keys(updateData),
        status: data.status,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        appointmentId: updatedAppointment.id,
        status: updatedAppointment.status,
        scheduledAt: updatedAppointment.scheduledAt,
        updatedAt: updatedAppointment.updatedAt,
      },
      'Appointment updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update appointment');
  }
}

// DELETE /api/therapy/appointments
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 10, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    const sessionUser = (session as any).user;
    
    // Get appointment ID and cancellation reason
    const appointmentId = req.nextUrl.searchParams.get('appointmentId');
    const reason = req.nextUrl.searchParams.get('reason') || 'Cancelled by therapist';
    const cancelSeries = req.nextUrl.searchParams.get('cancelSeries') === 'true';
    
    if (!appointmentId) {
      return errorResponse(null, 'Appointment ID is required');
    }
    
    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Appointment not found');
    }
    
    if (appointment.professionalId !== sessionUser.id) {
      return errorResponse(null, 'Unauthorized to cancel this appointment');
    }
    
    // Handle series cancellation if requested
    let cancelledCount = 0;
    
    if (cancelSeries && appointment.encryptedNotes) {
      const notes = decryptJSON(appointment.encryptedNotes as string);
      
      if (notes.seriesId) {
        // Cancel all future appointments in the series
        const seriesAppointments = await prisma.appointment.findMany({
          where: {
            professionalId: sessionUser.id,
            scheduledAt: { gte: new Date() },
            status: { in: ['scheduled', 'confirmed'] },
          },
        });
        
        for (const apt of seriesAppointments) {
          if (apt.encryptedNotes) {
            const aptNotes = decryptJSON(apt.encryptedNotes as string);
            if (aptNotes.seriesId === notes.seriesId) {
              await prisma.appointment.update({
                where: { id: apt.id },
                data: {
                  status: 'cancelled',
                  encryptedNotes: encryptJSON({
                    ...aptNotes,
                    cancellation: {
                      reason,
                      cancelledBy: sessionUser.id,
                      cancelledAt: new Date().toISOString(),
                      seriesCancellation: true,
                    },
                  }),
                },
              });
              cancelledCount++;
            }
          }
        }
      }
    } else {
      // Cancel single appointment
      const existingNotes = appointment.encryptedNotes
        ? decryptJSON(appointment.encryptedNotes as string)
        : {};
      
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'cancelled',
          encryptedNotes: encryptJSON({
            ...existingNotes,
            cancellation: {
              reason,
              cancelledBy: sessionUser.id,
              cancelledAt: new Date().toISOString(),
            },
          }),
        },
      });
      cancelledCount = 1;
    }
    
    // Notify client
    await (prisma.notification as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: appointment.userId,
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Your therapy appointment${cancelledCount > 1 ? 's have' : ' has'} been cancelled. Reason: ${reason}`,
        isPriority: true,
        metadata: {
          appointmentId,
          cancelledCount,
          reason,
        },
      },
    });
    
    // Audit log
    await (auditLog as any)(
      sessionUser.id,
      'cancel_appointment',
      'therapy_appointments',
      appointmentId,
      {
        clientId: appointment.userId,
        reason,
        seriesCancellation: cancelSeries,
        cancelledCount,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        appointmentId,
        cancelledCount,
        cancelledAt: new Date(),
      },
      `${cancelledCount} appointment(s) cancelled successfully`
    );
  } catch (error) {
    return errorResponse(error, 'Failed to cancel appointment');
  }
}

// Helper function to calculate availability gaps
function calculateAvailabilityGaps(appointments: any[], dateRange: { start: Date; end: Date }) {
  const gaps = [];
  const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
  
  // Sort appointments by time
  const sorted = appointments
    .filter(a => ['scheduled', 'confirmed'].includes(a.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  // Find gaps between appointments
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(sorted[i].scheduledAt);
    currentEnd.setMinutes(currentEnd.getMinutes() + sorted[i].duration);
    
    const nextStart = new Date(sorted[i + 1].scheduledAt);
    
    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / 60000;
    
    if (gapMinutes >= 30) { // Minimum 30-minute gap
      gaps.push({
        start: currentEnd,
        end: nextStart,
        duration: gapMinutes,
      });
    }
  }
  
  return gaps;
}