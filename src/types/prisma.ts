// Prisma-related types extracted from schema.prisma
// This file contains the authoritative definitions for database-backed enums and types

// Core enums
export enum UserRole {
  USER = 'USER',
  HELPER = 'HELPER',
  THERAPIST = 'THERAPIST',
  CRISIS_COUNSELOR = 'CRISIS_COUNSELOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AdminLevel {
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

export enum ClientStatus {
  INTAKE = 'INTAKE',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  NO_SHOW = 'NO_SHOW'
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRISIS = 'CRISIS'
}

export enum SessionType {
  VIDEO = 'VIDEO',
  IN_PERSON = 'IN_PERSON',
  PHONE = 'PHONE'
}

export enum SessionCategory {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  FAMILY = 'FAMILY',
  COUPLES = 'COUPLES'
}

export enum TherapySessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum NoteType {
  INTAKE = 'INTAKE',
  PROGRESS = 'PROGRESS',
  TREATMENT_PLAN = 'TREATMENT_PLAN',
  CRISIS = 'CRISIS',
  DISCHARGE = 'DISCHARGE'
}

// Database User type based on Prisma schema
export interface User {
  id: string;
  anonymousId: string;
  email?: string;
  hashedPassword?: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  dataRetentionDays: number;
  allowAnalytics: boolean;
  timezone: string;
  preferredLanguage: string;
  privacySettings: any;
  lastLoginAt?: Date;
  lastActiveAt: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database Session type based on Prisma schema
export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  sessionTokenIV?: string;
  sessionTokenAuthTag?: string;
  refreshToken?: string;
  refreshTokenIV?: string;
  refreshTokenAuthTag?: string;
  status: SessionStatus;
  mfaVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  lastActivity: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  expiresAt: Date;
  terminatedAt?: Date;
  terminationReason?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

// Database Crisis Report type based on Prisma schema
export interface CrisisReport {
  id: string;
  userId?: string;
  severityLevel: number;
  triggerType: string;
  interventionType: string;
  encryptedDetails: any;
  responseTime: number;
  resolved: boolean;
  resolvedAt?: Date;
  emergencyContactUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database Mood Entry type based on Prisma schema
export interface MoodEntry {
  id: string;
  userId: string;
  moodScore: number;
  anxietyLevel?: number;
  energyLevel?: number;
  encryptedNotes?: any;
  encryptedTags?: any;
  createdAt: Date;
}

// Database Journal Entry type based on Prisma schema
export interface JournalEntry {
  id: string;
  userId: string;
  encryptedTitle?: string;
  encryptedContent: string;
  encryptedTags?: any;
  isPrivate: boolean;
  sentiment?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Database Safety Plan type based on Prisma schema
export interface SafetyPlan {
  id: string;
  userId: string;
  warningSignsEncrypted: any;
  copingStrategiesEncrypted: any;
  supportContactsEncrypted: any;
  safeEnvironmentEncrypted: any;
  reasonsToLiveEncrypted?: any;
  isActive: boolean;
  lastReviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database Notification type based on Prisma schema  
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  isPriority: boolean;
  metadata?: any;
  createdAt: Date;
  readAt?: Date;
}

// Helper Profile type based on Prisma schema
export interface HelperProfile {
  id: string;
  userId: string;
  title?: string;
  specializations: string[];
  credentials: any;
  experience: string;
  approach: string;
  languages: string[];
  availability: any;
  timezone: string;
  maxClients: number;
  currentClients: number;
  acceptingClients: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  verifiedBy?: string;
  rating: number;
  totalReviews: number;
  backgroundCheckCompleted: boolean;
  backgroundCheckDate?: Date;
  requiredTrainingCompleted: boolean;
  trainingCompletionDate?: Date;
  trainingCertificates: any;
  totalSessions: number;
  responseTime?: number;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TriggerType = 'self_harm' | 'panic_attack' | 'other' | 'suicidal_ideation' | 'anxiety_attack' | 
  'depression_episode' | 'substance_use' | 'trauma_trigger' | 'relationship_crisis' | 'financial_stress' | 'grief_loss';

export type ReportStatus = 'pending' | 'active' | 'resolved' | 'under_review' | 'closed';

export interface CreateReportRequest {
  triggerType: TriggerType;
  severityLevel: number;
  interventionType: string;
  details: any;
  [key: string]: any;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  resolved?: boolean;
  resolvedAt?: string;
  responseNotes?: string;
  followUpRequired?: boolean;
  referralMade?: boolean;
}

export interface SafetyPlanResponse {
  id: string;
  userId: string;
  isActive: boolean;
  lastReviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  warningSignals: any[];
  copingStrategies: any[];
  supportContacts: any[];
  safeEnvironment: any;
}