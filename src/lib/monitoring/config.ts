/**
 * Monitoring Configuration
 * HIPAA-compliant monitoring settings for Astral Core platform
 */

export interface MonitoringConfig {
  // Performance thresholds
  performance: {
    responseTimeThreshold: number; // ms
    memoryThreshold: number; // percentage
    cpuThreshold: number; // percentage
    diskSpaceThreshold: number; // percentage
    databaseQueryThreshold: number; // ms
    webSocketConnectionThreshold: number;
  };

  // Health check intervals
  healthCheck: {
    databaseInterval: number; // ms
    redisInterval: number; // ms
    apiInterval: number; // ms
    webSocketInterval: number; // ms
    systemResourcesInterval: number; // ms
  };

  // Alert settings
  alerts: {
    enabled: boolean;
    channels: {
      email: boolean;
      sms: boolean;
      slack: boolean;
      webhook: boolean;
    };
    escalation: {
      levels: number;
      timeouts: number[]; // ms for each level
    };
    suppression: {
      enabled: boolean;
      window: number; // ms
      maxAlerts: number;
    };
    crisis: {
      enabled: boolean;
      immediateNotification: boolean;
      channels: string[];
    };
  };

  // Audit and compliance
  audit: {
    enabled: boolean;
    retention: {
      days: number;
      maxSize: string; // e.g., "10GB"
    };
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
    hipaaCompliance: {
      enabled: boolean;
      logLevel: 'minimal' | 'standard' | 'detailed';
      excludeFields: string[];
    };
  };

  // Analytics
  analytics: {
    enabled: boolean;
    sampling: {
      rate: number; // 0-1
      strategy: 'random' | 'systematic' | 'stratified';
    };
    retention: {
      days: number;
      aggregationLevels: string[];
    };
    privacy: {
      anonymizeUsers: boolean;
      hashUserIds: boolean;
    };
  };

  // Error tracking
  errorTracking: {
    enabled: boolean;
    captureUnhandled: boolean;
    captureRejections: boolean;
    beforeSend: boolean; // Apply filtering before sending
    maxBreadcrumbs: number;
    sampleRate: number; // 0-1
    environment: string;
  };

  // Metrics collection
  metrics: {
    enabled: boolean;
    interval: number; // ms
    prometheus: {
      enabled: boolean;
      port: number;
      path: string;
    };
    custom: {
      enabled: boolean;
      prefix: string;
    };
  };

  // Notification channels
  notifications: {
    email: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      from: string;
      templates: {
        alert: string;
        recovery: string;
        crisis: string;
      };
    };
    slack: {
      enabled: boolean;
      webhook: string;
      channels: {
        alerts: string;
        crisis: string;
        maintenance: string;
      };
    };
    webhook: {
      enabled: boolean;
      url: string;
      timeout: number; // ms
      retries: number;
    };
  };
}

// Default configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  performance: {
    responseTimeThreshold: 2000, // 2 seconds
    memoryThreshold: 80, // 80%
    cpuThreshold: 80, // 80%
    diskSpaceThreshold: 85, // 85%
    databaseQueryThreshold: 1000, // 1 second
    webSocketConnectionThreshold: 1000,
  },

  healthCheck: {
    databaseInterval: 30000, // 30 seconds
    redisInterval: 15000, // 15 seconds
    apiInterval: 60000, // 1 minute
    webSocketInterval: 30000, // 30 seconds
    systemResourcesInterval: 10000, // 10 seconds
  },

  alerts: {
    enabled: true,
    channels: {
      email: true,
      sms: false,
      slack: true,
      webhook: true,
    },
    escalation: {
      levels: 3,
      timeouts: [300000, 900000, 1800000], // 5min, 15min, 30min
    },
    suppression: {
      enabled: true,
      window: 300000, // 5 minutes
      maxAlerts: 10,
    },
    crisis: {
      enabled: true,
      immediateNotification: true,
      channels: ['email', 'slack', 'sms'],
    },
  },

  audit: {
    enabled: true,
    retention: {
      days: 2555, // 7 years for HIPAA compliance
      maxSize: "100GB",
    },
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
    },
    hipaaCompliance: {
      enabled: true,
      logLevel: 'standard',
      excludeFields: [
        'password',
        'ssn',
        'creditCard',
        'bankAccount',
        'sessionToken',
        'apiKey',
      ],
    },
  },

  analytics: {
    enabled: true,
    sampling: {
      rate: 0.1, // 10% sampling
      strategy: 'random',
    },
    retention: {
      days: 365,
      aggregationLevels: ['hourly', 'daily', 'weekly', 'monthly'],
    },
    privacy: {
      anonymizeUsers: true,
      hashUserIds: true,
    },
  },

  errorTracking: {
    enabled: true,
    captureUnhandled: true,
    captureRejections: true,
    beforeSend: true,
    maxBreadcrumbs: 100,
    sampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
  },

  metrics: {
    enabled: true,
    interval: 10000, // 10 seconds
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics',
    },
    custom: {
      enabled: true,
      prefix: 'astralcore_',
    },
  },

  notifications: {
    email: {
      enabled: true,
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      from: process.env.ALERT_FROM_EMAIL || 'alerts@astralcore.com',
      templates: {
        alert: 'alert-template',
        recovery: 'recovery-template',
        crisis: 'crisis-template',
      },
    },
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL || '',
      channels: {
        alerts: process.env.SLACK_ALERTS_CHANNEL || '#alerts',
        crisis: process.env.SLACK_CRISIS_CHANNEL || '#crisis',
        maintenance: process.env.SLACK_MAINTENANCE_CHANNEL || '#maintenance',
      },
    },
    webhook: {
      enabled: !!process.env.ALERT_WEBHOOK_URL,
      url: process.env.ALERT_WEBHOOK_URL || '',
      timeout: 5000,
      retries: 3,
    },
  },
};

// Environment-specific configurations
export const getMonitoringConfig = (): MonitoringConfig => {
  const env = process.env.NODE_ENV;
  const baseConfig = { ...defaultMonitoringConfig };

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          sampling: {
            rate: 0.05, // 5% in production
            strategy: 'systematic',
          },
        },
        errorTracking: {
          ...baseConfig.errorTracking,
          sampleRate: 0.1, // 10% error sampling in production
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          sampling: {
            rate: 0.2, // 20% in staging
            strategy: 'random',
          },
        },
      };

    case 'development':
    default:
      return {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          sampling: {
            rate: 1.0, // 100% in development
            strategy: 'random',
          },
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          databaseInterval: 60000, // Less frequent in dev
          redisInterval: 60000,
        },
      };
  }
};

// Configuration validation
export const validateMonitoringConfig = (config: MonitoringConfig): boolean => {
  try {
    // Validate performance thresholds
    if (config.performance.responseTimeThreshold <= 0) return false;
    if (config.performance.memoryThreshold < 0 || config.performance.memoryThreshold > 100) return false;
    if (config.performance.cpuThreshold < 0 || config.performance.cpuThreshold > 100) return false;
    
    // Validate health check intervals
    if (config.healthCheck.databaseInterval <= 0) return false;
    if (config.healthCheck.redisInterval <= 0) return false;
    
    // Validate alert settings
    if (config.alerts.escalation.levels <= 0) return false;
    if (config.alerts.escalation.timeouts.length !== config.alerts.escalation.levels) return false;
    
    // Validate audit retention
    if (config.audit.retention.days <= 0) return false;
    
    // Validate analytics sampling
    if (config.analytics.sampling.rate < 0 || config.analytics.sampling.rate > 1) return false;
    
    return true;
  } catch (error) {
    console.error('Configuration validation error:', error);
    return false;
  }
};

export type { MonitoringConfig };