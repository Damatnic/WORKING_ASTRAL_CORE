/**
 * API Performance Optimization Utilities
 * Provides caching, compression, and response optimization for HIPAA-compliant APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from './performance/monitoring';
import crypto from 'crypto';
import zlib from 'zlib';

interface PerformanceOptions {
  enableCaching?: boolean;
  cacheMaxAge?: number;
  enableCompression?: boolean;
  enableMetrics?: boolean;
  enableBudgetEnforcement?: boolean;
  responseTimeBudget?: number;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  maxAge: number;
  etag: string;
}

/**
 * API Performance Manager
 */
export class ApiPerformanceManager {
  private static cache = new Map<string, CachedResponse>();
  private static responseTimeBudget = 500; // 500ms default budget
  
  /**
   * Wrap API handler with performance optimizations
   */
  static withPerformance(
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: PerformanceOptions = {}
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const startTime = performance.now();
      const url = req.nextUrl.pathname;
      
      try {
        // Check cache first (if enabled)
        if (options.enableCaching && req.method === 'GET') {
          const cachedResponse = this.getCachedResponse(req);
          if (cachedResponse) {
            return cachedResponse;
          }
        }

        // Execute handler
        const response = await handler(req);
        const duration = performance.now() - startTime;

        // Track performance metrics
        if (options.enableMetrics && performanceMonitor) {
          performanceMonitor.trackApiCall(url, duration);
        }

        // Check response time budget
        if (options.enableBudgetEnforcement) {
          const budget = options.responseTimeBudget || this.responseTimeBudget;
          if (duration > budget) {
            console.warn(`[API Performance] ${url} exceeded budget: ${duration.toFixed(2)}ms > ${budget}ms`);
          }
        }

        // Cache response (if enabled and successful)
        if (options.enableCaching && req.method === 'GET' && response.status === 200) {
          await this.cacheResponse(req, response, options.cacheMaxAge || 300);
        }

        // Add performance headers
        response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
        response.headers.set('X-Performance-Budget', `${options.responseTimeBudget || this.responseTimeBudget}ms`);

        return response;

      } catch (error) {
        const duration = performance.now() - startTime;
        
        // Track error metrics
        if (options.enableMetrics && performanceMonitor) {
          performanceMonitor.trackApiCall(`${url}:error`, duration);
        }

        throw error;
      }
    };
  }

  /**
   * Get cached response if valid
   */
  private static getCachedResponse(req: NextRequest): NextResponse | null {
    const cacheKey = this.getCacheKey(req);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.maxAge * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Check ETag
    const clientETag = req.headers.get('if-none-match');
    if (clientETag === cached.etag) {
      return NextResponse.json({}, { status: 304 });
    }

    const response = NextResponse.json(cached.data);
    response.headers.set('ETag', cached.etag);
    response.headers.set('Cache-Control', `public, max-age=${cached.maxAge}`);
    response.headers.set('X-Cache', 'HIT');
    
    return response;
  }

  /**
   * Cache API response
   */
  private static async cacheResponse(
    req: NextRequest, 
    response: NextResponse, 
    maxAge: number
  ): Promise<void> {
    try {
      const data = await response.clone().json();
      const etag = this.generateETag(data);
      const cacheKey = this.getCacheKey(req);
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        maxAge,
        etag
      });

      // Add cache headers to original response
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', `public, max-age=${maxAge}`);
      response.headers.set('X-Cache', 'MISS');
      
      // Cleanup old entries (keep cache size manageable)
      if (this.cache.size > 1000) {
        this.cleanupCache();
      }
    } catch (error) {
      // Silently fail caching
      console.warn('[API Performance] Failed to cache response:', error);
    }
  }

  /**
   * Generate cache key from request
   */
  private static getCacheKey(req: NextRequest): string {
    const url = req.nextUrl.pathname;
    const searchParams = req.nextUrl.searchParams.toString();
    return `${url}${searchParams ? `?${searchParams}` : ''}`;
  }

  /**
   * Generate ETag for data
   */
  private static generateETag(data: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    return `"${hash}"`;
  }

  /**
   * Cleanup old cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp and remove oldest entries
    entries
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, 100)
      .forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Clear cache (for development)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; maxAge: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      age: Math.round((now - cached.timestamp) / 1000),
      maxAge: cached.maxAge
    }));

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      entries
    };
  }
}

/**
 * Response optimization utilities
 */
export class ResponseOptimizer {
  /**
   * Optimize JSON response size
   */
  static optimizeJsonResponse(data: any, options: {
    removeNulls?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyArrays?: boolean;
    compactNumbers?: boolean;
  } = {}): any {
    const {
      removeNulls = true,
      removeEmptyStrings = true,
      removeEmptyArrays = true,
      compactNumbers = true
    } = options;

    const optimize = (obj: any): any => {
      if (Array.isArray(obj)) {
        const optimized = obj.map(optimize).filter(item => {
          if (removeEmptyArrays && Array.isArray(item) && item.length === 0) {
            return false;
          }
          return true;
        });
        return removeEmptyArrays && optimized.length === 0 ? undefined : optimized;
      }

      if (obj && typeof obj === 'object') {
        const optimized: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          if (removeNulls && value === null) continue;
          if (removeEmptyStrings && value === '') continue;
          
          const optimizedValue = optimize(value);
          
          if (optimizedValue !== undefined) {
            if (compactNumbers && typeof optimizedValue === 'number') {
              optimized[key] = Math.round(optimizedValue * 100) / 100; // 2 decimal places
            } else {
              optimized[key] = optimizedValue;
            }
          }
        }
        
        return Object.keys(optimized).length === 0 ? undefined : optimized;
      }

      return obj;
    };

    return optimize(data);
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    page: number = 1,
    limit: number = 20,
    totalCount?: number
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      totalCount?: number;
      totalPages?: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);
    
    const pagination = {
      page,
      limit,
      totalCount,
      totalPages: totalCount ? Math.ceil(totalCount / limit) : undefined,
      hasNext: data.length > offset + limit,
      hasPrev: page > 1
    };

    return {
      data: paginatedData,
      pagination
    };
  }

  /**
   * Compress response using gzip (for large responses)
   */
  static async compressResponse(response: NextResponse): Promise<NextResponse> {
    try {
      const text = await response.clone().text();
      
      // Only compress if response is large enough
      if (text.length < 1024) {
        return response;
      }

      const compressed = zlib.gzipSync(text);
      
      const compressedResponse = new Response(new Uint8Array(compressed), {
        status: response.status,
        headers: response.headers
      });
      
      compressedResponse.headers.set('Content-Encoding', 'gzip');
      compressedResponse.headers.set('Content-Length', String(compressed.length));
      
      return compressedResponse;
    } catch (error) {
      console.warn('[Response Optimizer] Failed to compress response:', error);
      return response;
    }
  }
}

/**
 * Database query optimization utilities
 */
export class DbQueryOptimizer {
  /**
   * Build optimized Prisma query with performance hints
   */
  static buildOptimizedQuery<T>(
    baseQuery: any,
    options: {
      limit?: number;
      select?: Record<string, boolean>;
      include?: Record<string, boolean>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      enableCursor?: boolean;
      enablePrefetch?: boolean;
    } = {}
  ) {
    const {
      limit = 100,
      select,
      include,
      orderBy,
      enableCursor = false,
      enablePrefetch = true
    } = options;

    const query = { ...baseQuery };

    // Add limit to prevent large result sets
    query.take = Math.min(limit, 1000);

    // Optimize field selection
    if (select) {
      query.select = select;
    } else if (include) {
      query.include = include;
    }

    // Add ordering for consistent pagination
    if (orderBy) {
      query.orderBy = orderBy;
    }

    // Add cursor-based pagination hint
    if (enableCursor && orderBy) {
      // This would be implemented based on specific cursor logic
    }

    return query;
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static analyzeQuery(query: any): {
    suggestions: string[];
    estimatedCost: 'low' | 'medium' | 'high';
    optimizedQuery?: any;
  } {
    const suggestions: string[] = [];
    let estimatedCost: 'low' | 'medium' | 'high' = 'low';

    // Check for missing limit
    if (!query.take && !query.findUnique) {
      suggestions.push('Add LIMIT to prevent large result sets');
      estimatedCost = 'high';
    }

    // Check for missing select/include
    if (!query.select && !query.include) {
      suggestions.push('Use SELECT to fetch only required fields');
      estimatedCost = 'medium';
    }

    // Check for complex nested queries
    if (query.include && Object.keys(query.include).length > 3) {
      suggestions.push('Consider reducing nested includes or using separate queries');
      estimatedCost = 'high';
    }

    // Check for missing indexes (would require schema analysis)
    if (query.where && !query.orderBy) {
      suggestions.push('Consider adding ORDER BY for consistent results');
    }

    return {
      suggestions,
      estimatedCost,
      optimizedQuery: this.buildOptimizedQuery(query)
    };
  }
}

/**
 * Middleware factory for API performance
 */
export function createPerformanceMiddleware(options: PerformanceOptions = {}) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return ApiPerformanceManager.withPerformance(handler, {
      enableCaching: true,
      cacheMaxAge: 300,
      enableCompression: true,
      enableMetrics: true,
      enableBudgetEnforcement: true,
      responseTimeBudget: 500,
      ...options
    });
  };
}

// Export for use in API routes
export const withApiPerformance = createPerformanceMiddleware();