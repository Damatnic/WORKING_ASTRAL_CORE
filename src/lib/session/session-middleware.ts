import { NextRequest, NextResponse } from 'next/server';
import { sessionManager, SessionStatus } from './session-manager';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { z } from 'zod';

// Session cookie configuration
export const SESSION_COOKIE = {
  name: 'astral-session',
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
  },
};

export const REFRESH_COOKIE = {
  name: 'astral-refresh',
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

// Session context type
export interface SessionContext {
  sessionId: string;
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified: boolean;
}

// Get session from request
export async function getSessionFromRequest(request: NextRequest): Promise<SessionContext | null> {
  try {
    // Get session token from cookie or header
    const cookieToken = request.cookies.get(SESSION_COOKIE.name)?.value;
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const sessionToken = cookieToken || headerToken;

    if (!sessionToken) {
      return null;
    }

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Validate session
    const session = await sessionManager.validateSession(sessionToken, ipAddress);
    if (!session) {
      return null;
    }

    // Track activity
    await sessionManager.trackActivity({
      sessionId: session.id,
      activityType: 'API_CALL',
      resource: request.nextUrl.pathname,
      ipAddress,
      metadata: {
        method: request.method,
        userAgent,
      },
    });

    return {
      sessionId: session.id,
      userId: session.userId,
      userRole: session.metadata?.userRole || 'USER',
      ipAddress,
      userAgent,
      mfaVerified: session.metadata?.mfaVerified || false,
    };
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

// Require valid session middleware
export async function requireSession(
  request: NextRequest,
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    await auditService.logEvent({
      category: AuditEventCategory.UNAUTHORIZED_ACCESS,
      action: 'SESSION_REQUIRED',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.MEDIUM,
      description: 'Unauthorized access attempt - no valid session',
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        path: request.nextUrl.pathname,
        method: request.method,
      },
    });

    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check session expiry warning
  const expiryCheck = await sessionManager.checkSessionExpiry(session.sessionId);
  
  // Pass session context to handler
  const response = await handler(request, session);

  // Add session expiry warning header if needed
  if (expiryCheck.willExpireSoon) {
    response.headers.set('X-Session-Expires-In', expiryCheck.timeRemaining.toString());
    response.headers.set('X-Session-Expiry-Type', expiryCheck.expiryType || 'UNKNOWN');
  }

  return response;
}

// Require specific role middleware
export async function requireRole(
  request: NextRequest,
  roles: string[],
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireSession(request, async (req, context) => {
    if (!roles.includes(context.userRole)) {
      await auditService.logEvent({
        category: AuditEventCategory.UNAUTHORIZED_ACCESS,
        action: 'INSUFFICIENT_ROLE',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: `Access denied - insufficient role permissions`,
        userId: context.userId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          requiredRoles: roles,
          userRole: context.userRole,
          path: request.nextUrl.pathname,
        },
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

// Require MFA verification middleware
export async function requireMFA(
  request: NextRequest,
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireSession(request, async (req, context) => {
    if (!context.mfaVerified) {
      await auditService.logEvent({
        category: AuditEventCategory.MFA_FAILURE,
        action: 'MFA_REQUIRED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Access denied - MFA verification required',
        userId: context.userId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          path: request.nextUrl.pathname,
        },
      });

      return NextResponse.json(
        { error: 'MFA verification required', requireMFA: true },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

// Clinical role middleware (requires MFA)
export async function requireClinicalRole(
  request: NextRequest,
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const clinicalRoles = ['THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'];
  
  return requireMFA(request, async (req, context) => {
    if (!clinicalRoles.includes(context.userRole)) {
      await auditService.logEvent({
        category: AuditEventCategory.UNAUTHORIZED_ACCESS,
        action: 'CLINICAL_ACCESS_DENIED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Access denied - clinical role required',
        userId: context.userId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          userRole: context.userRole,
          path: request.nextUrl.pathname,
        },
      });

      return NextResponse.json(
        { error: 'Clinical role required' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

// Set session cookie
export function setSessionCookie(response: NextResponse, sessionToken: string): void {
  response.cookies.set(
    SESSION_COOKIE.name,
    sessionToken,
    SESSION_COOKIE.options
  );
}

// Set refresh cookie
export function setRefreshCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(
    REFRESH_COOKIE.name,
    refreshToken,
    REFRESH_COOKIE.options
  );
}

// Clear session cookies
export function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE.name);
  response.cookies.delete(REFRESH_COOKIE.name);
}

// Session validation decorator for API routes
export function withSession(
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return requireSession(request, handler);
  };
}

// Role validation decorator for API routes
export function withRole(
  roles: string[],
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return requireRole(request, roles, handler);
  };
}

// MFA validation decorator for API routes
export function withMFA(
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return requireMFA(request, handler);
  };
}

// Clinical role validation decorator for API routes
export function withClinicalRole(
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return requireClinicalRole(request, handler);
  };
}