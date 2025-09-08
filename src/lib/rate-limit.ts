import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // 1 minute default
  });

  return {
    check: (req: NextRequest, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        
        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1]);
        } else if (tokenCount[0] < limit) {
          tokenCache.set(token, [tokenCount[0] + 1]);
        } else {
          reject(new Error('Rate limit exceeded'));
          return;
        }
        
        resolve();
      }),
  };
}

// Specific rate limiters for different endpoints
export const apiRateLimiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 60000, // 1 minute
});

export const authRateLimiter = rateLimit({
  uniqueTokenPerInterval: 100,
  interval: 900000, // 15 minutes
});

export const therapyRateLimiter = rateLimit({
  uniqueTokenPerInterval: 200,
  interval: 60000, // 1 minute
});

// Helper to get client identifier
export function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  return `${ip}:${userAgent}`;
}