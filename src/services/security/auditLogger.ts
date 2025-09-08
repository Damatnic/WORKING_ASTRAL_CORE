/**
 * Audit Logger Service
 * HIPAA-compliant audit logging system
 * Tracks all access to PHI (Protected Health Information)
 */

import { securityConfig } from '@/config/security.config';
import { cryptoService } from './cryptoService';

// HIPAA-required audit event types
export enum AuditEventType {
  // Data Access Events
  PHI_ACCESS = 'phi_access',
  PHI_CREATE = 'phi_create',
  PHI_UPDATE = 'phi_update',
  PHI_DELETE = 'phi_delete',
  PHI_EXPORT = 'phi_export',
  
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_TIMEOUT = 'session_timeout',
  PASSWORD_CHANGE = 'password_change',
  
  // Security Events
  SECURITY_BREACH = 'security_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ENCRYPTION_FAILURE = 'encryption_failure',
  
  // System Events
  SYSTEM_START = 'system_start',
  SYSTEM_SHUTDOWN = 'system_shutdown',
  CONFIGURATION_CHANGE = 'configuration_change',
  
  // Crisis Events
  CRISIS_INTERVENTION = 'crisis_intervention',
  EMERGENCY_ACCESS = 'emergency_access',
  
  // Clinical Events
  THERAPY_SESSION_START = 'therapy_session_start',
  THERAPY_SESSION_END = 'therapy_session_end',
  CLINICAL_NOTES_ACCESS = 'clinical_notes_access',
  TREATMENT = 'treatment'
}

// Audit severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  
  // User Information
  userId?: string;
  userRole?: string;
  sessionId?: string;
  therapistId?: string;
  
  // System Information
  ipAddress: string;
  userAgent: string;
  requestId?: string;
  
  // Event Details
  resourceId?: string;
  resourceType?: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  
  // HIPAA-specific fields
  patientId?: string;
  phiAccessed?: string[];
  
  // Additional context
  details?: Record<string, any>;
  errorMessage?: string;
  
  // Security fields
  encrypted: boolean;
  integrityHash: string;
  
  // Extended properties for TS2353 errors
  accessLevel?: string;
  administeringClinician?: string;
  anonymized?: boolean;
  assessmentCount?: number;
  assessmentId?: string;
  assessmentType?: string;
  assessorId?: string;
  capability?: string;
  category?: string;
  consentId?: string;
  consentType?: string;
  crisisAccess?: boolean;
  crisisId?: string;
  dataCategory?: string;
  dataType?: string;
  duration?: number;
  filters?: Record<string, any>;
  flagged?: boolean;
  grantId?: string;
  insightCount?: number;
  insightTypes?: string[];
  modality?: string;
  originalFields?: Record<string, any>;
  phiCategories?: string[];
  policyId?: string;
  purpose?: string;
  questionId?: string;
  reason?: string;
  recommendationCount?: number;
  recommendationTypes?: string[];
  reportId?: string;
  reportType?: string;
  resolverId?: string;
  retentionPeriod?: number;
  riskLevel?: string;
  runId?: string;
  safetyPlanId?: string;
  sessionType?: string;
  trigger?: string;
  currentDiagnoses?: string[];
  dimensions?: Record<string, any>;
  hipaaCompliant?: boolean;
  format?: string;
  totalScore?: number;
  consentMethod?: string;
  disposition?: string;
  filename?: string;
  requiresAttention?: boolean;
  effectiveness?: string;
}

interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  patientId?: string;
  outcome?: 'success' | 'failure' | 'partial';
  limit?: number;
  offset?: number;
}

class AuditLoggerService {
  private static instance: AuditLoggerService;
  private logBuffer: AuditLogEntry[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): AuditLoggerService {
    if (!AuditLoggerService.instance) {
      AuditLoggerService.instance = new AuditLoggerService();
    }
    return AuditLoggerService.instance;
  }

  /**
   * Log a HIPAA audit event
   */
  async logEvent(
    eventType: AuditEventType,
    action: string,
    context: Partial<AuditLogEntry> = {}
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        id: this.generateAuditId(),
        timestamp: new Date().toISOString(),
        eventType,
        severity: this.determineSeverity(eventType),
        action,
        outcome: context.outcome || 'success',
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown',
        encrypted: false,
        integrityHash: '',
        ...context
      };

      // Encrypt sensitive audit data
      if (this.containsSensitiveData(entry)) {
        entry.encrypted = true;
        entry.details = entry.details ? await this.encryptAuditData(entry.details) : undefined;
      }

      // Generate integrity hash
      entry.integrityHash = await this.generateIntegrityHash(entry);

      // Add to buffer
      this.logBuffer.push(entry);

      // Immediate flush for critical events
      if (entry.severity === AuditSeverity.CRITICAL) {
        await this.flushLogs();
      }

      // Flush if buffer is full
      if (this.logBuffer.length >= this.BUFFER_SIZE) {
        await this.flushLogs();
      }

      // Real-time alerts for security events
      if (this.isSecurityEvent(eventType)) {
        await this.sendRealTimeAlert(entry);
      }

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Critical: Audit logging failure must be handled
      await this.handleAuditFailure(eventType, action, error);
    }
  }

  /**
   * Log PHI access event (HIPAA requirement)
   */
  async logPHIAccess(
    patientId: string,
    phiFields: string[],
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logEvent(AuditEventType.PHI_ACCESS, 'access_phi', {
      ...context,
      patientId,
      phiAccessed: phiFields,
      resourceType: 'patient_record',
      severity: AuditSeverity.HIGH
    });
  }

  /**
   * Log authentication event
   */
  async logAuthentication(
    eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE,
    userId: string,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logEvent(eventType, 'authenticate', {
      ...context,
      userId,
      severity: eventType === AuditEventType.LOGIN_FAILURE ? AuditSeverity.MEDIUM : AuditSeverity.LOW
    });
  }

  /**
   * Log security incident
   */
  async logSecurityIncident(
    action: string,
    details: Record<string, any>,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logEvent(AuditEventType.SECURITY_BREACH, action, {
      ...context,
      details,
      severity: AuditSeverity.CRITICAL,
      outcome: 'failure'
    });
  }

  /**
   * Log crisis intervention event
   */
  async logCrisisIntervention(
    userId: string,
    interventionType: string,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logEvent(AuditEventType.CRISIS_INTERVENTION, interventionType, {
      ...context,
      userId,
      severity: AuditSeverity.CRITICAL,
      resourceType: 'crisis_intervention'
    });
  }

  /**
   * Query audit logs with HIPAA compliance
   */
  async queryLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    // In production, this would query the secure audit database
    // For now, return from buffer (implement database integration)
    
    let results = [...this.logBuffer];

    // Apply filters
    if (query.eventType) {
      results = results.filter(entry => entry.eventType === query.eventType);
    }

    if (query.userId) {
      results = results.filter(entry => entry.userId === query.userId);
    }

    if (query.severity) {
      results = results.filter(entry => entry.severity === query.severity);
    }

    if (query.startDate) {
      results = results.filter(entry => 
        new Date(entry.timestamp) >= query.startDate!
      );
    }

    if (query.endDate) {
      results = results.filter(entry => 
        new Date(entry.timestamp) <= query.endDate!
      );
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Generate audit report for HIPAA compliance
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    securityIncidents: number;
    phiAccessEvents: number;
    failedLogins: number;
    summary: string;
  }> {
    const logs = await this.queryLogs({ startDate, endDate });

    const eventsByType = logs.reduce((acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1;
      return acc;
    }, {} as Record<AuditEventType, number>);

    const securityIncidents = logs.filter(log => 
      this.isSecurityEvent(log.eventType)
    ).length;

    const phiAccessEvents = logs.filter(log => 
      log.eventType === AuditEventType.PHI_ACCESS
    ).length;

    const failedLogins = logs.filter(log => 
      log.eventType === AuditEventType.LOGIN_FAILURE
    ).length;

    return {
      totalEvents: logs.length,
      eventsByType,
      securityIncidents,
      phiAccessEvents,
      failedLogins,
      summary: `Audit report for ${startDate.toISOString()} to ${endDate.toISOString()}: ${logs.length} total events, ${securityIncidents} security incidents, ${phiAccessEvents} PHI access events`
    };
  }

  /**
   * Flush logs to persistent storage
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // In production, send to secure audit database
      await this.persistLogs(logsToFlush);

      console.log(`Flushed ${logsToFlush.length} audit logs`);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Critical: Failed audit log persistence
    }
  }

  /**
   * Persist logs to secure storage
   */
  private async persistLogs(logs: AuditLogEntry[]): Promise<void> {
    // In production, implement secure database storage
    // For development, log to console
    if (securityConfig.environment === 'development') {
      logs.forEach(log => {
        console.log('[AUDIT LOG]', JSON.stringify(log, null, 2));
      });
    } else {
      // TODO: Implement production audit database
      // - Encrypted storage
      // - Tamper-proof logging
      // - Retention policies
      console.log(`[AUDIT] Persisting ${logs.length} audit entries`);
    }
  }

  /**
   * Determine audit severity based on event type
   */
  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    const criticalEvents = [
      AuditEventType.SECURITY_BREACH,
      AuditEventType.CRISIS_INTERVENTION,
      AuditEventType.ENCRYPTION_FAILURE,
      AuditEventType.EMERGENCY_ACCESS
    ];

    const highEvents = [
      AuditEventType.PHI_ACCESS,
      AuditEventType.PHI_DELETE,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.CLINICAL_NOTES_ACCESS
    ];

    const mediumEvents = [
      AuditEventType.LOGIN_FAILURE,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.PHI_UPDATE,
      AuditEventType.CONFIGURATION_CHANGE
    ];

    if (criticalEvents.includes(eventType)) return AuditSeverity.CRITICAL;
    if (highEvents.includes(eventType)) return AuditSeverity.HIGH;
    if (mediumEvents.includes(eventType)) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  /**
   * Check if event contains sensitive data
   */
  private containsSensitiveData(entry: AuditLogEntry): boolean {
    return !!(entry.patientId || entry.phiAccessed || entry.details?.sensitiveData);
  }

  /**
   * Encrypt sensitive audit data
   */
  private async encryptAuditData(data: Record<string, any>): Promise<Record<string, any>> {
    const encrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 0) {
        encrypted[key] = await cryptoService.encryptField(value, `audit_${key}`);
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }

  /**
   * Generate integrity hash for tamper detection
   */
  private async generateIntegrityHash(entry: Omit<AuditLogEntry, 'integrityHash'>): Promise<string> {
    const dataToHash = JSON.stringify(entry);
    return await cryptoService.hash(dataToHash);
  }

  /**
   * Check if event type is a security event
   */
  private isSecurityEvent(eventType: AuditEventType): boolean {
    const securityEvents = [
      AuditEventType.SECURITY_BREACH,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.LOGIN_FAILURE,
      AuditEventType.ENCRYPTION_FAILURE
    ];
    
    return securityEvents.includes(eventType);
  }

  /**
   * Send real-time security alerts
   */
  private async sendRealTimeAlert(entry: AuditLogEntry): Promise<void> {
    if (!securityConfig.monitoring.realTimeAlerts) return;

    // In production, integrate with alerting system (PagerDuty, Slack, etc.)
    console.warn('[SECURITY ALERT]', {
      type: entry.eventType,
      severity: entry.severity,
      message: `Security event detected: ${entry.action}`,
      timestamp: entry.timestamp,
      userId: entry.userId,
      ipAddress: entry.ipAddress
    });
  }

  /**
   * Handle audit logging failures
   */
  private async handleAuditFailure(
    eventType: AuditEventType, 
    action: string, 
    error: any
  ): Promise<void> {
    // Critical: If we can't log audits, we must alert and potentially shut down
    console.error('[CRITICAL] Audit logging failure:', {
      eventType,
      action,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // In production, this might trigger:
    // - Immediate alerts to security team
    // - Fallback logging to secondary system
    // - System shutdown if audit requirements are critical
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Start periodic log flushing
   */
  private startPeriodicFlush(): void {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogs();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Verify audit log integrity
   */
  async verifyLogIntegrity(entry: AuditLogEntry): Promise<boolean> {
    try {
      const { integrityHash, ...entryWithoutHash } = entry;
      const calculatedHash = await this.generateIntegrityHash(entryWithoutHash);
      return cryptoService.secureCompare(integrityHash, calculatedHash);
    } catch (error) {
      console.error('Log integrity verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLoggerService.getInstance();

// Convenience functions
export const logPHIAccess = (patientId: string, fields: string[], context: Partial<AuditLogEntry>) => 
  auditLogger.logPHIAccess(patientId, fields, context);

export const logLogin = (success: boolean, userId: string, context: Partial<AuditLogEntry>) =>
  auditLogger.logAuthentication(
    success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
    userId,
    context
  );

export const logSecurityIncident = (action: string, details: Record<string, any>, context: Partial<AuditLogEntry>) =>
  auditLogger.logSecurityIncident(action, details, context);

export const logCrisisIntervention = (userId: string, type: string, context: Partial<AuditLogEntry>) =>
  auditLogger.logCrisisIntervention(userId, type, context);