import { prisma } from '@/lib/prisma';
import { Redis } from 'ioredis';
import Fuse from 'fuse.js';

// Initialize Redis for caching with graceful fallback
let redis: Redis | null = null;
let cacheEnabled = false;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    cacheEnabled = true;
    console.log('[Search Service] Redis cache initialized successfully');
  } catch (error) {
    console.warn('[Search Service] Failed to initialize Redis cache:', error);
    redis = null;
    cacheEnabled = false;
  }
} else {
  console.warn('[Search Service] Redis URL not configured - search caching disabled');
}

export interface SearchQuery {
  query: string;
  type?: 'all' | 'users' | 'posts' | 'journals' | 'resources' | 'therapists';
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
    categories?: string[];
    status?: string;
    visibility?: string;
  };
  sort?: 'relevance' | 'date' | 'popularity';
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: any;
  score: number;
  highlights?: string[];
  createdAt: Date;
}

export class SearchService {
  private searchIndexes: Map<string, Fuse<any>> = new Map();
  private indexUpdateInterval: NodeJS.Timer | null = null;

  constructor() {
    // Initialize search indexes
    this.initializeIndexes();
    
    // Schedule periodic index updates
    this.indexUpdateInterval = setInterval(() => {
      this.updateIndexes();
    }, 5 * 60 * 1000); // Update every 5 minutes
  }

  // Initialize search indexes
  private async initializeIndexes() {
    await this.buildUserIndex();
    await this.buildPostIndex();
    await this.buildJournalIndex();
    await this.buildResourceIndex();
    await this.buildTherapistIndex();
  }

  // Update all indexes
  private async updateIndexes() {
    console.log('Updating search indexes...');
    await this.initializeIndexes();
  }

  // Build user index
  private async buildUserIndex() {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        
        email: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    const fuseOptions = {
      keys: ['name', 'email', 'bio'],
      threshold: 0.3,
      includeScore: true,
    };

    this.searchIndexes.set('users', new Fuse(users, fuseOptions));
  }

  // Build post index
  private async buildPostIndex() {
    const posts = await (prisma as any).post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        viewCount: true,
        likeCount: true,
      },
    });

    const fuseOptions = {
      keys: ['title', 'content', 'tags'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
    };

    this.searchIndexes.set('posts', new Fuse(posts, fuseOptions));
  }

  // Build journal index (with privacy considerations)
  private async buildJournalIndex() {
    // Journals are private by default
    // Only index public journals or those shared with search
    const journals = await prisma.journalEntry.findMany({
      where: {
        
      },
      select: {
        id: true,
        
        content: true,
        tags: true,
        mood: true,
        userId: true,
        createdAt: true,
      },
    });

    const fuseOptions = {
      keys: ['title', 'content', 'tags', 'mood'],
      threshold: 0.4,
      includeScore: true,
    };

    this.searchIndexes.set('journals', new Fuse(journals, fuseOptions));
  }

  // Build resource index
  private async buildResourceIndex() {
    const resources = await (prisma as any).resource.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        category: true,
        tags: true,
        type: true,
        createdAt: true,
      },
    });

    const fuseOptions = {
      keys: ['title', 'description', 'content', 'category', 'tags'],
      threshold: 0.3,
      includeScore: true,
    };

    this.searchIndexes.set('resources', new Fuse(resources, fuseOptions));
  }

  // Build therapist index
  private async buildTherapistIndex() {
    const therapists = await (prisma as any).therapistProfile.findMany({
      where: {
        isVerified: true,
        isAvailable: true,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const processedTherapists = therapists.map((t: any) => ({
      id: t.id,
      userId: t.userId,
      name: t.User.name,
      specializations: t.specializations,
      bio: t.bio,
      languages: t.languages,
      rating: t.rating,
    }));

    const fuseOptions = {
      keys: ['name', 'specializations', 'bio', 'languages'],
      threshold: 0.3,
      includeScore: true,
    };

    this.searchIndexes.set('therapists', new Fuse(processedTherapists, fuseOptions));
  }

  // Global search across all content types
  async globalSearch(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const cacheKey = `search:global:${JSON.stringify(query)}`;

    // Check cache (if available)
    if (cacheEnabled && redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('[Search Service] Cache read failed:', error);
      }
    }

    // Search across all indexes based on type
    const typesToSearch = query.type === 'all' 
      ? ['users', 'posts', 'journals', 'resources', 'therapists']
      : [query.type];

    for (const type of typesToSearch) {
      const index = this.searchIndexes.get(type);
      if (!index) continue;

      const searchResults = index.search(query.query, {
        limit: query.limit || 10,
      });

      // Transform results based on type
      for (const result of searchResults) {
        const transformed = await this.transformSearchResult(
          result.item,
          type,
          result.score || 0,
          query.userId
        );
        
        if (transformed) {
          results.push(transformed);
        }
      }
    }

    // Apply filters
    const filtered = this.applyFilters(results, query.filters);

    // Sort results
    const sorted = this.sortResults(filtered, query.sort || 'relevance');

    // Apply pagination
    const paginated = sorted.slice(
      query.offset || 0,
      (query.offset || 0) + (query.limit || 20)
    );

    // Cache results for 5 minutes (if available)
    if (cacheEnabled && redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(paginated));
      } catch (error) {
        console.warn('[Search Service] Cache write failed:', error);
      }
    }

    // Log search analytics
    await this.logSearchAnalytics(query, paginated.length);

    return paginated;
  }

  // Search for users
  async searchUsers(query: string, limit: number = 10): Promise<SearchResult[]> {
    const index = this.searchIndexes.get('users');
    if (!index) return [];

    const results = index.search(query, { limit });
    
    return Promise.all(
      results.map((r: any) => this.transformSearchResult(r.item, 'users', r.score || 0))
    ).then(r => r.filter(Boolean) as SearchResult[]);
  }

  // Search content (posts, journals, resources)
  async searchContent(
    query: string,
    contentType: 'posts' | 'journals' | 'resources',
    userId?: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    const index = this.searchIndexes.get(contentType);
    if (!index) return [];

    const results = index.search(query, { limit });
    
    return Promise.all(
      results.map((r: any) => this.transformSearchResult(r.item, contentType, r.score || 0, userId))
    ).then(r => r.filter(Boolean) as SearchResult[]);
  }

  // Transform search result based on type
  private async transformSearchResult(
    item: any,
    type: string,
    score: number,
    userId?: string
  ): Promise<SearchResult | null> {
    try {
      switch (type) {
        case 'users':
          // Check privacy settings
          if (userId && item.id !== userId) {
            const privacySettings = await this.checkUserPrivacy(item.id, userId);
            if (!privacySettings.allowSearch) return null;
          }
          
          return {
            id: item.id,
            type: 'user',
            title: item.name,
            description: item.bio,
            url: `/profile/${item.id}`,
            thumbnail: item.avatar,
            score,
            createdAt: item.createdAt,
          };

        case 'posts':
          const postAuthor = await prisma.user.findUnique({
            where: { id: item.authorId },
            select: { id: true,  avatar: true },
          });

          return {
            id: item.id,
            type: 'post',
            title: item.title,
            description: this.truncateContent(item.content, 200),
            url: `/community/posts/${item.id}`,
            author: postAuthor || undefined,
            metadata: {
              viewCount: item.viewCount,
              likeCount: item.likeCount,
              tags: item.tags,
            },
            score,
            highlights: this.generateHighlights(item.content, item.title),
            createdAt: item.createdAt,
          };

        case 'journals':
          // Check if user has access to this journal
          if (userId && item.userId !== userId) {
            const hasAccess = await this.checkJournalAccess(item.id, userId);
            if (!hasAccess) return null;
          }

          return {
            id: item.id,
            type: 'journal',
            title: item.title,
            description: this.truncateContent(item.content, 150),
            url: `/journal/${item.id}`,
            metadata: {
              mood: item.mood,
              tags: item.tags,
            },
            score,
            createdAt: item.createdAt,
          };

        case 'resources':
          return {
            id: item.id,
            type: 'resource',
            title: item.title,
            description: item.description,
            url: `/resources/${item.id}`,
            metadata: {
              category: item.category,
              type: item.type,
              tags: item.tags,
            },
            score,
            createdAt: item.createdAt,
          };

        case 'therapists':
          return {
            id: item.id,
            type: 'therapist',
            title: item.name,
            description: item.bio,
            url: `/therapists/${item.userId}`,
            metadata: {
              specializations: item.specializations,
              languages: item.languages,
              rating: item.rating,
            },
            score,
            createdAt: new Date(),
          };

        default:
          return null;
      }
    } catch (error) {
      console.error('Error transforming search result:', error);
      return null;
    }
  }

  // Apply filters to search results
  private applyFilters(results: SearchResult[], filters?: any): SearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      // Date filter
      if (filters.dateFrom && result.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && result.createdAt > filters.dateTo) return false;

      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const resultTags = result.metadata?.tags || [];
        if (!filters.tags.some((tag: string) => resultTags.includes(tag))) {
          return false;
        }
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(result.metadata?.category)) {
          return false;
        }
      }

      return true;
    });
  }

  // Sort search results
  private sortResults(results: SearchResult[], sort: string): SearchResult[] {
    switch (sort) {
      case 'date':
        return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      case 'popularity':
        return results.sort((a, b) => {
          const aPopularity = (a.metadata?.viewCount || 0) + (a.metadata?.likeCount || 0);
          const bPopularity = (b.metadata?.viewCount || 0) + (b.metadata?.likeCount || 0);
          return bPopularity - aPopularity;
        });
      
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }

  // Generate search highlights
  private generateHighlights(content: string, query: string): string[] {
    const words = query.toLowerCase().split(' ');
    const sentences = content.split(/[.!?]+/);
    const highlights: string[] = [];

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (words.some(word => lowerSentence.includes(word))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }

    return highlights;
  }

  // Truncate content for preview
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  }

  // Check user privacy settings
  private async checkUserPrivacy(userId: string, searcherId: string): Promise<any> {
    // Implement privacy checks
    return { allowSearch: true };
  }

  // Check journal access
  private async checkJournalAccess(journalId: string, userId: string): Promise<boolean> {
    // Implement access checks
    return false;
  }

  // Log search analytics
  private async logSearchAnalytics(query: SearchQuery, resultCount: number) {
    try {
      await (prisma as any).searchAnalytics.create({
        data: {
          id: crypto.randomUUID(),
          query: query.query,
          type: query.type || 'all',
          filters: query.filters || {},
          resultCount,
          userId: query.userId,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log search analytics:', error);
    }
  }

  // Get search suggestions
  async getSearchSuggestions(partial: string, userId?: string): Promise<string[]> {
    const cacheKey = `suggestions:${partial}`;
    
    // Check cache (if available)
    if (cacheEnabled && redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('[Search Service] Cache read failed:', error);
      }
    }

    // Get recent searches
    const recentSearches = await (prisma as any).searchAnalytics.findMany({
      where: {
        query: { startsWith: partial },
        userId,
      },
      select: { query: true },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get popular searches
    const popularSearches = await (prisma as any).searchAnalytics.groupBy({
      by: ['query'],
      where: {
        query: { startsWith: partial },
      },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 5,
    });

    const suggestions = [
      ...new Set([
        ...recentSearches.map((s: any) => s.query),
        ...popularSearches.map((s: any) => s.query),
      ]),
    ].slice(0, 10);

    // Cache for 1 hour (if available)
    if (cacheEnabled && redis) {
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(suggestions));
      } catch (error) {
        console.warn('[Search Service] Cache write failed:', error);
      }
    }

    return suggestions;
  }

  // Cleanup
  destroy() {
    if (this.indexUpdateInterval) {
      clearInterval(this.indexUpdateInterval);
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();