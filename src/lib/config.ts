import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // App configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // OAuth providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Redis/Caching
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  
  // AI/OpenAI
  OPENAI_API_KEY: z.string().optional(),
  
  // File storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Feature flags
  ENABLE_CRISIS_INTERVENTION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_THERAPIST_BOOKING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AI_FEATURES: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),
  
  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  
  // WebSocket
  WEBSOCKET_PORT: z.string().optional(),
  WEBSOCKET_ENABLED: z.string().transform(val => val === 'true').default('true'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err: any) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Invalid environment configuration:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();

// Feature flags configuration
export const featureFlags = {
  enableCrisisIntervention: config.ENABLE_CRISIS_INTERVENTION,
  enableTherapistBooking: config.ENABLE_THERAPIST_BOOKING,
  enableAI: config.ENABLE_AI_FEATURES,
  enableAnalytics: config.ENABLE_ANALYTICS,
  enableWebSocket: config.WEBSOCKET_ENABLED,
  rateLimit: config.RATE_LIMIT_ENABLED,
} as const;

// Database configuration
export const databaseConfig = {
  url: config.DATABASE_URL,
  // Add connection pool settings for production
  maxConnections: config.NODE_ENV === 'production' ? 20 : 5,
  connectionTimeout: 30000,
  queryTimeout: 10000,
} as const;

// Authentication configuration
export const authConfig = {
  secret: config.NEXTAUTH_SECRET,
  url: config.NEXTAUTH_URL || config.NEXT_PUBLIC_APP_URL,
  sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  sessionUpdateAge: 24 * 60 * 60, // 24 hours
  providers: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      enabled: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
    },
    email: {
      enabled: !!(
        config.EMAIL_SERVER_HOST &&
        config.EMAIL_SERVER_USER &&
        config.EMAIL_SERVER_PASSWORD
      ),
    },
  },
} as const;

// Email configuration
export const emailConfig = {
  host: config.EMAIL_SERVER_HOST,
  port: config.EMAIL_SERVER_PORT ? parseInt(config.EMAIL_SERVER_PORT) : 587,
  user: config.EMAIL_SERVER_USER,
  password: config.EMAIL_SERVER_PASSWORD,
  from: config.EMAIL_FROM,
  enabled: !!(
    config.EMAIL_SERVER_HOST &&
    config.EMAIL_SERVER_USER &&
    config.EMAIL_SERVER_PASSWORD &&
    config.EMAIL_FROM
  ),
} as const;

// Redis configuration
export const redisConfig = {
  url: config.REDIS_URL,
  upstash: {
    url: config.UPSTASH_REDIS_REST_URL,
    token: config.UPSTASH_REDIS_REST_TOKEN,
    enabled: !!(config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN),
  },
  enabled: !!(config.REDIS_URL || (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN)),
} as const;

// Security configuration
export const securityConfig = {
  encryptionKey: config.ENCRYPTION_KEY,
  allowedOrigins: config.ALLOWED_ORIGINS?.split(',') || [config.NEXT_PUBLIC_APP_URL],
  csrfSecret: config.CSRF_SECRET || config.NEXTAUTH_SECRET,
  rateLimiting: {
    enabled: config.RATE_LIMIT_ENABLED,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
} as const;

// File storage configuration
export const storageConfig = {
  aws: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    bucket: config.AWS_S3_BUCKET,
    region: config.AWS_REGION || 'us-east-1',
    enabled: !!(
      config.AWS_ACCESS_KEY_ID &&
      config.AWS_SECRET_ACCESS_KEY &&
      config.AWS_S3_BUCKET
    ),
  },
} as const;

// AI configuration
export const aiConfig = {
  openai: {
    apiKey: config.OPENAI_API_KEY,
    enabled: !!config.OPENAI_API_KEY && featureFlags.enableAI,
  },
} as const;

// WebSocket configuration
export const websocketConfig = {
  enabled: config.WEBSOCKET_ENABLED,
  port: config.WEBSOCKET_PORT ? parseInt(config.WEBSOCKET_PORT) : undefined,
  cors: {
    origin: config.NEXT_PUBLIC_APP_URL,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
} as const;

// Monitoring configuration
export const monitoringConfig = {
  sentry: {
    dsn: config.SENTRY_DSN,
    enabled: !!config.SENTRY_DSN,
  },
} as const;

// Application constants
export const appConstants = {
  name: 'AstralCore',
  version: '5.0.0',
  supportEmail: 'support@astralcore.app',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  supportedDocumentTypes: ['application/pdf', 'text/plain'],
  defaultTimezone: 'UTC',
  defaultLanguage: 'en',
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
  session: {
    cookieName: config.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token',
  },
} as const;

// Runtime environment helpers
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

// Configuration validation helper
export function validateRequiredConfig(requiredFeatures: string[]) {
  const missing: string[] = [];
  
  requiredFeatures.forEach(feature => {
    switch (feature) {
      case 'database':
        if (!config.DATABASE_URL) missing.push('DATABASE_URL');
        break;
      case 'auth':
        if (!config.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET');
        break;
      case 'encryption':
        if (!config.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
        break;
      case 'email':
        if (!emailConfig.enabled) missing.push('Email configuration');
        break;
      case 'redis':
        if (!redisConfig.enabled) missing.push('Redis configuration');
        break;
      case 'storage':
        if (!storageConfig.aws.enabled) missing.push('AWS S3 configuration');
        break;
      case 'ai':
        if (!aiConfig.openai.enabled) missing.push('OpenAI configuration');
        break;
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

// Named default export object  
const AppConfig = {
  app: appConstants,
  env: config,
  features: featureFlags,
  database: databaseConfig,
  auth: authConfig,
  email: emailConfig,
  redis: redisConfig,
  security: securityConfig,
  storage: storageConfig,
  ai: aiConfig,
  websocket: websocketConfig,
  monitoring: monitoringConfig,
  
  // Utility functions
  isProduction,
  isDevelopment,
  isTest,
  validateRequiredConfig,
};

export default AppConfig;