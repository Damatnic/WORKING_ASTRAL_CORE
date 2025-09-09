import { z, ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schema for client updates
const ClientUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string()
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string()
  }).optional(),
  primaryDiagnosis: z.string().optional(),
  secondaryDiagnoses: z.array(z.string()).optional(),
  treatmentModality: z.string().optional(),
  sessionFrequency: z.string().optional(),
  status: z.enum(['INTAKE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'TERMINATED', 'NO_SHOW']).optional(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRISIS']).optional(),
  progress: z.number().min(0).max(100).optional(),
  treatmentGoals: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    prescriber: z.string()
  })).optional(),
  allergies: z.array(z.string()).optional(),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    copay: z.number(),
    deductible: z.number(),
    authorizationRequired: z.boolean().optional(),
    sessionsAuthorized: z.number().optional(),
    authorizationExpires: z.string().optional()
  }).optional()
});

// GET /api/therapist/clients/[clientId] - Get a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
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

    // Get the client with all related data
    const client = await prisma.therapistClient.findFirst({
      where: {
        id: params.clientId,
        therapistId: user.id
      },
      include: {
        sessions: {
          orderBy: { scheduledTime: 'desc' },
          take: 10
        },
        clinicalNotes: {
          orderBy: { date: 'desc' },
          take: 5
        },
        assessments: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Decrypt sensitive fields
    const decryptedClient = { ...client };
    
    if (client.addressEncrypted) {
      try {
        (decryptedClient as any).address = decryptApiField(client.addressEncrypted as any);
      } catch (error) {
        console.error('Failed to decrypt address:', error);
        (decryptedClient as any).address = null;
      }
    }

    if (client.emergencyContactEncrypted) {
      try {
        (decryptedClient as any).emergencyContact = decryptApiField(client.emergencyContactEncrypted as any);
      } catch (error) {
        console.error('Failed to decrypt emergency contact:', error);
        (decryptedClient as any).emergencyContact = null;
      }
    }

    if (client.treatmentGoalsEncrypted) {
      try {
        (decryptedClient as any).treatmentGoals = decryptApiField(client.treatmentGoalsEncrypted as any);
      } catch (error) {
        (decryptedClient as any).treatmentGoals = [];
      }
    }

    if (client.medicationsEncrypted) {
      try {
        (decryptedClient as any).medications = decryptApiField(client.medicationsEncrypted as any);
      } catch (error) {
        (decryptedClient as any).medications = [];
      }
    }

    if (client.insuranceInfoEncrypted) {
      try {
        (decryptedClient as any).insuranceInfo = decryptApiField(client.insuranceInfoEncrypted as any);
      } catch (error) {
        (decryptedClient as any).insuranceInfo = null;
      }
    }

    // Decrypt clinical notes
    decryptedClient.clinicalNotes = client.clinicalNotes.map(note => {
      const decryptedNote = { ...note };
      if (note.contentEncrypted) {
        try {
          (decryptedNote as any).content = decryptApiField(note.contentEncrypted as any);
        } catch (error) {
          (decryptedNote as any).content = '[Unable to decrypt]';
        }
      }
      delete (decryptedNote as any).contentEncrypted;
      return decryptedNote;
    });

    // Decrypt assessments
    decryptedClient.assessments = client.assessments.map(assessment => {
      const decryptedAssessment = { ...assessment };
      if (assessment.scoreEncrypted) {
        try {
          (decryptedAssessment as any).score = decryptApiField(assessment.scoreEncrypted as any);
        } catch (error) {
          (decryptedAssessment as any).score = null;
        }
      }
      if (assessment.interpretationEncrypted) {
        try {
          (decryptedAssessment as any).interpretation = decryptApiField(assessment.interpretationEncrypted as any);
        } catch (error) {
          (decryptedAssessment as any).interpretation = '[Unable to decrypt]';
        }
      }
      delete (decryptedAssessment as any).scoreEncrypted;
      delete (decryptedAssessment as any).interpretationEncrypted;
      return decryptedAssessment;
    });

    // Remove encrypted fields from response
    delete (decryptedClient as any).addressEncrypted;
    delete (decryptedClient as any).emergencyContactEncrypted;
    delete (decryptedClient as any).treatmentGoalsEncrypted;
    delete (decryptedClient as any).medicationsEncrypted;
    delete (decryptedClient as any).insuranceInfoEncrypted;

    // Log access for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
        action: 'VIEW_CLIENT',
        resource: 'TherapistClient',
        resourceId: client.id,
        outcome: 'SUCCESS'
      }
    });

    return NextResponse.json(decryptedClient, { status: 200 });

  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/therapist/clients/[clientId] - Update a client
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
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

    // Verify client belongs to therapist
    const existingClient = await prisma.therapistClient.findFirst({
      where: {
        id: params.clientId,
        therapistId: user.id
      }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = ClientUpdateSchema.parse(body);

    // Prepare update data
    const updateData: any = {};

    // Handle non-encrypted fields
    if (validatedData.firstName) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName) updateData.lastName = validatedData.lastName;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.phone) updateData.phone = validatedData.phone;
    if (validatedData.dateOfBirth) updateData.dateOfBirth = new Date(validatedData.dateOfBirth);
    if (validatedData.gender) updateData.gender = validatedData.gender;
    if (validatedData.primaryDiagnosis !== undefined) updateData.primaryDiagnosis = validatedData.primaryDiagnosis;
    if (validatedData.secondaryDiagnoses) updateData.secondaryDiagnoses = validatedData.secondaryDiagnoses;
    if (validatedData.treatmentModality) updateData.treatmentModality = validatedData.treatmentModality;
    if (validatedData.sessionFrequency) updateData.sessionFrequency = validatedData.sessionFrequency;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.riskLevel) updateData.riskLevel = validatedData.riskLevel;
    if (validatedData.progress !== undefined) updateData.progress = validatedData.progress;
    if (validatedData.allergies) updateData.allergies = validatedData.allergies;

    // Handle encrypted fields
    if (validatedData.address) {
      updateData.addressEncrypted = encryptApiField(validatedData.address);
    }
    if (validatedData.emergencyContact) {
      updateData.emergencyContactEncrypted = encryptApiField(validatedData.emergencyContact);
    }
    if (validatedData.treatmentGoals) {
      updateData.treatmentGoalsEncrypted = encryptApiField(validatedData.treatmentGoals);
    }
    if (validatedData.medications) {
      updateData.medicationsEncrypted = encryptApiField(validatedData.medications);
    }
    if (validatedData.insuranceInfo) {
      updateData.insuranceInfoEncrypted = encryptApiField(validatedData.insuranceInfo);
    }

    // Update the client
    const updatedClient = await prisma.therapistClient.update({
      where: { id: params.clientId },
      data: updateData
    });

    // Log the update for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
        action: 'UPDATE_CLIENT',
        resource: 'TherapistClient',
        resourceId: updatedClient.id,
        outcome: 'SUCCESS',
        details: {
          fieldsUpdated: Object.keys(updateData)
        }
      }
    });

    // Return updated client (without encrypted fields)
    const response = { ...updatedClient };
    delete (response as any).addressEncrypted;
    delete (response as any).emergencyContactEncrypted;
    delete (response as any).treatmentGoalsEncrypted;
    delete (response as any).medicationsEncrypted;
    delete (response as any).insuranceInfoEncrypted;

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: (error as ZodError).issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/therapist/clients/[clientId] - Delete a client (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
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

    // Verify client belongs to therapist
    const existingClient = await prisma.therapistClient.findFirst({
      where: {
        id: params.clientId,
        therapistId: user.id
      }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Soft delete by changing status
    await prisma.therapistClient.update({
      where: { id: params.clientId },
      data: { status: 'TERMINATED' }
    });

    // Log the deletion for audit trail
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
        action: 'DELETE_CLIENT',
        resource: 'TherapistClient',
        resourceId: params.clientId,
        outcome: 'SUCCESS'
      }
    });

    return NextResponse.json({ message: 'Client terminated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}