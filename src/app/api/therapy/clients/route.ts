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
  addSecurityHeaders,
} from '@/lib/api-middleware';
import { encrypt, decrypt, encryptJSON, decryptJSON } from '@/lib/encryption';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Validation schemas
const getClientsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  sortBy: z.enum(['name', 'lastSession', 'createdAt']).default('lastSession'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createClientSchema = z.object({
  userId: z.string().uuid(),
  intakeNotes: z.string().optional(),
  diagnoses: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    prescribedBy: z.string(),
    startDate: z.string(),
  })).optional(),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    copay: z.number().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  }),
  consentForms: z.array(z.object({
    type: z.string(),
    signedAt: z.string(),
    expiresAt: z.string().optional(),
  })).optional(),
});

const updateClientSchema = createClientSchema.partial().extend({
  clientId: z.string().uuid(),
});

// GET /api/therapy/clients - Get therapist's clients
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 30, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params = validateInput(getClientsSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });
    
    // Build query filters
    const where: any = {
      helperId: (session as any).user.id,
      sessionType: 'therapy',
    };
    
    if (params.status) {
      where.status = params.status;
    }
    
    if (params.search) {
      where.OR = [
        {
          User_SupportSession_userIdToUser: {
            firstName: { contains: params.search, mode: 'insensitive' },
          },
        },
        {
          User_SupportSession_userIdToUser: {
            lastName: { contains: params.search, mode: 'insensitive' },
          },
        },
        {
          User_SupportSession_userIdToUser: {
            email: { contains: params.search, mode: 'insensitive' },
          },
        },
      ];
    }
    
    // Get total count
    const total = await prisma.supportSession.count({ where });
    
    // Get clients with pagination
    const sessions = await prisma.supportSession.findMany({
      where,
      include: {
        User_SupportSession_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            lastActiveAt: true,
            UserProfile: {
              select: {
                mentalHealthGoals: true,
                interestedTopics: true,
                wellnessScore: true,
                lastAssessmentAt: true,
              },
            },
            MoodEntry: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                moodScore: true,
                anxietyLevel: true,
                energyLevel: true,
                createdAt: true,
              },
            },
            Appointment: {
              where: {
                professionalId: (session as any).user.id,
                status: 'scheduled',
              },
              orderBy: { scheduledAt: 'asc' },
              take: 1,
              select: {
                scheduledAt: true,
                duration: true,
                type: true,
              },
            },
          },
        },
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: params.sortBy === 'name'
        ? { User_SupportSession_userIdToUser: { firstName: params.sortOrder } }
        : params.sortBy === 'lastSession'
        ? { endedAt: params.sortOrder }
        : { createdAt: params.sortOrder },
    });
    
    // Decrypt notes for active sessions
    const clients = sessions.map(session => {
      const client = (session as any).User_SupportSession_userIdToUser;
      let decryptedNotes = null;
      
      if (session.encryptedNotes) {
        try {
          decryptedNotes = decryptJSON(session.encryptedNotes as string);
        } catch (error) {
          console.error('Failed to decrypt notes:', error);
        }
      }
      
      return {
        id: session.id,
        clientId: client?.id,
        name: `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Anonymous',
        email: client?.email,
        avatarUrl: client?.avatarUrl,
        status: session.status,
        lastSession: session.endedAt,
        sessionsCount: 1, // TODO: Calculate actual count
        notes: decryptedNotes,
        mentalHealthGoals: client?.UserProfile?.mentalHealthGoals,
        wellnessScore: client?.UserProfile?.wellnessScore,
        lastMood: client?.MoodEntry?.[0],
        nextAppointment: client?.Appointment?.[0],
        createdAt: session.createdAt,
      };
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_clients',
      'therapy_clients',
      undefined,
      { count: clients.length, page: params.page },
      'success',
      req
    );
    
    return paginatedResponse(
      clients,
      total,
      params.page,
      params.limit,
      'Clients retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve clients');
  }
}

// POST /api/therapy/clients - Add new client
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
    const data = validateInput(createClientSchema, body);
    
    // Check if client user exists
    const clientUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    
    if (!clientUser) {
      return errorResponse(null, 'Client user not found');
    }
    
    // Check for existing active session
    const existingSession = await prisma.supportSession.findFirst({
      where: {
        userId: data.userId,
        helperId: (session as any).user.id,
        status: 'active',
      },
    });
    
    if (existingSession) {
      return errorResponse(null, 'Active session already exists with this client');
    }
    
    // Encrypt sensitive data
    const encryptedNotes = data.intakeNotes 
      ? encryptJSON({
          intakeNotes: data.intakeNotes,
          diagnoses: data.diagnoses,
          medications: data.medications,
          insuranceInfo: data.insuranceInfo,
          emergencyContact: data.emergencyContact,
          consentForms: data.consentForms,
          createdBy: (session as any).user.id,
          createdAt: new Date().toISOString(),
        })
      : null;
    
    // Create therapy session
    const newSession = await (prisma.supportSession as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: data.userId,
        helperId: (session as any).user.id,
        sessionType: 'therapy',
        status: 'active',
        encryptedNotes,
        startedAt: new Date(),
      },
      include: {
        User_SupportSession_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    
    // Create notification for client
    await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: data.userId,
        type: 'therapy_started',
        title: 'Therapy Session Started',
        message: 'You have been connected with a therapist',
        isPriority: false,
        metadata: {
          therapistId: (session as any).user.id,
          sessionId: newSession.id,
        },
      },
    });
    
    // Audit log with HIPAA compliance
    await (auditLog as any)(
      (session as any).user.id,
      'create_client',
      'therapy_clients',
      newSession.id,
      {
        clientId: data.userId,
        sessionType: 'therapy',
        hasConsent: !!data.consentForms?.length,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        sessionId: newSession.id,
        clientId: data.userId,
        clientName: `${(newSession as any).User_SupportSession_userIdToUser?.firstName || ''} ${(newSession as any).User_SupportSession_userIdToUser?.lastName || ''}`.trim(),
        status: newSession.status,
        createdAt: newSession.createdAt,
      },
      'Client added successfully',
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to add client');
  }
}

// PUT /api/therapy/clients - Update client information
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 20, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Parse and validate request body
    const body = await (req as any).json();
    const data = validateInput(updateClientSchema, body);
    
    // Verify therapist has access to this client
    const hasConsent = await verifyClientConsent((session as any).user.id, data.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to access this client');
    }
    
    // Get existing session
    const existingSession = await prisma.supportSession.findFirst({
      where: {
        userId: data.clientId,
        helperId: (session as any).user.id,
        status: 'active',
      },
    });
    
    if (!existingSession) {
      return errorResponse(null, 'No active session with this client');
    }
    
    // Decrypt existing notes
    let existingNotes = {};
    if (existingSession.encryptedNotes) {
      try {
        existingNotes = decryptJSON(existingSession.encryptedNotes as string);
      } catch (error) {
        console.error('Failed to decrypt existing notes:', error);
      }
    }
    
    // Merge and encrypt updated notes
    const updatedNotes = {
      ...existingNotes,
      ...data,
      lastUpdatedBy: (session as any).user.id,
      lastUpdatedAt: new Date().toISOString(),
    };
    
    const encryptedNotes = encryptJSON(updatedNotes);
    
    // Update session
    const updatedSession = await prisma.supportSession.update({
      where: { id: existingSession.id },
      data: { encryptedNotes },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'update_client',
      'therapy_clients',
      existingSession.id,
      {
        clientId: data.clientId,
        fieldsUpdated: Object.keys(data).filter(k => k !== 'clientId'),
      },
      'success',
      req
    );
    
    return successResponse(
      {
        sessionId: updatedSession.id,
        clientId: data.clientId,
        updatedAt: new Date(),
      },
      'Client information updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update client information');
  }
}

// DELETE /api/therapy/clients - Archive/remove client
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 5, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Get client ID from query params
    const clientId = req.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return errorResponse(null, 'Client ID is required');
    }
    
    // Verify therapist has access to this client
    const hasConsent = await verifyClientConsent((session as any).user.id, clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to access this client');
    }
    
    // Archive the session (don't delete for compliance)
    const archivedSession = await prisma.supportSession.updateMany({
      where: {
        userId: clientId,
        helperId: (session as any).user.id,
        status: 'active',
      },
      data: {
        status: 'archived',
        endedAt: new Date(),
      },
    });
    
    if (archivedSession.count === 0) {
      return errorResponse(null, 'No active session found with this client');
    }
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'archive_client',
      'therapy_clients',
      clientId,
      {
        reason: 'therapist_initiated',
        timestamp: new Date().toISOString(),
      },
      'success',
      req
    );
    
    return successResponse(
      {
        clientId,
        archivedAt: new Date(),
      },
      'Client archived successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to archive client');
  }
}