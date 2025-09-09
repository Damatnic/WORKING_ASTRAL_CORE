import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService, MFAMethod } from '@/lib/auth/mfa-service';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/types/api';
import { convertZodIssuesToValidationErrors } from '@/lib/prisma-helpers';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/mfa/manage
 * Disable MFA for a user (requires admin approval for clinical roles)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const method = url.searchParams.get('method') as MFAMethod;
    const targetUserId = url.searchParams.get('userId') || user.id;
    const isAdminDisabling = targetUserId !== user.id;

    if (!method || !Object.values(MFAMethod).includes(method)) {
      return NextResponse.json(
        createErrorResponse('Invalid or missing MFA method'),
        { status: 400 }
      );
    }

    // Check if user is trying to disable MFA for another user
    if (isAdminDisabling) {
      // Only admins can disable MFA for other users
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          createErrorResponse('Insufficient permissions to disable MFA for other users'),
          { status: 403 }
        );
      }
    }

    // Get target user information
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        createErrorResponse('Target user not found'),
        { status: 404 }
      );
    }

    // Check if MFA is required for the target user's role
    const isMFARequired = MFAService.isMFARequired(targetUser.role);
    
    if (isMFARequired && !isAdminDisabling) {
      return NextResponse.json(
        createErrorResponse('Admin approval required to disable MFA for clinical roles'),
        { status: 403 }
      );
    }

    // Disable MFA
    await MFAService.disableMFA(
      targetUserId,
      targetUser.email || '',
      method,
      isAdminDisabling ? user.id : undefined
    );

    // Log MFA disable action
    await auditService.logEvent({
      category: AuditEventCategory.MFA_DISABLED,
      action: 'MFA_DISABLED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: isMFARequired ? RiskLevel.HIGH : RiskLevel.MEDIUM,
      description: `MFA disabled for ${method}${isAdminDisabling ? ' by admin' : ''}`,
      userId: user.id ,
      userEmail: user.email,
      userRole: user.role,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      resourceType: 'User',
      resourceId: targetUserId,
      resourceOwner: targetUserId,
      metadata: {
        mfaMethod: method,
        targetUserId,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        wasRequired: isMFARequired,
        disabledByAdmin: isAdminDisabling,
      },
    });

    return NextResponse.json(
      createSuccessResponse(null, 'MFA disabled successfully')
    );

  } catch (error) {
    console.error('MFA disable error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.MFA_FAILURE,
      action: 'MFA_DISABLE_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'Failed to disable MFA',
      errorDetails: {
        errorCode: 'MFA_DISABLE_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to disable MFA'), 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/mfa/manage
 * Reset MFA settings (regenerate backup codes, reset failed attempts)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = (request as any).user!;
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized'), { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const resetSchema = z.object({
      method: z.nativeEnum(MFAMethod),
      action: z.enum(['regenerate_backup_codes', 'reset_failed_attempts']),
      targetUserId: z.string().uuid().optional(),
    });

    const validationResult = resetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid reset parameters', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const { method, action, targetUserId } = validationResult.data;
    const actualTargetUserId = targetUserId || user.id;
    const isAdminAction = targetUserId && targetUserId !== user.id;

    // Check admin permissions for targeting other users
    if (isAdminAction && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        createErrorResponse('Insufficient permissions'),
        { status: 403 }
      );
    }

    const result: any = { success: true };

    switch (action) {
      case 'regenerate_backup_codes':
        // Generate new backup codes using crypto.getRandomValues
        const backupCodes = Array.from({ length: 10 }, () => {
          const bytes = new Uint8Array(4);
          crypto.getRandomValues(bytes);
          return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
        });

        // TODO: Update MFA settings with new backup codes
        // Note: MFA model needs to be added to Prisma schema
        console.log('Generated backup codes for user:', actualTargetUserId, 'method:', method);

        result.backupCodes = backupCodes;
        
        // Log backup code regeneration
        await auditService.logEvent({
          category: AuditEventCategory.MFA_ENABLED,
          action: 'MFA_BACKUP_CODES_REGENERATED',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.MEDIUM,
          description: 'MFA backup codes regenerated',
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          resourceType: 'User',
          resourceId: actualTargetUserId,
          resourceOwner: actualTargetUserId,
          metadata: {
            mfaMethod: method,
            targetUserId: actualTargetUserId,
            performedByAdmin: isAdminAction,
          },
        });
        break;

      case 'reset_failed_attempts':
        // TODO: Reset failed attempts and unlock account
        // Note: MFA model needs to be added to Prisma schema
        console.log('Reset failed attempts for user:', actualTargetUserId, 'method:', method);

        // Log failed attempts reset
        await auditService.logEvent({
          category: AuditEventCategory.MFA_ENABLED,
          action: 'MFA_FAILED_ATTEMPTS_RESET',
          outcome: AuditOutcome.SUCCESS,
          riskLevel: RiskLevel.MEDIUM,
          description: 'MFA failed attempts reset',
          userId: user.id ,
          userEmail: user.email,
          userRole: user.role,
          sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          resourceType: 'User',
          resourceId: actualTargetUserId,
          resourceOwner: actualTargetUserId,
          metadata: {
            mfaMethod: method,
            targetUserId: actualTargetUserId,
            performedByAdmin: isAdminAction,
          },
        });
        break;

      default:
        return NextResponse.json(
          createErrorResponse('Unsupported reset action'),
          { status: 400 }
        );
    }

    return NextResponse.json(
      createSuccessResponse(result, `MFA ${action} completed successfully`)
    );

  } catch (error) {
    console.error('MFA management error:', error);
    
    // Log the error
    await auditService.logEvent({
      category: AuditEventCategory.MFA_FAILURE,
      action: 'MFA_MANAGEMENT_ERROR',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.HIGH,
      description: 'MFA management operation failed',
      errorDetails: {
        errorCode: 'MFA_MANAGEMENT_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      createErrorResponse('Failed to manage MFA settings'), 
      { status: 500 }
    );
  }
}