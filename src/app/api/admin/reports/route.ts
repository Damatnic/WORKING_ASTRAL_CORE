import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth-middleware';
import {
  createAuditLog,
  validateRequest,
  getPaginationParams,
  getPaginationMeta,
  successResponse,
  errorResponse,
  getClientIp,
  formatForExport,
} from '@/lib/api-utils';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/admin/reports - Get system reports and audit logs
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const reportType = searchParams.get('type') || 'audit';
    const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'desc' } = getPaginationParams(searchParams);
    const format = searchParams.get('format') || 'json';
    
    // Date range filters
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date();
    
    let reportData: any = {};
    
    switch (reportType) {
      case 'audit': {
        // Audit logs report
        const where: any = {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        };
        
        // Filter by action if specified
        const action = searchParams.get('action');
        if (action) {
          where.action = action;
        }
        
        // Filter by outcome if specified
        const outcome = searchParams.get('outcome');
        if (outcome) {
          where.outcome = outcome;
        }
        
        // Filter by user if specified
        const userId = searchParams.get('userId');
        if (userId) {
          where.userId = userId;
        }
        
        const [total, logs] = await Promise.all([
          prisma.auditLog.count({ where }),
          prisma.auditLog.findMany({
            where,
            include: {
              User: {
                select: {
                  email: true,
                  displayName: true,
                  role: true,
                },
              },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortBy as string]: sortOrder },
          }),
        ]);
        
        reportData = {
          type: 'audit',
          dateRange: { startDate, endDate },
          data: logs.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            outcome: log.outcome,
            user: log.User ? {
              id: log.userId,
              email: log.User.email,
              name: log.User.displayName,
              role: log.User.role,
            } : null,
            details: log.details,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
          })),
          meta: getPaginationMeta(total, page, limit),
        };
        break;
      }
      
      case 'crisis': {
        // Crisis reports
        const where: any = {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        };
        
        const severityLevel = searchParams.get('severityLevel');
        if (severityLevel) {
          where.severityLevel = parseInt(severityLevel);
        }
        
        const [total, reports] = await Promise.all([
          prisma.crisisReport.count({ where }),
          prisma.crisisReport.findMany({
            where,
            include: {
              User: {
                select: {
                  anonymousId: true,
                  role: true,
                },
              },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortBy as string]: sortOrder },
          }),
        ]);
        
        reportData = {
          type: 'crisis',
          dateRange: { startDate, endDate },
          data: reports.map(report => ({
            id: report.id,
            createdAt: report.createdAt,
            severityLevel: report.severityLevel,
            triggerType: report.triggerType,
            interventionType: report.interventionType,
            responseTime: report.responseTime,
            resolved: report.resolved,
            resolvedAt: report.resolvedAt,
            emergencyContactUsed: report.emergencyContactUsed,
            userAnonymousId: report.User?.anonymousId,
          })),
          meta: getPaginationMeta(total, page, limit),
        };
        break;
      }
      
      case 'moderation': {
        // Moderation actions report
        const where: any = {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        };
        
        const actionType = searchParams.get('actionType');
        if (actionType) {
          where.type = actionType;
        }
        
        const [total, actions] = await Promise.all([
          prisma.moderationAction.count({ where }),
          prisma.moderationAction.findMany({
            where,
            include: {
              AnonymousIdentity_ModerationAction_moderatorIdToAnonymousIdentity: {
                select: {
                  displayName: true,
                },
              },
              AnonymousIdentity_ModerationAction_targetUserIdToAnonymousIdentity: {
                select: {
                  displayName: true,
                },
              },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortBy as string]: sortOrder },
          }),
        ]);
        
        reportData = {
          type: 'moderation',
          dateRange: { startDate, endDate },
          data: actions.map(action => ({
            id: action.id,
            createdAt: action.createdAt,
            type: action.type,
            reason: action.reason,
            evidence: action.evidence,
            duration: action.duration,
            appealable: action.appealable,
            appealed: action.appealed,
            expiresAt: action.expiresAt,
            moderator: action.AnonymousIdentity_ModerationAction_moderatorIdToAnonymousIdentity?.displayName,
            targetUser: action.AnonymousIdentity_ModerationAction_targetUserIdToAnonymousIdentity?.displayName,
          })),
          meta: getPaginationMeta(total, page, limit),
        };
        break;
      }
      
      case 'safety': {
        // Safety alerts report
        const where: any = {
          detectedAt: {
            gte: startDate,
            lte: endDate,
          },
        };
        
        const severity = searchParams.get('severity');
        if (severity) {
          where.severity = severity;
        }
        
        const handled = searchParams.get('handled');
        if (handled !== null) {
          where.handled = handled === 'true';
        }
        
        const [total, alerts] = await Promise.all([
          prisma.safetyAlert.count({ where }),
          prisma.safetyAlert.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortBy as string]: sortOrder },
          }),
        ]);
        
        reportData = {
          type: 'safety',
          dateRange: { startDate, endDate },
          data: alerts.map(alert => ({
            id: alert.id,
            detectedAt: alert.detectedAt,
            type: alert.type,
            severity: alert.severity,
            context: alert.context,
            indicators: alert.indicators,
            handled: alert.handled,
            handledAt: alert.handledAt,
            handledBy: alert.handledBy,
            actions: alert.actions,
            notes: alert.notes,
          })),
          meta: getPaginationMeta(total, page, limit),
        };
        break;
      }
      
      case 'user-activity': {
        // User activity report
        const activeUsers = await prisma.user.findMany({
          where: {
            lastActiveAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            lastLoginAt: true,
            lastActiveAt: true,
            _count: {
              select: {
                MoodEntry: {
                  where: {
                    createdAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                JournalEntry: {
                  where: {
                    createdAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                Appointment: {
                  where: {
                    createdAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { lastActiveAt: 'desc' },
        });
        
        const total = await prisma.user.count({
          where: {
            lastActiveAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
        
        reportData = {
          type: 'user-activity',
          dateRange: { startDate, endDate },
          data: activeUsers.map(user => ({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            lastLoginAt: user.lastLoginAt,
            lastActiveAt: user.lastActiveAt,
            activity: {
              moodEntries: user._count.MoodEntry,
              journalEntries: user._count.JournalEntry,
              appointments: user._count.Appointment,
            },
          })),
          meta: getPaginationMeta(total, page, limit),
        };
        break;
      }
      
      default:
        return errorResponse('Invalid report type', 400);
    }
    
    // Format for export if requested
    if (format === 'csv' && reportData.data) {
      const csvData = formatForExport(reportData.data, 'csv');
      
      await createAuditLog({
        userId: req.user?.id,
        action: 'admin.reports.export',
        resource: 'reports',
        details: {
          reportType,
          format,
          dateRange: { startDate, endDate },
        },
        outcome: 'success',
        ipAddress: getClientIp(req),
        userAgent: ((req as any).headers || req).get('user-agent') || undefined,
      });
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${Date.now()}.csv"`,
        },
      });
    }
    
    // Log report access
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.reports.view',
      resource: 'reports',
      details: {
        reportType,
        dateRange: { startDate, endDate },
        filters: Object.fromEntries(searchParams.entries()),
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(reportData, 200);
  } catch (error) {
    console.error('Admin reports error:', error);
    return errorResponse('Failed to generate report', 500);
  }
  });
}

// POST /api/admin/reports - Create a custom report or schedule report generation
const createReportSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['audit', 'crisis', 'moderation', 'safety', 'user-activity', 'custom']),
  description: z.string().max(500).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    sendTo: z.array(z.string().email()),
  }).optional(),
  query: z.string().optional(), // For custom SQL queries (super admin only)
});

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req) => {
  try {
    const body = await (req as any).json();
    const validation = validateRequest(body, createReportSchema);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const data = validation.data;
    
    // Custom SQL queries only for super admins
    if (data.query && req.user?.role !== 'SUPER_ADMIN') {
      return errorResponse('Custom queries require super admin privileges', 403);
    }
    
    // Generate report ID
    const reportId = crypto.randomUUID();
    
    // Store report configuration (in a real app, this would be in a database)
    const reportConfig = {
      id: reportId,
      name: data.name,
      type: data.type,
      description: data.description,
      filters: data.filters,
      schedule: data.schedule,
      createdBy: req.user?.id,
      createdAt: new Date().toISOString(),
    };
    
    // If scheduled, create a scheduled job (in production, use a job queue)
    if (data.schedule) {
      // This would typically integrate with a job scheduler like Bull or Agenda
      console.log('Scheduled report created:', reportConfig);
    }
    
    // Log report creation
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.reports.create',
      resource: 'reports',
      resourceId: reportId,
      details: {
        name: data.name,
        type: data.type,
        scheduled: !!data.schedule,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse({
      message: 'Report created successfully',
      reportId,
      config: reportConfig,
    }, 201);
  } catch (error) {
    console.error('Report creation error:', error);
    return errorResponse('Failed to create report', 500);
  }
  });
}