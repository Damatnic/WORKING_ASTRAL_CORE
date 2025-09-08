// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService, MFAMethod, MFAVerifyRequestSchema } from '@/lib/auth/mfa-service';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { convertZodIssuesToValidationErrors } from '@/lib/prisma-helpers';

/**
 * POST /api/auth/mfa/verify
 * Verify MFA code during setup or authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body first for better error handling
    const body = await request.json();
    const validationResult = MFAVerifyRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid MFA verification parameters', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const { method, code, trustDevice } = validationResult.data;
    const purpose = body.purpose || 'login'; // 'setup' or 'login'

    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      // Log unauthorized MFA verification attempt
      await auditService.logEvent({
        category: AuditEventCategory.MFA_FAILURE,
        action: 'UNAUTHORIZED_MFA_VERIFICATION',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Unauthorized MFA verification attempt',
        sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          mfaMethod: method,
          purpose,
        },
      });
      
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    let verificationResult;

    if (purpose === 'setup') {
      // Verify MFA code during setup process
      verificationResult = await MFAService.verifySetup(user.id, user.email || '', method, code);
      
      if (verificationResult.success) {
        // Log successful MFA setup completion
        await auditService.logEvent({
          category: AuditEventCategory.MFA_ENABLED,
          action: 'MFA_SETUP_COMPLETED',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.MEDIUM,
          description: `User completed ${method} MFA setup`,
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: {
            mfaMethod: method,
            backupCodesGenerated: !!verificationResult.backupCodes,
          },
        });
      } else {
        // Log failed MFA setup verification
        await auditService.logEvent({
          category: AuditEventCategory.MFA_FAILURE,
          action: 'MFA_SETUP_VERIFICATION_FAILED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.MEDIUM,
          description: `MFA setup verification failed for ${method}`,
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: {
            mfaMethod: method,
          },
        });
      }
    } else {
      // Verify MFA code during authentication
      verificationResult = await MFAService.verifyMFA(user.id, user.email || '', method, code, trustDevice);
      
      if (verificationResult.success) {
        // Log successful MFA verification
        await auditService.logEvent({
          category: AuditEventCategory.MFA_SUCCESS,
          action: 'MFA_VERIFICATION_SUCCESS',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.LOW,
          description: `Successful ${method} MFA verification`,
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: {
            mfaMethod: method,
            trustDevice: trustDevice,
            trustTokenGenerated: !!verificationResult.trustToken,
          },
        });
      } else {
        // Log failed MFA verification
        await auditService.logEvent({
          category: AuditEventCategory.MFA_FAILURE,
          action: 'MFA_VERIFICATION_FAILED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.HIGH,
          description: `Failed ${method} MFA verification`,
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: {
            mfaMethod: method,
          },
        });
      }
    }

    if (!verificationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid MFA code', 'MFA_VERIFICATION_FAILED'),
        { status: 400 }
      );
    }

    // Remove sensitive data from response
    const responseData: any = {
      success: verificationResult.success,
    };

    // Handle different verification result types safely
    if ('trustToken' in verificationResult && verificationResult.trustToken) {
      responseData.trustToken = verificationResult.trustToken;
    }
    
    if (purpose === 'setup' && 'backupCodes' in verificationResult && verificationResult.backupCodes) {
      responseData.backupCodes = verificationResult.backupCodes;
    }

    return NextResponse.json(
      createSuccessResponse(responseData, 'MFA verification successful')
    );

  } catch (error) {
    console.error('MFA verification error:', error);
    
    // Log the error without user context if authentication failed
    await auditService.logEvent({
      category: AuditEventCategory.MFA_FAILURE,
      action: 'MFA_VERIFICATION_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'MFA verification system error',
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      errorDetails: {
        errorCode: 'MFA_VERIFICATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to verify MFA code'), 
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/mfa/verify
 * Send MFA challenge code (for SMS/Email methods)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    // Get method from query parameters
    const url = new URL(request.url);
    const method = url.searchParams.get('method') as MFAMethod;
    
    if (!method || !Object.values(MFAMethod).includes(method)) {
      return NextResponse.json(
        createErrorResponse('Invalid or missing MFA method'),
        { status: 400 }
      );
    }

    // Send MFA challenge
    const challengeResult = await MFAService.sendChallenge(user.id, user.email || '', method);

    // Log challenge sent
    await auditService.logEvent({
      category: AuditEventCategory.MFA_SUCCESS,
      action: 'MFA_CHALLENGE_SENT',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.LOW,
      description: `MFA challenge sent via ${method}`,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        mfaMethod: method,
        maskedDestination: challengeResult.maskedDestination,
      },
    });

    return NextResponse.json(
      createSuccessResponse(challengeResult, 'MFA challenge sent successfully')
    );

  } catch (error) {
    console.error('MFA challenge error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.MFA_FAILURE,
      action: 'MFA_CHALLENGE_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.MEDIUM,
      description: 'Failed to send MFA challenge',
      errorDetails: {
        errorCode: 'MFA_CHALLENGE_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to send MFA challenge'), 
      { status: 500 }
    );
  }
}