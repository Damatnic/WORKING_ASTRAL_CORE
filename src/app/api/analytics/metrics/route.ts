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
    const metric = searchParams.get('metric');
    const timeframe = searchParams.get('timeframe') || '24h';
    const granularity = searchParams.get('granularity') || 'hour';

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric parameter is required' },
        { status: 400 }
      );
    }

    const timeRange = getTimeRange(timeframe);
    let metricData: any;

    switch (metric) {
      case 'user-activity':
        metricData = await getUserActivityMetrics(timeRange, granularity);
        break;
      case 'session-metrics':
        metricData = await getSessionMetrics(timeRange, granularity);
        break;
      case 'crisis-metrics':
        metricData = await getCrisisMetrics(timeRange, granularity);
        break;
      case 'community-metrics':
        metricData = await getCommunityMetrics(timeRange, granularity);
        break;
      case 'wellness-metrics':
        metricData = await getWellnessMetrics(timeRange, granularity);
        break;
      case 'system-performance':
        metricData = await getSystemPerformanceMetrics(timeRange, granularity);
        break;
      default:
        return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }

    await (auditLog as any)({
      userId: session.user.id!,
      userEmail: (session.user as any).email,
      action: 'analytics_metrics_query',
      resource: 'analytics',
      details: { metric, timeframe, granularity }
    });

    return NextResponse.json({ metrics: metricData });

  } catch (error) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

function getTimeRange(timeframe: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;

  switch (timeframe) {
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return { start, end: now };
}

function getTimeInterval(granularity: string, timeRange: { start: Date; end: Date }): Date[] {
  const intervals: Date[] = [];
  const { start, end } = timeRange;
  let current = new Date(start);

  let incrementMs: number;
  switch (granularity) {
    case 'minute':
      incrementMs = 60 * 1000;
      break;
    case 'hour':
      incrementMs = 60 * 60 * 1000;
      break;
    case 'day':
      incrementMs = 24 * 60 * 60 * 1000;
      break;
    default:
      incrementMs = 60 * 60 * 1000; // Default to hourly
  }

  while (current <= end) {
    intervals.push(new Date(current));
    current = new Date(current.getTime() + incrementMs);
  }

  return intervals;
}

async function getUserActivityMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  const intervals = getTimeInterval(granularity, timeRange);
  
  // Get user login activity over time
  const loginActivity = await Promise.all(
    intervals.map(async (interval, index) => {
      const nextInterval = intervals[index + 1] || timeRange.end;
      
      const [logins, signups] = await Promise.all([
        prisma.session.count({
          where: {
            createdAt: {
              gte: interval,
              lt: nextInterval
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: interval,
              lt: nextInterval
            }
          }
        })
      ]);

      return {
        timestamp: interval,
        logins,
        signups
      };
    })
  );

  // Get current active users
  const activeUsers = await prisma.user.count({
    where: {
      lastLoginAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000) // Active in last 15 minutes
      }
    }
  });

  // Get user engagement metrics
  const engagementMetrics = await Promise.all([
    prisma.journalEntry.count({
      where: { createdAt: { gte: timeRange.start, lte: timeRange.end } }
    }),
    prisma.communityPost.count({
      where: { createdAt: { gte: timeRange.start, lte: timeRange.end } }
    }),
    prisma.therapistSession.count({
      where: { scheduledTime: { gte: timeRange.start, lte: timeRange.end } }
    })
  ]);

  return {
    timeline: loginActivity,
    summary: {
      activeUsers,
      totalLogins: loginActivity.reduce((sum, item) => sum + item.logins, 0),
      totalSignups: loginActivity.reduce((sum, item) => sum + item.signups, 0),
      journalEntries: engagementMetrics[0],
      communityPosts: engagementMetrics[1],
      therapistSessions: engagementMetrics[2]
    }
  };
}

async function getSessionMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  const intervals = getTimeInterval(granularity, timeRange);

  const sessionMetrics = await Promise.all(
    intervals.map(async (interval, index) => {
      const nextInterval = intervals[index + 1] || timeRange.end;
      
      const sessions = await prisma.therapistSession.findMany({
        where: {
          scheduledTime: {
            gte: interval,
            lt: nextInterval
          }
        },
        include: {
          sessionNotes: true
        }
      });

      const completed = sessions.filter((s: any) => s.status === 'COMPLETED').length;
      const cancelled = sessions.filter((s: any) => s.status === 'CANCELLED').length;
      const noShows = sessions.filter((s: any) => s.status === 'NO_SHOW').length;
      
      const avgProgress = sessions.length > 0 
        ? sessions.reduce((sum: number, s: any) => {
            // Use a simple scoring system based on session completion
            const progressScore = s.status === 'COMPLETED' ? 5 : 0;
            return sum + progressScore;
          }, 0) / sessions.length
        : 0;

      return {
        timestamp: interval,
        total: sessions.length,
        completed,
        cancelled,
        noShows,
        completionRate: sessions.length > 0 ? (completed / sessions.length) * 100 : 0,
        averageProgress: Math.round(avgProgress * 10) / 10
      };
    })
  );

  return {
    timeline: sessionMetrics,
    summary: {
      totalSessions: sessionMetrics.reduce((sum, item) => sum + item.total, 0),
      overallCompletionRate: sessionMetrics.length > 0 
        ? sessionMetrics.reduce((sum, item) => sum + item.completionRate, 0) / sessionMetrics.length
        : 0,
      averageProgressScore: sessionMetrics.length > 0
        ? sessionMetrics.reduce((sum, item) => sum + item.averageProgress, 0) / sessionMetrics.length
        : 0
    }
  };
}

async function getCrisisMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  const intervals = getTimeInterval(granularity, timeRange);

  const crisisMetrics = await Promise.all(
    intervals.map(async (interval, index) => {
      const nextInterval = intervals[index + 1] || timeRange.end;
      
      const reports = await prisma.crisisReport.findMany({
        where: {
          createdAt: {
            gte: interval,
            lt: nextInterval
          }
        }
      });

      const byRiskLevel = reports.reduce((acc: Record<string, number>, report: any) => {
        acc[report.riskLevel] = (acc[report.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const resolved = reports.filter((r: any) => r.resolved).length;
      const avgResponseTime = reports.length > 0 
        ? reports.reduce((sum: number, r: any) => sum + (r.responseTime || 0), 0) / reports.length
        : 0;

      return {
        timestamp: interval,
        total: reports.length,
        riskLevels: byRiskLevel,
        resolved,
        avgResponseTime: Math.round(avgResponseTime),
        resolutionRate: reports.length > 0 ? (resolved / reports.length) * 100 : 0
      };
    })
  );

  return {
    timeline: crisisMetrics,
    summary: {
      totalReports: crisisMetrics.reduce((sum, item) => sum + item.total, 0),
      overallResolutionRate: crisisMetrics.length > 0
        ? crisisMetrics.reduce((sum, item) => sum + item.resolutionRate, 0) / crisisMetrics.length
        : 0,
      averageResponseTime: crisisMetrics.length > 0
        ? crisisMetrics.reduce((sum, item) => sum + item.avgResponseTime, 0) / crisisMetrics.length
        : 0
    }
  };
}

async function getCommunityMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  const intervals = getTimeInterval(granularity, timeRange);

  const communityMetrics = await Promise.all(
    intervals.map(async (interval, index) => {
      const nextInterval = intervals[index + 1] || timeRange.end;
      
      const [posts, comments, reactions] = await Promise.all([
        prisma.communityPost.count({
          where: {
            createdAt: { gte: interval, lt: nextInterval }
          }
        }),
        prisma.comment.count({
          where: {
            createdAt: { gte: interval, lt: nextInterval }
          }
        }),
        // Skip reactions for now as they're not in the schema
        Promise.resolve(0)
      ]);

      return {
        timestamp: interval,
        posts,
        comments,
        reactions: 0, // Skipping reactions as not in schema
        totalInteractions: posts + comments + reactions
      };
    })
  );

  return {
    timeline: communityMetrics,
    summary: {
      totalPosts: communityMetrics.reduce((sum, item) => sum + item.posts, 0),
      totalComments: communityMetrics.reduce((sum, item) => sum + item.comments, 0),
      totalReactions: 0, // Skipping reactions as not in schema
      totalInteractions: communityMetrics.reduce((sum, item) => sum + item.totalInteractions, 0)
    }
  };
}

async function getWellnessMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  const intervals = getTimeInterval(granularity, timeRange);

  const wellnessMetrics = await Promise.all(
    intervals.map(async (interval, index) => {
      const nextInterval = intervals[index + 1] || timeRange.end;
      
      const [moodEntries, activities, challengeCompletions] = await Promise.all([
        prisma.moodEntry.findMany({
          where: {
            createdAt: { gte: interval, lt: nextInterval }
          }
        }),
        // Use wellness challenges participation as activities
        prisma.challengeParticipation.count({
          where: {
            lastActivityAt: { gte: interval, lt: nextInterval }
          }
        }),
        // Use completed tasks in challenge participations
        prisma.challengeParticipation.count({
          where: {
            lastActivityAt: { gte: interval, lt: nextInterval },
            completionRate: { gt: 0 }
          }
        })
      ]);

      const avgMoodScore = moodEntries.length > 0
        ? moodEntries.reduce((sum: number, entry: any) => sum + entry.moodScore, 0) / moodEntries.length
        : 0;

      return {
        timestamp: interval,
        moodEntries: moodEntries.length,
        averageMoodScore: Math.round(avgMoodScore * 10) / 10,
        activities,
        challengeCompletions
      };
    })
  );

  return {
    timeline: wellnessMetrics,
    summary: {
      totalMoodEntries: wellnessMetrics.reduce((sum, item) => sum + item.moodEntries, 0),
      overallAverageMood: wellnessMetrics.length > 0
        ? wellnessMetrics.reduce((sum, item) => sum + item.averageMoodScore, 0) / wellnessMetrics.length
        : 0,
      totalActivities: wellnessMetrics.reduce((sum, item) => sum + item.activities, 0),
      totalChallengeCompletions: wellnessMetrics.reduce((sum, item) => sum + item.challengeCompletions, 0)
    }
  };
}

async function getSystemPerformanceMetrics(timeRange: { start: Date; end: Date }, granularity: string) {
  // This would typically integrate with your monitoring system (e.g., New Relic, DataDog)
  // For now, we'll simulate some basic metrics
  
  const intervals = getTimeInterval(granularity, timeRange);
  
  const performanceMetrics = intervals.map(interval => ({
    timestamp: interval,
    responseTime: Math.round(80 + Math.random() * 40), // 80-120ms
    errorRate: Math.random() * 0.5, // 0-0.5%
    cpuUsage: Math.round(20 + Math.random() * 30), // 20-50%
    memoryUsage: Math.round(40 + Math.random() * 30), // 40-70%
    activeConnections: Math.round(800 + Math.random() * 400), // 800-1200
    throughput: Math.round(50 + Math.random() * 100) // 50-150 requests/minute
  }));

  return {
    timeline: performanceMetrics,
    summary: {
      averageResponseTime: performanceMetrics.reduce((sum, item) => sum + item.responseTime, 0) / performanceMetrics.length,
      averageErrorRate: performanceMetrics.reduce((sum, item) => sum + item.errorRate, 0) / performanceMetrics.length,
      averageCpuUsage: performanceMetrics.reduce((sum, item) => sum + item.cpuUsage, 0) / performanceMetrics.length,
      averageMemoryUsage: performanceMetrics.reduce((sum, item) => sum + item.memoryUsage, 0) / performanceMetrics.length,
      peakConnections: Math.max(...performanceMetrics.map(item => item.activeConnections)),
      totalThroughput: performanceMetrics.reduce((sum, item) => sum + item.throughput, 0)
    }
  };
}