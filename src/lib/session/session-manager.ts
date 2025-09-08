import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { encryptField, decryptField } from '@/lib/encryption/field-encryption';
import { PHIFieldType } from '@/lib/encryption/types';
import * as crypto from 'crypto';
import { z } from 'zod';

// Session configuration constants - HIPAA compliant
export const SESSION_CONFIG = {
  // Session timeouts (in milliseconds)
  IDLE_TIMEOUT: 15 * 60 * 1000, // 15 minutes for clinical users
  ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours maximum session
  WARNING_BEFORE_TIMEOUT: 2 * 60 * 1000, // 2 minutes warning
  
  // Session limits
  MAX_CONCURRENT_SESSIONS: {
    USER: 3,
    THERAPIST: 2,
    CRISIS_COUNSELOR: 2,
    ADMIN: 1,
    SUPER_ADMIN: 1,
    HELPER: 3,
    COMPLIANCE_OFFICER: 1,
  },
  
  // Session security
  SESSION_TOKEN_LENGTH: 32, // 256 bits
  REFRESH_TOKEN_LENGTH: 32,
  SESSION_SECRET_ROTATION_DAYS: 90,
  
  // Activity tracking
  ACTIVITY_CHECK_INTERVAL: 60 * 1000, // Check every minute
  SUSPICIOUS_ACTIVITY_THRESHOLD: 100, // Requests per minute
} as const;

// Session status enum
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  LOCKED = 'LOCKED',
}

// Session schema
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sessionToken: z.string(),
  refreshToken: z.string().optional(),
  status: z.nativeEnum(SessionStatus),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  lastActivity: z.date(),
  expiresAt: z.date(),
  idleExpiresAt: z.date(),
  metadata: z.record(z.any()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// Session activity schema
export const SessionActivitySchema = z.object({
  sessionId: z.string().uuid(),
  activityType: z.enum(['PAGE_VIEW', 'API_CALL', 'DATA_ACCESS', 'PHI_ACCESS']),
  resource: z.string().optional(),
  timestamp: z.date(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type SessionActivity = z.infer<typeof SessionActivitySchema>;

export class SessionManager {
  private static instance: SessionManager;
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
    this.startActivityMonitoring();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session for a user
   */
  async createSession(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    mfaVerified?: boolean;
  }): Promise<Session> {
    const { userId, userEmail, userRole, ipAddress, userAgent, deviceFingerprint, mfaVerified } = params;

    try {
      // Check concurrent session limit
      const activeSessions = await this.getActiveSessionsForUser(userId);
      const maxSessions = SESSION_CONFIG.MAX_CONCURRENT_SESSIONS[userRole as keyof typeof SESSION_CONFIG.MAX_CONCURRENT_SESSIONS] || 3;
      
      if (activeSessions.length >= maxSessions) {
        // Terminate oldest session
        const oldestSession = activeSessions.sort((a, b) => 
          new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
        )[0];
        
        await this.terminateSession({
          sessionId: oldestSession.id,
          reason: 'CONCURRENT_SESSION_LIMIT',
          terminatedBy: 'SYSTEM',
        });
      }

      // Generate secure tokens
      const sessionToken = crypto.randomBytes(SESSION_CONFIG.SESSION_TOKEN_LENGTH).toString('hex');
      const refreshToken = crypto.randomBytes(SESSION_CONFIG.REFRESH_TOKEN_LENGTH).toString('hex');
      
      // Calculate expiration times
      const now = new Date();
      const idleExpiresAt = new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT);
      const absoluteExpiresAt = new Date(now.getTime() + SESSION_CONFIG.ABSOLUTE_TIMEOUT);
      const expiresAt = idleExpiresAt < absoluteExpiresAt ? idleExpiresAt : absoluteExpiresAt;

      // Encrypt sensitive session data
      const encryptedToken = encryptField(sessionToken, PHIFieldType.ACCESS_TOKEN, userId);
      const encryptedRefreshToken = encryptField(refreshToken, PHIFieldType.ACCESS_TOKEN, userId);

      // Create session record
      const session = await prisma.session.create({
        data: {
          userId,
          sessionToken: (encryptedToken as any)?.encryptedData || sessionToken,
          sessionTokenIV: (encryptedToken as any)?.iv,
          sessionTokenAuthTag: (encryptedToken as any)?.authTag,
          refreshToken: (encryptedRefreshToken as any)?.encryptedData || refreshToken,
          refreshTokenIV: (encryptedRefreshToken as any)?.iv,
          refreshTokenAuthTag: (encryptedRefreshToken as any)?.authTag,
          status: SessionStatus.ACTIVE,
          ipAddress,
          userAgent,
          deviceFingerprint: deviceFingerprint ? crypto.createHash('sha256').update(deviceFingerprint).digest('hex') : undefined,
          lastActivity: now,
          expiresAt,
          idleExpiresAt,
          absoluteExpiresAt,
          mfaVerified: mfaVerified || false,
          metadata: {
            createdAt: now.toISOString(),
            userRole,
          },
        },
      });

      // Log session creation
      await auditService.logEvent({
        category: AuditEventCategory.LOGIN_SUCCESS,
        action: 'SESSION_CREATED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.LOW,
        description: 'New session created for user',
        userId,
        userEmail,
        userRole,
        sourceIp: ipAddress,
        userAgent,
        sessionId: session.id,
        metadata: {
          mfaVerified,
          deviceFingerprint: !!deviceFingerprint,
        },
      });

      return {
        id: session.id,
        userId: session.userId,
        sessionToken,
        refreshToken,
        status: session.status as SessionStatus,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        deviceFingerprint: session.deviceFingerprint || undefined,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        idleExpiresAt: session.idleExpiresAt,
        metadata: session.metadata as Record<string, any>,
      };
    } catch (error) {
      // Log session creation failure
      await auditService.logEvent({
        category: AuditEventCategory.LOGIN_FAILURE,
        action: 'SESSION_CREATION_FAILED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Failed to create session',
        userId,
        userEmail,
        userRole,
        sourceIp: ipAddress,
        userAgent,
        errorDetails: {
          errorCode: 'SESSION_CREATION_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionToken: string, ipAddress?: string): Promise<Session | null> {
    try {
      // Find session by token (need to search encrypted tokens)
      const sessions = await prisma.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      let validSession = null;
      for (const session of sessions) {
        // Decrypt and compare tokens
        const decryptedToken = session.sessionTokenIV && session.sessionTokenAuthTag
          ? decryptField({
              
              iv: session.sessionTokenIV,
              authTag: session.sessionTokenAuthTag,
            }, PHIFieldType.ACCESS_TOKEN)
          : session.sessionToken;

        if (decryptedToken === sessionToken) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      if (validSession.expiresAt < now || validSession.idleExpiresAt < now) {
        await this.terminateSession({
          sessionId: validSession.id,
          reason: 'EXPIRED',
          terminatedBy: 'SYSTEM',
        });
        return null;
      }

      // Check for suspicious IP change
      if (ipAddress && validSession.ipAddress && validSession.ipAddress !== ipAddress) {
        await auditService.logEvent({
          category: AuditEventCategory.SUSPICIOUS_ACTIVITY,
          action: 'SESSION_IP_CHANGE',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.MEDIUM,
          description: 'Session accessed from different IP address',
          userId: validSession.userId,
          sessionId: validSession.id,
          sourceIp: ipAddress,
          metadata: {
            originalIp: validSession.ipAddress,
            newIp: ipAddress,
          },
        });
      }

      // Update last activity and extend idle timeout
      const newIdleExpiresAt = new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT);
      const newExpiresAt = newIdleExpiresAt < validSession.absoluteExpiresAt 
        ? newIdleExpiresAt 
        : validSession.absoluteExpiresAt;

      await prisma.session.update({
        where: { id: validSession.id },
        data: {
          lastActivity: now,
          idleExpiresAt: newIdleExpiresAt,
          expiresAt: newExpiresAt,
        },
      });

      // Get user information for the session
      const user = await prisma.user.findUnique({
        where: { id: validSession.userId },
        select: { id: true, email: true, role: true },
      });

      return {
        id: validSession.id,
        userId: validSession.userId,
        sessionToken,
        status: validSession.status as SessionStatus,
        ipAddress: validSession.ipAddress || undefined,
        userAgent: validSession.userAgent || undefined,
        deviceFingerprint: validSession.deviceFingerprint || undefined,
        lastActivity: now,
        expiresAt: newExpiresAt,
        idleExpiresAt: newIdleExpiresAt,
        metadata: {
          ...validSession.metadata as Record<string, any>,
          userRole: user?.role,
        },
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(params: {
    sessionId: string;
    reason: 'LOGOUT' | 'EXPIRED' | 'TERMINATED' | 'CONCURRENT_SESSION_LIMIT' | 'SECURITY';
    terminatedBy: string;
    userId?: string;
    userEmail?: string;
  }): Promise<void> {
    const { sessionId, reason, terminatedBy, userId, userEmail } = params;

    try {
      // Get session details before termination
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session) {
        return;
      }

      // Update session status
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.TERMINATED,
          terminatedAt: new Date(),
          terminationReason: reason,
        },
      });

      // Log session termination
      await auditService.logEvent({
        category: reason === 'LOGOUT' ? AuditEventCategory.LOGOUT : AuditEventCategory.SESSION_TERMINATED,
        action: 'SESSION_TERMINATED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: reason === 'SECURITY' ? RiskLevel.HIGH : RiskLevel.LOW,
        description: `Session terminated: ${reason}`,
        userId: userId || session.userId,
        userEmail: userEmail || session.user.email,
        userRole: session.user.role,
        sessionId,
        metadata: {
          reason,
          terminatedBy,
          sessionDuration: new Date().getTime() - session.createdAt.getTime(),
        },
      });
    } catch (error) {
      console.error('Session termination error:', error);
      throw error;
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(params: {
    userId: string;
    reason: string;
    excludeSessionId?: string;
  }): Promise<void> {
    const { userId, reason, excludeSessionId } = params;

    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
          ...(excludeSessionId && { id: { not: excludeSessionId } }),
        },
      });

      for (const session of sessions) {
        await this.terminateSession({
          sessionId: session.id,
          reason: 'TERMINATED',
          terminatedBy: 'SYSTEM',
          userId,
        });
      }

      // Log bulk session termination
      await auditService.logEvent({
        category: AuditEventCategory.SESSION_TERMINATED,
        action: 'ALL_SESSIONS_TERMINATED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: `All sessions terminated for user: ${reason}`,
        userId,
        metadata: {
          reason,
          sessionsTerminated: sessions.length,
          excludedSession: excludeSessionId,
        },
      });
    } catch (error) {
      console.error('Bulk session termination error:', error);
      throw error;
    }
  }

  /**
   * Track session activity
   */
  async trackActivity(params: {
    sessionId: string;
    activityType: 'PAGE_VIEW' | 'API_CALL' | 'DATA_ACCESS' | 'PHI_ACCESS';
    resource?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { sessionId, activityType, resource, ipAddress, metadata } = params;

    try {
      await prisma.sessionActivity.create({
        data: {
          sessionId,
          activityType,
          resource,
          ipAddress,
          timestamp: new Date(),
          metadata,
        },
      });

      // Update session last activity
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivity: new Date() },
      });

      // Check for suspicious activity patterns
      const recentActivities = await prisma.sessionActivity.count({
        where: {
          sessionId,
          timestamp: {
            gte: new Date(Date.now() - 60000), // Last minute
          },
        },
      });

      if (recentActivities > SESSION_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        await auditService.logEvent({
          category: AuditEventCategory.SUSPICIOUS_ACTIVITY,
          action: 'HIGH_ACTIVITY_RATE',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.HIGH,
          description: 'Unusually high activity rate detected',
          sessionId,
          sourceIp: ipAddress,
          metadata: {
            activityCount: recentActivities,
            threshold: SESSION_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD,
          },
        });
      }
    } catch (error) {
      console.error('Activity tracking error:', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessionsForUser(userId: string): Promise<Session[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      sessionToken: '', // Don't expose token
      status: session.status as SessionStatus,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      deviceFingerprint: session.deviceFingerprint || undefined,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      idleExpiresAt: session.idleExpiresAt,
      metadata: session.metadata as Record<string, any>,
    }));
  }

  /**
   * Check if session will expire soon
   */
  async checkSessionExpiry(sessionId: string): Promise<{
    willExpireSoon: boolean;
    timeRemaining: number;
    expiryType: 'IDLE' | 'ABSOLUTE' | null;
  }> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      return { willExpireSoon: false, timeRemaining: 0, expiryType: null };
    }

    const now = new Date();
    const idleTimeRemaining = session.idleExpiresAt.getTime() - now.getTime();
    const absoluteTimeRemaining = session.absoluteExpiresAt.getTime() - now.getTime();
    const timeRemaining = Math.min(idleTimeRemaining, absoluteTimeRemaining);

    const willExpireSoon = timeRemaining <= SESSION_CONFIG.WARNING_BEFORE_TIMEOUT;
    const expiryType = idleTimeRemaining < absoluteTimeRemaining ? 'IDLE' : 'ABSOLUTE';

    return { willExpireSoon, timeRemaining, expiryType };
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(refreshToken: string): Promise<Session | null> {
    try {
      // Find session by refresh token
      const sessions = await prisma.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
        },
      });

      let validSession = null;
      for (const session of sessions) {
        // Decrypt and compare refresh tokens
        if (session.refreshToken) {
          const decryptedToken = session.refreshTokenIV && session.refreshTokenAuthTag
            ? decryptField({
                
                iv: session.refreshTokenIV,
                authTag: session.refreshTokenAuthTag,
              }, PHIFieldType.ACCESS_TOKEN)
            : session.refreshToken;

          if (decryptedToken === refreshToken) {
            validSession = session;
            break;
          }
        }
      }

      if (!validSession) {
        return null;
      }

      // Generate new tokens
      const newSessionToken = crypto.randomBytes(SESSION_CONFIG.SESSION_TOKEN_LENGTH).toString('hex');
      const newRefreshToken = crypto.randomBytes(SESSION_CONFIG.REFRESH_TOKEN_LENGTH).toString('hex');

      // Encrypt new tokens
      const encryptedSessionToken = encryptField(newSessionToken, PHIFieldType.ACCESS_TOKEN, validSession.userId);
      const encryptedRefreshToken = encryptField(newRefreshToken, PHIFieldType.ACCESS_TOKEN, validSession.userId);

      // Update session with new tokens
      await prisma.session.update({
        where: { id: validSession.id },
        data: {
          sessionToken: (encryptedSessionToken as any)?.encryptedData || newSessionToken,
          sessionTokenIV: (encryptedSessionToken as any)?.iv,
          sessionTokenAuthTag: (encryptedSessionToken as any)?.authTag,
          refreshToken: (encryptedRefreshToken as any)?.encryptedData || newRefreshToken,
          refreshTokenIV: (encryptedRefreshToken as any)?.iv,
          refreshTokenAuthTag: (encryptedRefreshToken as any)?.authTag,
          lastActivity: new Date(),
        },
      });

      // Log token refresh
      await auditService.logEvent({
        category: AuditEventCategory.SESSION_ACTIVITY,
        action: 'SESSION_REFRESHED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.LOW,
        description: 'Session tokens refreshed',
        userId: validSession.userId,
        sessionId: validSession.id,
      });

      return {
        id: validSession.id,
        userId: validSession.userId,
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken,
        status: validSession.status as SessionStatus,
        ipAddress: validSession.ipAddress || undefined,
        userAgent: validSession.userAgent || undefined,
        deviceFingerprint: validSession.deviceFingerprint || undefined,
        lastActivity: new Date(),
        expiresAt: validSession.expiresAt,
        idleExpiresAt: validSession.idleExpiresAt,
        metadata: validSession.metadata as Record<string, any>,
      };
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  }

  /**
   * Start cleanup interval for expired sessions
   */
  private startCleanupInterval(): void {
    this.sessionCleanupInterval = setInterval(async () => {
      try {
        const expiredSessions = await prisma.session.findMany({
          where: {
            status: SessionStatus.ACTIVE,
            OR: [
              { expiresAt: { lt: new Date() } },
              { idleExpiresAt: { lt: new Date() } },
              { absoluteExpiresAt: { lt: new Date() } },
            ],
          },
        });

        for (const session of expiredSessions) {
          await this.terminateSession({
            sessionId: session.id,
            reason: 'EXPIRED',
            terminatedBy: 'SYSTEM',
          });
        }

        if (expiredSessions.length > 0) {
          console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 60000); // Run every minute
  }

  /**
   * Start activity monitoring
   */
  private startActivityMonitoring(): void {
    this.activityCheckInterval = setInterval(async () => {
      try {
        // Check for idle sessions
        const idleThreshold = new Date(Date.now() - SESSION_CONFIG.IDLE_TIMEOUT);
        const idleSessions = await prisma.session.findMany({
          where: {
            status: SessionStatus.ACTIVE,
            lastActivity: { lt: idleThreshold },
          },
        });

        for (const session of idleSessions) {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: SessionStatus.IDLE },
          });
        }
      } catch (error) {
        console.error('Activity monitoring error:', error);
      }
    }, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Cleanup intervals on shutdown
   */
  destroy(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();