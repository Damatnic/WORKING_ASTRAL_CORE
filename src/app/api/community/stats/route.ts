
import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createApiErrorHandler } from '@/lib/api-error-handler';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Mock community stats - in production this would come from database
    const stats = {
      totalMembers: 1247,
      activeToday: 89,
      totalPosts: 5632,
      totalRooms: 12,
      weeklyGrowth: 8.3,
      popularRooms: [
        { id: 'anxiety-support', name: 'Anxiety Support', members: 456, active: 23 },
        { id: 'mindfulness', name: 'Mindfulness Practice', members: 389, active: 18 },
        { id: 'depression-help', name: 'Depression Help', members: 334, active: 15 },
        { id: 'general', name: 'General Wellness', members: 523, active: 31 }
      ],
      recentActivity: [
        { type: 'new_member', username: 'peaceful_mind', time: '5 minutes ago' },
        { type: 'helpful_post', roomName: 'Anxiety Support', time: '12 minutes ago' },
        { type: 'room_created', roomName: 'Sleep Better', time: '2 hours ago' },
        { type: 'milestone', achievement: '1000+ members reached', time: '1 day ago' }
      ],
      engagement: {
        averageSessionTime: '24 minutes',
        postsPerDay: 187,
        helpfulVotesPerDay: 342,
        returnRate: 78.5
      }
    };

    return createSuccessResponse(stats, {
      cacheControl: 'public, max-age=300'
    });
  } catch (error) {
    console.error('Community stats error:', error);
    return createApiErrorHandler('STATS_ERROR', 'Failed to fetch community stats', 500);
  }
}