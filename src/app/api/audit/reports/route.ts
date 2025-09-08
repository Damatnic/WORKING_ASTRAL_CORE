import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, RiskLevel, AuditOutcome } from '@/lib/audit/types';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { withAudit } from '@/lib/audit/middleware';
import { convertZodIssuesToValidationErrors } from '@/lib/prisma-helpers';

/**
 * GET /api/audit/reports
 * Get list of compliance reports
 */
async function getComplianceReports(request: AuthenticatedRequest) {
  try {
    const user = request.user!;

    // Only admins and compliance officers can access reports
    if (!['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
      return NextResponse.json(createErrorResponse('Insufficient permissions'), { status: 403 });
    }

    // Parse query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Query reports from database (this would be implemented with actual database queries)
    // For now, return empty array - in production this would query ComplianceReport table
    const reports = {
      reports: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };

    // Log the access
    await auditService.logEvent({
      category: AuditEventCategory.AUDIT_LOG_ACCESS,
      action: 'LIST_COMPLIANCE_REPORTS',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: 'User accessed compliance reports list',
      userId: user.id,
      userEmail: user.email || 'unknown@example.com',
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(createSuccessResponse(reports, 'Compliance reports retrieved successfully'));

  } catch (error) {
    console.error('Compliance reports query error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to retrieve compliance reports'), 
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit/reports
 * Generate a new compliance report
 */
async function generateComplianceReport(request: AuthenticatedRequest) {
  try {
    const user = request.user!;

    // Only admins and compliance officers can generate reports
    if (!['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
      return NextResponse.json(createErrorResponse('Insufficient permissions'), { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request
    const reportRequestSchema = z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      reportType: z.enum(['HIPAA_COMPLIANCE', 'SECURITY_INCIDENTS', 'PHI_ACCESS', 'USER_ACTIVITY']).optional().default('HIPAA_COMPLIANCE'),
    });

    const validationResult = reportRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid report parameters', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const { startDate, endDate, reportType } = validationResult.data;

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        createErrorResponse('Start date must be before end date'),
        { status: 400 }
      );
    }

    // Check if date range is not too large (e.g., max 1 year)
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return NextResponse.json(
        createErrorResponse('Date range cannot exceed 365 days'),
        { status: 400 }
      );
    }

    // Generate the compliance report
    const report = await auditService.generateComplianceReport({
      startDate,
      endDate,
      generatedBy: {
        userId: user.id,
        userEmail: user.email || 'unknown@example.com',
        userRole: user.role,
      },
    });

    // Log successful report generation
    await auditService.logEvent({
      category: AuditEventCategory.COMPLIANCE_REPORT_GENERATED,
      action: 'GENERATE_COMPLIANCE_REPORT',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `Compliance report generated for period ${startDate} to ${endDate}`,
      userId: user.id,
      userEmail: user.email || 'unknown@example.com',
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        reportId: report.reportId,
        reportType,
        periodDays: daysDiff,
        totalEvents: report.statistics.totalEvents,
      },
    });

    return NextResponse.json(
      createSuccessResponse(report, 'Compliance report generated successfully')
    );

  } catch (error) {
    console.error('Compliance report generation error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.SYSTEM_CONFIGURATION_CHANGE,
      action: 'COMPLIANCE_REPORT_GENERATION_FAILED',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'Failed to generate compliance report',
      errorDetails: {
        errorCode: 'REPORT_GENERATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to generate compliance report'), 
      { status: 500 }
    );
  }
}

// Wrap handlers with authentication and audit middleware
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(getComplianceReports, {
    riskMapping: {
      '/api/audit/reports': RiskLevel.HIGH,
    },
    categoryMapping: {
      '/api/audit/reports': AuditEventCategory.AUDIT_LOG_ACCESS,
    },
  })(req);
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(generateComplianceReport, {
    riskMapping: {
      '/api/audit/reports': RiskLevel.HIGH,
    },
    categoryMapping: {
      '/api/audit/reports': AuditEventCategory.COMPLIANCE_REPORT_GENERATED,
    },
  })(req);
});