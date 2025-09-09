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
  journalEntrySchema,
} from '@/lib/api-utils';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/user/journal-entries - Get user's journal entries
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const { page, limit, sortBy, sortOrder } = getPaginationParams(searchParams);
    
    // Filters
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const isPrivate = searchParams.get('private');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build where clause
    const where: any = { userId };
    
    if (isPrivate !== null) {
      where.isPrivate = isPrivate === 'true';
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    // Get journal entries
    const [total, entries] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);
    
    // Decrypt and filter entries
    const decryptedEntries = entries.map(entry => {
      const title = entry.encryptedTitle ? decryptApiField(entry.encryptedTitle) : 'Untitled';
      const content = decryptApiField(entry.encryptedContent);
      const tags = entry.encryptedTags ? decryptApiField(entry.encryptedTags as string) : [];
      
      // Apply client-side filters
      if (search && !content.toLowerCase().includes(search.toLowerCase()) && 
          !title.toLowerCase().includes(search.toLowerCase())) {
        return null;
      }
      
      if (tag && !tags.includes(tag)) {
        return null;
      }
      
      return {
        id: entry.id,
        title,
        content,
        tags,
        isPrivate: entry.isPrivate,
        sentiment: entry.sentiment,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }).filter(Boolean);
    
    // Get sentiment analysis if requested
    let sentimentAnalysis = null;
    if (searchParams.get('analyzeSentiment') === 'true') {
      const sentiments = await prisma.journalEntry.groupBy({
        by: ['sentiment'],
        where: {
          userId,
          sentiment: { not: null },
        },
        _count: true,
      });
      
      const avgSentiment = await prisma.journalEntry.aggregate({
        where: {
          userId,
          sentiment: { not: null },
        },
        _avg: {
          sentiment: true,
        },
      });
      
      sentimentAnalysis = {
        average: avgSentiment._avg.sentiment?.toFixed(2) || 0,
        distribution: sentiments.reduce((acc: any, item: any) => {
          const sentimentLabel = 
            item.sentiment >= 0.6 ? 'positive' :
            item.sentiment <= -0.6 ? 'negative' : 'neutral';
          acc[sentimentLabel] = (acc[sentimentLabel] || 0) + item._count;
          return acc;
        }, {}),
      };
    }
    
    // Get tags summary
    const allTags = new Set<string>();
    entries.forEach(entry => {
      if (entry.encryptedTags) {
        const tags = decryptApiField(entry.encryptedTags as string);
        if (Array.isArray(tags)) {
          tags.forEach(tag => allTags.add(tag));
        }
      }
    });
    
    return successResponse(
      {
        entries: decryptedEntries,
        tags: Array.from(allTags),
        sentimentAnalysis,
      },
      200,
      getPaginationMeta(total, page, limit)
    );
  } catch (error) {
    console.error('Journal entries fetch error:', error);
    return errorResponse('Failed to fetch journal entries', 500);
  }
  });
}

// POST /api/user/journal-entries - Create a new journal entry
export async function POST(req: NextRequest) {
  return withAuth(req, async (req) => {
  try {
    const userId = req.user!.id;
    const body = await (req as any).json();
    const validation = validateRequest(body, journalEntrySchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Perform basic sentiment analysis
    let sentiment = null;
    if (data.content) {
      // Simple sentiment analysis (in production, use a proper NLP service)
      const positiveWords = ['happy', 'joy', 'love', 'grateful', 'excited', 'wonderful', 'amazing', 'great'];
      const negativeWords = ['sad', 'angry', 'frustrated', 'depressed', 'anxious', 'worried', 'terrible', 'awful'];
      
      const lowerContent = data.content.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
      
      if (positiveCount > 0 || negativeCount > 0) {
        sentiment = (positiveCount - negativeCount) / (positiveCount + negativeCount);
      }
    }
    
    // Create journal entry with encrypted data
    const journalEntry = await prisma.journalEntry.create({
        data: {
          id: crypto.randomUUID(),
        userId,
        encryptedTitle: data.title ? encryptApiField(data.title) : null,
        encryptedContent: encryptApiField(data.content),
        encryptedTags: data.tags ? encryptApiField(data.tags) : null,
        isPrivate: data.isPrivate ?? true,
        sentiment,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Check for concerning content
    const concerningKeywords = ['suicide', 'kill myself', 'end it all', 'not worth living', 'self-harm', 'cutting'];
    const contentLower = data.content.toLowerCase();
    const hasConcerningContent = concerningKeywords.some(keyword => contentLower.includes(keyword));
    
    if (hasConcerningContent) {
      // Create safety alert
      await prisma.safetyAlert.create({
        data: {
          id: crypto.randomUUID(),
          type: 'journal_content',
          severity: 'high',
          userId,
          context: 'journal_entry',
          indicators: ['Concerning keywords detected in journal entry'],
          handled: false,
          actions: [],
          notes: 'Concerning keywords detected in journal entry',
          detectedAt: new Date(),
        },
      });
      
      // Create notification for user with resources
      await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: 'crisis_resources',
          title: 'We noticed you might be going through a difficult time',
          message: 'Here are some resources that might help. Remember, you are not alone.',
          isPriority: true,
          metadata: {
            resources: [
              { name: 'Crisis Hotline', value: '988', type: 'phone' },
              { name: 'Crisis Text Line', value: 'Text HOME to 741741', type: 'text' },
              { name: 'Emergency', value: '911', type: 'phone' },
            ],
          },
          createdAt: new Date(),
        },
      });
    }
    
    // Log journal entry creation
    await createAuditLog({
      userId,
      action: 'user.journal.create',
      resource: 'journal_entry',
      resourceId: journalEntry.id,
      details: {
        hasTitle: !!data.title,
        wordCount: data.content.split(' ').length,
        hasTags: !!data.tags,
        sentiment,
        concerningContent: hasConcerningContent,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Journal entry created successfully',
      entry: {
        id: journalEntry.id,
        createdAt: journalEntry.createdAt,
        sentiment,
      },
      ...(hasConcerningContent && {
        resources: {
          message: 'We care about your wellbeing. Here are some resources that might help:',
          contacts: [
            { name: 'Crisis Hotline', value: '988' },
            { name: 'Crisis Text Line', value: 'Text HOME to 741741' },
          ],
        },
      }),
    }, 201);
  } catch (error) {
    console.error('Journal entry creation error:', error);
    return errorResponse('Failed to create journal entry', 500);
  }
  });
}

// PUT /api/user/journal-entries - Update a journal entry
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return errorResponse('Entry ID is required', 400);
    }
    
    const body = await (req as any).json();
    const validation = validateRequest(body, journalEntrySchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });
    
    if (!existingEntry) {
      return errorResponse('Journal entry not found', 404);
    }
    
    // Perform sentiment analysis
    let sentiment = existingEntry.sentiment;
    if (data.content) {
      const positiveWords = ['happy', 'joy', 'love', 'grateful', 'excited', 'wonderful', 'amazing', 'great'];
      const negativeWords = ['sad', 'angry', 'frustrated', 'depressed', 'anxious', 'worried', 'terrible', 'awful'];
      
      const lowerContent = data.content.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
      
      if (positiveCount > 0 || negativeCount > 0) {
        sentiment = (positiveCount - negativeCount) / (positiveCount + negativeCount);
      }
    }
    
    // Update journal entry
    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        encryptedTitle: data.title ? encryptApiField(data.title) : existingEntry.encryptedTitle,
        encryptedContent: encryptApiField(data.content),
        encryptedTags: data.tags ? encryptApiField(data.tags) : existingEntry.encryptedTags,
        isPrivate: data.isPrivate ?? existingEntry.isPrivate,
        sentiment,
        updatedAt: new Date(),
      },
    });
    
    // Log journal entry update
    await createAuditLog({
      userId,
      action: 'user.journal.update',
      resource: 'journal_entry',
      resourceId: entryId,
      details: {
        fieldsUpdated: Object.keys(data),
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Journal entry updated successfully',
      entry: {
        id: updatedEntry.id,
        updatedAt: updatedEntry.updatedAt,
        sentiment,
      },
    }, 200);
  } catch (error) {
    console.error('Journal entry update error:', error);
    return errorResponse('Failed to update journal entry', 500);
  }
  });
}

// DELETE /api/user/journal-entries - Delete a journal entry
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return errorResponse('Entry ID is required', 400);
    }
    
    // Check if entry exists and belongs to user
    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });
    
    if (!existingEntry) {
      return errorResponse('Journal entry not found', 404);
    }
    
    // Delete journal entry
    await prisma.journalEntry.delete({
      where: { id: entryId },
    });
    
    // Log journal entry deletion
    await createAuditLog({
      userId,
      action: 'user.journal.delete',
      resource: 'journal_entry',
      resourceId: entryId,
      details: {
        createdAt: existingEntry.createdAt,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Journal entry deleted successfully',
    }, 200);
  } catch (error) {
    console.error('Journal entry deletion error:', error);
    return errorResponse('Failed to delete journal entry', 500);
  }
  });
}