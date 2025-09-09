import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from './auth';
import { UserRole } from '@/types/prisma';
import { logger } from '@/lib/error-handling/logger';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
// Import our extended types
import '@/types/next-auth';

// Type for authentica1ted request
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    role: UserRole;
    email?: string;
  };
}

// Middleware to check if user is authenticated
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      id: session.user.id,
      role: session.user.role as UserRole,
      email: session.user.email || undefined,
    };

    return handler(authenticatedRequest);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Middleware to check if user has specific role
export async function withRole(
  request: NextRequest,
  requiredRoles: UserRole[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  return withAuth(request, async (authenticatedRequest) => {
    const userRole = authenticatedRequest.user?.role;
    
    if (!userRole || !requiredRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(authenticatedRequest);
  });
}

// Helper function to check if user has admin access
export async function withAdminAccess(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  return withRole(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN], handler);
}

// Helper function to check if user has helper access (therapist, counselor, etc.)
export async function withHelperAccess(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  return withRole(request, [
    UserRole.HELPER,
    UserRole.THERAPIST,
    UserRole.CRISIS_COUNSELOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ], handler);
}

// Alias for withHelperAccess for backward compatibility
export const withHelper = withHelperAccess;

// Alternative version of withRole that accepts different parameter signature
export function withRoles(
  requiredRoles: UserRole[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    return withRole(request, requiredRoles, handler);
  };
}

// Helper function for crisis counselors
export async function withCrisisCounselor(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  return withRole(request, [
    UserRole.CRISIS_COUNSELOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ], handler);
}

// Rate limiting middleware using Upstash Redis
// Initialize Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export function withRateLimit(
  maxRequests: number = 60,
  windowMs: number = 60000
) {
  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
    analytics: true,
  });

  return function(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
  ): (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse {
    return async (req: AuthenticatedRequest) => {
      // Get client IP for rate limiting
      const ip = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
      
      try {
        const { success, limit, remaining, reset } = await ratelimit.limit(
          `auth_${ip}`
        );

        if (!success) {
          return NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${Math.round(
                (reset - Date.now()) / 1000
              )} seconds.`,
            },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }

        // Add rate limit headers to successful responses
        const response = await handler(req);
        response.headers.set("X-RateLimit-Limit", limit.toString());
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", reset.toString());
        
        return response;
      } catch (error) {
        logger.error("Rate limiting error:", error);
        // If rate limiting fails, allow the request but log the error
        return handler(req);
      }
    };
  };
}
