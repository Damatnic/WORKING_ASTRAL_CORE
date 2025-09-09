import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth-middleware';
import {
  createAuditLog,
  successResponse,
  errorResponse,
  getClientIp,
} from '@/lib/api-utils';
import os from 'os';

// GET /api/admin/system-health - Get comprehensive system health metrics
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const includeDetails = searchParams.get('details') === 'true';
    
    // Collect system health metrics
    const healthData: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
    
    // Application health
    const appHealth = {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
    
    // System resources
    const systemResources = {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      memoryUsagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      hostname: os.hostname(),
      uptime: os.uptime(),
    };
    
    // Database health
    let databaseHealth: any = {
      status: 'unknown',
      responseTime: 0,
    };
    
    try {
      const startTime = Date.now();
      
      // Test database connection with a simple query
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
      const responseTime = Date.now() - startTime;
      
      // Get database statistics
      const [dbSize, connectionCount, tableStats] = await Promise.all([
        // Database size
        prisma.$queryRaw`
          SELECT pg_database_size(current_database()) as size
        `,
        
        // Connection count
        prisma.$queryRaw`
          SELECT 
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections,
            count(*) as total_connections,
            max_connections as max_connections
          FROM pg_stat_activity, pg_settings
          WHERE name = 'max_connections'
          GROUP BY max_connections
        `,
        
        // Table statistics
        prisma.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            n_live_tup as row_count
          FROM pg_stat_user_tables
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
          LIMIT 10
        `,
      ]);
      
      databaseHealth = {
        status: 'healthy',
        responseTime,
        size: (dbSize as any)[0]?.size || 0,
        connections: (connectionCount as any)[0] || {},
        largestTables: includeDetails ? tableStats : undefined,
      };
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      databaseHealth = {
        status: 'unhealthy',
        error: 'Database connection failed',
      };
      healthData.status = 'degraded';
    }
    
    // Application metrics
    const [
      activeUsers24h,
      totalUsers,
      activeSessions,
      recentErrors,
      pendingSafetyAlerts,
      unhandledCrisisReports,
    ] = await Promise.all([
      // Active users in last 24 hours
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Total users
      prisma.user.count(),
      
      // Active sessions
      prisma.session.count({
        where: {
          expiresAt: { gt: new Date() },
        },
      }),
      
      // Recent errors from audit log
      prisma.auditLog.count({
        where: {
          outcome: 'failure',
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      }),
      
      // Pending safety alerts
      prisma.safetyAlert.count({
        where: {
          handled: false,
        },
      }),
      
      // Unhandled crisis reports
      prisma.crisisReport.count({
        where: {
          resolved: false,
        },
      }),
    ]);
    
    const applicationMetrics = {
      activeUsers24h,
      totalUsers,
      activeSessions,
      recentErrors,
      alerts: {
        pendingSafetyAlerts,
        unhandledCrisisReports,
      },
    };
    
    // Check for critical issues
    const criticalIssues = [];
    
    if (databaseHealth.status === 'unhealthy') {
      criticalIssues.push('Database connection failed');
    }
    
    if (Number(systemResources.memoryUsagePercent) > 90) {
      criticalIssues.push('High memory usage');
    }
    
    if (recentErrors > 100) {
      criticalIssues.push('High error rate detected');
    }
    
    if (pendingSafetyAlerts > 10) {
      criticalIssues.push(`${pendingSafetyAlerts} pending safety alerts`);
    }
    
    if (unhandledCrisisReports > 5) {
      criticalIssues.push(`${unhandledCrisisReports} unhandled crisis reports`);
    }
    
    // Determine overall health status
    if (criticalIssues.length > 0) {
      healthData.status = 'critical';
      healthData.criticalIssues = criticalIssues;
    } else if (databaseHealth.responseTime > 1000 || recentErrors > 50) {
      healthData.status = 'degraded';
    }
    
    // Service dependencies health (if applicable)
    const dependencies: any = {};
    
    // Check Redis health if configured
    if (process.env.REDIS_URL) {
      dependencies.redis = {
        status: 'not_implemented',
        note: 'Redis health check not yet implemented',
      };
    }
    
    // Check email service health
    if (process.env.EMAIL_SERVER_HOST) {
      dependencies.email = {
        status: 'configured',
        host: process.env.EMAIL_SERVER_HOST,
      };
    }
    
    // Check external API health (e.g., OAuth providers)
    if (process.env.GOOGLE_CLIENT_ID) {
      dependencies.googleOAuth = {
        status: 'configured',
      };
    }
    
    // Background jobs health
    const backgroundJobs = {
      scheduled: 0, // Would come from job queue in production
      running: 0,
      failed: 0,
      completed24h: 0,
    };
    
    // Recent system events
    let recentEvents: any[] = [];
    if (includeDetails) {
      recentEvents = await prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'system.startup',
              'system.shutdown',
              'database.migration',
              'security.breach_attempt',
              'admin.system.config_change',
            ],
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          action: true,
          timestamp: true,
          outcome: true,
          details: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
      });
    }
    
    // Compile full health report
    healthData.application = appHealth;
    healthData.system = systemResources;
    healthData.database = databaseHealth;
    healthData.metrics = applicationMetrics;
    healthData.dependencies = dependencies;
    healthData.backgroundJobs = backgroundJobs;
    
    if (includeDetails) {
      healthData.recentEvents = recentEvents;
    }
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    if (healthData.status === 'critical') {
      healthScore = 25;
    } else if (healthData.status === 'degraded') {
      healthScore = 75;
    }
    
    // Adjust based on specific metrics
    if (databaseHealth.responseTime > 500) {
      healthScore -= 10;
    }
    if (Number(systemResources.memoryUsagePercent) > 80) {
      healthScore -= 10;
    }
    if (recentErrors > 10) {
      healthScore -= 5;
    }
    
    healthData.healthScore = Math.max(0, healthScore);
    
    // Recommendations
    const recommendations = [];
    
    if (Number(systemResources.memoryUsagePercent) > 80) {
      recommendations.push('Consider scaling up server resources due to high memory usage');
    }
    
    if (databaseHealth.connections?.active_connections > databaseHealth.connections?.max_connections * 0.8) {
      recommendations.push('Database connection pool is near capacity');
    }
    
    if (activeSessions > totalUsers * 2) {
      recommendations.push('High number of sessions detected - consider session cleanup');
    }
    
    if (pendingSafetyAlerts > 0) {
      recommendations.push(`Review ${pendingSafetyAlerts} pending safety alerts immediately`);
    }
    
    healthData.recommendations = recommendations;
    
    // Log system health check
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.system.health_check',
      resource: 'system',
      details: {
        status: healthData.status,
        healthScore: healthData.healthScore,
        criticalIssues: criticalIssues.length,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(healthData, 200);
  } catch (error) {
    console.error('System health check error:', error);
    
    // Even if there's an error, return a basic health response
    return successResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to collect all health metrics',
      basic: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
    }, 500);
  }
  });
}