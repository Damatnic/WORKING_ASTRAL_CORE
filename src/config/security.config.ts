/**
 * Security Configuration
 * Centralized security settings for different environments
 * HIPAA-compliant mental health application configuration
 */

interface SecurityConfig {
  environment: 'development' | 'staging' | 'production';
  
  // Encryption settings
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
    iterations: number;
    tagLength: number;
    rotationDays: number;
  };
  
  // Session settings
  session: {
    maxIdleMinutes: number;
    absoluteTimeoutHours: number;
    renewalMinutes: number;
    maxConcurrent: number;
    requireMFA: boolean;
    bindToIP: boolean;
    bindToUserAgent: boolean;
    rotateTokens: boolean;
  };
  
  // Rate limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    blockDurationMs: number;
    captchaThreshold: number;
  };
  
  // HIPAA compliance
  hipaa: {
    auditRetentionYears: number;
    phiRetentionYears: number;
    breachNotificationDays: number;
    sessionTimeoutMinutes: number;
    passwordComplexity: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventReuse: number;
      expirationDays: number;
    };
  };
  
  // Content Security Policy
  csp: {
    reportUri: string;
    upgradeInsecureRequests: boolean;
    blockAllMixedContent: boolean;
  };
  
  // API Security
  api: {
    baseURL: string;
    timeout: number;
    retries: number;
    requireHTTPS: boolean;
    validateCertificates: boolean;
  };
  
  // Monitoring
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
    retentionDays: number;
    realTimeAlerts: boolean;
  };
  
  // Feature flags
  features: {
    encryptionEnabled: boolean;
    mfaEnabled: boolean;
    biometricsEnabled: boolean;
    deviceTrustEnabled: boolean;
    geoLocationEnabled: boolean;
    behavioralAnalysis: boolean;
  };
}

const development: SecurityConfig = {
  environment: 'development',
  
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    saltLength: 16,
    iterations: 100000,
    tagLength: 16,
    rotationDays: 90,
  },
  
  session: {
    maxIdleMinutes: 60, // More lenient for development
    absoluteTimeoutHours: 24,
    renewalMinutes: 10,
    maxConcurrent: 5,
    requireMFA: false,
    bindToIP: false,
    bindToUserAgent: false,
    rotateTokens: false,
  },
  
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 60000,
    captchaThreshold: 10,
  },
  
  hipaa: {
    auditRetentionYears: 1, // Shorter for development
    phiRetentionYears: 1,
    breachNotificationDays: 60,
    sessionTimeoutMinutes: 60,
    passwordComplexity: {
      minLength: 8,
      requireUppercase: false,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: 3,
      expirationDays: 365,
    },
  },
  
  csp: {
    reportUri: '/api/security/csp-report',
    upgradeInsecureRequests: false,
    blockAllMixedContent: false,
  },
  
  api: {
    baseURL: 'http://localhost:3000',
    timeout: 30000,
    retries: 3,
    requireHTTPS: false,
    validateCertificates: false,
  },
  
  monitoring: {
    enabled: true,
    alertThreshold: 50,
    retentionDays: 7,
    realTimeAlerts: false,
  },
  
  features: {
    encryptionEnabled: true,
    mfaEnabled: false,
    biometricsEnabled: false,
    deviceTrustEnabled: false,
    geoLocationEnabled: false,
    behavioralAnalysis: false,
  },
};

const staging: SecurityConfig = {
  environment: 'staging',
  
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    saltLength: 16,
    iterations: 100000,
    tagLength: 16,
    rotationDays: 90,
  },
  
  session: {
    maxIdleMinutes: 30,
    absoluteTimeoutHours: 8,
    renewalMinutes: 5,
    maxConcurrent: 3,
    requireMFA: true,
    bindToIP: true,
    bindToUserAgent: true,
    rotateTokens: true,
  },
  
  rateLimit: {
    windowMs: 60000,
    maxRequests: 60,
    blockDurationMs: 300000, // 5 minutes
    captchaThreshold: 5,
  },
  
  hipaa: {
    auditRetentionYears: 6,
    phiRetentionYears: 6,
    breachNotificationDays: 60,
    sessionTimeoutMinutes: 30,
    passwordComplexity: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 12,
      expirationDays: 90,
    },
  },
  
  csp: {
    reportUri: '/api/security/csp-report',
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://staging-api.astralcore.app',
    timeout: 30000,
    retries: 3,
    requireHTTPS: true,
    validateCertificates: true,
  },
  
  monitoring: {
    enabled: true,
    alertThreshold: 25,
    retentionDays: 90,
    realTimeAlerts: true,
  },
  
  features: {
    encryptionEnabled: true,
    mfaEnabled: true,
    biometricsEnabled: true,
    deviceTrustEnabled: true,
    geoLocationEnabled: true,
    behavioralAnalysis: true,
  },
};

const production: SecurityConfig = {
  environment: 'production',
  
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    saltLength: 16,
    iterations: 100000,
    tagLength: 16,
    rotationDays: 30, // More frequent rotation in production
  },
  
  session: {
    maxIdleMinutes: 15, // Strict timeout for production
    absoluteTimeoutHours: 4,
    renewalMinutes: 2,
    maxConcurrent: 2,
    requireMFA: true,
    bindToIP: true,
    bindToUserAgent: true,
    rotateTokens: true,
  },
  
  rateLimit: {
    windowMs: 60000,
    maxRequests: 30, // Strict rate limiting
    blockDurationMs: 600000, // 10 minutes
    captchaThreshold: 3,
  },
  
  hipaa: {
    auditRetentionYears: 6, // HIPAA requirement
    phiRetentionYears: 6, // HIPAA requirement
    breachNotificationDays: 60, // HIPAA requirement
    sessionTimeoutMinutes: 15,
    passwordComplexity: {
      minLength: 14,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 24,
      expirationDays: 60,
    },
  },
  
  csp: {
    reportUri: '/api/security/csp-report',
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.astralcore.app',
    timeout: 15000,
    retries: 2,
    requireHTTPS: true,
    validateCertificates: true,
  },
  
  monitoring: {
    enabled: true,
    alertThreshold: 10,
    retentionDays: 365,
    realTimeAlerts: true,
  },
  
  features: {
    encryptionEnabled: true,
    mfaEnabled: true,
    biometricsEnabled: true,
    deviceTrustEnabled: true,
    geoLocationEnabled: true,
    behavioralAnalysis: true,
  },
};

// Environment detection
function getEnvironment(): SecurityConfig['environment'] {
  if (typeof window === 'undefined') {
    // Server-side
    return (process.env.NODE_ENV as SecurityConfig['environment']) || 'development';
  } else {
    // Client-side
    if (window.location.hostname === 'localhost') return 'development';
    if (window.location.hostname.includes('staging')) return 'staging';
    return 'production';
  }
}

// Export the appropriate config based on environment
const configs = {
  development,
  staging,
  production,
};

export const securityConfig = configs[getEnvironment()];
export type { SecurityConfig };

// Helper functions
export const isProduction = () => getEnvironment() === 'production';
export const isStaging = () => getEnvironment() === 'staging';
export const isDevelopment = () => getEnvironment() === 'development';

// Validation functions
export const validateSecurityConfig = (config: SecurityConfig): boolean => {
  // Basic validation - can be extended
  return (
    config.encryption.keyLength >= 256 &&
    config.session.maxIdleMinutes > 0 &&
    config.hipaa.auditRetentionYears >= 6 &&
    config.hipaa.passwordComplexity.minLength >= 8
  );
};

export default securityConfig;