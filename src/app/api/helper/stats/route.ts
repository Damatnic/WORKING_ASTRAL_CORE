import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, subDays } from 'date-fns';

// GET /api/helper/stats - Get helper dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a verified helper
    const helperProfile = await prisma.helperProfile.findUnique({
      where: { userId: session.user.id },
      select: { 
        id: true, 
        isVerified: true,
        currentClients: true,
        rating: true,
        totalSessions: true,
        
      }
    });

    if (!helperProfile || !helperProfile.isVerified) {
      return NextResponse.json(
        { error: 'Not a verified helper' },
        { status: 403 }
      );
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const lastWeek = subDays(now, 7);

    // Get all sessions for this helper
    const [
      allSessions,
      weekSessions,
      recentSessions,
      activeClients,
      reviews,
      upcomingSessions
    ] = await Promise.all([
      // All sessions
      prisma.supportSession.count({
        where: { helperId: session.user.id }
      }),
      
      // This week's sessions
      prisma.supportSession.findMany({
        where: {
          helperId: session.user.id,
          startedAt: {
            gte: weekStart,
            lte: weekEnd
          }
        },
        select: {
          startedAt: true,
          endedAt: true,
          status: true
        }
      }),
      
      // Recent sessions for response time calculation
      prisma.supportSession.findMany({
        where: {
          helperId: session.user.id,
          createdAt: { gte: lastWeek }
        },
        select: {
          createdAt: true,
          startedAt: true
        }
      }),
      
      // Count of unique active clients
      prisma.supportSession.groupBy({
        by: ['userId'],
        where: {
          helperId: session.user.id,
          status: { in: ['scheduled', 'in_progress'] },
          userId: { not: null }
        }
      }),
      
      // Helper reviews for satisfaction score
      prisma.helperReview.aggregate({
        where: { helperId: helperProfile.id },
        _avg: { rating: true },
        _count: true
      }),
      
      // Upcoming sessions count
      prisma.supportSession.count({
        where: {
          helperId: session.user.id,
          status: 'scheduled',
          createdAt: { gte: now }
        }
      })
    ]);

    // Calculate hours this week
    let hoursThisWeek = 0;
    weekSessions.forEach(session => {
      if (session.startedAt && session.endedAt) {
        const duration = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60 * 60);
        hoursThisWeek += duration;
      }
    });

    // Calculate average response time (in minutes)
    let totalResponseTime = 0;
    let responseCount = 0;
    recentSessions.forEach(session => {
      if (session.startedAt) {
        const responseTime = (new Date(session.startedAt).getTime() - new Date(session.createdAt).getTime()) / (1000 * 60);
        if (responseTime > 0 && responseTime < 1440) { // Exclude outliers > 24 hours
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });
    const averageResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

    // Calculate completed sessions
    const completedSessions = await prisma.supportSession.count({
      where: {
        helperId: session.user.id,
        status: 'completed'
      }
    });

    // Calculate client satisfaction (0-100 scale)
    const clientSatisfaction = reviews._avg.rating 
      ? Math.round((reviews._avg.rating / 5) * 100) 
      : 0;

    const stats = {
      totalClients: helperProfile.currentClients,
      activeClients: activeClients.length,
      completedSessions,
      upcomingSessions,
      averageRating: reviews._avg.rating || 0,
      responseTime: averageResponseTime,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10, // Round to 1 decimal
      clientSatisfaction,
      totalSessions: allSessions,
      reviewCount: reviews._count || 0
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching helper stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}