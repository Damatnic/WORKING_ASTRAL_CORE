// Central exports for all types in the application
// This makes imports easier: import { UserRole, CounselorStats } from '@/types'

// Prisma types and enums (core database types)
export type {
  UserRole,
  AdminLevel,
  RiskLevel,
  SessionType,
  SessionCategory,
  TherapySessionStatus,
  NoteType,
  SessionStatus,
  User,
  Session,
  CrisisReport,
  MoodEntry,
  JournalEntry,
  SafetyPlan,
  Notification,
  HelperProfile,
  ClientStatus
} from './prisma';

// Export API types with no conflicts
export type {
  ApiResponse,
  UserProfileUpdateRequest,
  WellnessGoal,
  WellnessGoalCreateRequest,
  WellnessGoalUpdateRequest,
  NotificationPreferences,
  FileUploadRequest,
  FileVersion,
  SearchFilters,
  TherapySession,
  TherapyBilling,
  SystemMetrics,
  UserAnalytics,
  AccessibleSkipLinkProps,
  AccessibleAlertProps,
  LoadingStage,
  Message,
  MessageReaction
} from './api';

// Export API functions (these are not types, so they need regular export)
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse
} from './api';

// Crisis types (use crisis.ts as the primary source)
export type {
  CounselorDashboardResponse,
  CounselorStats,
  AlertResponse,
  ReportResponse,
  InterventionResponse,
  EscalationResponse,
  CreateReportRequest as CrisisCreateReportRequest,
  UpdateReportRequest as CrisisUpdateReportRequest,
  ReportFilters as CrisisReportFilters,
  PaginatedResponse,
  CrisisSeverity,
  TriggerType,
  InterventionType,
  ReportStatus,
  CrisisResponse,
  ValidationError as CrisisValidationError,
  CrisisAlert,
  CrisisAlertPayload,
  SafetyPlanSection,
  CreateSafetyPlanRequest,
  UpdateSafetyPlanRequest,
  SafetyPlanResponse
} from './crisis';

// WebSocket types
export * from './websocket';

// Community types
export * from './community';

// NextAuth extensions
export * from './next-auth';

// Component prop types
export interface LoadingProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal' | 'dots';
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Base utility types
export type UUID = string;
export type Timestamp = Date | string;
export type Email = string;
export type PhoneNumber = string;

// Base entity interface
export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Common utility types
export type WithId<T> = T & { id: string };
export type WithTimestamps<T> = T & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Form types
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  value: T;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: T) => string | undefined;
}

export interface FormState {
  fields: Record<string, FormField>;
  isSubmitting: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

// Response wrapper types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Environment types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  OPENAI_API_KEY?: string;
  REDIS_URL?: string;
  ENCRYPTION_KEY: string;
}

// Feature flags
export interface FeatureFlags {
  enableChat: boolean;
  enableCrisisIntervention: boolean;
  enableTherapistBooking: boolean;
  enableAnalytics: boolean;
  enableAI: boolean;
  enableOfflineMode: boolean;
}