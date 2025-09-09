// Re-export Prisma types for easier imports
export { 
  UserRole, 
  ClientStatus, 
  RiskLevel, 
  SessionType, 
  SessionCategory, 
  TherapySessionStatus, 
  NoteType, 
  AdminLevel,
  SessionStatus
} from '@prisma/client';

// Additional helper types
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
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email?: string;
  role: UserRole;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Crisis types
export type CrisisStatus = 'PENDING' | 'ACTIVE' | 'RESOLVED' | 'ESCALATED';

// System event types
export const SystemEvent = {
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  AUTH_FAILED: 'AUTH_FAILED',
  CONNECTION_ERROR: 'CONNECTION_ERROR'
} as const;

export const CrisisEvent = {
  ALERT_CREATED: 'ALERT_CREATED',
  ESCALATE: 'ESCALATE',
  RESOLVED: 'RESOLVED'
} as const;

// WebSocket types
export interface SocketIOServer {
  to(room: string): any;
  emit(event: string, data: any): void;
}

// Encryption types
export interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
}

export interface EncryptedField {
  data: string;
  iv?: string;
  authTag?: string;
}

// PHI Field types
export type PHIFieldType = 'PII' | 'MEDICAL' | 'FINANCIAL' | 'CONTACT' | 'NOTES';

// Admin types for components
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

// Context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}