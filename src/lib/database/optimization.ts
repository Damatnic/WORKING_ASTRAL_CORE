/**
 * Database Optimization Module
 * Implements connection pooling, query optimization, and index management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { cacheManager } from '@/lib/cache/redis';

/**
 * Optimized Prisma Client with connection pooling
 */
class OptimizedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'minimal',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    
    // Middleware for query optimization and caching
    (this as any).$use(this.cacheMiddleware);
    (this as any).$use(this.performanceMiddleware);
  }
  
  /**
   * Cache middleware for frequently accessed queries
   */
  private async cacheMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ) {
    // Skip caching for mutations
    if (['create', 'update', 'delete', 'upsert', 'deleteMany', 'updateMany'].includes(params.action)) {
      return next(params);
    }
    
    // Cache configuration for specific models
    const cacheConfig: Record<string, { ttl: number; enabled: boolean }> = {
      User: { ttl: 3600, enabled: true },
      UserProfile: { ttl: 3600, enabled: true },
      HelperProfile: { ttl: 3600, enabled: true },
      SupportGroup: { ttl: 1800, enabled: true },
      WellnessChallenge: { ttl: 1800, enabled: true },
      CommunityPost: { ttl: 600, enabled: true },
    };
    
    const modelConfig = cacheConfig[params.model as string];
    
    // Skip if caching not configured for this model
    if (!modelConfig?.enabled) {
      return next(params);
    }
    
    // Generate cache key
    const cacheKey = `db:${params.model}:${params.action}:${JSON.stringify(params.args)}`;
    
    // Try to get from cache
    const cached = await cacheManager.get('API_RESPONSE', cacheKey);
    if (cached) {
      return cached;
    }
    
    // Execute query
    const result = await next(params);
    
    // Cache the result
    if (result) {
      await cacheManager.set('API_RESPONSE', cacheKey, result, modelConfig.ttl);
    }
    
    return result;
  }
  
  /**
   * Performance monitoring middleware
   */
  private async performanceMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ) {
    const startTime = Date.now();
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`[DB] Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
      }
      
      // Track metrics
      if (process.env.NODE_ENV === 'production') {
        await this.trackQueryMetrics(params.model as string, params.action, duration);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[DB] Query error: ${params.model}.${params.action} failed after ${duration}ms`, error);
      throw error;
    }
  }
  
  private async trackQueryMetrics(model: string, action: string, duration: number): Promise<void> {
    try {
      const client = await cacheManager['client'];
      if (client) {
        await client.hincrby('db:metrics:counts', `${model}:${action}`, 1);
        await client.hincrby('db:metrics:duration', `${model}:${action}`, duration);
      }
    } catch (error) {
      // Silently fail metric tracking
    }
  }
}

// Global instance with connection pooling
let prismaClient: OptimizedPrismaClient | null = null;

export function getOptimizedPrismaClient(): OptimizedPrismaClient {
  if (!prismaClient) {
    prismaClient = new OptimizedPrismaClient();
  }
  return prismaClient;
}

/**
 * Database Index Manager
 * Creates and manages database indexes for optimal query performance
 */
export class DatabaseIndexManager {
  private prisma: OptimizedPrismaClient;
  
  constructor() {
    this.prisma = getOptimizedPrismaClient();
  }
  
  /**
   * Create all recommended indexes
   */
  async createIndexes(): Promise<void> {
    const indexes = [
      // User indexes for authentication and profile queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_active ON "User"(email, "isActive") WHERE email IS NOT NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_active ON "User"("lastActiveAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_active ON "User"(role, "isActive")',
      
      // Session indexes for fast session lookups
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token_expires ON "Session"("sessionToken", expires) WHERE expires > NOW()',
      
      // MoodEntry indexes for analytics and tracking
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_user_date ON "MoodEntry"("userId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_score_date ON "MoodEntry"("moodScore", "createdAt" DESC)',
      
      // JournalEntry indexes for user content
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_user_date ON "JournalEntry"("userId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_user_private ON "JournalEntry"("userId", "isPrivate")',
      
      // CommunityPost indexes for feed queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_category_date ON "CommunityPost"(category, "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_author_date ON "CommunityPost"("authorId", "createdAt" DESC) WHERE "authorId" IS NOT NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_pinned ON "CommunityPost"("isPinned", "createdAt" DESC) WHERE "isPinned" = true',
      
      // Comment indexes for threaded discussions
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_post_date ON "Comment"("postId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_parent ON "Comment"("parentId") WHERE "parentId" IS NOT NULL',
      
      // Appointment indexes for scheduling
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_user_date ON "Appointment"("userId", "scheduledAt")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_prof_date ON "Appointment"("professionalId", "scheduledAt")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_status_date ON "Appointment"(status, "scheduledAt")',
      
      // Notification indexes for real-time updates
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_unread ON "Notification"("userId", "isRead", "createdAt" DESC) WHERE "isRead" = false',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_priority ON "Notification"("userId", "isPriority", "createdAt" DESC) WHERE "isPriority" = true',
      
      // HelperProfile indexes for matching
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_verified_rating ON "HelperProfile"("isVerified", rating DESC) WHERE "acceptingClients" = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_specializations ON "HelperProfile" USING GIN(specializations)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_languages ON "HelperProfile" USING GIN(languages)',
      
      // SupportGroup indexes for discovery
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_topic_active ON "SupportGroup"(topic, "isActive") WHERE "isActive" = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_tags ON "SupportGroup" USING GIN(tags)',
      
      // Message indexes for chat performance
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_room_date ON "ChatMessage"("roomId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_author ON "ChatMessage"("authorId", "createdAt" DESC)',
      
      // DirectMessage indexes for conversations
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversation_date ON "DirectMessage"("conversationId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_sender_date ON "DirectMessage"("senderId", "createdAt" DESC)',
      
      // CrisisReport indexes for emergency response
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_severity_date ON "CrisisReport"("severityLevel", "createdAt" DESC) WHERE resolved = false',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_user ON "CrisisReport"("userId", "createdAt" DESC)',
      
      // AuditLog indexes for compliance
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_date ON "AuditLog"("userId", timestamp DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action_date ON "AuditLog"(action, timestamp DESC)',
      
      // Composite indexes for complex queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_composite ON "UserProfile"("userId") INCLUDE ("mentalHealthGoals", "interestedTopics", "wellnessScore")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_client_composite ON "TherapistClient"("therapistId", status, "nextSessionDate") WHERE status IN (\'ACTIVE\', \'INTAKE\')',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_session_composite ON "TherapistSession"("therapistId", "scheduledTime", status) WHERE status = \'SCHEDULED\'',
      
      // Full-text search indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_search ON "CommunityPost" USING GIN(to_tsvector(\'english\', title || \' \' || content))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_search ON "SupportGroup" USING GIN(to_tsvector(\'english\', name || \' \' || description))',
    ];
    
    console.log('[DB] Creating database indexes...');
    
    for (const indexSql of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(indexSql);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message?.includes('already exists')) {
          console.error(`[DB] Failed to create index: ${indexSql.substring(0, 50)}...`, error.message);
        }
      }
    }
    
    console.log('[DB] Database indexes created successfully');
  }
  
  /**
   * Analyze table statistics for query planner
   */
  async analyzeTablesm(): Promise<void> {
    const tables = [
      'User', 'UserProfile', 'Session', 'MoodEntry', 'JournalEntry',
      'CommunityPost', 'Comment', 'Appointment', 'Notification',
      'HelperProfile', 'SupportGroup', 'ChatMessage', 'DirectMessage',
      'CrisisReport', 'AuditLog', 'TherapistClient', 'TherapistSession'
    ];
    
    console.log('[DB] Analyzing table statistics...');
    
    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
      } catch (error) {
        console.error(`[DB] Failed to analyze table ${table}:`, error);
      }
    }
    
    console.log('[DB] Table analysis completed');
  }
  
  /**
   * Get index usage statistics
   */
  async getIndexStats(): Promise<any[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 50
    `;
    
    return await this.prisma.$queryRawUnsafe(query);
  }
  
  /**
   * Get slow query statistics
   */
  async getSlowQueries(): Promise<any[]> {
    const query = `
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        stddev_exec_time,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;
    
    try {
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('[DB] pg_stat_statements extension may not be enabled:', error);
      return [];
    }
  }
}

/**
 * Connection Pool Manager
 * Manages database connection pooling for optimal resource usage
 */
export class ConnectionPoolManager {
  private pool: Pool | null = null;
  private readonly config = {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  
  /**
   * Get or create connection pool
   */
  getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ...this.config,
      });
      
      this.pool.on('error', (err: any) => {
        console.error('[DB Pool] Unexpected error:', err);
      });
      
      this.pool.on('connect', () => {
        console.log('[DB Pool] New client connected');
      });
      
      this.pool.on('remove', () => {
        console.log('[DB Pool] Client removed');
      });
    }
    
    return this.pool;
  }
  
  /**
   * Execute query with automatic connection management
   */
  async query<T>(text: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get pool statistics
   */
  getStats() {
    const pool = this.getPool();
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
  
  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const connectionPool = new ConnectionPoolManager();

/**
 * Query Optimizer
 * Provides optimized query builders for common patterns
 */
export class QueryOptimizer {
  private prisma: OptimizedPrismaClient;
  
  constructor() {
    this.prisma = getOptimizedPrismaClient();
  }
  
  /**
   * Get user with profile (optimized)
   */
  async getUserWithProfile(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        UserProfile: {
          select: {
            mentalHealthGoals: true,
            interestedTopics: true,
            wellnessScore: true,
            lastAssessmentAt: true,
          },
        },
      },
    });
  }
  
  /**
   * Get dashboard metrics (optimized with parallel queries)
   */
  async getDashboardMetrics(userId: string) {
    const [
      moodEntries,
      journalCount,
      appointments,
      notifications,
      supportSessions,
    ] = await Promise.all([
      // Last 30 days of mood entries
      this.prisma.moodEntry.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          moodScore: true,
          anxietyLevel: true,
          energyLevel: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      
      // Journal entry count
      this.prisma.journalEntry.count({
        where: { userId },
      }),
      
      // Upcoming appointments
      this.prisma.appointment.findMany({
        where: {
          userId,
          scheduledAt: { gte: new Date() },
          status: 'scheduled',
        },
        select: {
          id: true,
          scheduledAt: true,
          type: true,
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      
      // Unread notifications count
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      
      // Recent support sessions
      this.prisma.supportSession.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    
    return {
      moodEntries,
      journalCount,
      appointments,
      unreadNotifications: notifications,
      recentSupportSessions: supportSessions,
    };
  }
  
  /**
   * Get paginated community posts (optimized)
   */
  async getCommunityPosts(page: number = 1, limit: number = 20, category?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = { isModerated: false };
    if (category) {
      where.category = category;
    }
    
    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          isAnonymous: true,
          isPinned: true,
          viewCount: true,
          likeCount: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              Comments: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      
      this.prisma.communityPost.count({ where }),
    ]);
    
    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const queryOptimizer = new QueryOptimizer();

// Export database index manager instance
export const dbIndexManager = new DatabaseIndexManager();

// Initialize indexes on startup (only in production)
if (process.env.NODE_ENV === 'production') {
  dbIndexManager.createIndexes().catch(console.error);
  dbIndexManager.analyzeTablesm().catch(console.error);
}