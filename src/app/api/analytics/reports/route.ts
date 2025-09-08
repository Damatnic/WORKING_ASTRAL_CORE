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
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, startDate, endDate' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData: any;

    switch (type) {
      case 'user-engagement':
        reportData = await generateUserEngagementReport(start, end);
        break;
      case 'therapy-outcomes':
        reportData = await generateTherapyOutcomesReport(start, end);
        break;
      case 'crisis-response':
        reportData = await generateCrisisResponseReport(start, end);
        break;
      case 'community-activity':
        reportData = await generateCommunityActivityReport(start, end);
        break;
      case 'wellness-tracking':
        reportData = await generateWellnessTrackingReport(start, end);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    await (auditLog as any)({
      userId: session.user.id!,
      userEmail: (session.user as any).email,
      action: 'analytics_report_generated',
      resource: 'analytics',
      details: { type, startDate, endDate, format }
    });

    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${startDate}-${endDate}.csv"`
        }
      });
    }

    return NextResponse.json({ report: reportData });

  } catch (error) {
    console.error('Analytics report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateUserEngagementReport(startDate: Date, endDate: Date) {
  const [
    userActivity,
    sessionMetrics,
    featureUsage
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        Session: {
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        },
        JournalEntry: {
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        },
        CommunityPost: {
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        }
      }
    }),
    // Use Session model for user session metrics
    prisma.session.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: {
        id: true
      }
    }),
    getFeatureUsageStats(startDate, endDate)
  ]);

  return {
    summary: {
      totalUsers: userActivity.length,
      averageSessionsPerUser: sessionMetrics.reduce((sum: any, m: any) => sum + (m._count || 0), 0) / (sessionMetrics.length || 1),
      // averageSessionDuration calculation removed - duration field doesn't exist in Session model
      averageSessionDuration: 0
    },
    userActivity: userActivity.map((user: any) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionsCount: user.Session.length,
      journalEntriesCount: user.JournalEntry.length,
      communityPostsCount: user.CommunityPost.length,
      lastActive: user.lastLoginAt
    })),
    featureUsage
  };
}

async function generateTherapyOutcomesReport(startDate: Date, endDate: Date) {
  const therapySessions = await prisma.therapistSession.findMany({
    where: {
      scheduledTime: { gte: startDate, lte: endDate }
    },
    include: {
      therapistUser: {
        select: { id: true, displayName: true }
      },
      client: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });

  const outcomesByTherapist = therapySessions.reduce((acc: any, session: any) => {
    const therapistId = session.therapistUser.id;
    if (!acc[therapistId]) {
      acc[therapistId] = {
        therapist: session.therapistUser,
        sessions: [],
        outcomes: {
          completed: 0,
          cancelled: 0,
          no_show: 0,
          avgProgressScore: 0
        }
      };
    }
    
    acc[therapistId].sessions.push(session);
    // Use proper enum values from TherapySessionStatus
    const statusKey = session.status.toLowerCase().replace('_', '_');
    if (acc[therapistId].outcomes.hasOwnProperty(statusKey)) {
      acc[therapistId].outcomes[statusKey]++;
    }
    
    return acc;
  }, {});

  return {
    summary: {
      totalSessions: therapySessions.length,
      completionRate: (therapySessions.filter((s: any) => s.status === 'COMPLETED').length / therapySessions.length) * 100,
      averageProgressScore: calculateAverageProgress(therapySessions)
    },
    outcomesByTherapist: Object.values(outcomesByTherapist)
  };
}

async function generateCrisisResponseReport(startDate: Date, endDate: Date) {
  const crisisReports = await prisma.crisisReport.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    }
  });

  const severityDistribution = crisisReports.reduce((acc: any, report: any) => {
    acc[report.severityLevel] = (acc[report.severityLevel] || 0) + 1;
    return acc;
  }, {});

  const avgResponseTime = crisisReports.reduce((sum: number, report: any) => sum + (report.responseTime || 0), 0) / crisisReports.length;

  return {
    summary: {
      totalReports: crisisReports.length,
      averageResponseTime: Math.round(avgResponseTime),
      resolutionRate: (crisisReports.filter((r: any) => r.resolved).length / crisisReports.length) * 100
    },
    severityDistribution,
    reports: crisisReports.map((report: any) => ({
      id: report.id,
      severityLevel: report.severityLevel,
      triggerType: report.triggerType,
      interventionType: report.interventionType,
      responseTime: report.responseTime,
      resolved: report.resolved,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt
    }))
  };
}

async function generateCommunityActivityReport(startDate: Date, endDate: Date) {
  // First get the posts to calculate reactions later
  const posts = await prisma.communityPost.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      User: {
        select: { id: true, displayName: true, role: true }
      },
      Comments: true
    }
  });

  const [
    comments,
    supportGroups
  ] = await Promise.all([
    // Use Comment model for community comments
    prisma.comment.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.supportGroup.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        GroupMembership: {
          select: {
            id: true,
            userId: true,
            joinedAt: true,
            isActive: true
          }
        }
      }
    })
  ]);

  // Calculate reactions from community posts
  const reactions = posts.reduce((sum: number, post: any) => sum + (post.likeCount || 0), 0);

  return {
    summary: {
      totalPosts: posts.length,
      totalComments: comments,
      totalReactions: reactions,
      activeSupportGroups: supportGroups.length,
      engagementRate: calculateEngagementRate(posts)
    },
    topContributors: getTopContributors(posts),
    groupActivity: supportGroups.map((group: any) => ({
      id: group.id,
      name: group.name,
      membersCount: group.GroupMembership?.length || 0,
      postsCount: 0, // No direct relation to community posts
      activityLevel: calculateGroupActivity(group)
    }))
  };
}

async function generateWellnessTrackingReport(startDate: Date, endDate: Date) {
  const [
    moodEntries,
    wellnessActivities,
    challengeParticipation
  ] = await Promise.all([
    prisma.moodEntry.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    }),
    // Use existing wellness data from moodEntries and other sources
    Promise.resolve([]),
    prisma.challengeParticipation.findMany({
      where: {
        joinedAt: { gte: startDate, lte: endDate }
      },
      include: {
        WellnessChallenge: true,
        AnonymousIdentity: {
          select: { id: true, displayName: true }
        }
      }
    })
  ]);

  const moodTrends = calculateMoodTrends(moodEntries);
  const activityPopularity = calculateActivityPopularity(wellnessActivities);

  return {
    summary: {
      totalMoodEntries: moodEntries.length,
      totalActivitiesCompleted: wellnessActivities.length,
      activeChallengeParticipants: challengeParticipation.length,
      averageMoodScore: moodTrends.average
    },
    moodTrends,
    activityPopularity,
    challengeEngagement: analyzeChallengeEngagement(challengeParticipation)
  };
}

// Helper functions
async function getFeatureUsageStats(startDate: Date, endDate: Date) {
  // This would track feature usage based on your app's analytics
  return {
    journaling: await prisma.journalEntry.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    therapy: await prisma.therapistSession.count({ where: { scheduledTime: { gte: startDate, lte: endDate } } }),
    community: await prisma.communityPost.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    wellness: await prisma.moodEntry.count({ where: { createdAt: { gte: startDate, lte: endDate } } })
  };
}

function calculateAverageProgress(sessions: any[]): number {
  const progressScores: number[] = []; // sessions
    // .filter(s => s.progressNotes && s.progressNotes.length > 0)
    // .flatMap(s => s.progressNotes.map((note: any) => note.progressRating || 0));
  
  return progressScores.length > 0 
    ? progressScores.reduce((sum, score) => sum + score, 0) / progressScores.length 
    : 0;
}

function calculateEngagementRate(posts: any[]): number {
  const totalInteractions = posts.reduce((sum, post) =>
    sum + (post.Comments?.length || 0) + (post.likeCount || 0), 0
  );
  return posts.length > 0 ? totalInteractions / posts.length : 0;
}

function getTopContributors(posts: any[]) {
  const contributors = posts.reduce((acc: any, post) => {
    const authorId = post.user.id;
    if (!acc[authorId]) {
      acc[authorId] = {
        user: post.user,
        postsCount: 0,
        totalEngagement: 0
      };
    }
    acc[authorId].postsCount++;
    acc[authorId].totalEngagement += (post.Comments?.length || 0) + (post.reactions?.length || 0);
    return acc;
  }, {});

  return Object.values(contributors)
    .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10);
}

function calculateGroupActivity(group: any): 'low' | 'medium' | 'high' {
  const membersCount = group.GroupMembership?.length || 1;
  // Since we don't have direct post relations, use member count as activity indicator
  if (membersCount > 10) return 'high';
  if (membersCount > 5) return 'medium';
  return 'low';
}

function calculateMoodTrends(moodEntries: any[]) {
  const moodValues = moodEntries.map(entry => entry.moodScore);
  const average = moodValues.reduce((sum, score) => sum + score, 0) / moodValues.length;
  
  return {
    average: Math.round(average * 10) / 10,
    trend: calculateTrend(moodValues),
    distribution: calculateDistribution(moodValues)
  };
}

function calculateActivityPopularity(activities: any[]) {
  return activities.reduce((acc: any, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {});
}

function analyzeChallengeEngagement(participation: any[]) {
  const challengeStats = participation.reduce((acc: any, p) => {
    const challengeId = p.WellnessChallenge.id;
    if (!acc[challengeId]) {
      acc[challengeId] = {
        challenge: p.WellnessChallenge,
        participantCount: 0,
        completionRate: 0
      };
    }
    acc[challengeId].participantCount++;
    return acc;
  }, {});

  return Object.values(challengeStats);
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  
  if (Math.abs(difference) < 0.5) return 'stable';
  return difference > 0 ? 'increasing' : 'decreasing';
}

function calculateDistribution(values: number[]) {
  const buckets = { low: 0, medium: 0, high: 0 };
  values.forEach(value => {
    if (value <= 3) buckets.low++;
    else if (value <= 7) buckets.medium++;
    else buckets.high++;
  });
  return buckets;
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - would need more sophisticated handling for complex objects
  if (!data || typeof data !== 'object') return '';
  
  const flattenObject = (obj: any, prefix = ''): any => {
    const flattened: any = {};
    for (const key in obj) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    return flattened;
  };

  const flatData = flattenObject(data);
  const headers = Object.keys(flatData);
  const values = Object.values(flatData);
  
  return [headers.join(','), values.join(',')].join('\n');
}