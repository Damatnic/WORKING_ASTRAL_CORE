import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import {
  requireRole,
  auditLog,
  validateInput,
  errorResponse,
  successResponse,
} from '@/lib/api-middleware';
import { decryptJSON } from '@/lib/encryption';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Validation schema
const getDashboardSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/therapy/dashboard - Get comprehensive dashboard data
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 10, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params = validateInput(getDashboardSchema, {
      period: searchParams.get('period'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(params);
    
    // Get therapist profile
    const therapistProfile = await prisma.helperProfile.findUnique({
      where: { userId: (session as any).user.id },
      select: {
        title: true,
        specializations: true,
        rating: true,
        totalReviews: true,
        currentClients: true,
        maxClients: true,
        acceptingClients: true,
        totalSessions: true,
      },
    });
    
    // Get active clients
    const activeClients = await prisma.supportSession.findMany({
      where: {
        helperId: (session as any).user.id,
        status: 'active',
        sessionType: 'therapy',
      },
      include: {
        User_SupportSession_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            lastActiveAt: true,
          },
        },
      },
    });
    
    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: (session as any).user.id,
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });
    
    // Get session statistics for the period
    const sessionStats = await prisma.appointment.aggregate({
      where: {
        professionalId: (session as any).user.id,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });
    
    const completedSessions = await prisma.appointment.count({
      where: {
        professionalId: (session as any).user.id,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
      },
    });
    
    const cancelledSessions = await prisma.appointment.count({
      where: {
        professionalId: (session as any).user.id,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['cancelled', 'no_show'] },
      },
    });
    
    // Get recent assessments with high scores
    const recentAssessments = await prisma.moodEntry.findMany({
      where: {
        userId: {
          in: activeClients.map(c => c.userId).filter(Boolean) as string[],
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    // Process assessments for alerts
    const assessmentAlerts = [];
    for (const assessment of recentAssessments) {
      if (assessment.encryptedNotes) {
        try {
          const data = decryptJSON(assessment.encryptedNotes as string);
          if (data.scores?.severity === 'severe' || data.scores?.severity === 'moderately_severe') {
            assessmentAlerts.push({
              clientId: assessment.userId,
              clientName: `${assessment.User.firstName || ''} ${assessment.User.lastName || ''}`.trim(),
              assessmentType: data.assessmentType,
              severity: data.scores.severity,
              score: data.scores.total,
              date: assessment.createdAt,
            });
          }
        } catch (error) {
          // Skip if decryption fails
        }
      }
    }
    
    // Get pending tasks
    const pendingTasks = [];
    
    // Check for treatment plans needing review
    const treatmentPlans = await prisma.safetyPlan.findMany({
      where: {
        userId: {
          in: activeClients.map(c => c.userId).filter(Boolean) as string[],
        },
        isActive: true,
        lastReviewedAt: {
          lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Over 30 days old
        },
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 5,
    });
    
    treatmentPlans.forEach(plan => {
      pendingTasks.push({
        type: 'treatment_plan_review',
        clientName: `${plan.User.firstName || ''} ${plan.User.lastName || ''}`.trim(),
        dueDate: new Date(plan.lastReviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        priority: 'medium',
      });
    });
    
    // Check for notes needing completion
    const incompleteSessions = await prisma.appointment.findMany({
      where: {
        professionalId: (session as any).user.id,
        status: 'completed',
        scheduledAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    for (const apt of incompleteSessions) {
      if (apt.encryptedNotes) {
        const notes = decryptJSON(apt.encryptedNotes as string);
        if (!notes.sessionNotes) {
          pendingTasks.push({
            type: 'session_notes',
            clientName: `${apt.User.firstName || ''} ${apt.User.lastName || ''}`.trim(),
            dueDate: new Date(apt.scheduledAt.getTime() + 48 * 60 * 60 * 1000), // 48 hours after session
            priority: 'high',
            sessionDate: apt.scheduledAt,
          });
        }
      }
    }
    
    // Get billing summary
    const billingData = await getBillingSummary((session as any).user.id, startDate, endDate);
    
    // Get client progress metrics
    const progressMetrics = await getClientProgressMetrics(activeClients.map(c => c.userId).filter(Boolean) as string[]);
    
    // Calculate performance metrics
    const performanceMetrics = {
      completionRate: sessionStats._count.id > 0 
        ? (completedSessions / sessionStats._count.id) * 100 
        : 0,
      cancellationRate: sessionStats._count.id > 0
        ? (cancelledSessions / sessionStats._count.id) * 100
        : 0,
      clientRetention: calculateRetentionRate(activeClients),
      averageSessionsPerClient: activeClients.length > 0
        ? sessionStats._count.id / activeClients.length
        : 0,
      capacityUtilization: therapistProfile?.maxClients
        ? ((therapistProfile.currentClients / therapistProfile.maxClients) * 100)
        : 0,
    };
    
    // Compile dashboard data
    const dashboardData = {
      therapist: {
        name: (session as any).user.name,
        title: therapistProfile?.title,
        specializations: therapistProfile?.specializations,
        rating: therapistProfile?.rating,
        totalReviews: therapistProfile?.totalReviews,
        acceptingClients: therapistProfile?.acceptingClients,
      },
      overview: {
        activeClients: activeClients.length,
        maxClients: therapistProfile?.maxClients || 0,
        upcomingAppointments: upcomingAppointments.length,
        totalSessions: sessionStats._count.id,
        completedSessions,
        cancelledSessions,
        pendingNotes: pendingTasks.filter(t => t.type === 'session_notes').length,
      },
      clients: activeClients.map(c => ({
        id: c.userId,
        name: `${c.User_SupportSession_userIdToUser?.firstName || ''} ${c.User_SupportSession_userIdToUser?.lastName || ''}`.trim(),
        email: c.User_SupportSession_userIdToUser?.email,
        avatar: c.User_SupportSession_userIdToUser?.avatarUrl,
        lastActive: c.User_SupportSession_userIdToUser?.lastActiveAt,
        sessionStarted: c.startedAt,
      })),
      appointments: upcomingAppointments.map(apt => ({
        id: apt.id,
        clientName: `${apt.User.firstName || ''} ${apt.User.lastName || ''}`.trim(),
        clientAvatar: apt.User.avatarUrl,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
        meetingUrl: apt.meetingUrl,
      })),
      assessmentAlerts,
      pendingTasks,
      billing: billingData,
      progressMetrics,
      performanceMetrics,
      period: {
        type: params.period,
        startDate,
        endDate,
      },
    };
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_dashboard',
      'therapy_dashboard',
      undefined,
      {
        period: params.period,
        activeClients: activeClients.length,
      },
      'success',
      req
    );
    
    return successResponse(
      dashboardData,
      'Dashboard data retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve dashboard data');
  }
}

// Helper functions
function calculateDateRange(params: any): { startDate: Date; endDate: Date } {
  if (params.startDate && params.endDate) {
    return {
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
    };
  }
  
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();
  
  switch (params.period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { startDate, endDate };
}

async function getBillingSummary(therapistId: string, startDate: Date, endDate: Date) {
  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: therapistId,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      encryptedNotes: { not: null } as any,
    },
  });
  
  let totalBilled = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let insuranceClaims = 0;
  let selfPayClients = 0;
  
  for (const apt of appointments) {
    if (apt.encryptedNotes) {
      try {
        const data = decryptJSON(apt.encryptedNotes as string);
        if (data.billing) {
          totalBilled += data.billing.totalCharges || 0;
          totalCollected += data.billing.amountPaid || 0;
          totalPending += data.billing.balance || 0;
          
          if (data.billing.insurance) {
            insuranceClaims++;
          } else if (data.billing.selfPay) {
            selfPayClients++;
          }
        }
      } catch (error) {
        // Skip if decryption fails
      }
    }
  }
  
  return {
    totalBilled,
    totalCollected,
    totalPending,
    collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
    insuranceClaims,
    selfPayClients,
    averagePerSession: appointments.length > 0 ? totalBilled / appointments.length : 0,
  };
}

async function getClientProgressMetrics(clientIds: string[]) {
  if (clientIds.length === 0) return null;
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  
  // Get mood entries for comparison
  const recentMoods = await prisma.moodEntry.findMany({
    where: {
      userId: { in: clientIds },
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  
  const olderMoods = await prisma.moodEntry.findMany({
    where: {
      userId: { in: clientIds },
      createdAt: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo,
      },
    },
  });
  
  const recentAverage = recentMoods.length > 0
    ? recentMoods.reduce((sum, m) => sum + m.moodScore, 0) / recentMoods.length
    : 0;
  
  const olderAverage = olderMoods.length > 0
    ? olderMoods.reduce((sum, m) => sum + m.moodScore, 0) / olderMoods.length
    : 0;
  
  const improvement = olderAverage > 0
    ? ((olderAverage - recentAverage) / olderAverage) * 100
    : 0;
  
  // Count clients showing improvement
  const clientProgress = new Map();
  
  for (const mood of recentMoods) {
    if (!clientProgress.has(mood.userId)) {
      clientProgress.set(mood.userId, { recent: [], older: [] });
    }
    clientProgress.get(mood.userId).recent.push(mood.moodScore);
  }
  
  for (const mood of olderMoods) {
    if (!clientProgress.has(mood.userId)) {
      clientProgress.set(mood.userId, { recent: [], older: [] });
    }
    clientProgress.get(mood.userId).older.push(mood.moodScore);
  }
  
  let improving = 0;
  let stable = 0;
  let worsening = 0;
  
  for (const [clientId, scores] of clientProgress) {
    if (scores.recent.length > 0 && scores.older.length > 0) {
      const recentClientAvg = scores.recent.reduce((a: number, b: number) => a + b, 0) / scores.recent.length;
      const olderClientAvg = scores.older.reduce((a: number, b: number) => a + b, 0) / scores.older.length;
      
      if (recentClientAvg < olderClientAvg - 1) {
        improving++;
      } else if (recentClientAvg > olderClientAvg + 1) {
        worsening++;
      } else {
        stable++;
      }
    }
  }
  
  return {
    overallImprovement: improvement,
    clientsImproving: improving,
    clientsStable: stable,
    clientsWorsening: worsening,
    averageMoodScore: recentAverage,
    totalAssessments: recentMoods.length,
  };
}

function calculateRetentionRate(activeClients: any[]): number {
  if (activeClients.length === 0) return 0;
  
  const now = new Date();
  const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
  
  const longTermClients = activeClients.filter(c => 
    c.startedAt && new Date(c.startedAt) < threeMonthsAgo
  ).length;
  
  return activeClients.length > 0
    ? (longTermClients / activeClients.length) * 100
    : 0;
}