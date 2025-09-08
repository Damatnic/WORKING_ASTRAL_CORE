import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption';
import { z } from 'zod';

// Validation schema for client data
const ClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  dateOfBirth: z.string(),
  gender: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string()
  }),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string()
  }),
  primaryDiagnosis: z.string().optional(),
  treatmentModality: z.string().optional(),
  sessionFrequency: z.string().optional(),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    copay: z.number(),
    deductible: z.number()
  }).optional()
});

// GET /api/therapist/clients - Get all clients for the therapist
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      therapistId: user.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (riskLevel) {
      where.riskLevel = riskLevel.toUpperCase();
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { clientNumber: { contains: search, mode: 'insensitive' } },
        { primaryDiagnosis: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get clients with pagination
    const [clients, total] = await Promise.all([
      prisma.therapistClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          sessions: {
            where: {
              status: 'SCHEDULED',
              scheduledTime: { gte: new Date() }
            },
            orderBy: { scheduledTime: 'asc' },
            take: 1
          },
          clinicalNotes: {
            orderBy: { date: 'desc' },
            take: 1
          },
          assessments: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      }),
      prisma.therapistClient.count({ where })
    ]);

    // Decrypt sensitive fields for each client
    const decryptedClients = clients.map(client => {
      const decrypted = { ...client };
      
      // Decrypt encrypted fields if they exist
      if (client.addressEncrypted) {
        try {
          (decrypted as any).address = decryptApiField(client.addressEncrypted as any);
        } catch (error) {
          console.error('Failed to decrypt address:', error);
          (decrypted as any).address = null;
        }
      }

      if (client.emergencyContactEncrypted) {
        try {
          (decrypted as any).emergencyContact = decryptApiField(client.emergencyContactEncrypted as any);
        } catch (error) {
          console.error('Failed to decrypt emergency contact:', error);
          (decrypted as any).emergencyContact = null;
        }
      }

      if (client.treatmentGoalsEncrypted) {
        try {
          (decrypted as any).treatmentGoals = decryptApiField(client.treatmentGoalsEncrypted as any);
        } catch (error) {
          (decrypted as any).treatmentGoals = [];
        }
      }

      if (client.medicationsEncrypted) {
        try {
          (decrypted as any).medications = decryptApiField(client.medicationsEncrypted as any);
        } catch (error) {
          (decrypted as any).medications = [];
        }
      }

      if (client.insuranceInfoEncrypted) {
        try {
          (decrypted as any).insuranceInfo = decryptApiField(client.insuranceInfoEncrypted as any);
        } catch (error) {
          (decrypted as any).insuranceInfo = null;
        }
      }

      // Remove encrypted fields from response
      delete (decrypted as any).addressEncrypted;
      delete (decrypted as any).emergencyContactEncrypted;
      delete (decrypted as any).treatmentGoalsEncrypted;
      delete (decrypted as any).medicationsEncrypted;
      delete (decrypted as any).insuranceInfoEncrypted;

      // Add next session info
      (decrypted as any).nextSession = client.sessions[0] || null;

      return decrypted;
    });

    return NextResponse.json({
      clients: decryptedClients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/therapist/clients - Create a new client
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
    const validatedData = ClientSchema.parse(body);

    // Generate unique client number
    const clientCount = await prisma.therapistClient.count({
      where: { therapistId: user.id }
    });
    const clientNumber = `CL-${new Date().getFullYear()}-${String(clientCount + 1).padStart(4, '0')}`;

    // Encrypt sensitive data
    const encryptedData = {
      addressEncrypted: encryptApiField(validatedData.address),
      emergencyContactEncrypted: encryptApiField(validatedData.emergencyContact),
      treatmentGoalsEncrypted: encryptApiField(body.treatmentGoals || []),
      medicationsEncrypted: encryptApiField(body.medications || []),
      insuranceInfoEncrypted: validatedData.insuranceInfo ? 
        encryptApiField(validatedData.insuranceInfo) : null
    };

    // Create the client
    const client = await (prisma.therapistClient as any).create({
        data: {
          id: generatePrismaCreateFields().id,therapistId: user.id,
        clientNumber,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        gender: validatedData.gender,
        ...encryptedData,
        primaryDiagnosis: validatedData.primaryDiagnosis,
        treatmentModality: validatedData.treatmentModality,
        sessionFrequency: validatedData.sessionFrequency,
        secondaryDiagnoses: body.secondaryDiagnoses || [],
        allergies: body.allergies || [],
        intakeDate: new Date(),
        status: 'INTAKE',
        riskLevel: body.riskLevel || 'LOW'
      }
    });

    // Log the action for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id ,
        action: 'CREATE_CLIENT',
        resource: 'TherapistClient',
        resourceId: client.id,
        outcome: 'success',
        details: {
          clientNumber: client.clientNumber,
          therapistId: user.id
        }
      }
    });

    // Return sanitized client data
    const response = {
      ...client,
      address: validatedData.address,
      emergencyContact: validatedData.emergencyContact,
      treatmentGoals: body.treatmentGoals || [],
      medications: body.medications || [],
      insuranceInfo: validatedData.insuranceInfo
    };

    // Remove encrypted fields
    delete (response as any).addressEncrypted;
    delete (response as any).emergencyContactEncrypted;
    delete (response as any).treatmentGoalsEncrypted;
    delete (response as any).medicationsEncrypted;
    delete (response as any).insuranceInfoEncrypted;

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}