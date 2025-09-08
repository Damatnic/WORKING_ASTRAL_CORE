/**
 * Performance Monitoring Service
 * Real-time performance metrics collection for Astral Core platform
 */

import { EventEmitter } from 'events';
import { getMonitoringConfig, MonitoringConfig } from './config';

export interface PerformanceMetrics {
  timestamp: number;
  
  // System metrics
  memory: {
    used: number;
    total: number;
    percentage: number;
    heap: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  
  // Application metrics
  responses: {
    total: number;
    averageTime: number;
    p95: number;
    p99: number;
    errors: number;
    errorRate: number;
  };
  
  // Database metrics
  database: {
    connections: {
      active: number;
      total: number;
      idle: number;
    };
    queries: {
      total: number;
      averageTime: number;
      slowQueries: number;
    };
  };
  
  // WebSocket metrics
  websocket: {
    connections: number;
    messagesPerSecond: number;
    errors: number;
  };
  
  // Custom metrics
  custom: Record<string, number | string>;
}

export interface ResponseTimeEntry {
  path: string;
  method: string;
  duration: number;
  timestamp: number;
  statusCode: number;
  userId?: string;
  userAgent?: string;
}

export interface DatabaseQueryEntry {
  query: string;
  duration: number;
  timestamp: number;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
}

class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: PerformanceMetrics;
  private responseTimes: ResponseTimeEntry[] = [];
  private databaseQueries: DatabaseQueryEntry[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timer | null = null;
  private startTime = Date.now();
  
  // Metrics storage
  private responseTimeWindow = 60000; // 1 minute window
  private databaseQueryWindow = 60000; // 1 minute window
  private maxStoredEntries = 1000;

  constructor() {
    super();
    this.config = getMonitoringConfig();
    this.metrics = this.initializeMetrics();
    
    if (this.config.metrics.enabled) {
      this.startMonitoring();
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        heap: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      },
      cpu: {
        usage: 0,
        loadAverage: [],
      },
      responses: {
        total: 0,
        averageTime: 0,
        p95: 0,
        p99: 0,
        errors: 0,
        errorRate: 0,
      },
      database: {
        connections: {
          active: 0,
          total: 0,
          idle: 0,
        },
        queries: {
          total: 0,
          averageTime: 0,
          slowQueries: 0,
        },
      },
      websocket: {
        connections: 0,
        messagesPerSecond: 0,
        errors: 0,
      },
      custom: {},
    };
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metrics.interval);
    
    // Clean up old data periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 300000); // Every 5 minutes
    
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.emit('monitoring:stopped');
  }

  /**
   * Record API response time
   */
  public recordResponseTime(entry: Omit<ResponseTimeEntry, 'timestamp'>): void {
    const responseTime: ResponseTimeEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    
    this.responseTimes.push(responseTime);
    
    // Limit stored entries
    if (this.responseTimes.length > this.maxStoredEntries) {
      this.responseTimes = this.responseTimes.slice(-this.maxStoredEntries);
    }
    
    // Emit alert if response time exceeds threshold
    if (entry.duration > this.config.performance.responseTimeThreshold) {
      this.emit('alert:slow_response', {
        type: 'slow_response',
        severity: 'warning',
        message: `Slow response detected: ${entry.path} took ${entry.duration}ms`,
        data: responseTime,
      });
    }
  }

  /**
   * Record database query performance
   */
  public recordDatabaseQuery(entry: Omit<DatabaseQueryEntry, 'timestamp'>): void {
    const queryEntry: DatabaseQueryEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    
    this.databaseQueries.push(queryEntry);
    
    // Limit stored entries
    if (this.databaseQueries.length > this.maxStoredEntries) {
      this.databaseQueries = this.databaseQueries.slice(-this.maxStoredEntries);
    }
    
    // Emit alert if query is slow
    if (entry.duration > this.config.performance.databaseQueryThreshold) {
      this.emit('alert:slow_query', {
        type: 'slow_query',
        severity: 'warning',
        message: `Slow database query detected: ${entry.duration}ms`,
        data: queryEntry,
      });
    }
  }

  /**
   * Record custom metric
   */
  public recordCustomMetric(name: string, value: number | string): void {
    this.metrics.custom[name] = value;
    this.emit('metric:custom', { name, value });
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get response time statistics
   */
  public getResponseTimeStats(timeWindow?: number): {
    count: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
    errorRate: number;
  } {
    const window = timeWindow || this.responseTimeWindow;
    const cutoff = Date.now() - window;
    
    const recentResponses = this.responseTimes.filter(r => r.timestamp > cutoff);
    
    if (recentResponses.length === 0) {
      return {
        count: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
      };
    }
    
    const durations = recentResponses.map(r => r.duration).sort((a, b) => a - b);
    const errors = recentResponses.filter(r => r.statusCode >= 400).length;
    
    return {
      count: recentResponses.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errorRate: errors / recentResponses.length,
    };
  }

  /**
   * Get database query statistics
   */
  public getDatabaseQueryStats(timeWindow?: number): {
    count: number;
    average: number;
    slowQueries: number;
    operationBreakdown: Record<string, number>;
  } {
    const window = timeWindow || this.databaseQueryWindow;
    const cutoff = Date.now() - window;
    
    const recentQueries = this.databaseQueries.filter(q => q.timestamp > cutoff);
    
    if (recentQueries.length === 0) {
      return {
        count: 0,
        average: 0,
        slowQueries: 0,
        operationBreakdown: {},
      };
    }
    
    const durations = recentQueries.map(q => q.duration);
    const slowQueries = recentQueries.filter(
      q => q.duration > this.config.performance.databaseQueryThreshold
    ).length;
    
    const operationBreakdown = recentQueries.reduce((acc, query) => {
      acc[query.operation] = (acc[query.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      count: recentQueries.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowQueries,
      operationBreakdown,
    };
  }

  /**
   * Collect system and application metrics
   */
  private collectMetrics(): void {
    try {
      // System metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Update memory metrics
      this.metrics.memory = {
        used: memoryUsage.rss,
        total: memoryUsage.rss + memoryUsage.external,
        percentage: (memoryUsage.rss / (memoryUsage.rss + memoryUsage.external)) * 100,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
      };
      
      // Update CPU metrics (simplified - would need OS-specific implementation for accurate CPU usage)
      this.metrics.cpu = {
        usage: (cpuUsage.user + cpuUsage.system) / 1000 / 1000, // Convert to percentage approximation
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      };
      
      // Update response time metrics
      const responseStats = this.getResponseTimeStats();
      this.metrics.responses = {
        total: responseStats.count,
        averageTime: responseStats.average,
        p95: responseStats.p95,
        p99: responseStats.p99,
        errors: responseStats.count * responseStats.errorRate,
        errorRate: responseStats.errorRate,
      };
      
      // Update database metrics
      const dbStats = this.getDatabaseQueryStats();
      this.metrics.database.queries = {
        total: dbStats.count,
        averageTime: dbStats.average,
        slowQueries: dbStats.slowQueries,
      };
      
      // Update timestamp
      this.metrics.timestamp = Date.now();
      
      // Check for alerts
      this.checkPerformanceThresholds();
      
      // Emit metrics update
      this.emit('metrics:updated', this.metrics);
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.emit('error', error);
    }
  }

  /**
   * Check performance thresholds and emit alerts
   */
  private checkPerformanceThresholds(): void {
    const thresholds = this.config.performance;
    
    // Memory threshold
    if (this.metrics.memory.percentage > thresholds.memoryThreshold) {
      this.emit('alert:high_memory', {
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage is ${this.metrics.memory.percentage.toFixed(1)}%`,
        data: this.metrics.memory,
      });
    }
    
    // CPU threshold
    if (this.metrics.cpu.usage > thresholds.cpuThreshold) {
      this.emit('alert:high_cpu', {
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage is ${this.metrics.cpu.usage.toFixed(1)}%`,
        data: this.metrics.cpu,
      });
    }
    
    // Response time threshold
    if (this.metrics.responses.averageTime > thresholds.responseTimeThreshold) {
      this.emit('alert:slow_responses', {
        type: 'slow_responses',
        severity: 'warning',
        message: `Average response time is ${this.metrics.responses.averageTime.toFixed(0)}ms`,
        data: this.metrics.responses,
      });
    }
    
    // Error rate threshold (5% error rate)
    if (this.metrics.responses.errorRate > 0.05) {
      this.emit('alert:high_error_rate', {
        type: 'high_error_rate',
        severity: 'error',
        message: `Error rate is ${(this.metrics.responses.errorRate * 100).toFixed(1)}%`,
        data: this.metrics.responses,
      });
    }
  }

  /**
   * Clean up old performance data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    
    // Clean up response times
    this.responseTimes = this.responseTimes.filter(
      r => now - r.timestamp < this.responseTimeWindow * 5 // Keep 5x window
    );
    
    // Clean up database queries
    this.databaseQueries = this.databaseQueries.filter(
      q => now - q.timestamp < this.databaseQueryWindow * 5 // Keep 5x window
    );
  }

  /**
   * Get uptime in milliseconds
   */
  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted uptime string
   */
  public getFormattedUptime(): string {
    const uptime = this.getUptime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Export metrics for Prometheus
   */
  public getPrometheusMetrics(): string {
    const prefix = this.config.metrics.custom.prefix;
    const metrics = this.getCurrentMetrics();
    
    let output = '';
    
    // Memory metrics
    output += `# HELP ${prefix}memory_used_bytes Memory usage in bytes\n`;
    output += `# TYPE ${prefix}memory_used_bytes gauge\n`;
    output += `${prefix}memory_used_bytes ${metrics.memory.used}\n\n`;
    
    output += `# HELP ${prefix}memory_usage_percent Memory usage percentage\n`;
    output += `# TYPE ${prefix}memory_usage_percent gauge\n`;
    output += `${prefix}memory_usage_percent ${metrics.memory.percentage}\n\n`;
    
    // Response time metrics
    output += `# HELP ${prefix}response_time_avg Average response time in milliseconds\n`;
    output += `# TYPE ${prefix}response_time_avg gauge\n`;
    output += `${prefix}response_time_avg ${metrics.responses.averageTime}\n\n`;
    
    output += `# HELP ${prefix}response_error_rate Response error rate\n`;
    output += `# TYPE ${prefix}response_error_rate gauge\n`;
    output += `${prefix}response_error_rate ${metrics.responses.errorRate}\n\n`;
    
    // Database metrics
    output += `# HELP ${prefix}database_query_avg Average database query time in milliseconds\n`;
    output += `# TYPE ${prefix}database_query_avg gauge\n`;
    output += `${prefix}database_query_avg ${metrics.database.queries.averageTime}\n\n`;
    
    // Custom metrics
    Object.entries(metrics.custom).forEach(([name, value]) => {
      if (typeof value === 'number') {
        output += `# HELP ${prefix}custom_${name} Custom metric: ${name}\n`;
        output += `# TYPE ${prefix}custom_${name} gauge\n`;
        output += `${prefix}custom_${name} ${value}\n\n`;
      }
    });
    
    return output;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Express middleware for automatic response time tracking
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    performanceMonitor.recordResponseTime({
      path: req.path || req.url,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
};

export type {
  PerformanceMetrics,
  ResponseTimeEntry,
  DatabaseQueryEntry,
};

export default performanceMonitor;