import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

// RBAC middleware - only admins can access this route
async function checkAdminAccess() {
  const session = await getServerSession(authOptions) as Session | null;
  
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Use the session.user properties directly since they're extended
  if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { authorized: true };
}

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Get time range from query params
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';

    let startDate: Date;
    const now = new Date();

    switch (timeRange) {
      case '24h':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = subDays(now, 1);
    }

    // Fetch all metrics in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalSessions,
      totalCrisisInterventions,
      activeCrisisInterventions,
      totalTherapySessions,
      totalMessages,
      usersByRole,
      usersByLocation,
      userGrowthData,
      systemHealth,
      recentActivity
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),

      // Active users (logged in within timeRange)
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: startDate
          }
        }
      }),

      // New users today
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay(now)
          }
        }
      }),

      // Total sessions (approximated by login count)
      prisma.session.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Total crisis reports
      prisma.crisisReport.count(),

      // Active crisis reports
      prisma.crisisReport.count({
        where: {
          resolved: false
        }
      }),

      // Total therapy sessions
      prisma.therapistSession.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Total messages
      prisma.chatMessage.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      }),

      // Users by timezone (top 10)
      prisma.user.groupBy({
        by: ['timezone'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      }),

      // User growth data for chart
      getUserGrowthData(startDate, now),

      // System health metrics
      getSystemHealthMetrics(),

      // Recent platform activity
      getRecentActivity(10)
    ]);

    // Calculate average session length (in minutes)
    const averageSessionLength = await calculateAverageSessionLength(startDate);

    // Format the response
    const metrics = {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalSessions,
      averageSessionLength,
      totalCrisisReports: totalCrisisInterventions,
      activeCrisisReports: activeCrisisInterventions,
      totalTherapySessions,
      totalMessages,
      systemUptime: 99.97, // This would come from monitoring service
      serverLoad: await getServerLoad(),
      databaseSize: await getDatabaseSize(),
      storageUsed: await getStorageUsed(),
      bandwidthUsed: await getBandwidthUsed()
    };

    const analytics = {
      usersByRole: usersByRole.reduce((acc: Record<string, number>, item: any) => {
        acc[item.role] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      usersByTimezone: usersByLocation.reduce((acc: Record<string, number>, item: any) => {
        acc[item.timezone || 'UTC'] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      userGrowth: userGrowthData,
      activeUsersByTimeOfDay: await getActiveUsersByTimeOfDay(startDate),
      sessionDurationDistribution: await getSessionDurationDistribution(startDate)
    };

    // Get alerts from monitoring system
    const alerts = await getSystemAlerts();

    // Create audit log entry
    const session = await getServerSession(authOptions) as Session | null;
    await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: session?.user?.id || null,
        action: 'VIEW_ADMIN_METRICS',
        details: { timeRange },
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || ((req as any).headers || req).get('x-real-ip') || 'unknown',
        outcome: 'success'
      }
    });

    return NextResponse.json({
      metrics,
      analytics,
      alerts,
      activity: recentActivity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getUserGrowthData(startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const growthData = [];

  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - i - 1);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [newUsers, totalUsers] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            lte: dayEnd
          }
        }
      })
    ]);

    growthData.push({
      date: date.toISOString(),
      newUsers,
      totalUsers
    });
  }

  return growthData;
}

async function getActiveUsersByTimeOfDay(startDate: Date) {
  // This would require more complex aggregation
  // For now, returning placeholder data structure
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0
  }));

  // In production, you'd aggregate login times by hour
  return hours;
}

async function getSessionDurationDistribution(startDate: Date) {
  // This would require session duration tracking
  // Returning structure with actual counts from DB
  const sessions = await prisma.session.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      lastActivity: true,
      createdAt: true
    }
  });

  const distribution = {
    '0-5 min': 0,
    '5-15 min': 0,
    '15-30 min': 0,
    '30-60 min': 0,
    '60+ min': 0
  };

  sessions.forEach((session: any) => {
    if (!session.lastActivity || !session.createdAt) return;
    const minutes = (session.lastActivity.getTime() - session.createdAt.getTime()) / (1000 * 60);
    
    if (minutes <= 5) distribution['0-5 min']++;
    else if (minutes <= 15) distribution['5-15 min']++;
    else if (minutes <= 30) distribution['15-30 min']++;
    else if (minutes <= 60) distribution['30-60 min']++;
    else distribution['60+ min']++;
  });

  return Object.entries(distribution).map(([duration, count]) => ({
    duration,
    count
  }));
}

async function calculateAverageSessionLength(startDate: Date) {
  const sessions = await prisma.session.findMany({
    where: {
      createdAt: { gte: startDate },
      lastActivity: { not: null as any }
    },
    select: {
      createdAt: true,
      lastActivity: true
    }
  });
  
  if (sessions.length === 0) return 0;
  
  const totalMinutes = sessions.reduce((sum, session) => {
    const duration = session.lastActivity.getTime() - session.createdAt.getTime();
    return sum + (duration / (1000 * 60));
  }, 0);

  return Math.round(totalMinutes / sessions.length);
}

async function getSystemHealthMetrics() {
  // In production, these would come from monitoring services
  return {
    cpuUsage: 45,
    memoryUsage: 67,
    diskUsage: 34,
    networkLatency: 23
  };
}

async function getServerLoad() {
  // In production, this would come from monitoring service
  return Math.round(Math.random() * 30 + 40);
}

async function getDatabaseSize() {
  // Query database size
  try {
    const result = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    ` as any[];
    
    if (result && result[0]) {
      return (result[0].size / (1024 * 1024 * 1024)).toFixed(2); // Convert to GB
    }
  } catch (error) {
    console.error('Error getting database size:', error);
  }
  return 0;
}

async function getStorageUsed() {
  // In production, query from storage service
  return 0;
}

async function getBandwidthUsed() {
  // In production, query from CDN/monitoring service
  return 0;
}

async function getSystemAlerts() {
  // Fetch recent safety alerts from monitoring
  const alerts = await prisma.safetyAlert.findMany({
    where: {
      handled: false
    },
    orderBy: {
      detectedAt: 'desc'
    },
    take: 10
  });

  return alerts.map((alert: any) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    context: alert.context,
    timestamp: alert.detectedAt.toISOString(),
    handled: alert.handled,
    handledBy: alert.handledBy,
    handledAt: alert.handledAt?.toISOString(),
    indicators: alert.indicators,
    actions: alert.actions
  }));
}

async function getRecentActivity(limit: number) {
  const activities = await prisma.auditLog.findMany({
    orderBy: {
      timestamp: 'desc'
    },
    take: limit,
    include: {
      User: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  return activities.map((activity: any) => ({
    id: activity.id,
    action: activity.action,
    resource: activity.resource,
    outcome: activity.outcome,
    timestamp: activity.timestamp.toISOString(),
    userId: activity.User?.id,
    userEmail: activity.User?.email,
    ipAddress: activity.ipAddress
  }));
}