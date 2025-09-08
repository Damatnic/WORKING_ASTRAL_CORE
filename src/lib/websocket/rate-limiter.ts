/**
 * Rate Limiter for WebSocket connections
 * Prevents spam and abuse by limiting request rates
 */

import { DEFAULT_RATE_LIMITS } from "./events";

interface RateLimitWindow {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitWindow> = new Map();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Check if an action is within rate limits
   * @param action The action type to check
   * @returns True if within limits, false if rate limited
   */
  public checkLimit(action: string): boolean {
    const config = DEFAULT_RATE_LIMITS[action];
    if (!config) {
      // No rate limit configured for this action
      return true;
    }

    const now = Date.now();
    const window = this.limits.get(action);

    if (!window || now > window.resetTime) {
      // Create new window
      this.limits.set(action, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (window.count >= config.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment counter
    window.count++;
    return true;
  }

  /**
   * Get remaining requests for an action
   * @param action The action type
   * @returns Number of remaining requests in current window
   */
  public getRemainingRequests(action: string): number {
    const config = DEFAULT_RATE_LIMITS[action];
    if (!config) {
      return Infinity;
    }

    const window = this.limits.get(action);
    if (!window || Date.now() > window.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - window.count);
  }

  /**
   * Get time until rate limit resets
   * @param action The action type
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  public getResetTime(action: string): number {
    const window = this.limits.get(action);
    if (!window) {
      return 0;
    }

    const now = Date.now();
    if (now > window.resetTime) {
      return 0;
    }

    return window.resetTime - now;
  }

  /**
   * Reset rate limits for a specific action
   * @param action The action type to reset
   */
  public resetAction(action: string): void {
    this.limits.delete(action);
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.limits.clear();
  }

  /**
   * Clean up expired windows
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [action, window] of this.limits.entries()) {
      if (now > window.resetTime) {
        this.limits.delete(action);
      }
    }
  }

  /**
   * Get current status of all rate limits
   */
  public getStatus(): Record<string, {
    remaining: number;
    resetIn: number;
    limit: number;
  }> {
    const status: Record<string, any> = {};
    
    for (const [action, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
      const window = this.limits.get(action);
      const now = Date.now();
      
      if (!window || now > window.resetTime) {
        status[action] = {
          remaining: config.maxRequests,
          resetIn: 0,
          limit: config.maxRequests,
        };
      } else {
        status[action] = {
          remaining: Math.max(0, config.maxRequests - window.count),
          resetIn: window.resetTime - now,
          limit: config.maxRequests,
        };
      }
    }
    
    return status;
  }
}

/**
 * Global rate limiter for IP-based limiting
 */
export class GlobalRateLimiter {
  private static instance: GlobalRateLimiter;
  private ipLimits: Map<string, Map<string, RateLimitWindow>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): GlobalRateLimiter {
    if (!GlobalRateLimiter.instance) {
      GlobalRateLimiter.instance = new GlobalRateLimiter();
    }
    return GlobalRateLimiter.instance;
  }

  /**
   * Check if an IP is within rate limits for an action
   */
  public checkIpLimit(ip: string, action: string): boolean {
    const config = DEFAULT_RATE_LIMITS[action];
    if (!config) {
      return true;
    }

    if (!this.ipLimits.has(ip)) {
      this.ipLimits.set(ip, new Map());
    }

    const ipWindows = this.ipLimits.get(ip)!;
    const now = Date.now();
    const window = ipWindows.get(action);

    if (!window || now > window.resetTime) {
      ipWindows.set(action, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (window.count >= config.maxRequests * 2) { // Double limit for IP
      return false;
    }

    window.count++;
    return true;
  }

  /**
   * Clean up expired windows
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [ip, windows] of this.ipLimits.entries()) {
      for (const [action, window] of windows.entries()) {
        if (now > window.resetTime) {
          windows.delete(action);
        }
      }
      
      if (windows.size === 0) {
        this.ipLimits.delete(ip);
      }
    }
  }

  /**
   * Destroy the global rate limiter
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}