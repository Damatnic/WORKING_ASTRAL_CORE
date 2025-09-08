/**
 * HIPAA Compliance Audit Trail System
 * Comprehensive logging and tracking for PHI access and modifications
 * Meets HIPAA audit requirements: who, what, when, where, why
 */

import { prisma } from '@/lib/prisma';
import { encryptionService } from './encryption';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Audit event types for HIPAA compliance
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_CHALLENGE_SUCCESS = 'MFA_CHALLENGE_SUCCESS',
  MFA_CHALLENGE_FAILURE = 'MFA_CHALLENGE_FAILURE',

  // PHI access events
  PHI_VIEW = 'PHI_VIEW',
  PHI_CREATE = 'PHI_CREATE',
  PHI_UPDATE = 'PHI_UPDATE',
  PHI_DELETE = 'PHI_DELETE',
  PHI_EXPORT = 'PHI_EXPORT',
  PHI_PRINT = 'PHI_PRINT',
  PHI_SHARE = 'PHI_SHARE',

  // Clinical events
  THERAPY_SESSION_VIEW = 'THERAPY_SESSION_VIEW',
  THERAPY_SESSION_CREATE = 'THERAPY_SESSION_CREATE',
  THERAPY_SESSION_UPDATE = 'THERAPY_SESSION_UPDATE',
  CRISIS_REPORT_VIEW = 'CRISIS_REPORT_VIEW',
  CRISIS_REPORT_CREATE = 'CRISIS_REPORT_CREATE',
  ASSESSMENT_VIEW = 'ASSESSMENT_VIEW',
  ASSESSMENT_CREATE = 'ASSESSMENT_CREATE',
  TREATMENT_PLAN_VIEW = 'TREATMENT_PLAN_VIEW',
  TREATMENT_PLAN_UPDATE = 'TREATMENT_PLAN_UPDATE',

  // Administrative events
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REMOVE = 'ROLE_REMOVE',

  // Security events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  ENCRYPTION_KEY_ROTATION = 'ENCRYPTION_KEY_ROTATION',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',

  // Compliance events
  AUDIT_LOG_EXPORT = 'AUDIT_LOG_EXPORT',
  COMPLIANCE_REPORT_GENERATED = 'COMPLIANCE_REPORT_GENERATED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  DATA_RETENTION_APPLIED = 'DATA_RETENTION_APPLIED'
}

// Audit categories for filtering and reporting
export enum AuditCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  PHI_ACCESS = 'PHI_ACCESS',
  CLINICAL = 'CLINICAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE'
}

// Risk levels for security monitoring
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  eventType: AuditEventType;
  category: AuditCategory;
  userId?: string;
  userName?: string;
  userRole?: string;
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  details?: any;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskLevel?: RiskLevel;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface AuditContext {
  request?: NextRequest;
  session?: any;
  userId?: string;
  userRole?: string;
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * HIPAA Audit Trail Service
 * Provides comprehensive logging for all PHI access and system events
 */
export class AuditService {
  private static instance: AuditService;
  private batchQueue: AuditLogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    // Initialize batch processing
    this.startBatchProcessing();
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    action: string,
    context: AuditContext,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      eventType,
      category: this.categorizeEvent(eventType),
      userId: context.userId || context.session?.user?.id,
      userName: context.session?.user?.name || context.session?.user?.email,
      userRole: context.userRole || context.session?.user?.role,
      patientId: context.patientId,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      action,
      details: details ? this.sanitizeDetails(details) : undefined,
      ipAddress: this.extractIpAddress(context.request),
      userAgent: context.request?.headers.get('user-agent') || undefined,
      sessionId: context.session?.id,
      riskLevel: this.assessRiskLevel(eventType, success),
      success,
      metadata: {
        timestamp: new Date().toISOString(),
        serverVersion: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV
      }
    };

    // Add to batch queue
    this.batchQueue.push(entry);

    // Process immediately if batch size reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.processBatch();
    }

    // Alert on high-risk events
    if (entry.riskLevel === RiskLevel.CRITICAL) {
      await this.alertSecurityTeam(entry);
    }
  }

  /**
   * Log PHI access with before/after states
   */
  async logDataModification(
    eventType: AuditEventType,
    context: AuditContext,
    beforeState?: any,
    afterState?: any
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      eventType,
      category: AuditCategory.PHI_ACCESS,
      userId: context.userId || context.session?.user?.id,
      userName: context.session?.user?.name || context.session?.user?.email,
      userRole: context.userRole || context.session?.user?.role,
      patientId: context.patientId,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      action: `${eventType} on ${context.resourceType}`,
      beforeState: beforeState ? this.encryptSensitiveData(beforeState) : undefined,
      afterState: afterState ? this.encryptSensitiveData(afterState) : undefined,
      ipAddress: this.extractIpAddress(context.request),
      userAgent: context.request?.headers.get('user-agent') || undefined,
      sessionId: context.session?.id,
      riskLevel: this.assessRiskLevel(eventType, true),
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        changesSummary: this.summarizeChanges(beforeState, afterState)
      }
    };

    this.batchQueue.push(entry);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.processBatch();
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    details: any,
    context: AuditContext,
    riskLevel: RiskLevel = RiskLevel.HIGH
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      eventType,
      category: AuditCategory.SECURITY,
      userId: context.userId,
      action: eventType,
      details: this.sanitizeDetails(details),
      ipAddress: this.extractIpAddress(context.request),
      userAgent: context.request?.headers.get('user-agent') || undefined,
      riskLevel,
      success: false,
      metadata: {
        alertSent: riskLevel === RiskLevel.CRITICAL,
        timestamp: new Date().toISOString()
      }
    };

    // Security events are processed immediately
    await this.persistEntry(entry);

    // Alert security team for high-risk events
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      await this.alertSecurityTeam(entry);
    }
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getAuditLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    patientId?: string;
    eventType?: AuditEventType;
    category?: AuditCategory;
    riskLevel?: RiskLevel;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    if (filters.userId) where.userId = filters.userId;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.category) where.category = filters.category;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;

    const logs = await prisma.auditLog.findMany({
      where,
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { timestamp: 'desc' }
    });

    // Decrypt sensitive data for authorized viewers
    return logs.map(log => this.decryptLogEntry(log));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    includeDetails: boolean = false
  ): Promise<any> {
    const logs = await this.getAuditLogs({ startDate, endDate });

    const report = {
      period: { start: startDate, end: endDate },
      totalEvents: logs.length,
      eventsByCategory: this.groupByCategory(logs),
      eventsByRiskLevel: this.groupByRiskLevel(logs),
      topUsers: this.getTopUsers(logs),
      phiAccess: this.analyzePHIAccess(logs),
      securityEvents: this.analyzeSecurityEvents(logs),
      recommendations: this.generateRecommendations(logs),
      generatedAt: new Date(),
      details: includeDetails ? logs : undefined
    };

    // Log report generation
    await this.log(
      AuditEventType.COMPLIANCE_REPORT_GENERATED,
      'Generated compliance report',
      {},
      { period: { start: startDate, end: endDate } }
    );

    return report;
  }

  /**
   * Export audit logs for external review
   */
  async exportAuditLogs(
    format: 'JSON' | 'CSV' | 'PDF',
    filters: any
  ): Promise<Buffer> {
    const logs = await this.getAuditLogs(filters);

    // Log the export action
    await this.log(
      AuditEventType.AUDIT_LOG_EXPORT,
      `Exported ${logs.length} audit logs in ${format} format`,
      {},
      { format, recordCount: logs.length, filters }
    );

    switch (format) {
      case 'JSON':
        return Buffer.from(JSON.stringify(logs, null, 2));
      case 'CSV':
        return this.convertToCSV(logs);
      case 'PDF':
        return this.generatePDFReport(logs);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Process batch of audit entries
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Persist batch to database
      await prisma.auditLog.createMany({
        data: batch.map(entry => ({
          ...entry,
          details: entry.details ? JSON.stringify(entry.details) : undefined,
          beforeState: entry.beforeState ? JSON.stringify(entry.beforeState) : undefined,
          afterState: entry.afterState ? JSON.stringify(entry.afterState) : undefined,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined
        }))
      });
    } catch (error) {
      console.error('Failed to persist audit batch:', error);
      // Re-add failed entries to queue for retry
      this.batchQueue.unshift(...batch);
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(async () => {
      await this.processBatch();
    }, this.BATCH_INTERVAL);
  }

  /**
   * Persist single audit entry (for critical events)
   */
  private async persistEntry(entry: AuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        ...entry,
        details: entry.details ? JSON.stringify(entry.details) : undefined,
        
      }
    });
  }

  /**
   * Categorize event type
   */
  private categorizeEvent(eventType: AuditEventType): AuditCategory {
    if (eventType.startsWith('LOGIN') || eventType.startsWith('LOGOUT') || eventType.startsWith('MFA')) {
      return AuditCategory.AUTHENTICATION;
    }
    if (eventType.startsWith('PHI')) {
      return AuditCategory.PHI_ACCESS;
    }
    if (eventType.startsWith('THERAPY') || eventType.startsWith('CRISIS') || eventType.startsWith('ASSESSMENT') || eventType.startsWith('TREATMENT')) {
      return AuditCategory.CLINICAL;
    }
    if (eventType.startsWith('USER') || eventType.startsWith('PERMISSION') || eventType.startsWith('ROLE')) {
      return AuditCategory.ADMINISTRATIVE;
    }
    if (eventType.startsWith('UNAUTHORIZED') || eventType.startsWith('SUSPICIOUS') || eventType.startsWith('DATA_BREACH') || eventType.startsWith('ENCRYPTION')) {
      return AuditCategory.SECURITY;
    }
    return AuditCategory.COMPLIANCE;
  }

  /**
   * Assess risk level of event
   */
  private assessRiskLevel(eventType: AuditEventType, success: boolean): RiskLevel {
    if (!success) {
      if (eventType === AuditEventType.DATA_BREACH_ATTEMPT || eventType === AuditEventType.UNAUTHORIZED_ACCESS) {
        return RiskLevel.CRITICAL;
      }
      return RiskLevel.HIGH;
    }

    switch (eventType) {
      case AuditEventType.PHI_DELETE:
      case AuditEventType.USER_DELETE:
      case AuditEventType.PERMISSION_GRANT:
        return RiskLevel.HIGH;
      case AuditEventType.PHI_UPDATE:
      case AuditEventType.PHI_EXPORT:
      case AuditEventType.USER_UPDATE:
        return RiskLevel.MEDIUM;
      default:
        return RiskLevel.LOW;
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request?: NextRequest): string {
    if (!request) return 'unknown';

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    return 'unknown';
  }

  /**
   * Sanitize sensitive details
   */
  private sanitizeDetails(details: any): any {
    if (!details) return undefined;

    const sanitized = { ...details };
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'pin'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Encrypt sensitive data in audit logs
   */
  private encryptSensitiveData(data: any): string {
    const encrypted = encryptionService.encrypt(JSON.stringify(data));
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt log entry for authorized viewers
   */
  private decryptLogEntry(log: any): any {
    const decrypted = { ...log };

    if (log.beforeState) {
      try {
        const encryptedData = JSON.parse(log.beforeState);
        decrypted.beforeState = JSON.parse(encryptionService.decrypt(encryptedData));
      } catch {
        decrypted.beforeState = log.beforeState;
      }
    }

    if (log.afterState) {
      try {
        const encryptedData = JSON.parse(log.afterState);
        decrypted.afterState = JSON.parse(encryptionService.decrypt(encryptedData));
      } catch {
        decrypted.afterState = log.afterState;
      }
    }

    return decrypted;
  }

  /**
   * Summarize changes between states
   */
  private summarizeChanges(before: any, after: any): any {
    if (!before || !after) return undefined;

    const changes: any = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key]
        };
      }
    }

    return changes;
  }

  /**
   * Alert security team about critical events
   */
  private async alertSecurityTeam(entry: AuditLogEntry): Promise<void> {
    // In production, this would send alerts via email, SMS, or monitoring system
    console.error('SECURITY ALERT:', {
      eventType: entry.eventType,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      timestamp: entry.timestamp,
      details: entry.details
    });

    // Log the alert
    await (prisma as any).securityAlert.create({
      data: {
        eventType: entry.eventType,
        severity: entry.riskLevel || RiskLevel.HIGH,
        userId: entry.userId,
        details: JSON.stringify(entry),
        alertedAt: new Date()
      }
    });
  }

  /**
   * Analysis helper functions
   */
  private groupByCategory(logs: any[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByRiskLevel(logs: any[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.riskLevel || 'UNKNOWN'] = (acc[log.riskLevel || 'UNKNOWN'] || 0) + 1;
      return acc;
    }, {});
  }

  private getTopUsers(logs: any[]): any[] {
    const userCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    });

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));
  }

  private analyzePHIAccess(logs: any[]): any {
    const phiLogs = logs.filter(log => log.category === AuditCategory.PHI_ACCESS);
    return {
      total: phiLogs.length,
      views: phiLogs.filter(log => log.eventType === AuditEventType.PHI_VIEW).length,
      updates: phiLogs.filter(log => log.eventType === AuditEventType.PHI_UPDATE).length,
      deletes: phiLogs.filter(log => log.eventType === AuditEventType.PHI_DELETE).length,
      exports: phiLogs.filter(log => log.eventType === AuditEventType.PHI_EXPORT).length
    };
  }

  private analyzeSecurityEvents(logs: any[]): any {
    const securityLogs = logs.filter(log => log.category === AuditCategory.SECURITY);
    return {
      total: securityLogs.length,
      critical: securityLogs.filter(log => log.riskLevel === RiskLevel.CRITICAL).length,
      high: securityLogs.filter(log => log.riskLevel === RiskLevel.HIGH).length,
      unauthorizedAccess: securityLogs.filter(log => log.eventType === AuditEventType.UNAUTHORIZED_ACCESS).length,
      suspiciousActivity: securityLogs.filter(log => log.eventType === AuditEventType.SUSPICIOUS_ACTIVITY).length
    };
  }

  private generateRecommendations(logs: any[]): string[] {
    const recommendations: string[] = [];
    const securityEvents = this.analyzeSecurityEvents(logs);

    if (securityEvents.critical > 0) {
      recommendations.push('Critical security events detected. Immediate investigation required.');
    }

    if (securityEvents.unauthorizedAccess > 5) {
      recommendations.push('Multiple unauthorized access attempts. Review access controls and user permissions.');
    }

    const phiAccess = this.analyzePHIAccess(logs);
    if (phiAccess.exports > 50) {
      recommendations.push('High volume of PHI exports. Review data export policies and user training.');
    }

    return recommendations;
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: any[]): Buffer {
    const headers = ['Timestamp', 'Event Type', 'Category', 'User ID', 'Action', 'Success', 'Risk Level'];
    const rows = logs.map(log => [
      log.timestamp,
      log.eventType,
      log.category,
      log.userId || '',
      log.action,
      log.success,
      log.riskLevel || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return Buffer.from(csv);
  }

  /**
   * Generate PDF report (placeholder - would use a PDF library in production)
   */
  private generatePDFReport(logs: any[]): Buffer {
    // In production, use a library like jsPDF or puppeteer
    const report = {
      title: 'HIPAA Compliance Audit Report',
      generatedAt: new Date(),
      totalRecords: logs.length,
      logs: logs
    };

    return Buffer.from(JSON.stringify(report));
  }

  /**
   * Cleanup old audit logs (data retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 2555): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    });

    await this.log(
      AuditEventType.DATA_RETENTION_APPLIED,
      `Deleted ${result.count} audit logs older than ${retentionDays} days`,
      {},
      { deletedCount: result.count, cutoffDate }
    );
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();

// Export convenience functions
export const logAuditEvent = (
  eventType: AuditEventType,
  action: string,
  context: AuditContext,
  details?: any,
  success: boolean = true
) => auditService.log(eventType, action, context, details, success);

export const logPHIAccess = (
  eventType: AuditEventType,
  context: AuditContext,
  beforeState?: any,
  afterState?: any
) => auditService.logDataModification(eventType, context, beforeState, afterState);

export const logSecurityEvent = (
  eventType: AuditEventType,
  details: any,
  context: AuditContext,
  riskLevel?: RiskLevel
) => auditService.logSecurityEvent(eventType, details, context, riskLevel);