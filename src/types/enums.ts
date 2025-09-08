// Missing Enum Definitions for Astral Core Mental Health Platform
// These enums are referenced throughout the codebase but were not defined

// User Role Enum (matching Prisma schema)
export enum UserRole {
  USER = 'USER',
  HELPER = 'HELPER',
  THERAPIST = 'THERAPIST',
  CRISIS_COUNSELOR = 'CRISIS_COUNSELOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Audit and Logging Enums
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

// Multi-Factor Authentication Methods
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes',
  HARDWARE_TOKEN = 'hardware_token'
}

// Crisis Management Enums
export enum CrisisTrigger {
  SELF_HARM = 'self_harm',
  SUICIDE_IDEATION = 'suicide_ideation',
  SUBSTANCE_ABUSE = 'substance_abuse',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  MENTAL_HEALTH_EMERGENCY = 'mental_health_emergency',
  PANIC_ATTACK = 'panic_attack',
  PSYCHOTIC_EPISODE = 'psychotic_episode',
  EATING_DISORDER = 'eating_disorder',
  TRAUMA_RESPONSE = 'trauma_response',
  OTHER = 'other'
}

export enum CrisisStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed'
}

// Note: CrisisSeverity is already defined in crisis.ts, so we'll use that one

// Session and Authentication Enums
export enum UserSessionStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  LOCKED = 'locked'
}

export enum AuthEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_BLOCKED = 'login_blocked',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_FAILED = 'mfa_failed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

// Notification and Communication Enums
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  CRISIS_ALERT = 'crisis_alert',
  APPOINTMENT = 'appointment',
  MESSAGE = 'message',
  SYSTEM = 'system'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  PHONE_CALL = 'phone_call'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read'
}

// Wellness and Health Tracking Enums
export enum MoodLevel {
  VERY_LOW = 1,
  LOW = 2,
  MODERATE = 3,
  GOOD = 4,
  VERY_GOOD = 5
}

export enum AnxietyLevel {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3,
  PANIC = 4
}

export enum EnergyLevel {
  EXHAUSTED = 1,
  LOW = 2,
  MODERATE = 3,
  HIGH = 4,
  ENERGETIC = 5
}

// Therapy and Treatment Enums
export enum TherapySessionType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  FAMILY = 'family',
  COUPLES = 'couples',
  CONSULTATION = 'consultation',
  ASSESSMENT = 'assessment'
}

export enum TherapySessionStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export enum TherapySessionFormat {
  IN_PERSON = 'in_person',
  VIDEO = 'video',
  PHONE = 'phone',
  CHAT = 'chat'
}

// File and Media Management Enums
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELETED = 'deleted'
}

export enum VirusScanStatus {
  PENDING = 'pending',
  CLEAN = 'clean',
  INFECTED = 'infected',
  ERROR = 'error',
  FAILED = 'failed'
}

// WebSocket and Real-time Communication Enums
export enum WebSocketEventType {
  CONNECTION = 'connection',
  DISCONNECTION = 'disconnection',
  MESSAGE = 'message',
  TYPING = 'typing',
  PRESENCE_UPDATE = 'presence_update',
  CRISIS_ALERT = 'crisis_alert',
  NOTIFICATION = 'notification',
  SYSTEM_UPDATE = 'system_update'
}

// Note: PresenceStatus is already defined in user.ts, so we'll use that one

// Community and Social Features Enums
export enum PostCategory {
  GENERAL = 'general',
  SUPPORT = 'support',
  RESOURCES = 'resources',
  WELLNESS = 'wellness',
  CRISIS = 'crisis',
  THERAPY = 'therapy',
  MEDICATION = 'medication',
  LIFESTYLE = 'lifestyle'
}

export enum ModerationAction {
  WARNING = 'warning',
  MUTE = 'mute',
  TEMPORARY_BAN = 'temporary_ban',
  PERMANENT_BAN = 'permanent_ban',
  CONTENT_REMOVAL = 'content_removal',
  ACCOUNT_SUSPENSION = 'account_suspension'
}

// System and Configuration Enums
export enum SystemConfigCategory {
  SECURITY = 'security',
  FEATURES = 'features',
  LIMITS = 'limits',
  INTEGRATIONS = 'integrations',
  NOTIFICATIONS = 'notifications',
  PERFORMANCE = 'performance'
}

export enum HealthCheckStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum ServiceStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance'
}

// Export all enums as a single object for convenience
export const Enums = {
  UserRole,
  AuditOutcome,
  MFAMethod,
  CrisisTrigger,
  CrisisStatus,
  
  UserSessionStatus,
  AuthEventType,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  MoodLevel,
  AnxietyLevel,
  EnergyLevel,
  TherapySessionType,
  TherapySessionStatus,
  TherapySessionFormat,
  FileType,
  FileStatus,
  VirusScanStatus,
  WebSocketEventType,
  
  PostCategory,
  ModerationAction,
  SystemConfigCategory,
  HealthCheckStatus,
  ServiceStatus
} as const;

// Type helpers for enum values
export type UserRoleType = keyof typeof UserRole;
export type AuditOutcomeType = keyof typeof AuditOutcome;
export type MFAMethodType = keyof typeof MFAMethod;
export type CrisisTriggerType = keyof typeof CrisisTrigger;
export type CrisisStatusType = keyof typeof CrisisStatus;

export type UserSessionStatusType = keyof typeof UserSessionStatus;
export type AuthEventTypeType = keyof typeof AuthEventType;
export type NotificationTypeType = keyof typeof NotificationType;
export type NotificationChannelType = keyof typeof NotificationChannel;
export type NotificationStatusType = keyof typeof NotificationStatus;
export type MoodLevelType = keyof typeof MoodLevel;
export type AnxietyLevelType = keyof typeof AnxietyLevel;
export type EnergyLevelType = keyof typeof EnergyLevel;
export type TherapySessionTypeType = keyof typeof TherapySessionType;
export type TherapySessionStatusType = keyof typeof TherapySessionStatus;
export type TherapySessionFormatType = keyof typeof TherapySessionFormat;
export type FileTypeType = keyof typeof FileType;
export type FileStatusType = keyof typeof FileStatus;
export type VirusScanStatusType = keyof typeof VirusScanStatus;
export type WebSocketEventTypeType = keyof typeof WebSocketEventType;

export type PostCategoryType = keyof typeof PostCategory;
export type ModerationActionType = keyof typeof ModerationAction;
export type SystemConfigCategoryType = keyof typeof SystemConfigCategory;
export type HealthCheckStatusType = keyof typeof HealthCheckStatus;
export type ServiceStatusType = keyof typeof ServiceStatus;