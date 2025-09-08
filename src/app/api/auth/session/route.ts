import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionManager } from '@/lib/session/session-manager';
import {
  getSessionFromRequest,
  requireSession,
  clearSessionCookies
} from '@/lib/session/session-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';

/**
 * GET /api/auth/session
 * Get current session information
 */
export async function GET(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Get detailed session information
      const sessions = await sessionManager.getActiveSessionsForUser(context.userId);
      const currentSession = sessions.find(s => s.id === context.sessionId);

      if (!currentSession) {
        return NextResponse.json(
          createErrorResponse('Session not found'),
          { status: 404 }
        );
      }

      // Check session expiry
      const expiryCheck = await sessionManager.checkSessionExpiry(context.sessionId);

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isTwoFactorEnabled: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          createErrorResponse('User not found'),
          { status: 404 }
        );
      }

      const sessionInfo = {
        session: {
          id: currentSession.id,
          status: currentSession.status,
          lastActivity: currentSession.lastActivity,
          expiresAt: currentSession.expiresAt,
          idleExpiresAt: currentSession.idleExpiresAt,
          ipAddress: currentSession.ipAddress,
          userAgent: currentSession.userAgent,
          mfaVerified: context.mfaVerified,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          displayName: user.displayName,
          role: user.role,
          isActive: user.isActive,
          mfaRequired: user.isTwoFactorEnabled,
        },
        expiry: {
          willExpireSoon: expiryCheck.willExpireSoon,
          timeRemaining: expiryCheck.timeRemaining,
          expiryType: expiryCheck.expiryType,
        },
        activeSessions: sessions.length,
      };

      return NextResponse.json(
        createSuccessResponse(sessionInfo, 'Session information retrieved')
      );
    } catch (error) {
      console.error('Session retrieval error:', error);
      return NextResponse.json(
        createErrorResponse('Failed to retrieve session information'),
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/auth/session
 * Terminate current session (logout)
 */
export async function DELETE(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Terminate the session
      await sessionManager.terminateSession({
        sessionId: context.sessionId,
        reason: 'LOGOUT',
        terminatedBy: context.userId,
        userId: context.userId,
      });

      // Clear session cookies
      const response = NextResponse.json(
        createSuccessResponse(null, 'Session terminated successfully')
      );
      clearSessionCookies(response);

      return response;
    } catch (error) {
      console.error('Session termination error:', error);
      
      // Log the error
      await auditService.logEvent({
        category: AuditEventCategory.LOGOUT,
        action: 'LOGOUT_FAILED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.LOW,
        description: 'Failed to terminate session',
        userId: context.userId,
        sessionId: context.sessionId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        errorDetails: {
          errorCode: 'SESSION_TERMINATION_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return NextResponse.json(
        createErrorResponse('Failed to terminate session'),
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/auth/session
 * Extend session (refresh idle timeout)
 */
export async function PUT(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Validate session and extend timeout
      const session = await sessionManager.validateSession(
        context.sessionId,
        context.ipAddress
      );

      if (!session) {
        return NextResponse.json(
          createErrorResponse('Invalid session'),
          { status: 401 }
        );
      }

      // Track activity
      await sessionManager.trackActivity({
        sessionId: context.sessionId,
        activityType: 'API_CALL',
        resource: '/api/auth/session',
        ipAddress: context.ipAddress,
        metadata: {
          action: 'SESSION_EXTEND',
        },
      });

      // Check new expiry
      const expiryCheck = await sessionManager.checkSessionExpiry(context.sessionId);

      return NextResponse.json(
        createSuccessResponse({
          extended: true,
          expiresAt: session.expiresAt,
          idleExpiresAt: session.idleExpiresAt,
          willExpireSoon: expiryCheck.willExpireSoon,
          timeRemaining: expiryCheck.timeRemaining,
        }, 'Session extended successfully')
      );
    } catch (error) {
      console.error('Session extension error:', error);
      return NextResponse.json(
        createErrorResponse('Failed to extend session'),
        { status: 500 }
      );
    }
  });
}