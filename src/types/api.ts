// Import types from crisis to avoid duplication
import { CrisisSeverity, TriggerType, ReportStatus, PaginatedResponse } from './crisis';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: any;
}

// PaginatedResponse imported from crisis.ts to avoid duplication

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  severity: CrisisSeverity;
  type: TriggerType;
  location?: string;
  anonymous: boolean;
  contactInfo?: string;
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  severity?: CrisisSeverity;
  status?: ReportStatus;
  assignedTo?: string;
}

export interface CrisisResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ReportResponse {
  id: string;
  title: string;
  description: string;
  severity: CrisisSeverity;
  type: TriggerType;
  status: ReportStatus;
  location?: string;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
}

// Crisis Management Types
// Import CrisisSeverity from crisis.ts to avoid duplication

// TriggerType imported from crisis.ts to avoid duplication

// ReportStatus imported from crisis.ts to avoid duplication

export interface ReportFilters {
  severity?: CrisisSeverity[];
  type?: TriggerType[];
  status?: ReportStatus[];
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
}

// Counselor Dashboard Types
export interface CounselorStats {
  totalReports: number;
  activeReports: number;
  resolvedToday: number;
  averageResponseTime: number;
  escalationRate: number;
}

export interface AlertResponse {
  id: string;
  type: string;
  severity: CrisisSeverity;
  message: string;
  timestamp: string;
  location?: string;
  userId?: string;
}

export interface InterventionResponse {
  id: string;
  reportId: string;
  type: string;
  status: string;
  startedAt: string;
  counselorId: string;
  notes?: string;
}

export interface EscalationResponse {
  id: string;
  reportId: string;
  reason: string;
  escalatedTo: string;
  escalatedAt: string;
  priority: 'HIGH' | 'CRITICAL';
}

export interface CounselorDashboardResponse {
  stats: CounselorStats;
  activeAlerts: AlertResponse[];
  recentInterventions: InterventionResponse[];
  pendingEscalations: EscalationResponse[];
}

// User Profile Types
export interface UserProfileUpdateRequest {
  mentalHealthGoals?: string[];
  interestedTopics?: string[];
  preferredCommunication?: string[];
  crisisContacts?: any;
  medicalHistory?: string;
  address?: string;
}

// Wellness Types
export interface WellnessGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  milestones: string[];
  progress: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface WellnessGoalCreateRequest {
  title: string;
  description: string;
  category: string;
  targetDate: string;
  milestones: string[];
}

export interface WellnessGoalUpdateRequest {
  title?: string;
  description?: string;
  category?: string;
  targetDate?: string;
  milestones?: string[];
  progress?: number;
  status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
}

// Notification Types
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  crisis: boolean;
  marketing: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER';
  crisisOverride: boolean;
}

// File Management Types
export interface FileUploadRequest {
  file: File;
  category: string;
  isPublic: boolean;
  metadata?: Record<string, any>;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  mimeType: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Search Types
export interface SearchFilters {
  query: string;
  type?: string[];
  category?: string[];
  dateFrom?: string;
  dateTo?: string;
  author?: string;
  tags?: string[];
}

// Therapy Types
export interface TherapySession {
  id: string;
  clientId: string;
  therapistId: string;
  scheduledTime: string;
  duration: number;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TherapyBilling {
  id: string;
  sessionId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  insuranceProvider?: string;
  insuranceCoverage?: number;
  createdAt: string;
  updatedAt: string;
}

// Helper Types - ClientStatus and HelperProfile imported from prisma.ts to avoid duplication

// Admin Types
export interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  crisisReports: number;
  serverUptime: number;
  responseTime: number;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  userRetention: number;
  popularFeatures: string[];
  userSatisfaction: number;
}

// UI Component Types
export interface AccessibleSkipLinkProps {
  targetId: string;
  children: React.ReactNode;
}

export interface AccessibleAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: string;
  }>;
  className?: string;
}

// Virtual List Types
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  reactions?: MessageReaction[];
  replies?: Message[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface LoadingStage {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
}

// API Response Helper Functions
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function createErrorResponse(error: string, code?: string, details?: any): ApiResponse {
  return {
    success: false,
    error,
    code,
    details,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1,
    },
  };
}

export function createValidationErrorResponse(errors: ValidationError[]): ApiResponse {
  return {
    success: false,
    error: 'Validation failed',
    message: errors.map(err => `${err.field}: ${err.message}`).join(', '),
  };
}

// All types are already exported above