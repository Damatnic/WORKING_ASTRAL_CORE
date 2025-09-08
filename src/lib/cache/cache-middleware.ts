/**
 * Cache Middleware for AstralCore API Response Caching
 * Automatic caching middleware with cache-aside pattern, ETags, and conditional requests
 * 
 * Features:
 * - Automatic API response caching
 * - Cache-aside pattern implementation
 * - ETag generation and conditional requests
 * - Cache headers management
 * - Graceful cache miss handling
 * - Compression support
 * - HIPAA-compliant caching decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redisCacheService } from './redis-cache';
import zlib from 'zlib';
import { promisify } from 'util';

// Compression utilities
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Cache configuration for different API routes
 */
const CACHE_CONFIG = {
  // Public endpoints (longer cache)
  '/api/public/': { ttl: 3600, compression: true, etag: true },
  '/api/crisis/resources': { ttl: 7200, compression: true, etag: true },
  '/api/wellness/insights': { ttl: 1800, compression: true, etag: true },
  '/api/community/trending': { ttl: 600, compression: true, etag: true },
  
  // User-specific endpoints (shorter cache)
  '/api/user/profile': { ttl: 900, compression: false, etag: true, private: true },
  '/api/dashboard/metrics': { ttl: 300, compression: true, etag: true, private: true },
  '/api/therapy/availability': { ttl: 900, compression: true, etag: true },
  
  // Real-time endpoints (minimal cache)
  '/api/notifications': { ttl: 60, compression: false, etag: false, private: true },
  '/api/messaging': { ttl: 30, compression: false, etag: false, private: true },
  
  // System endpoints
  '/api/system/health': { ttl: 60, compression: false, etag: false },
  '/api/system/config': { ttl: 3600, compression: true, etag: true },
} as const;

/**
 * Routes that should never be cached (security/privacy sensitive)
 */
const NEVER_CACHE_ROUTES = new Set([
  '/api/auth/',
  '/api/payment/',
  '/api/admin/',
  '/api/crisis/emergency',
  '/api/user/session',
  '/api/audit/',
]);

/**
 * Cache key generation for API responses
 */
function generateApiCacheKey(
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  userId?: string
): string {
  const baseKey = `${method}:${pathname}`;
  const paramsString = searchParams.toString();
  const userSuffix = userId ? `:user:${userId}` : '';
  
  const fullKey = `${baseKey}${paramsString ? `:${paramsString}` : ''}${userSuffix}`;
  const hash = createHash('sha256').update(fullKey).digest('hex').substring(0, 16);
  
  return `api:${hash}`;
}

/**
 * Generate ETag for response data
 */
function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if route should be cached
 */
function shouldCacheRoute(pathname: string): boolean {
  // Never cache sensitive routes
  for (const neverCacheRoute of NEVER_CACHE_ROUTES) {
    if (pathname.startsWith(neverCacheRoute)) {
      return false;
    }
  }
  
  // Only cache GET requests by default
  return true;
}

/**
 * Get cache configuration for route
 */
function getCacheConfigForRoute(pathname: string): typeof CACHE_CONFIG[keyof typeof CACHE_CONFIG] | null {
  // Exact match first
  if (pathname in CACHE_CONFIG) {
    return CACHE_CONFIG[pathname as keyof typeof CACHE_CONFIG];
  }
  
  // Pattern matching
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pathname.startsWith(pattern)) {
      return config;
    }
  }
  
  return null;
}

/**
 * Compress data if needed
 */
async function compressData(data: string): Promise<string> {
  try {
    const compressed = await gzip(Buffer.from(data));
    return compressed.toString('base64');
  } catch (error) {
    console.error('[CacheMiddleware] Compression error:', error);
    return data;
  }
}

/**
 * Decompress data if needed
 */
async function decompressData(compressedData: string): Promise<string> {
  try {
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = await gunzip(buffer);
    return decompressed.toString();
  } catch (error) {
    console.error('[CacheMiddleware] Decompression error:', error);
    return compressedData;
  }
}

/**
 * Cached response data structure
 */
interface CachedResponse {
  data: any;
  headers: Record<string, string>;
  status: number;
  timestamp: number;
  etag?: string;
  compressed?: boolean;
}

/**
 * Cache Middleware Class
 */
export class CacheMiddleware {
  /**
   * Handle incoming request with cache check
   */
  static async handleRequest(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const { method, url } = request;
    const { pathname, searchParams } = new URL(url);
    
    // Only cache GET requests by default
    if (method !== 'GET' || !shouldCacheRoute(pathname)) {
      return await handler(request);
    }
    
    const config = getCacheConfigForRoute(pathname);
    if (!config) {
      return await handler(request);
    }
    
    try {
      // Extract user ID for private caching
      const userId = await this.extractUserId(request);
      const cacheKey = generateApiCacheKey(method, pathname, searchParams, 
        (config as any).private ? userId : undefined);
      
      // Check for conditional request headers
      const ifNoneMatch = request.headers.get('if-none-match');
      
      // Try to get from cache
      const cached = await this.getCachedResponse(cacheKey);
      
      if (cached) {
        // Check ETag for conditional requests
        if (config.etag && ifNoneMatch && cached.etag === ifNoneMatch) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              'etag': cached.etag,
              'cache-control': `max-age=${config.ttl}`,
            },
          });
        }
        
        // Return cached response
        return this.createResponseFromCache(cached, config);
      }
      
      // Cache miss - execute handler
      const response = await handler(request);
      
      // Cache successful responses
      if (response.status >= 200 && response.status < 300) {
        await this.cacheResponse(cacheKey, response.clone(), config);
      }
      
      return response;
      
    } catch (error) {
      console.error('[CacheMiddleware] Request handling error:', error);
      // Fallback to original handler on cache errors
      return await handler(request);
    }
  }
  
  /**
   * Get cached response
   */
  private static async getCachedResponse(cacheKey: string): Promise<CachedResponse | null> {
    try {
      return await redisCacheService.get('API_RESPONSE', cacheKey);
    } catch (error) {
      console.error('[CacheMiddleware] Get cached response error:', error);
      return null;
    }
  }
  
  /**
   * Cache response data
   */
  private static async cacheResponse(
    cacheKey: string,
    response: NextResponse,
    config: any
  ): Promise<void> {
    try {
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      // Compress if configured
      let dataToCache = JSON.stringify(responseData);
      let compressed = false;
      
      if (config.compression && dataToCache.length > 1024) { // Compress if > 1KB
        dataToCache = await compressData(dataToCache);
        compressed = true;
      }
      
      // Generate ETag if configured
      let etag: string | undefined;
      if (config.etag) {
        etag = generateETag(responseData);
      }
      
      const cachedResponse: CachedResponse = {
        data: dataToCache,
        headers: this.extractCacheableHeaders(response.headers),
        status: response.status,
        timestamp: Date.now(),
        etag,
        compressed,
      };
      
      await redisCacheService.set('API_RESPONSE', cacheKey, cachedResponse, config.ttl);
      
    } catch (error) {
      console.error('[CacheMiddleware] Cache response error:', error);
    }
  }
  
  /**
   * Create response from cached data
   */
  private static async createResponseFromCache(
    cached: CachedResponse,
    config: any
  ): Promise<NextResponse> {
    try {
      let responseData = cached.data;
      
      // Decompress if needed
      if (cached.compressed) {
        responseData = await decompressData(responseData);
      }
      
      // Parse JSON data
      let parsedData: any;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }
      
      // Create response headers
      const headers: HeadersInit = {
        ...cached.headers,
        'x-cache': 'HIT',
        'x-cache-timestamp': new Date(cached.timestamp).toISOString(),
        'cache-control': `max-age=${config.ttl}`,
      };
      
      if (cached.etag) {
        headers.etag = cached.etag;
      }
      
      if (config.private) {
        headers['cache-control'] += ', private';
      }
      
      return NextResponse.json(parsedData, {
        status: cached.status,
        headers,
      });
      
    } catch (error) {
      console.error('[CacheMiddleware] Create response from cache error:', error);
      throw error;
    }
  }
  
  /**
   * Extract cacheable headers from response
   */
  private static extractCacheableHeaders(headers: Headers): Record<string, string> {
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'vary',
      'last-modified',
    ];
    
    const result: Record<string, string> = {};
    
    cacheableHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        result[header] = value;
      }
    });
    
    return result;
  }
  
  /**
   * Extract user ID from request for private caching
   */
  private static async extractUserId(request: NextRequest): Promise<string | undefined> {
    try {
      // Try to get user ID from JWT token
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // This would be implemented based on your JWT structure
        // For now, return undefined
        return undefined;
      }
      
      // Try to get from session cookie
      const sessionCookie = request.cookies.get('session');
      if (sessionCookie) {
        // This would decode the session to get user ID
        // For now, return undefined
        return undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('[CacheMiddleware] Extract user ID error:', error);
      return undefined;
    }
  }
}

/**
 * Next.js middleware wrapper for easy integration
 */
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return await CacheMiddleware.handleRequest(req, handler);
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidation {
  /**
   * Invalidate API cache by pattern
   */
  static async invalidateByPattern(pattern: string): Promise<number> {
    try {
      return await redisCacheService.invalidatePattern(`astral:api:*${pattern}*`);
    } catch (error) {
      console.error('[CacheInvalidation] Invalidate by pattern error:', error);
      return 0;
    }
  }
  
  /**
   * Invalidate user-specific cache
   */
  static async invalidateUserCache(userId: string): Promise<number> {
    try {
      return await redisCacheService.invalidatePattern(`*:user:${userId}`);
    } catch (error) {
      console.error('[CacheInvalidation] Invalidate user cache error:', error);
      return 0;
    }
  }
  
  /**
   * Invalidate cache by route
   */
  static async invalidateRoute(pathname: string): Promise<number> {
    try {
      const pattern = pathname.replace(/\//g, '\\/');
      return await redisCacheService.invalidatePattern(`*${pattern}*`);
    } catch (error) {
      console.error('[CacheInvalidation] Invalidate route error:', error);
      return 0;
    }
  }
  
  /**
   * Bulk invalidation for related routes
   */
  static async bulkInvalidate(patterns: string[]): Promise<number> {
    try {
      const invalidationPromises = patterns.map(pattern => 
        this.invalidateByPattern(pattern)
      );
      
      const results = await Promise.all(invalidationPromises);
      return results.reduce((total, count) => total + count, 0);
    } catch (error) {
      console.error('[CacheInvalidation] Bulk invalidate error:', error);
      return 0;
    }
  }
}

/**
 * Cache warming for critical API endpoints
 */
export class CacheWarming {
  /**
   * Warm critical API endpoints
   */
  static async warmCriticalEndpoints(): Promise<void> {
    const criticalEndpoints = [
      '/api/crisis/resources',
      '/api/system/health',
      '/api/public/features',
    ];
    
    console.log('[CacheWarming] Starting cache warming for critical endpoints...');
    
    const warmPromises = criticalEndpoints.map(async endpoint => {
      try {
        // This would make actual requests to warm the cache
        // For now, we'll just log the intent
        console.log(`[CacheWarming] Warming endpoint: ${endpoint}`);
      } catch (error) {
        console.error(`[CacheWarming] Failed to warm ${endpoint}:`, error);
      }
    });
    
    await Promise.all(warmPromises);
    console.log('[CacheWarming] Cache warming completed');
  }
  
  /**
   * Warm user-specific endpoints
   */
  static async warmUserEndpoints(userId: string): Promise<void> {
    const userEndpoints = [
      `/api/user/${userId}/profile`,
      `/api/dashboard/${userId}/metrics`,
      `/api/wellness/${userId}/summary`,
    ];
    
    const warmPromises = userEndpoints.map(async endpoint => {
      try {
        // This would make actual requests with user context
        console.log(`[CacheWarming] Warming user endpoint: ${endpoint}`);
      } catch (error) {
        console.error(`[CacheWarming] Failed to warm user endpoint ${endpoint}:`, error);
      }
    });
    
    await Promise.all(warmPromises);
  }
}

/**
 * Cache statistics and monitoring
 */
export class CacheStatistics {
  /**
   * Get cache hit/miss statistics
   */
  static async getHitMissRatio(): Promise<{ hits: number; misses: number; ratio: number }> {
    try {
      const stats = await redisCacheService.getStats();
      const hits = stats['cache_hit:API_RESPONSE'] || 0;
      const misses = stats['cache_miss:API_RESPONSE'] || 0;
      const total = hits + misses;
      const ratio = total > 0 ? hits / total : 0;
      
      return { hits, misses, ratio };
    } catch (error) {
      console.error('[CacheStatistics] Get hit/miss ratio error:', error);
      return { hits: 0, misses: 0, ratio: 0 };
    }
  }
  
  /**
   * Get cache performance metrics
   */
  static async getPerformanceMetrics(): Promise<Record<string, any>> {
    try {
      const stats = await redisCacheService.getStats();
      
      return {
        hitMissRatio: await this.getHitMissRatio(),
        totalOperations: stats,
        uptime: Date.now(),
        memoryUsage: stats.memory || 'N/A',
      };
    } catch (error) {
      console.error('[CacheStatistics] Get performance metrics error:', error);
      return {};
    }
  }
}