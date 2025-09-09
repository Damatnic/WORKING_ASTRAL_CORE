import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { z } from 'zod';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth-middleware';
import { UserRole, AdminLevel } from '@prisma/client';
import {
  createAuditLog,
  validateRequest,
  getPaginationParams,
  getPaginationMeta,
  buildWhereClause,
  checkRateLimit,
  successResponse,
  errorResponse,
  sanitizeUserData,
  getClientIp,
  encryptApiField,
  decryptApiField,
} from '@/lib/api-utils';

// GET /api/admin/users - Get all users with pagination, search, and filters
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = getPaginationParams(searchParams);
    
    // Build where clause with filters
    const allowedFilters = ['role', 'isActive', 'isEmailVerified', 'isTwoFactorEnabled'];
    const where = buildWhereClause(searchParams, allowedFilters);
    
    // Get total count
    const total = await prisma.user.count({ where });
    
    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      include: {
        UserProfile: true,
        HelperProfile: true,
        AdminProfile: true,
        _count: {
          select: {
            JournalEntry: true,
            MoodEntry: true,
            Appointment: true,
            CrisisReport: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
    });
    
    // Sanitize user data
    const sanitizedUsers = users.map(user => ({
      ...sanitizeUserData(user),
      stats: {
        journalEntries: (user as any)._count?.journalEntry || 0,
        moodEntries: (user as any)._count?.moodEntry || 0,
        appointments: (user as any)._count?.appointment || 0,
        crisisReports: (user as any)._count?.crisisReport || 0,
      },
    }));
    
    // Log admin action
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.users.list',
      resource: 'users',
      details: {
        filters: Object.fromEntries(searchParams.entries()),
        resultCount: users.length,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(
      sanitizedUsers,
      200,
      getPaginationMeta(total, page, limit)
    );
  } catch (error) {
    console.error('Admin users list error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
});

// POST /api/admin/users - Create a new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  adminLevel: z.nativeEnum(AdminLevel).optional(),
  departments: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const body = await (req as any).json();
    const validation = validateRequest(body, createUserSchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    
    if (existingUser) {
      return errorResponse('Email already exists', 409);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          anonymousId: crypto.randomUUID(),
          email: data.email.toLowerCase(),
          hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: `${data.firstName} ${data.lastName}`,
          role: data.role,
          isActive: data.isActive ?? true,
          isEmailVerified: data.isEmailVerified ?? false,
          privacySettings: JSON.stringify({
            shareProfile: false,
            allowDirectMessages: true,
            showOnlineStatus: false,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Create user profile
      await tx.userProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: newUser.id,
          mentalHealthGoals: [],
          interestedTopics: [],
          preferredCommunication: ['email'],
          crisisContacts: JSON.stringify([]),
          notificationSettings: JSON.stringify({
            email: true,
            push: false,
            crisis: true,
            appointments: true,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Create admin profile if admin role
      if (data.role === UserRole.ADMIN || data.role === UserRole.SUPER_ADMIN) {
        await tx.adminProfile.create({
        data: {
          id: crypto.randomUUID(),
            userId: newUser.id,
            adminLevel: data.adminLevel || AdminLevel.MODERATOR,
            departments: data.departments || [],
            permissions: JSON.stringify(data.permissions || {}),
            canModerateUsers: true,
            canAccessAnalytics: true,
            canManageContent: true,
            canHandleCrisis: data.role === UserRole.SUPER_ADMIN,
            canManageSystem: data.role === UserRole.SUPER_ADMIN,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      
      return newUser;
    });
    
    // Log admin action
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.users.create',
      resource: 'users',
      resourceId: user.id,
      details: {
        email: user.email,
        role: user.role,
        createdBy: req.user?.id,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(sanitizeUserData(user), 201);
  } catch (error) {
    console.error('Admin user creation error:', error);
    return errorResponse('Failed to create user', 500);
  }
});

// PUT /api/admin/users - Update a user
const updateUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
  adminLevel: z.nativeEnum(AdminLevel).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  });
}

export async function PUT(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const body = await (req as any).json();
    const validation = validateRequest(body, updateUserSchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { AdminProfile: true },
    });
    
    if (!existingUser) {
      return errorResponse('User not found', 404);
    }
    
    // Prevent modification of super admin by non-super admin
    if (existingUser.role === UserRole.SUPER_ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
      await createAuditLog({
        userId: req.user?.id,
        action: 'admin.users.update.denied',
        resource: 'users',
        resourceId: data.userId,
        details: { reason: 'insufficient_permissions' },
        outcome: 'failure',
        ipAddress: getClientIp(req),
        userAgent: ((req as any).headers || req).get('user-agent') || undefined,
      });
      
      return errorResponse('Cannot modify super admin account', 403);
    }
    
    // Update user with transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.firstName || data.lastName) {
        updateData.displayName = `${data.firstName || existingUser.firstName} ${data.lastName || existingUser.lastName}`;
      }
      if (data.role !== undefined) updateData.role = data.role;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isEmailVerified !== undefined) updateData.isEmailVerified = data.isEmailVerified;
      
      // Handle password reset
      if (data.resetPassword && data.newPassword) {
        updateData.hashedPassword = await bcrypt.hash(data.newPassword, 12);
        updateData.failedLoginAttempts = 0;
        updateData.lockedUntil = null;
      }
      
      // Update user
      const user = await tx.user.update({
        where: { id: data.userId },
        data: updateData,
      });
      
      // Update admin profile if needed
      if (data.adminLevel || data.permissions) {
        if (existingUser.AdminProfile) {
          await tx.adminProfile.update({
            where: { id: existingUser.AdminProfile.id },
            data: {
              adminLevel: data.adminLevel || existingUser.AdminProfile.adminLevel,
              permissions: data.permissions ? data.permissions as any : existingUser.AdminProfile.permissions,
              updatedAt: new Date(),
            },
          });
        } else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
          // Create admin profile if it doesn't exist
          await tx.adminProfile.create({
        data: {
          id: crypto.randomUUID(),
              userId: user.id,
              adminLevel: data.adminLevel || AdminLevel.MODERATOR,
              departments: [],
              permissions: JSON.stringify(data.permissions || {}),
              canModerateUsers: true,
              canAccessAnalytics: true,
              canManageContent: true,
              canHandleCrisis: user.role === UserRole.SUPER_ADMIN,
              canManageSystem: user.role === UserRole.SUPER_ADMIN,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }
      
      return user;
    });
    
    // Log admin action
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.users.update',
      resource: 'users',
      resourceId: data.userId,
      details: {
        changes: Object.keys(data).filter(k => k !== 'userId'),
        updatedBy: req.user?.id,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(sanitizeUserData(updatedUser), 200);
  } catch (error) {
    console.error('Admin user update error:', error);
    return errorResponse('Failed to update user', 500);
  }
  });
}

// DELETE /api/admin/users - Delete or anonymize a user
export async function DELETE(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const userId = searchParams.get('userId');
    const hardDelete = searchParams.get('hardDelete') === 'true';
    
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Prevent deletion of super admin
    if (user.role === UserRole.SUPER_ADMIN) {
      await createAuditLog({
        userId: req.user?.id,
        action: 'admin.users.delete.denied',
        resource: 'users',
        resourceId: userId,
        details: { reason: 'cannot_delete_super_admin' },
        outcome: 'failure',
        ipAddress: getClientIp(req),
        userAgent: ((req as any).headers || req).get('user-agent') || undefined,
      });
      
      return errorResponse('Cannot delete super admin account', 403);
    }
    
    if (hardDelete) {
      // Hard delete - completely remove user and all related data
      await prisma.$transaction(async (tx) => {
        // Delete all related data in correct order
        await tx.session.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        await tx.emailVerification.deleteMany({ where: { userId } });
        await tx.passwordReset.deleteMany({ where: { userId } });
        await tx.notification.deleteMany({ where: { userId } });
        await tx.moodEntry.deleteMany({ where: { userId } });
        await tx.journalEntry.deleteMany({ where: { userId } });
        await tx.appointment.deleteMany({ where: { userId } });
        await tx.safetyPlan.deleteMany({ where: { userId } });
        await tx.crisisReport.deleteMany({ where: { userId } });
        await tx.communityPost.deleteMany({ where: { authorId: userId } });
        await tx.supportSession.deleteMany({ where: { OR: [{ userId }, { helperId: userId }] } });
        await tx.auditLog.deleteMany({ where: { userId } });
        
        // Delete profiles
        await tx.userProfile.deleteMany({ where: { userId } });
        await tx.helperProfile.deleteMany({ where: { userId } });
        await tx.adminProfile.deleteMany({ where: { userId } });
        await tx.anonymousIdentity.deleteMany({ where: { userId } });
        
        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
      });
      
      await createAuditLog({
        userId: req.user?.id,
        action: 'admin.users.hard_delete',
        resource: 'users',
        resourceId: userId,
        details: {
          deletedEmail: user.email,
          deletedRole: user.role,
          deletedBy: req.user?.id,
        },
        outcome: 'success',
        ipAddress: getClientIp(req),
        userAgent: ((req as any).headers || req).get('user-agent') || undefined,
      });
      
      return successResponse({ message: 'User permanently deleted' }, 200);
    } else {
      // Soft delete - anonymize user data
      const anonymizedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymized.local`,
          hashedPassword: null,
          firstName: 'Deleted',
          lastName: 'User',
          displayName: 'Deleted User',
          avatarUrl: null,
          phoneNumber: null,
          dateOfBirth: null,
          isActive: false,
          isEmailVerified: false,
          isTwoFactorEnabled: false,
          twoFactorSecret: null,
          privacySettings: '{}',
          updatedAt: new Date(),
        },
      });
      
      // Anonymize related sensitive data
      await prisma.$transaction(async (tx) => {
        // Clear journal entries
        await tx.journalEntry.updateMany({
          where: { userId },
          data: {
            encryptedTitle: encryptApiField('[Deleted]'),
            encryptedContent: encryptApiField('[Content Removed]'),
            encryptedTags: undefined,
          },
        });
        
        // Clear mood entries
        await tx.moodEntry.updateMany({
          where: { userId },
          data: {
            encryptedNotes: undefined,
            encryptedTags: undefined,
          },
        });
        
        // Clear safety plans
        await tx.safetyPlan.updateMany({
          where: { userId },
          data: {
            warningSignsEncrypted: encryptApiField('[]'),
            copingStrategiesEncrypted: encryptApiField('[]'),
            supportContactsEncrypted: encryptApiField('[]'),
            safeEnvironmentEncrypted: encryptApiField('[]'),
            reasonsToLiveEncrypted: encryptApiField('[]'),
            isActive: false,
          },
        });
      });
      
      await createAuditLog({
        userId: req.user?.id,
        action: 'admin.users.soft_delete',
        resource: 'users',
        resourceId: userId,
        details: {
          anonymizedBy: req.user?.id,
        },
        outcome: 'success',
        ipAddress: getClientIp(req),
        userAgent: ((req as any).headers || req).get('user-agent') || undefined,
      });
      
      return successResponse({ message: 'User data anonymized successfully' }, 200);
    }
  } catch (error) {
    console.error('Admin user deletion error:', error);
    return errorResponse('Failed to delete user', 500);
  }
  });
}