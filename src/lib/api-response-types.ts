/**
 * Standardized API Response Types for AstralCore
 * Provides consistent response structures across all API endpoints
 */

import { NextResponse } from 'next/server';

// Base response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Paginated response interface
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// Error response interface
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  code: string;
  details?: any;
}

// Success response interface
export interface SuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Common error codes
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Crisis/Safety
  CRISIS_DETECTED: 'CRISIS_DETECTED',
  SAFETY_ALERT_TRIGGERED: 'SAFETY_ALERT_TRIGGERED',
  
  // Content moderation
  CONTENT_FLAGGED: 'CONTENT_FLAGGED',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  SPAM_DETECTED: 'SPAM_DETECTED',
} as const;

// HTTP status codes mapping
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Response builders
export class ApiResponseBuilder {
  /**
   * Create a success response
   */
  static success<T>(
    data: T, 
    message?: string, 
    status: number = STATUS_CODES.OK
  ): NextResponse {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
  }

  /**
   * Create a paginated success response
   */
  static paginated<T>(
    data: T[], 
    pagination: PaginationMeta,
    message?: string
  ): NextResponse {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    status: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
    details?: any
  ): NextResponse {
    const response: ErrorResponse = {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...(details && process.env.NODE_ENV === 'development' && { details }),
    };

    return NextResponse.json(response, { 
      status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  /**
   * Create a validation error response
   */
  static validationError(
    message: string = 'Validation failed',
    errors: ValidationError[]
  ): NextResponse {
    const response: ErrorResponse = {
      success: false,
      error: message,
      code: ERROR_CODES.VALIDATION_ERROR,
      details: { errors },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: STATUS_CODES.BAD_REQUEST });
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(
    message: string = 'Unauthorized access',
    code: string = ERROR_CODES.UNAUTHORIZED
  ): NextResponse {
    return ApiResponseBuilder.error(message, code, STATUS_CODES.UNAUTHORIZED);
  }

  /**
   * Create a forbidden response
   */
  static forbidden(
    message: string = 'Access denied',
    code: string = ERROR_CODES.FORBIDDEN
  ): NextResponse {
    return ApiResponseBuilder.error(message, code, STATUS_CODES.FORBIDDEN);
  }

  /**
   * Create a not found response
   */
  static notFound(
    message: string = 'Resource not found',
    code: string = ERROR_CODES.NOT_FOUND
  ): NextResponse {
    return ApiResponseBuilder.error(message, code, STATUS_CODES.NOT_FOUND);
  }

  /**
   * Create a conflict response
   */
  static conflict(
    message: string = 'Resource already exists',
    code: string = ERROR_CODES.ALREADY_EXISTS
  ): NextResponse {
    return ApiResponseBuilder.error(message, code, STATUS_CODES.CONFLICT);
  }

  /**
   * Create a rate limit exceeded response
   */
  static rateLimitExceeded(
    message: string = 'Rate limit exceeded',
    resetTime?: number
  ): NextResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (resetTime) {
      headers['Retry-After'] = Math.ceil((resetTime - Date.now()) / 1000).toString();
      headers['X-RateLimit-Reset'] = resetTime.toString();
    }

    const response: ErrorResponse = {
      success: false,
      error: message,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: STATUS_CODES.TOO_MANY_REQUESTS,
      headers,
    });
  }

  /**
   * Create a crisis detected response
   */
  static crisisDetected(
    data: any,
    interventions: string[],
    message: string = 'Content created successfully with safety interventions triggered'
  ): NextResponse {
    const response: SuccessResponse<any> = {
      success: true,
      data,
      message,
      code: ERROR_CODES.CRISIS_DETECTED,
      timestamp: new Date().toISOString(),
    };

    // Add crisis-specific headers
    return NextResponse.json(response, {
      status: STATUS_CODES.CREATED,
      headers: {
        'Content-Type': 'application/json',
        'X-Crisis-Detected': 'true',
        'X-Interventions': interventions.join(','),
      },
    });
  }
}

// Utility function to create pagination metadata
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

// Type guard for success responses
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

// Type guard for error responses
export function isErrorResponse(
  response: ApiResponse<any>
): response is ErrorResponse {
  return response.success === false;
}

// Authentication response types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
  };
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// User profile response types
export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: any;
}

// Crisis response types
export interface CrisisAlertResponse {
  id: string;
  type: string;
  severity: string;
  userId: string;
  context: string;
  indicators: string[];
  handled: boolean;
  handledBy?: string;
  actions: string[];
  notes?: string;
  detectedAt: string;
  handledAt?: string;
}

// Community response types
export interface PostResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  isAnonymous: boolean;
  author: {
    id?: string;
    displayName: string;
    avatar?: string;
    isAnonymous: boolean;
  };
  likeCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}