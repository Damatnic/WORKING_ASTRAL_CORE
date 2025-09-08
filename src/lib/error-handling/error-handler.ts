import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  ErrorResponse,
  ERROR_CODES,
  HIPAAViolationError,
  SecurityError,
  DatabaseError,
} from './error-types';
import { logger } from './logger';

// Error handler configuration
interface ErrorHandlerConfig {
  logToConsole: boolean;
  logToDatabase: boolean;
  logToAudit: boolean;
  notifyAdmins: boolean;
  includeStackTrace: boolean;
  sanitizeErrors: boolean;
}

// Default configuration
const defaultConfig: ErrorHandlerConfig = {
  logToConsole: process.env.NODE_ENV !== 'production',
  logToDatabase: true,
  logToAudit: true,
  notifyAdmins: true,
  includeStackTrace: process.env.NODE_ENV === 'development',
  sanitizeErrors: process.env.NODE_ENV === 'production',
};

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private errorQueue: AppError[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startErrorProcessor();
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error and return appropriate response
   */
  async handleError(
    error: Error | AppError,
    request?: NextRequest,
    context?: Record<string, any>
  ): Promise<NextResponse> {
    // Convert to AppError if needed
    const appError = this.normalizeError(error, context);

    // Add request context
    if (request) {
      appError.requestId = request.headers.get('x-request-id') || undefined;
      appError.userId = context?.userId;
      appError.sessionId = context?.sessionId;
    }

    // Log the error
    await this.logError(appError, request);

    // Handle critical errors
    if (this.isCriticalError(appError)) {
      await this.handleCriticalError(appError, request);
    }

    // Create error response
    const response = this.createErrorResponse(appError);

    return NextResponse.json(response, { status: appError.statusCode });
  }

  /**
   * Handle error without returning response (for background processes)
   */
  async logError(
    error: Error | AppError,
    request?: NextRequest
  ): Promise<void> {
    const appError = this.normalizeError(error);

    // Console logging
    if (this.config.logToConsole) {
      this.logToConsole(appError);
    }

    // Database logging
    if (this.config.logToDatabase) {
      this.errorQueue.push(appError);
      if (this.errorQueue.length >= this.MAX_QUEUE_SIZE) {
        await this.flushErrorQueue();
      }
    }

    // Audit logging for security-related errors
    if (this.config.logToAudit && this.isSecurityError(appError)) {
      await this.logToAudit(appError, request);
    }

    // Logger service
    logger.error('Application error', {
      error: appError,
      request: request ? {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      } : undefined,
    });
  }

  /**
   * Normalize error to AppError
   */
  private normalizeError(error: Error | AppError, context?: Record<string, any>): AppError {
    if (error instanceof AppError) {
      if (context) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }

    // Handle Prisma errors
    if (this.isPrismaError(error)) {
      return this.handlePrismaError(error, context);
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, context);
    }

    // Default to system error
    return new AppError(
      error.message || 'An unexpected error occurred',
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      500,
      true,
      context
    );
  }

  /**
   * Check if error is Prisma error
   */
  private isPrismaError(error: any): boolean {
    return error.code && error.code.startsWith('P');
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(error: any, context?: Record<string, any>): DatabaseError {
    const prismaErrorMap: Record<string, { message: string; severity: ErrorSeverity }> = {
      P2002: { message: 'Unique constraint violation', severity: ErrorSeverity.MEDIUM },
      P2003: { message: 'Foreign key constraint violation', severity: ErrorSeverity.MEDIUM },
      P2025: { message: 'Record not found', severity: ErrorSeverity.LOW },
      P2024: { message: 'Connection timeout', severity: ErrorSeverity.HIGH },
      P2021: { message: 'Table does not exist', severity: ErrorSeverity.CRITICAL },
    };

    const errorInfo = prismaErrorMap[error.code] || {
      message: 'Database operation failed',
      severity: ErrorSeverity.HIGH,
    };

    const dbError = new DatabaseError(
      errorInfo.message,
      error,
      {
        ...context,
        prismaCode: error.code,
        meta: error.meta,
      }
    );
    dbError.severity = errorInfo.severity;

    return dbError;
  }

  /**
   * Check if error is validation error
   */
  private isValidationError(error: any): boolean {
    return error.name === 'ValidationError' || error.type === 'validation';
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: any, context?: Record<string, any>): AppError {
    return new AppError(
      'Validation failed',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      true,
      {
        ...context,
        validationErrors: error.errors || error.details,
      }
    );
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: AppError): boolean {
    return (
      error.severity === ErrorSeverity.CRITICAL ||
      error instanceof HIPAAViolationError ||
      error instanceof SecurityError ||
      !error.isOperational
    );
  }

  /**
   * Check if error is security-related
   */
  private isSecurityError(error: AppError): boolean {
    return [
      ErrorCategory.SECURITY,
      ErrorCategory.HIPAA_VIOLATION,
      ErrorCategory.DATA_BREACH,
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
    ].includes(error.category);
  }

  /**
   * Handle critical errors
   */
  private async handleCriticalError(error: AppError, request?: NextRequest): Promise<void> {
    // Immediate database logging
    await this.logToDatabase(error);

    // Notify administrators
    if (this.config.notifyAdmins) {
      await this.notifyAdministrators(error, request);
    }

    // Create incident report
    await this.createIncidentReport(error, request);

    // For HIPAA violations, trigger compliance workflow
    if (error instanceof HIPAAViolationError) {
      await this.handleHIPAAViolation(error, request);
    }
  }

  /**
   * Log error to console
   */
  private logToConsole(error: AppError): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${error.severity}] [${error.category}] ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logMessage, error);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ ERROR:', logMessage, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ WARNING:', logMessage, error);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ INFO:', logMessage, error);
        break;
    }
  }

  /**
   * Log error to database
   */
  private async logToDatabase(error: AppError): Promise<void> {
    try {
      await (prisma as any).errorLog.create({
        data: {
          errorId: error.id,
          message: error.message,
          category: error.category,
          severity: error.severity,
          statusCode: error.statusCode,
          isOperational: error.isOperational,
          context: error.context || {},
          userId: error.userId,
          sessionId: error.sessionId,
          requestId: error.requestId,
          stackTrace: error.stackTrace,
          timestamp: error.timestamp,
        },
      });
    } catch (dbError) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', dbError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log to audit service
   */
  private async logToAudit(error: AppError, request?: NextRequest): Promise<void> {
    const category = this.mapErrorToAuditCategory(error.category);
    const riskLevel = this.mapSeverityToRiskLevel(error.severity);

    await auditService.logEvent({
      category,
      action: 'ERROR_OCCURRED',
      outcome: AuditOutcome.FAILURE,
      riskLevel,
      description: error.message,
      userId: error.userId,
      sessionId: error.sessionId,
      sourceIp: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip'),
      userAgent: request?.headers.get('user-agent'),
      errorDetails: {
        
        errorCode: error.category,
        errorMessage: error.message,
        context: error.context,
      },
    });
  }

  /**
   * Map error category to audit category
   */
  private mapErrorToAuditCategory(category: ErrorCategory): AuditEventCategory {
    const mapping: Partial<Record<ErrorCategory, AuditEventCategory>> = {
      [ErrorCategory.AUTHENTICATION]: AuditEventCategory.LOGIN_FAILURE,
      [ErrorCategory.AUTHORIZATION]: AuditEventCategory.UNAUTHORIZED_ACCESS,
      [ErrorCategory.SECURITY]: AuditEventCategory.SUSPICIOUS_ACTIVITY,
      [(ErrorCategory as any).HIPAA_VIOLATION]: (AuditEventCategory as any).HIPAA_VIOLATION,
      [(ErrorCategory as any).DATA_BREACH]: (AuditEventCategory as any).DATA_BREACH,
      [ErrorCategory.MFA]: AuditEventCategory.MFA_FAILURE,
      [ErrorCategory.SESSION]: AuditEventCategory.SESSION_TERMINATED,
    };

    return mapping[category] || (AuditEventCategory as any).SYSTEM_ERROR;
  }

  /**
   * Map severity to risk level
   */
  private mapSeverityToRiskLevel(severity: ErrorSeverity): RiskLevel {
    const mapping: Record<ErrorSeverity, RiskLevel> = {
      [ErrorSeverity.CRITICAL]: RiskLevel.CRITICAL,
      [ErrorSeverity.HIGH]: RiskLevel.HIGH,
      [ErrorSeverity.MEDIUM]: RiskLevel.MEDIUM,
      [ErrorSeverity.LOW]: RiskLevel.LOW,
    };

    return mapping[severity];
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: AppError): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        id: error.id,
        code: ERROR_CODES.SYS_INTERNAL_ERROR,
        message: this.config.sanitizeErrors ? this.sanitizeMessage(error.message) : error.message,
        category: error.category,
        severity: error.severity,
        timestamp: error.timestamp,
      },
      meta: {
        requestId: error.requestId,
        sessionId: error.sessionId,
        userId: error.userId,
      },
    };

    // Include stack trace in development
    if (this.config.includeStackTrace && error.stackTrace) {
      response.error.stackTrace = error.stackTrace;
    }

    // Include additional details if not sanitizing
    if (!this.config.sanitizeErrors && error.context) {
      response.error.details = error.context;
    }

    return response;
  }

  /**
   * Sanitize error message for production
   */
  private sanitizeMessage(message: string): string {
    // Remove sensitive information from error messages
    const sensitivePatterns = [
      /user\s+id\s*[:=]\s*[\w-]+/gi,
      /email\s*[:=]\s*[\w@.-]+/gi,
      /token\s*[:=]\s*[\w-]+/gi,
      /password\s*[:=]\s*[\w]+/gi,
      /api[_-]?key\s*[:=]\s*[\w-]+/gi,
    ];

    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Notify administrators of critical errors
   */
  private async notifyAdministrators(error: AppError, request?: NextRequest): Promise<void> {
    try {
      // Get admin users
      const admins = await prisma.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN'],
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
        },
      });

      // Create notifications for each admin
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'CRITICAL_ERROR',
            title: `Critical Error: ${error.category}`,
            message: `A critical error occurred: ${error.message}`,
            priority: 'URGENT',
            data: {
              errorId: error.id,
              category: error.category,
              severity: error.severity,
              timestamp: error.timestamp,
            },
          },
        });
      }

      // TODO: Send email notifications
    } catch (notifyError) {
      console.error('Failed to notify administrators:', notifyError);
    }
  }

  /**
   * Create incident report for critical errors
   */
  private async createIncidentReport(error: AppError, request?: NextRequest): Promise<void> {
    try {
      await (prisma as any).incidentReport.create({
        data: {
          errorId: error.id,
          category: error.category,
          severity: error.severity,
          title: `${error.category}: ${error.message}`,
          description: error.message,
          impact: this.assessImpact(error),
          status: 'OPEN',
          priority: error.severity === ErrorSeverity.CRITICAL ? 'CRITICAL' : 'HIGH',
          context: {
            ...error.context,
            requestInfo: request ? {
              method: request.method,
              url: request.url,
              headers: Object.fromEntries(request.headers.entries()),
            } : undefined,
          },
          createdAt: error.timestamp,
        },
      });
    } catch (reportError) {
      console.error('Failed to create incident report:', reportError);
    }
  }

  /**
   * Handle HIPAA violations
   */
  private async handleHIPAAViolation(error: HIPAAViolationError, request?: NextRequest): Promise<void> {
    // Log to compliance audit
    await auditService.logEvent({
      category: (AuditEventCategory as any).HIPAA_VIOLATION,
      action: 'HIPAA_VIOLATION_DETECTED',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.CRITICAL,
      description: error.message,
      userId: error.userId,
      sessionId: error.sessionId,
      sourceIp: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip'),
      userAgent: request?.headers.get('user-agent'),
      metadata: {
        errorId: error.id,
        violationType: error.context?.violationType,
        affectedData: error.context?.affectedData,
        remediationRequired: true,
      },
    });

    // Create compliance task
    await (prisma as any).complianceTask.create({
      data: {
        type: 'HIPAA_VIOLATION_REVIEW',
        priority: 'CRITICAL',
        title: `Review HIPAA Violation: ${error.id}`,
        description: error.message,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        assignedTo: 'COMPLIANCE_OFFICER',
        metadata: {
          errorId: error.id,
          context: error.context,
        },
      },
    });
  }

  /**
   * Assess impact of error
   */
  private assessImpact(error: AppError): string {
    if (error.severity === ErrorSeverity.CRITICAL) {
      return 'System-wide impact, immediate action required';
    }
    if (error.severity === ErrorSeverity.HIGH) {
      return 'Significant functionality affected';
    }
    if (error.severity === ErrorSeverity.MEDIUM) {
      return 'Partial functionality affected';
    }
    return 'Minor impact on user experience';
  }

  /**
   * Process error queue
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await (prisma as any).errorLog.createMany({
        data: errors.map(error => ({
          errorId: error.id,
          message: error.message,
          category: error.category,
          severity: error.severity,
          statusCode: error.statusCode,
          isOperational: error.isOperational,
          context: error.context || {},
          userId: error.userId,
          sessionId: error.sessionId,
          requestId: error.requestId,
          stackTrace: error.stackTrace,
          timestamp: error.timestamp,
        })),
      });
    } catch (error) {
      console.error('Failed to flush error queue:', error);
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...errors);
    }
  }

  /**
   * Start error processor
   */
  private startErrorProcessor(): void {
    // Flush error queue periodically
    setInterval(() => {
      this.flushErrorQueue().catch(console.error);
    }, 30000); // Every 30 seconds

    // Handle process termination
    process.on('beforeExit', () => {
      this.flushErrorQueue().catch(console.error);
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();