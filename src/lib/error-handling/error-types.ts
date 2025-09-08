/**
 * Comprehensive error types and classifications for the platform
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',        // Minor issues that don't affect functionality
  MEDIUM = 'MEDIUM',  // Issues that may affect some functionality
  HIGH = 'HIGH',      // Critical issues affecting core functionality
  CRITICAL = 'CRITICAL' // System-breaking issues requiring immediate attention
}

// Error categories
export enum ErrorCategory {
  // Authentication & Authorization
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SESSION = 'SESSION',
  MFA = 'MFA',
  
  // Data & Validation
  VALIDATION = 'VALIDATION',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  ENCRYPTION = 'ENCRYPTION',
  
  // Database & Storage
  DATABASE = 'DATABASE',
  FILE_STORAGE = 'FILE_STORAGE',
  CACHE = 'CACHE',
  
  // External Services
  API_EXTERNAL = 'API_EXTERNAL',
  WEBHOOK = 'WEBHOOK',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  
  // System
  SYSTEM = 'SYSTEM',
  CONFIGURATION = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  RESOURCE_LIMIT = 'RESOURCE_LIMIT',
  
  // Business Logic
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  WORKFLOW = 'WORKFLOW',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Security
  SECURITY = 'SECURITY',
  HIPAA_VIOLATION = 'HIPAA_VIOLATION',
  DATA_BREACH = 'DATA_BREACH',
  
  // Client
  CLIENT = 'CLIENT',
  BROWSER = 'BROWSER',
  NETWORK_CLIENT = 'NETWORK_CLIENT',
}

// Base error class with enhanced tracking
export class AppError extends Error {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly requestId?: string;
  public readonly stackTrace?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.id = this.generateErrorId();
    this.timestamp = new Date();
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.stackTrace = this.stack;
    
    // Ensure prototype chain is properly set
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      message: this.message,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      ...(process.env.NODE_ENV === 'development' && { stackTrace: this.stackTrace }),
    };
  }
}

// Specific error classes
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      401,
      true,
      context
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      403,
      true,
      context
    );
  }
}

export class ValidationError extends AppError {
  public readonly validationErrors?: any[];

  constructor(message: string, validationErrors?: any[], context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      true,
      context
    );
    this.validationErrors = validationErrors;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      true,
      { ...context, originalError }
    );
  }
}

export class HIPAAViolationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.HIPAA_VIOLATION,
      ErrorSeverity.CRITICAL,
      500,
      false, // Not operational - requires immediate attention
      context
    );
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.LOW,
      429,
      true,
      context
    );
    this.retryAfter = retryAfter;
  }
}

export class SecurityError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      403,
      false, // Not operational - security issues require investigation
      context
    );
  }
}

export class SessionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.SESSION,
      ErrorSeverity.MEDIUM,
      401,
      true,
      context
    );
  }
}

export class MFAError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.MFA,
      ErrorSeverity.HIGH,
      403,
      true,
      context
    );
  }
}

export class EncryptionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCategory.ENCRYPTION,
      ErrorSeverity.CRITICAL,
      500,
      false, // Encryption errors are critical
      context
    );
  }
}

export class ExternalAPIError extends AppError {
  public readonly service?: string;
  public readonly endpoint?: string;

  constructor(
    message: string,
    service?: string,
    endpoint?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorCategory.API_EXTERNAL,
      ErrorSeverity.MEDIUM,
      502,
      true,
      context
    );
    this.service = service;
    this.endpoint = endpoint;
  }
}

export class ResourceLimitError extends AppError {
  public readonly resourceType?: string;
  public readonly limit?: number;
  public readonly current?: number;

  constructor(
    message: string,
    resourceType?: string,
    limit?: number,
    current?: number,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorCategory.RESOURCE_LIMIT,
      ErrorSeverity.MEDIUM,
      507,
      true,
      context
    );
    this.resourceType = resourceType;
    this.limit = limit;
    this.current = current;
  }
}

// Error code mappings for consistent error responses
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH001',
  AUTH_TOKEN_EXPIRED: 'AUTH002',
  AUTH_TOKEN_INVALID: 'AUTH003',
  AUTH_ACCOUNT_LOCKED: 'AUTH004',
  AUTH_ACCOUNT_DISABLED: 'AUTH005',
  
  // Authorization
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ001',
  AUTHZ_RESOURCE_NOT_FOUND: 'AUTHZ002',
  AUTHZ_OWNERSHIP_REQUIRED: 'AUTHZ003',
  
  // Validation
  VAL_INVALID_INPUT: 'VAL001',
  VAL_MISSING_FIELD: 'VAL002',
  VAL_INVALID_FORMAT: 'VAL003',
  VAL_OUT_OF_RANGE: 'VAL004',
  
  // Database
  DB_CONNECTION_ERROR: 'DB001',
  DB_QUERY_ERROR: 'DB002',
  DB_CONSTRAINT_VIOLATION: 'DB003',
  DB_DEADLOCK: 'DB004',
  
  // System
  SYS_INTERNAL_ERROR: 'SYS001',
  SYS_SERVICE_UNAVAILABLE: 'SYS002',
  SYS_CONFIGURATION_ERROR: 'SYS003',
  SYS_RESOURCE_EXHAUSTED: 'SYS004',
  
  // Security
  SEC_SUSPICIOUS_ACTIVITY: 'SEC001',
  SEC_HIPAA_VIOLATION: 'SEC002',
  SEC_DATA_BREACH: 'SEC003',
  SEC_ENCRYPTION_FAILURE: 'SEC004',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE001',
  RATE_LIMIT_QUOTA_EXCEEDED: 'RATE002',
} as const;

// Type for error codes
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Error response interface
export interface ErrorResponse {
  error: {
    id: string;
    code: ErrorCode;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: Date;
    details?: any;
    stackTrace?: string;
  };
  meta?: {
    requestId?: string;
    sessionId?: string;
    userId?: string;
  };
}