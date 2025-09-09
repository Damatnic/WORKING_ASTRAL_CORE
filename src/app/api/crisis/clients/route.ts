import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Schema for crisis client data
const CrisisClientSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(1).max(120),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  location: z.string().optional(),
  riskLevel: z.enum(['low', 'moderate', 'high', 'imminent']),
  primaryConcern: z.enum(['suicidal_ideation', 'self_harm', 'substance_abuse', 'domestic_violence', 'panic_attack', 'psychosis', 'other']),
  status: z.enum(['active', 'stable', 'referred', 'closed']),
  assignedCounselor: z.string().min(1),
  notes: z.string().optional(),
  isMinor: z.boolean(),
  guardianInfo: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
    notified: z.boolean(),
    consentGiven: z.boolean()
  }).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    isPrimary: z.boolean(),
    canContact: z.boolean()
  })).optional(),
  safetyPlan: z.object({
    warningSigns: z.array(z.string()),
    copingStrategies: z.array(z.string()),
    socialSupports: z.array(z.string()),
    professionalSupports: z.array(z.string()),
    environmentalSafety: z.array(z.string()),
    crisisContacts: z.array(z.string())
  }).optional()
});

// GET /api/crisis/clients - Get all crisis clients with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    // Check if user is authenticated and has crisis counselor role
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, id: true }
    });

    if (!user || !['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'THERAPIST'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const riskLevel = searchParams.get('riskLevel');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filtering
    const where: any = {};
    
    if (riskLevel) {
      where.metadata = {
        path: ['riskLevel'],
        equals: riskLevel
      };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { metadata: { path: ['name'], string_contains: search } },
        { metadata: { path: ['phone'], string_contains: search } },
        { metadata: { path: ['primaryConcern'], string_contains: search } }
      ];
    }

    // Fetch crisis reports (using CrisisReport as a proxy for crisis clients)
    const crisisReports = await prisma.crisisReport.findMany({
      where: {
        ...where,
        resolved: status === 'closed' ? true : status === 'active' ? false : undefined
      },
      include: {
        User: {
          select: {
            id: true,
            anonymousId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    // Transform data to match expected format
    const clients = crisisReports.map(report => {
      const metadata = report.encryptedDetails as any || {};
      
      return {
        id: report.id,
        name: report.User?.firstName && report.User?.lastName 
          ? `${report.User.firstName} ${report.User.lastName}`
          : `Client ${report.User?.anonymousId?.substring(0, 8) || 'Anonymous'}`,
        age: metadata.age || 0,
        phone: report.User?.phoneNumber || 'Not provided',
        email: report.User?.email,
        location: metadata.location,
        riskLevel: metadata.riskLevel || (report.severityLevel >= 8 ? 'imminent' : 
                                          report.severityLevel >= 6 ? 'high' :
                                          report.severityLevel >= 4 ? 'moderate' : 'low'),
        primaryConcern: metadata.primaryConcern || report.triggerType,
        lastContact: report.createdAt,
        nextFollowUp: metadata.nextFollowUp,
        status: report.resolved ? 'closed' : 
                metadata.status || 'active',
        assignedCounselor: metadata.assignedCounselor || 'Unassigned',
        emergencyContacts: metadata.emergencyContacts || [],
        safetyPlan: metadata.safetyPlan,
        interventionHistory: metadata.interventionHistory || [],
        notes: metadata.notes || '',
        isMinor: metadata.isMinor || false,
        guardianInfo: metadata.guardianInfo
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.crisisReport.count({ where });

    return NextResponse.json({
      clients,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching crisis clients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/crisis/clients - Create a new crisis client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, id: true }
    });

    if (!user || !['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'THERAPIST'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = CrisisClientSchema.parse(body);

    // Map risk level to severity level
    const severityLevel = validatedData.riskLevel === 'imminent' ? 10 :
                         validatedData.riskLevel === 'high' ? 7 :
                         validatedData.riskLevel === 'moderate' ? 5 : 3;

    // Create crisis report entry
    const crisisReport = await (prisma.crisisReport as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: body.userId || null,
        severityLevel,
        triggerType: validatedData.primaryConcern,
        interventionType: 'initial_assessment',
        encryptedDetails: {
          ...validatedData,
          createdBy: user.id,
          createdAt: new Date().toISOString()
        },
        responseTime: 0,
        resolved: validatedData.status === 'closed',
        emergencyContactUsed: false,
        updatedAt: new Date()
      }
    });

    // If there's a safety plan, create it
    if (validatedData.safetyPlan && body.userId) {
      await (prisma.safetyPlan as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: body.userId,
          warningSignsEncrypted: validatedData.safetyPlan.warningSigns,
          copingStrategiesEncrypted: validatedData.safetyPlan.copingStrategies,
          supportContactsEncrypted: validatedData.safetyPlan.socialSupports,
          safeEnvironmentEncrypted: validatedData.safetyPlan.environmentalSafety,
          reasonsToLiveEncrypted: validatedData.safetyPlan.crisisContacts,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      id: crisisReport.id,
      message: 'Crisis client created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating crisis client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/crisis/clients - Update a crisis client
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, id: true }
    });

    if (!user || !['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'THERAPIST'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Find the crisis report
    const existingReport = await prisma.crisisReport.findUnique({
      where: { id }
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Crisis client not found' }, { status: 404 });
    }

    // Update severity level if risk level changed
    let severityLevel = existingReport.severityLevel;
    if (updateData.riskLevel) {
      severityLevel = updateData.riskLevel === 'imminent' ? 10 :
                     updateData.riskLevel === 'high' ? 7 :
                     updateData.riskLevel === 'moderate' ? 5 : 3;
    }

    // Merge existing details with updates
    const currentDetails = existingReport.encryptedDetails as any || {};
    const updatedDetails = {
      ...currentDetails,
      ...updateData,
      lastUpdatedBy: user.id,
      lastUpdatedAt: new Date().toISOString()
    };

    // Update the crisis report
    const updatedReport = await prisma.crisisReport.update({
      where: { id },
      data: {
        severityLevel,
        triggerType: updateData.primaryConcern || existingReport.triggerType,
        encryptedDetails: updatedDetails,
        resolved: updateData.status === 'closed',
        resolvedAt: updateData.status === 'closed' ? new Date() : null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      id: updatedReport.id,
      message: 'Crisis client updated successfully'
    });
  } catch (error) {
    console.error('Error updating crisis client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}