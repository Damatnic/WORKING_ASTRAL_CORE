/**
 * Alerts API Endpoint
 * Manage and query system alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/monitoring/alert-manager';
import { auditTrailService } from '@/lib/monitoring/audit-trail';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'resolved' | 'acknowledged' | null;
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Log the request
    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'alerts_query',
      outcome: 'success',
      description: 'Alerts queried via API',
      endpoint: '/api/monitoring/alerts',
      method: 'GET',
      details: { status, severity, type, limit, offset },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    let alerts = status === 'active' ? alertManager.getActiveAlerts() : alertManager.getAllAlerts();

    // Apply filters
    if (status && status !== 'active') {
      alerts = alerts.filter(alert => alert.status === status);
    }
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    // Apply pagination
    const total = alerts.length;
    alerts = alerts.slice(offset, offset + limit);

    // Get statistics
    const stats = alertManager.getStats();

    return NextResponse.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        title: alert.title,
        message: alert.message,
        source: alert.source,
        timestamp: alert.timestamp,
        resolvedAt: alert.resolvedAt,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        escalationLevel: alert.escalationLevel,
        isCrisis: alert.isCrisis,
        riskLevel: alert.riskLevel,
        // Exclude sensitive metadata
        metadata: alert.metadata ? filterSensitiveData(alert.metadata) : undefined,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats,
    });

  } catch (error) {
    console.error('Alerts API error:', error);

    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'alerts_query_failed',
      outcome: 'failure',
      description: 'Failed to query alerts',
      endpoint: '/api/monitoring/alerts',
      method: 'GET',
      details: { error: (error as Error).message },
      logLevel: 'error',
    });

    return NextResponse.json(
      { error: 'Failed to retrieve alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      severity,
      title,
      message,
      source,
      metadata,
      isCrisis,
      userId,
      riskLevel,
    } = body;

    // Validate required fields
    if (!type || !severity || !title || !message || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: type, severity, title, message, source' },
        { status: 400 }
      );
    }

    // Create the alert
    const alert = await alertManager.createAlert({
      type,
      severity,
      title,
      message,
      source,
      metadata,
      isCrisis,
      userId,
      riskLevel,
    });

    // Log the alert creation
    await auditTrailService.logEvent({
      eventType: 'system_event',
      action: 'alert_created',
      outcome: 'success',
      description: `Alert created: ${title}`,
      endpoint: '/api/monitoring/alerts',
      method: 'POST',
      details: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        isCrisis: alert.isCrisis,
      },
      containsPHI: !!userId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        isCrisis: alert.isCrisis,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create alert API error:', error);

    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'alert_creation_failed',
      outcome: 'failure',
      description: 'Failed to create alert',
      endpoint: '/api/monitoring/alerts',
      method: 'POST',
      details: { error: (error as Error).message },
      logLevel: 'error',
    });

    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const body = await request.json();
    const { action, acknowledgedBy } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    let result = false;
    let actionDescription = '';

    switch (action) {
      case 'acknowledge':
        if (!acknowledgedBy) {
          return NextResponse.json(
            { error: 'acknowledgedBy is required for acknowledge action' },
            { status: 400 }
          );
        }
        result = await alertManager.acknowledgeAlert(alertId, acknowledgedBy);
        actionDescription = `Alert acknowledged by ${acknowledgedBy}`;
        break;
      
      case 'resolve':
        result = await alertManager.resolveAlert(alertId);
        actionDescription = 'Alert resolved';
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: acknowledge, resolve' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Alert not found or action not applicable' },
        { status: 404 }
      );
    }

    // Log the action
    await auditTrailService.logEvent({
      eventType: 'system_event',
      action: `alert_${action}`,
      outcome: 'success',
      description: actionDescription,
      endpoint: '/api/monitoring/alerts',
      method: 'PATCH',
      details: {
        alertId,
        action,
        acknowledgedBy,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });

    const alert = alertManager.getAlert(alertId);
    return NextResponse.json({
      success: true,
      alert: alert ? {
        id: alert.id,
        status: alert.status,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        resolvedAt: alert.resolvedAt,
      } : null,
    });

  } catch (error) {
    console.error('Update alert API error:', error);

    await auditTrailService.logEvent({
      eventType: 'api_access',
      action: 'alert_update_failed',
      outcome: 'failure',
      description: 'Failed to update alert',
      endpoint: '/api/monitoring/alerts',
      method: 'PATCH',
      details: { error: (error as Error).message },
      logLevel: 'error',
    });

    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

/**
 * Filter sensitive data from metadata
 */
function filterSensitiveData(metadata: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'ssn',
    'creditCard',
    'bankAccount',
    'medicalRecord',
  ];

  const filtered = { ...metadata };
  
  sensitiveFields.forEach(field => {
    if (filtered[field]) {
      filtered[field] = '[REDACTED]';
    }
  });

  return filtered;
}