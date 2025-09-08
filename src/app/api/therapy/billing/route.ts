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
} from '@/lib/api-middleware';
import { encryptJSON, decryptJSON, maskSensitiveData } from '@/lib/encryption';
import { therapyRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

// Validation schemas
const getBillingSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  clientId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'submitted', 'processing', 'paid', 'denied', 'appealed']).optional(),
  insuranceProvider: z.string().optional(),
});

const createBillingSchema = z.object({
  sessionId: z.string().uuid(),
  clientId: z.string().uuid(),
  serviceDate: z.string().datetime(),
  cptCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    units: z.number(),
    rate: z.number(),
    modifier: z.string().optional(),
  })),
  diagnosisCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    primary: z.boolean(),
  })),
  insurance: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    copay: z.number(),
    deductible: z.number(),
    deductibleMet: z.number(),
    coinsurance: z.number(),
    authorizationNumber: z.string().optional(),
    authorizationVisits: z.number().optional(),
    authorizationUsed: z.number().optional(),
  }).optional(),
  selfPay: z.object({
    rate: z.number(),
    discount: z.number().optional(),
    paymentPlan: z.boolean().default(false),
  }).optional(),
  notes: z.string().optional(),
});

const updateBillingSchema = z.object({
  billingId: z.string().uuid(),
  status: z.enum(['pending', 'submitted', 'processing', 'paid', 'denied', 'appealed']).optional(),
  paymentInfo: z.object({
    amount: z.number(),
    paymentDate: z.string().datetime(),
    paymentMethod: z.enum(['insurance', 'credit_card', 'check', 'cash', 'ach']),
    referenceNumber: z.string().optional(),
  }).optional(),
  denialInfo: z.object({
    reason: z.string(),
    denialCode: z.string(),
    appealDeadline: z.string().datetime().optional(),
  }).optional(),
  adjustments: z.array(z.object({
    type: z.enum(['writeoff', 'discount', 'adjustment', 'refund']),
    amount: z.number(),
    reason: z.string(),
  })).optional(),
  notes: z.string().optional(),
});

const generateStatementSchema = z.object({
  clientId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  includeDetails: z.boolean().default(true),
});

// GET /api/therapy/billing
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
    const params = validateInput(getBillingSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      clientId: searchParams.get('clientId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      insuranceProvider: searchParams.get('insuranceProvider'),
    });
    
    // Build query filters
    const where: any = {};
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }
    
    // Get billing records from Appointment table (using encryptedNotes for billing data)
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: (session as any).user.id,
        ...(params.clientId && { userId: params.clientId }),
        ...where,
        encryptedNotes: { not: null },
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
      orderBy: { scheduledAt: 'desc' },
    });
    
    // Process and decrypt billing data
    const billingRecords = [];
    
    for (const appointment of appointments) {
      if (appointment.encryptedNotes) {
        try {
          const decryptedData = decryptJSON(appointment.encryptedNotes as string);
          
          if (decryptedData.billing) {
            // Filter by status if specified
            if (params.status && decryptedData.billing.status !== params.status) {
              continue;
            }
            
            // Filter by insurance provider if specified
            if (params.insuranceProvider && 
                decryptedData.billing.insurance?.provider !== params.insuranceProvider) {
              continue;
            }
            
            billingRecords.push({
              id: `billing_${appointment.id}`,
              sessionId: appointment.id,
              clientId: appointment.userId,
              clientName: `${appointment.User.firstName || ''} ${appointment.User.lastName || ''}`.trim(),
              serviceDate: appointment.scheduledAt,
              cptCodes: decryptedData.billing.cptCodes,
              diagnosisCodes: decryptedData.billing.diagnosisCodes,
              insurance: decryptedData.billing.insurance ? {
                ...decryptedData.billing.insurance,
                policyNumber: maskSensitiveData(decryptedData.billing.insurance.policyNumber, {}),
              } : null,
              selfPay: decryptedData.billing.selfPay,
              totalCharges: calculateTotalCharges(decryptedData.billing.cptCodes),
              amountPaid: decryptedData.billing.paymentInfo?.amount || 0,
              balance: calculateBalance(decryptedData.billing),
              status: decryptedData.billing.status || 'pending',
              submittedDate: decryptedData.billing.submittedDate,
              paymentDate: decryptedData.billing.paymentInfo?.paymentDate,
              notes: decryptedData.billing.notes,
              createdAt: appointment.createdAt,
            });
          }
        } catch (error) {
          console.error('Failed to decrypt billing data:', error);
        }
      }
    }
    
    // Calculate summary statistics
    const stats = {
      totalCharges: billingRecords.reduce((sum, r) => sum + r.totalCharges, 0),
      totalPaid: billingRecords.reduce((sum, r) => sum + r.amountPaid, 0),
      totalBalance: billingRecords.reduce((sum, r) => sum + r.balance, 0),
      pending: billingRecords.filter(r => r.status === 'pending').length,
      submitted: billingRecords.filter(r => r.status === 'submitted').length,
      paid: billingRecords.filter(r => r.status === 'paid').length,
      denied: billingRecords.filter(r => r.status === 'denied').length,
    };
    
    // Get total count
    const total = billingRecords.length;
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'view_billing',
      'therapy_billing',
      undefined,
      {
        recordsViewed: billingRecords.length,
        filters: params,
      },
      'success',
      req
    );
    
    return successResponse(
      {
        billingRecords,
        stats,
        pagination: {
          total,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(total / params.limit),
        },
      },
      'Billing records retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to retrieve billing records');
  }
}

// POST /api/therapy/billing
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
    const data = validateInput(createBillingSchema, body);
    
    // Verify session exists and belongs to therapist
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.sessionId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Session not found');
    }
    
    if (appointment.professionalId !== (session as any).user.id) {
      return errorResponse(null, 'Unauthorized to bill for this session');
    }
    
    if (appointment.userId !== data.clientId) {
      return errorResponse(null, 'Client ID mismatch with session');
    }
    
    // Calculate totals
    const totalCharges = calculateTotalCharges(data.cptCodes);
    const estimatedPayment = data.insurance
      ? calculateInsurancePayment(totalCharges, data.insurance)
      : data.selfPay
      ? totalCharges - (data.selfPay.discount || 0)
      : totalCharges;
    
    // Prepare billing data
    const billingData = {
      sessionId: data.sessionId,
      clientId: data.clientId,
      serviceDate: data.serviceDate,
      cptCodes: data.cptCodes,
      diagnosisCodes: data.diagnosisCodes,
      insurance: data.insurance,
      selfPay: data.selfPay,
      totalCharges,
      estimatedPayment,
      balance: totalCharges - estimatedPayment,
      status: 'pending',
      createdBy: (session as any).user.id,
      createdAt: new Date().toISOString(),
      notes: data.notes,
    };
    
    // Get existing notes
    const existingNotes = appointment.encryptedNotes
      ? decryptJSON(appointment.encryptedNotes as string)
      : {};
    
    // Add billing data to appointment
    existingNotes.billing = billingData;
    
    // Update appointment with billing data
    await prisma.appointment.update({
      where: { id: data.sessionId },
      data: {
        encryptedNotes: encryptJSON(existingNotes),
        updatedAt: new Date(),
      },
    });
    
    // Create audit entry for billing
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: (session as any).user.id,
        action: 'create_billing',
        resource: 'therapy_billing',
        resourceId: data.sessionId,
        details: {
          clientId: data.clientId,
          totalCharges,
          cptCodes: data.cptCodes.map(c => c.code),
          diagnosisCodes: data.diagnosisCodes.map(d => d.code),
          billingType: data.insurance ? 'insurance' : 'self_pay',
        },
        outcome: 'success',
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || ((req as any).headers || req).get('x-real-ip') || '',
        userAgent: ((req as any).headers || req).get('user-agent') || '',
      },
    });
    
    // Create notification for billing team if insurance claim
    if (data.insurance) {
      await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: (session as any).user.id,
          type: 'insurance_claim',
          title: 'New Insurance Claim',
          message: `Insurance claim created for ${data.insurance.provider}`,
          isPriority: false,
          metadata: {
            sessionId: data.sessionId,
            clientId: data.clientId,
            provider: data.insurance.provider,
            totalCharges,
          },
        },
      });
    }
    
    return successResponse(
      {
        billingId: `billing_${data.sessionId}`,
        sessionId: data.sessionId,
        totalCharges,
        estimatedPayment,
        balance: billingData.balance,
        status: 'pending',
        createdAt: new Date(),
      },
      'Billing record created successfully',
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create billing record');
  }
}

// PUT /api/therapy/billing
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
    const data = validateInput(updateBillingSchema, body);
    
    // Extract session ID from billing ID
    const sessionId = data.billingId.replace('billing_', '');
    
    // Get appointment with billing data
    const appointment = await prisma.appointment.findUnique({
      where: { id: sessionId },
    });
    
    if (!appointment) {
      return errorResponse(null, 'Billing record not found');
    }
    
    if (appointment.professionalId !== (session as any).user.id && (session as any).user.role !== UserRole.ADMIN) {
      return errorResponse(null, 'Unauthorized to update this billing record');
    }
    
    // Decrypt existing billing data
    const existingNotes = appointment.encryptedNotes
      ? decryptJSON(appointment.encryptedNotes as string)
      : {};
    
    if (!existingNotes.billing) {
      return errorResponse(null, 'No billing data found for this session');
    }
    
    // Update billing data
    const updatedBilling = { ...existingNotes.billing };
    
    if (data.status) {
      updatedBilling.status = data.status;
      updatedBilling.statusUpdatedAt = new Date().toISOString();
      updatedBilling.statusUpdatedBy = (session as any).user.id;
      
      // Handle status-specific updates
      if (data.status === 'submitted') {
        updatedBilling.submittedDate = new Date().toISOString();
      } else if (data.status === 'denied' && data.denialInfo) {
        updatedBilling.denialInfo = data.denialInfo;
        
        // Create alert for denial
        await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: (session as any).user.id,
            type: 'claim_denied',
            title: 'Insurance Claim Denied',
            message: `Claim denied: ${data.denialInfo.reason}`,
            isPriority: true,
            metadata: {
              sessionId,
              denialCode: data.denialInfo.denialCode,
              appealDeadline: data.denialInfo.appealDeadline,
            },
          },
        });
      }
    }
    
    if (data.paymentInfo) {
      updatedBilling.paymentInfo = data.paymentInfo;
      updatedBilling.amountPaid = (updatedBilling.amountPaid || 0) + data.paymentInfo.amount;
      updatedBilling.balance = updatedBilling.totalCharges - updatedBilling.amountPaid;
      
      // Create payment history entry
      if (!updatedBilling.paymentHistory) {
        updatedBilling.paymentHistory = [];
      }
      updatedBilling.paymentHistory.push({
        ...data.paymentInfo,
        processedBy: (session as any).user.id,
        processedAt: new Date().toISOString(),
      });
    }
    
    if (data.adjustments) {
      if (!updatedBilling.adjustments) {
        updatedBilling.adjustments = [];
      }
      
      for (const adjustment of data.adjustments) {
        updatedBilling.adjustments.push({
          ...adjustment,
          appliedBy: (session as any).user.id,
          appliedAt: new Date().toISOString(),
        });
        
        // Apply adjustment to balance
        if (adjustment.type === 'writeoff' || adjustment.type === 'discount') {
          updatedBilling.balance -= adjustment.amount;
        } else if (adjustment.type === 'refund') {
          updatedBilling.balance += adjustment.amount;
          updatedBilling.amountPaid -= adjustment.amount;
        }
      }
    }
    
    if (data.notes) {
      updatedBilling.notes = (updatedBilling.notes ? updatedBilling.notes + '\n\n' : '') + 
                             `[${new Date().toISOString()}] ${(session as any).user.id}: ${data.notes}`;
    }
    
    // Update appointment with new billing data
    existingNotes.billing = updatedBilling;
    
    await prisma.appointment.update({
      where: { id: sessionId },
      data: {
        encryptedNotes: encryptJSON(existingNotes),
        updatedAt: new Date(),
      },
    });
    
    // Audit log
    await (auditLog as any)(
      (session as any).user.id,
      'update_billing',
      'therapy_billing',
      sessionId,
      {
        status: data.status,
        paymentProcessed: !!data.paymentInfo,
        adjustmentsApplied: data.adjustments?.length || 0,
        fieldsUpdated: Object.keys(data).filter(k => k !== 'billingId'),
      },
      'success',
      req
    );
    
    return successResponse(
      {
        billingId: data.billingId,
        status: updatedBilling.status,
        balance: updatedBilling.balance,
        amountPaid: updatedBilling.amountPaid,
        updatedAt: new Date(),
      },
      'Billing record updated successfully'
    );
  } catch (error) {
    return errorResponse(error, 'Failed to update billing record');
  }
}

// Helper functions
function calculateTotalCharges(cptCodes: any[]): number {
  return cptCodes.reduce((total, code) => total + (code.units * code.rate), 0);
}

function calculateInsurancePayment(totalCharges: number, insurance: any): number {
  const { copay, deductible, deductibleMet, coinsurance } = insurance;
  
  // Calculate amount after deductible
  const deductibleRemaining = Math.max(0, deductible - deductibleMet);
  const afterDeductible = Math.max(0, totalCharges - deductibleRemaining);
  
  // Apply coinsurance
  const insurancePayment = afterDeductible * (1 - coinsurance / 100);
  
  // Account for copay (if applicable)
  return Math.max(0, insurancePayment - copay);
}

function calculateBalance(billing: any): number {
  const totalCharges = billing.totalCharges || 0;
  const amountPaid = billing.amountPaid || 0;
  const adjustments = billing.adjustments?.reduce((sum: number, adj: any) => {
    if (adj.type === 'writeoff' || adj.type === 'discount') {
      return sum + adj.amount;
    }
    return sum;
  }, 0) || 0;
  
  return Math.max(0, totalCharges - amountPaid - adjustments);
}