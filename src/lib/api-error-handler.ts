// API Error Handler
// Provides consistent error handling across all API routes

import { NextRequest, NextResponse } from 'next/server';

export class ApiErrorResponse extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiErrorResponse';
  }
}

// Common error types
export const CommonErrors = {
  ValidationError: (message: string, details?: any) => 
    new ApiErrorResponse(message, 400, 'VALIDATION_ERROR', details),
    
  NotFound: (resource?: string) => 
    new ApiErrorResponse(`${resource || 'Resource'} not found`, 404, 'NOT_FOUND'),
    
  Unauthorized: () => 
    new ApiErrorResponse('Unauthorized access', 401, 'UNAUTHORIZED'),
    
  Forbidden: (action?: string) => 
    new ApiErrorResponse(`Access forbidden${action ? ` for ${action}` : ''}`, 403, 'FORBIDDEN'),
    
  RateLimit: (limit?: number, window?: number) => 
    new ApiErrorResponse(
      `Rate limit exceeded${limit ? ` (${limit} requests per ${window}ms)` : ''}`, 
      429, 
      'RATE_LIMIT_EXCEEDED'
    ),
    
  ServerError: (message?: string) => 
    new ApiErrorResponse(message || 'Internal server error', 500, 'INTERNAL_ERROR'),
    
  BadRequest: (message?: string) => 
    new ApiErrorResponse(message || 'Bad request', 400, 'BAD_REQUEST'),
    
  Conflict: (message?: string) => 
    new ApiErrorResponse(message || 'Conflict', 409, 'CONFLICT'),
    
  ServiceUnavailable: () => 
    new ApiErrorResponse('Service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE'),
};

// Error response creation
export function createErrorResponse(error: unknown): Response {
  console.error('API Error:', error);
  
  // Handle ApiErrorResponse instances
  if (error instanceof ApiErrorResponse) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
          details: error.details,
        },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
      {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': error.code || 'UNKNOWN_ERROR',
        },
      }
    );
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      {
        error: {
          message: isDev ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR',
          status: 500,
          ...(isDev && { stack: error.stack }),
        },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': 'INTERNAL_ERROR',
        },
      }
    );
  }
  
  // Handle unknown error types
  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
      },
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
    { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': 'UNKNOWN_ERROR',
      },
    }
  );
}

// Wrapper for API route handlers
export function handleApiError(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

// Request ID generation for tracing
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation helper
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw CommonErrors.ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

// Rate limiting helper
export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000
): void {
  // This is a simple in-memory rate limiter
  // In production, use Redis or Upstash
  const ip = getClientIp(request);
  const key = `rate_limit_${ip}`;
  
  // Simple implementation - in production use proper rate limiting
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // This would need proper Redis implementation for production
  if (shouldRateLimit(key, maxRequests, windowStart)) {
    throw CommonErrors.RateLimit(maxRequests, windowMs);
  }
}

// Get client IP address
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Rate limit check (simplified)
function shouldRateLimit(key: string, maxRequests: number, windowStart: number): boolean {
  // Simplified rate limiting - implement proper Redis-based solution
  return false;
}

// Async error handler for promises
export async function handleAsyncError<T>(
  promise: Promise<T>,
  errorHandler?: (error: unknown) => ApiErrorResponse
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (errorHandler) {
      throw errorHandler(error);
    }
    throw error;
  }
}

// Success response helper
export function createSuccessResponse(
  data: any,
  options: {
    status?: number;
    message?: string;
    cacheControl?: string;
  } = {}
): Response {
  const { status = 200, message, cacheControl } = options;
  
  const response = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }
  
  return NextResponse.json(response, { status, headers });
}

// Simple error response helper
export function createApiErrorHandler(
  code: string,
  message: string,
  status: number = 500
): Response {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        status,
      },
      success: false,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': code,
      },
    }
  );
}

// CORS helper
export function handleCors(request: NextRequest): Response | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}