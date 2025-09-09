import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { RecentActivity } from '@/types/wellness';

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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch recent activities from different sources
    const [
      moodEntries,
      journalEntries,
      therapySessions,
      communityPosts
    ] = await Promise.all([
      // Recent mood entries
      prisma.moodEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          moodScore: true,
          createdAt: true
        }
      }),

      // Recent journal entries
      prisma.journalEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          encryptedTitle: true,
          createdAt: true
        }
      }),

      // Recent therapy sessions
      prisma.supportSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          sessionType: true,
          status: true,
          createdAt: true
        }
      }),

      // Recent community posts
      prisma.communityPost.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          category: true,
          createdAt: true
        }
      })
    ]);

    // Combine and format activities
    const activities: RecentActivity[] = [];

    // Add mood entries
    moodEntries.forEach(entry => {
      activities.push({
        id: `mood-${entry.id}`,
        type: 'mood',
        title: 'Mood Entry',
        description: `Recorded mood: ${getMoodDescription(entry.moodScore)}/10`,
        timestamp: entry.createdAt.toISOString(),
        metadata: { moodScore: entry.moodScore }
      });
    });

    // Add journal entries
    journalEntries.forEach(entry => {
      activities.push({
        id: `journal-${entry.id}`,
        type: 'journal',
        title: 'Journal Entry',
        description: 'Added a new journal entry',
        timestamp: entry.createdAt.toISOString(),
        metadata: {}
      });
    });

    // Add therapy sessions
    therapySessions.forEach(session => {
      activities.push({
        id: `therapy-${session.id}`,
        type: 'therapy',
        title: 'Therapy Session',
        description: `${session.sessionType} therapy session ${session.status}`,
        timestamp: session.createdAt.toISOString(),
        metadata: { sessionType: session.sessionType, status: session.status }
      });
    });

    // Add community posts
    communityPosts.forEach(post => {
      activities.push({
        id: `community-${post.id}`,
        type: 'community',
        title: 'Community Post',
        description: `Shared in ${post.category} category`,
        timestamp: post.createdAt.toISOString(),
        metadata: { category: post.category }
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedActivities,
      total: activities.length,
      hasMore: offset + limit < activities.length
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}

function getMoodDescription(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5) return 'Okay';
  if (score >= 3) return 'Low';
  return 'Very Low';
}