
/**
 * Health Check System - Ultra Simplified for TypeScript Compliance
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, any>;
  timestamp: string;
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheckResult[];
  uptime: number;
  timestamp: string;
}

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
}

class HealthCheckService {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private config: HealthCheckConfig;

  constructor(config: HealthCheckConfig = { interval: 30000, timeout: 5000, retries: 3 }) {
    this.config = config;
  }

  registerCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const start = Date.now();
    const check = this.checks.get(name);
    
    if (!check) {
      return {
        name,
        status: 'unhealthy',
        message: 'Check not found',
        duration: 0,
      };
    }

    try {
      const result = await Promise.race([
        check(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        )
      ]);

      return {
        name,
        status: result ? 'healthy' : 'unhealthy',
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        name,
        status: 'unhealthy',
        message: error.message || 'Check failed',
        duration: Date.now() - start,
      };
    }
  }

  async checkHealth(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];
    
    for (const [name] of this.checks) {
      const result = await this.runCheck(name);
      checks.push(result);
    }

    const overallStatus = this.determineOverallStatus(checks);

    return {
      overall: overallStatus,
      checks,
      uptime: process.uptime() || 0,
      timestamp: new Date().toISOString(),
    };
  }

  private determineOverallStatus(checks: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (checks.length === 0) return 'healthy';
    
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const totalCount = checks.length;
    
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount === 0) return 'unhealthy';
    return 'degraded';
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.checkHealth();
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();

// Register default checks
healthCheckService.registerCheck('database', async () => {
  // Mock database check
  return Math.random() > 0.1; // 90% success rate
});

healthCheckService.registerCheck('redis', async () => {
  // Mock redis check
  return Math.random() > 0.05; // 95% success rate
});

healthCheckService.registerCheck('external-api', async () => {
  // Mock external API check
  return Math.random() > 0.2; // 80% success rate
});

export default healthCheckService;