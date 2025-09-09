import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { DashboardStats } from '@/types/wellness';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
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

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel for better performance
    const [
      therapySessions,
      moodEntries,
      recentMoodEntries,
      communityPosts,
      journalEntries,
      userProfile,
      activeGoals,
      completedGoals
    ] = await Promise.all([
      // Count therapy sessions
      prisma.supportSession.count({
        where: {
          userId: user.id ,
          status: 'completed'
        }
      }),

      // Count total mood entries
      prisma.moodEntry.count({
        where: { userId: user.id  }
      }),

      // Get recent mood entries for streak calculation
      prisma.moodEntry.findMany({
        where: {
          userId: user.id ,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),

      // Count community posts
      prisma.communityPost.count({
        where: { authorId: user.id }
      }),

      // Count journal entries
      prisma.journalEntry.count({
        where: { userId: user.id  }
      }),

      // Get user profile for wellness score
      prisma.userProfile.findUnique({
        where: { userId: user.id  },
        select: { wellnessScore: true }
      }),

      // Count active goals (Note: Goals aren't in the current schema, so using a placeholder)
      // In production, this would query a Goals table
      Promise.resolve(3), // Placeholder

      // Count completed goals
      Promise.resolve(2) // Placeholder
    ]);

    // Calculate streak days
    let streakDays = 0;
    if (recentMoodEntries.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const currentDate = new Date(today);
      let consecutiveDays = 0;
      
      for (let i = 0; i < 30; i++) {
        const hasEntry = recentMoodEntries.some(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === currentDate.getTime();
        });
        
        if (hasEntry) {
          consecutiveDays++;
        } else if (consecutiveDays > 0) {
          // Streak broken
          break;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      streakDays = consecutiveDays;
    }

    // Calculate support given (placeholder - would need to query support interactions)
    const supportGiven = 8; // Placeholder

    // Calculate wellness score if not available
    const wellnessScore = userProfile?.wellnessScore || calculateWellnessScore({
      moodEntries,
      streakDays,
      journalEntries,
      activeGoals,
      completedGoals
    });

    const stats: DashboardStats = {
      therapySessions,
      moodEntries,
      daysStreak: streakDays,
      wellnessScore,
      communityPosts,
      supportGiven,
      goalsActive: activeGoals,
      goalsCompleted: completedGoals,
      journalEntries,
      lastActivityDate: recentMoodEntries[0]?.createdAt.toISOString() || null
    };

    return NextResponse.json({
      success: true,
      data: stats
    }, { status: 200 });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

// Helper function to calculate wellness score
function calculateWellnessScore(data: {
  moodEntries: number;
  streakDays: number;
  journalEntries: number;
  activeGoals: number;
  completedGoals: number;
}): number {
  let score = 5.0; // Base score

  // Adjust based on activity
  if (data.moodEntries > 0) score += Math.min(data.moodEntries * 0.1, 2);
  if (data.streakDays > 0) score += Math.min(data.streakDays * 0.2, 2);
  if (data.journalEntries > 0) score += Math.min(data.journalEntries * 0.05, 1);
  if (data.completedGoals > 0) score += data.completedGoals * 0.3;

  // Cap at 10
  return Math.min(Math.round(score * 10) / 10, 10);
}