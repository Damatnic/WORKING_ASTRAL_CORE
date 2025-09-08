/**
 * Validation Middleware for AstralCore Mental Health Platform
 * 
 * This middleware provides:
 * - Automatic request body validation and sanitization
 * - XSS prevention for all inputs
 * - Security threat detection and logging
 * - HIPAA-compliant audit logging (no sensitive data logged)
 * - Rate limiting integration
 * - Request/response transformation
 * 
 * @author AstralCore Development Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import ValidationService from './validation-service';
import type { ValidationError, ValidationResult, SecurityContext } from '@/types';

// Security threat levels
type ThreatLevel = 'clean' | 'suspicious' | 'malicious';

// Validation middleware configuration
interface ValidationConfig {
  schema?: ZodSchema;
  sanitizeInputs?: boolean;
  logSecurityEvents?: boolean;
  blockMaliciousRequests?: boolean;
  maxRequestSize?: number;
  allowedMethods?: string[];
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // minutes
  };
  customSanitizers?: Record<string, (value: any) => any>;
}

// Security audit event (HIPAA compliant - no sensitive data)
interface SecurityAuditEvent {
  timestamp: Date;
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  threatLevel: ThreatLevel;
  threatCount: number;
  endpoint: string;
  method: string;
  blocked: boolean;
  threats: string[];
}

// Request context with security information
interface SecurityRequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  sanitizedBody?: any;
  originalBody?: any;
  securityThreats: string[];
  threatLevel: ThreatLevel;
  isBlocked: boolean;
}

// Validation result with enhanced security info
interface ValidationMiddlewareResult {
  isValid: boolean;
  sanitizedData?: any;
  errors: ValidationError[];
  securityContext: SecurityRequestContext;
  shouldBlock: boolean;
}

/**
 * Main Validation Middleware Class
 */
export class ValidationMiddleware {
  private static instance: ValidationMiddleware;
  private validator: ValidationService;
  private auditEvents: SecurityAuditEvent[] = [];
  private requestCounts: Map<string, { count: number; window: number }> = new Map();

  constructor() {
    this.validator = ValidationService.getInstance();
  }

  static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  /**
   * Create validation middleware for API routes
   */
  createMiddleware(config: ValidationConfig = {}) {
    return async (request: NextRequest): Promise<NextResponse | undefined> => {
      const context = this.createSecurityContext(request);
      
      try {
        // Rate limiting check
        if (config.rateLimit && !this.checkRateLimit(context.ipAddress || 'unknown', config.rateLimit)) {
          this.logSecurityEvent({
            ...context,
            threatLevel: 'suspicious',
            threatCount: 1,
            blocked: true,
            threats: ['Rate limit exceeded']
          } as SecurityAuditEvent);
          
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED'
            }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // Method validation
        if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Method not allowed',
              code: 'METHOD_NOT_ALLOWED'
            }),
            {
              status: 405,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // Request size validation
        if (config.maxRequestSize) {
          const contentLength = parseInt(request.headers.get('content-length') || '0');
          if (contentLength > config.maxRequestSize) {
            return new NextResponse(
              JSON.stringify({
                success: false,
                error: 'Request too large',
                code: 'REQUEST_TOO_LARGE'
              }),
              {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }

        // Body validation and sanitization
        if (request.method !== 'GET' && request.method !== 'DELETE') {
          const validationResult = await this.validateAndSanitizeRequest(request, config);
          
          // Block malicious requests if configured
          if (config.blockMaliciousRequests && validationResult.shouldBlock) {
            this.logSecurityEvent({
              ...context,
              threatLevel: validationResult.securityContext.threatLevel,
              threatCount: validationResult.securityContext.securityThreats.length,
              blocked: true,
              threats: validationResult.securityContext.securityThreats
            } as SecurityAuditEvent);

            return new NextResponse(
              JSON.stringify({
                success: false,
                error: 'Request blocked due to security policy',
                code: 'SECURITY_VIOLATION'
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Log security events
          if (config.logSecurityEvents && validationResult.securityContext.securityThreats.length > 0) {
            this.logSecurityEvent({
              ...context,
              threatLevel: validationResult.securityContext.threatLevel,
              threatCount: validationResult.securityContext.securityThreats.length,
              blocked: false,
              threats: validationResult.securityContext.securityThreats
            } as SecurityAuditEvent);
          }

          // Return validation errors
          if (!validationResult.isValid) {
            return new NextResponse(
              JSON.stringify({
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: validationResult.errors
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Attach sanitized data to request for use in API handler
          (request as any).sanitizedBody = validationResult.sanitizedData;
          (request as any).securityContext = validationResult.securityContext;
        }

        // Continue to next middleware/handler
        return undefined;
      } catch (error) {
        console.error('Validation middleware error:', error);
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    };
  }

  /**
   * Validate and sanitize request body
   */
  private async validateAndSanitizeRequest(
    request: NextRequest,
    config: ValidationConfig
  ): Promise<ValidationMiddlewareResult> {
    let body: any;
    
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData);
      } else {
        body = {};
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{ field: 'body', message: 'Invalid request body format', code: 'INVALID_FORMAT' }],
        securityContext: this.createSecurityContext(request),
        shouldBlock: true
      };
    }

    // Create security context
    const securityContext = this.createSecurityContext(request);
    securityContext.originalBody = body;

    // Sanitize inputs if configured
    let sanitizedData = body;
    if (config.sanitizeInputs !== false) {
      const sanitizationResult = this.sanitizeRequestData(body, config.customSanitizers);
      sanitizedData = sanitizationResult.sanitized;
      securityContext.securityThreats.push(...sanitizationResult.threats);
      securityContext.threatLevel = sanitizationResult.level;
      securityContext.sanitizedBody = sanitizedData;
    }

    // Schema validation if provided
    let validationErrors: ValidationError[] = [];
    if (config.schema) {
      const validationResult = this.validateWithSchema(config.schema, sanitizedData);
      validationErrors = validationResult.errors;
      if (validationResult.isValid && validationResult.data) {
        sanitizedData = validationResult.data;
      }
    }

    // Determine if request should be blocked
    const shouldBlock = config.blockMaliciousRequests && 
      (securityContext.threatLevel === 'malicious' || validationErrors.length > 10);

    securityContext.isBlocked = shouldBlock;

    return {
      isValid: validationErrors.length === 0,
      sanitizedData,
      errors: validationErrors,
      securityContext,
      shouldBlock
    };
  }

  /**
   * Sanitize request data recursively
   */
  private sanitizeRequestData(
    data: any,
    customSanitizers?: Record<string, (value: any) => any>
  ): { sanitized: any; threats: string[]; level: ThreatLevel } {
    if (data === null || data === undefined) {
      return { sanitized: data, threats: [], level: 'clean' };
    }

    const allThreats: string[] = [];
    let maxThreatLevel: ThreatLevel = 'clean';

    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Apply custom sanitizer if available
        if (customSanitizers) {
          for (const [key, sanitizer] of Object.entries(customSanitizers)) {
            if (key === 'all' || (typeof key === 'string' && obj.includes(key))) {
              obj = sanitizer(obj);
            }
          }
        }

        // Apply security validation
        const result = this.validator.validateSecurity(obj);
        if (!result.isSecure) {
          allThreats.push(...result.threats);
          if (result.level === 'malicious' || (result.level === 'suspicious' && maxThreatLevel === 'clean')) {
            maxThreatLevel = result.level;
          }
        }
        return result.sanitized;
      } else if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      } else if (typeof obj === 'object' && obj !== null) {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize the key itself
          const sanitizedKey = typeof key === 'string' ? 
            this.validator.validateSecurity(key).sanitized : key;
          sanitized[sanitizedKey] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    };

    const sanitizedData = sanitize(data);

    return {
      sanitized: sanitizedData,
      threats: allThreats,
      level: maxThreatLevel
    };
  }

  /**
   * Validate data against schema
   */
  private validateWithSchema<T>(schema: ZodSchema<T>, data: any): ValidationResult & { data?: T } {
    try {
      const validatedData = schema.parse(data);
      return {
        isValid: true,
        errors: [],
        data: validatedData
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = (error as z.ZodError).issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: undefined // Don't expose actual values for HIPAA compliance
        }));

        return {
          isValid: false,
          errors: validationErrors
        };
      }

      return {
        isValid: false,
        errors: [{ field: 'unknown', message: 'Schema validation failed', code: 'SCHEMA_ERROR' }]
      };
    }
  }

  /**
   * Create security context from request
   */
  private createSecurityContext(request: NextRequest): SecurityRequestContext {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      requestId,
      ipAddress,
      userAgent,
      securityThreats: [],
      threatLevel: 'clean',
      isBlocked: false
    };
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || cfIp || 'unknown';
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(identifier: string, limit: { requests: number; window: number }): boolean {
    const now = Date.now();
    const windowMs = limit.window * 60 * 1000;
    const key = `${identifier}_${Math.floor(now / windowMs)}`;
    
    const current = this.requestCounts.get(key) || { count: 0, window: Math.floor(now / windowMs) };
    
    if (current.window < Math.floor(now / windowMs)) {
      // New window
      current.count = 1;
      current.window = Math.floor(now / windowMs);
    } else {
      current.count++;
    }
    
    this.requestCounts.set(key, current);
    
    // Clean up old entries
    this.cleanupRateLimitMap(now, windowMs);
    
    return current.count <= limit.requests;
  }

  /**
   * Clean up rate limit tracking map
   */
  private cleanupRateLimitMap(now: number, windowMs: number): void {
    const cutoff = now - (windowMs * 2); // Keep 2 windows of data
    const cutoffWindow = Math.floor(cutoff / windowMs);
    
    for (const [key, data] of this.requestCounts.entries()) {
      if (data.window < cutoffWindow) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Log security event (HIPAA compliant - no sensitive data)
   */
  private logSecurityEvent(event: SecurityAuditEvent): void {
    // Store in memory (in production, this should go to a secure logging service)
    this.auditEvents.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.auditEvents.length > 1000) {
      this.auditEvents = this.auditEvents.slice(-1000);
    }

    // Log to console in development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security Event:', {
        timestamp: event.timestamp,
        requestId: event.requestId,
        threatLevel: event.threatLevel,
        endpoint: event.endpoint,
        threatCount: event.threatCount,
        blocked: event.blocked
        // Note: Not logging actual threats or user data for privacy
      });
    }
  }

  /**
   * Get security audit summary (for admin dashboard)
   */
  getSecurityAuditSummary(): {
    totalEvents: number;
    last24Hours: number;
    threatLevels: Record<ThreatLevel, number>;
    blockedRequests: number;
    topThreats: Array<{ threat: string; count: number }>;
  } {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recent = this.auditEvents.filter(event => event.timestamp.getTime() > last24Hours);
    
    const threatLevels: Record<ThreatLevel, number> = {
      clean: 0,
      suspicious: 0,
      malicious: 0
    };

    let blockedRequests = 0;
    const threatCounts: Record<string, number> = {};

    for (const event of recent) {
      threatLevels[event.threatLevel]++;
      if (event.blocked) blockedRequests++;
      
      for (const threat of event.threats) {
        threatCounts[threat] = (threatCounts[threat] || 0) + 1;
      }
    }

    const topThreats = Object.entries(threatCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([threat, count]) => ({ threat, count }));

    return {
      totalEvents: this.auditEvents.length,
      last24Hours: recent.length,
      threatLevels,
      blockedRequests,
      topThreats
    };
  }
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Create validation middleware with schema
 */
export function withValidation<T>(schema: ZodSchema<T>, config: ValidationConfig = {}) {
  const middleware = ValidationMiddleware.getInstance();
  return middleware.createMiddleware({ ...config, schema });
}

/**
 * Create sanitization-only middleware
 */
export function withSanitization(config: ValidationConfig = {}) {
  const middleware = ValidationMiddleware.getInstance();
  return middleware.createMiddleware({ ...config, sanitizeInputs: true });
}

/**
 * Create security-focused middleware
 */
export function withSecurity(config: ValidationConfig = {}) {
  const middleware = ValidationMiddleware.getInstance();
  return middleware.createMiddleware({
    ...config,
    sanitizeInputs: true,
    logSecurityEvents: true,
    blockMaliciousRequests: true
  });
}

/**
 * Get validated and sanitized body from request
 */
export function getSanitizedBody(request: NextRequest): any {
  return (request as any).sanitizedBody;
}

/**
 * Get security context from request
 */
export function getSecurityContext(request: NextRequest): SecurityRequestContext | undefined {
  return (request as any).securityContext;
}

// Export middleware instance
export default ValidationMiddleware.getInstance();