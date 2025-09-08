import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';

// Types for audit logging
export interface AuditLogEntry {
  userId?: string | null;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  outcome?: 'success' | 'failure';
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp?: Date;
}

// Main audit logging function with object parameter
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details ? JSON.stringify(entry.details) : undefined,
        outcome: entry.outcome || 'success',
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        
      }
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Legacy function signature for backward compatibility
export async function auditLogLegacy(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any,
  outcome: 'success' | 'failure' = 'success',
  req?: NextRequest
): Promise<void> {
  await auditLog({
    userId,
    action,
    resource,
    resourceId,
    details,
    outcome,
    ipAddress: req ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '') : null,
    userAgent: req ? (req.headers.get('user-agent') || '') : null,
  });
}

// Helper function to extract client IP from request
export function getClientIp(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('cf-connecting-ip') ||
         null;
}

// Helper function to get user agent
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent') || null;
}

// Audit event types for different contexts
export const AuditActions = {
  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login.failed',
  PASSWORD_RESET: 'user.password_reset',
  
  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_DEACTIVATE: 'user.deactivate',
  USER_ACTIVATE: 'user.activate',
  
  // Admin actions
  ADMIN_ACCESS: 'admin.access',
  ADMIN_USER_LIST: 'admin.users.list',
  ADMIN_USER_VIEW: 'admin.users.view',
  ADMIN_USER_UPDATE: 'admin.users.update',
  ADMIN_USER_DELETE: 'admin.users.delete',
  ADMIN_SYSTEM_CONFIG: 'admin.system.config',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',
  ANALYTICS_DASHBOARD: 'analytics.dashboard',
  
  // Crisis
  CRISIS_REPORT_CREATE: 'crisis.report.create',
  CRISIS_REPORT_UPDATE: 'crisis.report.update',
  CRISIS_ALERT_TRIGGER: 'crisis.alert.trigger',
  CRISIS_INTERVENTION: 'crisis.intervention',
  
  // Therapy
  THERAPY_SESSION_CREATE: 'therapy.session.create',
  THERAPY_SESSION_UPDATE: 'therapy.session.update',
  THERAPY_SESSION_COMPLETE: 'therapy.session.complete',
  THERAPY_NOTE_CREATE: 'therapy.note.create',
  THERAPY_NOTE_VIEW: 'therapy.note.view',
  
  // Data access
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_DELETE: 'data.delete',
  
  // Security
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  PERMISSION_DENIED: 'security.permission_denied',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  
  // System
  SYSTEM_ERROR: 'system.error',
  SYSTEM_MAINTENANCE: 'system.maintenance',
} as const;

// Resource types for audit logs
export const AuditResources = {
  USER: 'user',
  ADMIN: 'admin',
  ANALYTICS: 'analytics',
  CRISIS: 'crisis',
  THERAPY: 'therapy',
  JOURNAL: 'journal',
  WELLNESS: 'wellness',
  COMMUNITY: 'community',
  SYSTEM: 'system',
} as const;

// Convenience function for creating audit logs with proper typing
export async function createAuditLog({
  userId,
  userEmail,
  userRole,
  action,
  resource,
  resourceId,
  details,
  outcome = 'success',
  req,
}: {
  userId?: string | null;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  outcome?: 'success' | 'failure';
  req?: NextRequest;
}): Promise<void> {
  await auditLog({
    userId,
    userEmail,
    userRole,
    action,
    resource,
    resourceId,
    details,
    outcome,
    ipAddress: req ? getClientIp(req) : null,
    userAgent: req ? getUserAgent(req) : null,
  });
}

// Export default auditLog for convenience
export default auditLog;