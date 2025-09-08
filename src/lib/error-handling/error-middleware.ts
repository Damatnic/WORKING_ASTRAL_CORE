import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from './error-handler';
import { AppError, ValidationError, AuthenticationError, AuthorizationError } from './error-types';
import { logger } from './logger';
import { z } from 'zod';

/**
 * Error handling middleware for API routes
 */
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, params?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, params?: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    
    // Add request ID to headers for tracking
    const headers = new Headers(request.headers);
    headers.set('x-request-id', requestId);

    // Create request context
    const context = {
      requestId,
      method: request.method,
      url: request.url,
      path: new URL(request.url).pathname,
      startTime,
    };

    // Log request
    logger.info('API request received', context);

    try {
      // Execute handler
      const response = await handler(request, params);
      
      // Log successful response
      const duration = Date.now() - startTime;
      logger.info('API request completed', {
        ...context,
        status: response.status,
        duration,
      });

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', `${duration}ms`);

      return response;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      logger.error('API request failed', {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : error,
        duration,
      });

      // Handle error and return response
      return errorHandler.handleError(error as Error, request, context);
    }
  };
}

/**
 * Validation middleware using Zod schemas
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, data: T) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest) => {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    // Validate against schema
    const result = schema.safeParse(body);
    
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        result.error.issues,
        { fields: result.error.flatten().fieldErrors }
      );
    }

    // Execute handler with validated data
    return handler(request, result.data);
  });
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest) => {
    // Get session from request
    const session = await getSessionFromRequest(request);
    
    if (!session) {
      throw new AuthenticationError('Authentication required');
    }

    // Get user from session
    const user = await getUserFromSession(session);
    
    if (!user) {
      throw new AuthenticationError('Invalid session');
    }

    // Execute handler with authenticated user
    return handler(request, user);
  });
}

/**
 * Authorization middleware
 */
export function withAuthorization(
  roles: string[],
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, user: any) => {
    // Check if user has required role
    if (!roles.includes(user.role)) {
      throw new AuthorizationError(
        'Insufficient permissions',
        { requiredRoles: roles, userRole: user.role }
      );
    }

    // Execute handler with authorized user
    return handler(request, user);
  });
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  limit: number,
  window: number,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    const isLimited = await checkRateLimit(ip, limit, window);
    
    if (isLimited) {
      throw new AppError(
        'Rate limit exceeded',
        'RATE_LIMIT',
        'MEDIUM',
        429,
        true,
        { limit, window }
      );
    }

    // Execute handler
    return handler(request);
  });
}

/**
 * Async error boundary for components
 */
export async function asyncErrorBoundary<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error('Async operation failed', { error });
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Try-catch wrapper with logging
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logger.error(errorMessage, {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
    });
    return null;
  }
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get session from request (placeholder)
 */
async function getSessionFromRequest(request: NextRequest): Promise<any> {
  // This would integrate with the session management system
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) return null;
  
  // Validate session token
  // return await validateSession(sessionToken);
  return null; // Placeholder
}

/**
 * Get user from session (placeholder)
 */
async function getUserFromSession(session: any): Promise<any> {
  // This would fetch user from database
  // return await getUserById(session.userId);
  return null; // Placeholder
}

/**
 * Check rate limit (placeholder)
 */
async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<boolean> {
  // This would check against Redis or database
  // const count = await getRequestCount(identifier, window);
  // return count >= limit;
  return false; // Placeholder
}