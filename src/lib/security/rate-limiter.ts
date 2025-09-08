/**
 * Rate limiting service for API protection
 * Implements multiple strategies for different endpoints
 */

import { prisma } from '@/lib/prisma';
import { RateLimitError } from '@/lib/error-handling/error-types';
import { logger } from '@/lib/error-handling/logger';

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests in window
  keyPrefix?: string;    // Prefix for rate limit keys
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean;     // Only count successful requests
  message?: string;      // Custom error message
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean;  // Return rate limit info in X-RateLimit headers
}

// Rate limit strategies
export enum RateLimitStrategy {
  SLIDING_WINDOW = 'SLIDING_WINDOW',
  FIXED_WINDOW = 'FIXED_WINDOW',
  TOKEN_BUCKET = 'TOKEN_BUCKET',
  LEAKY_BUCKET = 'LEAKY_BUCKET',
}

// Rate limit entry
interface RateLimitEntry {
  key: string;
  count: number;
  resetTime: Date;
  firstRequestTime: Date;
  tokens?: number;
  lastRefill?: Date;
}

// Default rate limits for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true, // Only count failed attempts
    message: 'Too many login attempts, please try again later',
  },
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many registration attempts',
  },
  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset requests',
  },
  
  // API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down',
  },
  API_SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many search requests',
  },
  API_EXPORT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many export requests',
  },
  
  // Clinical endpoints (more restrictive)
  CLINICAL_ACCESS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    message: 'Rate limit exceeded for clinical data access',
  },
  PHI_ACCESS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Rate limit exceeded for PHI access',
  },
  
  // WebSocket connections
  WS_CONNECTION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Too many WebSocket connection attempts',
  },
  WS_MESSAGE: {
    windowMs: 1000, // 1 second
    maxRequests: 10,
    message: 'Too many WebSocket messages',
  },
} as const;

export class RateLimiter {
  private static instance: RateLimiter;
  private memoryStore: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig,
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const key = this.generateKey(identifier, config.keyPrefix);

    switch (strategy) {
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.checkSlidingWindow(key, config);
      case RateLimitStrategy.FIXED_WINDOW:
        return this.checkFixedWindow(key, config);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.checkTokenBucket(key, config);
      case RateLimitStrategy.LEAKY_BUCKET:
        return this.checkLeakyBucket(key, config);
      default:
        return this.checkSlidingWindow(key, config);
    }
  }

  /**
   * Sliding window rate limiting
   */
  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get recent requests from database
    const recentRequests = await this.getRecentRequests(key, windowStart);
    
    // Calculate weighted count for sliding window
    const weightedCount = this.calculateWeightedCount(recentRequests, windowStart, now, config.windowMs);
    
    const allowed = weightedCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - Math.ceil(weightedCount));
    const resetTime = new Date(now + config.windowMs);
    
    if (allowed) {
      // Record this request
      await this.recordRequest(key, now);
    } else {
      // Calculate retry after
      const oldestRequest = recentRequests[0];
      const retryAfter = oldestRequest 
        ? Math.ceil((oldestRequest.timestamp.getTime() + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  /**
   * Fixed window rate limiting
   */
  private async checkFixedWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const entry = this.memoryStore.get(key);
    
    if (!entry || entry.resetTime.getTime() <= now) {
      // New window
      const resetTime = new Date(now + config.windowMs);
      this.memoryStore.set(key, {
        key,
        count: 1,
        resetTime,
        firstRequestTime: new Date(now),
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }
    
    // Existing window
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime.getTime() - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }
    
    entry.count++;
    this.memoryStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Token bucket rate limiting
   */
  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const entry = this.memoryStore.get(key);
    const refillRate = config.maxRequests / config.windowMs;
    
    if (!entry) {
      // New bucket
      this.memoryStore.set(key, {
        key,
        count: 0,
        tokens: config.maxRequests - 1,
        lastRefill: new Date(now),
        resetTime: new Date(now + config.windowMs),
        firstRequestTime: new Date(now),
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
      };
    }
    
    // Refill tokens
    const timeSinceRefill = now - (entry.lastRefill?.getTime() || now);
    const tokensToAdd = Math.floor(timeSinceRefill * refillRate);
    entry.tokens = Math.min(config.maxRequests, (entry.tokens || 0) + tokensToAdd);
    entry.lastRefill = new Date(now);
    
    if (entry.tokens! < 1) {
      const retryAfter = Math.ceil((1 - entry.tokens!) / refillRate / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + config.windowMs),
        retryAfter,
      };
    }
    
    entry.tokens!--;
    this.memoryStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: Math.floor(entry.tokens!),
      resetTime: new Date(now + config.windowMs),
    };
  }

  /**
   * Leaky bucket rate limiting
   */
  private async checkLeakyBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const entry = this.memoryStore.get(key);
    const leakRate = config.maxRequests / config.windowMs;
    
    if (!entry) {
      // New bucket
      this.memoryStore.set(key, {
        key,
        count: 1,
        resetTime: new Date(now + config.windowMs),
        firstRequestTime: new Date(now),
        lastRefill: new Date(now),
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
      };
    }
    
    // Calculate leaked amount
    const timeSinceLeak = now - (entry.lastRefill?.getTime() || now);
    const leakedAmount = timeSinceLeak * leakRate;
    entry.count = Math.max(0, entry.count - leakedAmount);
    entry.lastRefill = new Date(now);
    
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.count - config.maxRequests + 1) / leakRate / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + config.windowMs),
        retryAfter,
      };
    }
    
    entry.count++;
    this.memoryStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: Math.floor(config.maxRequests - entry.count),
      resetTime: new Date(now + config.windowMs),
    };
  }

  /**
   * Generate rate limit key
   */
  private generateKey(identifier: string, prefix?: string): string {
    return prefix ? `${prefix}:${identifier}` : identifier;
  }

  /**
   * Get recent requests from database
   */
  private async getRecentRequests(
    key: string,
    windowStart: number
  ): Promise<Array<{ timestamp: Date; weight?: number }>> {
    try {
      const requests = await (prisma as any).rateLimitLog.findMany({
        where: {
          key,
          timestamp: {
            gte: new Date(windowStart),
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      return requests.map(r => ({
        timestamp: r.timestamp,
        weight: r.weight || 1,
      }));
    } catch (error) {
      // Fallback to memory store if database is unavailable
      logger.error('Failed to get rate limit requests from database', { error, key });
      return [];
    }
  }

  /**
   * Record a request
   */
  private async recordRequest(key: string, timestamp: number, weight: number = 1): Promise<void> {
    try {
      await (prisma as any).rateLimitLog.create({
        data: {
          key,
          timestamp: new Date(timestamp),
          weight,
        },
      });
    } catch (error) {
      logger.error('Failed to record rate limit request', { error, key });
    }
  }

  /**
   * Calculate weighted count for sliding window
   */
  private calculateWeightedCount(
    requests: Array<{ timestamp: Date; weight?: number }>,
    windowStart: number,
    now: number,
    windowMs: number
  ): number {
    let count = 0;
    
    for (const request of requests) {
      const requestTime = request.timestamp.getTime();
      const weight = request.weight || 1;
      
      if (requestTime >= windowStart) {
        // Request is within current window
        // Apply weight based on position in window (older requests have less weight)
        const age = now - requestTime;
        const windowWeight = 1 - (age / windowMs);
        count += weight * windowWeight;
      }
    }
    
    return count;
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string, prefix?: string): Promise<void> {
    const key = this.generateKey(identifier, prefix);
    
    // Clear from memory
    this.memoryStore.delete(key);
    
    // Clear from database
    try {
      await (prisma as any).rateLimitLog.deleteMany({
        where: { key },
      });
    } catch (error) {
      logger.error('Failed to reset rate limit', { error, key });
    }
  }

  /**
   * Clean up old entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean memory store
    for (const [key, entry] of this.memoryStore) {
      if (entry.resetTime.getTime() <= now) {
        this.memoryStore.delete(key);
      }
    }
    
    // Clean database
    try {
      const cutoff = new Date(now - 24 * 60 * 60 * 1000); // 24 hours
      await (prisma as any).rateLimitLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoff,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to cleanup rate limit logs', { error });
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get rate limit headers
   */
  getRateLimitHeaders(
    result: {
      allowed: boolean;
      remaining: number;
      resetTime: Date;
      retryAfter?: number;
    },
    config: RateLimitConfig
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (config.standardHeaders) {
      headers['RateLimit-Limit'] = config.maxRequests.toString();
      headers['RateLimit-Remaining'] = result.remaining.toString();
      headers['RateLimit-Reset'] = result.resetTime.toISOString();
      
      if (!result.allowed && result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
      }
    }

    if (config.legacyHeaders) {
      headers['X-RateLimit-Limit'] = config.maxRequests.toString();
      headers['X-RateLimit-Remaining'] = result.remaining.toString();
      headers['X-RateLimit-Reset'] = Math.floor(result.resetTime.getTime() / 1000).toString();
      
      if (!result.allowed && result.retryAfter) {
        headers['X-Retry-After'] = result.retryAfter.toString();
      }
    }

    return headers;
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();