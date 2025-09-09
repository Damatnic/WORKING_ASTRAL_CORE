
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService, MFAMethod, MFASetupRequestSchema } from '@/lib/auth/mfa-service';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { convertZodIssuesToValidationErrors } from '@/lib/prisma-helpers';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mfa/setup
 * Initiate MFA setup for a user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = MFASetupRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid MFA setup parameters', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const { method, phoneNumber } = validationResult.data;

    let setupResult;
    
    switch (method) {
      case MFAMethod.TOTP:
        setupResult = await MFAService.setupTOTP(user.id, user.email || '');
        break;
        
      case MFAMethod.SMS:
        if (!phoneNumber) {
          return NextResponse.json(
            createErrorResponse('Phone number is required for SMS MFA'),
            { status: 400 }
          );
        }
        setupResult = await MFAService.setupSMS(user.id, user.email || '', phoneNumber);
        break;
        
      default:
        return NextResponse.json(
          createErrorResponse('Unsupported MFA method'),
          { status: 400 }
        );
    }

    // Log successful MFA setup initiation
    await auditService.logEvent({
      category: AuditEventCategory.MFA_ENABLED,
      action: 'MFA_SETUP_INITIATED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `User initiated ${method} MFA setup`,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        mfaMethod: method,
        isRequired: MFAService.isMFARequired(user.role),
      },
    });

    return NextResponse.json(
      createSuccessResponse(setupResult, 'MFA setup initiated successfully')
    );

  } catch (error) {
    console.error('MFA setup error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.MFA_FAILURE,
      action: 'MFA_SETUP_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'MFA setup failed',
      errorDetails: {
        errorCode: 'MFA_SETUP_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to setup MFA'), 
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/mfa/setup
 * Get current MFA setup status for user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    // Get MFA status
    const mfaStatus = await MFAService.getMFAStatus(user.id);

    // Log MFA status check
    await auditService.logEvent({
      category: AuditEventCategory.PHI_ACCESS,
      action: 'MFA_STATUS_CHECK',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.LOW,
      description: 'User checked MFA status',
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        mfaStatus,
      },
    });

    return NextResponse.json(
      createSuccessResponse(mfaStatus, 'MFA status retrieved successfully')
    );

  } catch (error) {
    console.error('MFA status check error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to retrieve MFA status'), 
      { status: 500 }
    );
  }
}