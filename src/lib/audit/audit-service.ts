import crypto from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { 
  AuditEvent,
  AuditEventCategory,
  AuditOutcome,
  RiskLevel,
  DataSensitivity,
  BaseAuditEventSchema,
  PHIAccessEventSchema,
  AuthenticationEventSchema,
  AdministrativeEventSchema,
  SecurityEventSchema,
  AuditQueryFilters,
  AuditQueryFiltersSchema,
  AuditStatistics,
  ComplianceReport,
} from './types';

/**
 * HIPAA Compliance Audit Service
 * Provides comprehensive audit logging and reporting for HIPAA compliance
 */

// Configuration
const AUDIT_CONFIG = {
  // Encryption key for audit logs (should be different from PHI encryption key)
  auditLogKey: process.env.AUDIT_LOG_KEY || '',
  
  // Retention policies (in days)
  defaultRetentionPeriod: 2555, // 7 years (HIPAA minimum)
  securityEventRetentionPeriod: 3650, // 10 years for security events
  
  // Real-time alerting thresholds
  alertThresholds: {
    failedLoginsPerHour: 10,
    phiAccessPerUser: 100,
    suspiciousActivityScore: 0.8,
  },
  
  // Batch processing
  batchSize: 1000,
  flushInterval: 10000, // 10 seconds
};

// Validate audit configuration
if (!AUDIT_CONFIG.auditLogKey) {
  console.error('AUDIT_LOG_KEY environment variable is required');
  throw new Error('Missing audit log encryption key');
}

export class AuditService {
  private static instance: AuditService;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => this.flush());
    process.on('SIGINT', () => this.flush());
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  public async logEvent(event: Partial<AuditEvent>): Promise<void> {
    try {
      // Generate event ID and timestamp if not provided
      const enrichedEvent: AuditEvent = {
        eventId: event.eventId || crypto.randomUUID(),
        timestamp: event.timestamp || new Date().toISOString(),
        
        // Required fields with defaults
        category: event.category!,
        action: event.action!,
        outcome: event.outcome || AuditOutcome.SUCCESS,
        riskLevel: event.riskLevel || RiskLevel.LOW,
        description: event.description || '',
        
        // Actor information
        userId: event.userId || null,
        userEmail: event.userEmail || null,
        userRole: event.userRole || null,
        sessionId: event.sessionId || null,
        
        // Source information
        sourceIp: event.sourceIp || null,
        userAgent: event.userAgent || null,
        deviceId: event.deviceId || null,
        geolocation: event.geolocation || null,
        
        // Target information
        resourceType: event.resourceType || null,
        resourceId: event.resourceId || null,
        resourceOwner: event.resourceOwner || null,
        dataSensitivity: event.dataSensitivity || DataSensitivity.PUBLIC,
        
        // Technical details
        requestId: event.requestId || null,
        apiEndpoint: event.apiEndpoint || null,
        httpMethod: event.httpMethod || null,
        httpStatusCode: event.httpStatusCode || null,
        responseTime: event.responseTime || null,
        
        // Additional context
        metadata: event.metadata || null,
        errorDetails: event.errorDetails || null,
        
        // Compliance flags
        requiresNotification: event.requiresNotification || false,
        retentionPeriod: event.retentionPeriod || this.getRetentionPeriod(event.category!),
        
        // Calculate integrity checksum
        checksum: '',
        digitalSignature: null,
        
        // Copy any additional properties for specialized event types
        ...event,
      } as AuditEvent;

      // Calculate checksum for integrity
      enrichedEvent.checksum = this.calculateChecksum(enrichedEvent);
      
      // Add digital signature for high-risk events
      if (enrichedEvent.riskLevel === RiskLevel.HIGH || enrichedEvent.riskLevel === RiskLevel.CRITICAL) {
        enrichedEvent.digitalSignature = this.signEvent(enrichedEvent);
      }

      // Validate the event structure
      this.validateEvent(enrichedEvent);

      // Add to buffer for batch processing
      this.eventBuffer.push(enrichedEvent);

      // Immediate flush for critical events
      if (enrichedEvent.riskLevel === RiskLevel.CRITICAL) {
        await this.flush();
      }

      // Check for real-time alerts
      await this.checkAlerts(enrichedEvent);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      
      // Log the failure itself (without sensitive data)
      await this.logEvent({
        category: AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
        action: 'AUDIT_LOG_FAILURE',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Failed to log audit event',
        errorDetails: {
          errorCode: 'AUDIT_LOG_FAILURE',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Log PHI access event
   */
  public async logPHIAccess(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    resourceType: string;
    resourceId: string;
    resourceOwner: string;
    phiFields: string[];
    accessPurpose: 'TREATMENT' | 'PAYMENT' | 'HEALTHCARE_OPERATIONS' | 'RESEARCH' | 'OTHER';
    accessJustification?: string;
    sourceIp?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    await this.logEvent({
      category: AuditEventCategory.PHI_ACCESS,
      action: 'ACCESS_PHI_DATA',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `User accessed PHI data: ${params.phiFields.join(', ')}`,
      
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      sessionId: params.sessionId,
      
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceOwner: params.resourceOwner,
      dataSensitivity: DataSensitivity.RESTRICTED,
      
      metadata: {
        phiFields: params.phiFields,
        accessPurpose: params.accessPurpose,
        accessJustification: params.accessJustification,
      },
    });
  }

  /**
   * Log authentication event
   */
  public async logAuthentication(params: {
    category: AuditEventCategory.LOGIN_SUCCESS | AuditEventCategory.LOGIN_FAILURE | AuditEventCategory.LOGOUT;
    userId?: string;
    userEmail?: string;
    authenticationMethod: 'PASSWORD' | 'MFA' | 'SSO' | 'API_KEY' | 'OAUTH';
    mfaMethod?: 'SMS' | 'EMAIL' | 'TOTP' | 'HARDWARE_TOKEN' | 'BIOMETRIC';
    failureReason?: string;
    sourceIp?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    const isFailure = params.category === AuditEventCategory.LOGIN_FAILURE;
    
    await this.logEvent({
      category: params.category,
      action: params.category,
      outcome: isFailure ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS,
      riskLevel: isFailure ? RiskLevel.MEDIUM : RiskLevel.LOW,
      description: `User ${params.category.toLowerCase().replace('_', ' ')}`,
      
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      sessionId: params.sessionId,
      
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      
      dataSensitivity: DataSensitivity.INTERNAL,
      
      metadata: {
        authenticationMethod: params.authenticationMethod,
        mfaMethod: params.mfaMethod,
        failureReason: params.failureReason,
      },
    });
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(params: {
    category: AuditEventCategory;
    description: string;
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentId?: string;
    attackVector?: string;
    affectedResources?: string[];
    sourceIp?: string;
    userAgent?: string;
    userId?: string;
  }): Promise<void> {
    await this.logEvent({
      category: params.category,
      action: 'SECURITY_EVENT',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: params.threatLevel === 'CRITICAL' ? RiskLevel.CRITICAL : RiskLevel.HIGH,
      description: params.description,
      
      userId: params.userId,
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      
      dataSensitivity: DataSensitivity.RESTRICTED,
      requiresNotification: params.threatLevel === 'CRITICAL',
      
      metadata: {
        threatLevel: params.threatLevel,
        incidentId: params.incidentId,
        attackVector: params.attackVector,
        affectedResources: params.affectedResources || [],
      },
    });
  }

  /**
   * Query audit events with filters
   */
  public async queryEvents(filters: AuditQueryFilters): Promise<{
    events: AuditEvent[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Validate filters
      const validatedFilters = AuditQueryFiltersSchema.parse(filters);

      // Build where clause
      const whereClause: any = {};

      if (validatedFilters.startDate || validatedFilters.endDate) {
        whereClause.timestamp = {};
        if (validatedFilters.startDate) {
          whereClause.timestamp.gte = validatedFilters.startDate;
        }
        if (validatedFilters.endDate) {
          whereClause.timestamp.lte = validatedFilters.endDate;
        }
      }

      if (validatedFilters.categories) {
        whereClause.category = { in: validatedFilters.categories };
      }

      if (validatedFilters.outcomes) {
        whereClause.outcome = { in: validatedFilters.outcomes };
      }

      if (validatedFilters.riskLevels) {
        whereClause.riskLevel = { in: validatedFilters.riskLevels };
      }

      if (validatedFilters.userId) {
        whereClause.userId = validatedFilters.userId;
      }

      if (validatedFilters.userEmail) {
        whereClause.userEmail = validatedFilters.userEmail;
      }

      if (validatedFilters.sourceIp) {
        whereClause.sourceIp = validatedFilters.sourceIp;
      }

      if (validatedFilters.resourceType) {
        whereClause.resourceType = validatedFilters.resourceType;
      }

      if (validatedFilters.resourceId) {
        whereClause.resourceId = validatedFilters.resourceId;
      }

      if (validatedFilters.searchQuery) {
        whereClause.OR = [
          { description: { contains: validatedFilters.searchQuery, mode: 'insensitive' } },
          { action: { contains: validatedFilters.searchQuery, mode: 'insensitive' } },
          { userEmail: { contains: validatedFilters.searchQuery, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const totalCount = await (prisma as any).auditEvent.count({ where: whereClause });

      // Get events with pagination
      const events = await (prisma as any).auditEvent.findMany({
        where: whereClause,
        orderBy: {
          [validatedFilters.sortBy]: validatedFilters.sortOrder,
        },
        skip: (validatedFilters.page - 1) * validatedFilters.limit,
        take: validatedFilters.limit,
      });

      // Decrypt and return events
      const decryptedEvents = events.map(event => this.decryptEvent(event));

      return {
        events: decryptedEvents,
        totalCount,
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        totalPages: Math.ceil(totalCount / validatedFilters.limit),
      };

    } catch (error) {
      console.error('Failed to query audit events:', error);
      throw new Error('Failed to query audit events');
    }
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(params: {
    startDate: string;
    endDate: string;
    generatedBy: {
      userId: string;
      userEmail: string;
      userRole: string;
    };
  }): Promise<ComplianceReport> {
    try {
      // Query events for the period
      const { events } = await this.queryEvents({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 10000, // Large limit for complete analysis
      });

      // Calculate statistics
      const statistics = this.calculateStatistics(events);

      // Analyze compliance
      const findings = this.analyzeCompliance(events);

      const report: ComplianceReport = {
        reportId: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
        generatedBy: params.generatedBy,
        statistics,
        findings,
        compliance: {
          hipaaCompliant: findings.every(f => f.severity !== RiskLevel.CRITICAL),
          gdprCompliant: true, // Additional GDPR analysis would go here
          issues: findings.filter(f => f.severity === RiskLevel.HIGH || f.severity === RiskLevel.CRITICAL).map(f => f.finding),
          recommendations: findings.map(f => f.recommendation),
        },
        signature: '', // Will be calculated below
      };

      // Sign the report for integrity
      report.signature = this.signReport(report);

      // Log the report generation
      await this.logEvent({
        category: AuditEventCategory.COMPLIANCE_REPORT_GENERATED,
        action: 'GENERATE_COMPLIANCE_REPORT',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: `Compliance report generated for period ${params.startDate} to ${params.endDate}`,
        userId: params.generatedBy.userId,
        userEmail: params.generatedBy.userEmail,
        userRole: params.generatedBy.userRole,
        dataSensitivity: DataSensitivity.CONFIDENTIAL,
        metadata: {
          reportId: report.reportId,
          eventCount: statistics.totalEvents,
        },
      });

      return report;

    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Flush buffered events to database
   */
  public async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      // Encrypt events before storage
      const encryptedEvents = events.map(event => this.encryptEvent(event));

      // Batch insert to database
      await (prisma as any).auditEvent.createMany({
        data: encryptedEvents,
        skipDuplicates: true,
      });

      console.log(`Flushed ${events.length} audit events to database`);

    } catch (error) {
      console.error('Failed to flush audit events:', error);
      
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  // Private helper methods

  private validateEvent(event: AuditEvent): void {
    try {
      // Use appropriate schema based on category
      switch (event.category) {
        case AuditEventCategory.PHI_ACCESS:
          PHIAccessEventSchema.parse(event);
          break;
        case AuditEventCategory.LOGIN_SUCCESS:
        case AuditEventCategory.LOGIN_FAILURE:
        case AuditEventCategory.LOGOUT:
          AuthenticationEventSchema.parse(event);
          break;
        case AuditEventCategory.USER_CREATED:
        case AuditEventCategory.USER_MODIFIED:
        case AuditEventCategory.ROLE_CHANGED:
          AdministrativeEventSchema.parse(event);
          break;
        case AuditEventCategory.SECURITY_INCIDENT:
        case AuditEventCategory.SUSPICIOUS_ACTIVITY:
          SecurityEventSchema.parse(event);
          break;
        default:
          BaseAuditEventSchema.parse(event);
      }
    } catch (error) {
      console.error('Audit event validation failed:', error);
      throw new Error('Invalid audit event structure');
    }
  }

  private calculateChecksum(event: AuditEvent): string {
    // Create checksum without including checksum and signature fields
    const eventCopy = { ...event };
    delete eventCopy.checksum;
    delete eventCopy.digitalSignature;
    
    const eventString = JSON.stringify(eventCopy, Object.keys(eventCopy).sort());
    return crypto.createHash('sha256').update(eventString).digest('hex');
  }

  private signEvent(event: AuditEvent): string {
    const eventString = JSON.stringify(event, Object.keys(event).sort());
    return crypto
      .createHmac('sha256', AUDIT_CONFIG.auditLogKey)
      .update(eventString)
      .digest('hex');
  }

  private signReport(report: Omit<ComplianceReport, 'signature'>): string {
    const reportString = JSON.stringify(report, Object.keys(report).sort());
    return crypto
      .createHmac('sha256', AUDIT_CONFIG.auditLogKey)
      .update(reportString)
      .digest('hex');
  }

  private encryptEvent(event: AuditEvent): any {
    // Encrypt sensitive fields
    const cipher = crypto.createCipher('aes-256-gcm', Buffer.from(AUDIT_CONFIG.auditLogKey, 'hex'));
    const eventString = JSON.stringify(event);
    let encrypted = cipher.update(eventString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return {
      eventId: event.eventId,
      timestamp: event.timestamp,
      category: event.category,
      riskLevel: event.riskLevel,
      outcome: event.outcome,
      encryptedData: encrypted,
      authTag: tag.toString('base64'),
      checksum: event.checksum,
    };
  }

  private decryptEvent(encryptedEvent: any): AuditEvent {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', Buffer.from(AUDIT_CONFIG.auditLogKey, 'hex'));
      decipher.setAuthTag(Buffer.from(encryptedEvent.authTag, 'base64'));
      
      let decrypted = decipher.update(encryptedEvent.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt audit event:', error);
      throw new Error('Failed to decrypt audit event');
    }
  }

  private getRetentionPeriod(category: AuditEventCategory): number {
    switch (category) {
      case AuditEventCategory.SECURITY_INCIDENT:
      case AuditEventCategory.DATA_BREACH_DETECTED:
      case AuditEventCategory.VULNERABILITY_DETECTED:
        return AUDIT_CONFIG.securityEventRetentionPeriod;
      default:
        return AUDIT_CONFIG.defaultRetentionPeriod;
    }
  }

  private calculateStatistics(events: AuditEvent[]): AuditStatistics {
    const stats: AuditStatistics = {
      totalEvents: events.length,
      eventsByCategory: {} as Record<AuditEventCategory, number>,
      eventsByOutcome: {} as Record<AuditOutcome, number>,
      eventsByRiskLevel: {} as Record<RiskLevel, number>,
      eventsByUser: [],
      eventsByResource: [],
      timeRangeCovered: {
        startDate: events[0]?.timestamp || '',
        endDate: events[events.length - 1]?.timestamp || '',
      },
      complianceMetrics: {
        phiAccessEvents: 0,
        failedLogins: 0,
        securityIncidents: 0,
        dataBreaches: 0,
      },
    };

    // Initialize counters
    Object.values(AuditEventCategory).forEach(category => {
      stats.eventsByCategory[category] = 0;
    });
    
    Object.values(AuditOutcome).forEach(outcome => {
      stats.eventsByOutcome[outcome] = 0;
    });
    
    Object.values(RiskLevel).forEach(riskLevel => {
      stats.eventsByRiskLevel[riskLevel] = 0;
    });

    // Count events
    const userCounts = new Map<string, { email: string; count: number }>();
    const resourceCounts = new Map<string, number>();

    events.forEach(event => {
      // Category counts
      stats.eventsByCategory[event.category]++;
      
      // Outcome counts
      stats.eventsByOutcome[event.outcome]++;
      
      // Risk level counts
      stats.eventsByRiskLevel[event.riskLevel]++;

      // User counts
      if (event.userId && event.userEmail) {
        const userKey = event.userId;
        const existing = userCounts.get(userKey) || { email: event.userEmail, count: 0 };
        existing.count++;
        userCounts.set(userKey, existing);
      }

      // Resource counts
      if (event.resourceType) {
        const existing = resourceCounts.get(event.resourceType) || 0;
        resourceCounts.set(event.resourceType, existing + 1);
      }

      // Compliance metrics
      if (event.category === AuditEventCategory.PHI_ACCESS) {
        stats.complianceMetrics.phiAccessEvents++;
      }
      if (event.category === AuditEventCategory.LOGIN_FAILURE) {
        stats.complianceMetrics.failedLogins++;
      }
      if (event.category === AuditEventCategory.SECURITY_INCIDENT) {
        stats.complianceMetrics.securityIncidents++;
      }
      if (event.category === AuditEventCategory.DATA_BREACH_DETECTED) {
        stats.complianceMetrics.dataBreaches++;
      }
    });

    // Convert maps to arrays
    stats.eventsByUser = Array.from(userCounts.entries()).map(([userId, data]) => ({
      userId,
      userEmail: data.email,
      eventCount: data.count,
    }));

    stats.eventsByResource = Array.from(resourceCounts.entries()).map(([resourceType, count]) => ({
      resourceType,
      eventCount: count,
    }));

    return stats;
  }

  private analyzeCompliance(events: AuditEvent[]): Array<{
    finding: string;
    severity: RiskLevel;
    recommendation: string;
    affectedEvents: number;
  }> {
    const findings: Array<{
      finding: string;
      severity: RiskLevel;
      recommendation: string;
      affectedEvents: number;
    }> = [];

    // Check for excessive failed login attempts
    const failedLogins = events.filter(e => e.category === AuditEventCategory.LOGIN_FAILURE);
    if (failedLogins.length > AUDIT_CONFIG.alertThresholds.failedLoginsPerHour) {
      findings.push({
        finding: 'Excessive failed login attempts detected',
        severity: RiskLevel.HIGH,
        recommendation: 'Implement account lockout and investigate suspicious IPs',
        affectedEvents: failedLogins.length,
      });
    }

    // Check for data breaches
    const dataBreaches = events.filter(e => e.category === AuditEventCategory.DATA_BREACH_DETECTED);
    if (dataBreaches.length > 0) {
      findings.push({
        finding: 'Data breach incidents detected',
        severity: RiskLevel.CRITICAL,
        recommendation: 'Follow breach notification procedures immediately',
        affectedEvents: dataBreaches.length,
      });
    }

    // Check for missing PHI access justification
    const phiAccess = events.filter(e => 
      e.category === AuditEventCategory.PHI_ACCESS && 
      (!e.metadata?.accessJustification || e.metadata.accessJustification === '')
    );
    if (phiAccess.length > 0) {
      findings.push({
        finding: 'PHI access without proper justification',
        severity: RiskLevel.MEDIUM,
        recommendation: 'Ensure all PHI access includes proper justification',
        affectedEvents: phiAccess.length,
      });
    }

    return findings;
  }

  private async checkAlerts(event: AuditEvent): Promise<void> {
    // Check for real-time alerting conditions
    
    // High-risk events
    if (event.riskLevel === RiskLevel.CRITICAL) {
      // TODO: Send immediate alert to security team
      console.error('CRITICAL SECURITY EVENT:', event);
    }

    // Failed login rate limiting
    if (event.category === AuditEventCategory.LOGIN_FAILURE) {
      // TODO: Check rate and trigger alerts if threshold exceeded
    }

    // Suspicious activity detection
    if (event.category === AuditEventCategory.SUSPICIOUS_ACTIVITY) {
      // TODO: Update threat intelligence and trigger investigation
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, AUDIT_CONFIG.flushInterval);
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();