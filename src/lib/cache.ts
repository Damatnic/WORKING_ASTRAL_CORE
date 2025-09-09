// Advanced Caching System
// Provides server-side and client-side caching with TTL support

import { NextResponse } from 'next/server';

// Server-side memory cache
const serverCache = new Map<string, { data: any; expiry: number; tags: string[] }>();

// Cache duration constants (in seconds)
export const CacheDurations = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 1800,          // 30 minutes
  HOUR: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800,        // 7 days
} as const;

// Cache tags for invalidation
export const CacheTags = {
  USER: 'user',
  CONTENT: 'content',
  CRISIS: 'crisis',
  WELLNESS: 'wellness',
  COMMUNITY: 'community',
  SYSTEM: 'system',
} as const;

/**
 * Memory Cache Class for Server-Side Caching
 */
export class MemoryCache {
  /**
   * Get cached data
   */
  static get<T>(key: string): T | null {
    const cached = serverCache.get(key);
    if (!cached || Date.now() > cached.expiry) {
      serverCache.delete(key);
      return null;
    }
    return cached.data;
  }

  /**
   * Set cached data with TTL
   */
  static set<T>(key: string, data: T, ttlSeconds: number, tags: string[] = []): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    serverCache.set(key, { data, expiry, tags });
  }

  /**
   * Delete cached data
   */
  static delete(key: string): boolean {
    return serverCache.delete(key);
  }

  /**
   * Clear cache by tags
   */
  static invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, cached] of serverCache.entries()) {
      if (cached.tags.includes(tag)) {
        serverCache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cached data
   */
  static clear(): void {
    serverCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    entries: Array<{
      key: string;
      expiry: Date;
      tags: string[];
      expired: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(serverCache.entries()).map(([key, cached]) => ({
      key,
      expiry: new Date(cached.expiry),
      tags: cached.tags,
      expired: now > cached.expiry,
    }));

    return {
      size: serverCache.size,
      entries,
    };
  }

  /**
   * Cache with function execution
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds, tags);
    return data;
  }
}

/**
 * Create cached HTTP response with proper headers
 */
export function createCachedResponse(
  data: any,
  ttlSeconds: number,
  options: {
    staleWhileRevalidate?: number;
    tags?: string[];
    vary?: string;
  } = {}
): NextResponse {
  const { staleWhileRevalidate = ttlSeconds * 2, tags = [], vary } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
    'CDN-Cache-Control': `public, s-maxage=${ttlSeconds}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${ttlSeconds}`,
  };

  // Add cache tags for Vercel
  if (tags.length > 0) {
    headers['Cache-Tag'] = tags.join(',');
  }

  // Add Vary header if specified
  if (vary) {
    headers['Vary'] = vary;
  }

  return NextResponse.json(data, { headers });
}

/**
 * Client-side cache key generator
 */
export function generateCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.filter(Boolean).join(':');
}

/**
 * Cache warmer for frequently accessed data
 */
export class CacheWarmer {
  private static warmupTasks: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl: number;
    tags: string[];
    interval: number;
  }> = [];

  /**
   * Add a cache warmup task
   */
  static addTask(
    key: string,
    fetcher: () => Promise<any>,
    ttl: number,
    tags: string[] = [],
    interval: number = ttl * 0.8 * 1000 // Warm up at 80% of TTL
  ): void {
    this.warmupTasks.push({ key, fetcher, ttl, tags, interval });
  }

  /**
   * Start cache warming
   */
  static start(): void {
    if (typeof window !== 'undefined') {
      console.warn('CacheWarmer should only run on the server');
      return;
    }

    this.warmupTasks.forEach(task => {
      // Initial warmup
      this.warmupCache(task);
      
      // Set up periodic warmup
      setInterval(() => {
        this.warmupCache(task);
      }, task.interval);
    });
  }

  /**
   * Warm up specific cache
   */
  private static async warmupCache(task: {
    key: string;
    fetcher: () => Promise<any>;
    ttl: number;
    tags: string[];
  }): Promise<void> {
    try {
      const data = await task.fetcher();
      MemoryCache.set(task.key, data, task.ttl, task.tags);
      console.log(`🔥 Cache warmed: ${task.key}`);
    } catch (error) {
      console.error(`❌ Cache warmup failed for ${task.key}:`, error);
    }
  }
}

/**
 * Cache middleware for API routes
 */
export function withCache<T>(
  handler: () => Promise<T>,
  options: {
    key: string;
    ttl: number;
    tags?: string[];
    revalidateOnError?: boolean;
  }
) {
  return async (): Promise<T> => {
    const { key, ttl, tags = [], revalidateOnError = true } = options;
    
    try {
      return await MemoryCache.getOrSet(key, handler, ttl, tags);
    } catch (error) {
      // If revalidate on error is enabled, try to serve stale data
      if (revalidateOnError) {
        const stale = MemoryCache.get<T>(key);
        if (stale !== null) {
          console.warn(`Serving stale data for ${key} due to error:`, error);
          
          // Async revalidation
          handler()
            .then(data => MemoryCache.set(key, data, ttl, tags))
            .catch(console.error);
          
          return stale;
        }
      }
      
      throw error;
    }
  };
}

/**
 * Cache configuration for different data types
 */
export const CacheConfigs = {
  // User data - medium cache with user tag
  user: (userId: string) => ({
    key: generateCacheKey(CacheTags.USER, userId),
    ttl: CacheDurations.MEDIUM,
    tags: [CacheTags.USER],
  }),

  // Content - long cache with content tag
  content: (contentId: string) => ({
    key: generateCacheKey(CacheTags.CONTENT, contentId),
    ttl: CacheDurations.LONG,
    tags: [CacheTags.CONTENT],
  }),

  // Crisis resources - day cache with crisis tag
  crisis: () => ({
    key: generateCacheKey(CacheTags.CRISIS, 'resources'),
    ttl: CacheDurations.DAY,
    tags: [CacheTags.CRISIS],
  }),

  // System health - short cache
  health: () => ({
    key: generateCacheKey(CacheTags.SYSTEM, 'health'),
    ttl: CacheDurations.SHORT,
    tags: [CacheTags.SYSTEM],
  }),

  // Community data - medium cache
  community: (type: string, id?: string) => ({
    key: generateCacheKey(CacheTags.COMMUNITY, type, id || ''),
    ttl: CacheDurations.MEDIUM,
    tags: [CacheTags.COMMUNITY],
  }),
} as const;

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memorySize: number;
  localStorageSize: number;
  entries: string[];
} {
  const memorySize = serverCache.size;
  const entries = Array.from(serverCache.keys());
  
  return {
    memorySize,
    localStorageSize: 0, // Server-side doesn't have localStorage
    entries,
  };
}

/**
 * Cleanup expired cache entries periodically
 */
export function startCacheCleanup(intervalMs: number = 300000): void {
  if (typeof window !== 'undefined') return;
  
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of serverCache.entries()) {
      if (now > cached.expiry) {
        serverCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }, intervalMs);
}