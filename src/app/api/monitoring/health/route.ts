/**
 * Health Check API Endpoint
 * Provides system health status for monitoring and load balancers
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthCheckService } from '@/lib/monitoring/health-check';
import { auditTrailService } from '@/lib/monitoring/audit-trail';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the health check request
    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'health_check_requested',
      outcome: 'success',
      description: 'System health check requested',
      endpoint: '/api/monitoring/health',
      method: 'GET',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Get system health
    const systemHealth = await healthCheckService.getSystemHealth();
    const responseTime = Date.now() - startTime;

    // Determine HTTP status based on health
    let statusCode = 200;
    if (systemHealth.overall === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (systemHealth.overall === 'degraded') {
      statusCode = 207; // Multi-Status (partial success)
    }

    const response = {
      status: systemHealth.overall,
      timestamp: systemHealth.timestamp,
      uptime: systemHealth.uptime,
      version: systemHealth.version,
      environment: systemHealth.environment,
      responseTime,
      services: systemHealth.services.map(service => ({
        name: service.name,
        status: service.status,
        responseTime: service.responseTime,
        message: service.message,
        lastCheck: service.timestamp,
      })),
      resources: {
        memory: {
          status: systemHealth.resources.memory.status,
          usage: `${systemHealth.resources.memory.percentage.toFixed(1)}%`,
          used: formatBytes(systemHealth.resources.memory.used),
          total: formatBytes(systemHealth.resources.memory.total),
        },
        cpu: {
          status: systemHealth.resources.cpu.status,
          usage: `${systemHealth.resources.cpu.usage.toFixed(1)}%`,
          loadAverage: systemHealth.resources.cpu.loadAverage,
        },
        disk: {
          status: systemHealth.resources.disk.status,
          usage: `${systemHealth.resources.disk.percentage.toFixed(1)}%`,
          used: formatBytes(systemHealth.resources.disk.used),
          total: formatBytes(systemHealth.resources.disk.total),
        },
      },
    };

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Health check API error:', error);

    // Log the error
    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'health_check_failed',
      outcome: 'failure',
      description: 'System health check failed',
      endpoint: '/api/monitoring/health',
      method: 'GET',
      details: { error: (error as Error).message },
      logLevel: 'error',
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Simplified health check for load balancers
 */
export async function HEAD(request: NextRequest) {
  try {
    const systemHealth = await healthCheckService.getSystemHealth();
    
    if (systemHealth.overall === 'unhealthy') {
      return new NextResponse(null, { status: 503 });
    }
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}