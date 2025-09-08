import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption';
import { z } from 'zod';

// Validation schema for session notes
const SessionNoteSchema = z.object({
  clientId: z.string(),
  sessionId: z.string().optional(),
  sessionDate: z.string(),
  sessionType: z.string(),
  sessionDuration: z.number(),
  treatmentModality: z.string(),
  sessionGoals: z.array(z.string()),
  progressNotes: z.string(),
  interventions: z.array(z.string()),
  clientResponse: z.string(),
  homework: z.array(z.string()).optional(),
  nextSessionPlan: z.string().optional(),
  riskAssessment: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRISIS']),
  confidentialityNotes: z.string().optional(),
  supervisorReview: z.boolean().optional(),
  billable: z.boolean(),
  insuranceCode: z.string().optional(),
  isTemplate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    data: z.string() // base64 encoded
  })).optional()
});

// GET /api/therapist/session-notes - Get session notes for the therapist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and verify they are a therapist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden - Therapist access only' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const sessionType = searchParams.get('sessionType');
    const treatmentModality = searchParams.get('treatmentModality');
    const riskLevel = searchParams.get('riskLevel');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supervisorReview = searchParams.get('supervisorReview');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      therapistId: user.id
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (sessionType) {
      where.sessionType = sessionType;
    }

    if (treatmentModality) {
      where.treatmentModality = treatmentModality;
    }

    if (riskLevel) {
      where.riskAssessment = riskLevel.toUpperCase();
    }

    if (supervisorReview !== null) {
      where.supervisorReview = supervisorReview === 'true';
    }

    if (startDate && endDate) {
      where.sessionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      where.sessionDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.sessionDate = { lte: new Date(endDate) };
    }

    if (search) {
      where.OR = [
        { tags: { hasSome: [search] } }
      ];
    }

    // Get session notes with pagination
    const [notes, total] = await Promise.all([
      prisma.therapySessionNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sessionDate: 'desc' },
        include: {
          session: {
            include: {
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  clientNumber: true
                }
              }
            }
          }
        }
      }),
      prisma.therapySessionNote.count({ where })
    ]);

    // Decrypt sensitive fields for each note
    const decryptedNotes = notes.map(note => {
      const decrypted: any = {
        id: note.id,
        sessionId: note.sessionId,
        therapistId: note.therapistId,
        clientId: note.clientId,
        sessionDate: note.sessionDate,
        sessionType: note.sessionType,
        sessionDuration: note.sessionDuration,
        treatmentModality: note.treatmentModality,
        riskAssessment: note.riskAssessment,
        supervisorReview: note.supervisorReview,
        supervisorId: note.supervisorId,
        billable: note.billable,
        insuranceCode: note.insuranceCode,
        isTemplate: note.isTemplate,
        tags: note.tags,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        lastModified: note.lastModified,
        client: note.session?.client
      };

      // Decrypt encrypted fields
      try {
        if (note.sessionGoalsEncrypted) {
          decrypted.sessionGoals = decryptApiField(note.sessionGoalsEncrypted as any);
        }
        if (note.progressNotesEncrypted) {
          decrypted.progressNotes = decryptApiField(note.progressNotesEncrypted as any);
        }
        if (note.interventionsEncrypted) {
          decrypted.interventions = decryptApiField(note.interventionsEncrypted as any);
        }
        if (note.clientResponseEncrypted) {
          decrypted.clientResponse = decryptApiField(note.clientResponseEncrypted as any);
        }
        if (note.homeworkEncrypted) {
          decrypted.homework = decryptApiField(note.homeworkEncrypted as any);
        }
        if (note.nextSessionPlanEncrypted) {
          decrypted.nextSessionPlan = decryptApiField(note.nextSessionPlanEncrypted as any);
        }
        if (note.confidentialityNotesEncrypted) {
          decrypted.confidentialityNotes = decryptApiField(note.confidentialityNotesEncrypted as any);
        }
        if (note.attachmentsEncrypted) {
          decrypted.attachments = decryptApiField(note.attachmentsEncrypted as any);
        }
      } catch (error) {
        console.error('Failed to decrypt session note fields:', error);
      }

      return decrypted;
    });

    return NextResponse.json({
      notes: decryptedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching session notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session notes' },
      { status: 500 }
    );
  }
}

// POST /api/therapist/session-notes - Create a new session note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and verify they are a therapist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden - Therapist access only' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = SessionNoteSchema.parse(body);

    // Verify client belongs to therapist
    const client = await prisma.therapistClient.findFirst({
      where: {
        id: validatedData.clientId,
        therapistId: user.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Encrypt sensitive data
    const encryptedData = {
      sessionGoalsEncrypted: encryptApiField(validatedData.sessionGoals),
      progressNotesEncrypted: encryptApiField(validatedData.progressNotes),
      interventionsEncrypted: encryptApiField(validatedData.interventions),
      clientResponseEncrypted: encryptApiField(validatedData.clientResponse),
      homeworkEncrypted: validatedData.homework ? 
        encryptApiField(validatedData.homework) : null,
      nextSessionPlanEncrypted: validatedData.nextSessionPlan ? 
        encryptApiField(validatedData.nextSessionPlan) : null,
      confidentialityNotesEncrypted: validatedData.confidentialityNotes ? 
        encryptApiField(validatedData.confidentialityNotes) : null,
      attachmentsEncrypted: validatedData.attachments ? 
        encryptApiField(validatedData.attachments) : null
    };

    // Create the session note
    const sessionNote = await (prisma.therapySessionNote as any).create({
        data: {
          id: generatePrismaCreateFields().id,sessionId: validatedData.sessionId,
        therapistId: user.id,
        clientId: validatedData.clientId,
        sessionDate: new Date(validatedData.sessionDate),
        sessionType: validatedData.sessionType,
        sessionDuration: validatedData.sessionDuration,
        treatmentModality: validatedData.treatmentModality,
        ...encryptedData,
        riskAssessment: validatedData.riskAssessment as any,
        supervisorReview: validatedData.supervisorReview || false,
        billable: validatedData.billable,
        insuranceCode: validatedData.insuranceCode,
        isTemplate: validatedData.isTemplate || false,
        tags: validatedData.tags || []
      }
    });

    // Update client's last session date and session count
    await prisma.therapistClient.update({
      where: { id: validatedData.clientId },
      data: {
        lastSessionDate: new Date(validatedData.sessionDate),
        completedSessions: { increment: 1 }
      }
    });

    // Log the action for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
        action: 'CREATE_SESSION_NOTE',
        resource: 'TherapySessionNote',
        resourceId: sessionNote.id,
        outcome: 'SUCCESS',
        details: {
          clientId: validatedData.clientId,
          sessionDate: validatedData.sessionDate
        }
      }
    });

    // Return created note (without encrypted fields)
    const response = {
      id: sessionNote.id,
      ...validatedData,
      therapistId: user.id,
      createdAt: sessionNote.createdAt,
      updatedAt: sessionNote.updatedAt,
      lastModified: sessionNote.lastModified
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating session note:', error);
    return NextResponse.json(
      { error: 'Failed to create session note' },
      { status: 500 }
    );
  }
}