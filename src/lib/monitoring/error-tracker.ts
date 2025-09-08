/**
 * Error Tracking System
 * Automatic error capture, aggregation, and analysis for Astral Core platform
 */

import { EventEmitter } from 'events';
import { getMonitoringConfig, MonitoringConfig } from './config';
import { auditTrailService } from './audit-trail';
import { alertManager } from './alert-manager';

export interface ErrorInfo {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  type: 'Error' | 'TypeError' | 'ReferenceError' | 'SyntaxError' | 'RangeError' | 'Custom' | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Context information
  url?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  
  // Environment context
  userAgent?: string;
  ipAddress?: string;
  environment: string;
  version: string;
  
  // Application context
  component?: string;
  feature?: string;
  action?: string;
  
  // Error fingerprinting
  fingerprint: string;
  
  // Additional metadata
  metadata: Record<string, any>;
  
  // User impact
  affectedUsers?: number;
  isUserFacing: boolean;
  
  // Resolution tracking
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;
  
  // Related data
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
}

export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'user' | 'http' | 'error' | 'info' | 'debug';
  category?: string;
  message?: string;
  data?: Record<string, any>;
  level: 'info' | 'warning' | 'error';
}

export interface ErrorGroup {
  id: string;
  fingerprint: string;
  message: string;
  type: string;
  component?: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  affectedUsers: Set<string>;
  severity: ErrorInfo['severity'];
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  assignedTo?: string;
  errors: ErrorInfo[];
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  resolvedErrors: number;
  criticalErrors: number;
  errorRate: number;
  averageResolutionTime: number;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastSeen: number;
  }>;
  errorsByComponent: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorTrend: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface ErrorReportConfig {
  beforeSend?: (error: ErrorInfo) => ErrorInfo | null;
  allowUrls?: RegExp[];
  denyUrls?: RegExp[];
  ignoreErrors?: (string | RegExp)[];
  ignoreComponents?: string[];
  maxBreadcrumbs?: number;
  sampleRate?: number;
}

class ErrorTracker extends EventEmitter {
  private config: MonitoringConfig;
  private reportConfig: ErrorReportConfig;
  private errors: Map<string, ErrorInfo> = new Map();
  private errorGroups: Map<string, ErrorGroup> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private isInitialized = false;
  private maxBreadcrumbs = 100;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(reportConfig: ErrorReportConfig = {}) {
    super();
    this.config = getMonitoringConfig();
    this.reportConfig = {
      maxBreadcrumbs: this.config.errorTracking.maxBreadcrumbs,
      sampleRate: this.config.errorTracking.sampleRate,
      ...reportConfig,
    };
    this.maxBreadcrumbs = this.reportConfig.maxBreadcrumbs || 100;
    
    if (this.config.errorTracking.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize error tracking
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Capture unhandled errors
    if (this.config.errorTracking.captureUnhandled) {
      if (typeof window !== 'undefined') {
        // Browser environment
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      } else {
        // Node.js environment
        process.on('uncaughtException', this.handleUncaughtException.bind(this));
        process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
      }
    }

    // Start cleanup timer
    this.startCleanup();

    this.isInitialized = true;
    this.emit('tracker:initialized');
  }

  /**
   * Capture an error manually
   */
  public async captureError(
    error: Error | string,
    context: Partial<Omit<ErrorInfo, 'id' | 'timestamp' | 'fingerprint' | 'breadcrumbs' | 'tags'>> = {}
  ): Promise<ErrorInfo | null> {
    try {
      // Apply sampling
      if (Math.random() > (this.reportConfig.sampleRate || 1)) {
        return null;
      }

      const errorInfo = this.buildErrorInfo(error, context);
      
      // Apply filters
      if (this.shouldIgnoreError(errorInfo)) {
        return null;
      }

      // Apply beforeSend filter
      const filteredError = this.reportConfig.beforeSend 
        ? this.reportConfig.beforeSend(errorInfo)
        : errorInfo;

      if (!filteredError) {
        return null;
      }

      // Store the error
      this.errors.set(filteredError.id, filteredError);
      
      // Update error groups
      this.updateErrorGroup(filteredError);

      // Log to audit trail
      await this.logErrorToAudit(filteredError);

      // Check if alert should be triggered
      await this.checkAlertThresholds(filteredError);

      // Emit event
      this.emit('error:captured', filteredError);

      return filteredError;

    } catch (captureError) {
      console.error('Failed to capture error:', captureError);
      return null;
    }
  }

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Maintain max breadcrumbs limit
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    this.emit('breadcrumb:added', fullBreadcrumb);
  }

  /**
   * Set user context
   */
  public setUser(user: { id?: string; email?: string; username?: string }): void {
    this.addBreadcrumb({
      type: 'user',
      category: 'auth',
      message: 'User context updated',
      data: { userId: user.id, username: user.username },
      level: 'info',
    });
  }

  /**
   * Set tags
   */
  public setTags(tags: Record<string, string>): void {
    // Store tags for next error
    this.emit('tags:updated', tags);
  }

  /**
   * Get error by ID
   */
  public getError(errorId: string): ErrorInfo | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get error group
   */
  public getErrorGroup(fingerprint: string): ErrorGroup | undefined {
    return this.errorGroups.get(fingerprint);
  }

  /**
   * Get all error groups
   */
  public getErrorGroups(): ErrorGroup[] {
    return Array.from(this.errorGroups.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Get error statistics
   */
  public getStats(timeWindow: number = 24 * 60 * 60 * 1000): ErrorStats {
    const now = Date.now();
    const cutoff = now - timeWindow;
    const previousCutoff = cutoff - timeWindow;

    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp >= cutoff);
    
    const previousErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp >= previousCutoff && error.timestamp < cutoff);

    const uniqueFingerprints = new Set(recentErrors.map(e => e.fingerprint));
    const resolvedErrors = recentErrors.filter(e => e.resolved);
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');

    // Calculate resolution time
    const avgResolutionTime = resolvedErrors.length > 0
      ? resolvedErrors.reduce((sum, error) => 
          sum + ((error.resolvedAt || 0) - error.timestamp), 0) / resolvedErrors.length
      : 0;

    // Top errors by count
    const errorCounts = new Map<string, { message: string; count: number; lastSeen: number }>();
    recentErrors.forEach(error => {
      const existing = errorCounts.get(error.fingerprint);
      if (existing) {
        existing.count++;
        existing.lastSeen = Math.max(existing.lastSeen, error.timestamp);
      } else {
        errorCounts.set(error.fingerprint, {
          message: error.message,
          count: 1,
          lastSeen: error.timestamp,
        });
      }
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([fingerprint, data]) => ({ fingerprint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group by component
    const errorsByComponent = recentErrors.reduce((acc, error) => {
      const component = error.component || 'unknown';
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by severity
    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: recentErrors.length,
      uniqueErrors: uniqueFingerprints.size,
      resolvedErrors: resolvedErrors.length,
      criticalErrors: criticalErrors.length,
      errorRate: recentErrors.length / (timeWindow / (60 * 1000)), // errors per minute
      averageResolutionTime: avgResolutionTime,
      topErrors,
      errorsByComponent,
      errorsBySeverity,
      errorTrend: {
        current: recentErrors.length,
        previous: previousErrors.length,
        change: recentErrors.length - previousErrors.length,
      },
    };
  }

  /**
   * Mark error as resolved
   */
  public async resolveError(errorId: string, resolvedBy: string, resolution?: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error || error.resolved) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = Date.now();
    error.resolvedBy = resolvedBy;
    error.resolution = resolution;

    // Update error group
    const group = this.errorGroups.get(error.fingerprint);
    if (group) {
      group.status = 'resolved';
    }

    // Log resolution
    await auditTrailService.logEvent({
      eventType: 'system_event',
      action: 'error_resolved',
      outcome: 'success',
      description: `Error resolved: ${error.message}`,
      details: {
        errorId: error.id,
        fingerprint: error.fingerprint,
        resolvedBy,
        resolution,
        resolutionTime: error.resolvedAt - error.timestamp,
      },
    });

    this.emit('error:resolved', error);
    return true;
  }

  /**
   * Build error info from error object
   */
  private buildErrorInfo(
    error: Error | string,
    context: Partial<ErrorInfo> = {}
  ): ErrorInfo {
    const isErrorObject = error instanceof Error;
    const message = isErrorObject ? error.message : String(error);
    const stack = isErrorObject ? error.stack : undefined;
    const type = isErrorObject ? error.constructor.name : 'Custom';

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message,
      stack,
      type,
      severity: this.determineSeverity(message, stack, context),
      fingerprint: this.generateFingerprint(message, stack, context),
      environment: this.config.errorTracking.environment,
      version: process.env.npm_package_version || '1.0.0',
      isUserFacing: this.isUserFacingError(message, context),
      resolved: false,
      breadcrumbs: [...this.breadcrumbs],
      tags: {},
      metadata: {},
      ...context,
    };

    return errorInfo;
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(
    message: string,
    stack?: string,
    context: Partial<ErrorInfo> = {}
  ): string {
    // Create a consistent fingerprint for error grouping
    const components = [
      message.replace(/\d+/g, 'N'), // Replace numbers with N
      context.type || 'Error',
      context.component || 'unknown',
      stack ? stack.split('\n')[1]?.trim() : '', // First stack frame
    ];

    return Buffer.from(components.join('|')).toString('base64').substring(0, 16);
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    message: string,
    stack?: string,
    context: Partial<ErrorInfo> = {}
  ): ErrorInfo['severity'] {
    if (context.severity) return context.severity;

    // Critical errors
    if (
      message.toLowerCase().includes('database') ||
      message.toLowerCase().includes('connection') ||
      message.toLowerCase().includes('timeout') ||
      context.statusCode === 500
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.toLowerCase().includes('authentication') ||
      message.toLowerCase().includes('authorization') ||
      context.statusCode === 401 ||
      context.statusCode === 403
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      context.statusCode && context.statusCode >= 400 ||
      message.toLowerCase().includes('validation')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if error is user-facing
   */
  private isUserFacingError(message: string, context: Partial<ErrorInfo> = {}): boolean {
    if (context.isUserFacing !== undefined) return context.isUserFacing;
    
    // Check if it's a client-side error or API error with status code
    return !!(context.url || context.endpoint || context.statusCode);
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: ErrorInfo): boolean {
    // Check ignore patterns
    if (this.reportConfig.ignoreErrors) {
      for (const pattern of this.reportConfig.ignoreErrors) {
        if (typeof pattern === 'string') {
          if (error.message.includes(pattern)) return true;
        } else if (pattern instanceof RegExp) {
          if (pattern.test(error.message)) return true;
        }
      }
    }

    // Check ignore components
    if (this.reportConfig.ignoreComponents && error.component) {
      if (this.reportConfig.ignoreComponents.includes(error.component)) return true;
    }

    // Check URL filters
    if (error.url) {
      if (this.reportConfig.denyUrls) {
        for (const pattern of this.reportConfig.denyUrls) {
          if (pattern.test(error.url)) return true;
        }
      }

      if (this.reportConfig.allowUrls) {
        let allowed = false;
        for (const pattern of this.reportConfig.allowUrls) {
          if (pattern.test(error.url)) {
            allowed = true;
            break;
          }
        }
        if (!allowed) return true;
      }
    }

    return false;
  }

  /**
   * Update error group statistics
   */
  private updateErrorGroup(error: ErrorInfo): void {
    let group = this.errorGroups.get(error.fingerprint);

    if (!group) {
      group = {
        id: this.generateGroupId(),
        fingerprint: error.fingerprint,
        message: error.message,
        type: error.type,
        component: error.component,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        count: 0,
        affectedUsers: new Set(),
        severity: error.severity,
        status: 'new',
        errors: [],
        trends: {
          hourly: new Array(24).fill(0),
          daily: new Array(30).fill(0),
          weekly: new Array(52).fill(0),
        },
      };
      this.errorGroups.set(error.fingerprint, group);
    }

    // Update group
    group.lastSeen = error.timestamp;
    group.count++;
    group.errors.push(error);

    if (error.userId) {
      group.affectedUsers.add(error.userId);
    }

    // Update severity if higher
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    if (severityLevels[error.severity] > severityLevels[group.severity]) {
      group.severity = error.severity;
    }

    // Update trends
    const now = new Date();
    const hourIndex = now.getHours();
    const dayIndex = now.getDate() - 1;
    const weekIndex = this.getWeekOfYear(now) - 1;

    group.trends.hourly[hourIndex]++;
    group.trends.daily[dayIndex]++;
    group.trends.weekly[weekIndex % 52]++;

    // Limit errors per group
    if (group.errors.length > 100) {
      group.errors = group.errors.slice(-100);
    }
  }

  /**
   * Log error to audit trail
   */
  private async logErrorToAudit(error: ErrorInfo): Promise<void> {
    await auditTrailService.logEvent({
      eventType: 'system_event',
      action: 'error_captured',
      outcome: 'failure',
      description: `Error captured: ${error.message}`,
      endpoint: error.endpoint,
      method: error.method,
      userId: error.userId,
      sessionId: error.sessionId,
      ipAddress: error.ipAddress,
      userAgent: error.userAgent,
      details: {
        errorId: error.id,
        fingerprint: error.fingerprint,
        type: error.type,
        severity: error.severity,
        component: error.component,
        stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined,
      },
      logLevel: error.severity === 'critical' ? 'critical' : 
                error.severity === 'high' ? 'error' : 'warning',
    });
  }

  /**
   * Check if alert should be triggered
   */
  private async checkAlertThresholds(error: ErrorInfo): Promise<void> {
    // Critical errors always trigger alerts
    if (error.severity === 'critical') {
      await alertManager.createAlert({
        type: 'critical_error',
        severity: 'critical',
        title: `Critical Error: ${error.message}`,
        message: `Critical error in ${error.component || 'unknown component'}: ${error.message}`,
        source: 'error-tracker',
        metadata: {
          errorId: error.id,
          fingerprint: error.fingerprint,
          component: error.component,
          endpoint: error.endpoint,
        },
      });
    }

    // Check error rate thresholds
    const stats = this.getStats(300000); // Last 5 minutes
    if (stats.errorRate > 10) { // More than 10 errors per minute
      await alertManager.createAlert({
        type: 'high_error_rate',
        severity: 'error',
        title: 'High Error Rate Detected',
        message: `Error rate is ${stats.errorRate.toFixed(1)} errors/minute`,
        source: 'error-tracker',
        metadata: {
          errorRate: stats.errorRate,
          totalErrors: stats.totalErrors,
          timeWindow: '5 minutes',
        },
      });
    }

    // Check for error spikes
    const group = this.errorGroups.get(error.fingerprint);
    if (group && group.count >= 10) {
      const recent = group.errors.filter(e => Date.now() - e.timestamp < 300000);
      if (recent.length >= 5) {
        await alertManager.createAlert({
          type: 'error_spike',
          severity: 'warning',
          title: `Error Spike: ${group.message}`,
          message: `${recent.length} occurrences of "${group.message}" in the last 5 minutes`,
          source: 'error-tracker',
          metadata: {
            fingerprint: group.fingerprint,
            recentCount: recent.length,
            totalCount: group.count,
          },
        });
      }
    }
  }

  /**
   * Handle global error (browser)
   */
  private handleGlobalError(event: ErrorEvent): void {
    this.captureError(event.error || event.message, {
      url: event.filename,
      metadata: {
        lineno: event.lineno,
        colno: event.colno,
      },
      isUserFacing: true,
    });
  }

  /**
   * Handle unhandled promise rejection
   */
  private handleUnhandledRejection(event: any): void {
    const error = event.reason || event;
    this.captureError(error, {
      type: 'UnhandledPromiseRejection',
      severity: 'high',
    });
  }

  /**
   * Handle uncaught exception (Node.js)
   */
  private handleUncaughtException(error: Error): void {
    this.captureError(error, {
      severity: 'critical',
      type: 'UncaughtException',
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique group ID
   */
  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up old errors
   */
  private cleanup(): void {
    const retentionTime = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoff = Date.now() - retentionTime;

    // Clean up old errors
    for (const [id, error] of this.errors) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
      }
    }

    // Clean up error groups with no recent errors
    for (const [fingerprint, group] of this.errorGroups) {
      group.errors = group.errors.filter(error => error.timestamp >= cutoff);
      if (group.errors.length === 0) {
        this.errorGroups.delete(fingerprint);
      } else {
        // Update group stats
        group.count = group.errors.length;
        group.firstSeen = Math.min(...group.errors.map(e => e.timestamp));
        group.lastSeen = Math.max(...group.errors.map(e => e.timestamp));
      }
    }

    // Clean up old breadcrumbs
    this.breadcrumbs = this.breadcrumbs.filter(b => Date.now() - b.timestamp < 60 * 60 * 1000);
  }

  /**
   * Destroy the tracker
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Remove error listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError.bind(this));
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    } else {
      process.removeListener('uncaughtException', this.handleUncaughtException.bind(this));
      process.removeListener('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    this.isInitialized = false;
    this.emit('tracker:destroyed');
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Express middleware for automatic error capture
export const errorTrackingMiddleware = (error: any, req: any, res: any, next: any) => {
  errorTracker.captureError(error, {
    endpoint: req.path || req.url,
    method: req.method,
    statusCode: res.statusCode,
    userId: req.user?.id,
    sessionId: req.sessionID,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection.remoteAddress,
    component: 'api',
    metadata: {
      body: req.body,
      query: req.query,
      params: req.params,
    },
  });

  next(error);
};

// Next.js error boundary helper
export const withErrorTracking = (Component: any) => {
  return class extends Component {
    componentDidCatch(error: Error, errorInfo: any) {
      errorTracker.captureError(error, {
        component: Component.name,
        metadata: {
          componentStack: errorInfo.componentStack,
        },
        isUserFacing: true,
      });
      
      if (super.componentDidCatch) {
        super.componentDidCatch(error, errorInfo);
      }
    }
  };
};

export type {
  ErrorInfo,
  ErrorGroup,
  ErrorStats,
  Breadcrumb,
  ErrorReportConfig,
};

export default errorTracker;