import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-middleware';
import {
  createAuditLog,
  validateRequest,
  successResponse,
  errorResponse,
  getClientIp,
} from '@/lib/api-utils';

// GET /api/user/preferences - Get user preferences
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    
    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        timezone: true,
        preferredLanguage: true,
        privacySettings: true,
        dataRetentionDays: true,
        allowAnalytics: true,
        UserProfile: {
          select: {
            notificationSettings: true,
            privacyLevel: true,
            shareDataForResearch: true,
            preferredCommunication: true,
          },
        },
      },
    });
    
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    const preferences = {
      general: {
        timezone: user.timezone,
        language: user.preferredLanguage,
        dataRetentionDays: user.dataRetentionDays,
      },
      privacy: {
        ...JSON.parse(user.privacySettings as string),
        privacyLevel: (user as any).UserProfile?.privacyLevel || 'moderate',
        shareDataForResearch: (user as any).UserProfile?.shareDataForResearch || false,
        allowAnalytics: user.allowAnalytics,
      },
      notifications: (user as any).UserProfile?.notificationSettings 
        ? JSON.parse((user as any).UserProfile.notificationSettings as string)
        : {
            email: true,
            push: false,
            crisis: true,
            appointments: true,
            communityUpdates: false,
            weeklyDigest: true,
          },
      communication: {
        preferredChannels: (user as any).UserProfile?.preferredCommunication || ['email'],
      },
    };
    
    return successResponse(preferences, 200);
  } catch (error) {
    console.error('User preferences fetch error:', error);
    return errorResponse('Failed to fetch preferences', 500);
  }
});

// PUT /api/user/preferences - Update user preferences
const preferencesUpdateSchema = z.object({
  general: z.object({
    timezone: z.string().optional(),
    language: z.string().length(2).optional(),
    dataRetentionDays: z.number().min(30).max(365).optional(),
  }).optional(),
  privacy: z.object({
    shareProfile: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    privacyLevel: z.enum(['public', 'moderate', 'private']).optional(),
    shareDataForResearch: z.boolean().optional(),
    allowAnalytics: z.boolean().optional(),
  }).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    crisis: z.boolean().optional(),
    appointments: z.boolean().optional(),
    communityUpdates: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
  }).optional(),
  communication: z.object({
    preferredChannels: z.array(z.enum(['email', 'sms', 'push', 'chat'])).optional(),
  }).optional(),
});

export const PUT = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const body = await (req as any).json();
    const validation = validateRequest(body, preferencesUpdateSchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Update preferences in transaction
    await prisma.$transaction(async (tx) => {
      // Prepare user update data
      const userUpdateData: any = {
        updatedAt: new Date(),
      };
      
      // Update general preferences
      if (data.general) {
        if (data.general.timezone) userUpdateData.timezone = data.general.timezone;
        if (data.general.language) userUpdateData.preferredLanguage = data.general.language;
        if (data.general.dataRetentionDays !== undefined) {
          userUpdateData.dataRetentionDays = data.general.dataRetentionDays;
        }
      }
      
      // Update privacy settings
      if (data.privacy) {
        const currentPrivacy = await tx.user.findUnique({
          where: { id: userId },
          select: { privacySettings: true },
        });
        
        const privacySettings = currentPrivacy?.privacySettings 
          ? JSON.parse(currentPrivacy.privacySettings as string)
          : {};
        
        if (data.privacy.shareProfile !== undefined) {
          privacySettings.shareProfile = data.privacy.shareProfile;
        }
        if (data.privacy.allowDirectMessages !== undefined) {
          privacySettings.allowDirectMessages = data.privacy.allowDirectMessages;
        }
        if (data.privacy.showOnlineStatus !== undefined) {
          privacySettings.showOnlineStatus = data.privacy.showOnlineStatus;
        }
        
        userUpdateData.privacySettings = JSON.stringify(privacySettings);
        
        if (data.privacy.allowAnalytics !== undefined) {
          userUpdateData.allowAnalytics = data.privacy.allowAnalytics;
        }
      }
      
      // Update user if there are changes
      if (Object.keys(userUpdateData).length > 1) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }
      
      // Update profile preferences
      const profileUpdateData: any = {
        updatedAt: new Date(),
      };
      
      // Update notification settings
      if (data.notifications) {
        const currentProfile = await tx.userProfile.findUnique({
          where: { userId },
          select: { notificationSettings: true },
        });
        
        const notificationSettings = currentProfile?.notificationSettings 
          ? JSON.parse(currentProfile.notificationSettings as string)
          : {};
        
        Object.assign(notificationSettings, data.notifications);
        profileUpdateData.notificationSettings = JSON.stringify(notificationSettings);
      }
      
      // Update privacy level
      if (data.privacy?.privacyLevel) {
        profileUpdateData.privacyLevel = data.privacy.privacyLevel;
      }
      
      // Update research sharing preference
      if (data.privacy?.shareDataForResearch !== undefined) {
        profileUpdateData.shareDataForResearch = data.privacy.shareDataForResearch;
      }
      
      // Update communication preferences
      if (data.communication?.preferredChannels) {
        profileUpdateData.preferredCommunication = data.communication.preferredChannels;
      }
      
      // Update or create profile
      if (Object.keys(profileUpdateData).length > 1) {
        await tx.userProfile.upsert({
          where: { userId },
          update: profileUpdateData,
          create: {
            id: crypto.randomUUID(),
            userId,
            ...profileUpdateData,
            mentalHealthGoals: [],
            interestedTopics: [],
            preferredCommunication: data.communication?.preferredChannels || ['email'],
            crisisContacts: JSON.stringify([]),
            notificationSettings: profileUpdateData.notificationSettings || JSON.stringify({
              email: true,
              push: false,
              crisis: true,
              appointments: true,
            }),
            createdAt: new Date(),
          },
        });
      }
    });
    
    // Log preferences update
    await createAuditLog({
      userId,
      action: 'user.preferences.update',
      resource: 'user_preferences',
      resourceId: userId,
      details: {
        updatedCategories: Object.keys(data),
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Preferences updated successfully',
    }, 200);
  } catch (error) {
    console.error('User preferences update error:', error);
    return errorResponse('Failed to update preferences', 500);
  }
});