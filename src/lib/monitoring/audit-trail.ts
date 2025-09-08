/**
 * HIPAA-Compliant Audit Trail System
 * Comprehensive activity logging with encryption and compliance features
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { getMonitoringConfig, MonitoringConfig } from './config';

export type AuditEventType = 
  | 'user_login' | 'user_logout' | 'user_registration' | 'password_change'
  | 'data_access' | 'data_create' | 'data_update' | 'data_delete' | 'data_export'
  | 'admin_action' | 'security_event' | 'system_event' | 'api_access'
  | 'crisis_intervention' | 'therapy_session' | 'medical_record_access'
  | 'prescription_access' | 'billing_access' | 'insurance_access'
  | 'privacy_setting_change' | 'consent_given' | 'consent_revoked'
  | 'data_breach_detected' | 'unauthorized_access' | 'failed_login'
  | 'account_locked' | 'account_unlocked' | 'role_change'
  | 'backup_created' | 'backup_restored' | 'maintenance_start' | 'maintenance_end';

export type AuditLogLevel = 'info' | 'warning' | 'error' | 'critical';

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'phi';

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  logLevel: AuditLogLevel;
  
  // User information (encrypted for PHI)
  userId?: string;
  userRole?: string;
  sessionId?: string;
  
  // System information
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  
  // Event details
  resource?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  
  // Data classification and sensitivity
  dataClassification?: DataClassification;
  containsPHI?: boolean;
  patientId?: string; // Encrypted if present
  
  // Details and metadata
  description: string;
  details?: Record<string, any>;
  
  // HIPAA-specific fields
  reasonForAccess?: string;
  accessJustification?: string;
  dataElementsAccessed?: string[];
  
  // Security context
  authenticationMethod?: string;
  mfaUsed?: boolean;
  
  // Compliance tracking
  complianceRules?: string[];
  retentionCategory?: string;
  
  // Encryption metadata
  encrypted: boolean;
  encryptionKeyId?: string;
  
  // Hash for integrity verification
  integrity: string;
}

export interface AuditQuery {
  userId?: string;
  eventType?: AuditEventType;
  startTime?: number;
  endTime?: number;
  resourceId?: string;
  containsPHI?: boolean;
  logLevel?: AuditLogLevel;
  outcome?: 'success' | 'failure' | 'partial';
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsByLevel: Record<AuditLogLevel, number>;
  eventsByOutcome: Record<string, number>;
  phiAccessCount: number;
  securityEventsCount: number;
  failedLoginsCount: number;
  uniqueUsers: number;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: number;
  reportType: 'daily' | 'weekly' | 'monthly' | 'annual' | 'incident';
  period: {
    startTime: number;
    endTime: number;
  };
  summary: AuditStats;
  criticalEvents: AuditEvent[];
  phiAccessEvents: AuditEvent[];
  securityEvents: AuditEvent[];
  complianceViolations: {
    event: AuditEvent;
    violation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

class AuditTrailService extends EventEmitter {
  private config: MonitoringConfig;
  private events: Map<string, AuditEvent> = new Map();
  private encryptionKey: Buffer;
  private retentionTimers: Map<string, NodeJS.Timer> = new Map();
  private batchQueue: AuditEvent[] = [];
  private batchTimer: NodeJS.Timer | null = null;
  private maxBatchSize = 100;
  private batchTimeout = 5000; // 5 seconds

  constructor() {
    super();
    this.config = getMonitoringConfig();
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.startBatchProcessor();
    this.startRetentionCleanup();
  }

  /**
   * Log an audit event
   */
  public async logEvent(eventData: {
    eventType: AuditEventType;
    userId?: string;
    userRole?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    endpoint?: string;
    method?: string;
    resource?: string;
    resourceId?: string;
    resourceType?: string;
    action: string;
    outcome: 'success' | 'failure' | 'partial';
    dataClassification?: DataClassification;
    containsPHI?: boolean;
    patientId?: string;
    description: string;
    details?: Record<string, any>;
    reasonForAccess?: string;
    accessJustification?: string;
    dataElementsAccessed?: string[];
    authenticationMethod?: string;
    mfaUsed?: boolean;
    logLevel?: AuditLogLevel;
  }): Promise<AuditEvent> {
    // Filter sensitive data based on HIPAA compliance settings
    const filteredDetails = this.filterSensitiveData(eventData.details || {});
    
    // Determine if encryption is needed
    const needsEncryption = this.needsEncryption(eventData);
    
    // Create audit event
    const auditEvent: Omit<AuditEvent, 'id' | 'timestamp' | 'encrypted' | 'integrity'> = {
      eventType: eventData.eventType,
      logLevel: eventData.logLevel || this.getDefaultLogLevel(eventData.eventType),
      userId: needsEncryption ? this.encrypt(eventData.userId || '') : eventData.userId,
      userRole: eventData.userRole,
      sessionId: needsEncryption ? this.encrypt(eventData.sessionId || '') : eventData.sessionId,
      ipAddress: this.anonymizeIP(eventData.ipAddress),
      userAgent: this.sanitizeUserAgent(eventData.userAgent),
      requestId: eventData.requestId,
      endpoint: eventData.endpoint,
      method: eventData.method,
      resource: eventData.resource,
      resourceId: needsEncryption ? this.encrypt(eventData.resourceId || '') : eventData.resourceId,
      resourceType: eventData.resourceType,
      action: eventData.action,
      outcome: eventData.outcome,
      dataClassification: eventData.dataClassification || 'internal',
      containsPHI: eventData.containsPHI || false,
      patientId: eventData.patientId ? this.encrypt(eventData.patientId) : undefined,
      description: eventData.description,
      details: filteredDetails,
      reasonForAccess: eventData.reasonForAccess,
      accessJustification: eventData.accessJustification,
      dataElementsAccessed: eventData.dataElementsAccessed,
      authenticationMethod: eventData.authenticationMethod,
      mfaUsed: eventData.mfaUsed,
      complianceRules: this.getApplicableComplianceRules(eventData),
      retentionCategory: this.getRetentionCategory(eventData),
      encryptionKeyId: needsEncryption ? this.getEncryptionKeyId() : undefined,
    };

    // Generate ID and timestamp
    const eventId = this.generateEventId();
    const timestamp = Date.now();
    
    // Create final event with integrity hash
    const finalEvent: AuditEvent = {
      id: eventId,
      timestamp,
      encrypted: needsEncryption,
      ...auditEvent,
      integrity: this.generateIntegrityHash({
        id: eventId,
        timestamp,
        encrypted: needsEncryption,
        ...auditEvent,
      }),
    };

    // Add to batch queue or store immediately for critical events
    if (this.isCriticalEvent(finalEvent)) {
      await this.storeEvent(finalEvent);
      this.emit('audit:critical_event', finalEvent);
    } else {
      this.addToBatch(finalEvent);
    }

    // Emit event for real-time processing
    this.emit('audit:event', finalEvent);

    // Check for compliance violations
    await this.checkComplianceViolations(finalEvent);

    return finalEvent;
  }

  /**
   * Query audit events
   */
  public async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    const events = Array.from(this.events.values());
    
    return events.filter(event => {
      // Apply filters
      if (query.userId && event.userId !== query.userId) return false;
      if (query.eventType && event.eventType !== query.eventType) return false;
      if (query.startTime && event.timestamp < query.startTime) return false;
      if (query.endTime && event.timestamp > query.endTime) return false;
      if (query.resourceId && event.resourceId !== query.resourceId) return false;
      if (query.containsPHI !== undefined && event.containsPHI !== query.containsPHI) return false;
      if (query.logLevel && event.logLevel !== query.logLevel) return false;
      if (query.outcome && event.outcome !== query.outcome) return false;
      
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
    .slice(query.offset || 0, (query.offset || 0) + (query.limit || 100));
  }

  /**
   * Get audit statistics
   */
  public async getStats(timeRange?: { start: number; end: number }): Promise<AuditStats> {
    let events = Array.from(this.events.values());
    
    if (timeRange) {
      events = events.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const eventsByType = this.groupBy(events, 'eventType') as Record<AuditEventType, number>;
    const eventsByLevel = this.groupBy(events, 'logLevel') as Record<AuditLogLevel, number>;
    const eventsByOutcome = this.groupBy(events, 'outcome');

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByLevel,
      eventsByOutcome,
      phiAccessCount: events.filter(e => e.containsPHI).length,
      securityEventsCount: events.filter(e => 
        ['security_event', 'unauthorized_access', 'data_breach_detected'].includes(e.eventType)
      ).length,
      failedLoginsCount: events.filter(e => 
        e.eventType === 'user_login' && e.outcome === 'failure'
      ).length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
    };
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    period: { startTime: number; endTime: number }
  ): Promise<ComplianceReport> {
    const events = await this.queryEvents({
      startTime: period.startTime,
      endTime: period.endTime,
      limit: 10000, // Large limit for reports
    });

    const summary = await this.getStats(period);
    
    // Critical events (errors and security events)
    const criticalEvents = events.filter(e => 
      e.logLevel === 'critical' || e.logLevel === 'error'
    ).slice(0, 100);

    // PHI access events
    const phiAccessEvents = events.filter(e => e.containsPHI).slice(0, 100);

    // Security events
    const securityEvents = events.filter(e => 
      ['security_event', 'unauthorized_access', 'data_breach_detected', 'failed_login'].includes(e.eventType)
    ).slice(0, 100);

    // Check for compliance violations
    const complianceViolations = await this.detectComplianceViolations(events);

    const report: ComplianceReport = {
      reportId: this.generateReportId(),
      generatedAt: Date.now(),
      reportType,
      period,
      summary,
      criticalEvents,
      phiAccessEvents,
      securityEvents,
      complianceViolations,
    };

    // Log report generation
    await this.logEvent({
      eventType: 'system_event',
      action: 'compliance_report_generated',
      outcome: 'success',
      description: `Generated ${reportType} compliance report`,
      details: {
        reportId: report.reportId,
        period,
        eventCount: summary.totalEvents,
      },
    });

    return report;
  }

  /**
   * Verify audit log integrity
   */
  public async verifyIntegrity(eventId: string): Promise<{ valid: boolean; error?: string }> {
    const event = this.events.get(eventId);
    if (!event) {
      return { valid: false, error: 'Event not found' };
    }

    const expectedHash = this.generateIntegrityHash({
      ...event,
      integrity: undefined, // Exclude integrity field from hash calculation
    } as any);

    if (event.integrity !== expectedHash) {
      return { 
        valid: false, 
        error: 'Integrity hash mismatch - possible tampering detected' 
      };
    }

    return { valid: true };
  }

  /**
   * Export audit logs for compliance
   */
  public async exportLogs(
    query: AuditQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string }> {
    const events = await this.queryEvents(query);
    
    // Decrypt PHI data only if user has proper authorization
    // This would need additional authorization checks in a real implementation
    const exportData = events.map(event => {
      const exported = { ...event };
      
      // Remove sensitive internal fields
      delete exported.encryptionKeyId;
      
      return exported;
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'csv') {
      const csv = this.convertToCSV(exportData);
      return {
        data: csv,
        filename: `audit-export-${timestamp}.csv`,
      };
    } else {
      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `audit-export-${timestamp}.json`,
      };
    }
  }

  /**
   * Search audit logs with advanced filters
   */
  public async searchLogs(params: {
    query?: string;
    userId?: string;
    eventTypes?: AuditEventType[];
    timeRange?: { start: number; end: number };
    containsPHI?: boolean;
    severityLevel?: AuditLogLevel;
    limit?: number;
  }): Promise<AuditEvent[]> {
    let events = Array.from(this.events.values());

    // Apply filters
    if (params.timeRange) {
      events = events.filter(e => 
        e.timestamp >= params.timeRange!.start && e.timestamp <= params.timeRange!.end
      );
    }

    if (params.userId) {
      events = events.filter(e => e.userId === params.userId);
    }

    if (params.eventTypes?.length) {
      events = events.filter(e => params.eventTypes!.includes(e.eventType));
    }

    if (params.containsPHI !== undefined) {
      events = events.filter(e => e.containsPHI === params.containsPHI);
    }

    if (params.severityLevel) {
      events = events.filter(e => e.logLevel === params.severityLevel);
    }

    // Text search
    if (params.query) {
      const searchQuery = params.query.toLowerCase();
      events = events.filter(e => 
        e.description.toLowerCase().includes(searchQuery) ||
        e.action.toLowerCase().includes(searchQuery) ||
        JSON.stringify(e.details || {}).toLowerCase().includes(searchQuery)
      );
    }

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, params.limit || 100);
  }

  /**
   * Store event (placeholder for database implementation)
   */
  private async storeEvent(event: AuditEvent): Promise<void> {
    // In a real implementation, this would store to a secure, tamper-proof database
    this.events.set(event.id, event);
    
    // Set up retention cleanup
    this.scheduleRetentionCleanup(event);
  }

  /**
   * Add event to batch queue
   */
  private addToBatch(event: AuditEvent): void {
    this.batchQueue.push(event);
    
    if (this.batchQueue.length >= this.maxBatchSize) {
      this.processBatch();
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    const events = this.batchQueue.splice(0, this.maxBatchSize);
    
    try {
      // Store all events in batch
      await Promise.all(events.map(event => this.storeEvent(event)));
      this.emit('audit:batch_processed', { count: events.length });
    } catch (error) {
      console.error('Failed to process audit batch:', error);
      this.emit('audit:batch_error', { error, events });
      
      // Re-queue events for retry (implement retry logic as needed)
      this.batchQueue.unshift(...events);
    }
  }

  /**
   * Check if event needs encryption
   */
  private needsEncryption(eventData: any): boolean {
    return (
      eventData.containsPHI || 
      eventData.dataClassification === 'restricted' ||
      eventData.dataClassification === 'phi' ||
      !!eventData.patientId
    );
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(data: string): string {
    if (!data || !this.config.audit.encryption.enabled) return data;
    
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return `${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Filter sensitive data from details
   */
  private filterSensitiveData(details: Record<string, any>): Record<string, any> {
    const filtered = { ...details };
    const excludeFields = this.config.audit.hipaaCompliance.excludeFields;
    
    excludeFields.forEach(field => {
      if (filtered[field]) {
        filtered[field] = '[REDACTED]';
      }
    });
    
    return filtered;
  }

  /**
   * Anonymize IP address for privacy
   */
  private anonymizeIP(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // IPv4: Keep first 3 octets, zero out last
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    // IPv6: Keep first 4 groups, zero out rest
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    }
    
    return ip;
  }

  /**
   * Sanitize user agent string
   */
  private sanitizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Remove potentially identifying information while keeping useful data
    return userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X'); // Remove version numbers
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate integrity hash
   */
  private generateIntegrityHash(event: Omit<AuditEvent, 'integrity'>): string {
    const data = JSON.stringify(event);
    return crypto.createHash('sha256').update(data + this.encryptionKey.toString()).digest('hex');
  }

  /**
   * Get or create encryption key
   */
  private getOrCreateEncryptionKey(): Buffer {
    const keyFromEnv = process.env.AUDIT_ENCRYPTION_KEY;
    if (keyFromEnv) {
      return Buffer.from(keyFromEnv, 'hex');
    }
    
    // In production, this should be managed by a key management service
    return crypto.randomBytes(32);
  }

  /**
   * Get encryption key ID
   */
  private getEncryptionKeyId(): string {
    return crypto.createHash('sha256').update(this.encryptionKey).digest('hex').substring(0, 16);
  }

  /**
   * Get default log level for event type
   */
  private getDefaultLogLevel(eventType: AuditEventType): AuditLogLevel {
    const criticalEvents: AuditEventType[] = [
      'data_breach_detected',
      'unauthorized_access',
      'crisis_intervention',
    ];
    
    const errorEvents: AuditEventType[] = [
      'failed_login',
      'account_locked',
    ];
    
    const warningEvents: AuditEventType[] = [
      'data_delete',
      'privacy_setting_change',
      'role_change',
    ];
    
    if (criticalEvents.includes(eventType)) return 'critical';
    if (errorEvents.includes(eventType)) return 'error';
    if (warningEvents.includes(eventType)) return 'warning';
    
    return 'info';
  }

  /**
   * Check if event is critical and needs immediate storage
   */
  private isCriticalEvent(event: AuditEvent): boolean {
    return (
      event.logLevel === 'critical' ||
      event.containsPHI ||
      ['data_breach_detected', 'unauthorized_access', 'crisis_intervention'].includes(event.eventType)
    );
  }

  /**
   * Get applicable compliance rules
   */
  private getApplicableComplianceRules(eventData: any): string[] {
    const rules = [];
    
    if (eventData.containsPHI) {
      rules.push('HIPAA-164.312');
    }
    
    if (eventData.eventType === 'data_breach_detected') {
      rules.push('HIPAA-164.408');
    }
    
    if (eventData.eventType === 'user_login') {
      rules.push('HIPAA-164.312(d)');
    }
    
    return rules;
  }

  /**
   * Get retention category
   */
  private getRetentionCategory(eventData: any): string {
    if (eventData.containsPHI) return 'phi_access';
    if (eventData.eventType.includes('security')) return 'security';
    if (eventData.eventType.includes('admin')) return 'admin';
    return 'general';
  }

  /**
   * Group array by field
   */
  private groupBy(array: any[], field: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.eventType === 'failed_login') {
      const recentFailedLogins = await this.queryEvents({
        userId: event.userId,
        eventType: 'failed_login',
        startTime: Date.now() - 900000, // Last 15 minutes
      });
      
      if (recentFailedLogins.length >= 5) {
        this.emit('audit:compliance_violation', {
          event,
          violation: 'Multiple failed login attempts',
          severity: 'high',
        });
      }
    }
    
    // Check for PHI access without justification
    if (event.containsPHI && !event.reasonForAccess) {
      this.emit('audit:compliance_violation', {
        event,
        violation: 'PHI access without documented reason',
        severity: 'medium',
      });
    }
  }

  /**
   * Detect compliance violations in events
   */
  private async detectComplianceViolations(events: AuditEvent[]): Promise<ComplianceReport['complianceViolations']> {
    const violations: ComplianceReport['complianceViolations'] = [];
    
    // Group events by user for pattern analysis
    const eventsByUser = new Map<string, AuditEvent[]>();
    events.forEach(event => {
      if (event.userId) {
        if (!eventsByUser.has(event.userId)) {
          eventsByUser.set(event.userId, []);
        }
        eventsByUser.get(event.userId)!.push(event);
      }
    });
    
    // Check for violations
    for (const [userId, userEvents] of eventsByUser) {
      // Multiple failed logins
      const failedLogins = userEvents.filter(e => 
        e.eventType === 'user_login' && e.outcome === 'failure'
      );
      if (failedLogins.length >= 5) {
        violations.push({
          event: failedLogins[0],
          violation: `Multiple failed login attempts (${failedLogins.length})`,
          severity: 'high',
        });
      }
      
      // PHI access without documentation
      const phiAccess = userEvents.filter(e => e.containsPHI && !e.reasonForAccess);
      phiAccess.forEach(event => {
        violations.push({
          event,
          violation: 'PHI access without documented reason',
          severity: 'medium',
        });
      });
    }
    
    return violations;
  }

  /**
   * Schedule retention cleanup for event
   */
  private scheduleRetentionCleanup(event: AuditEvent): void {
    const retentionDays = this.config.audit.retention.days;
    const cleanupTime = event.timestamp + (retentionDays * 24 * 60 * 60 * 1000);
    const delay = cleanupTime - Date.now();
    
    if (delay > 0) {
      const timer = setTimeout(() => {
        this.events.delete(event.id);
        this.retentionTimers.delete(event.id);
      }, delay);
      
      this.retentionTimers.set(event.id, timer);
    }
  }

  /**
   * Start retention cleanup process
   */
  private startRetentionCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      const retentionTime = this.config.audit.retention.days * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - retentionTime;
      
      for (const [id, event] of this.events) {
        if (event.timestamp < cutoff) {
          this.events.delete(id);
          
          const timer = this.retentionTimers.get(id);
          if (timer) {
            clearTimeout(timer);
            this.retentionTimers.delete(id);
          }
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}

// Singleton instance
export const auditTrailService = new AuditTrailService();

export default auditTrailService;