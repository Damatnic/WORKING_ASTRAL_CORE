import { z } from 'zod';

/**
 * HIPAA Compliance Audit Trail Types
 * Defines all audit event types and structures required for HIPAA compliance
 */

// HIPAA audit event categories
export enum AuditEventCategory {
  // Data Access Events
  PHI_ACCESS = 'PHI_ACCESS',
  PHI_MODIFICATION = 'PHI_MODIFICATION',
  PHI_CREATION = 'PHI_CREATION',
  PHI_DELETION = 'PHI_DELETION',
  PHI_EXPORT = 'PHI_EXPORT',
  PHI_IMPORT = 'PHI_IMPORT',

  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_SUCCESS = 'MFA_SUCCESS',
  MFA_FAILURE = 'MFA_FAILURE',

  // Authorization Events
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCESS_CONTROL_VIOLATION = 'ACCESS_CONTROL_VIOLATION',

  // Administrative Events
  USER_CREATED = 'USER_CREATED',
  USER_MODIFIED = 'USER_MODIFIED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SYSTEM_CONFIGURATION_CHANGE = 'SYSTEM_CONFIGURATION_CHANGE',

  // Security Events
  ENCRYPTION_KEY_ROTATION = 'ENCRYPTION_KEY_ROTATION',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  DATA_BREACH_DETECTED = 'DATA_BREACH_DETECTED',
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',

  // System Events
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_DISCONNECTION = 'DATABASE_DISCONNECTION',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',

  // Compliance Events
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS',
  COMPLIANCE_REPORT_GENERATED = 'COMPLIANCE_REPORT_GENERATED',
  DATA_RETENTION_POLICY_APPLIED = 'DATA_RETENTION_POLICY_APPLIED',
  GDPR_REQUEST_PROCESSED = 'GDPR_REQUEST_PROCESSED',

  // Session Events
  SESSION_ACTIVITY = 'SESSION_ACTIVITY',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  
  // Access Control Events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

// Risk levels for audit events
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Outcome of the audited event
export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  UNKNOWN = 'UNKNOWN',
}

// Data sensitivity levels
export enum DataSensitivity {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED', // PHI data
}

// Base audit event structure
export const BaseAuditEventSchema = z.object({
  // Event identification
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  category: z.nativeEnum(AuditEventCategory),
  
  // Event details
  action: z.string(),
  outcome: z.nativeEnum(AuditOutcome),
  riskLevel: z.nativeEnum(RiskLevel),
  description: z.string(),
  
  // Actor information
  userId: z.string().uuid().nullable(),
  userEmail: z.string().email().nullable(),
  userRole: z.string().nullable(),
  sessionId: z.string().uuid().nullable(),
  
  // Source information
  sourceIp: z.string().nullable(),
  userAgent: z.string().nullable(),
  deviceId: z.string().nullable(),
  geolocation: z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).nullable(),
  
  // Target information
  resourceType: z.string().nullable(), // e.g., 'User', 'TherapySession', 'MoodEntry'
  resourceId: z.string().uuid().nullable(),
  resourceOwner: z.string().uuid().nullable(), // Patient/client whose data was accessed
  dataSensitivity: z.nativeEnum(DataSensitivity),
  
  // Technical details
  requestId: z.string().uuid().nullable(),
  apiEndpoint: z.string().nullable(),
  httpMethod: z.string().nullable(),
  httpStatusCode: z.number().nullable(),
  responseTime: z.number().nullable(), // milliseconds
  
  // Additional context
  metadata: z.record(z.string(), z.unknown()).nullable(),
  errorDetails: z.object({
    errorCode: z.string(),
    errorMessage: z.string(),
    stackTrace: z.string().optional(),
  }).nullable(),
  
  // Compliance flags
  requiresNotification: z.boolean().default(false), // For breach notifications
  retentionPeriod: z.number().nullable(), // Days to retain this audit record
  
  // Integrity protection
  checksum: z.string(), // SHA-256 hash of event data
  digitalSignature: z.string().nullable(), // For high-risk events
});

export type BaseAuditEvent = z.infer<typeof BaseAuditEventSchema>;

// Specialized audit event types

// PHI Access Event
export const PHIAccessEventSchema = BaseAuditEventSchema.extend({
  category: z.literal(AuditEventCategory.PHI_ACCESS),
  phiFields: z.array(z.string()), // Which PHI fields were accessed
  accessPurpose: z.enum(['TREATMENT', 'PAYMENT', 'HEALTHCARE_OPERATIONS', 'RESEARCH', 'OTHER']),
  accessJustification: z.string().nullable(),
  queryDetails: z.object({
    query: z.string(),
    filters: z.record(z.string(), z.unknown()),
    resultCount: z.number(),
  }).nullable(),
});

export type PHIAccessEvent = z.infer<typeof PHIAccessEventSchema>;

// Authentication Event
export const AuthenticationEventSchema = BaseAuditEventSchema.extend({
  category: z.enum([
    AuditEventCategory.LOGIN_SUCCESS,
    AuditEventCategory.LOGIN_FAILURE,
    AuditEventCategory.LOGOUT,
    AuditEventCategory.SESSION_TIMEOUT,
  ]),
  authenticationMethod: z.enum(['PASSWORD', 'MFA', 'SSO', 'API_KEY', 'OAUTH']),
  mfaMethod: z.enum(['SMS', 'EMAIL', 'TOTP', 'HARDWARE_TOKEN', 'BIOMETRIC']).nullable(),
  failureReason: z.string().nullable(),
  consecutiveFailures: z.number().nullable(),
  sessionDuration: z.number().nullable(), // For logout events
});

export type AuthenticationEvent = z.infer<typeof AuthenticationEventSchema>;

// Administrative Event
export const AdministrativeEventSchema = BaseAuditEventSchema.extend({
  category: z.enum([
    AuditEventCategory.USER_CREATED,
    AuditEventCategory.USER_MODIFIED,
    AuditEventCategory.USER_DEACTIVATED,
    AuditEventCategory.ROLE_CHANGED,
    AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
  ]),
  targetUserId: z.string().uuid().nullable(),
  targetUserEmail: z.string().email().nullable(),
  changedFields: z.array(z.string()),
  previousValues: z.record(z.string(), z.unknown()).nullable(),
  newValues: z.record(z.string(), z.unknown()).nullable(),
  approvalRequired: z.boolean().default(false),
  approvedBy: z.string().uuid().nullable(),
});

export type AdministrativeEvent = z.infer<typeof AdministrativeEventSchema>;

// Security Event
export const SecurityEventSchema = BaseAuditEventSchema.extend({
  category: z.enum([
    AuditEventCategory.SECURITY_INCIDENT,
    AuditEventCategory.SUSPICIOUS_ACTIVITY,
    AuditEventCategory.BRUTE_FORCE_ATTEMPT,
    AuditEventCategory.DATA_BREACH_DETECTED,
    AuditEventCategory.VULNERABILITY_DETECTED,
  ]),
  threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  incidentId: z.string().uuid().nullable(),
  attackVector: z.string().nullable(),
  affectedResources: z.array(z.string()),
  mitigationActions: z.array(z.string()),
  investigationStatus: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Union type for all audit events
export type AuditEvent = 
  | BaseAuditEvent 
  | PHIAccessEvent 
  | AuthenticationEvent 
  | AdministrativeEvent 
  | SecurityEvent;

// Audit query filters
export const AuditQueryFiltersSchema = z.object({
  // Time range
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  
  // Event filters
  categories: z.array(z.nativeEnum(AuditEventCategory)).optional(),
  outcomes: z.array(z.nativeEnum(AuditOutcome)).optional(),
  riskLevels: z.array(z.nativeEnum(RiskLevel)).optional(),
  
  // Actor filters
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  userRole: z.string().optional(),
  sourceIp: z.string().optional(),
  
  // Resource filters
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  resourceOwner: z.string().uuid().optional(),
  dataSensitivity: z.nativeEnum(DataSensitivity).optional(),
  
  // Search
  searchQuery: z.string().optional(),
  
  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50),
  sortBy: z.string().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;

// Audit statistics
export interface AuditStatistics {
  totalEvents: number;
  eventsByCategory: Record<AuditEventCategory, number>;
  eventsByOutcome: Record<AuditOutcome, number>;
  eventsByRiskLevel: Record<RiskLevel, number>;
  eventsByUser: Array<{
    userId: string;
    userEmail: string;
    eventCount: number;
  }>;
  eventsByResource: Array<{
    resourceType: string;
    eventCount: number;
  }>;
  timeRangeCovered: {
    startDate: string;
    endDate: string;
  };
  complianceMetrics: {
    phiAccessEvents: number;
    failedLogins: number;
    securityIncidents: number;
    dataBreaches: number;
  };
}

// Compliance report structure
export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  generatedBy: {
    userId: string;
    userEmail: string;
    userRole: string;
  };
  statistics: AuditStatistics;
  findings: Array<{
    finding: string;
    severity: RiskLevel;
    recommendation: string;
    affectedEvents: number;
  }>;
  compliance: {
    hipaaCompliant: boolean;
    gdprCompliant: boolean;
    issues: string[];
    recommendations: string[];
  };
  signature: string; // Digital signature for report integrity
}