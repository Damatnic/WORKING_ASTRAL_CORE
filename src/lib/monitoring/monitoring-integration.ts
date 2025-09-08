/**
 * Monitoring Integration Helper
 * Provides easy integration patterns for the monitoring system
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  performanceMonitor,
  healthCheckService,
  alertManager,
  auditTrailService,
  errorTracker,
  analyticsService,
  type AuditEventType
} from './index';

/**
 * Enhanced middleware that integrates all monitoring capabilities
 */
export function createMonitoringMiddleware() {
  return async (request: NextRequest, response: NextResponse, next: Function) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Set request ID for tracing
    response.headers.set('x-request-id', requestId);
    
    // Add breadcrumb for error tracking
    errorTracker.addBreadcrumb({
      type: 'http',
      category: 'request',
      message: `${request.method} ${request.url}`,
      data: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers),
      },
      level: 'info',
    });

    try {
      // Track the request
      await analyticsService.trackPageView(request.url, {
        properties: {
          method: request.method,
          userAgent: request.headers.get('user-agent'),
        },
      });

      // Continue with the request
      const result = next();
      
      // Record performance metrics after response
      (response as any).on('finish', () => {
        const duration = Date.now() - startTime;
        
        performanceMonitor.recordResponseTime({
          path: request.url,
          method: request.method,
          duration,
          statusCode: response.status,
          requestId,
          userAgent: request.headers.get('user-agent'),
        });

        // Log to audit trail for sensitive endpoints
        if (isSensitiveEndpoint(request.url)) {
          auditTrailService.logEvent({
            eventType: 'api_access',
            action: `${request.method.toLowerCase()}_${getEndpointType(request.url)}`,
            outcome: response.status < 400 ? 'success' : 'failure',
            description: `API request to ${request.url}`,
            endpoint: request.url,
            method: request.method,
            requestId,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent'),
            containsPHI: containsPHI(request.url),
            dataClassification: getDataClassification(request.url),
          });
        }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Capture error
      await errorTracker.captureError(error as Error, {
        endpoint: request.url,
        method: request.method,
        requestId,
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIp(request),
        component: 'api',
        severity: response.status >= 500 ? 'critical' : 'high',
      });

      // Record failed performance
      performanceMonitor.recordResponseTime({
        path: request.url,
        method: request.method,
        duration,
        statusCode: 500,
        requestId,
      });

      throw error;
    }
  };
}

/**
 * Database query monitoring wrapper
 */
export function monitorDatabaseQuery<T>(
  queryName: string,
  table?: string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Record database performance
        performanceMonitor.recordDatabaseQuery({
          query: queryName,
          duration,
          table,
          operation: getQueryOperation(queryName),
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Record failed query
        performanceMonitor.recordDatabaseQuery({
          query: queryName,
          duration,
          table,
          operation: getQueryOperation(queryName),
        });

        // Capture error
        await errorTracker.captureError(error as Error, {
          component: 'database',
          feature: table || 'unknown',
          metadata: {
            query: queryName,
            duration,
          },
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Crisis intervention monitoring
 */
export async function monitorCrisisIntervention(
  userId: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  interventionType: string,
  outcome: 'resolved' | 'escalated' | 'follow_up_required',
  responseTime: number,
  metadata: Record<string, any> = {}
) {
  // Track crisis analytics
  await analyticsService.trackCrisisIntervention({
    riskLevel,
    responseTime,
    outcome,
    interventionType,
    effectivenessScore: outcome === 'resolved' ? 0.9 : 0.6,
  }, { userId });

  // Create alert for high-risk cases
  if (riskLevel === 'critical' || riskLevel === 'high') {
    await alertManager.createAlert({
      type: 'crisis_intervention',
      severity: riskLevel === 'critical' ? 'crisis' : 'error',
      title: `${riskLevel.toUpperCase()} Risk Crisis Intervention`,
      message: `Crisis intervention required for user. Risk level: ${riskLevel}`,
      source: 'crisis-system',
      metadata: {
        userId,
        riskLevel,
        interventionType,
        responseTime,
        ...metadata,
      },
      isCrisis: true,
      userId,
      riskLevel,
    });
  }

  // Audit log with high security
  await auditTrailService.logEvent({
    eventType: 'crisis_intervention',
    action: 'crisis_intervention_performed',
    outcome: outcome === 'resolved' ? 'success' : 'partial',
    description: `Crisis intervention performed for user with ${riskLevel} risk level`,
    userId,
    containsPHI: true,
    dataClassification: 'phi',
    reasonForAccess: 'Crisis intervention and safety assessment',
    details: {
      riskLevel,
      interventionType,
      outcome,
      responseTime,
      effectivenessScore: outcome === 'resolved' ? 0.9 : 0.6,
    },
    logLevel: riskLevel === 'critical' ? 'critical' : 'warning',
  });
}

/**
 * Treatment outcome tracking
 */
export async function trackTreatmentProgress(
  userId: string,
  treatmentType: string,
  metrics: {
    engagementScore: number;
    adherenceRate: number;
    improvementScore: number;
    satisfactionScore: number;
    riskReduction: number;
  },
  milestone?: {
    type: string;
    value: number;
    notes?: string;
  }
) {
  // Track treatment outcome
  await analyticsService.trackTreatmentOutcome({
    treatmentType,
    startDate: Date.now(),
    metrics,
    milestones: milestone ? [{
      date: Date.now(),
      type: milestone.type,
      value: milestone.value,
      notes: milestone.notes,
    }] : [],
    status: 'active',
  }, userId);

  // Create positive outcome alert
  if (metrics.improvementScore > 0.8) {
    await alertManager.createAlert({
      type: 'treatment_success',
      severity: 'info',
      title: 'Significant Treatment Progress',
      message: `User showing significant improvement in ${treatmentType}`,
      source: 'treatment-tracking',
      metadata: {
        userId,
        treatmentType,
        improvementScore: metrics.improvementScore,
        satisfactionScore: metrics.satisfactionScore,
      },
    });
  }

  // Audit treatment access
  await auditTrailService.logEvent({
    eventType: 'medical_record_access',
    action: 'treatment_progress_updated',
    outcome: 'success',
    description: `Treatment progress updated for ${treatmentType}`,
    userId,
    containsPHI: true,
    dataClassification: 'phi',
    reasonForAccess: 'Treatment progress monitoring and care coordination',
    details: {
      treatmentType,
      metrics,
      milestone,
    },
  });
}

/**
 * User activity monitoring
 */
export async function monitorUserActivity(
  userId: string,
  activity: AuditEventType,
  details: Record<string, any> = {},
  options: {
    containsPHI?: boolean;
    riskLevel?: 'low' | 'medium' | 'high';
    requiresAudit?: boolean;
  } = {}
) {
  // Track user engagement
  await analyticsService.track('user_action', {
    activity,
    ...details,
  }, {}, {
    userId,
    containsPHI: options.containsPHI,
    consentLevel: options.containsPHI ? 'enhanced' : 'basic',
  });

  // Audit sensitive activities
  if (options.requiresAudit || options.containsPHI) {
    await auditTrailService.logEvent({
      eventType: activity,
      action: activity.replace(/_/g, '_'),
      outcome: 'success',
      description: `User performed ${activity}`,
      userId,
      containsPHI: options.containsPHI || false,
      dataClassification: options.containsPHI ? 'phi' : 'internal',
      details,
      logLevel: options.riskLevel === 'high' ? 'warning' : 'info',
    });
  }

  // Alert for suspicious patterns
  if (options.riskLevel === 'high') {
    // Check for unusual activity patterns
    const recentEvents = await auditTrailService.queryEvents({
      userId,
      startTime: Date.now() - 3600000, // Last hour
    });

    if (recentEvents.length > 50) { // Unusually high activity
      await alertManager.createAlert({
        type: 'suspicious_activity',
        severity: 'warning',
        title: 'Unusual User Activity Pattern',
        message: `High volume of activity detected for user in the last hour`,
        source: 'user-monitoring',
        metadata: {
          userId,
          activityCount: recentEvents.length,
          timeWindow: '1 hour',
          lastActivity: activity,
        },
      });
    }
  }
}

/**
 * System health monitoring wrapper
 */
export function withHealthCheck<T extends (...args: any[]) => any>(
  serviceName: string,
  criticalService: boolean = false
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args);
        
        // Update service health status
        performanceMonitor.recordCustomMetric(`${serviceName}_status`, 1);
        performanceMonitor.recordCustomMetric(`${serviceName}_last_success`, Date.now());
        
        return result;
      } catch (error) {
        // Record service failure
        performanceMonitor.recordCustomMetric(`${serviceName}_status`, 0);
        performanceMonitor.recordCustomMetric(`${serviceName}_last_failure`, Date.now());
        
        // Create alert for critical services
        if (criticalService) {
          await alertManager.createAlert({
            type: 'service_failure',
            severity: 'critical',
            title: `Critical Service Failure: ${serviceName}`,
            message: `Critical service ${serviceName} has failed`,
            source: 'health-monitoring',
            metadata: {
              service: serviceName,
              error: (error as Error).message,
              method: propertyKey,
            },
          });
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Feature usage tracking decorator
 */
export function trackFeatureUsage(
  featureName: string,
  category: string = 'general'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        // Track feature usage start
        await analyticsService.trackFeatureUsage(featureName, 'started', {
          category,
          method: propertyKey,
        });
        
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Track successful completion
        await analyticsService.trackFeatureUsage(featureName, 'completed', {
          category,
          method: propertyKey,
          duration,
          success: true,
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Track failure
        await analyticsService.trackFeatureUsage(featureName, 'failed', {
          category,
          method: propertyKey,
          duration,
          success: false,
          error: (error as Error).message,
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isSensitiveEndpoint(url: string): boolean {
  const sensitivePatterns = [
    '/api/auth/',
    '/api/crisis/',
    '/api/therapist/',
    '/api/therapy/',
    '/api/user/',
    '/api/admin/',
  ];
  
  return sensitivePatterns.some(pattern => url.includes(pattern));
}

function containsPHI(url: string): boolean {
  const phiPatterns = [
    '/api/therapy/',
    '/api/crisis/',
    '/api/user/',
    '/api/therapist/',
  ];
  
  return phiPatterns.some(pattern => url.includes(pattern));
}

function getDataClassification(url: string): 'public' | 'internal' | 'confidential' | 'restricted' | 'phi' {
  if (containsPHI(url)) return 'phi';
  if (url.includes('/api/admin/')) return 'restricted';
  if (url.includes('/api/auth/')) return 'confidential';
  if (url.includes('/api/')) return 'internal';
  return 'public';
}

function getEndpointType(url: string): string {
  const parts = url.split('/');
  return parts[3] || 'unknown'; // /api/{type}/...
}

function getQueryOperation(queryName: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER' {
  const query = queryName.toLowerCase();
  if (query.includes('select') || query.includes('find') || query.includes('get')) return 'SELECT';
  if (query.includes('insert') || query.includes('create') || query.includes('add')) return 'INSERT';
  if (query.includes('update') || query.includes('modify') || query.includes('edit')) return 'UPDATE';
  if (query.includes('delete') || query.includes('remove')) return 'DELETE';
  return 'OTHER';
}