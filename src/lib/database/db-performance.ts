/**
 * Database Performance Utilities for AstralCore Mental Health Platform
 * 
 * This module provides comprehensive database performance monitoring and optimization tools:
 * - Database statistics collection and analysis
 * - Table bloat detection and management
 * - Vacuum scheduling and automation
 * - Index usage monitoring and optimization
 * - Dead tuple management
 * - Connection pool monitoring
 * - Performance alerting and reporting
 */

import { Pool, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';

/**
 * Database statistics interface
 */
interface DatabaseStats {
  databaseSize: string;
  tableCount: number;
  indexCount: number;
  connections: {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
  };
  cacheHitRatio: number;
  transactionsPerSecond: number;
  lastVacuum: Date | null;
  lastAnalyze: Date | null;
}

/**
 * Table bloat information
 */
interface TableBloat {
  schemaName: string;
  tableName: string;
  actualSize: string;
  expectedSize: string;
  bloatSize: string;
  bloatRatio: number;
  deadTuples: number;
  liveTuples: number;
  fillFactor: number;
  lastVacuum: Date | null;
  lastAutoVacuum: Date | null;
  needsVacuum: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Index usage statistics
 */
interface IndexUsage {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexSize: string;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  usageRatio: number;
  isUsed: boolean;
  recommendation: 'KEEP' | 'CONSIDER_DROPPING' | 'REBUILD' | 'ANALYZE';
}

/**
 * Connection pool metrics
 */
interface PoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
  averageWaitTime: number;
  connectionErrors: number;
  connectionsPerMinute: number;
  slowQueries: number;
  blockedQueries: number;
}

/**
 * Performance alert configuration
 */
interface PerformanceAlert {
  type: 'SLOW_QUERY' | 'HIGH_CONNECTIONS' | 'BLOAT_WARNING' | 'CACHE_MISS' | 'LOCK_TIMEOUT';
  threshold: number;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

/**
 * Main Database Performance Monitor Class
 */
export class DatabasePerformanceMonitor {
  private pool: Pool;
  private prisma: PrismaClient;
  private performanceAlerts: Map<string, PerformanceAlert> = new Map();
  private metricsHistory: Map<string, any[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeConnections();
    this.setupPerformanceAlerts();
  }

  /**
   * Initialize database connections
   */
  private initializeConnections(): void {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Use fewer connections for monitoring
      application_name: 'AstralCore_PerformanceMonitor',
    });

    this.prisma = new PrismaClient();
  }

  /**
   * Setup default performance alert thresholds
   */
  private setupPerformanceAlerts(): void {
    this.performanceAlerts.set('slow_query', {
      type: 'SLOW_QUERY',
      threshold: 5000, // 5 seconds
      severity: 'WARNING',
      enabled: true,
      cooldownMinutes: 15,
    });

    this.performanceAlerts.set('high_connections', {
      type: 'HIGH_CONNECTIONS',
      threshold: 0.8, // 80% of max connections
      severity: 'WARNING',
      enabled: true,
      cooldownMinutes: 10,
    });

    this.performanceAlerts.set('bloat_warning', {
      type: 'BLOAT_WARNING',
      threshold: 0.3, // 30% bloat ratio
      severity: 'WARNING',
      enabled: true,
      cooldownMinutes: 60,
    });

    this.performanceAlerts.set('cache_miss', {
      type: 'CACHE_MISS',
      threshold: 0.85, // Cache hit ratio below 85%
      severity: 'WARNING',
      enabled: true,
      cooldownMinutes: 30,
    });
  }

  /**
   * Collect comprehensive database statistics
   */
  public async collectDatabaseStats(): Promise<DatabaseStats> {
    const client = await this.pool.connect();
    
    try {
      // Database size
      const dbSizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      // Table and index counts
      const tableCountResult = await client.query(`
        SELECT 
          COUNT(CASE WHEN schemaname NOT IN ('information_schema', 'pg_catalog') THEN 1 END) as table_count,
          COUNT(indexname) as index_count
        FROM pg_stat_user_tables t
        LEFT JOIN pg_stat_user_indexes i ON t.relid = i.relid
      `);
      
      // Connection statistics
      const connectionStats = await client.query(`
        SELECT 
          COUNT(*) as active_connections,
          COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      // Cache hit ratio
      const cacheHitResult = await client.query(`
        SELECT 
          ROUND(
            SUM(blks_hit) * 100.0 / (SUM(blks_hit) + SUM(blks_read) + 1), 2
          ) as cache_hit_ratio
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);
      
      // Transaction rate
      const txnRateResult = await client.query(`
        SELECT 
          xact_commit + xact_rollback as total_transactions
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);
      
      // Last vacuum/analyze times
      const maintenanceResult = await client.query(`
        SELECT 
          MAX(last_vacuum) as last_vacuum,
          MAX(last_analyze) as last_analyze
        FROM pg_stat_user_tables
      `);

      const stats: DatabaseStats = {
        databaseSize: dbSizeResult.rows[0].size,
        tableCount: tableCountResult.rows[0].table_count,
        indexCount: tableCountResult.rows[0].index_count,
        connections: {
          active: connectionStats.rows[0].active_connections - connectionStats.rows[0].idle_connections,
          idle: connectionStats.rows[0].idle_connections,
          total: connectionStats.rows[0].active_connections,
          maxConnections: connectionStats.rows[0].max_connections,
        },
        cacheHitRatio: parseFloat(cacheHitResult.rows[0].cache_hit_ratio || '0'),
        transactionsPerSecond: 0, // Would calculate this based on historical data
        lastVacuum: maintenanceResult.rows[0].last_vacuum,
        lastAnalyze: maintenanceResult.rows[0].last_analyze,
      };

      return stats;
    } finally {
      client.release();
    }
  }

  /**
   * Detect table bloat across all user tables
   */
  public async detectTableBloat(): Promise<TableBloat[]> {
    const client = await this.pool.connect();
    
    try {
      const bloatQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS actual_size,
          pg_size_pretty(
            (n_tup_del + n_tup_upd + n_tup_ins) * 
            (SELECT setting::int FROM pg_settings WHERE name = 'block_size') / 1024
          ) AS expected_size,
          CASE 
            WHEN n_tup_del + n_tup_upd > 0 THEN 
              ROUND((n_tup_del::float / (n_tup_del + n_tup_upd + n_tup_ins)) * 100, 2)
            ELSE 0 
          END AS bloat_ratio,
          n_tup_del as dead_tuples,
          n_tup_ins + n_tup_upd - n_tup_del as live_tuples,
          COALESCE(
            (SELECT reloptions[1] FROM pg_class WHERE relname = tablename LIMIT 1), 
            'fillfactor=100'
          ) as fill_factor,
          last_vacuum,
          last_autovacuum
        FROM pg_stat_user_tables
        ORDER BY 
          CASE 
            WHEN n_tup_del + n_tup_upd > 0 THEN 
              (n_tup_del::float / (n_tup_del + n_tup_upd + n_tup_ins))
            ELSE 0 
          END DESC
      `;

      const result = await client.query(bloatQuery);
      
      return result.rows.map(row => {
        const bloatRatio = parseFloat(row.bloat_ratio) / 100;
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        
        if (bloatRatio > 0.5) priority = 'CRITICAL';
        else if (bloatRatio > 0.3) priority = 'HIGH';
        else if (bloatRatio > 0.15) priority = 'MEDIUM';
        
        return {
          schemaName: row.schemaname,
          tableName: row.tablename,
          actualSize: row.actual_size,
          expectedSize: row.expected_size,
          bloatSize: row.bloat_size || '0 bytes',
          bloatRatio,
          deadTuples: parseInt(row.dead_tuples),
          liveTuples: parseInt(row.live_tuples),
          fillFactor: parseInt(row.fill_factor.match(/\d+/)?.[0] || '100'),
          lastVacuum: row.last_vacuum,
          lastAutoVacuum: row.last_autovacuum,
          needsVacuum: bloatRatio > 0.15 || row.dead_tuples > 10000,
          priority,
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Monitor index usage and provide recommendations
   */
  public async monitorIndexUsage(): Promise<IndexUsage[]> {
    const client = await this.pool.connect();
    
    try {
      const indexUsageQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          CASE 
            WHEN idx_scan > 0 THEN 
              ROUND((idx_tup_fetch::float / idx_tup_read) * 100, 2)
            ELSE 0 
          END as usage_ratio
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC, pg_relation_size(indexrelid) DESC
      `;

      const result = await client.query(indexUsageQuery);
      
      return result.rows.map(row => {
        const scans = parseInt(row.index_scans);
        const usageRatio = parseFloat(row.usage_ratio);
        let recommendation: 'KEEP' | 'CONSIDER_DROPPING' | 'REBUILD' | 'ANALYZE' = 'KEEP';
        
        if (scans === 0) {
          recommendation = 'CONSIDER_DROPPING';
        } else if (scans < 10) {
          recommendation = 'ANALYZE';
        } else if (usageRatio < 50) {
          recommendation = 'REBUILD';
        }
        
        return {
          schemaName: row.schemaname,
          tableName: row.tablename,
          indexName: row.indexname,
          indexSize: row.index_size,
          indexScans: scans,
          tuplesRead: parseInt(row.tuples_read),
          tuplesFetched: parseInt(row.tuples_fetched),
          usageRatio,
          isUsed: scans > 0,
          recommendation,
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Schedule and execute vacuum operations
   */
  public async scheduleVacuum(options: {
    tables?: string[];
    analyze?: boolean;
    full?: boolean;
    verbose?: boolean;
  } = {}): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const { tables, analyze = true, full = false, verbose = true } = options;
      
      // Get tables that need vacuuming if none specified
      let tablesToVacuum = tables;
      if (!tablesToVacuum) {
        const bloatedTables = await this.detectTableBloat();
        tablesToVacuum = bloatedTables
          .filter(table => table.needsVacuum)
          .map(table => `"${table.tableName}"`);
      }
      
      console.log(`[DBPerformance] Starting vacuum operation for ${tablesToVacuum?.length || 0} tables`);
      
      for (const table of tablesToVacuum || []) {
        const vacuumOptions = [
          full ? 'FULL' : '',
          analyze ? 'ANALYZE' : '',
          verbose ? 'VERBOSE' : '',
        ].filter(Boolean).join(', ');
        
        const vacuumCommand = `VACUUM ${vacuumOptions ? `(${vacuumOptions})` : ''} ${table}`;
        
        try {
          const startTime = Date.now();
          await client.query(vacuumCommand);
          const duration = Date.now() - startTime;
          
          console.log(`[DBPerformance] Vacuumed ${table} in ${duration}ms`);
        } catch (error) {
          console.error(`[DBPerformance] Failed to vacuum ${table}:`, error);
        }
      }
      
      console.log('[DBPerformance] Vacuum operation completed');
    } finally {
      client.release();
    }
  }

  /**
   * Get connection pool metrics
   */
  public async getConnectionPoolMetrics(): Promise<PoolMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Current connection stats
      const connectionStats = await client.query(`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
          COUNT(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_connections,
          COUNT(CASE WHEN query_start < NOW() - INTERVAL '30 seconds' AND state = 'active' THEN 1 END) as slow_queries,
          COUNT(CASE WHEN wait_event = 'Lock' THEN 1 END) as blocked_queries
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      const stats = connectionStats.rows[0];
      
      return {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
        maxConnections: parseInt(process.env.DB_POOL_MAX || '20'),
        averageWaitTime: 0, // Would calculate from historical data
        connectionErrors: 0, // Would track connection errors
        connectionsPerMinute: 0, // Would calculate from historical data
        slowQueries: parseInt(stats.slow_queries),
        blockedQueries: parseInt(stats.blocked_queries),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Analyze slow queries and provide optimization suggestions
   */
  public async analyzeSlowQueries(limit: number = 10): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      // Requires pg_stat_statements extension
      const slowQueriesQuery = `
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          stddev_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_exec_time > 100  -- queries slower than 100ms on average
        ORDER BY mean_exec_time DESC
        LIMIT $1
      `;
      
      const result = await client.query(slowQueriesQuery, [limit]);
      
      return result.rows.map(row => ({
        query: row.query,
        calls: parseInt(row.calls),
        totalExecTime: parseFloat(row.total_exec_time),
        meanExecTime: parseFloat(row.mean_exec_time),
        maxExecTime: parseFloat(row.max_exec_time),
        hitPercent: parseFloat(row.hit_percent) || 0,
        recommendations: this.generateQueryRecommendations(row),
      }));
    } catch (error) {
      console.warn('[DBPerformance] pg_stat_statements extension not available:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Generate maintenance recommendations based on current state
   */
  public async generateMaintenanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      // Check database statistics
      const stats = await this.collectDatabaseStats();
      
      if (stats.cacheHitRatio < 85) {
        recommendations.push(
          `Cache hit ratio is ${stats.cacheHitRatio}%. Consider increasing shared_buffers or optimizing queries.`
        );
      }
      
      if (stats.connections.active / stats.connections.maxConnections > 0.8) {
        recommendations.push(
          `High connection usage (${stats.connections.active}/${stats.connections.maxConnections}). Consider connection pooling optimization.`
        );
      }
      
      // Check table bloat
      const bloatedTables = await this.detectTableBloat();
      const criticalBloat = bloatedTables.filter(table => table.priority === 'CRITICAL');
      
      if (criticalBloat.length > 0) {
        recommendations.push(
          `${criticalBloat.length} tables have critical bloat levels. Run VACUUM FULL on: ${criticalBloat.map(t => t.tableName).join(', ')}`
        );
      }
      
      // Check unused indexes
      const indexUsage = await this.monitorIndexUsage();
      const unusedIndexes = indexUsage.filter(index => index.recommendation === 'CONSIDER_DROPPING');
      
      if (unusedIndexes.length > 0) {
        recommendations.push(
          `${unusedIndexes.length} indexes are unused and can potentially be dropped to improve write performance.`
        );
      }
      
      // Check if maintenance is overdue
      const daysSinceVacuum = stats.lastVacuum ? 
        Math.floor((Date.now() - stats.lastVacuum.getTime()) / (1000 * 60 * 60 * 24)) : 
        999;
      
      if (daysSinceVacuum > 7) {
        recommendations.push(
          `Last vacuum was ${daysSinceVacuum} days ago. Schedule regular vacuum operations.`
        );
      }
      
    } catch (error) {
      console.error('[DBPerformance] Failed to generate recommendations:', error);
      recommendations.push('Unable to generate recommendations due to error. Check logs.');
    }
    
    return recommendations;
  }

  /**
   * Start continuous performance monitoring
   */
  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[DBPerformance] Health check failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`[DBPerformance] Started monitoring with ${intervalMinutes} minute intervals`);
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[DBPerformance] Stopped monitoring');
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const stats = await this.collectDatabaseStats();
    
    // Check alerts
    await this.checkPerformanceAlerts(stats);
    
    // Store metrics history
    this.storeMetricsHistory('database_stats', stats);
    
    // Log key metrics
    console.log('[DBPerformance] Health check completed', {
      cacheHitRatio: `${stats.cacheHitRatio}%`,
      activeConnections: `${stats.connections.active}/${stats.connections.maxConnections}`,
      databaseSize: stats.databaseSize,
    });
  }

  /**
   * Check performance alerts and trigger notifications
   */
  private async checkPerformanceAlerts(stats: DatabaseStats): Promise<void> {
    // Cache hit ratio alert
    const cacheAlert = this.performanceAlerts.get('cache_miss');
    if (cacheAlert?.enabled && stats.cacheHitRatio < cacheAlert.threshold * 100) {
      this.triggerAlert('cache_miss', `Cache hit ratio is ${stats.cacheHitRatio}%`);
    }
    
    // High connections alert
    const connectionAlert = this.performanceAlerts.get('high_connections');
    if (connectionAlert?.enabled) {
      const connectionRatio = stats.connections.active / stats.connections.maxConnections;
      if (connectionRatio > connectionAlert.threshold) {
        this.triggerAlert('high_connections', `Connection usage is ${(connectionRatio * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alertKey: string, message: string): void {
    const alert = this.performanceAlerts.get(alertKey);
    if (!alert) return;
    
    // Check cooldown
    if (alert.lastTriggered) {
      const cooldownExpired = Date.now() - alert.lastTriggered.getTime() > alert.cooldownMinutes * 60 * 1000;
      if (!cooldownExpired) return;
    }
    
    // Log alert
    console.warn(`[DBPerformance] ${alert.severity} Alert: ${message}`);
    
    // Update last triggered time
    alert.lastTriggered = new Date();
    this.performanceAlerts.set(alertKey, alert);
    
    // Here you could integrate with your notification system
  }

  /**
   * Store metrics in history for trend analysis
   */
  private storeMetricsHistory(key: string, data: any): void {
    if (!this.metricsHistory.has(key)) {
      this.metricsHistory.set(key, []);
    }
    
    const history = this.metricsHistory.get(key)!;
    history.push({ timestamp: new Date(), data });
    
    // Keep only last 24 hours of 5-minute intervals
    const maxEntries = 24 * 12; // 288 entries
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }
  }

  /**
   * Generate query optimization recommendations
   */
  private generateQueryRecommendations(queryStats: any): string[] {
    const recommendations: string[] = [];
    
    if (queryStats.hit_percent < 80) {
      recommendations.push('Consider optimizing query to improve buffer cache usage');
    }
    
    if (queryStats.mean_exec_time > 1000) {
      recommendations.push('Query is consistently slow - check for missing indexes or query optimization opportunities');
    }
    
    if (queryStats.calls > 1000 && queryStats.mean_exec_time > 100) {
      recommendations.push('High-frequency slow query - consider caching results or query optimization');
    }
    
    return recommendations;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopMonitoring();
    await this.pool.end();
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let performanceMonitor: DatabasePerformanceMonitor | null = null;

export function getDatabasePerformanceMonitor(): DatabasePerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new DatabasePerformanceMonitor();
  }
  return performanceMonitor;
}

// Export utility functions
export async function performDatabaseHealthCheck(): Promise<{
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: string[];
  recommendations: string[];
}> {
  const monitor = getDatabasePerformanceMonitor();
  
  try {
    const stats = await monitor.collectDatabaseStats();
    const bloat = await monitor.detectTableBloat();
    const recommendations = await monitor.generateMaintenanceRecommendations();
    
    const issues: string[] = [];
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    // Check for critical issues
    if (stats.cacheHitRatio < 70) {
      issues.push(`Low cache hit ratio: ${stats.cacheHitRatio}%`);
      status = 'CRITICAL';
    }
    
    const criticalBloat = bloat.filter(table => table.priority === 'CRITICAL');
    if (criticalBloat.length > 0) {
      issues.push(`${criticalBloat.length} tables with critical bloat`);
      status = status === 'HEALTHY' ? 'WARNING' : 'CRITICAL';
    }
    
    const connectionRatio = stats.connections.active / stats.connections.maxConnections;
    if (connectionRatio > 0.9) {
      issues.push(`Very high connection usage: ${(connectionRatio * 100).toFixed(1)}%`);
      status = 'CRITICAL';
    } else if (connectionRatio > 0.8) {
      issues.push(`High connection usage: ${(connectionRatio * 100).toFixed(1)}%`);
      status = status === 'HEALTHY' ? 'WARNING' : status;
    }
    
    return {
      status,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error('[DBPerformance] Health check failed:', error);
    return {
      status: 'CRITICAL',
      issues: ['Database health check failed'],
      recommendations: ['Check database connectivity and permissions'],
    };
  }
}

export default getDatabasePerformanceMonitor;