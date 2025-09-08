/**
 * Database Query Optimization Utilities
 * Provides optimized Prisma queries with caching, indexing suggestions, and performance monitoring
 */

import { PrismaClient } from '@prisma/client';
import { performanceMonitor } from '@/lib/performance/monitoring';

// Create performance-aware Prisma client
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
    errorFormat: 'minimal'
  });
} else {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty'
    });
  }

  prisma = globalForPrisma.prisma;
}

/**
 * Query optimization configuration
 */
interface QueryOptimization {
  enableCaching?: boolean;
  cacheTimeout?: number;
  maxResults?: number;
  enablePagination?: boolean;
  enableMetrics?: boolean;
  optimizeIncludes?: boolean;
}

/**
 * Query cache for frequently accessed data
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000 // Convert to milliseconds
    });
    
    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        entriesToDelete.push(key);
      }
    }
    
    entriesToDelete.forEach(key => this.cache.delete(key));
  }
  
  getStats(): {
    size: number;
    memoryUsage: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      memoryUsage: JSON.stringify(Object.fromEntries(this.cache)).length,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

const queryCache = new QueryCache();

/**
 * Performance-optimized query builder
 */
export class OptimizedQueryBuilder {
  /**
   * Execute query with optimization
   */
  static async execute<T>(
    operation: string,
    query: () => Promise<T>,
    options: QueryOptimization = {}
  ): Promise<T> {
    const {
      enableCaching = false,
      cacheTimeout = 300,
      enableMetrics = true
    } = options;

    const startTime = performance.now();
    const cacheKey = `${operation}:${JSON.stringify(query)}`;

    try {
      // Check cache first
      if (enableCaching) {
        const cached = queryCache.get(cacheKey);
        if (cached) {
          console.log(`[Query Cache] HIT: ${operation}`);
          return cached;
        }
      }

      // Execute query
      const result = await query();
      const duration = performance.now() - startTime;

      // Cache result
      if (enableCaching && result) {
        queryCache.set(cacheKey, result, cacheTimeout);
      }

      // Track metrics
      if (enableMetrics && performanceMonitor) {
        performanceMonitor.trackApiCall(`db:${operation}`, duration);
      }

      // Log slow queries
      if (duration > 500) {
        console.warn(`[Slow Query] ${operation} took ${duration.toFixed(2)}ms`);
      }

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (enableMetrics && performanceMonitor) {
        performanceMonitor.trackApiCall(`db:${operation}:error`, duration);
      }
      
      console.error(`[Query Error] ${operation}:`, error);
      throw error;
    }
  }

  /**
   * Get optimized user query
   */
  static async getUser(
    userId: string,
    options: QueryOptimization = {}
  ) {
    return this.execute(
      'getUser',
      () => prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          
          avatar: true,
          role: true,
          profile: {
            select: {
              displayName: true,
              preferences: true,
              emergencyContacts: true
            }
          },
          anonymousIdentity: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
              trustScore: true
            }
          }
        }
      }),
      { enableCaching: true, cacheTimeout: 300, ...options }
    );
  }

  /**
   * Get optimized dashboard stats
   */
  static async getDashboardStats(
    userId: string,
    options: QueryOptimization = {}
  ) {
    return this.execute(
      'getDashboardStats',
      async () => {
        // Use parallel queries for better performance
        const [
          therapyCount,
          moodCount,
          journalCount,
          communityCount,
          goalCount,
          wellnessData
        ] = await Promise.all([
          prisma.therapistSession.count({
            where: { userId }
          }),
          prisma.moodEntry.count({
            where: { userId }
          }),
          prisma.journalEntry.count({
            where: { userId }
          }),
          prisma.communityPost.count({
            where: { 
              AND: [
                { authorId: userId },
                { }
              ]
            }
          }),
          (prisma as any).wellnessGoal.count({
            where: { 
              AND: [
                { userId },
                { status: 'ACTIVE' }
              ]
            }
          }),
          (prisma as any).wellnessMetric.findMany({
            where: { userId },
            take: 30,
            orderBy: { date: 'desc' },
            select: {
              date: true,
              score: true,
              metrics: true
            }
          })
        ]);

        return {
          therapySessions: therapyCount,
          moodEntries: moodCount,
          journalEntries: journalCount,
          communityPosts: communityCount,
          goalsActive: goalCount,
          daysStreak: this.calculateStreak(wellnessData),
          wellnessScore: this.calculateAverageScore(wellnessData)
        };
      },
      { enableCaching: true, cacheTimeout: 300, ...options }
    );
  }

  /**
   * Get optimized crisis resources
   */
  static async getCrisisResources(
    userId: string,
    location?: string,
    options: QueryOptimization = {}
  ) {
    return this.execute(
      'getCrisisResources',
      () => (prisma as any).crisisResource.findMany({
        where: {
          AND: [
            { isActive: true },
            location ? {
              OR: [
                { location: location },
                { location: null } // Global resources
              ]
            } : {}
          ]
        },
        select: {
          id: true,
          name: true,
          type: true,
          contactInfo: true,
          availability: true,
          description: true,
          isEmergency: true,
          category: true
        },
        orderBy: [
          { isEmergency: 'desc' },
          { priority: 'desc' },
          { name: 'asc' }
        ],
        take: 20
      }),
      { enableCaching: true, cacheTimeout: 600, ...options }
    );
  }

  /**
   * Get paginated community posts with optimization
   */
  static async getCommunityPosts(
    page: number = 1,
    limit: number = 20,
    filters: {
      category?: string;
      userId?: string;
      featured?: boolean;
    } = {},
    options: QueryOptimization = {}
  ) {
    const offset = (page - 1) * limit;
    
    return this.execute(
      `getCommunityPosts:${page}:${limit}:${JSON.stringify(filters)}`,
      async () => {
        // Build where clause
        const where: any = {
          deletedAt: null,
          isPublished: true
        };

        if (filters.category) {
          where.category = filters.category;
        }

        if (filters.userId) {
          where.authorId = filters.userId;
        }

        if (filters.featured) {
          where.isFeatured = true;
        }

        // Execute query with optimized includes
        const [posts, totalCount] = await Promise.all([
          prisma.communityPost.findMany({
            where,
            select: {
              id: true,
              title: true,
              content: true,
              category: true,
              
              likesCount: true,
              commentsCount: true,
              isFeatured: true,
              createdAt: true,
              updatedAt: true,
              author: {
                select: {
                  id: true,
                  anonymousIdentity: {
                    select: {
                      displayName: true,
                      avatar: true,
                      trustScore: true,
                      badges: true
                    }
                  }
                }
              },
              // Only load first few comments for preview
              comments: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  author: {
                    select: {
                      anonymousIdentity: {
                        select: {
                          displayName: true,
                          avatar: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: [
              { },
              { createdAt: 'desc' }
            ],
            skip: offset,
            take: limit
          }),
          prisma.communityPost.count({ where })
        ]);

        return {
          posts,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: offset + limit < totalCount,
            hasPrev: page > 1
          }
        };
      },
      { enableCaching: true, cacheTimeout: 180, ...options }
    );
  }

  /**
   * Optimized therapy session history
   */
  static async getTherapyHistory(
    userId: string,
    limit: number = 10,
    options: QueryOptimization = {}
  ) {
    return this.execute(
      `getTherapyHistory:${userId}:${limit}`,
      () => prisma.therapistSession.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          status: true,
          startedAt: true,
          endedAt: true,
          summary: true,
          satisfaction: true,
          // Don't include full transcript for performance
          metadata: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      { enableCaching: true, cacheTimeout: 300, ...options }
    );
  }

  /**
   * Batch operations for better performance
   */
  static async batchUpdate<T>(
    model: string,
    updates: Array<{ where: any; data: any }>,
    options: QueryOptimization = {}
  ) {
    return this.execute(
      `batchUpdate:${model}`,
      async () => {
        // Use transactions for batch operations
        return prisma.$transaction(
          updates.map(update => 
            (prisma as any)[model].update(update)
          )
        );
      },
      options
    );
  }

  /**
   * Calculate wellness streak from metrics
   */
  private static calculateStreak(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (const metric of metrics) {
      const metricDate = new Date(metric.date);
      const daysDiff = Math.floor((today.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Calculate average wellness score
   */
  private static calculateAverageScore(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    
    const totalScore = metrics.reduce((sum, metric) => sum + (metric.score || 0), 0);
    return Math.round((totalScore / metrics.length) * 10) / 10;
  }

  /**
   * Clear query cache
   */
  static clearCache(): void {
    queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return queryCache.getStats();
  }
}

/**
 * Index optimization suggestions
 */
export const indexOptimizations = {
  // Suggested indexes for better query performance
  user: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User" (role);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_created_at ON "User" ("createdAt");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_active ON "User" ("lastActiveAt");'
  ],
  
  therapySession: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_session_user_started ON "TherapySession" ("userId", "startedAt");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_session_status ON "TherapySession" (status);'
  ],
  
  moodEntry: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_entry_user_date ON "MoodEntry" ("userId", date);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_entry_date_desc ON "MoodEntry" (date DESC);'
  ],
  
  communityPost: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_post_category_created ON "CommunityPost" (category, "createdAt" DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_post_featured_created ON "CommunityPost" ("isFeatured", "createdAt" DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_post_published_deleted ON "CommunityPost" ("isPublished", "deletedAt");'
  ],
  
  crisisResource: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_resource_active_location ON "CrisisResource" ("isActive", location);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_resource_emergency_priority ON "CrisisResource" ("isEmergency", priority);'
  ],
  
  auditLog: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_action ON "AuditLog" ("userId", action);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_timestamp ON "AuditLog" (timestamp DESC);'
  ]
};

/**
 * Run index optimization script
 */
export async function runIndexOptimizations(): Promise<void> {
  console.log('[DB Optimization] Running index optimizations...');
  
  try {
    for (const [model, queries] of Object.entries(indexOptimizations)) {
      console.log(`[DB Optimization] Optimizing indexes for ${model}...`);
      
      for (const query of queries) {
        try {
          await prisma.$executeRawUnsafe(query);
          console.log(`[DB Optimization] ✓ ${query}`);
        } catch (error) {
          console.warn(`[DB Optimization] ⚠ Index may already exist: ${error}`);
        }
      }
    }
    
    console.log('[DB Optimization] Index optimizations completed');
  } catch (error) {
    console.error('[DB Optimization] Failed to run index optimizations:', error);
    throw error;
  }
}

export { prisma };
export default OptimizedQueryBuilder;