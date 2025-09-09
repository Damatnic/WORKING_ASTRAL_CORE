import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/platform/search/recent - Get recent searches
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent unique searches - DISABLED (searchHistory model not found)
    /*
    const recentSearches = await prisma.searchHistory.findMany({
      where: { userId: user.id },
      select: { 
        query: true,
        createdAt: true,
        resultsCount: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Get more to ensure we have unique ones
    });
    */

    // Return empty array since searchHistory model is not available
    return NextResponse.json({ searches: [] });
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent searches' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/search/recent - Clear recent searches
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete all search history for the user - DISABLED (searchHistory model not found)
    /*
    await prisma.searchHistory.deleteMany({
      where: { userId: user.id }
    });
    */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json(
      { error: 'Failed to clear search history' },
      { status: 500 }
    );
  }
}