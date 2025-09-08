/**
 * Multi-Tier Cache Manager for AstralCore
 * Advanced caching system with memory + Redis tiers, statistics, and automatic refresh
 * 
 * Features:
 * - Multi-tier caching (L1: Memory, L2: Redis)
 * - Cache statistics and monitoring
 * - Bulk operations and batch processing
 * - Cache preloading and warming
 * - Automatic cache refresh
 * - Circuit breaker pattern
 * - Cache analytics and insights
 */

import LRU from 'lru-cache';
import { redisCacheService, CacheType } from './redis-cache';
import { cacheStrategyManager } from './cache-strategies';
import { EventEmitter } from 'events';

/**
 * Cache tier configuration
 */
const CACHE_TIER_CONFIG = {
  // L1 Cache (Memory) - Fast but limited
  L1: {
    maxSize: 1000, // Maximum number of items
    maxAge: 300 * 1000, // 5 minutes in milliseconds
    updateAgeOnGet: true,
    allowStale: false,
  },
  
  // L2 Cache (Redis) - Slower but persistent
  L2: {
    fallbackOnError: true,
    maxRetries: 3,
    retryDelay: 100,
  },
} as const;

/**
 * Cache statistics interface
 */
interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  totalHits: number;
  totalMisses: number;
  hitRatio: number;
  l1HitRatio: number;
  l2HitRatio: number;
  operations: number;
  errors: number;
  avgResponseTime: number;
  memoryUsage: {
    l1Size: number;
    l1MaxSize: number;
    l1Utilization: number;
  };
}

/**
 * Cache operation result
 */
interface CacheOperationResult<T> {
  success: boolean;
  data?: T;
  source?: 'L1' | 'L2' | 'FETCH';
  responseTime?: number;
  error?: Error;
}

/**
 * Cache refresh configuration
 */
interface CacheRefreshConfig {
  enabled: boolean;
  interval: number; // milliseconds
  staleThreshold: number; // milliseconds
  maxAge: number; // milliseconds
  fetcher: () => Promise<any>;
}

/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker for cache operations
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly recoveryTimeout: number = 60000; // 1 minute
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }
  
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
  
  getState(): CircuitBreakerState {
    return this.state;
  }
}

/**
 * Multi-Tier Cache Manager
 */
export class MultiTierCacheManager extends EventEmitter {
  private l1Cache: LRU<string, any>;
  private circuitBreaker: CircuitBreaker;
  private stats: CacheStats;
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;
  
  constructor() {
    super();
    
    // Initialize L1 cache (Memory)
    this.l1Cache = new LRU({
      max: CACHE_TIER_CONFIG.L1.maxSize,
      maxAge: CACHE_TIER_CONFIG.L1.maxAge,
      updateAgeOnGet: CACHE_TIER_CONFIG.L1.updateAgeOnGet,
      allowStale: CACHE_TIER_CONFIG.L1.allowStale,
      dispose: (key, value) => {
        this.emit('l1-evict', key, value);
      },
    });
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker();
    
    // Initialize statistics
    this.resetStats();
    
    console.log('[MultiTierCacheManager] Initialized');
  }
  
  /**
   * Initialize cache manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize Redis cache service
      await redisCacheService.initialize();
      
      // Start cache warming
      await this.warmCriticalData();
      
      // Set up periodic statistics collection
      this.startStatsCollection();
      
      this.isInitialized = true;
      console.log('[MultiTierCacheManager] Initialization completed');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('[MultiTierCacheManager] Initialization error:', error);
      throw error;
    }
  }
  
  /**
   * Get value from multi-tier cache
   */
  async get<T>(type: CacheType, key: string): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateCacheKey(type, key);
      
      // L1 Cache (Memory) - Fastest
      const l1Result = this.l1Cache.get(cacheKey);
      if (l1Result !== undefined) {
        this.stats.l1Hits++;
        this.stats.totalHits++;
        const responseTime = Date.now() - startTime;
        
        return {
          success: true,
          data: l1Result as T,
          source: 'L1',
          responseTime,
        };
      }
      
      this.stats.l1Misses++;
      
      // L2 Cache (Redis) - Fallback
      const l2Result = await this.circuitBreaker.execute(async () => {
        return await redisCacheService.get<T>(type, key);
      });
      
      if (l2Result !== null) {
        this.stats.l2Hits++;
        this.stats.totalHits++;
        
        // Populate L1 cache for future requests
        this.l1Cache.set(cacheKey, l2Result);
        
        const responseTime = Date.now() - startTime;
        
        return {
          success: true,
          data: l2Result,
          source: 'L2',
          responseTime,
        };
      }
      
      this.stats.l2Misses++;
      this.stats.totalMisses++;
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        source: undefined,
        responseTime,
      };
      
    } catch (error) {
      this.stats.errors++;
      console.error('[MultiTierCacheManager] Get error:', error);
      
      return {
        success: false,
        error: error as Error,
        responseTime: Date.now() - startTime,
      };
    } finally {
      this.stats.operations++;
      this.updateAverageResponseTime(Date.now() - startTime);
    }
  }
  
  /**
   * Set value in multi-tier cache
   */
  async set<T>(
    type: CacheType,
    key: string,
    value: T,
    ttl?: number
  ): Promise<CacheOperationResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateCacheKey(type, key);
      
      // Set in L1 cache (Memory)
      this.l1Cache.set(cacheKey, value);
      
      // Set in L2 cache (Redis) with circuit breaker
      let l2Success = false;
      try {
        l2Success = await this.circuitBreaker.execute(async () => {
          return await redisCacheService.set(type, key, value, ttl);
        });
      } catch (error) {
        console.warn('[MultiTierCacheManager] L2 cache set failed:', error);
        this.stats.errors++;
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        data: l2Success,
        responseTime,
      };
      
    } catch (error) {
      this.stats.errors++;
      console.error('[MultiTierCacheManager] Set error:', error);
      
      return {
        success: false,
        error: error as Error,
        responseTime: Date.now() - startTime,
      };
    } finally {
      this.stats.operations++;
    }
  }
  
  /**
   * Delete value from multi-tier cache
   */
  async delete(type: CacheType, key: string): Promise<CacheOperationResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateCacheKey(type, key);
      
      // Delete from L1 cache
      const l1Deleted = this.l1Cache.delete(cacheKey);
      
      // Delete from L2 cache
      let l2Deleted = false;
      try {
        l2Deleted = await this.circuitBreaker.execute(async () => {
          return await redisCacheService.delete(type, key);
        });
      } catch (error) {
        console.warn('[MultiTierCacheManager] L2 cache delete failed:', error);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: l1Deleted || l2Deleted,
        data: l1Deleted || l2Deleted,
        responseTime,
      };
      
    } catch (error) {
      this.stats.errors++;
      console.error('[MultiTierCacheManager] Delete error:', error);
      
      return {
        success: false,
        error: error as Error,
        responseTime: Date.now() - startTime,
      };
    } finally {
      this.stats.operations++;
    }
  }
  
  /**
   * Get or set with fallback fetcher
   */
  async getOrSet<T>(
    type: CacheType,
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<CacheOperationResult<T>> {
    // First try to get from cache
    const cacheResult = await this.get<T>(type, key);
    
    if (cacheResult.success && cacheResult.data !== undefined) {
      return cacheResult;
    }
    
    // Cache miss - fetch fresh data
    const startTime = Date.now();
    
    try {
      const freshData = await fetcher();
      
      // Store in cache
      await this.set(type, key, freshData, ttl);
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        data: freshData,
        source: 'FETCH',
        responseTime,
      };
      
    } catch (error) {
      console.error('[MultiTierCacheManager] Fetcher error:', error);
      
      return {
        success: false,
        error: error as Error,
        responseTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Batch get operations
   */
  async batchGet<T>(
    type: CacheType,
    keys: string[]
  ): Promise<Map<string, CacheOperationResult<T>>> {
    const results = new Map<string, CacheOperationResult<T>>();
    
    const batchPromises = keys.map(async key => {
      const result = await this.get<T>(type, key);
      results.set(key, result);
    });
    
    await Promise.all(batchPromises);
    
    return results;
  }
  
  /**
   * Batch set operations
   */
  async batchSet<T>(
    type: CacheType,
    entries: Map<string, T>,
    ttl?: number
  ): Promise<Map<string, CacheOperationResult<boolean>>> {
    const results = new Map<string, CacheOperationResult<boolean>>();
    
    const batchPromises = Array.from(entries.entries()).map(async ([key, value]) => {
      const result = await this.set(type, key, value, ttl);
      results.set(key, result);
    });
    
    await Promise.all(batchPromises);
    
    return results;
  }
  
  /**
   * Cache preloading for critical data
   */
  async preload(
    preloadConfigs: Array<{
      type: CacheType;
      key: string;
      fetcher: () => Promise<any>;
      ttl?: number;
    }>
  ): Promise<void> {
    console.log('[MultiTierCacheManager] Starting cache preloading...');
    
    const preloadPromises = preloadConfigs.map(async config => {
      try {
        const data = await config.fetcher();
        await this.set(config.type, config.key, data, config.ttl);
        console.log(`[MultiTierCacheManager] Preloaded: ${config.type}:${config.key}`);
      } catch (error) {
        console.error(`[MultiTierCacheManager] Preload failed for ${config.type}:${config.key}:`, error);
      }
    });
    
    await Promise.all(preloadPromises);
    console.log('[MultiTierCacheManager] Cache preloading completed');
  }
  
  /**
   * Set up automatic cache refresh
   */
  setupAutoRefresh(
    type: CacheType,
    key: string,
    config: CacheRefreshConfig
  ): void {
    if (!config.enabled) return;
    
    const refreshKey = `${type}:${key}`;
    
    // Clear existing interval
    const existingInterval = this.refreshIntervals.get(refreshKey);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Set up new refresh interval
    const interval = setInterval(async () => {
      try {
        const cached = await this.get(type, key);
        
        if (cached.success && cached.data) {
          const age = Date.now() - (cached.responseTime || 0);
          
          if (age > config.staleThreshold) {
            console.log(`[MultiTierCacheManager] Refreshing stale cache: ${refreshKey}`);
            const freshData = await config.fetcher();
            await this.set(type, key, freshData);
          }
        }
      } catch (error) {
        console.error(`[MultiTierCacheManager] Auto-refresh error for ${refreshKey}:`, error);
      }
    }, config.interval);
    
    this.refreshIntervals.set(refreshKey, interval);
  }
  
  /**
   * Clear auto-refresh for a cache entry
   */
  clearAutoRefresh(type: CacheType, key: string): void {
    const refreshKey = `${type}:${key}`;
    const interval = this.refreshIntervals.get(refreshKey);
    
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(refreshKey);
    }
  }
  
  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    try {
      // Clear L1 cache
      this.l1Cache.clear();
      
      // Clear L2 cache (Redis)
      await this.circuitBreaker.execute(async () => {
        // This would implement a Redis FLUSHDB command
        // For safety, we'll just clear patterns
        const types: CacheType[] = [
          'SESSION',
          'USER_PROFILE',
          'WELLNESS_AGGREGATION',
          'COMMUNITY_RANKING',
          'CRISIS_RESOURCES',
          'THERAPY_AVAILABILITY',
          'SYSTEM_CONFIG',
          'API_RESPONSE',
          'DASHBOARD_METRICS',
          'SEARCH_RESULTS',
        ];
        
        const clearPromises = types.map(async type => {
          await redisCacheService.invalidatePattern(`astral:${type.toLowerCase()}:*`);
        });
        
        await Promise.all(clearPromises);
      });
      
      console.log('[MultiTierCacheManager] All caches cleared');
      
    } catch (error) {
      console.error('[MultiTierCacheManager] Clear all error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const l1Size = this.l1Cache.length;
    const l1MaxSize = this.l1Cache.max;
    const l1Utilization = l1Size / l1MaxSize;
    
    return {
      ...this.stats,
      hitRatio: this.calculateHitRatio(this.stats.totalHits, this.stats.totalMisses),
      l1HitRatio: this.calculateHitRatio(this.stats.l1Hits, this.stats.l1Misses),
      l2HitRatio: this.calculateHitRatio(this.stats.l2Hits, this.stats.l2Misses),
      memoryUsage: {
        l1Size,
        l1MaxSize,
        l1Utilization,
      },
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRatio: 0,
      l1HitRatio: 0,
      l2HitRatio: 0,
      operations: 0,
      errors: 0,
      avgResponseTime: 0,
      memoryUsage: {
        l1Size: 0,
        l1MaxSize: CACHE_TIER_CONFIG.L1.maxSize,
        l1Utilization: 0,
      },
    };
  }
  
  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    l1Status: string;
    l2Status: string;
    circuitBreakerState: CircuitBreakerState;
    stats: CacheStats;
  }> {
    const l2Healthy = await redisCacheService.healthCheck();
    const circuitBreakerState = this.circuitBreaker.getState();
    
    return {
      healthy: l2Healthy && circuitBreakerState !== CircuitBreakerState.OPEN,
      l1Status: 'OK',
      l2Status: l2Healthy ? 'OK' : 'ERROR',
      circuitBreakerState,
      stats: this.getStats(),
    };
  }
  
  /**
   * Warm critical data
   */
  private async warmCriticalData(): Promise<void> {
    try {
      await cacheStrategyManager.warmUpAll();
    } catch (error) {
      console.error('[MultiTierCacheManager] Critical data warming error:', error);
    }
  }
  
  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    setInterval(() => {
      const stats = this.getStats();
      this.emit('stats', stats);
      
      // Log stats periodically
      console.log('[MultiTierCacheManager] Stats:', {
        hitRatio: stats.hitRatio,
        operations: stats.operations,
        errors: stats.errors,
        l1Utilization: stats.memoryUsage.l1Utilization,
      });
    }, 60000); // Every minute
  }
  
  /**
   * Generate cache key
   */
  private generateCacheKey(type: CacheType, key: string): string {
    return `${type}:${key}`;
  }
  
  /**
   * Calculate hit ratio
   */
  private calculateHitRatio(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }
  
  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.stats.operations === 0) {
      this.stats.avgResponseTime = responseTime;
    } else {
      this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Clear all refresh intervals
      this.refreshIntervals.forEach(interval => clearInterval(interval));
      this.refreshIntervals.clear();
      
      // Clear L1 cache
      this.l1Cache.clear();
      
      // Shutdown Redis cache service
      await redisCacheService.shutdown();
      
      this.isInitialized = false;
      console.log('[MultiTierCacheManager] Shutdown completed');
      
      this.emit('shutdown');
      
    } catch (error) {
      console.error('[MultiTierCacheManager] Shutdown error:', error);
    }
  }
}

// Export singleton instance
export const multiTierCacheManager = new MultiTierCacheManager();

// Export types and interfaces
export { CacheStats, CacheOperationResult, CacheRefreshConfig, CircuitBreakerState };