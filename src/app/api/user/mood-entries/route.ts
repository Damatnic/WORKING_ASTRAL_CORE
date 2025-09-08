import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-middleware';
import {
  createAuditLog,
  validateRequest,
  getPaginationParams,
  getPaginationMeta,
  successResponse,
  errorResponse,
  getClientIp,
  encryptApiField,
  decryptApiField,
  moodEntrySchema,
} from '@/lib/api-utils';

// GET /api/user/mood-entries - Get user's mood entries
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const { page, limit, sortBy, sortOrder } = getPaginationParams(searchParams);
    
    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period'); // 'day', 'week', 'month', 'year'
    
    // Build where clause
    const where: any = { userId };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (period) {
      const now = new Date();
      const periodStart = new Date();
      
      switch (period) {
        case 'day':
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      where.createdAt = { gte: periodStart };
    }
    
    // Get mood entries
    const [total, entries] = await Promise.all([
      prisma.moodEntry.count({ where }),
      prisma.moodEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);
    
    // Decrypt notes and tags
    const decryptedEntries = entries.map(entry => ({
      id: entry.id,
      moodScore: entry.moodScore,
      anxietyLevel: entry.anxietyLevel,
      energyLevel: entry.energyLevel,
      notes: entry.encryptedNotes ? decryptApiField(entry.encryptedNotes as string) : null,
      tags: entry.encryptedTags ? decryptApiField(entry.encryptedTags as string) : [],
      createdAt: entry.createdAt,
    }));
    
    // Calculate statistics if requested
    let statistics = null;
    if (searchParams.get('includeStats') === 'true') {
      const stats = await prisma.moodEntry.aggregate({
        where,
        _avg: {
          moodScore: true,
          anxietyLevel: true,
          energyLevel: true,
        },
        _min: {
          moodScore: true,
          anxietyLevel: true,
          energyLevel: true,
        },
        _max: {
          moodScore: true,
          anxietyLevel: true,
          energyLevel: true,
        },
      });
      
      // Get mood trends
      const trends = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          AVG(mood_score) as avg_mood,
          AVG(anxiety_level) as avg_anxiety,
          AVG(energy_level) as avg_energy,
          COUNT(*) as entries_count
        FROM "MoodEntry"
        WHERE user_id = ${userId}
          ${startDate ? `AND created_at >= ${new Date(startDate)}` : ''}
          ${endDate ? `AND created_at <= ${new Date(endDate)}` : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
      
      statistics = {
        averages: {
          mood: stats._avg.moodScore?.toFixed(1) || 0,
          anxiety: stats._avg.anxietyLevel?.toFixed(1) || 0,
          energy: stats._avg.energyLevel?.toFixed(1) || 0,
        },
        ranges: {
          mood: {
            min: stats._min.moodScore || 0,
            max: stats._max.moodScore || 0,
          },
          anxiety: {
            min: stats._min.anxietyLevel || 0,
            max: stats._max.anxietyLevel || 0,
          },
          energy: {
            min: stats._min.energyLevel || 0,
            max: stats._max.energyLevel || 0,
          },
        },
        trends,
        totalEntries: total,
      };
    }
    
    return successResponse(
      {
        entries: decryptedEntries,
        statistics,
      },
      200,
      getPaginationMeta(total, page, limit)
    );
  } catch (error) {
    console.error('Mood entries fetch error:', error);
    return errorResponse('Failed to fetch mood entries', 500);
  }
});

// POST /api/user/mood-entries - Create a new mood entry
export const POST = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const body = await (req as any).json();
    const validation = validateRequest(body, moodEntrySchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Check for duplicate entry (prevent multiple entries within 5 minutes)
    const recentEntry = await prisma.moodEntry.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      },
    });
    
    if (recentEntry) {
      return errorResponse('Please wait at least 5 minutes between mood entries', 429);
    }
    
    // Create mood entry with encrypted data
    const moodEntry = await prisma.moodEntry.create({
        data: {
          id: crypto.randomUUID(),
        userId,
        moodScore: data.moodScore,
        anxietyLevel: data.anxietyLevel,
        energyLevel: data.energyLevel,
        encryptedNotes: data.notes ? encryptApiField(data.notes) : null,
        encryptedTags: data.tags ? encryptApiField(data.tags) : null,
        createdAt: new Date(),
      },
    });
    
    // Check for concerning patterns
    const recentMoods = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        moodScore: true,
        anxietyLevel: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    // Detect concerning patterns
    const avgMood = recentMoods.reduce((sum, m) => sum + m.moodScore, 0) / recentMoods.length;
    const avgAnxiety = recentMoods
      .filter(m => m.anxietyLevel !== null)
      .reduce((sum, m, _, arr) => sum + m.anxietyLevel! / arr.length, 0);
    
    // Create safety alert if needed
    if (avgMood <= 3 || avgAnxiety >= 8 || data.moodScore <= 2) {
      await prisma.safetyAlert.create({
        data: {
          id: crypto.randomUUID(),
          type: 'mood_pattern',
          severity: data.moodScore <= 2 ? 'high' : 'medium',
          userId,
          context: 'mood_tracking',
          indicators: [
            `Current mood: ${data.moodScore}`,
            `Average mood (7d): ${avgMood.toFixed(1)}`,
            `Average anxiety (7d): ${avgAnxiety.toFixed(1)}`,
          ],
          handled: false,
          detectedAt: new Date(),
        },
      });
    }
    
    // Log mood entry creation
    await createAuditLog({
      userId,
      action: 'user.mood.create',
      resource: 'mood_entry',
      resourceId: moodEntry.id,
      details: {
        moodScore: data.moodScore,
        hasNotes: !!data.notes,
        hasTags: !!data.tags,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Mood entry created successfully',
      entry: {
        id: moodEntry.id,
        moodScore: moodEntry.moodScore,
        anxietyLevel: moodEntry.anxietyLevel,
        energyLevel: moodEntry.energyLevel,
        createdAt: moodEntry.createdAt,
      },
      insights: {
        averageMood: avgMood.toFixed(1),
        trend: avgMood > data.moodScore ? 'declining' : 'improving',
      },
    }, 201);
  } catch (error) {
    console.error('Mood entry creation error:', error);
    return errorResponse('Failed to create mood entry', 500);
  }
});

// PUT /api/user/mood-entries - Update a mood entry
export const PUT = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return errorResponse('Entry ID is required', 400);
    }
    
    const body = await (req as any).json();
    const validation = validateRequest(body, moodEntrySchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.moodEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });
    
    if (!existingEntry) {
      return errorResponse('Mood entry not found', 404);
    }
    
    // Check if entry is too old to edit (24 hours)
    const entryAge = Date.now() - existingEntry.createdAt.getTime();
    if (entryAge > 24 * 60 * 60 * 1000) {
      return errorResponse('Cannot edit mood entries older than 24 hours', 403);
    }
    
    // Update mood entry
    const updatedEntry = await prisma.moodEntry.update({
      where: { id: entryId },
      data: {
        moodScore: data.moodScore,
        anxietyLevel: data.anxietyLevel,
        energyLevel: data.energyLevel,
        encryptedNotes: data.notes ? encryptApiField(data.notes) : null,
        encryptedTags: data.tags ? encryptApiField(data.tags) : null,
      },
    });
    
    // Log mood entry update
    await createAuditLog({
      userId,
      action: 'user.mood.update',
      resource: 'mood_entry',
      resourceId: entryId,
      details: {
        changes: {
          moodScore: { from: existingEntry.moodScore, to: data.moodScore },
          anxietyLevel: { from: existingEntry.anxietyLevel, to: data.anxietyLevel },
          energyLevel: { from: existingEntry.energyLevel, to: data.energyLevel },
        },
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Mood entry updated successfully',
      entry: {
        id: updatedEntry.id,
        moodScore: updatedEntry.moodScore,
        anxietyLevel: updatedEntry.anxietyLevel,
        energyLevel: updatedEntry.energyLevel,
        createdAt: updatedEntry.createdAt,
      },
    }, 200);
  } catch (error) {
    console.error('Mood entry update error:', error);
    return errorResponse('Failed to update mood entry', 500);
  }
});

// DELETE /api/user/mood-entries - Delete a mood entry
export const DELETE = withAuth(async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return errorResponse('Entry ID is required', 400);
    }
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.moodEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });
    
    if (!existingEntry) {
      return errorResponse('Mood entry not found', 404);
    }
    
    // Delete mood entry
    await prisma.moodEntry.delete({
      where: { id: entryId },
    });
    
    // Log mood entry deletion
    await createAuditLog({
      userId,
      action: 'user.mood.delete',
      resource: 'mood_entry',
      resourceId: entryId,
      details: {
        moodScore: existingEntry.moodScore,
        createdAt: existingEntry.createdAt,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Mood entry deleted successfully',
    }, 200);
  } catch (error) {
    console.error('Mood entry deletion error:', error);
    return errorResponse('Failed to delete mood entry', 500);
  }
});