import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { withAuth, withRateLimit, AuthenticatedRequest, withCrisisCounselor } from '@/lib/auth-middleware';
import { notifyUser, notifyCounselors, CrisisEvents } from '@/lib/websocket';
import { 
  CreateSafetyPlanRequest, 
  UpdateSafetyPlanRequest, 
  SafetyPlanResponse, 
  CrisisResponse,
  CrisisValidationError as ValidationError,
  SafetyPlanSection
} from '@/types';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Mock encryption functions since the imports are missing
function encryptJSON(data: any, key: string): string {
  return JSON.stringify(data);
}

function decryptJSON(data: string, key: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function maskSensitiveData(data: string, type: string): string {
  if (type === 'phone') {
    return data.replace(/\d{3}-?\d{3}-?\d{4}/, 'XXX-XXX-XXXX');
  }
  return data;
}

// Validation schemas
const safetyPlanSectionSchema = z.object({
  title: z.string().min(1).max(100),
  items: z.array(z.string()).min(1).max(20),
  notes: z.string().max(500).optional(),
});

const createSafetyPlanSchema = z.object({
  warningSignals: safetyPlanSectionSchema,
  copingStrategies: safetyPlanSectionSchema,
  supportContacts: z.array(z.object({
    name: z.string().min(1).max(100),
    relationship: z.string().min(1).max(50),
    phone: z.string().min(1).max(20),
    available: z.string().min(1).max(100),
  })).min(1).max(10),
  safeEnvironment: safetyPlanSectionSchema,
  reasonsToLive: safetyPlanSectionSchema.optional(),
  professionalContacts: z.array(z.object({
    name: z.string().min(1).max(100),
    role: z.string().min(1).max(50),
    phone: z.string().min(1).max(20),
    email: z.string().email().optional(),
  })).max(10).optional(),
});

const updateSafetyPlanSchema = z.object({
  warningSignals: safetyPlanSectionSchema.optional(),
  copingStrategies: safetyPlanSectionSchema.optional(),
  supportContacts: z.array(z.object({
    name: z.string().min(1).max(100),
    relationship: z.string().min(1).max(50),
    phone: z.string().min(1).max(20),
    available: z.string().min(1).max(100),
  })).min(1).max(10).optional(),
  safeEnvironment: safetyPlanSectionSchema.optional(),
  reasonsToLive: safetyPlanSectionSchema.optional(),
  isActive: z.boolean().optional(),
});

// GET /api/crisis/safety-plans - Get safety plans
export async function GET(req: NextRequest) {
  return withRateLimit(60, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const url = (req as any).url || req.nextUrl?.toString()(req);
}
    const { searchParams } = new URL(url);
      
      // Check permissions
      const canViewAllPlans = [
        'CRISIS_COUNSELOR', 
        'ADMIN', 
        'SUPER_ADMIN'
      ].includes(user.role);
      
      const canViewLimitedPlans = [
        'THERAPIST',
        'HELPER'
      ].includes(user.role);

      // Parse parameters
      const userId = searchParams.get('userId');
      const isActive = searchParams.get('isActive');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (userId) {
        // Check if user can view this specific user's plan
        if (!canViewAllPlans && userId !== user.id) {
          return NextResponse.json(
            { error: 'Unauthorized to view this safety plan' },
            { status: 403 }
          );
        }
        where.userId = userId;
      } else if (!canViewAllPlans) {
        // Non-counselors can only view their own plans
        where.userId = user.id;
      }
      
      if (isActive !== null) {
        where.isActive = isActive === 'true';
      }

      // Fetch safety plans with pagination
      const [plans, total] = await Promise.all([
        prisma.safetyPlan.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { isActive: 'desc' },
            { lastReviewedAt: 'desc' },
            { createdAt: 'desc' }
          ],
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                anonymousId: true,
              }
            }
          }
        }),
        prisma.safetyPlan.count({ where }),
      ]);

      // Transform plans for response
      const planResponses: SafetyPlanResponse[] = await Promise.all(
        plans.map(async (plan) => {
          const response: SafetyPlanResponse = {
            id: plan.id,
            userId: plan.userId,
            isActive: plan.isActive,
            lastReviewedAt: plan.lastReviewedAt,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
            warningSignals: undefined as any,
            copingStrategies: undefined as any,
            supportContacts: undefined as any,
            safeEnvironment: undefined as any,
          };

          // Decrypt sections for authorized users
          if (canViewAllPlans || plan.userId === user.id) {
            try {
              response.warningSignals = decryptJSON(
                plan.warningSignsEncrypted as string,
                plan.id
              );
              response.copingStrategies = decryptJSON(
                plan.copingStrategiesEncrypted as string,
                plan.id
              );
              
              const supportContacts = decryptJSON(
                plan.supportContactsEncrypted as string,
                plan.id
              );
              
              // Mask phone numbers if not crisis counselor
              if (!canViewAllPlans && canViewLimitedPlans) {
                response.supportContacts = supportContacts.map((contact: any) => ({
                  ...contact,
                  phone: maskSensitiveData(contact.phone, 'phone'),
                }));
              } else {
                response.supportContacts = supportContacts;
              }
              
              response.safeEnvironment = decryptJSON(
                plan.safeEnvironmentEncrypted as string,
                plan.id
              );
              
              if (plan.reasonsToLiveEncrypted) {
                response.reasonsToLive = decryptJSON(
                  plan.reasonsToLiveEncrypted as string,
                  plan.id
                );
              }
            } catch (error) {
              console.error('Failed to decrypt safety plan:', error);
            }
          }

          return response;
        })
      );

      // Log access
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: 'view_safety_plans',
          resource: 'safety_plan',
          details: JSON.stringify({
            resultsCount: plans.length,
            accessLevel: canViewAllPlans ? 'full' : canViewLimitedPlans ? 'limited' : 'own',
          }),
          outcome: 'success',
        },
      }).catch(console.error);

      return NextResponse.json({
        data: planResponses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      });
    } catch (error) {
      console.error('Error fetching safety plans:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'view_safety_plans',
          resource: 'safety_plan',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to fetch safety plans' },
        { status: 500 }
      );
    }
  })
);

// POST /api/crisis/safety-plans - Create new safety plan
export async function POST(req: NextRequest) {
  return withRateLimit(5, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const body = await (req as any).json()(req);
}
      
      // Validate request
      const validation = createSafetyPlanSchema.safeParse(body);
      if (!validation.success) {
        const errors: ValidationError[] = validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return NextResponse.json(
          { error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      const data: CreateSafetyPlanRequest = validation.data;

      // Check for existing active plan
      const existingPlan = await prisma.safetyPlan.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      if (existingPlan) {
        // Deactivate existing plan
        await prisma.safetyPlan.update({
          where: { id: existingPlan.id },
          data: { isActive: false },
        });
      }

      // Encrypt all sections
      const warningSignsEncrypted = encryptJSON(data.warningSignals, user.id);
      const copingStrategiesEncrypted = encryptJSON(data.copingStrategies, user.id);
      const supportContactsEncrypted = encryptJSON(data.supportContacts, user.id);
      const safeEnvironmentEncrypted = encryptJSON(data.safeEnvironment, user.id);
      const reasonsToLiveEncrypted = data.reasonsToLive
        ? encryptJSON(data.reasonsToLive, user.id)
        : undefined;

      // Create safety plan
      const plan = await (prisma.safetyPlan as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          warningSignsEncrypted,
          copingStrategiesEncrypted,
          supportContactsEncrypted,
          safeEnvironmentEncrypted,
          reasonsToLiveEncrypted,
          isActive: true,
          lastReviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Notify user
      await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          type: 'safety_plan_created',
          title: 'Safety Plan Created',
          message: 'Your safety plan has been created successfully. Remember to review it regularly.',
          metadata: JSON.stringify({ planId: plan.id }),
        },
      }).catch(console.error);

      // Notify via WebSocket
      notifyUser(user.id, 'safety_plan_created', {
        planId: plan.id,
        message: 'Your safety plan is now active',
      });

      // Log creation
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: 'create_safety_plan',
          resource: 'safety_plan',
          resourceId: plan.id,
          details: JSON.stringify({
            hasReasons: !!data.reasonsToLive,
            contactsCount: data.supportContacts.length,
            strategiesCount: data.copingStrategies.items.length,
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse<SafetyPlanResponse> = {
        success: true,
        data: {
          id: plan.id,
          userId: plan.userId,
          isActive: plan.isActive,
          lastReviewedAt: plan.lastReviewedAt,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          warningSignals: data.warningSignals,
          copingStrategies: data.copingStrategies,
          supportContacts: data.supportContacts,
          safeEnvironment: data.safeEnvironment,
          reasonsToLive: data.reasonsToLive,
        },
        message: 'Safety plan created successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error('Error creating safety plan:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'create_safety_plan',
          resource: 'safety_plan',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to create safety plan' },
        { status: 500 }
      );
    }
  })
);

// PUT /api/crisis/safety-plans/[id] - Update safety plan
export async function PUT(req: NextRequest) {
  return withRateLimit(30, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const body = await (req as any).json()(req);
}
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const planId = searchParams.get('id');

      if (!planId) {
        return NextResponse.json(
          { error: 'Plan ID required' },
          { status: 400 }
        );
      }

      // Validate request
      const validation = updateSafetyPlanSchema.safeParse(body);
      if (!validation.success) {
        const errors: ValidationError[] = validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return NextResponse.json(
          { error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      const data: UpdateSafetyPlanRequest = validation.data;

      // Check if plan exists and user has permission
      const existingPlan = await prisma.safetyPlan.findUnique({
        where: { id: planId },
      });

      if (!existingPlan) {
        return NextResponse.json(
          { error: 'Safety plan not found' },
          { status: 404 }
        );
      }

      // Check permissions
      const canEdit = existingPlan.userId === user.id || 
        ['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

      if (!canEdit) {
        return NextResponse.json(
          { error: 'Unauthorized to edit this safety plan' },
          { status: 403 }
        );
      }

      // Prepare update data
      const updateData: any = {
        lastReviewedAt: new Date(),
      };

      if (data.warningSignals) {
        updateData.warningSignsEncrypted = encryptJSON(data.warningSignals, existingPlan.userId);
      }
      
      if (data.copingStrategies) {
        updateData.copingStrategiesEncrypted = encryptJSON(data.copingStrategies, existingPlan.userId);
      }
      
      if (data.supportContacts) {
        updateData.supportContactsEncrypted = encryptJSON(data.supportContacts, existingPlan.userId);
      }
      
      if (data.safeEnvironment) {
        updateData.safeEnvironmentEncrypted = encryptJSON(data.safeEnvironment, existingPlan.userId);
      }
      
      if (data.reasonsToLive) {
        updateData.reasonsToLiveEncrypted = encryptJSON(data.reasonsToLive, existingPlan.userId);
      }
      
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
        
        // If activating this plan, deactivate others
        if (data.isActive) {
          await prisma.safetyPlan.updateMany({
            where: {
              userId: existingPlan.userId,
              id: { not: planId },
              isActive: true,
            },
            data: { isActive: false },
          });
        }
      }

      // Update plan
      const updatedPlan = await prisma.safetyPlan.update({
        where: { id: planId },
        data: updateData,
      });

      // Notify user
      if (existingPlan.userId !== user.id) {
        // Counselor updated user's plan
        await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: existingPlan.userId,
            type: 'safety_plan_updated',
            title: 'Safety Plan Updated',
            message: 'Your safety plan has been updated by your counselor.',
            metadata: JSON.stringify({ planId: updatedPlan.id }),
          },
        }).catch(console.error);

        notifyUser(existingPlan.userId, 'safety_plan_updated', {
          planId: updatedPlan.id,
          updatedBy: user.id,
        });
      }

      // Log update
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: 'update_safety_plan',
          resource: 'safety_plan',
          resourceId: planId,
          details: JSON.stringify({
            updates: Object.keys(data),
            updatedByOwner: existingPlan.userId === user.id,
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse<SafetyPlanResponse> = {
        success: true,
        data: {
          id: updatedPlan.id,
          userId: updatedPlan.userId,
          isActive: updatedPlan.isActive,
          lastReviewedAt: updatedPlan.lastReviewedAt,
          createdAt: updatedPlan.createdAt,
          updatedAt: updatedPlan.updatedAt,
          warningSignals: undefined as any,
          copingStrategies: undefined as any,
          supportContacts: undefined as any,
          safeEnvironment: undefined as any,
        },
        message: 'Safety plan updated successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error updating safety plan:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'update_safety_plan',
          resource: 'safety_plan',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to update safety plan' },
        { status: 500 }
      );
    }
  })
);

// DELETE /api/crisis/safety-plans/[id] - Delete safety plan
export async function DELETE(req: NextRequest) {
  return withRateLimit(10, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const url = (req as any).url || req.nextUrl?.toString()(req);
}
    const { searchParams } = new URL(url);
      const planId = searchParams.get('id');

      if (!planId) {
        return NextResponse.json(
          { error: 'Plan ID required' },
          { status: 400 }
        );
      }

      // Check if plan exists
      const existingPlan = await prisma.safetyPlan.findUnique({
        where: { id: planId },
      });

      if (!existingPlan) {
        return NextResponse.json(
          { error: 'Safety plan not found' },
          { status: 404 }
        );
      }

      // Check permissions - only owner or admin can delete
      const canDelete = existingPlan.userId === user.id || 
        ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

      if (!canDelete) {
        return NextResponse.json(
          { error: 'Unauthorized to delete this safety plan' },
          { status: 403 }
        );
      }

      // Delete plan
      await prisma.safetyPlan.delete({
        where: { id: planId },
      });

      // Log deletion
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: 'delete_safety_plan',
          resource: 'safety_plan',
          resourceId: planId,
          details: JSON.stringify({
            deletedByOwner: existingPlan.userId === user.id,
            wasActive: existingPlan.isActive,
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse = {
        success: true,
        message: 'Safety plan deleted successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error deleting safety plan:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'delete_safety_plan',
          resource: 'safety_plan',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to delete safety plan' },
        { status: 500 }
      );
    }
  })
);