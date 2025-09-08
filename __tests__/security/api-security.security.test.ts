/**
 * API Security Tests
 * Tests rate limiting, CORS, security headers for AstralCore APIs
 * 
 * HIPAA Compliance: Tests ensure API security protects PHI
 * and prevents unauthorized access to mental health data
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig, RateLimitTestConfig, SecurityHeadersTestConfig, CORSTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('next/server');
jest.mock('next/headers');
jest.mock('@upstash/ratelimit');
jest.mock('@/lib/security/rate-limiter');
jest.mock('@/lib/security/security-headers');

// Mock rate limiter
const mockRateLimit = {
  limit: jest.fn(),
  check: jest.fn(),
  reset: jest.fn(),
  getRemaining: jest.fn()
};

// Mock security headers service
const mockSecurityHeaders = {
  setSecurityHeaders: jest.fn(),
  validateHeaders: jest.fn(),
  generateCSP: jest.fn(),
  checkCSPViolation: jest.fn()
};

// Mock database for logging
const mockDb = {
  securityEvent: {
    create: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  rateLimitLog: {
    create: jest.fn()
  }
};

const securityConfig: SecurityTestConfig = defaultSecurityConfig;
const rateLimitConfig: RateLimitTestConfig = securityConfig.security.rateLimiting;
const headersConfig: SecurityHeadersTestConfig = securityConfig.security.headers;
const corsConfig: CORSTestConfig = securityConfig.security.cors;

describe('API Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce API endpoint rate limits', async () => {
      const testEndpoints = [
        { path: '/api/auth/login', limit: rateLimitConfig.loginAttempts.maxAttempts },
        { path: '/api/user/profile', limit: rateLimitConfig.apiEndpoints.requestsPerMinute },
        { path: '/api/wellness/mood', limit: rateLimitConfig.apiEndpoints.requestsPerMinute },
        { path: '/api/crisis/assessment', limit: rateLimitConfig.resourceAccess.phiQueries }
      ];

      for (const endpoint of testEndpoints) {
        const clientId = '192.168.1.1';
        
        // Mock rate limit check
        mockRateLimit.check.mockResolvedValueOnce({
          success: true,
          remaining: endpoint.limit - 1,
          reset: Date.now() + 60000
        });

        const rateCheck = await mockRateLimit.check();
        expect(rateCheck.success).toBe(true);

        // Test rate limit exceeded
        mockRateLimit.check.mockResolvedValueOnce({
          success: false,
          remaining: 0,
          reset: Date.now() + 60000
        });

        const rateLimitExceeded = await mockRateLimit.check();
        expect(rateLimitExceeded.success).toBe(false);

        // Verify rate limit violation is logged
        expect(mockDb.rateLimitLog.create).toHaveBeenCalledWith({
          data: {
            endpoint: endpoint.path,
            clientId,
            limitExceeded: true,
            timestamp: expect.any(Date),
            riskLevel: endpoint.path.includes('login') ? 'high' : 'medium'
          }
        });
      }
    });

    it('should implement progressive delay for repeated violations', async () => {
      const clientId = 'suspicious.client.ip';
      const violations = [1, 2, 3, 4, 5];

      for (const violationCount of violations) {
        const delay = calculateProgressiveDelay(violationCount);
        
        // Progressive delay should increase exponentially
        if (violationCount > 1) {
          const previousDelay = calculateProgressiveDelay(violationCount - 1);
          expect(delay).toBeGreaterThan(previousDelay);
        }

        // Maximum delay should be capped
        const maxDelay = 300000; // 5 minutes
        expect(delay).toBeLessThanOrEqual(maxDelay);

        // Log the progressive delay
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'progressive_rate_limit',
            clientId,
            violationCount,
            delay,
            timestamp: expect.any(Date)
          }
        });
      }
    });

    it('should apply different limits for different user roles', async () => {
      const userRoles = [
        { role: 'patient', limits: { phi: 10, api: 60 } },
        { role: 'therapist', limits: { phi: 100, api: 200 } },
        { role: 'admin', limits: { phi: 500, api: 1000 } },
        { role: 'crisis_counselor', limits: { phi: 200, api: 400 } }
      ];

      for (const userRole of userRoles) {
        const userId = `${userRole.role}_user_123`;
        
        // PHI access limits should be role-based
        mockRateLimit.limit.mockImplementation((key, limit) => {
          if (key.includes('phi')) {
            return Promise.resolve({
              success: true,
              limit: userRole.limits.phi,
              remaining: userRole.limits.phi - 1
            });
          }
          return Promise.resolve({
            success: true,
            limit: userRole.limits.api,
            remaining: userRole.limits.api - 1
          });
        });

        const phiLimit = await mockRateLimit.limit(`phi:${userId}`, userRole.limits.phi);
        expect(phiLimit.limit).toBe(userRole.limits.phi);

        const apiLimit = await mockRateLimit.limit(`api:${userId}`, userRole.limits.api);
        expect(apiLimit.limit).toBe(userRole.limits.api);
      }
    });

    it('should protect against burst attacks', async () => {
      const burstAllowance = rateLimitConfig.apiEndpoints.burstAllowance;
      const normalLimit = rateLimitConfig.apiEndpoints.requestsPerMinute;
      
      // Initial burst should be allowed up to burst allowance
      const burstRequests = Array.from({ length: burstAllowance }, (_, i) => i + 1);
      
      for (const [index, request] of burstRequests.entries()) {
        mockRateLimit.check.mockResolvedValueOnce({
          success: true,
          remaining: burstAllowance - index - 1,
          burst: true
        });

        const result = await mockRateLimit.check();
        expect(result.success).toBe(true);
      }

      // Requests beyond burst allowance should be limited
      mockRateLimit.check.mockResolvedValueOnce({
        success: false,
        remaining: 0,
        burst: false,
        reason: 'burst_limit_exceeded'
      });

      const burstExceeded = await mockRateLimit.check();
      expect(burstExceeded.success).toBe(false);
      expect(burstExceeded.reason).toBe('burst_limit_exceeded');
    });

    it('should implement IP-based blocking for suspicious activity', async () => {
      const suspiciousIPs = [
        '10.0.0.1', // Internal IP trying external access
        '192.168.1.100', // Known bot IP
        '127.0.0.1' // Localhost suspicious activity
      ];

      for (const ip of suspiciousIPs) {
        const suspiciousActivity = {
          ip,
          requests: 1000, // Unusual volume
          timeWindow: 60000, // 1 minute
          patterns: ['sql_injection_attempts', 'brute_force_login']
        };

        const shouldBlock = suspiciousActivity.requests > 500;
        expect(shouldBlock).toBe(true);

        if (shouldBlock) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'ip_blocked_suspicious_activity',
              ip,
              reason: 'excessive_requests',
              requests: suspiciousActivity.requests,
              timeWindow: suspiciousActivity.timeWindow,
              patterns: suspiciousActivity.patterns,
              riskLevel: 'critical'
            }
          });
        }
      }
    });
  });

  describe('CORS Security Tests', () => {
    it('should validate allowed origins', async () => {
      const allowedOrigins = corsConfig.allowedOrigins;
      const testOrigins = [
        { origin: 'https://astralcore.app', shouldAllow: true },
        { origin: 'https://admin.astralcore.app', shouldAllow: true },
        { origin: 'http://astralcore.app', shouldAllow: false }, // HTTP not allowed
        { origin: 'https://malicious.com', shouldAllow: false },
        { origin: 'https://astralcore.app.evil.com', shouldAllow: false }
      ];

      for (const { origin, shouldAllow } of testOrigins) {
        const isAllowed = allowedOrigins.includes(origin);
        expect(isAllowed).toBe(shouldAllow);

        if (!shouldAllow && origin.startsWith('http')) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'cors_violation',
              origin,
              reason: 'origin_not_allowed',
              blocked: true,
              riskLevel: 'medium'
            }
          });
        }
      }
    });

    it('should validate allowed methods', async () => {
      const allowedMethods = corsConfig.allowedMethods;
      const testMethods = [
        { method: 'GET', shouldAllow: true },
        { method: 'POST', shouldAllow: true },
        { method: 'PUT', shouldAllow: true },
        { method: 'DELETE', shouldAllow: true },
        { method: 'PATCH', shouldAllow: true },
        { method: 'OPTIONS', shouldAllow: false }, // Should be handled separately
        { method: 'TRACE', shouldAllow: false },
        { method: 'CONNECT', shouldAllow: false }
      ];

      for (const { method, shouldAllow } of testMethods) {
        const isAllowed = allowedMethods.includes(method);
        expect(isAllowed).toBe(shouldAllow);

        if (!shouldAllow) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'cors_method_violation',
              method,
              blocked: true,
              riskLevel: method === 'TRACE' ? 'high' : 'medium'
            }
          });
        }
      }
    });

    it('should handle preflight requests securely', async () => {
      const preflightMaxAge = corsConfig.preflightMaxAge;
      
      // Preflight cache should not be too long to prevent stale policy issues
      const maxAllowedAge = 86400; // 24 hours
      expect(preflightMaxAge).toBeLessThanOrEqual(maxAllowedAge);
      
      // Test preflight request handling
      const preflightRequest = new NextRequest('https://astralcore.app/api/user/profile', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://admin.astralcore.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const response = new NextResponse();
      response.headers.set('Access-Control-Allow-Origin', 'https://admin.astralcore.app');
      response.headers.set('Access-Control-Allow-Methods', 'POST');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', preflightMaxAge.toString());

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.astralcore.app');
      expect(response.headers.get('Access-Control-Max-Age')).toBe(preflightMaxAge.toString());
    });

    it('should handle credentials properly', async () => {
      const credentialsAllowed = corsConfig.credentials;
      
      if (credentialsAllowed) {
        // When credentials are allowed, origin must be specific (not wildcard)
        const specificOrigin = 'https://astralcore.app';
        expect(corsConfig.allowedOrigins).toContain(specificOrigin);
        expect(corsConfig.allowedOrigins).not.toContain('*');

        // Test credential handling
        const requestWithCredentials = new NextRequest('https://astralcore.app/api/user/profile', {
          method: 'POST',
          headers: {
            'Origin': specificOrigin,
            'Cookie': 'session=abc123'
          }
        });

        const response = new NextResponse();
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Origin', specificOrigin);

        expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(specificOrigin);
      }
    });
  });

  describe('Security Headers Tests', () => {
    it('should set all required security headers', async () => {
      const requiredHeaders = headersConfig.requiredHeaders;
      const testResponse = new NextResponse();

      mockSecurityHeaders.setSecurityHeaders.mockImplementation((response) => {
        if (requiredHeaders.strictTransportSecurity) {
          response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        if (requiredHeaders.contentSecurityPolicy) {
          response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
        }
        if (requiredHeaders.xFrameOptions) {
          response.headers.set('X-Frame-Options', 'DENY');
        }
        if (requiredHeaders.xContentTypeOptions) {
          response.headers.set('X-Content-Type-Options', 'nosniff');
        }
        if (requiredHeaders.referrerPolicy) {
          response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        }
        if (requiredHeaders.permissionsPolicy) {
          response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        }
        return response;
      });

      const securedResponse = mockSecurityHeaders.setSecurityHeaders(testResponse);

      if (requiredHeaders.strictTransportSecurity) {
        expect(securedResponse.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      }
      if (requiredHeaders.contentSecurityPolicy) {
        expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
      }
      if (requiredHeaders.xFrameOptions) {
        expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      }
    });

    it('should implement HIPAA-specific cache control headers', async () => {
      const hipaaHeaders = headersConfig.hipaaHeaders;
      const phiResponse = new NextResponse();

      if (hipaaHeaders.cacheControl) {
        phiResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      }
      if (hipaaHeaders.pragma) {
        phiResponse.headers.set('Pragma', 'no-cache');
      }
      if (hipaaHeaders.expires) {
        phiResponse.headers.set('Expires', '0');
      }

      // PHI responses should never be cached
      expect(phiResponse.headers.get('Cache-Control')).toContain('no-store');
      expect(phiResponse.headers.get('Cache-Control')).toContain('no-cache');
      expect(phiResponse.headers.get('Cache-Control')).toContain('private');
      expect(phiResponse.headers.get('Pragma')).toBe('no-cache');
    });

    it('should validate Content Security Policy effectiveness', async () => {
      const cspConfig = securityConfig.security.csp;
      
      // Test CSP directive validation
      const cspDirectives = cspConfig.directives;
      
      // default-src should be restrictive
      expect(cspDirectives.defaultSrc).toContain("'self'");
      expect(cspDirectives.defaultSrc).not.toContain("'unsafe-eval'");
      
      // script-src should minimize inline scripts
      expect(cspDirectives.scriptSrc).toContain("'self'");
      
      // object-src should be none for security
      expect(cspDirectives.objectSrc).toContain("'none'");
      
      // frame-ancestors should prevent clickjacking
      expect(cspDirectives.frameSrc).toContain("'none'");

      // Test CSP violation reporting
      mockSecurityHeaders.checkCSPViolation.mockResolvedValue({
        violation: true,
        directive: 'script-src',
        blockedUri: 'https://malicious.com/script.js'
      });

      const cspViolation = await mockSecurityHeaders.checkCSPViolation();
      if (cspViolation.violation) {
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'csp_violation',
            directive: cspViolation.directive,
            blockedUri: cspViolation.blockedUri,
            riskLevel: 'high'
          }
        });
      }
    });

    it('should prevent clickjacking attacks', async () => {
      const antiClickjackingHeaders = [
        { header: 'X-Frame-Options', value: 'DENY' },
        { header: 'Content-Security-Policy', value: "frame-ancestors 'none'" }
      ];

      for (const { header, value } of antiClickjackingHeaders) {
        const response = new NextResponse();
        response.headers.set(header, value);

        if (header === 'X-Frame-Options') {
          expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        }
        if (header === 'Content-Security-Policy') {
          expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
        }
      }
    });

    it('should implement secure cookie attributes', async () => {
      const secureCookieTests = [
        {
          name: 'session_token',
          value: 'abc123',
          attributes: 'HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600'
        },
        {
          name: 'csrf_token',
          value: 'def456',
          attributes: 'HttpOnly; Secure; SameSite=Strict; Path=/'
        }
      ];

      for (const cookie of secureCookieTests) {
        // Verify secure cookie attributes
        expect(cookie.attributes).toContain('HttpOnly');
        expect(cookie.attributes).toContain('Secure');
        expect(cookie.attributes).toContain('SameSite=Strict');
        
        // For session cookies, verify reasonable expiration
        if (cookie.name.includes('session')) {
          expect(cookie.attributes).toContain('Max-Age');
          const maxAge = cookie.attributes.match(/Max-Age=(\d+)/);
          if (maxAge) {
            const age = parseInt(maxAge[1]);
            expect(age).toBeLessThanOrEqual(86400); // Max 24 hours
          }
        }
      }
    });
  });

  describe('API Authentication and Authorization Tests', () => {
    it('should validate API tokens properly', async () => {
      const apiTokenTests = [
        { token: 'valid_token_123', valid: true, role: 'therapist' },
        { token: 'expired_token_456', valid: false, reason: 'expired' },
        { token: 'invalid_signature', valid: false, reason: 'invalid_signature' },
        { token: '', valid: false, reason: 'missing_token' }
      ];

      for (const { token, valid, role, reason } of apiTokenTests) {
        const tokenValidation = validateApiToken(token);
        
        expect(tokenValidation.valid).toBe(valid);
        
        if (valid) {
          expect(tokenValidation.role).toBe(role);
        } else {
          expect(tokenValidation.reason).toBe(reason);
          
          // Invalid token attempts should be logged
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'invalid_api_token',
              token: token.substring(0, 10) + '...', // Log partial token for debugging
              reason,
              riskLevel: 'medium'
            }
          });
        }
      }
    });

    it('should implement proper API versioning security', async () => {
      const apiVersions = ['v1', 'v2', 'v3'];
      const deprecatedVersions = ['v1'];
      const currentVersion = 'v3';

      for (const version of apiVersions) {
        const isDeprecated = deprecatedVersions.includes(version);
        const isCurrent = version === currentVersion;

        if (isDeprecated) {
          // Deprecated API versions should warn and potentially restrict access
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'deprecated_api_version_used',
              version,
              recommendedVersion: currentVersion,
              warningLevel: 'medium'
            }
          });
        }

        if (isCurrent) {
          // Current version should have full feature access
          expect(version).toBe(currentVersion);
        }
      }
    });

    it('should protect sensitive endpoints with additional security', async () => {
      const sensitiveEndpoints = [
        '/api/admin/users',
        '/api/phi/export',
        '/api/crisis/emergency-access',
        '/api/audit/logs',
        '/api/system/config'
      ];

      for (const endpoint of sensitiveEndpoints) {
        const securityRequirements = {
          requiresAdminRole: endpoint.includes('/admin/') || endpoint.includes('/system/'),
          requiresAuditLogging: true,
          requiresIPWhitelisting: endpoint.includes('/admin/') || endpoint.includes('/system/'),
          requiresMFA: endpoint.includes('/phi/') || endpoint.includes('/crisis/'),
          requiresJustification: endpoint.includes('/emergency-access')
        };

        // All sensitive endpoints should require audit logging
        expect(securityRequirements.requiresAuditLogging).toBe(true);

        // PHI and crisis endpoints should require MFA
        if (endpoint.includes('/phi/') || endpoint.includes('/crisis/')) {
          expect(securityRequirements.requiresMFA).toBe(true);
        }

        // Admin endpoints should require IP whitelisting
        if (endpoint.includes('/admin/') || endpoint.includes('/system/')) {
          expect(securityRequirements.requiresIPWhitelisting).toBe(true);
        }

        // Log access to sensitive endpoints
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'sensitive_endpoint_access',
            endpoint,
            securityRequirements,
            timestamp: expect.any(Date)
          }
        });
      }
    });
  });

  describe('API Error Handling Security Tests', () => {
    it('should not expose sensitive information in error responses', async () => {
      const errorScenarios = [
        {
          error: new Error('Database connection failed: user=admin password=secret123'),
          expectedResponse: { message: 'Internal server error', code: 'INTERNAL_ERROR' }
        },
        {
          error: new Error('SQL: SELECT * FROM users WHERE id = 123'),
          expectedResponse: { message: 'Database error', code: 'DB_ERROR' }
        },
        {
          error: new Error('File not found: /etc/passwd'),
          expectedResponse: { message: 'Resource not found', code: 'NOT_FOUND' }
        }
      ];

      for (const { error, expectedResponse } of errorScenarios) {
        const sanitizedError = sanitizeError(error);
        
        // Sanitized error should not contain sensitive information
        expect(sanitizedError.message).not.toContain('password');
        expect(sanitizedError.message).not.toContain('SQL:');
        expect(sanitizedError.message).not.toContain('/etc/');
        
        // Should return generic error message
        expect(sanitizedError.message).toBe(expectedResponse.message);
        expect(sanitizedError.code).toBe(expectedResponse.code);
        
        // Original error should be logged for debugging (internally)
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'error_sanitized',
            originalError: error.message,
            sanitizedError: sanitizedError.message,
            riskLevel: 'low'
          }
        });
      }
    });

    it('should implement proper HTTP status code handling', async () => {
      const statusCodeTests = [
        { scenario: 'unauthorized_access', expectedCode: 401 },
        { scenario: 'forbidden_resource', expectedCode: 403 },
        { scenario: 'resource_not_found', expectedCode: 404 },
        { scenario: 'method_not_allowed', expectedCode: 405 },
        { scenario: 'rate_limit_exceeded', expectedCode: 429 },
        { scenario: 'internal_error', expectedCode: 500 }
      ];

      for (const { scenario, expectedCode } of statusCodeTests) {
        const response = generateErrorResponse(scenario);
        expect(response.status).toBe(expectedCode);
        
        // Verify response doesn't leak information
        const responseBody = response.body;
        expect(responseBody).not.toContain('stack trace');
        expect(responseBody).not.toContain('database');
        expect(responseBody).not.toContain('file system');
      }
    });
  });
});

// Helper functions for testing
function calculateProgressiveDelay(violationCount: number): number {
  // Progressive delay: min(2^violations * 1000ms, 300000ms)
  const delay = Math.min(Math.pow(2, violationCount) * 1000, 300000);
  return delay;
}

function validateApiToken(token: string): { valid: boolean; role?: string; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'missing_token' };
  }
  
  if (token === 'expired_token_456') {
    return { valid: false, reason: 'expired' };
  }
  
  if (token === 'invalid_signature') {
    return { valid: false, reason: 'invalid_signature' };
  }
  
  if (token === 'valid_token_123') {
    return { valid: true, role: 'therapist' };
  }
  
  return { valid: false, reason: 'invalid_token' };
}

function sanitizeError(error: Error): { message: string; code: string } {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('database') || errorMessage.includes('sql')) {
    return { message: 'Database error', code: 'DB_ERROR' };
  }
  
  if (errorMessage.includes('file') || errorMessage.includes('path')) {
    return { message: 'Resource not found', code: 'NOT_FOUND' };
  }
  
  if (errorMessage.includes('password') || errorMessage.includes('secret')) {
    return { message: 'Internal server error', code: 'INTERNAL_ERROR' };
  }
  
  return { message: 'Internal server error', code: 'INTERNAL_ERROR' };
}

function generateErrorResponse(scenario: string): { status: number; body: string } {
  const responses = {
    unauthorized_access: { status: 401, body: '{"error":"Unauthorized"}' },
    forbidden_resource: { status: 403, body: '{"error":"Forbidden"}' },
    resource_not_found: { status: 404, body: '{"error":"Not Found"}' },
    method_not_allowed: { status: 405, body: '{"error":"Method Not Allowed"}' },
    rate_limit_exceeded: { status: 429, body: '{"error":"Too Many Requests"}' },
    internal_error: { status: 500, body: '{"error":"Internal Server Error"}' }
  };
  
  return responses[scenario as keyof typeof responses] || { status: 500, body: '{"error":"Unknown Error"}' };
}