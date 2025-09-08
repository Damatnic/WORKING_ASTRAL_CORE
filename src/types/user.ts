import { BaseEntity, UUID, Timestamp, Email, PhoneNumber } from './index';
import { UserRole } from './prisma';
import type { Certification } from './therapy';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DELETED';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

// Main User Interface
export interface User extends BaseEntity {
  // Basic Information
  email: Email;
  emailVerified: boolean;
  emailVerifiedAt?: Timestamp;
  
  // Profile Information
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Timestamp;
  
  // Contact Information
  phoneNumber?: PhoneNumber;
  phoneNumberVerified: boolean;
  
  // Location Information
  timezone?: string;
  locale?: string;
  country?: string;
  region?: string;
  
  // System Information
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt?: Timestamp;
  presenceStatus: PresenceStatus;
  lastSeenAt?: Timestamp;
  
  // Security
  mfaEnabled: boolean;
  mfaBackupCodes?: string[];
  passwordChangedAt?: Timestamp;
  
  // Privacy and Preferences
  preferences: UserPreferences;
  privacySettings: PrivacySettings;
  
  // Platform-specific
  isVerified: boolean; // For verified professionals
  licenseNumber?: string; // For therapists/counselors
  licenseState?: string;
  licenseExpiryDate?: Timestamp;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
}

// User Preferences
export interface UserPreferences {
  // Notification Preferences
  notifications: {
    email: {
      enabled: boolean;
      types: NotificationTypePreference[];
    };
    push: {
      enabled: boolean;
      types: NotificationTypePreference[];
    };
    sms: {
      enabled: boolean;
      types: NotificationTypePreference[];
    };
    inApp: {
      enabled: boolean;
      types: NotificationTypePreference[];
    };
  };
  
  // Communication Preferences
  communication: {
    allowDirectMessages: boolean;
    allowGroupInvitations: boolean;
    allowTherapistContact: boolean;
    allowCrisisContact: boolean;
    autoJoinSupportGroups: boolean;
    sharePresenceStatus: boolean;
  };
  
  // Accessibility Preferences
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'xl';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
  
  // App Preferences
  app: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoSave: boolean;
    reminderFrequency: 'none' | 'daily' | 'weekly' | 'custom';
    sessionReminders: boolean;
    wellnessReminders: boolean;
  };
  
  // Crisis Settings
  crisis: {
    enableAutoDetection: boolean;
    emergencyContact?: EmergencyContact;
    crisisKeywords?: string[];
    escalationLevel: 1 | 2 | 3 | 4 | 5;
  };
}

export interface NotificationTypePreference {
  type: string;
  enabled: boolean;
  frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

// Privacy Settings
export interface PrivacySettings {
  // Profile Visibility
  profile: {
    showRealName: boolean;
    showEmail: boolean;
    showAge: boolean;
    showLocation: boolean;
    showLastSeen: boolean;
  };
  
  // Data Sharing
  dataSharing: {
    allowAnalytics: boolean;
    allowResearch: boolean;
    allowPersonalization: boolean;
    shareAnonymizedData: boolean;
  };
  
  // Communication Privacy
  communication: {
    encryptMessages: boolean;
    logMessageHistory: boolean;
    shareTypingStatus: boolean;
    allowScreenshots: boolean;
  };
  
  // Account Privacy
  account: {
    showOnlineStatus: boolean;
    indexProfile: boolean; // Allow search engines
    allowDirectAdd: boolean;
    requireApprovalForGroups: boolean;
  };
}

// Emergency Contact
export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: PhoneNumber;
  email?: Email;
  isPrimary: boolean;
  canReceiveCrisisAlerts: boolean;
}

// User Profile (Public View)
export interface UserProfile {
  id: UUID;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  isVerified: boolean;
  isOnline: boolean;
  lastSeenAt?: Timestamp;
  joinedAt: Timestamp;
  
  // Professional Information (for therapists/counselors)
  professionalInfo?: {
    specializations?: string[];
    yearsOfExperience?: number;
    education?: string[];
    certifications?: Certification[];
    languages?: string[];
    acceptingNewClients?: boolean;
  };
  
  // Statistics (if allowed by privacy settings)
  stats?: {
    helpedUsers?: number;
    sessionsCompleted?: number;
    communityPosts?: number;
    memberSince: Timestamp;
  };
}

// User Creation and Update DTOs
export interface CreateUserRequest {
  email: Email;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: UserRole;
  phoneNumber?: PhoneNumber;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  phoneNumber?: PhoneNumber;
  timezone?: string;
  locale?: string;
  preferences?: Partial<UserPreferences>;
  privacySettings?: Partial<PrivacySettings>;
  metadata?: Record<string, any>;
}

export interface UpdateUserRoleRequest {
  userId: UUID;
  newRole: UserRole;
  reason: string;
  effectiveDate?: Timestamp;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiryDate?: Timestamp;
}

export interface UserStatusChange {
  userId: UUID;
  previousStatus: UserStatus;
  newStatus: UserStatus;
  reason: string;
  changedBy: UUID;
  effectiveDate: Timestamp;
  expiryDate?: Timestamp;
}

// User Session Information
export interface UserSession extends BaseEntity {
  userId: UUID;
  sessionToken: string;
  deviceId?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    browser?: string;
    version?: string;
    mobile: boolean;
  };
  ipAddress: string;
  location?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  isActive: boolean;
  expiresAt: Timestamp;
  lastActivityAt: Timestamp;
}

// User Verification
export interface UserVerification extends BaseEntity {
  userId: UUID;
  type: 'email' | 'phone' | 'identity' | 'professional' | 'background_check';
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verificationCode?: string;
  verificationData?: Record<string, any>;
  verifiedAt?: Timestamp;
  verifiedBy?: UUID;
  expiresAt?: Timestamp;
  attempts: number;
  maxAttempts: number;
}

// User Search and Filtering
export interface UserSearchFilters {
  role?: UserRole[];
  status?: UserStatus[];
  isVerified?: boolean;
  location?: {
    country?: string;
    region?: string;
    radius?: number; // in kilometers
    center?: {
      latitude: number;
      longitude: number;
    };
  };
  lastActiveAfter?: Timestamp;
  createdAfter?: Timestamp;
  createdBefore?: Timestamp;
  hasProfilePicture?: boolean;
  languages?: string[];
  specializations?: string[]; // For therapists
  acceptingNewClients?: boolean; // For therapists
}

export interface UserSearchResult {
  id: UUID;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  isOnline: boolean;
  lastSeenAt?: Timestamp;
  matchScore?: number; // Search relevance score
  highlightedFields?: string[]; // Fields that matched the search
}

// User Relationships
export interface UserConnection extends BaseEntity {
  fromUserId: UUID;
  toUserId: UUID;
  type: 'friend' | 'follow' | 'block' | 'therapist_client' | 'mentor_mentee';
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  requestedAt: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  metadata?: Record<string, any>;
}

// User Activity Tracking
export interface UserActivity extends BaseEntity {
  userId: UUID;
  action: string;
  resource: string;
  resourceId?: UUID;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: UUID;
  duration?: number; // in milliseconds
}

// Professional User Extensions
export interface TherapistProfile extends UserProfile {
  professionalInfo: {
    licenseNumber: string;
    licenseState: string;
    licenseType: string;
    licenseExpiryDate: Timestamp;
    specializations: string[];
    yearsOfExperience: number;
    education: string[];
    certifications: Certification[];
    languages: string[];
    acceptingNewClients: boolean;
    sessionTypes: Array<'individual' | 'group' | 'family' | 'couples'>;
    treatmentApproaches: string[];
    ageGroups: Array<'children' | 'adolescents' | 'adults' | 'seniors'>;
    specialNeeds: string[];
  };
  availability: {
    timezone: string;
    schedule: Array<{
      dayOfWeek: number; // 0 = Sunday, 6 = Saturday
      startTime: string; // HH:MM format
      endTime: string;   // HH:MM format
    }>;
    breaks: Array<{
      startTime: string;
      endTime: string;
      days: number[];
    }>;
    holidays: Array<{
      date: Timestamp;
      description: string;
    }>;
  };
  pricing: {
    individualSession: number;
    groupSession: number;
    currency: string;
    acceptsInsurance: boolean;
    insuranceProviders: string[];
    slidingScale: boolean;
  };
}

export interface CrisisCounselorProfile extends UserProfile {
  professionalInfo: {
    certifications: Certification[];
    trainingPrograms: string[];
    yearsOfExperience: number;
    languages: string[];
    specializations: string[];
    availableForEmergency: boolean;
  };
  availability: {
    onCallSchedule: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    maxSimultaneousCases: number;
    responseTimeTarget: number; // in minutes
  };
}

// Type Guards
export function isValidUserRole(role: any): role is UserRole {
  const validRoles: UserRole[] = ['USER', 'HELPER', 'THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'];
  return validRoles.includes(role);
}

export function isValidUserStatus(status: any): status is UserStatus {
  const validStatuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DELETED'];
  return validStatuses.includes(status);
}

export function isClinicalRole(role: UserRole): boolean {
  return ['THERAPIST', 'CRISIS_COUNSELOR'].includes(role);
}

export function isAdminRole(role: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canAccessCrisisTools(role: UserRole): boolean {
  return ['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canProvideProfessionalSupport(role: UserRole): boolean {
  return ['THERAPIST', 'CRISIS_COUNSELOR'].includes(role);
}