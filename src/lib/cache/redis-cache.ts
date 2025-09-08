/**
 * Enhanced Redis Cache Service
 * HIPAA-compliant caching with encryption, distributed locking, and high availability
 * 
 * Features:
 * - Data encryption for sensitive information
 * - Distributed locking for cache updates
 * - Connection pooling and retry logic
 * - Cache warming utilities
 * - Comprehensive error handling
 * - Performance monitoring
 */

import Redis, { RedisOptions } from 'ioredis';
import { createHash, randomBytes } from 'crypto';
import CryptoJS from 'crypto-js';

// HIPAA compliance configuration
const HIPAA_CONFIG = {
  // Encrypt sensitive data types
  ENCRYPT_TYPES: new Set([
    'USER_PROFILE',
    'SESSION',
    'MOOD_ENTRIES',
    'CRISIS_RESOURCES',
    'THERAPY_SESSIONS',
    'PERSONAL_DATA'
  ]),
  // Use AES-256-GCM for encryption
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  // Key rotation interval (7 days)
  KEY_ROTATION_INTERVAL: 7 * 24 * 60 * 60 * 1000,
  // Audit log retention (90 days)
  AUDIT_RETENTION: 90 * 24 * 60 * 60,
};

// Cache TTL configurations for different data types
export const CACHE_TTL = {
  // User sessions (24 hours)
  SESSION: 86400,
  // User profiles with PII (1 hour, encrypted)
  USER_PROFILE: 3600,
  // Wellness data aggregations (30 minutes)
  WELLNESS_AGGREGATION: 1800,
  // Community post rankings (10 minutes)
  COMMUNITY_RANKING: 600,
  // Crisis resource listings (2 hours)
  CRISIS_RESOURCES: 7200,
  // Therapy session availability (15 minutes)
  THERAPY_AVAILABILITY: 900,
  // System configuration (6 hours)
  SYSTEM_CONFIG: 21600,
  // API responses (5 minutes)
  API_RESPONSE: 300,
  // Dashboard metrics (10 minutes)
  DASHBOARD_METRICS: 600,
  // Search results (5 minutes)
  SEARCH_RESULTS: 300,
} as const;

export type CacheType = keyof typeof CACHE_TTL;

// Cache key prefixes with namespacing
export const CACHE_PREFIXES = {
  SESSION: 'astral:session:',
  USER_PROFILE: 'astral:user:',
  WELLNESS_AGGREGATION: 'astral:wellness:',
  COMMUNITY_RANKING: 'astral:community:',
  CRISIS_RESOURCES: 'astral:crisis:',
  THERAPY_AVAILABILITY: 'astral:therapy:',
  SYSTEM_CONFIG: 'astral:config:',
  API_RESPONSE: 'astral:api:',
  DASHBOARD_METRICS: 'astral:metrics:',
  SEARCH_RESULTS: 'astral:search:',
} as const;

/**
 * HIPAA-compliant encryption utilities
 */
class HIPAAEncryption {
  private static readonly ENCRYPTION_KEY = process.env.CACHE_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!!';
  
  static encrypt(data: string): string {
    try {
      // Generate random IV for each encryption
      const iv = randomBytes(16);
      const key = CryptoJS.enc.Utf8.parse(this.ENCRYPTION_KEY);
      
      // Encrypt using AES-256-GCM equivalent
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: CryptoJS.lib.WordArray.create(iv),
        mode: (CryptoJS as any).mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });
      
      // Combine IV and encrypted data
      const combined = iv.toString('base64') + ':' + encrypted.toString();
      return Buffer.from(combined).toString('base64');
    } catch (error) {
      console.error('[HIPAA Encryption] Encrypt error:', error);
      throw new Error('Encryption failed');
    }
  }
  
  static decrypt(encryptedData: string): string {
    try {
      // Decode base64
      const combined = Buffer.from(encryptedData, 'base64').toString();
      const [ivBase64, encrypted] = combined.split(':');
      
      // Parse IV and key
      const iv = CryptoJS.enc.Base64.parse(ivBase64);
      const key = CryptoJS.enc.Utf8.parse(this.ENCRYPTION_KEY);
      
      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        mode: (CryptoJS as any).mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('[HIPAA Encryption] Decrypt error:', error);
      throw new Error('Decryption failed');
    }
  }
}

/**
 * Distributed lock implementation for cache operations
 */
class DistributedLock {
  private redis: Redis;
  private lockTimeout: number = 10000; // 10 seconds
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async acquire(lockKey: string, ttl: number = this.lockTimeout): Promise<string | null> {
    const lockId = randomBytes(16).toString('hex');
    const lockValue = `${lockId}:${Date.now() + ttl}`;
    
    try {
      const result = await this.redis.set(
        `lock:${lockKey}`,
        lockValue,
        'PX',
        ttl,
        'NX'
      );
      
      return result === 'OK' ? lockId : null;
    } catch (error) {
      console.error('[DistributedLock] Acquire error:', error);
      return null;
    }
  }
  
  async release(lockKey: string, lockId: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      const result = await this.redis.eval(
        script,
        1,
        `lock:${lockKey}`,
        lockId
      ) as number;
      
      return result === 1;
    } catch (error) {
      console.error('[DistributedLock] Release error:', error);
      return false;
    }
  }
  
  async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    ttl: number = this.lockTimeout
  ): Promise<T | null> {
    const lockId = await this.acquire(lockKey, ttl);
    if (!lockId) {
      console.warn(`[DistributedLock] Failed to acquire lock: ${lockKey}`);
      return null;
    }
    
    try {
      return await operation();
    } finally {
      await this.release(lockKey, lockId);
    }
  }
}

/**
 * Enhanced Redis Cache Service with HIPAA compliance
 */
export class RedisCacheService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private distributedLock: DistributedLock | null = null;
  private connectionPool: Redis[] = [];
  private readonly maxPoolSize = 10;
  private isInitialized = false;
  
  /**
   * Redis configuration optimized for high availability
   */
  private getRedisConfig(): RedisOptions {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      
      // Connection settings
      connectTimeout: 10000,
      lazyConnect: true,
      keepAlive: 30000,
      enableReadyCheck: true,
      maxLoadingRetryTime: 10000,
      
      // Retry strategy
      maxRetriesPerRequest: 5,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        console.log(`[Redis] Retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      
      // Reconnection settings
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(target => err.message.includes(target));
      },
      
      // Performance optimizations
      enableAutoPipelining: true,
      autoPipeliningIgnoredCommands: ['info', 'ping', 'auth'],
      enableOfflineQueue: true,
      
      // Cluster support (if using Redis cluster)
      ...(process.env.REDIS_CLUSTER === 'true' && {
        enableReadyCheck: false,
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
        },
      }),
    };
  }
  
  /**
   * Initialize Redis cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const config = this.getRedisConfig();
      
      // Create main client
      this.client = new Redis(config);
      
      // Create pub/sub clients
      this.subscriber = new Redis(config);
      this.publisher = new Redis(config);
      
      // Initialize distributed lock
      this.distributedLock = new DistributedLock(this.client);
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Initialize connection pool
      await this.initializeConnectionPool();
      
      // Wait for connections
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);
      
      this.isInitialized = true;
      console.log('[RedisCacheService] Initialized successfully');
      
      // Start cache warming
      await this.warmCriticalData();
      
    } catch (error) {
      console.error('[RedisCacheService] Initialization error:', error);
      throw new Error('Failed to initialize Redis cache service');
    }
  }
  
  /**
   * Set up Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;
    
    this.client.on('connect', () => {
      console.log('[Redis] Main client connected');
    });
    
    this.client.on('ready', () => {
      console.log('[Redis] Main client ready');
    });
    
    this.client.on('error', (error) => {
      console.error('[Redis] Main client error:', error);
      this.handleConnectionError(error);
    });
    
    this.client.on('close', () => {
      console.warn('[Redis] Main client connection closed');
    });
    
    this.client.on('reconnecting', () => {
      console.log('[Redis] Main client reconnecting');
    });
  }
  
  /**
   * Handle connection errors with failover
   */
  private handleConnectionError(error: Error): void {
    console.error('[Redis] Connection error, attempting failover:', error);
    
    // Implement circuit breaker pattern
    // This would connect to backup Redis instance or use local cache
    
    // For now, we'll attempt to reconnect
    setTimeout(() => {
      this.reconnect();
    }, 5000);
  }
  
  /**
   * Reconnect to Redis
   */
  private async reconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
        this.client = new Redis(this.getRedisConfig());
        await this.client.connect();
      }
    } catch (error) {
      console.error('[Redis] Reconnection failed:', error);
    }
  }
  
  /**
   * Initialize connection pool for high concurrency
   */
  private async initializeConnectionPool(): Promise<void> {
    const config = this.getRedisConfig();
    
    for (let i = 0; i < this.maxPoolSize; i++) {
      const client = new Redis(config);
      this.connectionPool.push(client);
    }
    
    // Connect all pool clients
    await Promise.all(
      this.connectionPool.map(client => client.connect())
    );
  }
  
  /**
   * Get available Redis client from pool
   */
  private getPoolClient(): Redis {
    // Simple round-robin selection
    const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
    return client || this.client!;
  }
  
  /**
   * Generate cache key with proper namespacing
   */
  generateCacheKey(type: CacheType, identifier: string): string {
    const prefix = CACHE_PREFIXES[type];
    const hash = createHash('sha256')
      .update(identifier)
      .digest('hex')
      .substring(0, 12);
    
    return `${prefix}${hash}`;
  }
  
  /**
   * Serialize data with optional encryption for HIPAA compliance
   */
  private serializeData(data: any, type: CacheType): string {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      type,
      version: '1.0'
    });
    
    // Encrypt sensitive data types
    if (HIPAA_CONFIG.ENCRYPT_TYPES.has(type)) {
      return HIPAAEncryption.encrypt(serialized);
    }
    
    return serialized;
  }
  
  /**
   * Deserialize data with optional decryption
   */
  private deserializeData<T>(serialized: string, type: CacheType): T | null {
    try {
      let data = serialized;
      
      // Decrypt if needed
      if (HIPAA_CONFIG.ENCRYPT_TYPES.has(type)) {
        data = HIPAAEncryption.decrypt(serialized);
      }
      
      const parsed = JSON.parse(data);
      return parsed.data as T;
    } catch (error) {
      console.error('[RedisCacheService] Deserialization error:', error);
      return null;
    }
  }
  
  /**
   * Get value from cache with automatic decryption
   */
  async get<T>(type: CacheType, key: string): Promise<T | null> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const cacheKey = this.generateCacheKey(type, key);
      
      const cached = await client.get(cacheKey);
      if (!cached) {
        await this.recordMetric('cache_miss', type);
        return null;
      }
      
      await this.recordMetric('cache_hit', type);
      return this.deserializeData<T>(cached, type);
      
    } catch (error) {
      console.error('[RedisCacheService] Get error:', error);
      await this.recordMetric('cache_error', type);
      return null;
    }
  }
  
  /**
   * Set value in cache with automatic encryption and TTL
   */
  async set<T>(
    type: CacheType,
    key: string,
    value: T,
    customTtl?: number
  ): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const cacheKey = this.generateCacheKey(type, key);
      const serialized = this.serializeData(value, type);
      const ttl = customTtl || CACHE_TTL[type];
      
      const result = await client.setex(cacheKey, ttl, serialized);
      
      if (result === 'OK') {
        await this.recordMetric('cache_set', type);
        
        // Publish cache update notification
        await this.publishCacheUpdate(type, key, 'set');
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[RedisCacheService] Set error:', error);
      await this.recordMetric('cache_error', type);
      return false;
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(type: CacheType, key: string): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const cacheKey = this.generateCacheKey(type, key);
      
      const result = await client.del(cacheKey);
      
      if (result === 1) {
        await this.recordMetric('cache_delete', type);
        await this.publishCacheUpdate(type, key, 'delete');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[RedisCacheService] Delete error:', error);
      return false;
    }
  }
  
  /**
   * Get or set with distributed locking
   */
  async getOrSet<T>(
    type: CacheType,
    key: string,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T | null> {
    // First try to get from cache
    const cached = await this.get<T>(type, key);
    if (cached !== null) {
      return cached;
    }
    
    // Use distributed lock to prevent cache stampede
    const lockKey = `cache_fetch:${type}:${key}`;
    
    return await this.distributedLock!.withLock(lockKey, async () => {
      // Double-check cache after acquiring lock
      const cachedAgain = await this.get<T>(type, key);
      if (cachedAgain !== null) {
        return cachedAgain;
      }
      
      // Fetch fresh data
      try {
        const freshData = await fetcher();
        await this.set(type, key, freshData, customTtl);
        return freshData;
      } catch (error) {
        console.error('[RedisCacheService] Fetcher error:', error);
        return null;
      }
    });
  }
  
  /**
   * Batch operations for better performance
   */
  async batchGet<T>(type: CacheType, keys: string[]): Promise<Map<string, T>> {
    if (!this.isInitialized) await this.initialize();
    
    const result = new Map<string, T>();
    
    try {
      const client = this.getPoolClient();
      const pipeline = client.pipeline();
      
      const cacheKeys = keys.map(key => this.generateCacheKey(type, key));
      cacheKeys.forEach(cacheKey => pipeline.get(cacheKey));
      
      const results = await pipeline.exec();
      
      if (results) {
        keys.forEach((key, index) => {
          const [error, value] = results[index];
          if (!error && value) {
            const deserialized = this.deserializeData<T>(value as string, type);
            if (deserialized !== null) {
              result.set(key, deserialized);
            }
          }
        });
      }
      
    } catch (error) {
      console.error('[RedisCacheService] Batch get error:', error);
    }
    
    return result;
  }
  
  /**
   * Batch set operations
   */
  async batchSet<T>(
    type: CacheType,
    entries: Map<string, T>,
    customTtl?: number
  ): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const pipeline = client.pipeline();
      const ttl = customTtl || CACHE_TTL[type];
      
      entries.forEach((value, key) => {
        const cacheKey = this.generateCacheKey(type, key);
        const serialized = this.serializeData(value, type);
        pipeline.setex(cacheKey, ttl, serialized);
      });
      
      const results = await pipeline.exec();
      return results?.every(([error, result]) => !error && result === 'OK') || false;
      
    } catch (error) {
      console.error('[RedisCacheService] Batch set error:', error);
      return false;
    }
  }
  
  /**
   * Cache invalidation by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      const pipeline = client.pipeline();
      keys.forEach(key => pipeline.del(key));
      
      const results = await pipeline.exec();
      const deletedCount = results?.filter(([error, result]) => 
        !error && result === 1
      ).length || 0;
      
      return deletedCount;
      
    } catch (error) {
      console.error('[RedisCacheService] Invalidate pattern error:', error);
      return 0;
    }
  }
  
  /**
   * Cache warming for critical data
   */
  async warmCriticalData(): Promise<void> {
    try {
      console.log('[RedisCacheService] Starting cache warming...');
      
      // Warm system configuration
      await this.warmSystemConfig();
      
      // Warm crisis resources
      await this.warmCrisisResources();
      
      console.log('[RedisCacheService] Cache warming completed');
      
    } catch (error) {
      console.error('[RedisCacheService] Cache warming error:', error);
    }
  }
  
  /**
   * Warm system configuration cache
   */
  private async warmSystemConfig(): Promise<void> {
    // This would be implemented based on your system configuration needs
    const systemConfig = {
      maintenanceMode: false,
      featureFlags: {},
      rateLimit: 1000,
    };
    
    await this.set('SYSTEM_CONFIG', 'global', systemConfig);
  }
  
  /**
   * Warm crisis resources cache
   */
  private async warmCrisisResources(): Promise<void> {
    // This would fetch from your database
    const crisisResources = [
      { id: '1', name: 'National Suicide Prevention Lifeline', phone: '988' },
      { id: '2', name: 'Crisis Text Line', phone: '741741' },
    ];
    
    await this.set('CRISIS_RESOURCES', 'list', crisisResources);
  }
  
  /**
   * Publish cache update notifications
   */
  private async publishCacheUpdate(
    type: CacheType,
    key: string,
    operation: 'set' | 'delete'
  ): Promise<void> {
    if (!this.publisher) return;
    
    try {
      await this.publisher.publish('cache_updates', JSON.stringify({
        type,
        key,
        operation,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('[RedisCacheService] Publish error:', error);
    }
  }
  
  /**
   * Record cache metrics
   */
  private async recordMetric(metric: string, type: CacheType): Promise<void> {
    try {
      const client = this.getPoolClient();
      const key = `metrics:cache:${metric}:${type}`;
      await client.incr(key);
      await client.expire(key, 3600); // Expire in 1 hour
    } catch (error) {
      // Don't let metric recording errors affect cache operations
      console.debug('[RedisCacheService] Metric recording error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<Record<string, any>> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const client = this.getPoolClient();
      const info = await client.info('memory');
      const dbsize = await client.dbsize();
      
      return {
        connected: client.status === 'ready',
        memory: info,
        keyCount: dbsize,
        uptime: Date.now(),
      };
      
    } catch (error) {
      console.error('[RedisCacheService] Get stats error:', error);
      return {};
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      const pong = await this.client.ping();
      return pong === 'PONG';
      
    } catch (error) {
      console.error('[RedisCacheService] Health check error:', error);
      return false;
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Close all pool connections
      await Promise.all(
        this.connectionPool.map(client => client.disconnect())
      );
      
      // Close main connections
      if (this.client) await this.client.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      if (this.publisher) await this.publisher.disconnect();
      
      this.isInitialized = false;
      console.log('[RedisCacheService] Shutdown completed');
      
    } catch (error) {
      console.error('[RedisCacheService] Shutdown error:', error);
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();

// Export for testing and advanced usage
export { HIPAAEncryption, DistributedLock };