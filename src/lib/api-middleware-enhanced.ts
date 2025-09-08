/**
 * Enhanced API Middleware for AstralCore
 * Provides authentication, validation, rate limiting, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { ApiResponseBuilder, ERROR_CODES } from '@/lib/api-response-types';
import { createAuditLog, getClientIp } from '@/lib/api-utils';

// Enhanced request type with user information
export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
  };
  metadata: {
    ip: string;
    userAgent: string;
    startTime: number;
  };
}

// Middleware handler type
export type ApiHandler = (req: AuthenticatedRequest) => Promise<NextResponse>;
export type BaseHandler = (req: NextRequest) => Promise<NextResponse>;

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  'USER': 0,
  'HELPER': 1,
  'THERAPIST': 2,
  'CRISIS_COUNSELOR': 2,
  'ADMIN': 3,
  'SUPER_ADMIN': 4,
} as const;

// Rate limiting store (should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Authentication middleware
export function withAuth(handler: ApiHandler): BaseHandler {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        await createAuditLog({
          userId: null,
          action: 'api_access_denied',
          resource: 'api',
          details: { reason: 'no_session', endpoint: req.nextUrl.pathname },
          outcome: 'failure',
          ipAddress: getClientIp(req),
          userAgent: req.headers.get('user-agent') || undefined,
        });
        
        return ApiResponseBuilder.unauthorized(
          'Authentication required',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          isEmailVerified: true,
          onboardingCompleted: true,
          isActive: true,
          lockedUntil: true,
        },
      });

      if (!user || !user.isActive) {
        return ApiResponseBuilder.unauthorized(
          'Account not found or inactive',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return ApiResponseBuilder.unauthorized(
          'Account is temporarily locked',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Create authenticated request
      const authenticatedRequest = req as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: user.id,
        email: user.email!,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        onboardingCompleted: user.onboardingCompleted,
      };
      authenticatedRequest.metadata = {
        ip: getClientIp(req),
        userAgent: req.headers.get('user-agent') || 'unknown',
        startTime,
      };

      return await handler(authenticatedRequest);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      
      await createAuditLog({
        userId: null,
        action: 'auth_middleware_error',
        resource: 'api',
        details: { error: error instanceof Error ? error.message : 'unknown' },
        outcome: 'failure',
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });
      
      return ApiResponseBuilder.error(
        'Authentication service unavailable',
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        500
      );
    }
  };
}

// Role-based access control middleware
export function withRoles(allowedRoles: string[]) {
  return (handler: ApiHandler): ApiHandler => {
    return async (req: AuthenticatedRequest) => {
      if (!allowedRoles.includes(req.user.role)) {
        await createAuditLog({
          userId: req.user.id,
          action: 'api_access_denied',
          resource: 'api',
          details: { 
            reason: 'insufficient_role',
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            endpoint: req.nextUrl.pathname,
          },
          outcome: 'failure',
          ipAddress: req.metadata.ip,
          userAgent: req.metadata.userAgent,
        });
        
        return ApiResponseBuilder.forbidden(
          'Insufficient permissions',
          ERROR_CODES.FORBIDDEN
        );
      }

      return await handler(req);
    };
  };
}

// Rate limiting middleware
export function withRateLimit(maxRequests: number = 60, windowMs: number = 60000) {
  return (handler: BaseHandler): BaseHandler => {
    return async (req: NextRequest) => {
      const identifier = getClientIp(req);
      const now = Date.now();
      const record = rateLimitStore.get(identifier);
      
      if (!record || now > record.resetTime) {
        const resetTime = now + windowMs;
        rateLimitStore.set(identifier, { count: 1, resetTime });
      } else {
        if (record.count >= maxRequests) {
          return ApiResponseBuilder.rateLimitExceeded(
            'Too many requests. Please try again later.',
            record.resetTime
          );
        }
        record.count++;
      }

      return await handler(req);
    };
  };
}

// Request validation middleware
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: (req: AuthenticatedRequest, validatedData: T) => Promise<NextResponse>) => {
    return async (req: AuthenticatedRequest) => {
      try {
        let body: any = {};
        
        if (req.method !== 'GET' && req.method !== 'DELETE') {
          const contentType = req.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            body = await req.json();
          } else if (contentType?.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            body = Object.fromEntries(formData);
          }
        }

        const validatedData = schema.parse(body);
        return await handler(req, validatedData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors = error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }));
          
          return ApiResponseBuilder.validationError(
            'Request validation failed',
            validationErrors
          );
        }

        console.error('Validation middleware error:', error);
        return ApiResponseBuilder.error(
          'Request validation failed',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
    };
  };
}

// Error handling middleware wrapper
export function withErrorHandling(handler: BaseHandler): BaseHandler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);
      
      await createAuditLog({
        userId: null,
        action: 'api_error',
        resource: 'api',
        details: { 
          error: error instanceof Error ? error.message : 'unknown',
          stack: error instanceof Error ? error.stack : undefined,
          endpoint: req.nextUrl.pathname,
        },
        outcome: 'failure',
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });

      return ApiResponseBuilder.error(
        'Internal server error',
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        500
      );
    }
  };
}

// Preset role-based middleware
export const withAdmin = (handler: ApiHandler) => 
  withAuth(withRoles(['ADMIN', 'SUPER_ADMIN'])(handler));

export const withCrisisCounselor = (handler: ApiHandler) => 
  withAuth(withRoles(['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'])(handler));

export const withHelper = (handler: ApiHandler) => 
  withAuth(withRoles(['HELPER', 'THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'])(handler));

// Security headers helper
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}