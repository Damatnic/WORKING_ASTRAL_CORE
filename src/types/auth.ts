import { BaseEntity, UUID, Timestamp, Email } from './index';
import { UserRole, User } from './prisma';

// Type alias for UserSession to avoid circular imports  
export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  status: string;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication Types
export interface LoginRequest {
  email: Email;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
  mfaCode?: string;
  captchaToken?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  mfaRequired?: boolean;
  mfaSessionToken?: string;
  sessionId: UUID;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
}

export interface LogoutRequest {
  sessionId?: UUID;
  allSessions?: boolean;
}

export interface RegisterRequest {
  email: Email;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
  role?: UserRole;
  invitationCode?: string;
  captchaToken?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: Omit<User, 'preferences' | 'privacySettings'>;
  verificationEmailSent: boolean;
  message: string;
}

// Password Management
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  email: Email;
  captchaToken?: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  prohibitCommonPasswords: boolean;
  prohibitPersonalInfo: boolean;
  maxAge: number; // in days
  historySize: number; // number of previous passwords to remember
}

export interface PasswordValidation {
  isValid: boolean;
  errors: Array<{
    rule: keyof PasswordPolicy;
    message: string;
  }>;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
}

// Multi-Factor Authentication
export interface MFASetupRequest {
  type: 'totp' | 'sms' | 'email';
  phoneNumber?: string; // Required for SMS MFA
}

export interface MFASetupResponse {
  secret?: string; // For TOTP
  qrCodeUrl?: string; // For TOTP
  backupCodes: string[];
  setupToken: string;
}

export interface MFAVerifySetupRequest {
  setupToken: string;
  code: string;
  backupCodesAcknowledged: boolean;
}

export interface MFALoginRequest {
  mfaSessionToken: string;
  code: string;
  trustDevice?: boolean;
}

export interface MFADisableRequest {
  password: string;
  reason?: string;
}

export interface MFABackupCodesRequest {
  password: string;
}

export interface TrustedDevice extends BaseEntity {
  userId: UUID;
  deviceId: string;
  deviceName?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    browser?: string;
  };
  ipAddress: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  isActive: boolean;
  lastUsedAt: Timestamp;
  expiresAt: Timestamp;
}

// Email Verification
export interface EmailVerificationRequest {
  email: Email;
}

export interface EmailVerificationConfirmRequest {
  token: string;
  email: Email;
}

export interface EmailChangeRequest {
  newEmail: Email;
  password: string;
}

// Phone Verification
export interface PhoneVerificationRequest {
  phoneNumber: string;
}

export interface PhoneVerificationConfirmRequest {
  phoneNumber: string;
  code: string;
}

// Session Management
export interface SessionInfo {
  id: UUID;
  deviceInfo: {
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
  };
  isCurrentSession: boolean;
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RevokeSessionRequest {
  sessionId: UUID;
}

export interface RevokeAllSessionsRequest {
  keepCurrent?: boolean;
  reason?: string;
}

// JWT Token Payload
export interface JWTPayload {
  sub: UUID; // User ID
  email: Email;
  role: UserRole;
  sessionId: UUID;
  deviceId?: string;
  iat: number; // Issued at
  exp: number; // Expires at
  aud: string; // Audience
  iss: string; // Issuer
  jti: UUID; // JWT ID
  
  // Custom claims
  emailVerified: boolean;
  mfaEnabled: boolean;
  permissions: string[];
  
  // Rate limiting
  rateLimitTier?: 'basic' | 'premium' | 'professional' | 'unlimited';
}

// Authorization and Permissions
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // Cannot be deleted
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: UUID;
  context?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
}

// API Key Authentication (for service-to-service)
export interface APIKey extends BaseEntity {
  name: string;
  keyId: string;
  keyHash: string; // Hashed version of the key
  userId?: UUID; // Optional - for user-specific API keys
  permissions: Permission[];
  allowedIPs?: string[];
  allowedDomains?: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  isActive: boolean;
  lastUsedAt?: Timestamp;
  expiresAt?: Timestamp;
  metadata?: Record<string, any>;
}

export interface APIKeyCreateRequest {
  name: string;
  permissions: string[];
  allowedIPs?: string[];
  allowedDomains?: string[];
  expiresAt?: Timestamp;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export interface APIKeyResponse {
  id: UUID;
  keyId: string;
  key: string; // Only returned once during creation
  name: string;
  permissions: Permission[];
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// OAuth Integration
export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string; // Encrypted
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  isEnabled: boolean;
  fieldMappings: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

export interface OAuthAccount extends BaseEntity {
  userId: UUID;
  provider: string;
  providerAccountId: string;
  type: 'oauth';
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  expiresAt?: Timestamp;
  tokenType: string;
  scope: string;
  idToken?: string; // Encrypted
  sessionState?: string;
}

export interface OAuthLoginRequest {
  provider: string;
  code: string;
  state: string;
  redirectUri: string;
}

// Security Events and Monitoring
export interface SecurityEvent extends BaseEntity {
  userId?: UUID;
  sessionId?: UUID;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  userAgent?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Timestamp;
  resolvedBy?: UUID;
}

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_blocked'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'suspicious_activity'
  | 'data_breach_attempt'
  | 'privilege_escalation'
  | 'unauthorized_access'
  | 'session_hijack_attempt'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'oauth_linked'
  | 'oauth_unlinked';

// Account Security Settings
export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  mfaRequired: boolean;
  mfaGracePeriod: number; // Days before MFA is required
  sessionTimeout: number; // Minutes
  maxConcurrentSessions: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  requireDeviceVerification: boolean;
  loginNotifications: boolean;
  suspiciousActivityNotifications: boolean;
  accountLockoutPolicy: {
    enabled: boolean;
    maxAttempts: number;
    lockoutDuration: number; // Minutes
    progressiveDelay: boolean;
  };
  ipWhitelist?: string[];
  ipBlacklist?: string[];
}

// Account Recovery
export interface AccountRecoveryRequest {
  email: Email;
  recoveryMethod: 'email' | 'phone' | 'security_questions' | 'admin_override';
  securityAnswers?: Array<{
    questionId: string;
    answer: string;
  }>;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  category: string;
  isActive: boolean;
}

export interface UserSecurityQuestion extends BaseEntity {
  userId: UUID;
  questionId: string;
  answerHash: string; // Hashed answer
  createdAt: Timestamp;
}

// Rate Limiting
export interface RateLimitConfig {
  endpoint: string;
  method: string;
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
  skip?: (request: any) => boolean;
  onLimitReached?: (request: any) => void;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: Timestamp;
  retryAfter?: number; // Seconds
}

// Type Guards and Validators
export function isValidJWTPayload(payload: any): payload is JWTPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string' &&
    typeof payload.sessionId === 'string' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number'
  );
}

export function isTokenExpired(payload: JWTPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}

export function isValidPermission(permission: any): permission is Permission {
  return (
    typeof permission === 'object' &&
    permission !== null &&
    typeof permission.id === 'string' &&
    typeof permission.resource === 'string' &&
    typeof permission.action === 'string'
  );
}

export function hasPermission(userPermissions: Permission[], required: PermissionCheck): boolean {
  return userPermissions.some(permission => 
    permission.resource === required.resource && 
    permission.action === required.action
  );
}

// Authentication Utilities
export interface AuthContext {
  user: User;
  session: UserSession;
  permissions: Permission[];
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isMFAEnabled: boolean;
  lastActivity: Timestamp;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: UserSession | null;
  error: string | null;
  mfaRequired: boolean;
}

// Constants
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_NOT_FOUND: 'Account not found',
  ACCOUNT_SUSPENDED: 'Account has been suspended',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed attempts',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  MFA_REQUIRED: 'Multi-factor authentication required',
  INVALID_MFA_CODE: 'Invalid MFA code',
  SESSION_EXPIRED: 'Session has expired',
  INVALID_TOKEN: 'Invalid or expired token',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  PASSWORD_MISMATCH: 'Passwords do not match',
  RATE_LIMITED: 'Too many requests, please try again later',
  CAPTCHA_REQUIRED: 'CAPTCHA verification required',
  INVALID_CAPTCHA: 'Invalid CAPTCHA',
} as const;

export const MFA_METHODS = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
} as const;

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
} as const;