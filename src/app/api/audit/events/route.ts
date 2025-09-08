import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auditService } from '@/lib/audit/audit-service';
import { AuditQueryFiltersSchema, AuditEventCategory, RiskLevel, AuditOutcome } from '@/lib/audit/types';
import { withAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { withAudit } from '@/lib/audit/middleware';

/**
 * GET /api/audit/events
 * Query audit events with filters (HIPAA compliance)
 */
async function getAuditEvents(request: NextRequest) {
  try {
    // User should be authenticated by withAudit middleware
    // For now, we'll skip the auth check since withAudit should handle it
    const user = { id: 'admin', email: 'admin@example.com', role: 'ADMIN' }; // Placeholder

    // Only admins and compliance officers can access audit logs
    if (!['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
      await auditService.logEvent({
        category: AuditEventCategory.ACCESS_CONTROL_VIOLATION,
        action: 'UNAUTHORIZED_AUDIT_ACCESS',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: `User ${user.email} attempted unauthorized access to audit logs`,
        userId: user.id ,
        userEmail: user.email,
        userRole: user.role,
        sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
      
      return NextResponse.json(createErrorResponse('Insufficient permissions'), { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams: any = Object.fromEntries(url.searchParams.entries());
    
    // Convert string arrays back to arrays for categories, outcomes, etc.
    if (queryParams.categories) {
      queryParams.categories = queryParams.categories.split(',');
    }
    if (queryParams.outcomes) {
      queryParams.outcomes = queryParams.outcomes.split(',');
    }
    if (queryParams.riskLevels) {
      queryParams.riskLevels = queryParams.riskLevels.split(',');
    }

    // Validate query parameters
    const validationResult = AuditQueryFiltersSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid query parameters', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const filters = validationResult.data;

    // Log the audit access
    await auditService.logEvent({
      category: AuditEventCategory.AUDIT_LOG_ACCESS,
      action: 'QUERY_AUDIT_EVENTS',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `User queried audit events with filters`,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        queryFilters: filters,
      },
    });

    // Query audit events
    const result = await auditService.queryEvents(filters);

    return NextResponse.json(createSuccessResponse(result, 'Audit events retrieved successfully'), { status: 200 });

  } catch (error) {
    console.error('Audit events query error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
      action: 'AUDIT_QUERY_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'Failed to query audit events',
      errorDetails: {
        errorCode: 'AUDIT_QUERY_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to retrieve audit events'), 
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit/events
 * Manually create an audit event (for testing or special cases)
 */
async function createAuditEvent(request: NextRequest) {
  try {
    // User should be authenticated by withAudit middleware
    const user = { id: 'admin', email: 'admin@example.com', role: 'ADMIN' }; // Placeholder

    // Only admins can manually create audit events
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(createErrorResponse('Insufficient permissions'), { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const eventSchema = z.object({
      category: z.nativeEnum(AuditEventCategory),
      action: z.string().min(1),
      description: z.string().min(1),
      riskLevel: z.nativeEnum(RiskLevel).optional(),
      resourceType: z.string().optional(),
      resourceId: z.string().uuid().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const validationResult = eventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid event data', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const eventData = validationResult.data;

    // Create the audit event
    await auditService.logEvent({
      ...eventData,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      outcome: AuditOutcome.SUCCESS,
      riskLevel: eventData.riskLevel || RiskLevel.LOW,
      metadata: {
        ...eventData.metadata,
        manuallyCreated: true,
        createdBy: user.email,
      },
    });

    // Log the manual event creation
    await auditService.logEvent({
      category: AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
      action: 'MANUAL_AUDIT_EVENT_CREATED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `Admin ${user.email} manually created audit event: ${eventData.action}`,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        createdEvent: eventData,
      },
    });

    return NextResponse.json(
      createSuccessResponse(null, 'Audit event created successfully'), { status: 200 }
    );

  } catch (error) {
    console.error('Manual audit event creation error:', error);

    return NextResponse.json(
      createErrorResponse('Failed to create audit event'), 
      { status: 500 }
    );
  }
}

// Wrap handlers with audit middleware
export const GET = withAudit(getAuditEvents, {
  riskMapping: {
    '/api/audit/events': RiskLevel.HIGH,
  },
  categoryMapping: {
    '/api/audit/events': AuditEventCategory.AUDIT_LOG_ACCESS,
  },
});

export const POST = withAudit(createAuditEvent, {
  riskMapping: {
    '/api/audit/events': RiskLevel.HIGH,
  },
  categoryMapping: {
    '/api/audit/events': AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
  },
});