import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { withCrisisCounselor, withRateLimit, AuthenticatedRequest, withAuth } from '@/lib/auth-middleware';
import { encryptJSON, decryptJSON, maskSensitiveData } from '@/lib/encryption';
import { notifyCounselors, CrisisEvents } from '@/lib/websocket';
import { 
  CrisisCreateReportRequest as CreateReportRequest, 
  CrisisUpdateReportRequest as UpdateReportRequest, 
  ReportResponse, 
  CrisisResponse,
  ReportStatus,
  CrisisReportFilters as ReportFilters,
  PaginatedResponse,
  CrisisValidationError as ValidationError,
  CrisisSeverity,
  TriggerType,
  InterventionType
} from '@/types';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
const createReportSchema = z.object({
  severityLevel: z.number().min(1).max(5),
  triggerType: z.enum([
    'self_harm', 'suicidal_ideation', 'anxiety_attack', 'panic_attack',
    'depression_episode', 'substance_use', 'trauma_trigger', 
    'relationship_crisis', 'financial_stress', 'grief_loss', 'other'
  ]),
  interventionType: z.enum([
    'self_help', 'peer_support', 'counselor_chat', 
    'counselor_call', 'emergency_services', 'wellness_check'
  ]),
  details: z.object({
    description: z.string().min(1).max(5000),
    symptoms: z.array(z.string()).max(20),
    duration: z.string().max(100),
    previousIncidents: z.boolean().optional(),
    currentMedications: z.array(z.string()).max(20).optional(),
    emergencyContacts: z.array(z.object({
      name: z.string().max(100),
      relationship: z.string().max(50),
      phone: z.string().max(20),
    })).max(5).optional(),
  }),
  isAnonymous: z.boolean().optional(),
});

const updateReportSchema = z.object({
  status: z.enum(['pending', 'under_review', 'active', 'resolved', 'closed']).optional(),
  resolved: z.boolean().optional(),
  resolvedAt: z.string().datetime().optional(),
  responseNotes: z.string().max(2000).optional(),
  followUpRequired: z.boolean().optional(),
  referralMade: z.boolean().optional(),
});

// GET /api/crisis/reports - Get reports with filters
export const GET = withRateLimit(60, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      
      // Check permissions
      const canViewAllReports = [
        UserRole.CRISIS_COUNSELOR, 
        UserRole.ADMIN, 
        UserRole.SUPER_ADMIN
      ].includes(user.role as UserRole);
      
      const canViewLimitedReports = [
        UserRole.THERAPIST,
        UserRole.HELPER
      ].includes(user.role as UserRole);

      if (!canViewAllReports && !canViewLimitedReports) {
        // Regular users can only view their own reports
        searchParams.set('userId', user.id);
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;

      // Parse filters
      const filters: ReportFilters = {
        severityLevel: searchParams.get('severityLevel')?.split(',').map(Number) || undefined,
        triggerType: searchParams.get('triggerType')?.split(',') as TriggerType[] || undefined,
        status: searchParams.get('status')?.split(',') as ReportStatus[] || undefined,
        userId: searchParams.get('userId') || undefined,
        resolved: searchParams.get('resolved') === 'true' ? true : 
                  searchParams.get('resolved') === 'false' ? false : undefined,
        dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
        dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      };

      // Build where clause
      const where: any = {};
      
      if (filters.severityLevel?.length) {
        where.severityLevel = { in: filters.severityLevel };
      }
      
      if (filters.triggerType?.length) {
        where.triggerType = { in: filters.triggerType };
      }
      
      if (filters.userId) {
        where.userId = filters.userId;
      } else if (!canViewAllReports) {
        // Limit to user's own reports or assigned reports for helpers/therapists
        where.userId = user.id;
      }
      
      if (filters.resolved !== undefined) {
        where.resolved = filters.resolved;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      // Fetch reports with pagination
      const [reports, total] = await Promise.all([
        prisma.crisisReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { resolved: 'asc' },
            { severityLevel: 'desc' },
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
        prisma.crisisReport.count({ where }),
      ]);

      // Transform reports for response
      const reportResponses: ReportResponse[] = await Promise.all(
        reports.map(async (report) => {
          const response: ReportResponse = {
            id: report.id,
            userId: report.userId || undefined,
            severityLevel: report.severityLevel,
            triggerType: report.triggerType,
            interventionType: report.interventionType,
            responseTime: report.responseTime,
            resolved: report.resolved,
            resolvedAt: report.resolvedAt || undefined,
            emergencyContactUsed: report.emergencyContactUsed,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
          };

          // Decrypt details only for authorized users
          if (canViewAllReports || report.userId === user.id) {
            try {
              const decryptedDetails = decryptJSON(
                report.encryptedDetails as string,
                report.id
              );
              
              // Mask sensitive data if not crisis counselor or admin
              if (!canViewAllReports) {
                if (decryptedDetails.emergencyContacts) {
                  decryptedDetails.emergencyContacts = decryptedDetails.emergencyContacts.map((contact: any) => ({
                    ...contact,
                    phone: maskSensitiveData(contact.phone, 'phone'),
                  }));
                }
              }
              
              response.details = decryptedDetails;
            } catch (error) {
              console.error('Failed to decrypt report details:', error);
            }
          }

          return response;
        })
      );

      // Log access
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
          action: 'view_reports',
          resource: 'crisis_report',
          details: {
            filters,
            resultsCount: reports.length,
            accessLevel: canViewAllReports ? 'full' : canViewLimitedReports ? 'limited' : 'own',
          },
          outcome: 'success',
        },
      }).catch(console.error);

      const response: PaginatedResponse<ReportResponse> = {
        data: reportResponses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      console.error('Error fetching reports:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'view_reports',
          resource: 'crisis_report',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }
  })
);

// POST /api/crisis/reports - Create new report
export const POST = withRateLimit(5, 60000)(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const user = req.user!;
      const body = await (req as any).json();
      
      // Validate request
      const validation = createReportSchema.safeParse(body);
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

      const data: CreateReportRequest = validation.data as any;

      // Calculate response time (time from creation to first response)
      const startTime = Date.now();

      // Encrypt sensitive details
      const encryptedDetails = encryptJSON(data.details, user.id);

      // Create report
      const report = await (prisma.crisisReport as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: data.isAnonymous ? null : user.id,
          severityLevel: data.severityLevel,
          triggerType: data.triggerType,
          interventionType: data.interventionType,
          encryptedDetails,
          responseTime: 0, // Will be updated when first response is received
          resolved: false,
          emergencyContactUsed: false,
        },
      });

      // Create safety alert for high severity reports
      if (data.severityLevel >= 3) {
        await (prisma.safetyAlert as any).create({
        data: {
          id: generatePrismaCreateFields().id,type: 'crisis_report',
            severity: data.severityLevel.toString(),
            userId: user.id ,
            context: `Crisis report: ${data.triggerType}`,
            indicators: data.details.symptoms,
            handled: false,
            actions: [],
          },
        });

        // Notify crisis counselors via WebSocket
        notifyCounselors((CrisisEvents as any).REPORT_CREATED as any, {
          reportId: report.id,
          severityLevel: data.severityLevel,
          triggerType: data.triggerType,
          userId: data.isAnonymous ? null : user.id,
          timestamp: new Date(),
        });
      }

      // Create notification for user
      await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
          type: 'crisis_report_received',
          title: 'Crisis Report Received',
          message: 'Your crisis report has been received. Support is on the way.',
          isPriority: data.severityLevel >= 3,
          metadata: JSON.stringify({ reportId: report.id }),
        },
      }).catch(console.error);

      // Log report creation
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
          action: 'create_report',
          resource: 'crisis_report',
          resourceId: report.id,
          details: {
            severityLevel: data.severityLevel,
            triggerType: data.triggerType,
            interventionType: data.interventionType,
            isAnonymous: data.isAnonymous,
          },
          outcome: 'success',
        },
      });

      const response: CrisisResponse<ReportResponse> = {
        success: true,
        data: {
          id: report.id,
          userId: data.isAnonymous ? undefined : user.id,
          severityLevel: report.severityLevel,
          triggerType: report.triggerType,
          interventionType: report.interventionType,
          responseTime: report.responseTime,
          resolved: report.resolved,
          emergencyContactUsed: report.emergencyContactUsed,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          details: data.details, // Return unencrypted details to the creator
        },
        message: 'Crisis report created successfully. Support is being mobilized.',
        timestamp: new Date(),
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error('Error creating report:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'create_report',
          resource: 'crisis_report',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }
  })
);

// PUT /api/crisis/reports/[id] - Update report
export const PUT = withRateLimit(30, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const reportId = searchParams.get('id');

      if (!reportId) {
        return NextResponse.json(
          { error: 'Report ID required' },
          { status: 400 }
        );
      }

      // Validate request
      const validation = updateReportSchema.safeParse(body);
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

      const data: UpdateReportRequest = validation.data as any;

      // Check if report exists
      const existingReport = await prisma.crisisReport.findUnique({
        where: { id: reportId },
      });

      if (!existingReport) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      // Calculate response time if this is the first response
      const updateData: any = {};
      
      if (!existingReport.responseTime && !existingReport.resolved) {
        const responseTime = Math.floor(
          (Date.now() - existingReport.createdAt.getTime()) / 1000
        );
        updateData.responseTime = responseTime;
      }
      
      if (data.resolved !== undefined) {
        updateData.resolved = data.resolved;
      }
      
      if (data.resolvedAt) {
        updateData.resolvedAt = new Date(data.resolvedAt);
      }
      
      if (data.responseNotes) {
        // Encrypt response notes
        const existingDetails = decryptJSON(
          existingReport.encryptedDetails as string,
          existingReport.id
        );
        existingDetails.responseNotes = data.responseNotes;
        existingDetails.followUpRequired = data.followUpRequired;
        existingDetails.referralMade = data.referralMade;
        
        updateData.encryptedDetails = encryptJSON(existingDetails, existingReport.id);
      }

      // Update report
      const updatedReport = await prisma.crisisReport.update({
        where: { id: reportId },
        data: updateData,
      });

      // Notify via WebSocket
      notifyCounselors('crisis:report:updated' as any, {
        reportId: updatedReport.id,
        status: data.status,
        resolved: updatedReport.resolved,
        updatedBy: req.user!.id,
      });

      // Notify user if report is resolved
      if (data.resolved && existingReport.userId) {
        await (prisma.notification as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: existingReport.userId,
            type: 'crisis_report_resolved',
            title: 'Crisis Report Resolved',
            message: 'Your crisis report has been resolved. Thank you for reaching out.',
            metadata: JSON.stringify({ reportId: updatedReport.id }),
          },
        }).catch(console.error);
      }

      // Log update
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'update_report',
          resource: 'crisis_report',
          resourceId: reportId,
          details: {
            updates: data,
            responseTime: updateData.responseTime,
          },
          outcome: 'success',
        },
      });

      const response: CrisisResponse<ReportResponse> = {
        success: true,
        data: {
          id: updatedReport.id,
          userId: updatedReport.userId || undefined,
          severityLevel: updatedReport.severityLevel,
          triggerType: updatedReport.triggerType,
          interventionType: updatedReport.interventionType,
          responseTime: updatedReport.responseTime,
          resolved: updatedReport.resolved,
          resolvedAt: updatedReport.resolvedAt || undefined,
          emergencyContactUsed: updatedReport.emergencyContactUsed,
          createdAt: updatedReport.createdAt,
          updatedAt: updatedReport.updatedAt,
        },
        message: 'Report updated successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      console.error('Error updating report:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'update_report',
          resource: 'crisis_report',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }
  })
);