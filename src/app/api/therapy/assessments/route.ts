import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
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

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schemas
const getAssessmentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  clientId: z.string().uuid().optional(),
  assessmentType: z.enum(['phq9', 'gad7', 'pcl5', 'audit', 'dast10', 'custom']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createAssessmentSchema = z.object({
  clientId: z.string().uuid(),
  assessmentType: z.enum(['phq9', 'gad7', 'pcl5', 'audit', 'dast10', 'custom']),
  customName: z.string().optional(),
  responses: z.record(z.string(), z.any()),
  scores: z.object({
    total: z.number(),
    subscales: z.record(z.string(), z.number()).optional(),
    severity: z.enum(['none', 'mild', 'moderate', 'moderately_severe', 'severe']).optional(),
    interpretation: z.string(),
    clinicalRange: z.boolean(),
  }),
  administeredBy: z.enum(['self', 'therapist', 'automated']),
  notes: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
});

const updateAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  notes: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  reviewed: z.boolean().optional(),
  reviewNotes: z.string().optional(),
});

// Standard assessment configurations
const ASSESSMENT_CONFIGS = {
  phq9: {
    name: 'Patient Health Questionnaire-9',
    maxScore: 27,
    questions: 9,
    severityRanges: {
      none: [0, 4],
      mild: [5, 9],
      moderate: [10, 14],
      moderately_severe: [15, 19],
      severe: [20, 27],
    },
    clinicalCutoff: 10,
  },
  gad7: {
    name: 'Generalized Anxiety Disorder-7',
    maxScore: 21,
    questions: 7,
    severityRanges: {
      none: [0, 4],
      mild: [5, 9],
      moderate: [10, 14],
      severe: [15, 21],
    },
    clinicalCutoff: 10,
  },
  pcl5: {
    name: 'PTSD Checklist for DSM-5',
    maxScore: 80,
    questions: 20,
    severityRanges: {
      none: [0, 30],
      mild: [31, 40],
      moderate: [41, 60],
      severe: [61, 80],
    },
    clinicalCutoff: 31,
  },
  audit: {
    name: 'Alcohol Use Disorders Identification Test',
    maxScore: 40,
    questions: 10,
    severityRanges: {
      none: [0, 7],
      mild: [8, 15],
      moderate: [16, 19],
      severe: [20, 40],
    },
    clinicalCutoff: 8,
  },
  dast10: {
    name: 'Drug Abuse Screening Test-10',
    maxScore: 10,
    questions: 10,
    severityRanges: {
      none: [0, 2],
      mild: [3, 5],
      moderate: [6, 8],
      severe: [9, 10],
    },
    clinicalCutoff: 3,
  },
};

// GET /api/therapy/assessments
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
    const params = validateInput(getAssessmentsSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      clientId: searchParams.get('clientId'),
      assessmentType: searchParams.get('assessmentType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }) as any;
    
    // Build query filters
    const where: any = {};
    
    if (params.clientId) {
      // Verify consent for specific client
      const hasConsent = await verifyClientConsent((session as any).user.id, params.clientId);
      if (!hasConsent) {
        return errorResponse(null, 'No consent to access this client\'s assessments');
      }
      where.userId = params.clientId;
    } else {
      // Get all clients this therapist has access to
      const activeSessions = await prisma.supportSession.findMany({
        where: {
          helperId: (session as any).user.id,
          status: 'active',
        },
        select: { userId: true },
      });
      
      where.userId = { in: activeSessions.map(s => s.userId).filter(Boolean) };
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
    
    // Get assessments from MoodEntry table (repurposed for assessments)
    const entries = await prisma.moodEntry.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
    
    // Decrypt and format assessments
    const assessments = entries.map(entry => {
      let assessmentData = null;
      
      if (entry.encryptedNotes) {
        try {
          assessmentData = decryptJSON(entry.encryptedNotes as string);
        } catch (error) {
          console.error('Failed to decrypt assessment:', error);
        }
      }
      
      // Filter by assessment type if specified
      if (params.assessmentType && assessmentData?.assessmentType !== params.assessmentType) {
        return null;
      }
      
      return {
        id: entry.id,
        clientId: entry.userId,
        clientName: `${entry.User.firstName || ''} ${entry.User.lastName || ''}`.trim(),
        assessmentType: assessmentData?.assessmentType || 'phq9',
        assessmentName: assessmentData?.customName || 
                       (assessmentData?.assessmentType && ASSESSMENT_CONFIGS[assessmentData.assessmentType as keyof typeof ASSESSMENT_CONFIGS])?.name ||
                       'Unknown Assessment',
        scores: assessmentData?.scores || {
          total: entry.moodScore,
          severity: entry.moodScore <= 4 ? 'none' :
                   entry.moodScore <= 9 ? 'mild' :
                   entry.moodScore <= 14 ? 'moderate' :
                   entry.moodScore <= 19 ? 'moderately_severe' : 'severe',
        },
        administeredBy: assessmentData?.administeredBy || 'self',
        reviewed: assessmentData?.reviewed || false,
        notes: assessmentData?.notes,
        recommendations: assessmentData?.recommendations,
        createdAt: entry.createdAt,
      };
    }).filter((a): a is NonNullable<typeof a> => Boolean(a));
    
    // Get total count
    const total = await prisma.moodEntry.count({ where });
    
    // Calculate trends
    const trends = params.clientId ? await calculateAssessmentTrends(params.clientId) : null;
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_assessments',
      'therapy_assessments',
      undefined,
      { 
        count: assessments.length, 
        page: params.page,
        assessmentTypes: [...new Set(assessments.map(a => a.assessmentType))],
      },
      'success',
      req
    );
    
    return paginatedResponse(
      assessments,
      total,
      params.page,
      params.limit,
      'Assessments retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve assessments');
  }
}

// POST /api/therapy/assessments
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
    const data = validateInput(createAssessmentSchema, body) as any;
    
    // Verify consent for client
    const hasConsent = await verifyClientConsent((session as any).user.id, data.clientId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to create assessment for this client');
    }
    
    // Check for clinical significance
    const config = data.assessmentType !== 'custom' ? (ASSESSMENT_CONFIGS as any)[data.assessmentType] : null;
    const isClinical = config ? data.scores.total >= config.clinicalCutoff : false;
    
    // Create alerts for high-risk scores
    if (isClinical && data.scores.severity === 'severe') {
      // Create safety alert
      await (prisma.safetyAlert as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          type: 'high_assessment_score',
          severity: 'high',
          userId: data.clientId,
          context: `${data.assessmentType}_assessment`,
          indicators: [
            `${data.assessmentType}_severe`,
            `score_${data.scores.total}`,
          ],
          handled: false,
          actions: [],
          notes: `Clinical range ${data.assessmentType} assessment requiring review`,
        },
      });
      
      // Notify therapist
      await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: (session as any).user.id,
          type: 'assessment_alert',
          title: 'High Risk Assessment Score',
          message: `Client scored in severe range on ${config?.name || data.assessmentType}`,
          isPriority: true,
          metadata: {
            clientId: data.clientId,
            assessmentType: data.assessmentType,
            score: data.scores.total,
            severity: data.scores.severity,
          },
        },
      });
    }
    
    // Special handling for suicide item on PHQ-9
    if (data.assessmentType === 'phq9' && data.responses['question_9'] > 0) {
      await (prisma.safetyAlert as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          type: 'suicide_risk',
          severity: 'critical',
          userId: data.clientId,
          context: 'phq9_assessment',
          indicators: ['phq9_item_9', `response_${data.responses['question_9']}`],
          handled: false,
          actions: [],
          notes: 'Positive response to PHQ-9 suicide item',
        },
      });
    }
    
    // Encrypt assessment data
    const encryptedAssessment = encryptJSON({
      assessmentType: data.assessmentType,
      customName: data.customName,
      responses: data.responses,
      scores: data.scores,
      administeredBy: data.administeredBy,
      therapistId: (session as any).user.id,
      notes: data.notes,
      recommendations: data.recommendations,
      isClinical,
      reviewed: false,
    });
    
    // Store assessment
    const assessment = await (prisma.moodEntry as any).create({
      data: {
        id: generatePrismaCreateFields().id,
        userId: data.clientId,
        moodScore: data.scores.total,
        anxietyLevel: data.assessmentType === 'gad7' ? data.scores.total : null,
        energyLevel: null,
        encryptedNotes: encryptedAssessment,
        encryptedTags: encryptJSON({
          category: 'assessment',
          assessmentType: data.assessmentType,
          severity: data.scores.severity,
          clinical: isClinical,
        }),
      },
    });
    
    // Generate automated recommendations based on scores
    const autoRecommendations = generateRecommendations(data.assessmentType, data.scores);
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'create_assessment',
      'therapy_assessments',
      assessment.id,
      {
        clientId: data.clientId,
        assessmentType: data.assessmentType,
        score: data.scores.total,
        severity: data.scores.severity,
        isClinical,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        assessmentId: assessment.id,
        clientId: data.clientId,
        assessmentType: data.assessmentType,
        scores: data.scores,
        isClinical,
        recommendations: [...(data.recommendations || []), ...autoRecommendations],
        createdAt: assessment.createdAt,
      },
      'Assessment created successfully',
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create assessment');
  }
}

// PUT /api/therapy/assessments
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
    const data = validateInput(updateAssessmentSchema, body) as any;
    
    // Get existing assessment
    const existingAssessment = await prisma.moodEntry.findUnique({
      where: { id: data.assessmentId },
    });
    
    if (!existingAssessment) {
      return errorResponse(null, 'Assessment not found');
    }
    
    // Verify consent
    const hasConsent = await verifyClientConsent((session as any).user.id, existingAssessment.userId);
    if (!hasConsent) {
      return errorResponse(null, 'No consent to update this assessment');
    }
    
    // Decrypt existing data
    const existingData = existingAssessment.encryptedNotes
      ? decryptJSON(existingAssessment.encryptedNotes as string)
      : {};
    
    // Update assessment data
    const updatedData = {
      ...existingData,
      notes: data.notes !== undefined ? data.notes : existingData.notes,
      recommendations: data.recommendations || existingData.recommendations,
      reviewed: data.reviewed !== undefined ? data.reviewed : existingData.reviewed,
      reviewNotes: data.reviewNotes || existingData.reviewNotes,
      reviewedBy: data.reviewed ? (session as any).user.id : existingData.reviewedBy,
      reviewedAt: data.reviewed ? new Date().toISOString() : existingData.reviewedAt,
    };
    
    // Update assessment
    const updatedAssessment = await prisma.moodEntry.update({
      where: { id: data.assessmentId },
      data: {
        encryptedNotes: encryptJSON(updatedData),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'update_assessment',
      'therapy_assessments',
      data.assessmentId,
      {
        clientId: existingAssessment.userId,
        reviewed: data.reviewed,
        fieldsUpdated: Object.keys(data).filter(k => k !== 'assessmentId'),
      },
      'success',
      req
    );
    
    return successResponse(
      {
        assessmentId: updatedAssessment.id,
        reviewed: updatedData.reviewed,
        updatedAt: (updatedAssessment as any).updatedAt,
      },
      'Assessment updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update assessment');
  }
}

// DELETE /api/therapy/assessments
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    await therapyRateLimiter.check(req, 5, identifier);
    
    // Authentication & Authorization - Only admins can delete
    const session = await requireRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (session instanceof NextResponse) return session;
    
    // Get assessment ID from query params
    const assessmentId = req.nextUrl.searchParams.get('assessmentId');
    const reason = req.nextUrl.searchParams.get('reason');
    
    if (!assessmentId || !reason) {
      return errorResponse(null, 'Assessment ID and reason are required');
    }
    
    // Get existing assessment
    const existingAssessment = await prisma.moodEntry.findUnique({
      where: { id: assessmentId },
    });
    
    if (!existingAssessment) {
      return errorResponse(null, 'Assessment not found');
    }
    
    // Soft delete by marking as deleted in encrypted data
    const existingData = existingAssessment.encryptedNotes
      ? decryptJSON(existingAssessment.encryptedNotes as string)
      : {};
    
    existingData.isDeleted = true;
    existingData.deletedBy = (session as any).user.id;
    existingData.deletedAt = new Date().toISOString();
    existingData.deletionReason = reason;
    
    await prisma.moodEntry.update({
      where: { id: assessmentId },
      data: {
        encryptedNotes: encryptJSON(existingData),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'delete_assessment',
      'therapy_assessments',
      assessmentId,
      {
        clientId: existingAssessment.userId,
        assessmentType: existingData.assessmentType,
        reason,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        assessmentId,
        deletedAt: new Date(),
      },
      'Assessment deleted successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to delete assessment');
  }
}

// Helper function to calculate assessment trends
async function calculateAssessmentTrends(clientId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const assessments = await prisma.moodEntry.findMany({
    where: {
      userId: clientId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  if (assessments.length < 2) return null;
  
  const firstScore = assessments[0]?.moodScore ?? 0;
  const lastScore = assessments[assessments.length - 1]?.moodScore ?? 0;
  const change = lastScore - firstScore;
  const percentChange = (change / firstScore) * 100;
  
  return {
    direction: change > 0 ? 'worsening' : change < 0 ? 'improving' : 'stable',
    change,
    percentChange,
    assessmentCount: assessments.length,
    period: '30_days',
  };
}

// Helper function to generate recommendations
function generateRecommendations(assessmentType: string, scores: any): string[] {
  const recommendations = [];
  const severity = scores.severity;
  
  if (severity === 'severe') {
    recommendations.push('Consider immediate safety assessment');
    recommendations.push('Increase session frequency');
    recommendations.push('Evaluate need for psychiatric consultation');
  } else if (severity === 'moderately_severe' || severity === 'moderate') {
    recommendations.push('Monitor symptoms closely');
    recommendations.push('Review treatment plan effectiveness');
    recommendations.push('Consider adjunct interventions');
  }
  
  // Type-specific recommendations
  switch (assessmentType) {
    case 'phq9':
      if (scores.total >= 10) {
        recommendations.push('Screen for comorbid anxiety');
        recommendations.push('Assess sleep hygiene');
        recommendations.push('Evaluate medication compliance if applicable');
      }
      break;
    case 'gad7':
      if (scores.total >= 10) {
        recommendations.push('Teach relaxation techniques');
        recommendations.push('Consider CBT for anxiety');
        recommendations.push('Assess caffeine intake');
      }
      break;
    case 'pcl5':
      if (scores.total >= 31) {
        recommendations.push('Consider trauma-focused therapy');
        recommendations.push('Screen for dissociation');
        recommendations.push('Assess social support system');
      }
      break;
  }
  
  return recommendations;
}