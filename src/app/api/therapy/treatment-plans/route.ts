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
import { encryptJSON, decryptJSON } from '@/lib/encryption-exports';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Validation schemas
const getTreatmentPlansSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  clientId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'draft']).optional(),
});

const createTreatmentPlanSchema = z.object({
  clientId: z.string().uuid(),
  diagnoses: z.array(z.object({
    code: z.string(),
    description: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    onset: z.string(),
    status: z.enum(['active', 'remission', 'resolved']),
  })),
  presentingProblems: z.array(z.object({
    problem: z.string(),
    severity: z.number().min(1).max(10),
    duration: z.string(),
    triggers: z.array(z.string()),
    maintainingFactors: z.array(z.string()),
  })),
  goals: z.array(z.object({
    type: z.enum(['long_term', 'short_term']),
    description: z.string(),
    targetDate: z.string().datetime(),
    measurableOutcome: z.string(),
    objectives: z.array(z.object({
      description: z.string(),
      targetDate: z.string().datetime(),
      completed: z.boolean().default(false),
    })),
  })),
  interventions: z.array(z.object({
    type: z.string(),
    description: z.string(),
    frequency: z.string(),
    duration: z.string(),
    rationale: z.string(),
    evidenceBase: z.string().optional(),
  })),
  strengthsAndResources: z.array(z.string()),
  barriers: z.array(z.string()),
  crisisplan: z.object({
    warningSignsEncrypted: z.array(z.string()),
    copingStrategies: z.array(z.string()),
    supportContacts: z.array(z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      available: z.string(),
    })),
    professionalContacts: z.array(z.object({
      name: z.string(),
      role: z.string(),
      phone: z.string(),
      available: z.string(),
    })),
    safeEnvironment: z.array(z.string()),
  }),
  reviewSchedule: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
    nextReviewDate: z.string().datetime(),
  }),
  consentObtained: z.boolean(),
  clientInvolvement: z.string(),
});

const updateTreatmentPlanSchema = z.object({
  planId: z.string().uuid(),
  updates: createTreatmentPlanSchema.partial(),
  progressNote: z.string().optional(),
});

// GET /api/therapy/treatment-plans
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
    const params = validateInput(getTreatmentPlansSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      clientId: searchParams.get('clientId'),
      status: searchParams.get('status'),
    });
    
    // Build query filters
    const where: any = {};
    
    if (params.clientId) {
      // Verify consent for specific client
      const hasConsent = await verifyClientConsent((session as any).user.id, params.clientId);
      if (!hasConsent) {
        return errorResponse(null, 'No consent to access this client\'s treatment plans');
      }
      where.userId = params.clientId;
    }
    
    // Get treatment plans from SafetyPlan table (repurposed for treatment plans)
    const plans = await prisma.safetyPlan.findMany({
      where: {
        ...where,
        isActive: params.status === 'active' ? true : params.status === 'completed' ? false : undefined,
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { updatedAt: 'desc' },
    });
    
    // Decrypt and format treatment plans
    const treatmentPlans = plans.map(plan => {
      let decryptedPlan = null;
      
      try {
        // Combine all encrypted fields into a comprehensive treatment plan
        const warningSignsEncrypted = plan.warningSignsEncrypted ? decryptJSON(plan.warningSignsEncrypted as string) : {};
        const copingStrategies = plan.copingStrategiesEncrypted ? decryptJSON(plan.copingStrategiesEncrypted as string) : {};
        const supportContacts = plan.supportContactsEncrypted ? decryptJSON(plan.supportContactsEncrypted as string) : {};
        const safeEnvironment = plan.safeEnvironmentEncrypted ? decryptJSON(plan.safeEnvironmentEncrypted as string) : {};
        const reasonsToLive = plan.reasonsToLiveEncrypted ? decryptJSON(plan.reasonsToLiveEncrypted as string) : {};
        
        decryptedPlan = {
          ...warningSignsEncrypted,
          ...copingStrategies,
          ...supportContacts,
          ...safeEnvironment,
          ...reasonsToLive,
        };
      } catch (error) {
        console.error('Failed to decrypt treatment plan:', error);
      }
      
      return {
        id: plan.id,
        clientId: plan.userId,
        clientName: `${plan.User.firstName || ''} ${plan.User.lastName || ''}`.trim(),
        status: plan.isActive ? 'active' : 'completed',
        plan: decryptedPlan,
        lastReviewedAt: plan.lastReviewedAt,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      };
    });
    
    // Get total count
    const total = await prisma.safetyPlan.count({ where });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_treatment_plans',
      'therapy_treatment_plans',
      undefined,
      { count: treatmentPlans.length, page: params.page },
      'success',
      req
    );
    
    return paginatedResponse(
      treatmentPlans,
      total,
      params.page,
      params.limit,
      'Treatment plans retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve treatment plans');
  }
}

// POST /api/therapy/treatment-plans
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
    const data = validateInput(createTreatmentPlanSchema, body);
    
    // Verify consent for client
    const hasConsent = await verifyClientConsent((session as any).user.id, data.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to create treatment plan for this client');
    }
    
    // Check for existing active plan
    const existingPlan = await prisma.safetyPlan.findFirst({
      where: {
        userId: data.clientId,
        isActive: true,
      },
    });
    
    if (existingPlan) {
      // Archive existing plan
      await prisma.safetyPlan.update({
        where: { id: existingPlan.id },
        data: { isActive: false },
      });
    }
    
    // Encrypt treatment plan components
    const treatmentPlanData = {
      diagnoses: data.diagnoses,
      presentingProblems: data.presentingProblems,
      goals: data.goals,
      interventions: data.interventions,
      strengthsAndResources: data.strengthsAndResources,
      barriers: data.barriers,
      reviewSchedule: data.reviewSchedule,
      consentObtained: data.consentObtained,
      clientInvolvement: data.clientInvolvement,
      createdBy: (session as any).user.id,
      createdAt: new Date().toISOString(),
    };
    
    // Create new treatment plan
    const newPlan = await (prisma.safetyPlan as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: data.clientId,
        warningSignsEncrypted: encryptJSON(treatmentPlanData),
        copingStrategiesEncrypted: encryptJSON(data.crisisplan.copingStrategies),
        supportContactsEncrypted: encryptJSON({
          support: data.crisisplan.supportContacts,
          professional: data.crisisplan.professionalContacts,
        }),
        safeEnvironmentEncrypted: encryptJSON(data.crisisplan.safeEnvironment),
        reasonsToLiveEncrypted: encryptJSON(data.crisisplan.warningSignsEncrypted),
        isActive: true,
        lastReviewedAt: new Date(),
      },
    });
    
    // Create notification for client
    await (prisma.notification as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: data.clientId,
        type: 'treatment_plan_created',
        title: 'New Treatment Plan',
        message: 'Your therapist has created a new treatment plan for your care',
        isPriority: false,
        metadata: {
          planId: newPlan.id,
          therapistId: (session as any).user.id,
        },
      },
    });
    
    // Schedule review reminder
    if (data.reviewSchedule.nextReviewDate) {
      await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: (session as any).user.id,
          type: 'treatment_plan_review',
          title: 'Treatment Plan Review Due',
          message: `Treatment plan review scheduled for client`,
          isPriority: true,
          metadata: {
            planId: newPlan.id,
            clientId: data.clientId,
            reviewDate: data.reviewSchedule.nextReviewDate,
          },
          createdAt: new Date(data.reviewSchedule.nextReviewDate),
        },
      });
    }
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'create_treatment_plan',
      'therapy_treatment_plans',
      newPlan.id,
      {
        clientId: data.clientId,
        goalsCount: data.goals.length,
        interventionsCount: data.interventions.length,
        consentObtained: data.consentObtained,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        planId: newPlan.id,
        clientId: data.clientId,
        status: 'active',
        nextReviewDate: data.reviewSchedule.nextReviewDate,
        createdAt: newPlan.createdAt,
      },
      'Treatment plan created successfully',
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create treatment plan');
  }
}

// PUT /api/therapy/treatment-plans
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
    const data = validateInput(updateTreatmentPlanSchema, body);
    
    // Get existing plan
    const existingPlan = await prisma.safetyPlan.findUnique({
      where: { id: data.planId },
    });
    
    if (!existingPlan) {
      return errorResponse(null, 'Treatment plan not found');
    }
    
    // Verify consent
    const hasConsent = await verifyClientConsent((session as any).user.id, existingPlan.userId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to update this treatment plan');
    }
    
    // Decrypt existing plan
    const existingData = existingPlan.warningSignsEncrypted
      ? decryptJSON(existingPlan.warningSignsEncrypted as string)
      : {};
    
    // Merge updates
    const updatedPlanData = {
      ...existingData.treatmentPlan,
      ...data.updates,
      lastUpdatedBy: (session as any).user.id,
      lastUpdatedAt: new Date().toISOString(),
      progressNotes: [
        ...(existingData.treatmentPlan?.progressNotes || []),
        ...(data.progressNote ? [{
          note: data.progressNote,
          createdBy: (session as any).user.id,
          createdAt: new Date().toISOString(),
        }] : []),
      ],
    };
    
    // Update plan
    const updatedPlan = await prisma.safetyPlan.update({
      where: { id: data.planId },
      data: {
        warningSignsEncrypted: encryptJSON(updatedPlanData),
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'update_treatment_plan',
      'therapy_treatment_plans',
      data.planId,
      {
        clientId: existingPlan.userId,
        fieldsUpdated: Object.keys(data.updates || {}),
        hasProgressNote: !!data.progressNote,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        planId: updatedPlan.id,
        updatedAt: updatedPlan.updatedAt,
        lastReviewedAt: updatedPlan.lastReviewedAt,
      },
      'Treatment plan updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update treatment plan');
  }
}

// DELETE /api/therapy/treatment-plans
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 5, identifier);
    
    // Authentication & Authorization
    const session = await requireRole(req, [UserRole.THERAPIST, UserRole.ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Get plan ID from query params
    const planId = req.nextUrl.searchParams.get('planId');
    
    if (!planId) {
      return errorResponse(null, 'Plan ID is required');
    }
    
    // Get existing plan
    const existingPlan = await prisma.safetyPlan.findUnique({
      where: { id: planId },
    });
    
    if (!existingPlan) {
      return errorResponse(null, 'Treatment plan not found');
    }
    
    // Verify consent
    const hasConsent = await verifyClientConsent((session as any).user.id, existingPlan.userId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to archive this treatment plan');
    }
    
    // Archive plan (don't delete for compliance)
    const archivedPlan = await prisma.safetyPlan.update({
      where: { id: planId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'archive_treatment_plan',
      'therapy_treatment_plans',
      planId,
      {
        clientId: existingPlan.userId,
        reason: 'therapist_initiated',
      },
      'success',
      req
    );
    
    return successResponse(
      {
        planId: archivedPlan.id,
        status: 'archived',
        archivedAt: new Date(),
      },
      'Treatment plan archived successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to archive treatment plan');
  }
}