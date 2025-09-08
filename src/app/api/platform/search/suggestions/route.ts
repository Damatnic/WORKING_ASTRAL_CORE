import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// GET /api/platform/search/suggestions - Get search suggestions
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    // Get suggestions based on:
    // 1. Previous searches
    // 2. Popular tags
    // 3. Recent content titles
    
    const suggestions: string[] = [];

    if (query.length > 0) {
      // Get matching previous searches - DISABLED (searchHistory model not found)
      /*
      const previousSearches = await prisma.searchHistory.findMany({
        where: {
          userId: user.id,
          query: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: { query: true },
        distinct: ['query'],
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      suggestions.push(...previousSearches.map(s => s.query));
      */

      // Get matching tags from journal entries - DISABLED (tags field doesn't exist)
      /*
      const journalTags = await prisma.journalEntry.findMany({
        where: {
          userId: user.id,
          encryptedTags: {
            hasSome: [query]
          }
        },
        select: { encryptedTags: true },
        take: 10
      });

      const uniqueTags = new Set<string>();
      journalTags.forEach(entry => {
        (entry.encryptedTags as any)?.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            uniqueTags.add(tag);
          }
        });
      });
      
      suggestions.push(...Array.from(uniqueTags).slice(0, 5));
      */

      // Get matching post titles
      const posts = await prisma.communityPost.findMany({
        where: {
          authorId: user.id,
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: { title: true },
        take: 5,
        orderBy: { viewCount: 'desc' }
      });
      
      suggestions.push(...posts.map(p => p.title));

      // Get matching resource titles - DISABLED (resource model not found)
      /*
      const resources = await prisma.resource.findMany({
        where: {
          isPublished: true,
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: { title: true },
        take: 5,
        orderBy: { viewCount: 'desc' }
      });
      
      suggestions.push(...resources.map(r => r.title));
      */
    } else {
      // If no query, return trending searches - DISABLED (searchHistory model not found)
      /*
      const trendingSearches = await prisma.searchHistory.groupBy({
        by: ['query'],
        _count: {
          query: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: {
          _count: {
            query: 'desc'
          }
        },
        take: 10
      });

      suggestions.push(...trendingSearches.map(s => s.query));
      */
    }

    // Remove duplicates and limit to 10
    const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 10);

    return NextResponse.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}