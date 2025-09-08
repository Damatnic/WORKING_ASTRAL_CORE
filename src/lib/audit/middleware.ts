import { NextRequest, NextResponse } from 'next/server';
import { auditService } from './audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel, DataSensitivity } from './types';
import { getUserFromRequest } from '@/lib/auth-middleware';

/**
 * Audit middleware for Next.js API routes
 * Automatically logs HTTP requests and responses for HIPAA compliance
 */

interface AuditMiddlewareConfig {
  // Events to exclude from auditing (e.g., health checks)
  excludePatterns?: RegExp[];
  
  // Risk level mapping for different endpoints
  riskMapping?: Record<string, RiskLevel>;
  
  // Custom category mapping
  categoryMapping?: Record<string, AuditEventCategory>;
  
  // Whether to log request/response bodies (be careful with PHI)
  logBodies?: boolean;
  
  // Maximum body size to log (in bytes)
  maxBodySize?: number;
}

const DEFAULT_CONFIG: AuditMiddlewareConfig = {
  excludePatterns: [
    /^\/api\/health/,
    /^\/api\/ping/,
    /^\/_next\//,
    /^\/favicon/,
  ],
  riskMapping: {
    '/api/user/profile': RiskLevel.MEDIUM,
    '/api/therapy': RiskLevel.HIGH,
    '/api/crisis': RiskLevel.HIGH,
    '/api/admin': RiskLevel.HIGH,
    '/api/audit': RiskLevel.CRITICAL,
  },
  categoryMapping: {
    '/api/auth': AuditEventCategory.LOGIN_SUCCESS,
    '/api/user': AuditEventCategory.PHI_ACCESS,
    '/api/therapy': AuditEventCategory.PHI_ACCESS,
    '/api/crisis': AuditEventCategory.PHI_ACCESS,
    '/api/admin': AuditEventCategory.USER_MODIFIED,
  },
  logBodies: false, // Default to false for security
  maxBodySize: 10000, // 10KB max
};

/**
 * Create audit middleware for API routes
 */
export function createAuditMiddleware(config: AuditMiddlewareConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return function auditMiddleware(handler: Function) {
    return async function (request: NextRequest, context?: any) {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      
      // Add request ID to headers for tracing
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-request-id', requestId);
      
      // Create enhanced request with audit context
      const enhancedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
      });

      let response: NextResponse;
      let error: Error | null = null;
      let user: any = null;

      try {
        // Skip auditing for excluded patterns
        const pathname = new URL(request.url).pathname;
        if (finalConfig.excludePatterns?.some(pattern => pattern.test(pathname))) {
          return await handler(enhancedRequest, context);
        }

        // Try to get authenticated user
        try {
          user = await getUserFromRequest(enhancedRequest);
        } catch {
          // User not authenticated - this is fine for public endpoints
        }

        // Log request
        await logRequest(enhancedRequest, user, finalConfig, requestId);

        // Execute handler
        response = await handler(enhancedRequest, context);

        // Log successful response
        await logResponse(enhancedRequest, response, user, finalConfig, requestId, startTime);

        return response;

      } catch (err) {
        error = err as Error;
        
        // Create error response
        response = NextResponse.json(
          { 
            success: false, 
            error: 'Internal server error',
            requestId: requestId 
          },
          { status: 500 }
        );

        // Log error response
        await logResponse(enhancedRequest, response, user, finalConfig, requestId, startTime, error);

        throw error; // Re-throw for normal error handling
      }
    };
  };
}

/**
 * Log HTTP request
 */
async function logRequest(
  request: NextRequest,
  user: any,
  config: AuditMiddlewareConfig,
  requestId: string
): Promise<void> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Determine category and risk level
    const category = determineCategory(pathname, request.method, config);
    const riskLevel = determineRiskLevel(pathname, config);
    
    // Get client information
    const sourceIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent');
    
    // Get request body if configured (be very careful with PHI)
    let requestBody: any = null;
    if (config.logBodies && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const bodyText = await request.text();
        if (bodyText.length <= (config.maxBodySize || 10000)) {
          // Sanitize body - remove potential PHI fields
          const parsedBody = JSON.parse(bodyText);
          requestBody = sanitizeRequestBody(parsedBody);
        }
      } catch {
        // Failed to parse body - skip logging
      }
    }

    await auditService.logEvent({
      category: category,
      action: `HTTP_${request.method}`,
      outcome: AuditOutcome.SUCCESS, // Request received successfully
      riskLevel: riskLevel,
      description: `HTTP ${request.method} request to ${pathname}`,
      
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      sessionId: user?.sessionId || null,
      
      sourceIp: sourceIp,
      userAgent: userAgent,
      
      requestId: requestId,
      apiEndpoint: pathname,
      httpMethod: request.method,
      
      dataSensitivity: determineDataSensitivity(pathname),
      
      metadata: {
        queryParams: Object.fromEntries(url.searchParams),
        requestHeaders: sanitizeHeaders(request.headers),
        requestBody: requestBody,
      },
    });

  } catch (error) {
    console.error('Failed to log request audit event:', error);
  }
}

/**
 * Log HTTP response
 */
async function logResponse(
  request: NextRequest,
  response: NextResponse,
  user: any,
  config: AuditMiddlewareConfig,
  requestId: string,
  startTime: number,
  error?: Error
): Promise<void> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const responseTime = Date.now() - startTime;
    
    // Determine category and risk level
    const category = determineCategory(pathname, request.method, config);
    const riskLevel = error ? RiskLevel.HIGH : determineRiskLevel(pathname, config);
    
    // Get client information
    const sourceIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent');
    
    // Determine outcome
    const outcome = error ? AuditOutcome.FAILURE : 
                    response.status >= 400 ? AuditOutcome.FAILURE : 
                    AuditOutcome.SUCCESS;

    // Get response body if configured and it's not too large
    let responseBody: any = null;
    if (config.logBodies && response.headers.get('content-type')?.includes('application/json')) {
      try {
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        const bodyText = await responseClone.text();
        if (bodyText.length <= (config.maxBodySize || 10000)) {
          const parsedBody = JSON.parse(bodyText);
          responseBody = sanitizeResponseBody(parsedBody);
        }
      } catch {
        // Failed to parse body - skip logging
      }
    }

    await auditService.logEvent({
      category: category,
      action: `HTTP_${request.method}_RESPONSE`,
      outcome: outcome,
      riskLevel: riskLevel,
      description: error ? 
        `HTTP ${request.method} request to ${pathname} failed: ${error.message}` :
        `HTTP ${request.method} request to ${pathname} completed`,
      
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      sessionId: user?.sessionId || null,
      
      sourceIp: sourceIp,
      userAgent: userAgent,
      
      requestId: requestId,
      apiEndpoint: pathname,
      httpMethod: request.method,
      httpStatusCode: response.status,
      responseTime: responseTime,
      
      dataSensitivity: determineDataSensitivity(pathname),
      
      errorDetails: error ? {
        errorCode: 'HTTP_ERROR',
        errorMessage: error.message,
        stackTrace: error.stack,
      } : null,
      
      metadata: {
        responseHeaders: sanitizeHeaders(response.headers),
        responseBody: responseBody,
        responseTime: responseTime,
      },
    });

  } catch (auditError) {
    console.error('Failed to log response audit event:', auditError);
  }
}

/**
 * Determine audit category based on endpoint
 */
function determineCategory(
  pathname: string, 
  method: string, 
  config: AuditMiddlewareConfig
): AuditEventCategory {
  // Check custom mapping first
  for (const [pattern, category] of Object.entries(config.categoryMapping || {})) {
    if (pathname.startsWith(pattern)) {
      return category as AuditEventCategory;
    }
  }

  // Default mapping based on endpoint patterns
  if (pathname.includes('/auth/signin') || pathname.includes('/auth/login')) {
    return AuditEventCategory.LOGIN_SUCCESS;
  }
  
  if (pathname.includes('/auth/signout') || pathname.includes('/auth/logout')) {
    return AuditEventCategory.LOGOUT;
  }
  
  if (pathname.includes('/user') || pathname.includes('/profile')) {
    return method === 'GET' ? AuditEventCategory.PHI_ACCESS : AuditEventCategory.PHI_MODIFICATION;
  }
  
  if (pathname.includes('/therapy') || pathname.includes('/session')) {
    return method === 'GET' ? AuditEventCategory.PHI_ACCESS : AuditEventCategory.PHI_MODIFICATION;
  }
  
  if (pathname.includes('/crisis')) {
    return method === 'GET' ? AuditEventCategory.PHI_ACCESS : AuditEventCategory.PHI_MODIFICATION;
  }
  
  if (pathname.includes('/admin')) {
    return AuditEventCategory.USER_MODIFIED;
  }
  
  if (pathname.includes('/audit') || pathname.includes('/compliance')) {
    return AuditEventCategory.AUDIT_LOG_ACCESS;
  }
  
  // Default for API calls
  if (pathname.startsWith('/api/')) {
    return method === 'GET' ? AuditEventCategory.PHI_ACCESS : AuditEventCategory.PHI_MODIFICATION;
  }
  
  return AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE;
}

/**
 * Determine risk level based on endpoint
 */
function determineRiskLevel(pathname: string, config: AuditMiddlewareConfig): RiskLevel {
  // Check custom mapping first
  for (const [pattern, riskLevel] of Object.entries(config.riskMapping || {})) {
    if (pathname.startsWith(pattern)) {
      return riskLevel;
    }
  }

  // Default risk mapping
  if (pathname.includes('/audit') || pathname.includes('/admin')) {
    return RiskLevel.CRITICAL;
  }
  
  if (pathname.includes('/therapy') || pathname.includes('/crisis')) {
    return RiskLevel.HIGH;
  }
  
  if (pathname.includes('/user') || pathname.includes('/profile')) {
    return RiskLevel.MEDIUM;
  }
  
  if (pathname.includes('/auth')) {
    return RiskLevel.MEDIUM;
  }
  
  return RiskLevel.LOW;
}

/**
 * Determine data sensitivity based on endpoint
 */
function determineDataSensitivity(pathname: string): DataSensitivity {
  if (pathname.includes('/therapy') || 
      pathname.includes('/crisis') || 
      pathname.includes('/user') || 
      pathname.includes('/profile') ||
      pathname.includes('/journal') ||
      pathname.includes('/mood')) {
    return DataSensitivity.RESTRICTED; // PHI data
  }
  
  if (pathname.includes('/admin') || pathname.includes('/audit')) {
    return DataSensitivity.CONFIDENTIAL;
  }
  
  if (pathname.includes('/auth')) {
    return DataSensitivity.INTERNAL;
  }
  
  return DataSensitivity.PUBLIC;
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string | null {
  // Check for forwarded IP headers (common in production)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection IP (less reliable in production)
  return request.headers.get('x-client-ip') || 'unknown';
}

/**
 * Sanitize request headers for logging
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];
  
  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Sanitize request body for logging (remove PHI)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'dateOfBirth',
    'phone',
    'email',
    'address',
    'medicalHistory',
    'therapyNotes',
    'crisisNotes',
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field] !== undefined) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize response body for logging (remove PHI)
 */
function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // For successful responses, we typically don't want to log the data payload
  if (body.success && body.data) {
    return {
      success: body.success,
      message: body.message,
      dataType: typeof body.data,
      dataLength: Array.isArray(body.data) ? body.data.length : 1,
    };
  }
  
  // For error responses, log the error but not sensitive details
  if (!body.success) {
    return {
      success: body.success,
      error: body.error,
      code: body.code,
      // Don't log validation details as they might contain PHI
    };
  }
  
  return body;
}

/**
 * Convenience function to wrap an API route with audit middleware
 */
export function withAudit(
  handler: Function, 
  config?: AuditMiddlewareConfig
) {
  const auditMiddleware = createAuditMiddleware(config);
  return auditMiddleware(handler);
}

// Export default configuration
export { DEFAULT_CONFIG as defaultAuditConfig };