import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Search validation schema
const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  types: z.array(z.enum(['user', 'post', 'document', 'message', 'resource', 'session', 'journal', 'crisis_plan', 'therapy_note'])).optional(),
  categories: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    preset: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all']).optional()
  }).optional(),
  sortBy: z.enum(['relevance', 'date', 'title', 'author', 'views', 'likes']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.boolean().default(false),
  onlyFeatured: z.boolean().default(false),
  onlyPrivate: z.boolean().default(false),
  minRelevanceScore: z.number().min(0).max(1).default(0),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Helper function to calculate date range
function getDateRange(preset?: string): { start: Date; end: Date } | null {
  if (!preset || preset === 'all') return null;
  
  const now = new Date();
  const start = new Date();
  
  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { start, end: now };
}

// Full-text search across multiple content types
async function performSearch(userId: string, params: any) {
  const results: any[] = [];
  const searchTerms = params.query.toLowerCase().split(' ');
  
  // Date range filter
  const dateRange = params.dateRange?.preset 
    ? getDateRange(params.dateRange.preset)
    : params.dateRange?.start && params.dateRange?.end
    ? { start: new Date(params.dateRange.start), end: new Date(params.dateRange.end) }
    : null;

  // Common where clause
  const commonWhere: any = {};
  if (dateRange) {
    commonWhere.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end
    };
  }
  if (!params.includeArchived) {
    commonWhere.deletedAt = null;
  }

  // Search journal entries
  if (!params.types || params.types.includes('journal')) {
    const journals = await prisma.journalEntry.findMany({
      where: {
        userId,
        ...commonWhere,
        OR: searchTerms.map((term: string) => ({
          OR: [
            { encryptedTitle: { contains: term, mode: 'insensitive' } },
            { encryptedContent: { contains: term, mode: 'insensitive' } },
            { encryptedTags: { has: term } }
          ]
        }))
      },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      take: params.limit
    });

    journals.forEach(journal => {
      results.push({
        id: journal.id,
        type: 'journal',
        title: (journal as any).encryptedTitle || 'Journal Entry',
        content: (journal as any).encryptedContent || '',
        excerpt: ((journal as any).encryptedContent || '').substring(0, 200) + '...',
        author: {
          id: journal.User.id,
          name: journal.User.displayName || 'Anonymous',
          role: journal.User.role
        },
        createdAt: journal.createdAt,
        modifiedAt: journal.updatedAt,
        tags: (journal as any).encryptedTags || [],
        category: 'Personal',
        relevanceScore: calculateRelevance(((journal as any).encryptedTitle || '') + ' ' + ((journal as any).encryptedContent || ''), params.query),
        metadata: {
          wordCount: ((journal as any).encryptedContent || '').split(' ').length,
          readTime: Math.ceil(((journal as any).encryptedContent || '').split(' ').length / 200),
          isPrivate: true,
          status: 'published'
        },
        location: {
          path: '/journal',
          section: 'Journal Entries'
        }
      });
    });
  }

  // Search therapy sessions
  if (!params.types || params.types.includes('session') || params.types.includes('therapy_note')) {
    const sessions = await prisma.therapistSession.findMany({
      where: {
        OR: [
          { clientId: userId },
          { therapistId: userId }
        ],
        ...commonWhere,
        AND: searchTerms.map((term: string) => ({
          OR: [
            { notesEncrypted: { contains: term, mode: 'insensitive' } },
          ]
        }))
      },
      include: {
        therapistUser: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      take: params.limit
    });

    sessions.forEach(session => {
      results.push({
        id: session.id,
        type: 'therapy_note',
        title: `Therapy Session - ${new Date(session.scheduledTime).toLocaleDateString()}`,
        content: (session as any).notesEncrypted || '',
        excerpt: ((session as any).notesEncrypted || '').substring(0, 200) + '...',
        author: {
          id: session.therapistUser.id,
          name: session.therapistUser.displayName || 'Therapist',
          role: session.therapistUser.role
        },
        createdAt: session.createdAt,
        modifiedAt: session.updatedAt,
        tags: [] as string[],
        category: 'Clinical Notes',
        relevanceScore: calculateRelevance((session as any).notesEncrypted || '', params.query),
        metadata: {
          wordCount: ((session as any).notesEncrypted || '').split(' ').length,
          readTime: Math.ceil(((session as any).notesEncrypted || '').split(' ').length / 200),
          isEncrypted: true,
          isPrivate: true,
          priority: 'high',
          status: 'published'
        },
        location: {
          path: '/therapy/sessions',
          section: 'Therapy Sessions'
        }
      });
    });
  }

  // Search safety plans
  if (!params.types || params.types.includes('crisis_plan')) {
    const safetyPlans = await prisma.safetyPlan.findMany({
      where: {
        userId,
        ...commonWhere,
      },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      take: params.limit
    });

    safetyPlans.forEach(plan => {
      // Note: SafetyPlan fields are encrypted, so we'll use placeholder content
      const content = 'Safety Plan Content (Encrypted)';

      results.push({
        id: plan.id,
        type: 'crisis_plan',
        title: 'Crisis Safety Plan',
        content,
        excerpt: content.substring(0, 200) + '...',
        author: {
          id: plan.User.id,
          name: plan.User.displayName || 'User',
          role: plan.User.role
        },
        createdAt: plan.createdAt,
        modifiedAt: plan.updatedAt,
        tags: ['crisis', 'safety-plan', 'emergency'],
        category: 'Crisis Management',
        relevanceScore: calculateRelevance(content, params.query),
        metadata: {
          wordCount: content.split(' ').length,
          readTime: Math.ceil(content.split(' ').length / 200),
          isEncrypted: true,
          isPrivate: true,
          priority: 'urgent',
          status: 'published'
        },
        location: {
          path: '/crisis/safety-plan',
          section: 'Safety Plans'
        }
      });
    });
  }

  // Search community posts
  if (!params.types || params.types.includes('post')) {
    const posts = await prisma.communityPost.findMany({
      where: {
        ...commonWhere,
        authorId: userId,
        AND: {
          OR: searchTerms.map((term: string) => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { content: { contains: term, mode: 'insensitive' } },
              { tags: { has: term } }
            ]
          }))
        }
      },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      take: params.limit
    });

    posts.forEach(post => {
      results.push({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        excerpt: post.content.substring(0, 200) + '...',
        author: {
          id: post.User?.id || 'anonymous',
          name: post.User?.displayName || 'Anonymous',
          role: post.User?.role || 'USER'
        },
        createdAt: post.createdAt,
        modifiedAt: post.updatedAt,
        tags: [] as string[],
        category: 'Community Posts',
        relevanceScore: calculateRelevance(post.title + ' ' + post.content, params.query),
        metadata: {
          wordCount: post.content.split(' ').length,
          readTime: Math.ceil(post.content.split(' ').length / 200),
          viewCount: post.viewCount || 0,
          likeCount: post.likeCount || 0,
          commentCount: 0,
          isFeatured: false,
          status: 'published'
        },
        location: {
          path: '/community/posts',
          section: 'Community'
        }
      });
    });
  }

  // Search resources/documents - DISABLED (resource model not found)
  /*
  if (!params.types || params.types.includes('resource') || params.types.includes('document')) {
    // Resource model not available in current schema
  }
  */

  // Sort results
  results.sort((a, b) => {
    switch (params.sortBy) {
      case 'relevance':
        return params.sortOrder === 'desc' 
          ? b.relevanceScore - a.relevanceScore 
          : a.relevanceScore - b.relevanceScore;
      case 'date':
        return params.sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title':
        return params.sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      case 'views':
        return params.sortOrder === 'desc'
          ? (b.metadata?.viewCount || 0) - (a.metadata?.viewCount || 0)
          : (a.metadata?.viewCount || 0) - (b.metadata?.viewCount || 0);
      case 'likes':
        return params.sortOrder === 'desc'
          ? (b.metadata?.likeCount || 0) - (a.metadata?.likeCount || 0)
          : (a.metadata?.likeCount || 0) - (b.metadata?.likeCount || 0);
      default:
        return 0;
    }
  });

  // Apply relevance score filter
  const filteredResults = results.filter(r => r.relevanceScore >= params.minRelevanceScore);

  // Apply pagination
  const start = (params.page - 1) * params.limit;
  const paginatedResults = filteredResults.slice(start, start + params.limit);

  // Add highlights
  paginatedResults.forEach(result => {
    result.highlights = generateHighlights(result, params.query);
  });

  return {
    results: paginatedResults,
    total: filteredResults.length
  };
}

// Calculate relevance score
function calculateRelevance(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ');
  
  let score = 0;
  let matchCount = 0;
  
  queryWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  });
  
  // Exact phrase match bonus
  if (contentLower.includes(queryLower)) {
    score += 0.5;
  }
  
  // Word match score
  score += Math.min(matchCount * 0.1, 0.5);
  
  return Math.min(score, 1);
}

// Generate search highlights
function generateHighlights(result: any, query: string): Array<{ field: string; matches: string[] }> {
  const highlights: Array<{ field: string; matches: string[] }> = [];
  const queryWords = query.toLowerCase().split(' ');
  
  // Check title
  const titleMatches: string[] = [];
  queryWords.forEach(word => {
    if (result.title.toLowerCase().includes(word)) {
      const regex = new RegExp(`(${word})`, 'gi');
      const match = result.title.match(regex);
      if (match) {
        titleMatches.push(match[0]);
      }
    }
  });
  
  if (titleMatches.length > 0) {
    highlights.push({ field: 'title', matches: titleMatches });
  }
  
  // Check content
  const contentMatches: string[] = [];
  queryWords.forEach(word => {
    if (result.content.toLowerCase().includes(word)) {
      // Extract context around match
      const index = result.content.toLowerCase().indexOf(word);
      const start = Math.max(0, index - 30);
      const end = Math.min(result.content.length, index + word.length + 30);
      const context = result.content.substring(start, end);
      contentMatches.push(context);
    }
  });
  
  if (contentMatches.length > 0) {
    highlights.push({ field: 'content', matches: contentMatches.slice(0, 3) });
  }
  
  return highlights;
}

// GET /api/platform/search
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

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const params = SearchSchema.parse({
      query: searchParams.get('query'),
      types: searchParams.get('types')?.split(','),
      categories: searchParams.get('categories')?.split(','),
      authors: searchParams.get('authors')?.split(','),
      tags: searchParams.get('tags')?.split(','),
      dateRange: {
        start: searchParams.get('dateStart'),
        end: searchParams.get('dateEnd'),
        preset: searchParams.get('datePreset')
      },
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      includeArchived: searchParams.get('includeArchived') === 'true',
      onlyFeatured: searchParams.get('onlyFeatured') === 'true',
      onlyPrivate: searchParams.get('onlyPrivate') === 'true',
      minRelevanceScore: searchParams.get('minRelevanceScore') 
        ? parseFloat(searchParams.get('minRelevanceScore')!)
        : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    });

    // Save search to history - DISABLED (searchHistory model not found)
    /*
    await prisma.searchHistory.create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id ,
        query: params.query,
        filters: params as any,
        resultsCount: 0
      }
    });
    */

    // Perform search
    const { results, total } = await performSearch(user.id, params);

    // Update search history with results count - DISABLED (searchHistory model not found)
    /*
    await prisma.searchHistory.updateMany({
      where: {
        userId: user.id ,
        query: params.query
      },
      data: {
        resultsCount: total
      }
    });
    */

    return NextResponse.json({
      results,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

// POST /api/platform/search/save - Save a search
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, query, filters } = body;

    // savedSearch model not found - disabled
    /*
    const savedSearch = await prisma.savedSearch.create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
        name,
        query,
        filters,
        useCount: 0
      }
    });
    */

    return NextResponse.json({
      success: false,
      error: 'savedSearch feature not available - model not found'
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving search:', error);
    return NextResponse.json(
      { error: 'Failed to save search' },
      { status: 500 }
    );
  }
}