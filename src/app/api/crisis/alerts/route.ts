import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CrisisAlertSystem } from '@/lib/crisis-alert-system';
import { auditLog } from '@/lib/audit-logger';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Import missing types and functions
interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    role: string;
  };
}

interface AlertFilters {
  severity?: number[];
  status?: string[];
  userId?: string;
  counselorId?: string;
  handled?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

type AlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated' | 'false_positive';

interface AlertResponse {
  id: string;
  type: string;
  severity: string;
  userId: string;
  context: string;
  indicators: string[];
  handled: boolean;
  handledBy?: string;
  actions: string[];
  notes?: string;
  detectedAt: Date;
  handledAt?: Date;
}

interface ValidationError {
  field: string;
  message: string;
}

interface CreateAlertRequest {
  type: string;
  severity: number;
  userId: string;
  context: string;
  indicators: string[];
  metadata?: Record<string, any>;
}

interface UpdateAlertRequest {
  status?: string;
  handledBy?: string;
  notes?: string;
  actions?: string[];
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

interface CrisisResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: Date;
}

// Mock functions for missing imports
function withRateLimit(requests: number, windowMs: number) {
  return (handler: any) => handler;
}

function withCrisisCounselor(handler: any) {
  return handler;
}

function emitCrisisAlert(alert: any) {
  // WebSocket emission logic would go here
}

function notifyCounselors(event: string, data: any) {
  // WebSocket notification logic would go here
}

const CrisisEvents = {
  ALERT_UPDATED: 'alert_updated'
};

// Validation schemas
const createAlertSchema = z.object({
  type: z.string().min(1).max(100),
  severity: z.number().min(1).max(5),
  userId: z.string().uuid(),
  context: z.string().min(1).max(1000),
  indicators: z.array(z.string()).min(1).max(20),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateAlertSchema = z.object({
  status: z.enum(['new', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'false_positive']).optional(),
  handledBy: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  actions: z.array(z.string()).max(20).optional(),
});

// GET /api/crisis/alerts - Get alerts with filters
export async function GET(req: NextRequest) {
  return withRateLimit(60, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;

      // Parse filters
      const filters: AlertFilters = {
        severity: searchParams.get('severity')?.split(',').map(Number) || undefined,
        status: searchParams.get('status')?.split(',') as AlertStatus[] || undefined,
        userId: searchParams.get('userId') || undefined,
        counselorId: searchParams.get('counselorId') || undefined,
        handled: searchParams.get('handled') === 'true' ? true : 
                 searchParams.get('handled') === 'false' ? false : undefined,
        dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
        dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      };

      // Build where clause
      const where: any = {};
      
      if (filters.severity?.length) {
        where.severity = { in: filters.severity.map(s => s.toString()) };
      }
      
      if (filters.userId) {
        where.userId = filters.userId;
      }
      
      if (filters.counselorId) {
        where.handledBy = filters.counselorId;
      }
      
      if (filters.handled !== undefined) {
        where.handled = filters.handled;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        where.detectedAt = {};
        if (filters.dateFrom) where.detectedAt.gte = filters.dateFrom;
        if (filters.dateTo) where.detectedAt.lte = filters.dateTo;
      }

      // Fetch alerts with pagination
      const [alerts, total] = await Promise.all([
        prisma.safetyAlert.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { handled: 'asc' },
            { severity: 'desc' },
            { detectedAt: 'desc' }
          ],
        }),
        prisma.safetyAlert.count({ where }),
      ]);

      // Transform alerts for response
      const alertResponses: AlertResponse[] = alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        userId: alert.userId,
        context: alert.context,
        indicators: alert.indicators,
        handled: alert.handled,
        handledBy: alert.handledBy || undefined,
        actions: alert.actions,
        notes: alert.notes || undefined,
        detectedAt: alert.detectedAt,
        handledAt: alert.handledAt || undefined,
      }));

      // Log access
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'view_alerts',
          resource: 'safety_alert',
          details: JSON.stringify({
            filters,
            resultsCount: alerts.length,
          }),
          outcome: 'success',
        },
      }).catch(console.error);

      const response: PaginatedResponse<AlertResponse> = {
        data: alertResponses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'view_alerts',
          resource: 'safety_alert',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }
  })
  );
}

// POST /api/crisis/alerts - Create new alert
export async function POST(req: NextRequest) {
  return withRateLimit(10, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      
      // Validate request
      const validation = createAlertSchema.safeParse(body);
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

      const data: CreateAlertRequest = validation.data;

      // Check if user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Create alert
      const alert = await (prisma.safetyAlert as any).create({
        data: {
          id: crypto.randomUUID(),
          type: data.type,
          severity: data.severity.toString(),
          userId: data.userId,
          context: data.context,
          indicators: data.indicators,
          handled: false,
          actions: [],
        },
      });

      // Emit WebSocket notification to crisis counselors
      emitCrisisAlert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        userId: alert.userId,
        context: alert.context,
        indicators: alert.indicators,
        detectedAt: alert.detectedAt,
      });

      // Create notification for the user if severity is high
      if (data.severity >= 3) {
        await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: data.userId,
            type: 'crisis_alert',
            title: 'Crisis Support Available',
            message: 'Our crisis support team has been notified and is ready to help. You are not alone.',
            isPriority: true,
            metadata: JSON.stringify({ alertId: alert.id }),
          },
        }).catch(console.error);
      }

      // Log alert creation
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'create_alert',
          resource: 'safety_alert',
          resourceId: alert.id,
          details: JSON.stringify({
            type: data.type,
            severity: data.severity,
            targetUserId: data.userId,
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse<AlertResponse> = {
        success: true,
        data: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          userId: alert.userId,
          context: alert.context,
          indicators: alert.indicators,
          handled: alert.handled,
          actions: alert.actions,
          detectedAt: alert.detectedAt,
        },
        message: 'Alert created successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error('Error creating alert:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'create_alert',
          resource: 'safety_alert',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }
  })
  );
}

// PUT /api/crisis/alerts/[id] - Update alert
export async function PUT(req: NextRequest) {
  return withRateLimit(30, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      const body = await (req as any).json();
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const alertId = searchParams.get('id');

      if (!alertId) {
        return NextResponse.json(
          { error: 'Alert ID required' },
          { status: 400 }
        );
      }

      // Validate request
      const validation = updateAlertSchema.safeParse(body);
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

      const data: UpdateAlertRequest = validation.data;

      // Check if alert exists
      const existingAlert = await prisma.safetyAlert.findUnique({
        where: { id: alertId },
      });

      if (!existingAlert) {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }

      // Update alert
      const updateData: any = {};
      
      if (data.status) {
        // Map status to database fields
        if (data.status === 'resolved') {
          updateData.handled = true;
          updateData.handledAt = new Date();
        } else if (data.status === 'acknowledged') {
          updateData.handledBy = req.user!.id;
        }
      }
      
      if (data.handledBy) {
        updateData.handledBy = data.handledBy;
      }
      
      if (data.notes) {
        updateData.notes = data.notes;
      }
      
      if (data.actions) {
        updateData.actions = [...existingAlert.actions, ...data.actions];
      }

      const updatedAlert = await prisma.safetyAlert.update({
        where: { id: alertId },
        data: updateData,
      });

      // Notify via WebSocket
      notifyCounselors(CrisisEvents.ALERT_UPDATED, {
        alertId: updatedAlert.id,
        status: data.status,
        handledBy: updatedAlert.handledBy,
        updatedBy: req.user!.id,
      });

      // Log update
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'update_alert',
          resource: 'safety_alert',
          resourceId: alertId,
          details: JSON.stringify({
            updates: data,
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse<AlertResponse> = {
        success: true,
        data: {
          id: updatedAlert.id,
          type: updatedAlert.type,
          severity: updatedAlert.severity,
          userId: updatedAlert.userId,
          context: updatedAlert.context,
          indicators: updatedAlert.indicators,
          handled: updatedAlert.handled,
          handledBy: updatedAlert.handledBy || undefined,
          actions: updatedAlert.actions,
          notes: updatedAlert.notes || undefined,
          detectedAt: updatedAlert.detectedAt,
          handledAt: updatedAlert.handledAt || undefined,
        },
        message: 'Alert updated successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error updating alert:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'update_alert',
          resource: 'safety_alert',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }
  })
  );
}

// DELETE /api/crisis/alerts/[id] - Delete alert (admin only)
export async function DELETE(req: NextRequest) {
  return withRateLimit(10, 60000)(
  withCrisisCounselor(async (req: AuthenticatedRequest) => {
    try {
      // Additional check for admin role
      if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const alertId = searchParams.get('id');

      if (!alertId) {
        return NextResponse.json(
          { error: 'Alert ID required' },
          { status: 400 }
        );
      }

      // Check if alert exists
      const existingAlert = await prisma.safetyAlert.findUnique({
        where: { id: alertId },
      });

      if (!existingAlert) {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }

      // Delete alert
      await prisma.safetyAlert.delete({
        where: { id: alertId },
      });

      // Log deletion
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'delete_alert',
          resource: 'safety_alert',
          resourceId: alertId,
          details: JSON.stringify({
            deletedAlert: {
              type: existingAlert.type,
              severity: existingAlert.severity,
              userId: existingAlert.userId,
            },
          }),
          outcome: 'success',
        },
      });

      const response: CrisisResponse = {
        success: true,
        message: 'Alert deleted successfully',
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error deleting alert:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          action: 'delete_alert',
          resource: 'safety_alert',
          details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      );
    }
  })
  );
}