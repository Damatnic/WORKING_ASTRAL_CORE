/**
 * Client-side stub for Redis cache
 * Returns no-op implementations for browser environment
 */

export class CacheManager {
  async initialize(): Promise<void> {}
  async get<T>(): Promise<T | null> { return null; }
  async set(): Promise<boolean> { return false; }
  async delete(): Promise<boolean> { return false; }
  async clear(): Promise<number> { return 0; }
  async invalidatePattern(): Promise<number> { return 0; }
  async getMultiple<T>(): Promise<(T | null)[]> { return []; }
  async setMultiple(): Promise<boolean> { return false; }
  async exists(): Promise<boolean> { return false; }
  async getTTL(): Promise<number> { return -1; }
  async warmCache(): Promise<void> {}
  async getMetrics(): Promise<any> { return {}; }
}

export class CacheInvalidator {
  constructor(cacheManager: any) {}
  async invalidateUser(): Promise<void> {}
  async invalidatePost(): Promise<void> {}
  async invalidateGroup(): Promise<void> {}
  async invalidateHelper(): Promise<void> {}
  async invalidateSession(): Promise<void> {}
  async invalidateAll(): Promise<void> {}
}

export class RedisSessionStore {
  constructor(cacheManager: any) {}
  async get(): Promise<any> { return null; }
  async set(): Promise<void> {}
  async destroy(): Promise<void> {}
  async touch(): Promise<void> {}
}

export class RateLimiter {
  constructor() {}
  async checkLimit(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    return { allowed: true, remaining: 100, resetAt: Date.now() + 60000 };
  }
  async reset(): Promise<void> {}
}

// Export stub instances
export const cacheManager = new CacheManager();
export const cacheInvalidator = new CacheInvalidator(cacheManager);
export const sessionStore = new RedisSessionStore(cacheManager);
export const rateLimiter = new RateLimiter();

// Stub functions
export async function getRedisClient(): Promise<null> { return null; }
export async function getRedisSubscriber(): Promise<null> { return null; }
export async function shutdownRedis(): Promise<void> {}