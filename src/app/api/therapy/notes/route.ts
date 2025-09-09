import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import {
  requireRole,
  auditLog,
  validateInput,
  errorResponse,
  successResponse,
  paginatedResponse,
  verifyClientConsent,
} from '@/lib/api-middleware';
import { encrypt, encryptJSON, decryptJSON, maskSensitiveData } from '@/lib/encryption-exports';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schemas
const getNotesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  clientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  noteType: z.enum(['progress', 'intake', 'discharge', 'treatment_plan', 'crisis']).optional(),
});

const createNoteSchema = z.object({
  clientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  noteType: z.enum(['progress', 'intake', 'discharge', 'treatment_plan', 'crisis']),
  content: z.object({
    subjective: z.string(), // What the client reports
    objective: z.string(), // Observable behaviors/data
    assessment: z.string(), // Clinical assessment
    plan: z.string(), // Treatment plan/next steps
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      response: z.string(),
    })).optional(),
    diagnoses: z.array(z.object({
      code: z.string(),
      description: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      onset: z.string().optional(),
    })).optional(),
    riskFactors: z.object({
      suicidalIdeation: z.object({
        present: z.boolean(),
        plan: z.boolean(),
        means: z.boolean(),
        intent: z.boolean(),
        notes: z.string().optional(),
      }),
      homicidalIdeation: z.object({
        present: z.boolean(),
        target: z.string().optional(),
        plan: z.boolean(),
        notes: z.string().optional(),
      }),
      selfHarm: z.object({
        present: z.boolean(),
        frequency: z.string().optional(),
        method: z.string().optional(),
        notes: z.string().optional(),
      }),
      substanceUse: z.object({
        present: z.boolean(),
        substances: z.array(z.string()).optional(),
        frequency: z.string().optional(),
        notes: z.string().optional(),
      }),
    }).optional(),
    functionalStatus: z.object({
      work: z.enum(['good', 'fair', 'poor', 'unable']),
      social: z.enum(['good', 'fair', 'poor', 'isolated']),
      selfCare: z.enum(['independent', 'needs_assistance', 'dependent']),
      notes: z.string().optional(),
    }).optional(),
  }),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string(),
  })).optional(),
  isLocked: z.boolean().default(false), // Prevent further edits
});

const updateNoteSchema = z.object({
  noteId: z.string().uuid(),
  content: createNoteSchema.shape.content.partial(),
  addendum: z.string().optional(), // For locked notes
});

// Custom type for therapy notes storage
interface TherapyNote {
  id: string;
  clientId: string;
  therapistId: string;
  sessionId?: string;
  noteType: string;
  encryptedContent: string;
  createdAt: Date;
  updatedAt: Date;
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  addendums?: Array<{
    content: string;
    createdBy: string;
    createdAt: string;
  }>;
}

// GET /api/therapy/notes - Get therapy notes
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params = validateInput(getNotesSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      clientId: searchParams.get('clientId'),
      sessionId: searchParams.get('sessionId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      noteType: searchParams.get('noteType'),
    }) as any;
    
    // Verify consent for client
    const hasConsent = await verifyClientConsent((session as any).user.id, params.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to access this client\'s notes');
    }
    
    // Build query filters
    const where: any = {
      userId: params.clientId,
      type: 'therapy_note',
    };
    
    if (params.sessionId) {
      where.metadata = {
        path: ['sessionId'],
        equals: params.sessionId,
      };
    }
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }
    
    // Get total count
    const total = await prisma.journalEntry.count({ where });
    
    // Get notes with pagination (using JournalEntry as secure storage)
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: (params as any).sortOrder || 'desc' },
    });
    
    // Decrypt and format notes
    const notes = entries.map(entry => {
      let decryptedContent = null;
      let metadata = null;
      
      try {
        if (entry.encryptedContent) {
          decryptedContent = decryptJSON(entry.encryptedContent);
        }
        if (entry.encryptedTags) {
          metadata = decryptJSON(entry.encryptedTags as string);
        }
      } catch (error) {
        console.error('Failed to decrypt note:', error);
      }
      
      return {
        id: entry.id,
        clientId: entry.userId,
        clientName: `${entry.User.firstName || ''} ${entry.User.lastName || ''}`.trim(),
        sessionId: metadata?.sessionId,
        noteType: metadata?.noteType || 'progress',
        content: decryptedContent,
        isLocked: metadata?.isLocked || false,
        lockedAt: metadata?.lockedAt,
        addendums: metadata?.addendums || [],
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });
    
    // Audit log - log access but not content
    await (auditLog as any)(
      (session as any).user.id,
      'view_notes',
      'therapy_notes',
      params.clientId,
      {
        count: notes.length,
        page: params.page,
        noteTypes: [...new Set(notes.map(n => n.noteType))],
      },
      'success',
      req
    );
    
    return paginatedResponse(
      notes,
      total,
      params.page,
      params.limit,
      'Notes retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve notes');
  }
}

// POST /api/therapy/notes - Create therapy note
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 10, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(createNoteSchema, body) as any;
    
    // Verify consent for client
    const hasConsent = await verifyClientConsent((session as any).user.id, data.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to create notes for this client');
    }
    
    // Check for high-risk indicators
    if (data.content.riskFactors) {
      const risks = data.content.riskFactors;
      const hasHighRisk = risks.suicidalIdeation?.present || 
                          risks.homicidalIdeation?.present ||
                          risks.selfHarm?.present;
      
      if (hasHighRisk) {
        // Create safety alert
        const indicators = [];
        if (risks.suicidalIdeation?.present) {
          indicators.push('suicidal_ideation');
          if (risks.suicidalIdeation.plan) indicators.push('suicide_plan');
          if (risks.suicidalIdeation.means) indicators.push('suicide_means');
          if (risks.suicidalIdeation.intent) indicators.push('suicide_intent');
        }
        if (risks.homicidalIdeation?.present) {
          indicators.push('homicidal_ideation');
          if (risks.homicidalIdeation.plan) indicators.push('homicide_plan');
        }
        if (risks.selfHarm?.present) {
          indicators.push('self_harm');
        }
        
        await (prisma.safetyAlert as any).create({
          data: {
            id: generatePrismaCreateFields().id,
            type: 'high_risk_assessment',
            severity: 'critical',
            userId: data.clientId,
            context: 'therapy_note',
            indicators,
            handled: false,
            actions: [],
            notes: `Documented in therapy note by ${(session as any).user.id}`,
          },
        });
        
        // Create crisis report if needed
        if (risks.suicidalIdeation?.intent || risks.homicidalIdeation?.plan) {
          await (prisma.crisisReport as any).create({
            data: {
              id: generatePrismaCreateFields().id,
              userId: data.clientId,
              severityLevel: 5, // Maximum severity
              triggerType: 'therapy_assessment',
              interventionType: 'therapist_alert',
              encryptedDetails: encryptJSON({
                userId: (session as any).user.id,
                noteType: data.noteType,
                riskFactors: risks,
              }),
              responseTime: 0,
              resolved: false,
            },
          });
        }
      }
    }
    
    // Encrypt content
    const encryptedContent = encryptJSON(data.content);
    const encryptedMetadata = encryptJSON({
      userId: (session as any).user.id,
      sessionId: data.sessionId,
      noteType: data.noteType,
      attachments: data.attachments,
      isLocked: data.isLocked,
      lockedAt: data.isLocked ? new Date().toISOString() : null,
      lockedBy: data.isLocked ? (session as any).user.id : null,
      version: 1,
    });
    
    // Create note (using JournalEntry for secure encrypted storage)
    const note = await (prisma.journalEntry as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: data.clientId,
        encryptedTitle: encrypt(`${data.noteType} Note - ${new Date().toLocaleDateString()}`),
        encryptedContent,
        encryptedTags: encryptedMetadata,
        isPrivate: true, // Always private for therapy notes
      },
    });
    
    // Audit log with HIPAA compliance
    await (auditLog as any)(
      (session as any).user.id,
      'create_note',
      'therapy_notes',
      note.id,
      {
        clientId: data.clientId,
        noteType: data.noteType,
        sessionId: data.sessionId,
        hasRiskFactors: !!data.content.riskFactors,
        isLocked: data.isLocked,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        noteId: note.id,
        clientId: data.clientId,
        noteType: data.noteType,
        isLocked: data.isLocked,
        createdAt: note.createdAt,
      },
      'Note created successfully',
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create note');
  }
}

// PUT /api/therapy/notes - Update therapy note
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 15, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(updateNoteSchema, body) as any;
    
    // Get existing note
    const existingNote = await prisma.journalEntry.findUnique({
      where: { id: data.noteId },
    });
    
    if (!existingNote) {
      return errorResponse(null, 'Note not found');
    }
    
    // Verify consent
    const hasConsent = await verifyClientConsent((session as any).user.id, existingNote.userId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to update this note');
    }
    
    // Decrypt existing metadata
    const metadata = existingNote.encryptedTags 
      ? decryptJSON(existingNote.encryptedTags as string)
      : {};
    
    // Check if note is locked
    if (metadata.isLocked) {
      // Only allow addendums for locked notes
      if (!data.addendum) {
        return errorResponse(null, 'Note is locked. Only addendums can be added.');
      }
      
      // Add addendum
      const addendums = metadata.addendums || [];
      addendums.push({
        content: data.addendum,
        createdBy: (session as any).user.id,
        createdAt: new Date().toISOString(),
      });
      
      metadata.addendums = addendums;
      
      // Update only metadata
      await prisma.journalEntry.update({
        where: { id: data.noteId },
        data: {
          encryptedTags: encryptJSON(metadata),
          updatedAt: new Date(),
        },
      });
      
      // Audit log
      await (auditLog as any)(
        (session as any).user.id,
        'add_note_addendum',
        'therapy_notes',
        data.noteId,
        {
          clientId: existingNote.userId,
          addendumLength: data.addendum.length,
        },
        'success',
        req
      );
      
      return successResponse(
        {
          noteId: data.noteId,
          addendumAdded: true,
          updatedAt: new Date(),
        },
        'Addendum added successfully'
      );
    }
    
    // Update unlocked note
    const existingContent = decryptJSON(existingNote.encryptedContent);
    const updatedContent = {
      ...existingContent,
      ...data.content,
      lastModifiedBy: (session as any).user.id,
      lastModifiedAt: new Date().toISOString(),
    };
    
    // Update version tracking
    metadata.version = (metadata.version || 1) + 1;
    metadata.lastModifiedBy = (session as any).user.id;
    metadata.lastModifiedAt = new Date().toISOString();
    
    // Store previous version for audit trail
    if (!metadata.previousVersions) {
      metadata.previousVersions = [];
    }
    metadata.previousVersions.push({
      version: metadata.version - 1,
      content: maskSensitiveData(JSON.stringify(existingContent)),
      modifiedBy: metadata.lastModifiedBy,
      modifiedAt: metadata.lastModifiedAt,
    });
    
    // Update note
    const updatedNote = await prisma.journalEntry.update({
      where: { id: data.noteId },
      data: {
        encryptedContent: encryptJSON(updatedContent),
        encryptedTags: encryptJSON(metadata),
        updatedAt: new Date(),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'update_note',
      'therapy_notes',
      data.noteId,
      {
        clientId: existingNote.userId,
        version: metadata.version,
        fieldsUpdated: Object.keys(data.content || {}),
      },
      'success',
      req
    );
    
    return successResponse(
      {
        noteId: updatedNote.id,
        version: metadata.version,
        updatedAt: updatedNote.updatedAt,
      },
      'Note updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update note');
  }
}

// DELETE /api/therapy/notes - Soft delete therapy note
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 5, identifier);
    
    // Authentication & Authorization - Only admins can delete
    const session = await requireRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Get note ID from query params
    const noteId = req.nextUrl.searchParams.get('noteId');
    const reason = req.nextUrl.searchParams.get('reason');
    
    if (!noteId || !reason) {
      return errorResponse(null, 'Note ID and reason are required');
    }
    
    // Get existing note
    const existingNote = await prisma.journalEntry.findUnique({
      where: { id: noteId },
    });
    
    if (!existingNote) {
      return errorResponse(null, 'Note not found');
    }
    
    // Decrypt metadata
    const metadata = existingNote.encryptedTags
      ? decryptJSON(existingNote.encryptedTags as string)
      : {};
    
    // Mark as deleted (soft delete for compliance)
    metadata.isDeleted = true;
    metadata.deletedBy = (session as any).user.id;
    metadata.deletedAt = new Date().toISOString();
    metadata.deletionReason = reason;
    
    // Update note
    await prisma.journalEntry.update({
      where: { id: noteId },
      data: {
        encryptedTags: encryptJSON(metadata),
        isPrivate: true, // Ensure it remains private
        updatedAt: new Date(),
      },
    });
    
    // Comprehensive audit log for compliance
    await (auditLog as any)(
      (session as any).user.id,
      'delete_note',
      'therapy_notes',
      noteId,
      {
        clientId: existingNote.userId,
        therapistId: metadata.therapistId,
        noteType: metadata.noteType,
        reason,
        deletionType: 'soft_delete',
      },
      'success',
      req
    );
    
    return successResponse(
      {
        noteId,
        deletedAt: new Date(),
        deletionType: 'soft_delete',
      },
      'Note deleted successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to delete note');
  }
}