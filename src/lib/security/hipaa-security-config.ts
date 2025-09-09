/**
 * HIPAA-Compliant Security Configuration
 * Critical security settings for mental health application
 * 
 * COMPLIANCE REQUIREMENTS:
 * - 45 CFR 164.312 Technical Safeguards
 * - 45 CFR 164.308 Administrative Safeguards
 * - 45 CFR 164.310 Physical Safeguards
 */

// Session security configuration (HIPAA Requirement: 164.312(a)(2)(iii))
export const HIPAA_SESSION_CONFIG = {
  // Maximum session duration for healthcare applications
  maxAge: 8 * 60 * 60, // 8 hours maximum
  
  // Auto-refresh session if user is active
  updateAge: 2 * 60 * 60, // Refresh every 2 hours
  
  // Session timeout for inactivity (HIPAA best practice)
  idleTimeout: 15 * 60, // 15 minutes idle timeout
  
  // Concurrent session limit per user
  maxConcurrentSessions: 2,
  
  // Require re-authentication for sensitive operations
  sensitiveActionTimeout: 5 * 60, // 5 minutes
} as const;

// Encryption requirements (HIPAA Requirement: 164.312(e)(2)(ii))
export const HIPAA_ENCRYPTION_CONFIG = {
  // Minimum encryption key length (AES-256 requires 256 bits = 64 hex chars)
  minKeyLength: 64,
  
  // Algorithm requirements
  algorithm: 'aes-256-gcm',
  
  // Key derivation settings
  pbkdf2Iterations: 100000,
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
  
  // Key rotation requirements
  keyRotationIntervalDays: 90,
  
  // Backup encryption requirements
  backupEncryption: true,
} as const;

// Audit logging requirements (HIPAA Requirement: 164.312(b))
export const HIPAA_AUDIT_CONFIG = {
  // Required fields for all audit logs
  requiredFields: [
    'userId',
    'action',
    'timestamp',
    'ipAddress',
    'userAgent',
    'outcome',
    'resource',
  ] as const,
  
  // Actions that must be audited
  auditableActions: [
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_LOGIN_FAILED',
    'PHI_ACCESS',
    'PHI_CREATE',
    'PHI_UPDATE',
    'PHI_DELETE',
    'PHI_EXPORT',
    'ADMIN_ACTION',
    'PERMISSION_CHANGE',
    'CONFIG_CHANGE',
    'EMERGENCY_ACCESS',
    'DATA_BREACH_DETECTED',
  ] as const,
  
  // Audit log retention (HIPAA requires 6 years minimum)
  retentionYears: 6,
  
  // Real-time monitoring for suspicious activities
  suspiciousActivityThresholds: {
    failedLoginAttempts: 5,
    rapidDataAccess: 50, // Per hour
    unusualAccessHours: true,
    multipleLocationAccess: true,
  },
} as const;

// Data access controls (HIPAA Requirement: 164.312(a)(1))
export const HIPAA_ACCESS_CONFIG = {
  // Password requirements
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 12, // Last 12 passwords
    maxAge: 90, // Days
  },
  
  // Multi-factor authentication requirements
  mfa: {
    required: true,
    requiredForRoles: ['THERAPIST', 'ADMIN', 'SUPER_ADMIN'],
    backupCodesRequired: true,
    totpWindowSize: 30, // seconds
  },
  
  // Account lockout policy
  lockout: {
    maxAttempts: 5,
    lockoutDuration: 30 * 60, // 30 minutes
    progressiveLockout: true,
  },
  
  // Data minimization principle
  dataAccess: {
    limitToNecessary: true,
    purposeLimitation: true,
    timeLimitation: true,
  },
} as const;

// Data retention and disposal (HIPAA Requirement: 164.310(d)(2)(i))
export const HIPAA_DATA_RETENTION_CONFIG = {
  // Default retention periods by data type
  retentionPeriods: {
    auditLogs: 6 * 365, // 6 years (days)
    userActivity: 3 * 365, // 3 years
    sessionData: 90, // 90 days
    errorLogs: 1 * 365, // 1 year
    backups: 7 * 365, // 7 years
    
    // PHI data retention - varies by state/practice
    journalEntries: 7 * 365,
    moodData: 7 * 365,
    sessionNotes: 10 * 365, // Therapist notes
    crisisReports: 10 * 365,
    assessments: 10 * 365,
  },
  
  // Secure deletion requirements
  secureDisposal: {
    overwritePasses: 3,
    verifyDeletion: true,
    certificateOfDestruction: true,
  },
} as const;

// Network security requirements (HIPAA Requirement: 164.312(e)(1))
export const HIPAA_NETWORK_CONFIG = {
  // TLS requirements
  tls: {
    minVersion: '1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ],
    hsts: true,
    certificatePinning: true,
  },
  
  // API security
  api: {
    rateLimiting: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      skipSuccessfulRequests: false,
    },
    requestSizeLimit: '10mb',
    timeoutMs: 30000, // 30 seconds
  },
  
  // CORS policy
  cors: {
    strictOriginPolicy: true,
    allowCredentials: true,
    maxAge: 86400, // 24 hours
  },
} as const;

// Incident response configuration (HIPAA Requirement: 164.308(a)(6)(ii))
export const HIPAA_INCIDENT_CONFIG = {
  // Breach notification timeframes
  notification: {
    internalNotificationMinutes: 15,
    managementNotificationMinutes: 60,
    regulatoryNotificationHours: 72,
    patientNotificationDays: 60,
  },
  
  // Severity levels
  severityLevels: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  } as const,
  
  // Automatic response actions
  autoResponse: {
    suspendAccount: true,
    lockdownMode: true,
    alertSecurity: true,
    preserveEvidence: true,
  },
} as const;

// Environment validation function
export function validateHIPAACompliance(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check encryption key
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < HIPAA_ENCRYPTION_CONFIG.minKeyLength) {
    errors.push(`ENCRYPTION_KEY must be at least ${HIPAA_ENCRYPTION_CONFIG.minKeyLength} characters`);
  }
  
  // Check NextAuth secret
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret || nextAuthSecret.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters');
  }
  
  // Check TLS configuration
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }
  }
  
  // Check database URL encryption
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.includes('ssl=true') && process.env.NODE_ENV === 'production') {
    errors.push('DATABASE_URL must use SSL in production');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Security middleware configuration
export const SECURITY_MIDDLEWARE_CONFIG = {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Healthcare-Compliance': 'HIPAA-COMPLIANT',
    'X-PHI-Protection': 'ENABLED',
  },
  
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
} as const;

const HIPAASecurityConfig = {
  session: HIPAA_SESSION_CONFIG,
  encryption: HIPAA_ENCRYPTION_CONFIG,
  audit: HIPAA_AUDIT_CONFIG,
  access: HIPAA_ACCESS_CONFIG,
  retention: HIPAA_DATA_RETENTION_CONFIG,
  network: HIPAA_NETWORK_CONFIG,
  incident: HIPAA_INCIDENT_CONFIG,
  security: SECURITY_MIDDLEWARE_CONFIG,
  validateCompliance: validateHIPAACompliance,
};

export default HIPAASecurityConfig;