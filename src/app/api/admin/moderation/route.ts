import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// RBAC middleware
async function checkAdminAccess() {
  const session = await getServerSession(authOptions) as Session | null;
  
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Use the session.user properties directly since they're extended
  if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id, adminUsername: (session.user as any).name };
}

// GET moderation actions
export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId');

    // Build where clause
    const where: any = {};

    if (type !== 'all') {
      where.type = type.toUpperCase();
    }

    if (status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (userId) {
      where.userId = userId;
    }

    // Get total count
    const totalCount = await prisma.moderationAction.count({ where });

    // Fetch moderation actions
    const actions = await prisma.moderationAction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        type: true,
        targetUserId: true,
        moderatorId: true,
        reason: true,
        evidence: true,
        duration: true,
        appealable: true,
        appealed: true,
        createdAt: true,
        expiresAt: true
      }
    });

    // Format response
    const formattedActions = actions.map((action: any) => ({
      id: action.id,
      targetUserId: action.targetUserId,
      moderatorId: action.moderatorId,
      type: action.type.toLowerCase(),
      reason: action.reason,
      timestamp: action.createdAt.toISOString(),
      duration: action.duration,
      evidence: action.evidence,
      appealable: action.appealable,
      appealed: action.appealed,
      expiresAt: action.expiresAt?.toISOString()
    }));

    return NextResponse.json({
      actions: formattedActions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching moderation actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation actions' },
      { status: 500 }
    );
  }
}

// POST new moderation action
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await (req as any).json();
    const {
      userId,
      type,
      reason,
      description,
      duration,
      severity,
      evidence,
      appealable
    } = body;

    // Validate required fields
    if (!userId || !type || !reason || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create moderation action
    const actionId = crypto.randomUUID();
    const action = await (prisma.moderationAction as any).create({
        data: {
          id: actionId,
        targetUserId: userId,
        moderatorId: authCheck.adminId,
        type: type.toUpperCase(),
        reason,
        evidence: evidence || [],
        duration,
        appealable: appealable !== false
      }
    });

    // Apply the moderation action
    switch (type.toUpperCase()) {
      case 'WARNING':
        // Warning is handled through the moderation action record
        break;

      case 'SUSPENSION':
        // Update user to inactive status
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false }
        });
        break;

      case 'BAN':
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false }
        });
        break;

      case 'CONTENT_REMOVAL':
        // Handle content removal based on evidence
        break;

      case 'ACCOUNT_RESTRICTION':
        // Apply specific restrictions
        break;

      case 'VERIFICATION_REVOKE':
        await prisma.user.update({
          where: { id: userId },
          data: {
            isEmailVerified: false
          }
        });
        break;
    }

    // Send notification to user
    const notificationId = crypto.randomUUID();
    await (prisma.notification as any).create({
        data: {
          id: notificationId,
        userId,
        type: 'MODERATION_ACTION',
        title: `Moderation Action: ${type}`,
        message: description || reason
      }
    });

    // Log admin action
    const auditId = crypto.randomUUID();
    await (prisma.auditLog as any).create({
        data: {
          id: auditId,
        userId: authCheck.adminId,
        action: 'CREATE_MODERATION_ACTION',
        details: {
          targetUserId: userId,
          type,
          reason,
          severity
        },
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || 'unknown',
        outcome: 'success'
      }
    });

    return NextResponse.json({
      message: 'Moderation action created successfully',
      action: {
        id: action.id,
        type: action.type,
        targetUserId: action.targetUserId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating moderation action:', error);
    return NextResponse.json(
      { error: 'Failed to create moderation action' },
      { status: 500 }
    );
  }
}

// PATCH update moderation action
export async function PATCH(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await (req as any).json();
    const { actionId, updates } = body;

    if (!actionId) {
      return NextResponse.json(
        { error: 'Action ID is required' },
        { status: 400 }
      );
    }

    // Get existing action
    const existingAction = await prisma.moderationAction.findUnique({
      where: { id: actionId }
    });

    if (!existingAction) {
      return NextResponse.json(
        { error: 'Moderation action not found' },
        { status: 404 }
      );
    }

    // Update the action
    const updatedAction = await prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        ...updates,
        status: updates.status?.toUpperCase(),
        severity: updates.severity?.toUpperCase()
      }
    });

    // If revoking suspension, update user status
    if (updates.status === 'revoked' && existingAction.type === 'SUSPENSION') {
      await prisma.user.update({
        where: { id: existingAction.targetUserId },
        data: { isActive: true }
      });
    }

    // Log admin action
    const auditId2 = crypto.randomUUID();
    await (prisma.auditLog as any).create({
        data: {
          id: auditId2,
        userId: authCheck.adminId,
        action: 'UPDATE_MODERATION_ACTION',
        details: {
          actionId,
          updates
        },
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || 'unknown',
        outcome: 'success'
      }
    });

    return NextResponse.json({
      message: 'Moderation action updated successfully',
      action: updatedAction
    });

  } catch (error) {
    console.error('Error updating moderation action:', error);
    return NextResponse.json(
      { error: 'Failed to update moderation action' },
      { status: 500 }
    );
  }
}

// Handle appeals
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await (req as any).json();
    const { actionId, decision, notes } = body;

    if (!actionId || !decision) {
      return NextResponse.json(
        { error: 'Action ID and decision are required' },
        { status: 400 }
      );
    }

    // Get the action
    const action = await prisma.moderationAction.findUnique({
      where: { id: actionId }
    });

    if (!action) {
      return NextResponse.json(
        { error: 'Moderation action not found' },
        { status: 404 }
      );
    }

    if (!action.appealed) {
      return NextResponse.json(
        { error: 'This action has not been appealed' },
        { status: 400 }
      );
    }

    // Process appeal decision
    const updates: any = {
      appealReviewed: true,
      appealReviewedBy: authCheck.adminId,
      appealReviewedAt: new Date(),
      appealDecision: decision,
      appealNotes: notes
    };

    if (decision === 'approved') {
      updates.status = 'REVOKED';
      
      // Restore user status if needed
      if (action.type === 'SUSPENSION' || action.type === 'BAN') {
        await prisma.user.update({
          where: { id: action.targetUserId },
          data: { isActive: true }
        });
      }
    }

    await prisma.moderationAction.update({
      where: { id: actionId },
      data: updates
    });

    // Notify user of appeal decision
    const appealNotificationId = crypto.randomUUID();
    await (prisma.notification as any).create({
        data: {
          id: appealNotificationId,
        userId: action.targetUserId,
        type: 'APPEAL_DECISION',
        title: `Appeal ${decision === 'approved' ? 'Approved' : 'Denied'}`,
        message: notes || `Your appeal has been ${decision}.`
      }
    });

    // Log admin action
    const auditId3 = crypto.randomUUID();
    await (prisma.auditLog as any).create({
        data: {
          id: auditId3,
        userId: authCheck.adminId,
        action: 'REVIEW_APPEAL',
        details: {
          actionId,
          decision,
          notes
        },
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || 'unknown',
        outcome: 'success'
      }
    });

    return NextResponse.json({
      message: 'Appeal reviewed successfully',
      decision
    });

  } catch (error) {
    console.error('Error reviewing appeal:', error);
    return NextResponse.json(
      { error: 'Failed to review appeal' },
      { status: 500 }
    );
  }
}