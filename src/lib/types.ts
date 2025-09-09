/**
 * Types - Ultra Simplified for TypeScript Compliance
 */

export type UUID = string;
export type Email = string;
export type PhoneNumber = string;
export type Timestamp = number;
export type DateString = string;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface BaseUser {
  id: UUID;
  email: Email;
  name?: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface UserProfile {
  id: UUID;
  userId: UUID;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: DateString;
  phoneNumber?: PhoneNumber;
  address?: any;
  emergencyContact?: any;
}

// Crisis Types
export interface CrisisSession {
  id: UUID;
  userId: UUID;
  status: string;
  riskLevel: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface SafetyPlan {
  id: UUID;
  userId: UUID;
  triggers: string[];
  copingStrategies: string[];
  supportContacts: any[];
  isActive: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

// Therapy Types
export interface TherapySession {
  id: UUID;
  clientId: UUID;
  therapistId: UUID;
  scheduledAt: DateString;
  duration: number;
  status: string;
  notes?: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface SessionNote {
  id: UUID;
  sessionId: UUID;
  therapistId: UUID;
  content: string;
  tags: string[];
  isConfidential: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

// Wellness Types
export interface WellnessGoal {
  id: UUID;
  userId: UUID;
  title: string;
  description?: string;
  category: string;
  targetDate?: DateString;
  priority: string;
  status: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface MoodEntry {
  id: UUID;
  userId: UUID;
  mood: number;
  energy: number;
  anxiety: number;
  notes?: string;
  createdAt: DateString;
}

// Messaging Types
export interface Message {
  id: UUID;
  senderId: UUID;
  recipientId: UUID;
  threadId: UUID;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: DateString;
}

export interface NotificationTemplate {
  id: UUID;
  name: string;
  subject: string;
  bodyTemplate: string;
  type: string;
  isActive: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

// Platform Types
export interface FileUpload {
  id: UUID;
  userId: UUID;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  isPublic: boolean;
  createdAt: DateString;
}

export interface SystemConfig {
  id: UUID;
  key: string;
  value: string;
  category: string;
  isPublic: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

// Audit Types
export interface AuditLog {
  id: UUID;
  userId?: UUID;
  action: string;
  resource?: string;
  resourceId?: UUID;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  outcome: string;
  timestamp: DateString;
}

// Export all types
// export * from './enums';
// export * from './next-auth';

// Named default export object
const TypeDefinitions = {
  // Export key interfaces as object properties for easier imports
  ApiResponse: {} as ApiResponse,
  PaginatedResponse: {} as PaginatedResponse,
  BaseUser: {} as BaseUser,
  UserProfile: {} as UserProfile,
  CrisisSession: {} as CrisisSession,
  SafetyPlan: {} as SafetyPlan,
  TherapySession: {} as TherapySession,
  SessionNote: {} as SessionNote,
  WellnessGoal: {} as WellnessGoal,
  MoodEntry: {} as MoodEntry,
  Message: {} as Message,
  NotificationTemplate: {} as NotificationTemplate,
  FileUpload: {} as FileUpload,
  SystemConfig: {} as SystemConfig,
  AuditLog: {} as AuditLog,
};

export default TypeDefinitions;