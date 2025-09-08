/**
 * Security headers configuration for the application
 * Implements comprehensive security headers for protection against common attacks
 */

import { NextRequest, NextResponse } from 'next/server';

// Content Security Policy directives
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development (remove in production)
    'https://cdn.jsdelivr.net', // For external libraries if needed
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled components
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:', // Allow HTTPS images
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'wss:', // WebSocket connections
    'https://api.crisis-text-line.org', // Crisis API
    process.env.NEXT_PUBLIC_API_URL || '',
  ].filter(Boolean),
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'frame-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
};

// Security headers configuration
export interface SecurityHeadersConfig {
  csp?: boolean;
  hsts?: boolean;
  xContentTypeOptions?: boolean;
  xFrameOptions?: boolean;
  xXssProtection?: boolean;
  referrerPolicy?: boolean;
  permissionsPolicy?: boolean;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean;
  crossOriginResourcePolicy?: boolean;
  strictTransportSecurity?: boolean;
  reportUri?: string;
  nonce?: boolean;
}

// Default security headers configuration
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  csp: true,
  hsts: true,
  xContentTypeOptions: true,
  xFrameOptions: true,
  xXssProtection: true,
  referrerPolicy: true,
  permissionsPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  strictTransportSecurity: true,
  nonce: false, // Enable for stricter CSP
};

export class SecurityHeaders {
  private static instance: SecurityHeaders;
  private config: SecurityHeadersConfig;

  private constructor(config: SecurityHeadersConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: SecurityHeadersConfig): SecurityHeaders {
    if (!SecurityHeaders.instance) {
      SecurityHeaders.instance = new SecurityHeaders(config);
    }
    return SecurityHeaders.instance;
  }

  /**
   * Apply security headers to response
   */
  applyHeaders(
    request: NextRequest,
    response: NextResponse,
    customConfig?: Partial<SecurityHeadersConfig>
  ): NextResponse {
    const config = { ...this.config, ...customConfig };
    
    // Content Security Policy
    if (config.csp) {
      const cspHeader = this.buildCSP(config.nonce ? this.generateNonce() : undefined);
      response.headers.set('Content-Security-Policy', cspHeader);
      
      // Report-only header for testing
      if (process.env.NODE_ENV === 'development') {
        response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
      }
    }

    // Strict Transport Security (HSTS)
    if (config.hsts || config.strictTransportSecurity) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Content-Type-Options
    if (config.xContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (config.xFrameOptions) {
      response.headers.set('X-Frame-Options', 'DENY');
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    if (config.xXssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (config.referrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Permissions-Policy (formerly Feature-Policy)
    if (config.permissionsPolicy) {
      response.headers.set(
        'Permissions-Policy',
        this.buildPermissionsPolicy()
      );
    }

    // Cross-Origin-Embedder-Policy
    if (config.crossOriginEmbedderPolicy) {
      response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    // Cross-Origin-Opener-Policy
    if (config.crossOriginOpenerPolicy) {
      response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    }

    // Cross-Origin-Resource-Policy
    if (config.crossOriginResourcePolicy) {
      response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove potentially dangerous headers
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');

    // Add custom security headers for the application
    response.headers.set('X-Application', 'AstralCore-MentalHealth');
    response.headers.set('X-Security-Version', '1.0');

    return response;
  }

  /**
   * Build Content Security Policy header
   */
  private buildCSP(nonce?: string): string {
    const directives = { ...CSP_DIRECTIVES };
    
    // Add nonce to script-src and style-src if provided
    if (nonce) {
      directives['script-src'] = [
        ...directives['script-src'].filter(s => s !== "'unsafe-inline'"),
        `'nonce-${nonce}'`,
      ];
      directives['style-src'] = [
        ...directives['style-src'].filter(s => s !== "'unsafe-inline'"),
        `'nonce-${nonce}'`,
      ];
    }

    // Add report-uri if configured
    if (this.config.reportUri) {
      directives['report-uri'] = [this.config.reportUri];
      directives['report-to'] = ['csp-endpoint'];
    }

    // Build CSP string
    return Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key; // Directives without values
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Build Permissions Policy header
   */
  private buildPermissionsPolicy(): string {
    const policies = {
      accelerometer: '()',
      autoplay: '(self)',
      camera: '()',
      'cross-origin-isolated': '()',
      'display-capture': '()',
      'document-domain': '()',
      'encrypted-media': '(self)',
      fullscreen: '(self)',
      geolocation: '()',
      gyroscope: '()',
      keyboard: '(self)',
      magnetometer: '()',
      microphone: '()',
      midi: '()',
      'navigation-override': '()',
      payment: '()',
      'picture-in-picture': '()',
      'publickey-credentials-get': '()',
      'screen-wake-lock': '()',
      'sync-xhr': '()',
      usb: '()',
      'web-share': '()',
      'xr-spatial-tracking': '()',
    };

    return Object.entries(policies)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  }

  /**
   * Generate CSP nonce
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }

  /**
   * Get security headers for specific routes
   */
  getRouteSpecificHeaders(pathname: string): Partial<SecurityHeadersConfig> {
    // API routes don't need CSP
    if (pathname.startsWith('/api/')) {
      return {
        csp: false,
        xFrameOptions: true, // Still prevent framing
      };
    }

    // Admin routes need stricter CSP
    if (pathname.startsWith('/admin')) {
      return {
        csp: true,
        nonce: true, // Use nonce for admin pages
        xFrameOptions: true,
      };
    }

    // Allow embedding for specific routes (if needed)
    if (pathname.startsWith('/embed/')) {
      return {
        xFrameOptions: false,
        crossOriginEmbedderPolicy: false,
      };
    }

    return {};
  }

  /**
   * Validate request origin
   */
  validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (!origin) {
      // No origin header (same-origin request or non-browser)
      return true;
    }

    // Parse allowed origins from environment
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    // Always allow same origin
    if (host && origin.includes(host)) {
      return true;
    }

    // Check against allowed origins
    return allowedOrigins.includes(origin);
  }

  /**
   * Get CORS headers
   */
  getCORSHeaders(request: NextRequest): Record<string, string> {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = {};

    if (origin && this.validateOrigin(request)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-ID, X-Session-ID';
      headers['Access-Control-Max-Age'] = '86400'; // 24 hours
      headers['Access-Control-Expose-Headers'] = 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining';
    }

    return headers;
  }

  /**
   * Get report-to header configuration
   */
  getReportToHeader(): string {
    return JSON.stringify({
      group: 'csp-endpoint',
      max_age: 86400,
      endpoints: [
        {
          url: this.config.reportUri || '/api/security/csp-report',
        },
      ],
      include_subdomains: true,
    });
  }
}

// Export singleton instance
export const securityHeaders = SecurityHeaders.getInstance();

// Middleware function for easy integration
export function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request);
    
    // Apply security headers
    const routeConfig = securityHeaders.getRouteSpecificHeaders(request.nextUrl.pathname);
    securityHeaders.applyHeaders(request, response, routeConfig);
    
    // Add CORS headers if needed
    const corsHeaders = securityHeaders.getCORSHeaders(request);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}