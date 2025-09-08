import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-middleware';
import {
  successResponse,
  errorResponse,
  decryptField,
} from '@/lib/api-utils';

// GET /api/user/dashboard - Get comprehensive dashboard data for user
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const includeDetails = searchParams.get('details') === 'true';
    
    // Get user profile with basic info
    const [user, userProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          lastActiveAt: true,
          createdAt: true,
        },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          mentalHealthGoals: true,
          interestedTopics: true,
          wellnessScore: true,
          lastAssessmentAt: true,
          onboardingCompleted: true,
        },
      }),
    ]);
    
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Get activity summary
    const [
      recentMoodEntries,
      recentJournalEntries,
      upcomingAppointments,
      unreadNotifications,
      activeSafetyPlan,
    ] = await Promise.all([
      // Recent mood entries (last 7 days)
      prisma.moodEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          moodScore: true,
          anxietyLevel: true,
          energyLevel: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 7,
      }),
      
      // Recent journal entries
      prisma.journalEntry.findMany({
        where: { userId },
        select: {
          id: true,
          encryptedTitle: true,
          sentiment: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      
      // Upcoming appointments
      prisma.appointment.findMany({
        where: {
          userId,
          scheduledAt: { gte: new Date() },
          status: { in: ['scheduled', 'confirmed'] },
        },
        select: {
          id: true,
          scheduledAt: true,
          duration: true,
          type: true,
          status: true,
        },
        orderBy: { scheduledAt: 'asc' },
        take: 3,
      }),
      
      // Unread notifications count
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      
      // Active safety plan
      prisma.safetyPlan.findFirst({
        where: {
          userId,
          isActive: true,
        },
        select: {
          id: true,
          lastReviewedAt: true,
        },
      }),
    ]);
    
    // Calculate mood statistics
    const moodStats = recentMoodEntries.length > 0 ? {
      current: recentMoodEntries[0],
      average: {
        mood: recentMoodEntries.reduce((sum, e) => sum + e.moodScore, 0) / recentMoodEntries.length,
        anxiety: recentMoodEntries
          .filter(e => e.anxietyLevel !== null)
          .reduce((sum, e, _, arr) => sum + e.anxietyLevel! / arr.length, 0) || null,
        energy: recentMoodEntries
          .filter(e => e.energyLevel !== null)
          .reduce((sum, e, _, arr) => sum + e.energyLevel! / arr.length, 0) || null,
      },
      trend: calculateTrend(recentMoodEntries.map(e => e.moodScore)),
      entries: recentMoodEntries.length,
    } : null;
    
    // Parse wellness goals
    let wellnessGoals = [];
    if (userProfile?.mentalHealthGoals && userProfile.mentalHealthGoals.length > 0) {
      try {
        const goalsData = userProfile.mentalHealthGoals[0];
        if (goalsData.startsWith('{') || goalsData.startsWith('[')) {
          const parsed = JSON.parse(goalsData);
          wellnessGoals = Array.isArray(parsed) ? parsed : [parsed];
          wellnessGoals = wellnessGoals
            .filter((g: any) => g.status === 'active')
            .slice(0, 3);
        }
      } catch (e) {
        // Fallback to simple goals
        wellnessGoals = userProfile.mentalHealthGoals.slice(0, 3).map(g => ({
          title: g,
          progress: 0,
        }));
      }
    }
    
    // Get community engagement if requested
    let communityStats = null;
    if (includeDetails) {
      const [posts, supportSessions, groupMemberships] = await Promise.all([
        prisma.communityPost.count({ where: { authorId: userId } }),
        prisma.supportSession.count({ where: { userId } }),
        prisma.groupMembership.count({ where: { userId, isActive: true } }),
      ]);
      
      communityStats = {
        posts,
        supportSessions,
        activeGroups: groupMemberships,
      };
    }
    
    // Get active wellness challenges
    let activeChallenge = null;
    if (includeDetails) {
      activeChallenge = await prisma.challengeParticipation.findFirst({
        where: { userId },
        include: {
          WellnessChallenge: {
            select: {
              title: true,
              category: true,
              endDate: true,
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
      });
    }
    
    // Prepare journal entries with decrypted titles
    const journalSummary = recentJournalEntries.map(entry => ({
      id: entry.id,
      title: entry.encryptedTitle ? decryptField(entry.encryptedTitle) : 'Untitled',
      sentiment: entry.sentiment,
      createdAt: entry.createdAt,
    }));
    
    // Build dashboard response
    const dashboardData = {
      user: {
        name: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatar: user.avatarUrl,
        role: user.role,
        memberSince: user.createdAt,
        lastActive: user.lastActiveAt,
      },
      
      wellness: {
        score: userProfile?.wellnessScore,
        lastAssessment: userProfile?.lastAssessmentAt,
        moodStats,
        goals: wellnessGoals,
      },
      
      activity: {
        recentJournals: journalSummary,
        upcomingAppointments,
        unreadNotifications,
        hasSafetyPlan: !!activeSafetyPlan,
        safetyPlanReview: activeSafetyPlan?.lastReviewedAt,
      },
      
      community: communityStats,
      activeChallenge: activeChallenge ? {
        title: activeChallenge.WellnessChallenge.title,
        category: activeChallenge.WellnessChallenge.category,
        points: activeChallenge.points,
        streak: activeChallenge.streak,
        completionRate: activeChallenge.completionRate,
        endsAt: activeChallenge.WellnessChallenge.endDate,
      } : null,
      
      quickActions: [
        {
          id: 'mood-check',
          title: 'Log Mood',
          description: 'Track how you\'re feeling',
          icon: 'mood',
          href: '/wellness/mood-tracker',
          available: true,
        },
        {
          id: 'journal',
          title: 'Write Journal',
          description: 'Express your thoughts',
          icon: 'journal',
          href: '/journal',
          available: true,
        },
        {
          id: 'crisis-support',
          title: 'Crisis Support',
          description: 'Get immediate help',
          icon: 'emergency',
          href: '/crisis',
          available: true,
          priority: true,
        },
        {
          id: 'schedule-appointment',
          title: 'Book Session',
          description: 'Schedule with a professional',
          icon: 'calendar',
          href: '/appointments',
          available: true,
        },
      ],
      
      insights: generateInsights(moodStats, wellnessGoals, journalSummary),
      
      resources: {
        recommended: getRecommendedResources(userProfile?.interestedTopics || [], moodStats),
        crisis: [
          { name: 'Crisis Hotline', value: '988', type: 'phone' },
          { name: 'Crisis Text', value: 'Text HOME to 741741', type: 'text' },
        ],
      },
    };
    
    return successResponse(dashboardData, 200);
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return errorResponse('Failed to fetch dashboard data', 500);
  }
});

// Helper function to calculate trend
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | null {
  if (values.length < 2) return null;
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  
  if (Math.abs(difference) < 0.5) return 'stable';
  return difference > 0 ? 'improving' : 'declining';
}

// Helper function to generate personalized insights
function generateInsights(
  moodStats: any,
  goals: any[],
  journals: any[]
): string[] {
  const insights: string[] = [];
  
  // Mood-based insights
  if (moodStats) {
    if (moodStats.trend === 'improving') {
      insights.push('Your mood has been improving over the past week. Keep up the positive momentum!');
    } else if (moodStats.trend === 'declining') {
      insights.push('Your mood has been lower recently. Consider reaching out for support or trying some self-care activities.');
    }
    
    if (moodStats.average.anxiety && moodStats.average.anxiety > 7) {
      insights.push('Your anxiety levels have been elevated. Try some breathing exercises or relaxation techniques.');
    }
    
    if (moodStats.entries < 3) {
      insights.push('Regular mood tracking helps identify patterns. Try logging your mood daily.');
    }
  }
  
  // Goal-based insights
  if (goals.length === 0) {
    insights.push('Setting wellness goals can help guide your mental health journey. Start with one small, achievable goal.');
  } else if (goals.some((g: any) => g.progress >= 80)) {
    insights.push('You\'re close to completing a wellness goal! Final push to achievement!');
  }
  
  // Journal-based insights
  if (journals.length === 0) {
    insights.push('Journaling can be a powerful tool for self-reflection and emotional processing.');
  } else if (journals.length >= 3) {
    const avgSentiment = journals
      .filter(j => j.sentiment !== null)
      .reduce((sum, j, _, arr) => sum + j.sentiment / arr.length, 0);
    
    if (avgSentiment > 0.5) {
      insights.push('Your recent journal entries show positive sentiment. Writing seems to be helping!');
    }
  }
  
  // General wellness insights
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    insights.push('Good sleep is essential for mental health. Consider establishing a regular sleep schedule.');
  } else if (hour >= 6 && hour < 9) {
    insights.push('Starting your day with intention can set a positive tone. Consider a morning mindfulness practice.');
  }
  
  return insights.slice(0, 3); // Return top 3 insights
}

// Helper function to get recommended resources
function getRecommendedResources(
  interests: string[],
  moodStats: any
): Array<{ title: string; description: string; type: string; url: string }> {
  const resources = [];
  
  // Mood-based recommendations
  if (moodStats?.average.mood < 5) {
    resources.push({
      title: 'Coping with Low Mood',
      description: 'Evidence-based strategies for managing depression',
      type: 'article',
      url: '/resources/low-mood',
    });
  }
  
  if (moodStats?.average.anxiety > 6) {
    resources.push({
      title: 'Anxiety Management Techniques',
      description: 'Practical exercises to reduce anxiety',
      type: 'guide',
      url: '/resources/anxiety',
    });
  }
  
  // Interest-based recommendations
  if (interests.includes('meditation')) {
    resources.push({
      title: 'Guided Meditation Library',
      description: 'Curated meditation sessions for various needs',
      type: 'audio',
      url: '/resources/meditation',
    });
  }
  
  if (interests.includes('therapy')) {
    resources.push({
      title: 'Understanding Therapy Options',
      description: 'Guide to different types of mental health support',
      type: 'article',
      url: '/resources/therapy-guide',
    });
  }
  
  // Default recommendations
  if (resources.length === 0) {
    resources.push(
      {
        title: 'Mental Health Basics',
        description: 'Introduction to mental wellness',
        type: 'course',
        url: '/resources/basics',
      },
      {
        title: 'Self-Care Toolkit',
        description: 'Practical self-care strategies',
        type: 'toolkit',
        url: '/resources/self-care',
      }
    );
  }
  
  return resources.slice(0, 4); // Return top 4 resources
}