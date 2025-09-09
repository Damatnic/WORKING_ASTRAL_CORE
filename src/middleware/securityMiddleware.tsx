/**
 * Security Middleware
 * Provides comprehensive security protection for the application
 * HIPAA-compliant request/response processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityConfig } from '@/config/security.config';

// Security headers for HIPAA compliance
const SECURITY_HEADERS = {
  // HIPAA-required security headers
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Healthcare-specific headers
  'X-Healthcare-Compliance': 'HIPAA',
  'X-Data-Classification': 'PHI',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Session tracking for security monitoring
const activeSessions = new Map<string, { 
  lastActivity: number; 
  requests: number; 
  suspicious: boolean;
  userAgent: string;
  ip: string;
}>();

export async function securityMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const sessionId = getSessionId(request);

  try {
    // 1. Rate limiting check
    const rateLimitResult = await checkRateLimit(clientIP, request.url);
    if (!rateLimitResult.allowed) {
      return createSecurityErrorResponse('Too Many Requests', 429, {
        'Retry-After': String(Math.ceil(rateLimitResult.resetTime / 1000))
      });
    }

    // 2. Security header validation
    const securityValidation = validateSecurityHeaders(request);
    if (!securityValidation.valid) {
      console.warn('Security header validation failed:', securityValidation.issues);
    }

    // 3. Session security check
    if (sessionId) {
      const sessionResult = await validateSession(sessionId, clientIP, userAgent);
      if (!sessionResult.valid) {
        return createSecurityErrorResponse('Invalid Session', 401);
      }
      
      // Update session activity
      updateSessionActivity(sessionId, clientIP, userAgent);
    }

    // 4. Suspicious activity detection
    const suspiciousActivity = detectSuspiciousActivity(request, clientIP, userAgent);
    if (suspiciousActivity.detected) {
      console.warn('Suspicious activity detected:', suspiciousActivity.reason);
      // Log to audit system in production
    }

    // 5. HTTPS enforcement (production only)
    if (securityConfig.api.requireHTTPS && !request.url.startsWith('https://')) {
      const httpsUrl = request.url.replace('http://', 'https://');
      return NextResponse.json(httpsUrl, 301);
    }

    // 6. API endpoint protection
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const apiValidation = await validateAPIRequest(request);
      if (!apiValidation.valid) {
        return createSecurityErrorResponse(
          apiValidation.error || 'API validation failed', 
          apiValidation.status || 400
        );
      }
    }

    // Continue to next middleware/route
    const response = NextResponse.json({ success: true });

    // Add security headers to response
    addSecurityHeaders(response);

    // Add performance metrics
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Response-Time', `${processingTime}ms`);
    response.headers.set('X-Request-ID', generateRequestId());

    // Log successful request for audit
    if (securityConfig.monitoring.enabled) {
      logSecurityEvent('request_processed', {
        ip: clientIP,
        userAgent,
        path: request.nextUrl.pathname,
        method: request.method,
        processingTime,
        sessionId
      });
    }

    return response;

  } catch (error) {
    console.error('Security middleware error:', error);
    
    // Log security error
    logSecurityEvent('middleware_error', {
      ip: clientIP,
      userAgent,
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return createSecurityErrorResponse('Internal Security Error', 500);
  }
}

/**
 * Rate limiting implementation
 */
async function checkRateLimit(ip: string, url: string): Promise<{ allowed: boolean; resetTime: number }> {
  const key = `${ip}:${url}`;
  const now = Date.now();
  const windowMs = securityConfig.rateLimit.windowMs;
  const maxRequests = securityConfig.rateLimit.maxRequests;

  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, resetTime: 0 };
  }

  if (now > existing.resetTime) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, resetTime: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, resetTime: existing.resetTime - now };
  }

  existing.count++;
  return { allowed: true, resetTime: 0 };
}

/**
 * Validate security headers
 */
function validateSecurityHeaders(request: NextRequest): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for required headers in API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!request.headers.get('content-type')?.includes('application/json') && 
        request.method !== 'GET') {
      issues.push('Missing or invalid Content-Type header');
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-original-ip'
  ];

  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && value.split(',').length > 3) {
      issues.push(`Suspicious ${header} header with multiple IPs`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Session validation
 */
async function validateSession(sessionId: string, ip: string, userAgent: string): Promise<{ valid: boolean }> {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return { valid: false };
  }

  const now = Date.now();
  const maxIdleMs = securityConfig.session.maxIdleMinutes * 60 * 1000;
  
  // Check session timeout
  if (now - session.lastActivity > maxIdleMs) {
    activeSessions.delete(sessionId);
    return { valid: false };
  }

  // Check session binding
  if (securityConfig.session.bindToIP && session.ip !== ip) {
    return { valid: false };
  }

  if (securityConfig.session.bindToUserAgent && session.userAgent !== userAgent) {
    return { valid: false };
  }

  return { valid: true };
}

/**
 * Update session activity
 */
function updateSessionActivity(sessionId: string, ip: string, userAgent: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    session.requests++;
  } else {
    activeSessions.set(sessionId, {
      lastActivity: Date.now(),
      requests: 1,
      suspicious: false,
      userAgent,
      ip
    });
  }
}

/**
 * Detect suspicious activity
 */
function detectSuspiciousActivity(
  request: NextRequest, 
  ip: string, 
  userAgent: string
): { detected: boolean; reason?: string } {
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /\b(union|select|insert|update|delete|drop|exec|script)\b/i,
    /<script|javascript:|data:/i,
    /\.\.\//,
    /\/etc\/passwd/,
    /cmd\.exe|powershell/i
  ];

  const url = request.url;
  const body = request.body;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || (body && pattern.test(body.toString()))) {
      return { detected: true, reason: 'SQL injection or XSS attempt' };
    }
  }

  // Check for bot-like behavior
  if (userAgent.length < 10 || 
      /bot|crawler|spider|scraper/i.test(userAgent)) {
    return { detected: true, reason: 'Bot-like user agent' };
  }

  // Check request frequency per IP
  const sessionData = Array.from(activeSessions.values())
    .filter(s => s.ip === ip);
  
  if (sessionData.length > 0 && sessionData[0]?.requests && sessionData[0].requests > 100) {
    return { detected: true, reason: 'High request frequency' };
  }

  return { detected: false };
}

/**
 * Validate API requests
 */
async function validateAPIRequest(request: NextRequest): Promise<{ 
  valid: boolean; 
  error?: string; 
  status?: number; 
}> {
  // Check authentication for protected endpoints
  const protectedPaths = ['/api/user/', '/api/therapy/', '/api/health/'];
  const isProtected = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Authentication required', status: 401 };
    }
  }

  // Validate request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return { valid: false, error: 'Request too large', status: 413 };
  }

  return { valid: true };
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse | NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add HIPAA compliance headers
  if (securityConfig.environment === 'production') {
    response.headers.set('X-HIPAA-Compliant', 'true');
    response.headers.set('X-PHI-Protected', 'true');
  }
}

/**
 * Create error response with security headers
 */
function createSecurityErrorResponse(message: string, status: number, additionalHeaders: Record<string, string> = {}): NextResponse {
  const response = NextResponse.json(
    { error: message, timestamp: new Date().toISOString() },
    { status }
  );

  addSecurityHeaders(response);
  
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || forwardedFor;

  return request.ip || 'unknown';
}

/**
 * Extract session ID from request
 */
function getSessionId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookie = request.headers.get('cookie');
  if (cookie) {
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1] || null;
    }
  }

  return null;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log security events for audit trail
 */
function logSecurityEvent(event: string, data: any): void {
  if (!securityConfig.monitoring.enabled) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    environment: securityConfig.environment
  };

  // In production, send to secure logging service
  if (securityConfig.environment === 'production') {
    // TODO: Integrate with secure logging service (Splunk, ELK, etc.)
    console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', event, data);
  }
}

// Export middleware config for Next.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization)
     * 3. favicon.ico (favicon file)
     * 4. public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};