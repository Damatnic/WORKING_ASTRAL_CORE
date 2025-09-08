// Admin Dashboard Types

export interface AdminSystemMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalSessions: number;
  averageSessionLength: number;
  totalCrisisInterventions: number;
  activeCrisisInterventions: number;
  totalTherapySessions: number;
  totalMessages: number;
  systemUptime: number;
  serverLoad: number;
  databaseSize: number;
  storageUsed: number;
  bandwidthUsed: number;
}

export interface AdminUserAnalytics {
  usersByRole: Record<string, number>;
  usersByLocation: Record<string, number>;
  usersByDevice?: Record<string, number>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  activeUsersByTimeOfDay: Array<{
    hour: number;
    count: number;
  }>;
  sessionDurationDistribution: Array<{
    duration: string;
    count: number;
  }>;
}

export interface SystemAlert {
  id: string;
  type: 'security' | 'performance' | 'system' | 'user_activity' | 'crisis' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  affectedSystems: string[];
  actionRequired: boolean;
}

export interface PlatformActivity {
  id: string;
  type: 'user_registration' | 'crisis_alert' | 'therapy_session' | 'system_update' | 'security_event' | 'content_moderation';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

// User Management Types

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'helper' | 'therapist' | 'crisis_counselor' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'banned' | 'pending_verification' | 'inactive' | 'deleted';
  avatar?: string;
  phone?: string;
  location?: string;
  joinDate: string;
  lastActive: string;
  isVerified: boolean;
  verificationLevel: 'none' | 'email' | 'phone' | 'identity' | 'professional';
  profile: {
    bio?: string;
    specializations?: string[];
    credentials?: string[];
    languages?: string[];
    timezone?: string;
  };
  activity: {
    totalSessions: number;
    totalMessages: number;
    totalPosts: number;
    totalTherapySessions?: number;
    totalCrisisInterventions?: number;
    averageRating: number;
    reportsReceived: number;
    reportsSubmitted: number;
  };
  moderation: {
    warnings: number;
    suspensions: number;
    lastModerationAction?: {
      type: 'warning' | 'suspension' | 'ban' | 'verification';
      date: string;
      reason: string;
      moderator: string;
    } | null;
    flaggedContent: number;
    restrictedFeatures: string[];
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    failedLoginAttempts: number;
    suspiciousActivity: boolean;
    ipAddresses: string[];
    devices: Array<{
      type: string;
      browser: string;
      lastUsed: string;
      location: string;
    }>;
  };
}

export interface ModerationAction {
  id: string;
  userId: string;
  username: string;
  type: 'warning' | 'suspension' | 'ban' | 'content_removal' | 'account_restriction' | 'verification_revoke';
  reason: string;
  description: string;
  moderator: string;
  timestamp: string;
  duration?: number; // in days
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'expired' | 'revoked';
  evidence?: string[];
  appealable: boolean;
  appealed?: boolean;
  appealReason?: string;
}

export interface ContentReport {
  id: string;
  reportedBy: string;
  reporterEmail?: string;
  reportedUser: string;
  reportedUsername: string;
  contentType: 'message' | 'post' | 'comment' | 'profile' | 'session_notes';
  contentId: string;
  reason: 'harassment' | 'spam' | 'inappropriate_content' | 'misinformation' | 'privacy_violation' | 'hate_speech' | 'self_harm' | 'violence' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  timestamp: string;
  reviewedBy?: string;
  reviewedAt?: string;
  action?: string;
  notes?: string;
  evidence?: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  username?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

// API Response Types

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface AdminMetricsResponse {
  metrics: AdminSystemMetrics;
  analytics: AdminUserAnalytics;
  alerts: SystemAlert[];
  activity: PlatformActivity[];
  timestamp: string;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ModerationActionsResponse {
  actions: ModerationAction[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ReportsResponse {
  reports: ContentReport[];
  statistics: {
    pending: number;
    underReview: number;
    resolved: number;
    dismissed: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  statistics: {
    totalLogs: number;
    topActions: Array<{
      action: string;
      count: number;
    }>;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

// Filter and Query Types

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ReportFilters {
  status?: string;
  severity?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Action Types

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  phone?: string;
  country?: string;
  city?: string;
  bio?: string;
  specializations?: string[];
  credentials?: string[];
  languages?: string[];
  timezone?: string;
}

export interface UpdateUserData {
  userId: string;
  updates: Partial<Omit<CreateUserData, 'password' | 'username' | 'email'>>;
}

export interface CreateModerationActionData {
  userId: string;
  type: string;
  reason: string;
  description: string;
  duration?: number;
  severity?: string;
  evidence?: string[];
  appealable?: boolean;
}

export interface UpdateReportData {
  reportId: string;
  status: string;
  action?: string;
  notes?: string;
}

// Helper Types

export type AdminRole = 'admin' | 'moderator';
export type AdminUserStatus = 'active' | 'suspended' | 'banned' | 'pending_verification' | 'inactive' | 'deleted';
export type AdminUserRole = 'user' | 'helper' | 'therapist' | 'crisis_counselor' | 'moderator' | 'admin';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';