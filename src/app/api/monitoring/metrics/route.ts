/**
 * Metrics API Endpoint
 * Prometheus-compatible metrics endpoint for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';
import { healthCheckService } from '@/lib/monitoring/health-check';
import { alertManager } from '@/lib/monitoring/alert-manager';
import { auditTrailService } from '@/lib/monitoring/audit-trail';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const acceptHeader = request.headers.get('accept') || '';
  const format = acceptHeader.includes('application/json') ? 'json' : 'prometheus';

  try {
    // Log the metrics request
    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'metrics_requested',
      outcome: 'success',
      description: 'System metrics requested',
      endpoint: '/api/monitoring/metrics',
      method: 'GET',
      details: { format },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (format === 'json') {
      // Return JSON format for dashboard consumption
      const metrics = await getJsonMetrics();
      return NextResponse.json(metrics);
    } else {
      // Return Prometheus format
      const prometheusMetrics = performanceMonitor.getPrometheusMetrics();
      const additionalMetrics = await getAdditionalPrometheusMetrics();
      
      const response = prometheusMetrics + '\n' + additionalMetrics;
      
      return new NextResponse(response, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

  } catch (error) {
    console.error('Metrics API error:', error);

    // Log the error
    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'metrics_request_failed',
      outcome: 'failure',
      description: 'System metrics request failed',
      endpoint: '/api/monitoring/metrics',
      method: 'GET',
      details: { error: (error as Error).message },
      logLevel: 'error',
    });

    if (format === 'json') {
      return NextResponse.json(
        { error: 'Failed to retrieve metrics', timestamp: Date.now() },
        { status: 500 }
      );
    } else {
      return new NextResponse('# Error retrieving metrics\n', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }
}

/**
 * Get metrics in JSON format for dashboard
 */
async function getJsonMetrics() {
  const performanceMetrics = performanceMonitor.getCurrentMetrics();
  const systemHealth = await healthCheckService.getSystemHealth();
  const alertStats = alertManager.getStats();
  const auditStats = await auditTrailService.getStats();

  return {
    timestamp: Date.now(),
    uptime: performanceMonitor.getUptime(),
    performance: {
      memory: performanceMetrics.memory,
      cpu: performanceMetrics.cpu,
      responses: performanceMetrics.responses,
      database: performanceMetrics.database,
      websocket: performanceMetrics.websocket,
      custom: performanceMetrics.custom,
    },
    health: {
      overall: systemHealth.overall,
      services: systemHealth.services.reduce((acc, service) => {
        acc[service.name] = {
          status: service.status,
          responseTime: service.responseTime,
          lastCheck: service.timestamp,
        };
        return acc;
      }, {} as Record<string, any>),
      resources: systemHealth.resources,
    },
    alerts: {
      active: alertStats.activeAlerts,
      total: alertStats.totalAlerts,
      resolved: alertStats.resolvedAlerts,
      byType: alertStats.alertsByType,
      bySeverity: alertStats.alertsBySeverity,
      escalationRate: alertStats.escalationRate,
      averageResolutionTime: alertStats.averageResolutionTime,
    },
    audit: {
      totalEvents: auditStats.totalEvents,
      phiAccess: auditStats.phiAccessCount,
      securityEvents: auditStats.securityEventsCount,
      failedLogins: auditStats.failedLoginsCount,
      uniqueUsers: auditStats.uniqueUsers,
    },
  };
}

/**
 * Get additional metrics in Prometheus format
 */
async function getAdditionalPrometheusMetrics(): Promise<string> {
  const systemHealth = await healthCheckService.getSystemHealth();
  const alertStats = alertManager.getStats();
  const auditStats = await auditTrailService.getStats();
  const prefix = 'astralcore_';
  
  let output = '';

  // Health metrics
  output += `# HELP ${prefix}health_status System health status (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)\n`;
  output += `# TYPE ${prefix}health_status gauge\n`;
  const healthValue = {
    unknown: 0,
    healthy: 1,
    degraded: 2,
    unhealthy: 3,
  }[systemHealth.overall] || 0;
  output += `${prefix}health_status ${healthValue}\n\n`;

  // Service health metrics
  systemHealth.services.forEach(service => {
    const serviceStatus = {
      unknown: 0,
      healthy: 1,
      degraded: 2,
      unhealthy: 3,
    }[service.status] || 0;
    
    output += `# HELP ${prefix}service_status Service health status\n`;
    output += `# TYPE ${prefix}service_status gauge\n`;
    output += `${prefix}service_status{service="${service.name}"} ${serviceStatus}\n\n`;
    
    output += `# HELP ${prefix}service_response_time Service response time in milliseconds\n`;
    output += `# TYPE ${prefix}service_response_time gauge\n`;
    output += `${prefix}service_response_time{service="${service.name}"} ${service.responseTime}\n\n`;
  });

  // Alert metrics
  output += `# HELP ${prefix}alerts_active Number of active alerts\n`;
  output += `# TYPE ${prefix}alerts_active gauge\n`;
  output += `${prefix}alerts_active ${alertStats.activeAlerts}\n\n`;

  output += `# HELP ${prefix}alerts_total Total number of alerts in last 24 hours\n`;
  output += `# TYPE ${prefix}alerts_total counter\n`;
  output += `${prefix}alerts_total ${alertStats.totalAlerts}\n\n`;

  output += `# HELP ${prefix}alerts_resolved Number of resolved alerts in last 24 hours\n`;
  output += `# TYPE ${prefix}alerts_resolved counter\n`;
  output += `${prefix}alerts_resolved ${alertStats.resolvedAlerts}\n\n`;

  output += `# HELP ${prefix}alert_escalation_rate Alert escalation rate\n`;
  output += `# TYPE ${prefix}alert_escalation_rate gauge\n`;
  output += `${prefix}alert_escalation_rate ${alertStats.escalationRate}\n\n`;

  output += `# HELP ${prefix}alert_resolution_time_avg Average alert resolution time in milliseconds\n`;
  output += `# TYPE ${prefix}alert_resolution_time_avg gauge\n`;
  output += `${prefix}alert_resolution_time_avg ${alertStats.averageResolutionTime}\n\n`;

  // Alert metrics by severity
  Object.entries(alertStats.alertsBySeverity).forEach(([severity, count]) => {
    output += `# HELP ${prefix}alerts_by_severity Number of alerts by severity\n`;
    output += `# TYPE ${prefix}alerts_by_severity gauge\n`;
    output += `${prefix}alerts_by_severity{severity="${severity}"} ${count}\n\n`;
  });

  // Audit metrics
  output += `# HELP ${prefix}audit_events_total Total audit events in last 24 hours\n`;
  output += `# TYPE ${prefix}audit_events_total counter\n`;
  output += `${prefix}audit_events_total ${auditStats.totalEvents}\n\n`;

  output += `# HELP ${prefix}audit_phi_access_total PHI access events in last 24 hours\n`;
  output += `# TYPE ${prefix}audit_phi_access_total counter\n`;
  output += `${prefix}audit_phi_access_total ${auditStats.phiAccessCount}\n\n`;

  output += `# HELP ${prefix}audit_security_events_total Security events in last 24 hours\n`;
  output += `# TYPE ${prefix}audit_security_events_total counter\n`;
  output += `${prefix}audit_security_events_total ${auditStats.securityEventsCount}\n\n`;

  output += `# HELP ${prefix}audit_failed_logins_total Failed login attempts in last 24 hours\n`;
  output += `# TYPE ${prefix}audit_failed_logins_total counter\n`;
  output += `${prefix}audit_failed_logins_total ${auditStats.failedLoginsCount}\n\n`;

  output += `# HELP ${prefix}audit_unique_users Unique users in last 24 hours\n`;
  output += `# TYPE ${prefix}audit_unique_users gauge\n`;
  output += `${prefix}audit_unique_users ${auditStats.uniqueUsers}\n\n`;

  // System uptime
  output += `# HELP ${prefix}uptime_seconds System uptime in seconds\n`;
  output += `# TYPE ${prefix}uptime_seconds counter\n`;
  output += `${prefix}uptime_seconds ${Math.floor(systemHealth.uptime / 1000)}\n\n`;

  return output;
}