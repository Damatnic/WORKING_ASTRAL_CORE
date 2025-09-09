import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Fetch mood entries for the period
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const stats = {
      totalEntries: moodEntries.length,
      averageMood: 0,
      averageEnergy: 0,
      averageAnxiety: 0,
      moodTrend: 'stable' as 'improving' | 'declining' | 'stable',
      currentStreak: 0,
      longestStreak: 0,
      lastEntry: null as any
    };

    if (moodEntries.length > 0) {
      // Calculate averages
      const moodSum = moodEntries.reduce((sum, entry) => sum + entry.moodScore, 0);
      const energySum = moodEntries.reduce((sum, entry) => sum + (entry.energyLevel || 0), 0);
      const anxietySum = moodEntries.reduce((sum, entry) => sum + (entry.anxietyLevel || 0), 0);
      
      stats.averageMood = Math.round((moodSum / moodEntries.length) * 10) / 10;
      stats.averageEnergy = Math.round((energySum / moodEntries.length) * 10) / 10;
      stats.averageAnxiety = Math.round((anxietySum / moodEntries.length) * 10) / 10;
      
      // Calculate mood trend
      if (moodEntries.length >= 3) {
        const recentAvg = moodEntries.slice(0, 3).reduce((sum, e) => sum + e.moodScore, 0) / 3;
        const olderAvg = moodEntries.slice(-3).reduce((sum, e) => sum + e.moodScore, 0) / 3;
        
        if (recentAvg > olderAvg + 0.5) {
          stats.moodTrend = 'improving';
        } else if (recentAvg < olderAvg - 0.5) {
          stats.moodTrend = 'declining';
        }
      }
      
      // Calculate streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date(today);
      let streak = 0;
      
      for (let i = 0; i < 30; i++) {
        const hasEntry = moodEntries.some(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === currentDate.getTime();
        });
        
        if (hasEntry) {
          streak++;
        } else if (streak > 0) {
          break;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      stats.currentStreak = streak;
      stats.longestStreak = streak; // Would need more complex logic for true longest streak
      
      // Get last entry details
      const lastEntry = moodEntries[0];
      stats.lastEntry = {
        date: lastEntry.createdAt.toISOString(),
        mood: lastEntry.moodScore,
        energy: lastEntry.energyLevel,
        anxiety: lastEntry.anxietyLevel
      };
    }

    // Get weekly data for chart
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayEntries = moodEntries.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= date && entryDate <= endOfDay;
      });
      
      weeklyData.push({
        date: date.toISOString().split('T')[0],
        mood: dayEntries.length > 0 
          ? Math.round(dayEntries.reduce((sum, e) => sum + e.moodScore, 0) / dayEntries.length * 10) / 10
          : null,
        energy: dayEntries.length > 0
          ? Math.round(dayEntries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / dayEntries.length * 10) / 10
          : null,
        entries: dayEntries.length
      });
    }

    // Get insights
    const insights = generateInsights(stats, moodEntries);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        weeklyData,
        insights,
        period
      }
    });

  } catch (error) {
    console.error('Wellness overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wellness overview' },
      { status: 500 }
    );
  }
}

function generateInsights(stats: any, entries: any[]): any[] {
  const insights = [];

  // Mood trend insight
  if (stats.moodTrend === 'improving') {
    insights.push({
      type: 'positive',
      title: 'Mood Improvement',
      description: 'Your mood has been consistently improving. Keep up the great work!',
      priority: 'high'
    });
  } else if (stats.moodTrend === 'declining') {
    insights.push({
      type: 'warning',
      title: 'Mood Decline',
      description: 'Your mood has been declining. Consider reaching out for support or trying new coping strategies.',
      priority: 'high'
    });
  }

  // Streak insight
  if (stats.currentStreak >= 7) {
    insights.push({
      type: 'achievement',
      title: `${stats.currentStreak} Day Streak!`,
      description: 'Consistent mood tracking helps identify patterns and improve wellbeing.',
      priority: 'medium'
    });
  } else if (stats.currentStreak === 0 && stats.totalEntries > 0) {
    insights.push({
      type: 'suggestion',
      title: 'Resume Tracking',
      description: 'You missed tracking yesterday. Regular tracking helps maintain awareness.',
      priority: 'low'
    });
  }

  // Energy insight
  if (stats.averageEnergy < 4) {
    insights.push({
      type: 'suggestion',
      title: 'Low Energy Levels',
      description: 'Your energy has been low. Consider reviewing your sleep schedule and physical activity.',
      priority: 'medium'
    });
  }

  // Anxiety insight
  if (stats.averageAnxiety > 3) {
    insights.push({
      type: 'suggestion',
      title: 'Elevated Anxiety',
      description: 'Your anxiety levels are higher than usual. Try some relaxation techniques or speak with a therapist.',
      priority: 'high'
    });
  }

  return insights;
}