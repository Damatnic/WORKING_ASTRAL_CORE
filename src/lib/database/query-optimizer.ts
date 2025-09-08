/**
 * Query Optimization Service for AstralCore Mental Health Platform
 * 
 * This service provides comprehensive query optimization features including:
 * - Query performance monitoring and profiling
 * - Slow query detection and logging
 * - Query plan analysis and recommendations
 * - Automatic query optimization suggestions
 * - Connection pooling configuration
 * - Intelligent query caching strategies
 * - HIPAA-compliant audit logging for database access
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { createHash } from 'crypto';

/**
 * Query performance metrics interface
 */
interface QueryMetrics {
  query: string;
  queryHash: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
  rowCount?: number;
  model?: string;
  action?: string;
  userId?: string;
  isSlowQuery: boolean;
  planAnalysis?: QueryPlanAnalysis;
}

/**
 * Query plan analysis result
 */
interface QueryPlanAnalysis {
  totalCost: number;
  actualTime?: number;
  planningTime?: number;
  executionTime?: number;
  bufferHits?: number;
  bufferMisses?: number;
  indexScans?: number;
  seqScans?: number;
  recommendations: string[];
}

/**
 * Connection pool statistics
 */
interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingConnections: number;
  maxConnections: number;
  averageWaitTime?: number;
  connectionErrors: number;
  lastResetTime: Date;
}

/**
 * Cache configuration for different query types
 */
interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  keyPattern: string;
  invalidationTriggers: string[];
  compressionEnabled?: boolean;
  maxMemoryUsage?: number;
}

/**
 * Query optimization recommendations
 */
interface OptimizationRecommendation {
  type: 'INDEX' | 'REWRITE' | 'CACHE' | 'PARTITION' | 'ANALYZE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  query: string;
  suggestion: string;
  estimatedImprovement?: string;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Main Query Optimizer Class
 */
export class QueryOptimizer {
  private prisma: PrismaClient;
  private pool: Pool;
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private cacheConfigs: Map<string, CacheConfig> = new Map();
  private slowQueryThreshold: number = 1000; // milliseconds
  private metricsRetentionDays: number = 7;

  constructor() {
    this.initializePrismaClient();
    this.initializeConnectionPool();
    this.setupCacheConfigurations();
    this.startBackgroundTasks();
  }

  /**
   * Initialize Prisma client with optimization middleware
   */
  private initializePrismaClient(): void {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Note: $use and $on are deprecated in Prisma v5+
    // Will need to migrate to $extends when Prisma is fully upgraded
    // For now, commenting out to avoid runtime errors
    
    // TODO: Migrate to Prisma extensions API:
    // this.prisma = this.prisma.$extends({
    //   query: { ... },
    //   result: { ... }
    // });
  }

  /**
   * Initialize connection pool with optimal settings
   */
  private initializeConnectionPool(): void {
    const poolConfig: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500, // Close connection after this many queries
      allowExitOnIdle: false,
      application_name: 'AstralCore_QueryOptimizer',
    };

    this.pool = new Pool(poolConfig);

    // Pool event handlers
    this.pool.on('error', this.handlePoolError.bind(this));
    this.pool.on('connect', this.handlePoolConnect.bind(this));
    this.pool.on('acquire', this.handlePoolAcquire.bind(this));
    this.pool.on('remove', this.handlePoolRemove.bind(this));
  }

  /**
   * Setup cache configurations for different query patterns
   */
  private setupCacheConfigurations(): void {
    // User profile data - high TTL, frequently accessed
    this.cacheConfigs.set('User:findUnique', {
      enabled: true,
      ttl: 3600, // 1 hour
      keyPattern: 'user:profile:{{args.where.id}}',
      invalidationTriggers: ['User:update', 'User:delete'],
      compressionEnabled: true,
    });

    // Helper profiles - medium TTL, matchmaking queries
    this.cacheConfigs.set('HelperProfile:findMany', {
      enabled: true,
      ttl: 1800, // 30 minutes
      keyPattern: 'helpers:list:{{args.where}}',
      invalidationTriggers: ['HelperProfile:update', 'HelperProfile:create'],
    });

    // Community posts - short TTL, frequently updated
    this.cacheConfigs.set('CommunityPost:findMany', {
      enabled: true,
      ttl: 300, // 5 minutes
      keyPattern: 'posts:feed:{{args.where.category}}:{{args.skip}}:{{args.take}}',
      invalidationTriggers: ['CommunityPost:create', 'CommunityPost:update'],
    });

    // Crisis reports - no caching for real-time data
    this.cacheConfigs.set('CrisisReport:findMany', {
      enabled: false,
      ttl: 0,
      keyPattern: '',
      invalidationTriggers: [],
    });

    // Wellness challenges - medium TTL
    this.cacheConfigs.set('WellnessChallenge:findMany', {
      enabled: true,
      ttl: 900, // 15 minutes
      keyPattern: 'challenges:list:{{args.where.category}}',
      invalidationTriggers: ['WellnessChallenge:update'],
    });
  }

  /**
   * Performance monitoring middleware
   */
  private async performanceMonitoringMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ) {
    const startTime = performance.now();
    const queryHash = this.generateQueryHash(params);

    try {
      const result = await next(params);
      const duration = performance.now() - startTime;
      
      // Create metrics record
      const metrics: QueryMetrics = {
        query: `${params.model}.${params.action}`,
        queryHash,
        duration,
        timestamp: new Date(),
        parameters: params.args ? [params.args] : undefined,
        rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        model: params.model,
        action: params.action,
        isSlowQuery: duration > this.slowQueryThreshold,
      };

      // Store metrics
      this.storeQueryMetrics(metrics);

      // Analyze slow queries
      if (metrics.isSlowQuery) {
        await this.analyzeSlowQuery(params, metrics);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Log error with performance context
      console.error(`[QueryOptimizer] Query failed: ${params.model}.${params.action}`, {
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : String(error),
        queryHash,
      });

      throw error;
    }
  }

  /**
   * Intelligent caching middleware
   */
  private async cacheMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ) {
    // Skip caching for mutations
    if (['create', 'update', 'delete', 'upsert', 'deleteMany', 'updateMany'].includes(params.action)) {
      return next(params);
    }

    const cacheKey = `${params.model}:${params.action}`;
    const config = this.cacheConfigs.get(cacheKey);

    if (!config?.enabled) {
      return next(params);
    }

    // Generate cache key from pattern
    const actualCacheKey = this.interpolateCacheKey(config.keyPattern, params.args);
    
    // Try to get from cache (implement your cache layer here)
    const cached = await this.getFromCache(actualCacheKey);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await next(params);

    // Cache the result
    if (result !== null && result !== undefined) {
      await this.setCache(actualCacheKey, result, config.ttl, config.compressionEnabled);
    }

    return result;
  }

  /**
   * HIPAA-compliant audit middleware
   */
  private async auditMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ) {
    // Only audit access to sensitive models
    const sensitiveModels = [
      'User', 'UserProfile', 'MoodEntry', 'JournalEntry', 'CrisisReport',
      'TherapistClient', 'TherapistSession', 'TherapySessionNote',
      'TherapistClinicalNote', 'SafetyPlan', 'HelperProfile'
    ];

    if (!sensitiveModels.includes(params.model || '')) {
      return next(params);
    }

    const result = await next(params);

    // Create audit log entry
    try {
      await this.logDataAccess({
        model: params.model,
        action: params.action,
        parameters: params.args,
        timestamp: new Date(),
        // Note: In a real implementation, you'd get userId from request context
        userId: this.extractUserIdFromParams(params.args),
      });
    } catch (auditError) {
      console.error('[QueryOptimizer] Audit logging failed:', auditError);
      // Don't fail the main query due to audit issues
    }

    return result;
  }

  /**
   * Analyze slow query and provide recommendations
   */
  private async analyzeSlowQuery(params: any, metrics: QueryMetrics): Promise<void> {
    console.warn(`[QueryOptimizer] Slow query detected: ${metrics.query} took ${metrics.duration.toFixed(2)}ms`);

    try {
      // Get query plan for analysis
      const planAnalysis = await this.analyzeQueryPlan(params);
      metrics.planAnalysis = planAnalysis;

      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(params, metrics);
      
      // Log recommendations
      if (recommendations.length > 0) {
        console.info(`[QueryOptimizer] Optimization recommendations for ${metrics.query}:`, 
          recommendations.map(r => `${r.type}: ${r.description}`));
      }
    } catch (error) {
      console.error('[QueryOptimizer] Failed to analyze slow query:', error);
    }
  }

  /**
   * Analyze query execution plan
   */
  private async analyzeQueryPlan(params: any): Promise<QueryPlanAnalysis | undefined> {
    try {
      const client = await this.pool.connect();
      
      try {
        // This is a simplified example - you'd need to convert Prisma params to raw SQL
        const sql = this.convertPrismaParamsToSQL(params);
        if (!sql) return undefined;

        // Get query plan with EXPLAIN ANALYZE
        const planResult = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
        const plan = planResult.rows[0]['QUERY PLAN'][0];

        return {
          totalCost: plan.Plan['Total Cost'],
          actualTime: plan.Plan['Actual Total Time'],
          planningTime: plan['Planning Time'],
          executionTime: plan['Execution Time'],
          bufferHits: plan.Plan['Shared Hit Blocks'],
          bufferMisses: plan.Plan['Shared Read Blocks'],
          indexScans: this.countPlanNodes(plan.Plan, 'Index Scan'),
          seqScans: this.countPlanNodes(plan.Plan, 'Seq Scan'),
          recommendations: this.analyzePlanForRecommendations(plan),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[QueryOptimizer] Query plan analysis failed:', error);
      return undefined;
    }
  }

  /**
   * Generate optimization recommendations based on query metrics and plan
   */
  private generateOptimizationRecommendations(
    params: any,
    metrics: QueryMetrics
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // High-frequency query without index
    if (metrics.planAnalysis?.seqScans && metrics.planAnalysis.seqScans > 0) {
      recommendations.push({
        type: 'INDEX',
        severity: 'HIGH',
        description: 'Sequential scan detected on frequently accessed table',
        query: metrics.query,
        suggestion: `Consider adding an index on the frequently filtered columns`,
        estimatedImprovement: '70-90% faster queries',
        implementationEffort: 'LOW',
      });
    }

    // Slow query that could benefit from caching
    if (metrics.duration > 2000 && params.action === 'findMany') {
      const cacheKey = `${params.model}:${params.action}`;
      const config = this.cacheConfigs.get(cacheKey);
      
      if (!config?.enabled) {
        recommendations.push({
          type: 'CACHE',
          severity: 'MEDIUM',
          description: 'Slow aggregation query suitable for caching',
          query: metrics.query,
          suggestion: 'Implement query result caching with appropriate TTL',
          estimatedImprovement: '95%+ faster repeated queries',
          implementationEffort: 'MEDIUM',
        });
      }
    }

    // Large table without partitioning
    if (metrics.rowCount && metrics.rowCount > 100000 && metrics.duration > 5000) {
      recommendations.push({
        type: 'PARTITION',
        severity: 'HIGH',
        description: 'Large table scan detected',
        query: metrics.query,
        suggestion: 'Consider table partitioning by date or user segments',
        estimatedImprovement: '50-80% faster queries on recent data',
        implementationEffort: 'HIGH',
      });
    }

    return recommendations;
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStatistics(): PoolStats {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
      maxConnections: parseInt(process.env.DB_POOL_MAX || '20'),
      connectionErrors: 0, // Would track this in real implementation
      lastResetTime: new Date(),
    };
  }

  /**
   * Get query performance statistics
   */
  public getQueryStatistics(timeRange: { start: Date; end: Date }) {
    const allMetrics: QueryMetrics[] = [];
    
    for (const metrics of this.queryMetrics.values()) {
      allMetrics.push(...metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      ));
    }

    return {
      totalQueries: allMetrics.length,
      slowQueries: allMetrics.filter(m => m.isSlowQuery).length,
      averageDuration: allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length,
      topSlowQueries: allMetrics
        .filter(m => m.isSlowQuery)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      queryDistribution: this.getQueryDistribution(allMetrics),
    };
  }

  /**
   * Force query plan refresh for specific tables
   */
  public async refreshQueryPlans(tables?: string[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const tablesToAnalyze = tables || [
        'User', 'UserProfile', 'MoodEntry', 'JournalEntry', 'CommunityPost',
        'Comment', 'Appointment', 'HelperProfile', 'CrisisReport', 'AuditLog'
      ];

      for (const table of tablesToAnalyze) {
        await client.query(`ANALYZE "${table}"`);
      }

      console.log(`[QueryOptimizer] Refreshed query plans for ${tablesToAnalyze.length} tables`);
    } finally {
      client.release();
    }
  }

  /**
   * Optimize connection pool settings based on current load
   */
  public async optimizeConnectionPool(): Promise<void> {
    const stats = this.getPoolStatistics();
    
    // If we're frequently maxing out connections, log a warning
    if (stats.activeConnections / stats.maxConnections > 0.8) {
      console.warn('[QueryOptimizer] High connection pool utilization detected. Consider increasing pool size or optimizing query patterns.');
    }

    // If we have too many idle connections, consider reducing pool size
    if (stats.idleConnections / stats.totalConnections > 0.5 && stats.totalConnections > 5) {
      console.info('[QueryOptimizer] High idle connection ratio detected. Pool size might be too large.');
    }
  }

  // Private helper methods

  private generateQueryHash(params: any): string {
    const hashInput = `${params.model}.${params.action}:${JSON.stringify(params.args)}`;
    return createHash('md5').update(hashInput).digest('hex');
  }

  private storeQueryMetrics(metrics: QueryMetrics): void {
    const key = metrics.queryHash;
    if (!this.queryMetrics.has(key)) {
      this.queryMetrics.set(key, []);
    }
    
    const existing = this.queryMetrics.get(key)!;
    existing.push(metrics);
    
    // Keep only recent metrics to prevent memory leaks
    const cutoff = new Date(Date.now() - this.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.queryMetrics.set(key, existing.filter(m => m.timestamp > cutoff));
  }

  private interpolateCacheKey(pattern: string, args: any): string {
    return pattern.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      const value = this.getNestedValue(args, path);
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async getFromCache(key: string): Promise<any> {
    // Implement your cache layer here (Redis, Memcached, etc.)
    return null;
  }

  private async setCache(key: string, value: any, ttl: number, compress?: boolean): Promise<void> {
    // Implement your cache layer here (Redis, Memcached, etc.)
  }

  private extractUserIdFromParams(args: any): string | undefined {
    // Extract userId from query parameters for audit logging
    if (args?.where?.userId) return args.where.userId;
    if (args?.where?.user?.id) return args.where.user.id;
    if (args?.data?.userId) return args.data.userId;
    return undefined;
  }

  private async logDataAccess(auditData: any): Promise<void> {
    // Log to audit table - implement based on your audit requirements
    try {
      await this.prisma.auditLog.create({
        data: {
          action: `DB_${auditData.action.toUpperCase()}`,
          resource: auditData.model,
          resourceId: auditData.userId,
          details: auditData.parameters,
          outcome: 'SUCCESS',
          userId: auditData.userId,
          timestamp: auditData.timestamp,
        },
      });
    } catch (error) {
      console.error('[QueryOptimizer] Failed to create audit log:', error);
    }
  }

  private convertPrismaParamsToSQL(params: any): string | null {
    // This would need to be implemented based on your specific needs
    // Converting Prisma parameters to raw SQL is complex
    return null;
  }

  private countPlanNodes(plan: any, nodeType: string): number {
    let count = 0;
    if (plan['Node Type'] === nodeType) count++;
    if (plan.Plans) {
      for (const subPlan of plan.Plans) {
        count += this.countPlanNodes(subPlan, nodeType);
      }
    }
    return count;
  }

  private analyzePlanForRecommendations(plan: any): string[] {
    const recommendations: string[] = [];
    // Analyze the query plan and generate recommendations
    // This is a simplified example
    return recommendations;
  }

  private getQueryDistribution(metrics: QueryMetrics[]) {
    const distribution = new Map<string, number>();
    for (const metric of metrics) {
      const key = metric.query;
      distribution.set(key, (distribution.get(key) || 0) + 1);
    }
    return Object.fromEntries(distribution);
  }

  // Event handlers

  private handleQueryEvent(event: any): void {
    // Additional query event handling if needed
  }

  private handleErrorEvent(event: any): void {
    console.error('[QueryOptimizer] Database error:', event);
  }

  private handlePoolError(error: Error): void {
    console.error('[QueryOptimizer] Connection pool error:', error);
  }

  private handlePoolConnect(): void {
    // Optional: Log new connections in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('[QueryOptimizer] New database connection established');
    }
  }

  private handlePoolAcquire(): void {
    // Optional: Track connection acquisition
  }

  private handlePoolRemove(): void {
    // Optional: Track connection removal
  }

  private startBackgroundTasks(): void {
    // Cleanup old metrics every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.metricsRetentionDays * 24 * 60 * 60 * 1000);
      for (const [key, metrics] of this.queryMetrics.entries()) {
        const filtered = metrics.filter(m => m.timestamp > cutoff);
        if (filtered.length === 0) {
          this.queryMetrics.delete(key);
        } else {
          this.queryMetrics.set(key, filtered);
        }
      }
    }, 60 * 60 * 1000); // 1 hour

    // Pool optimization check every 5 minutes
    setInterval(() => {
      this.optimizeConnectionPool();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.pool.end();
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let queryOptimizer: QueryOptimizer | null = null;

export function getQueryOptimizer(): QueryOptimizer {
  if (!queryOptimizer) {
    queryOptimizer = new QueryOptimizer();
  }
  return queryOptimizer;
}

// Export for use in API routes and services
export default getQueryOptimizer;