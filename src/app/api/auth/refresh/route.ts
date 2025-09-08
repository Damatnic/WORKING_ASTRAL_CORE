import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/session/session-manager';
import { 
  REFRESH_COOKIE, 
  SESSION_COOKIE,
  setSessionCookie,
  setRefreshCookie,
  clearSessionCookies
} from '@/lib/session/session-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';

/**
 * POST /api/auth/refresh
 * Refresh session using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieToken = request.cookies.get(REFRESH_COOKIE.name)?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = cookieToken || body.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        createErrorResponse('Refresh token required'),
        { status: 401 }
      );
    }

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Refresh the session
    const newSession = await sessionManager.refreshSession(refreshToken);

    if (!newSession) {
      // Log failed refresh attempt
      await auditService.logEvent({
        category: AuditEventCategory.SESSION_ACTIVITY,
        action: 'SESSION_REFRESH_FAILED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.MEDIUM,
        description: 'Invalid refresh token',
        sourceIp: ipAddress,
        userAgent,
        metadata: {
          hasRefreshToken: !!refreshToken,
        },
      });

      // Clear invalid cookies
      const response = NextResponse.json(
        createErrorResponse('Invalid refresh token'),
        { status: 401 }
      );
      clearSessionCookies(response);
      return response;
    }

    // Log successful refresh
    await auditService.logEvent({
      category: AuditEventCategory.SESSION_ACTIVITY,
      action: 'SESSION_REFRESHED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.LOW,
      description: 'Session tokens refreshed successfully',
      userId: newSession.userId,
      sessionId: newSession.id,
      sourceIp: ipAddress,
      userAgent,
    });

    // Create response with new tokens
    const response = NextResponse.json(
      createSuccessResponse({
        sessionToken: newSession.sessionToken,
        refreshToken: newSession.refreshToken,
        expiresAt: newSession.expiresAt,
        idleExpiresAt: newSession.idleExpiresAt,
      }, 'Session refreshed successfully')
    );

    // Set new cookies
    setSessionCookie(response, newSession.sessionToken);
    if (newSession.refreshToken) {
      setRefreshCookie(response, newSession.refreshToken);
    }

    return response;
  } catch (error) {
    console.error('Session refresh error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.SESSION_ACTIVITY,
      action: 'SESSION_REFRESH_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'Session refresh system error',
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      errorDetails: {
        errorCode: 'SESSION_REFRESH_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to refresh session'),
      { status: 500 }
    );
  }
}