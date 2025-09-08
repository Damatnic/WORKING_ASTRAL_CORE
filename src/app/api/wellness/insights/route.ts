import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { WellnessInsight, WellnessRecommendation } from '@/types/wellness';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch recent data for analysis
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentMoodEntries,
      allMoodEntries,
      recentJournalEntries,
      userProfile
    ] = await Promise.all([
      // Recent mood entries (7 days)
      prisma.moodEntry.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // All mood entries (30 days)
      prisma.moodEntry.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Recent journal entries
      prisma.journalEntry.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // User profile
      prisma.userProfile.findUnique({
        where: { userId: user.id }
      })
    ]);

    // Generate insights based on data
    const insights = generateInsights(
      recentMoodEntries,
      allMoodEntries,
      recentJournalEntries,
      userProfile
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      recentMoodEntries,
      userProfile
    );

    return NextResponse.json({
      success: true,
      data: {
        insights,
        recommendations
      }
    });

  } catch (error) {
    console.error('Wellness insights error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

function generateInsights(
  recentMoods: any[],
  allMoods: any[],
  journals: any[],
  profile: any
): WellnessInsight[] {
  const insights: WellnessInsight[] = [];
  const now = new Date();

  // Analyze mood trends
  if (recentMoods.length >= 3) {
    const avgRecent = recentMoods.slice(0, 3).reduce((sum, e) => sum + e.moodScore, 0) / 3;
    const avgOlder = recentMoods.slice(-3).reduce((sum, e) => sum + e.moodScore, 0) / 3;
    
    if (avgRecent > avgOlder + 1) {
      insights.push({
        id: crypto.randomUUID(),
        userId: recentMoods[0].userId,
        type: 'positive',
        title: 'Mood Improvement Detected',
        description: `Your mood has improved by ${Math.round((avgRecent - avgOlder) * 10) / 10} points over the past week. Whatever you're doing is working!`,
        category: 'mood',
        priority: 'high',
        createdAt: now.toISOString(),
        isRead: false,
        actionItems: [{
          label: 'View Progress',
          action: 'navigate',
          link: '/wellness/analytics',
          type: 'primary'
        }]
      });
    } else if (avgRecent < avgOlder - 1) {
      insights.push({
        id: crypto.randomUUID(),
        userId: recentMoods[0].userId,
        type: 'warning',
        title: 'Mood Decline Noticed',
        description: 'Your mood has been trending downward. Consider trying some wellness activities or reaching out for support.',
        category: 'mood',
        priority: 'high',
        createdAt: now.toISOString(),
        isRead: false,
        actionItems: [
          {
            label: 'Talk to Therapist',
            action: 'navigate',
            link: '/therapy',
            type: 'primary'
          },
          {
            label: 'Try Meditation',
            action: 'navigate',
            link: '/wellness/meditation',
            type: 'secondary'
          }
        ]
      });
    }
  }

  // Check for consistent tracking
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  
  for (let i = 0; i < 30; i++) {
    const hasEntry = allMoods.some(entry => {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    if (hasEntry) {
      streak++;
    } else if (streak > 0) {
      break;
    }
    
    today.setDate(today.getDate() - 1);
  }

  if (streak >= 7) {
    insights.push({
      id: crypto.randomUUID(),
      userId: allMoods[0]?.userId || '',
      type: 'achievement',
      title: `${streak} Day Tracking Streak!`,
      description: 'Consistent mood tracking helps you understand patterns and improve your wellbeing. Keep it up!',
      category: 'goals',
      priority: 'medium',
      createdAt: now.toISOString(),
      isRead: false
    });
  } else if (streak === 0 && allMoods.length > 0) {
    insights.push({
      id: crypto.randomUUID(),
      userId: allMoods[0].userId,
      type: 'suggestion',
      title: 'Resume Your Tracking',
      description: 'You haven\'t tracked your mood today. Regular tracking helps identify patterns.',
      category: 'mood',
      priority: 'low',
      createdAt: now.toISOString(),
      isRead: false,
      actionItems: [{
        label: 'Track Now',
        action: 'navigate',
        link: '/wellness/mood-tracker',
        type: 'primary'
      }]
    });
  }

  // Analyze anxiety levels
  if (recentMoods.length > 0) {
    const avgAnxiety = recentMoods
      .filter(m => m.anxietyLevel !== null)
      .reduce((sum, m) => sum + (m.anxietyLevel || 0), 0) / recentMoods.length;
    
    if (avgAnxiety > 3.5) {
      insights.push({
        id: crypto.randomUUID(),
        userId: recentMoods[0].userId,
        type: 'warning',
        title: 'Elevated Anxiety Levels',
        description: 'Your anxiety has been higher than usual. Consider trying relaxation techniques or speaking with a professional.',
        category: 'mood',
        priority: 'high',
        createdAt: now.toISOString(),
        isRead: false,
        actionItems: [
          {
            label: 'Breathing Exercise',
            action: 'navigate',
            link: '/wellness/breathing',
            type: 'primary'
          },
          {
            label: 'Crisis Support',
            action: 'navigate',
            link: '/crisis',
            type: 'info'
          }
        ]
      });
    }
  }

  // Check energy levels
  if (recentMoods.length > 0) {
    const avgEnergy = recentMoods
      .filter(m => m.energyLevel !== null)
      .reduce((sum, m) => sum + (m.energyLevel || 0), 0) / recentMoods.length;
    
    if (avgEnergy < 3) {
      insights.push({
        id: crypto.randomUUID(),
        userId: recentMoods[0].userId,
        type: 'suggestion',
        title: 'Low Energy Detected',
        description: 'Your energy levels have been low. Consider reviewing your sleep schedule, exercise routine, and nutrition.',
        category: 'activity',
        priority: 'medium',
        createdAt: now.toISOString(),
        isRead: false,
        actionItems: [{
          label: 'Sleep Tips',
          action: 'navigate',
          link: '/wellness/sleep',
          type: 'primary'
        }]
      });
    }
  }

  // Journal activity
  if (journals.length === 0 && allMoods.length > 3) {
    insights.push({
      id: crypto.randomUUID(),
      userId: allMoods[0].userId,
      type: 'suggestion',
      title: 'Try Journaling',
      description: 'Journaling can help process emotions and identify patterns in your mental health.',
      category: 'activity',
      priority: 'low',
      createdAt: now.toISOString(),
      isRead: false,
      actionItems: [{
        label: 'Start Journal',
        action: 'navigate',
        link: '/journal',
        type: 'primary'
      }]
    });
  }

  return insights;
}

function generateRecommendations(
  recentMoods: any[],
  profile: any
): WellnessRecommendation[] {
  const recommendations: WellnessRecommendation[] = [];
  
  // Base recommendations
  const baseRecs: WellnessRecommendation[] = [
    {
      id: crypto.randomUUID(),
      title: 'Morning Mindfulness',
      description: 'Start your day with 10 minutes of mindful breathing to set a positive tone.',
      category: 'mindfulness',
      difficulty: 'easy',
      estimatedTime: 10,
      benefits: ['Reduced stress', 'Improved focus', 'Better mood'],
      instructions: [
        'Find a quiet, comfortable place to sit',
        'Close your eyes and focus on your breath',
        'Breathe in for 4 counts, hold for 4, exhale for 4',
        'Continue for 10 minutes'
      ],
      frequency: 'daily',
      priority: 1
    },
    {
      id: crypto.randomUUID(),
      title: 'Evening Walk',
      description: 'A gentle 20-minute walk can improve sleep quality and reduce stress.',
      category: 'exercise',
      difficulty: 'easy',
      estimatedTime: 20,
      benefits: ['Better sleep', 'Reduced anxiety', 'Physical health'],
      instructions: [
        'Choose a safe, pleasant route',
        'Walk at a comfortable pace',
        'Focus on your surroundings',
        'Leave your phone behind if possible'
      ],
      frequency: 'daily',
      priority: 2
    },
    {
      id: crypto.randomUUID(),
      title: 'Gratitude Journaling',
      description: 'Write down 3 things you\'re grateful for to boost positive emotions.',
      category: 'therapy',
      difficulty: 'easy',
      estimatedTime: 5,
      benefits: ['Improved mood', 'Better perspective', 'Increased happiness'],
      instructions: [
        'Get a journal or use the app',
        'Write 3 things you\'re grateful for',
        'Be specific about why',
        'Do this before bed'
      ],
      frequency: 'daily',
      priority: 3
    }
  ];

  // Add personalized recommendations based on mood data
  if (recentMoods.length > 0) {
    const avgMood = recentMoods.reduce((sum, m) => sum + m.moodScore, 0) / recentMoods.length;
    const avgAnxiety = recentMoods
      .filter(m => m.anxietyLevel !== null)
      .reduce((sum, m) => sum + (m.anxietyLevel || 0), 0) / recentMoods.length;
    
    if (avgAnxiety > 3) {
      recommendations.push({
        id: crypto.randomUUID(),
        title: 'Progressive Muscle Relaxation',
        description: 'Learn and practice this technique to manage anxiety and tension.',
        category: 'mindfulness',
        difficulty: 'medium',
        estimatedTime: 25,
        benefits: ['Reduced anxiety', 'Better body awareness', 'Improved relaxation'],
        instructions: [
          'Find a quiet space and lie down',
          'Start with your toes, tense for 5 seconds then release',
          'Work your way up through each muscle group',
          'Notice the contrast between tension and relaxation'
        ],
        frequency: 'daily',
        priority: 0
      });
    }
    
    if (avgMood < 5) {
      recommendations.push({
        id: crypto.randomUUID(),
        title: 'Connect with a Friend',
        description: 'Reach out to someone you care about for a meaningful conversation.',
        category: 'social',
        difficulty: 'medium',
        estimatedTime: 15,
        benefits: ['Improved mood', 'Social connection', 'Support'],
        instructions: [
          'Choose someone you trust',
          'Send a message or make a call',
          'Share how you\'re feeling if comfortable',
          'Listen and connect'
        ],
        frequency: 'weekly',
        priority: 1
      });
    }
  }

  // Add sleep recommendation if energy is low
  const avgEnergy = recentMoods
    .filter(m => m.energyLevel !== null)
    .reduce((sum, m) => sum + (m.energyLevel || 0), 0) / recentMoods.length;
  
  if (avgEnergy < 3) {
    recommendations.push({
      id: crypto.randomUUID(),
      title: 'Sleep Hygiene Routine',
      description: 'Create a consistent bedtime routine to improve sleep quality.',
      category: 'sleep',
      difficulty: 'medium',
      estimatedTime: 30,
      benefits: ['Better sleep', 'More energy', 'Improved mood'],
      instructions: [
        'Set a consistent bedtime',
        'Avoid screens 1 hour before bed',
        'Keep bedroom cool and dark',
        'Use relaxation techniques'
      ],
      frequency: 'daily',
      priority: 0
    });
  }

  // Combine and sort by priority
  return [...recommendations, ...baseRecs]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);
}