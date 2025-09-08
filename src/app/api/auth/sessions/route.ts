import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/session/session-manager';
import { requireSession, requireRole } from '@/lib/session/session-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Get all active sessions for the user
      const sessions = await sessionManager.getActiveSessionsForUser(context.userId);

      // Mark current session
      const sessionList = sessions.map(session => ({
        id: session.id,
        status: session.status,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        idleExpiresAt: session.idleExpiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceFingerprint: session.deviceFingerprint,
        isCurrent: session.id === context.sessionId,
        metadata: session.metadata,
      }));

      // Sort by last activity (most recent first)
      sessionList.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

      return NextResponse.json(
        createSuccessResponse({
          sessions: sessionList,
          totalActive: sessionList.length,
          currentSessionId: context.sessionId,
        }, 'Sessions retrieved successfully')
      );
    } catch (error) {
      console.error('Sessions retrieval error:', error);
      return NextResponse.json(
        createErrorResponse('Failed to retrieve sessions'),
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/auth/sessions
 * Terminate all sessions for the current user (logout from all devices)
 */
export async function DELETE(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Parse query parameters
      const url = new URL(request.url);
      const excludeCurrent = url.searchParams.get('excludeCurrent') === 'true';

      // Terminate all user sessions
      await sessionManager.terminateAllUserSessions({
        userId: context.userId,
        reason: 'USER_REQUESTED_LOGOUT_ALL',
        excludeSessionId: excludeCurrent ? context.sessionId : undefined,
      });

      // Log the action
      await auditService.logEvent({
        category: AuditEventCategory.LOGOUT,
        action: 'LOGOUT_ALL_SESSIONS',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: 'User terminated all sessions',
        userId: context.userId,
        sessionId: context.sessionId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          excludedCurrentSession: excludeCurrent,
        },
      });

      return NextResponse.json(
        createSuccessResponse(null, excludeCurrent 
          ? 'All other sessions terminated successfully' 
          : 'All sessions terminated successfully')
      );
    } catch (error) {
      console.error('Bulk session termination error:', error);
      return NextResponse.json(
        createErrorResponse('Failed to terminate sessions'),
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/auth/sessions/terminate
 * Terminate a specific session (admin or user terminating their own session)
 */
export async function POST(request: NextRequest) {
  return requireSession(request, async (req, context) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const terminateSchema = z.object({
        sessionId: z.string().uuid(),
        reason: z.string().optional(),
      });

      const validationResult = terminateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          createErrorResponse('Invalid request parameters', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }

      const { sessionId, reason } = validationResult.data;

      // Check if user is terminating their own session or is an admin
      const targetSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, status: true },
      });

      if (!targetSession) {
        return NextResponse.json(
          createErrorResponse('Session not found'),
          { status: 404 }
        );
      }

      // Check permissions
      const isOwnSession = targetSession.userId === context.userId;
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(context.userRole);

      if (!isOwnSession && !isAdmin) {
        await auditService.logEvent({
          category: AuditEventCategory.ACCESS_CONTROL_VIOLATION,
          action: 'SESSION_TERMINATION_DENIED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.HIGH,
          description: 'Unauthorized attempt to terminate another user session',
          userId: context.userId,
          sourceIp: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            targetSessionId: sessionId,
            targetUserId: targetSession.userId,
          },
        });

        return NextResponse.json(
          createErrorResponse('Insufficient permissions to terminate this session'),
          { status: 403 }
        );
      }

      // Terminate the session
      await sessionManager.terminateSession({
        sessionId,
        reason: (reason as "LOGOUT" | "EXPIRED" | "TERMINATED" | "CONCURRENT_SESSION_LIMIT" | "SECURITY") || 'TERMINATED',
        terminatedBy: context.userId,
      });

      // Log the action
      await auditService.logEvent({
        category: AuditEventCategory.SESSION_TIMEOUT,
        action: 'SESSION_TERMINATED_BY_USER',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: isAdmin && !isOwnSession ? RiskLevel.MEDIUM : RiskLevel.LOW,
        description: `Session terminated${isAdmin && !isOwnSession ? ' by admin' : ''}`,
        userId: context.userId,
        sessionId: context.sessionId,
        sourceIp: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          targetSessionId: sessionId,
          targetUserId: targetSession.userId,
          reason,
          terminatedByAdmin: isAdmin && !isOwnSession,
        },
      });

      return NextResponse.json(
        createSuccessResponse(null, 'Session terminated successfully')
      );
    } catch (error) {
      console.error('Session termination error:', error);
      return NextResponse.json(
        createErrorResponse('Failed to terminate session'),
        { status: 500 }
      );
    }
  });
}