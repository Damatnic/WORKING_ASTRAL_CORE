/**
 * Redis Cache Layer Implementation
 * Provides high-performance caching for frequently accessed data
 * with automatic cache invalidation and warming strategies
 */

// Server-only imports - Redis is not available in browser
let Redis: any;
let createHash: any;

if (typeof window === 'undefined') {
  Redis = require('ioredis').default;
  createHash = require('crypto').createHash;
}

// Cache configuration with TTL values for different data types
const CACHE_CONFIG = {
  // User session cache (24 hours)
  SESSION: { ttl: 86400, prefix: 'session:' },
  // User profile cache (1 hour)
  USER_PROFILE: { ttl: 3600, prefix: 'user:' },
  // Dashboard metrics cache (5 minutes)
  DASHBOARD_METRICS: { ttl: 300, prefix: 'metrics:' },
  // Mood entries cache (30 minutes)
  MOOD_ENTRIES: { ttl: 1800, prefix: 'mood:' },
  // Community posts cache (10 minutes)
  COMMUNITY_POSTS: { ttl: 600, prefix: 'posts:' },
  // Helper profiles cache (1 hour)
  HELPER_PROFILES: { ttl: 3600, prefix: 'helper:' },
  // Support groups cache (30 minutes)
  SUPPORT_GROUPS: { ttl: 1800, prefix: 'groups:' },
  // Crisis resources cache (1 hour)
  CRISIS_RESOURCES: { ttl: 3600, prefix: 'crisis:' },
  // Notification cache (5 minutes)
  NOTIFICATIONS: { ttl: 300, prefix: 'notif:' },
  // API response cache (varies)
  API_RESPONSE: { ttl: 60, prefix: 'api:' },
} as const;

type CacheType = keyof typeof CACHE_CONFIG;

/**
 * Redis Client Configuration
 * Optimized for performance with connection pooling and retry logic
 */
const redisConfig: any = typeof window === 'undefined' ? {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: any) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  // Connection pool settings
  enableOfflineQueue: true,
  maxLoadingRetryTime: 10000,
  // Performance optimizations
  enableAutoPipelining: true,
  autoPipeliningIgnoredCommands: ['info', 'ping'],
} : {};

// Singleton Redis client instance
let redisClient: any = null;
let redisSubscriber: any = null;

/**
 * Get or create Redis client instance
 */
export async function getRedisClient(): Promise<any> {
  // Return null for client-side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  if (!redisClient && Redis) {
    redisClient = new Redis(redisConfig);
    
    // Set up error handling
    redisClient.on('error', (err: any) => {
      console.error('[Redis] Client error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
    
    redisClient.on('ready', () => {
      console.log('[Redis] Ready to handle commands');
    });
    
    // Connect if not already connected
    if (redisClient.status === 'wait') {
      await redisClient.connect();
    }
  }
  
  return redisClient;
}

/**
 * Get or create Redis subscriber instance for pub/sub
 */
export async function getRedisSubscriber(): Promise<any> {
  // Return null for client-side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  if (!redisSubscriber && Redis) {
    redisSubscriber = new Redis(redisConfig);
    
    redisSubscriber.on('error', (err: any) => {
      console.error('[Redis Subscriber] Error:', err);
    });
    
    if (redisSubscriber.status === 'wait') {
      await redisSubscriber.connect();
    }
  }
  
  return redisSubscriber;
}

/**
 * Generate cache key with prefix and hash
 */
function generateCacheKey(type: CacheType, identifier: string): string {
  const config = CACHE_CONFIG[type];
  // Use simple string concatenation on client side
  if (typeof window !== 'undefined' || !createHash) {
    return `${config.prefix}${identifier}`;
  }
  const hash = createHash('sha256').update(identifier).digest('hex').substring(0, 8);
  return `${config.prefix}${hash}`;
}

/**
 * Cache Manager Class
 * Provides high-level caching operations with automatic serialization
 */
export class CacheManager {
  private client: any = null;
  
  /**
   * Check if running on server
   */
  private isServer(): boolean {
    return typeof window === 'undefined';
  }
  
  /**
   * Initialize cache manager
   */
  async initialize(): Promise<void> {
    // Skip initialization on client side
    if (!this.isServer()) {
      return;
    }
    this.client = await getRedisClient();
  }
  
  /**
   * Get value from cache
   */
  async get<T>(type: CacheType, key: string): Promise<T | null> {
    try {
      // Return null on client side
      if (typeof window !== 'undefined') {
        return null;
      }
      
      if (!this.client) await this.initialize();
      if (!this.client) return null;
      
      const cacheKey = generateCacheKey(type, key);
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        // Update access metrics
        await this.client.hincrby('cache:metrics', `${type}:hits`, 1);
        return JSON.parse(cached) as T;
      }
      
      // Update miss metrics
      await this.client.hincrby('cache:metrics', `${type}:misses`, 1);
      return null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }
  
  /**
   * Set value in cache with automatic TTL
   */
  async set<T>(type: CacheType, key: string, value: T, customTtl?: number): Promise<boolean> {
    try {
      // Skip on client side
      if (typeof window !== 'undefined') {
        return false;
      }
      
      if (!this.client) await this.initialize();
      if (!this.client) return false;
      
      const cacheKey = generateCacheKey(type, key);
      const ttl = customTtl || CACHE_CONFIG[type].ttl;
      const serialized = JSON.stringify(value);
      
      const result = await this.client.setex(cacheKey, ttl, serialized);
      
      // Update set metrics
      await this.client.hincrby('cache:metrics', `${type}:sets`, 1);
      
      return result === 'OK';
    } catch (error) {
      console.error('[Cache] Set error:', error);
      return false;
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(type: CacheType, key: string): Promise<boolean> {
    try {
      // Skip on client side
      if (typeof window !== 'undefined') {
        return false;
      }
      
      if (!this.client) await this.initialize();
      if (!this.client) return false;
      
      const cacheKey = generateCacheKey(type, key);
      const result = await this.client.del(cacheKey);
      
      // Update delete metrics
      await this.client.hincrby('cache:metrics', `${type}:deletes`, 1);
      
      return result === 1;
    } catch (error) {
      console.error('[Cache] Delete error:', error);
      return false;
    }
  }
  
  /**
   * Clear all cache entries of a specific type
   */
  async clearType(type: CacheType): Promise<number> {
    try {
      if (!this.client) await this.initialize();
      
      const pattern = `${CACHE_CONFIG[type].prefix}*`;
      const keys = await this.client!.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      const pipeline = this.client!.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      return keys.length;
    } catch (error) {
      console.error('[Cache] Clear type error:', error);
      return 0;
    }
  }
  
  /**
   * Invalidate multiple cache entries
   */
  async invalidateMany(type: CacheType, keys: string[]): Promise<number> {
    try {
      if (!this.client) await this.initialize();
      
      const pipeline = this.client!.pipeline();
      keys.forEach(key => {
        const cacheKey = generateCacheKey(type, key);
        pipeline.del(cacheKey);
      });
      
      const results = await pipeline.exec();
      return results?.filter(([err, result]) => !err && result === 1).length || 0;
    } catch (error) {
      console.error('[Cache] Invalidate many error:', error);
      return 0;
    }
  }
  
  /**
   * Get or set cache value with callback
   */
  async getOrSet<T>(
    type: CacheType,
    key: string,
    callback: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(type, key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const freshData = await callback();
    
    // Store in cache
    await this.set(type, key, freshData, customTtl);
    
    return freshData;
  }
  
  /**
   * Batch get multiple cache entries
   */
  async batchGet<T>(type: CacheType, keys: string[]): Promise<Map<string, T | null>> {
    try {
      if (!this.client) await this.initialize();
      
      const pipeline = this.client!.pipeline();
      const cacheKeys = keys.map(key => generateCacheKey(type, key));
      
      cacheKeys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();
      
      const resultMap = new Map<string, T | null>();
      keys.forEach((key, index) => {
        const [err, value] = results![index];
        if (!err && value) {
          resultMap.set(key, JSON.parse(value as string) as T);
        } else {
          resultMap.set(key, null);
        }
      });
      
      return resultMap;
    } catch (error) {
      console.error('[Cache] Batch get error:', error);
      return new Map();
    }
  }
  
  /**
   * Batch set multiple cache entries
   */
  async batchSet<T>(type: CacheType, entries: Map<string, T>, customTtl?: number): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      
      const pipeline = this.client!.pipeline();
      const ttl = customTtl || CACHE_CONFIG[type].ttl;
      
      entries.forEach((value, key) => {
        const cacheKey = generateCacheKey(type, key);
        const serialized = JSON.stringify(value);
        pipeline.setex(cacheKey, ttl, serialized);
      });
      
      const results = await pipeline.exec();
      return results?.every(([err, result]) => !err && result === 'OK') || false;
    } catch (error) {
      console.error('[Cache] Batch set error:', error);
      return false;
    }
  }
  
  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<Record<string, number>> {
    try {
      if (!this.client) await this.initialize();
      
      const metrics = await this.client!.hgetall('cache:metrics');
      const result: Record<string, number> = {};
      
      Object.entries(metrics).forEach(([key, value]) => {
        result[key] = parseInt(value) || 0;
      });
      
      return result;
    } catch (error) {
      console.error('[Cache] Get metrics error:', error);
      return {};
    }
  }
  
  /**
   * Warm cache with critical data
   */
  async warmCache(type: CacheType, dataFetcher: () => Promise<Map<string, any>>): Promise<boolean> {
    try {
      const data = await dataFetcher();
      return await this.batchSet(type, data);
    } catch (error) {
      console.error('[Cache] Warm cache error:', error);
      return false;
    }
  }
  
  /**
   * Check cache health
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      
      const pong = await this.client!.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('[Cache] Health check error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache invalidation strategies
 */
export class CacheInvalidator {
  private cache: CacheManager;
  
  constructor(cache: CacheManager) {
    this.cache = cache;
  }
  
  /**
   * Invalidate user-related caches
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.cache.delete('SESSION', userId),
      this.cache.delete('USER_PROFILE', userId),
      this.cache.delete('MOOD_ENTRIES', userId),
      this.cache.delete('NOTIFICATIONS', userId),
    ]);
  }
  
  /**
   * Invalidate dashboard caches
   */
  async invalidateDashboard(userId: string): Promise<void> {
    await this.cache.delete('DASHBOARD_METRICS', userId);
  }
  
  /**
   * Invalidate community caches
   */
  async invalidateCommunity(): Promise<void> {
    await this.cache.clearType('COMMUNITY_POSTS');
    await this.cache.clearType('SUPPORT_GROUPS');
  }
  
  /**
   * Invalidate helper-related caches
   */
  async invalidateHelper(helperId: string): Promise<void> {
    await this.cache.delete('HELPER_PROFILES', helperId);
  }
  
  /**
   * Invalidate all caches (use sparingly)
   */
  async invalidateAll(): Promise<void> {
    const types: CacheType[] = Object.keys(CACHE_CONFIG) as CacheType[];
    await Promise.all(types.map(type => this.cache.clearType(type)));
  }
}

export const cacheInvalidator = new CacheInvalidator(cacheManager);

/**
 * Session Store using Redis
 * For NextAuth session persistence
 */
export class RedisSessionStore {
  private cache: CacheManager;
  
  constructor(cache: CacheManager) {
    this.cache = cache;
  }
  
  async get(sessionToken: string): Promise<any> {
    return await this.cache.get('SESSION', sessionToken);
  }
  
  async set(sessionToken: string, session: any, maxAge: number): Promise<void> {
    await this.cache.set('SESSION', sessionToken, session, maxAge);
  }
  
  async delete(sessionToken: string): Promise<void> {
    await this.cache.delete('SESSION', sessionToken);
  }
  
  async touch(sessionToken: string, maxAge: number): Promise<void> {
    const session = await this.get(sessionToken);
    if (session) {
      await this.set(sessionToken, session, maxAge);
    }
  }
}

export const sessionStore = new RedisSessionStore(cacheManager);

/**
 * Rate limiter using Redis
 */
export class RedisRateLimiter {
  private client: Redis | null = null;
  
  async initialize(): Promise<void> {
    this.client = await getRedisClient();
  }
  
  async checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (!this.client) await this.initialize();
    
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    // Remove old entries
    await this.client!.zremrangebyscore(key, '-inf', windowStart);
    
    // Count requests in window
    const count = await this.client!.zcard(key);
    
    if (count < limit) {
      // Add current request
      await this.client!.zadd(key, now, `${now}-${Math.random()}`);
      await this.client!.expire(key, window);
      
      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: new Date(now + window * 1000),
      };
    }
    
    // Get oldest entry to determine reset time
    const oldest = await this.client!.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldest.length > 1 
      ? new Date(parseInt(oldest[1]) + window * 1000)
      : new Date(now + window * 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
}

export const rateLimiter = new RedisRateLimiter();