/**
 * Audit Logging System
 * Comprehensive logging for compliance, monitoring, and quality assurance
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId: string;
  therapistId?: string;
  action: string;
  category: LogCategory;
  severity: LogSeverity;
  details: any;
  metadata?: LogMetadata;
  hash?: string; // For integrity verification
  
  // Extended properties for TS2353 errors
  accessLevel?: string;
  administeringClinician?: string;
  anonymized?: boolean;
  assessmentCount?: number;
  assessmentId?: string;
  assessmentType?: string;
  assessorId?: string;
  capability?: string;
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

export type LogCategory = 
  | 'conversation'
  | 'intervention'
  | 'crisis'
  | 'ethical_violation'
  | 'privacy'
  | 'access'
  | 'consent'
  | 'system'
  | 'error'
  | 'security';

export type LogSeverity = 
  | 'debug'
  | 'info'
  | 'warning'
  | 'error'
  | 'critical';

export interface LogMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceInfo?: DeviceInfo;
  sessionDuration?: number;
  interventionOutcome?: any;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenResolution?: string;
}

export interface LogQuery {
  userId?: string;
  sessionId?: string;
  category?: LogCategory;
  severity?: LogSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStatistics {
  totalLogs: number;
  logsByCategory: Record<LogCategory, number>;
  logsBySeverity: Record<LogSeverity, number>;
  averageSessionDuration: number;
  criticalEvents: number;
  dateRange: { start: Date; end: Date };
}

export class AuditLogger extends EventEmitter {
  private logs: Map<string, AuditLogEntry>;
  private logBuffer: AuditLogEntry[];
  private readonly BUFFER_SIZE = 100;
  private readonly MAX_LOG_SIZE = 1000000; // 1 million entries
  private hashChain: string | null = null;

  constructor() {
    super();
    this.logs = new Map();
    this.logBuffer = [];
    this.initializeLogger();
  }

  private initializeLogger(): void {
    // Set up periodic buffer flush
    setInterval(() => {
      this.flushBuffer();
    }, 5000); // Flush every 5 seconds

    // Set up log rotation
    setInterval(() => {
      this.rotateLogs();
    }, 24 * 60 * 60 * 1000); // Rotate daily
  }

  public async log(entry: Omit<AuditLogEntry, 'id' | 'hash'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateLogId(),
      ...entry,
      hash: this.generateHash(entry)
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Immediate flush for critical events
    if (entry.severity === 'critical') {
      await this.flushBuffer();
      this.emit('critical-event', logEntry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateHash(entry: any): string {
    const content = JSON.stringify({
      ...entry,
      previousHash: this.hashChain
    });
    
    const hash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    
    this.hashChain = hash;
    return hash;
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    for (const log of logsToFlush) {
      this.logs.set(log.id, log);
    }

    // In production, this would persist to database
    await this.persistLogs(logsToFlush);

    this.emit('buffer-flushed', { count: logsToFlush.length });
  }

  private async persistLogs(logs: AuditLogEntry[]): Promise<void> {
    // In production, this would write to a database
    // For now, we'll simulate async persistence
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async rotateLogs(): Promise<void> {
    if (this.logs.size <= this.MAX_LOG_SIZE) return;

    // Archive old logs
    const sortedLogs = Array.from(this.logs.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const logsToArchive = sortedLogs.slice(0, sortedLogs.length - this.MAX_LOG_SIZE);
    
    // Archive logs (in production, this would move to cold storage)
    await this.archiveLogs(logsToArchive);

    // Remove archived logs from active storage
    for (const log of logsToArchive) {
      this.logs.delete(log.id);
    }

    this.emit('logs-rotated', { 
      archived: logsToArchive.length,
      remaining: this.logs.size 
    });
  }

  private async archiveLogs(logs: AuditLogEntry[]): Promise<void> {
    // In production, this would move logs to cold storage
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  public async logConversation(data: {
    sessionId: string;
    userId: string;
    message: any;
    response: any;
    interventions?: any[];
    riskLevel?: string;
  }): Promise<void> {
    await this.log({
      timestamp: new Date(),
      sessionId: data.sessionId,
      userId: data.userId,
      action: 'conversation',
      category: 'conversation',
      severity: 'info',
      details: {
        messageLength: data.message.length,
        responseLength: data.response.length,
        interventionCount: data.interventions?.length || 0,
        riskLevel: data.riskLevel
      }
    });
  }

  public async logCrisis(data: {
    userId: string;
    sessionId: string;
    level: string;
    indicators: any[];
    action: string;
  }): Promise<void> {
    await this.log({
      timestamp: new Date(),
      sessionId: data.sessionId,
      userId: data.userId,
      action: 'crisis_detected',
      category: 'crisis',
      severity: data.level === 'critical' ? 'critical' : 'warning',
      details: {
        level: data.level,
        indicatorCount: data.indicators.length,
        actionTaken: data.action
      }
    });
  }

  public async logEthicalViolation(data: {
    userId: string;
    sessionId: string;
    violation: any;
    action: string;
  }): Promise<void> {
    await this.log({
      timestamp: new Date(),
      sessionId: data.sessionId,
      userId: data.userId,
      action: 'ethical_violation',
      category: 'ethical_violation',
      severity: 'warning',
      details: {
        violationType: data.violation.type,
        violationSeverity: data.violation.severity,
        actionTaken: data.action
      }
    });
  }

  public async logError(data: {
    error: string | Error;
    context: any;
  }): Promise<void> {
    const errorDetails = data.error instanceof Error ? {
      message: data.error.message,
      stack: data.error.stack,
      name: data.error.name
    } : { message: data.error };

    await this.log({
      timestamp: new Date(),
      sessionId: data.context.sessionId || 'system',
      userId: data.context.userId || 'system',
      action: 'error',
      category: 'error',
      severity: 'error',
      details: {
        error: errorDetails,
        context: data.context
      }
    });
  }

  public async logSessionEnd(sessionId: string): Promise<void> {
    const sessionLogs = Array.from(this.logs.values())
      .filter(log => log.sessionId === sessionId);
    
    const sessionStart = sessionLogs.length > 0 
      ? Math.min(...sessionLogs.map(l => l.timestamp.getTime()))
      : Date.now();
    
    const duration = Date.now() - sessionStart;

    await this.log({
      timestamp: new Date(),
      sessionId,
      userId: sessionLogs[0]?.userId || 'unknown',
      action: 'session_end',
      category: 'system',
      severity: 'info',
      details: {
        duration,
        messageCount: sessionLogs.filter(l => l.action === 'conversation').length,
        interventionCount: sessionLogs.filter(l => l.category === 'intervention').length,
        criticalEvents: sessionLogs.filter(l => l.severity === 'critical').length
      }
    });
  }

  public async query(params: LogQuery): Promise<AuditLogEntry[]> {
    let results = Array.from(this.logs.values());

    // Apply filters
    if (params.userId) {
      results = results.filter(log => log.userId === params.userId);
    }
    if (params.sessionId) {
      results = results.filter(log => log.sessionId === params.sessionId);
    }
    if (params.category) {
      results = results.filter(log => log.category === params.category);
    }
    if (params.severity) {
      results = results.filter(log => log.severity === params.severity);
    }
    if (params.startDate) {
      results = results.filter(log => log.timestamp >= params.startDate!);
    }
    if (params.endDate) {
      results = results.filter(log => log.timestamp <= params.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  public async getStatistics(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<LogStatistics> {
    let logs = Array.from(this.logs.values());

    if (params?.startDate) {
      logs = logs.filter(log => log.timestamp >= params.startDate!);
    }
    if (params?.endDate) {
      logs = logs.filter(log => log.timestamp <= params.endDate!);
    }

    const statistics: LogStatistics = {
      totalLogs: logs.length,
      logsByCategory: {} as Record<LogCategory, number>,
      logsBySeverity: {} as Record<LogSeverity, number>,
      averageSessionDuration: 0,
      criticalEvents: 0,
      dateRange: {
        start: logs.length > 0 ? new Date(Math.min(...logs.map(l => l.timestamp.getTime()))) : new Date(),
        end: logs.length > 0 ? new Date(Math.max(...logs.map(l => l.timestamp.getTime()))) : new Date()
      }
    };

    // Count by category
    const categories: LogCategory[] = ['conversation', 'intervention', 'crisis', 'ethical_violation', 'privacy', 'access', 'consent', 'system', 'error', 'security'];
    for (const category of categories) {
      statistics.logsByCategory[category] = logs.filter(l => l.category === category).length;
    }

    // Count by severity
    const severities: LogSeverity[] = ['debug', 'info', 'warning', 'error', 'critical'];
    for (const severity of severities) {
      statistics.logsBySeverity[severity] = logs.filter(l => l.severity === severity).length;
    }

    // Count critical events
    statistics.criticalEvents = logs.filter(l => l.severity === 'critical').length;

    // Calculate average session duration
    const sessionEndLogs = logs.filter(l => l.action === 'session_end');
    if (sessionEndLogs.length > 0) {
      const totalDuration = sessionEndLogs.reduce((sum, log) => 
        sum + (log.details?.duration || 0), 0
      );
      statistics.averageSessionDuration = totalDuration / sessionEndLogs.length;
    }

    return statistics;
  }

  public async verifyIntegrity(logId: string): Promise<boolean> {
    const log = this.logs.get(logId);
    if (!log) return false;

    // Find previous log
    const sortedLogs = Array.from(this.logs.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const logIndex = sortedLogs.findIndex(l => l.id === logId);
    const previousHash = logIndex > 0 ? sortedLogs[logIndex - 1]?.hash : null;

    // Recalculate hash
    const content = JSON.stringify({
      ...log,
      hash: undefined,
      previousHash
    });
    
    const expectedHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');

    return log.hash === expectedHash;
  }

  public async exportLogs(params?: LogQuery): Promise<string> {
    const logs = await this.query(params || {});
    
    // Convert to JSON format
    const exportData = {
      exportDate: new Date(),
      logCount: logs.length,
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async generateReport(params: {
    userId?: string;
    startDate: Date;
    endDate: Date;
    reportType: 'summary' | 'detailed' | 'compliance';
  }): Promise<any> {
    const logs = await this.query({
      userId: params.userId,
      startDate: params.startDate,
      endDate: params.endDate
    });

    const statistics = await this.getStatistics({
      startDate: params.startDate,
      endDate: params.endDate
    });

    switch (params.reportType) {
      case 'summary':
        return {
          period: { start: params.startDate, end: params.endDate },
          statistics,
          topEvents: this.getTopEvents(logs, 5)
        };
      
      case 'detailed':
        return {
          period: { start: params.startDate, end: params.endDate },
          statistics,
          logs,
          sessionAnalysis: this.analyzeSession(logs),
          riskAnalysis: this.analyzeRisks(logs)
        };
      
      case 'compliance':
        return {
          period: { start: params.startDate, end: params.endDate },
          auditTrail: logs.filter(l => l.category === 'access' || l.category === 'consent'),
          privacyEvents: logs.filter(l => l.category === 'privacy'),
          ethicalViolations: logs.filter(l => l.category === 'ethical_violation'),
          dataIntegrity: await this.verifyLogIntegrity(logs)
        };
      
      default:
        return { statistics, logs };
    }
  }

  private getTopEvents(logs: AuditLogEntry[], limit: number): any[] {
    const eventCounts = new Map<string, number>();
    
    for (const log of logs) {
      const key = `${log.category}:${log.action}`;
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
    }

    return Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([event, count]) => ({ event, count }));
  }

  private analyzeSession(logs: AuditLogEntry[]): any {
    const sessions = new Map<string, AuditLogEntry[]>();
    
    for (const log of logs) {
      if (!sessions.has(log.sessionId)) {
        sessions.set(log.sessionId, []);
      }
      sessions.get(log.sessionId)!.push(log);
    }

    const sessionAnalysis = Array.from(sessions.entries()).map(([sessionId, sessionLogs]) => {
      const start = Math.min(...sessionLogs.map(l => l.timestamp.getTime()));
      const end = Math.max(...sessionLogs.map(l => l.timestamp.getTime()));
      
      return {
        sessionId,
        duration: end - start,
        eventCount: sessionLogs.length,
        criticalEvents: sessionLogs.filter(l => l.severity === 'critical').length,
        interventions: sessionLogs.filter(l => l.category === 'intervention').length
      };
    });

    return sessionAnalysis;
  }

  private analyzeRisks(logs: AuditLogEntry[]): any {
    const crisisLogs = logs.filter(l => l.category === 'crisis');
    const ethicalLogs = logs.filter(l => l.category === 'ethical_violation');
    
    return {
      totalCrisisEvents: crisisLogs.length,
      criticalCrisisEvents: crisisLogs.filter(l => l.severity === 'critical').length,
      ethicalViolations: ethicalLogs.length,
      riskTrend: this.calculateRiskTrend(logs)
    };
  }

  private calculateRiskTrend(logs: AuditLogEntry[]): 'increasing' | 'stable' | 'decreasing' {
    // Simple trend analysis based on critical events over time
    const sortedLogs = logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const midpoint = Math.floor(sortedLogs.length / 2);
    
    const firstHalfCritical = sortedLogs.slice(0, midpoint)
      .filter(l => l.severity === 'critical').length;
    const secondHalfCritical = sortedLogs.slice(midpoint)
      .filter(l => l.severity === 'critical').length;
    
    if (secondHalfCritical > firstHalfCritical * 1.2) return 'increasing';
    if (secondHalfCritical < firstHalfCritical * 0.8) return 'decreasing';
    return 'stable';
  }

  private async verifyLogIntegrity(logs: AuditLogEntry[]): Promise<{
    verified: number;
    failed: number;
    integrity: number;
  }> {
    let verified = 0;
    let failed = 0;
    
    for (const log of logs) {
      const isValid = await this.verifyIntegrity(log.id);
      if (isValid) verified++;
      else failed++;
    }
    
    return {
      verified,
      failed,
      integrity: logs.length > 0 ? (verified / logs.length) * 100 : 100
    };
  }
}

export default AuditLogger;