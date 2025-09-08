import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const role = (session.user as any).role;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let analytics: any = {};

    // Role-based analytics
    if (role === 'ADMIN') {
      analytics = await getAdminAnalytics(startDate, now);
    } else if (role === 'THERAPIST') {
      analytics = await getTherapistAnalytics(session.user.id!, startDate, now);
    } else if (role === 'CRISIS_COUNSELOR') {
      analytics = await getCrisisCounselorAnalytics(session.user.id!, startDate, now);
    } else if (role === 'HELPER') {
      analytics = await getHelperAnalytics(session.user.id!, startDate, now);
    } else {
      analytics = await getUserAnalytics(session.user.id!, startDate, now);
    }

    await (auditLog as any)({
      userId: session.user.id!,
      userEmail: (session.user as any).email,
      action: 'analytics_dashboard_view',
      resource: 'analytics',
      details: { timeframe, role }
    });

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

async function getAdminAnalytics(startDate: Date, endDate: Date) {
  const [
    totalUsers,
    activeUsers,
    totalSessions,
    crisisReports,
    communityPosts,
    systemHealth
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        lastLoginAt: { gte: startDate }
      }
    }),
    prisma.therapistSession.count({
      where: {
        scheduledTime: { gte: startDate, lte: endDate }
      }
    }),
    prisma.crisisReport.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.communityPost.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    getSystemHealthMetrics()
  ]);

  // Get user growth over time
  const userGrowth = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    _count: true
  });

  // Get session completion rates
  const sessionStats = await prisma.therapistSession.groupBy({
    by: ['status'],
    where: {
      scheduledTime: { gte: startDate, lte: endDate }
    },
    _count: true
  });

  return {
    overview: {
      totalUsers,
      activeUsers,
      totalSessions,
      crisisReports,
      communityPosts
    },
    userGrowth,
    sessionStats,
    systemHealth
  };
}

async function getTherapistAnalytics(userId: string, startDate: Date, endDate: Date) {
  const [
    totalClients,
    activeSessions,
    completedSessions,
    upcomingSessions,
    clientProgress
  ] = await Promise.all([
    prisma.therapistClient.count({
      where: { therapistId: userId }
    }),
    prisma.therapistSession.count({
      where: {
        therapistId: userId,
        status: 'IN_PROGRESS',
        scheduledTime: { gte: startDate, lte: endDate }
      }
    }),
    prisma.therapistSession.count({
      where: {
        therapistId: userId,
        status: 'COMPLETED',
        scheduledTime: { gte: startDate, lte: endDate }
      }
    }),
    prisma.therapistSession.count({
      where: {
        therapistId: userId,
        status: 'SCHEDULED',
        scheduledTime: { gte: new Date(), lte: endDate }
      }
    }),
    getClientProgressMetrics(userId, startDate, endDate)
  ]);

  return {
    overview: {
      totalClients,
      activeSessions,
      completedSessions,
      upcomingSessions
    },
    clientProgress
  };
}

async function getCrisisCounselorAnalytics(userId: string, startDate: Date, endDate: Date) {
  const [
    totalCrisisReports,
    activeCases,
    resolvedCases,
    avgResponseTime
  ] = await Promise.all([
    prisma.crisisReport.count({
      where: {
        userId: userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.crisisReport.count({
      where: {
        userId: userId,
        resolved: false
      }
    }),
    prisma.crisisReport.count({
      where: {
        userId: userId,
        resolved: true,
        resolvedAt: { gte: startDate, lte: endDate }
      }
    }),
    calculateAverageResponseTime(userId, startDate, endDate)
  ]);

  return {
    overview: {
      totalCrisisReports,
      activeCases,
      resolvedCases,
      avgResponseTime
    }
  };
}

async function getHelperAnalytics(userId: string, startDate: Date, endDate: Date) {
  const [
    supportedUsers,
    peerSessions,
    communityContributions
  ] = await Promise.all([
    // Note: peerSupportConnection model doesn't exist, using supportSession instead
    prisma.supportSession.count({
      where: { helperId: userId }
    }),
    prisma.supportSession.count({
      where: {
        helperId: userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.communityPost.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    })
  ]);

  return {
    overview: {
      supportedUsers,
      peerSessions,
      communityContributions
    }
  };
}

async function getUserAnalytics(userId: string, startDate: Date, endDate: Date) {
  const [
    sessionsAttended,
    journalEntries,
    wellnessActivities,
    communityEngagement
  ] = await Promise.all([
    prisma.therapistSession.count({
      where: {
        clientId: userId,
        status: 'COMPLETED',
        scheduledTime: { gte: startDate, lte: endDate }
      }
    }),
    prisma.journalEntry.count({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    // Note: wellnessActivity model doesn't exist, using moodEntry as proxy
    prisma.moodEntry.count({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.communityPost.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate, lte: endDate }
      }
    })
  ]);

  return {
    overview: {
      sessionsAttended,
      journalEntries,
      wellnessActivities,
      communityEngagement
    }
  };
}

async function getSystemHealthMetrics() {
  // This would integrate with your monitoring system
  return {
    uptime: 99.9,
    responseTime: 120,
    errorRate: 0.1,
    activeConnections: 1250
  };
}

async function getClientProgressMetrics(therapistId: string, startDate: Date, endDate: Date) {
  // Calculate client progress metrics
  const progressData = await prisma.therapistSession.findMany({
    where: {
      therapistId,
      scheduledTime: { gte: startDate, lte: endDate },
      status: 'COMPLETED'
    },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });

  return progressData.map((session: any) => ({
    clientId: session.client.id,
    clientName: `${session.client.firstName} ${session.client.lastName}`,
    sessionDate: session.scheduledTime,
    progressScore: 0, // calculateProgressScore(session.progressNotes),
    notes: session.notes
  }));
}

async function calculateAverageResponseTime(counselorId: string, startDate: Date, endDate: Date) {
  const crisisReports = await prisma.crisisReport.findMany({
    where: {
      userId: counselorId,
      createdAt: { gte: startDate, lte: endDate },
      responseTime: { not: null as any }
    },
    select: { responseTime: true }
  });

  if (crisisReports.length === 0) return 0;

  const totalResponseTime = crisisReports.reduce((sum: number, report: any) => sum + (report.responseTime || 0), 0);
  return Math.round(totalResponseTime / crisisReports.length);
}

function calculateProgressScore(progressNotes: any[]): number {
  // Simple progress scoring algorithm
  if (!progressNotes || progressNotes.length === 0) return 0;
  
  const scores = progressNotes.map(note => note.progressRating || 0);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}