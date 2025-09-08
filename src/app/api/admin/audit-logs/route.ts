import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// RBAC middleware
async function checkAdminAccess() {
  const session = await getServerSession(authOptions) as Session | null;
  
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Use the session.user properties directly since they're extended
  if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id };
}

// GET audit logs
export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Get total count
    const totalCount = await prisma.auditLog.count({ where });

    // Fetch audit logs
    const logs = await prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Format response
    const formattedLogs = logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.User?.email,
      userRole: log.User?.role,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp.toISOString()
    }));

    // Get action statistics
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        id: true
      },
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    return NextResponse.json({
      logs: formattedLogs,
      statistics: {
        totalLogs: totalCount,
        topActions: actionStats.map((stat: any) => ({
          action: stat.action,
          count: stat._count.id
        }))
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST create audit log entry (internal use)
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await (req as any).json();
    const { action, details } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Create audit log entry
    const log = await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
        userId: authCheck.adminId,
        action,
        resource: 'audit_log',
        details: details || {},
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || ((req as any).headers || req).get('x-real-ip') || 'unknown',
        userAgent: ((req as any).headers || req).get('user-agent') || 'unknown',
        outcome: 'success',
        timestamp: new Date(),
      }
    });

    return NextResponse.json({
      message: 'Audit log created successfully',
      logId: log.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

// Export audit logs (admin only)
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await (req as any).json();
    const { format = 'json', startDate, endDate } = body;

    // Build where clause for export
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Fetch all logs for export
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Log the export action
    await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
        userId: authCheck.adminId,
        action: 'EXPORT_AUDIT_LOGS',
        resource: 'audit_logs',
        details: {
          format,
          startDate,
          endDate,
          recordCount: logs.length
        },
        ipAddress: ((req as any).headers || req).get('x-forwarded-for') || 'unknown',
        userAgent: ((req as any).headers || req).get('user-agent') || 'unknown',
        outcome: 'success',
        timestamp: new Date(),
      }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['ID', 'Date', 'User ID', 'Username', 'Email', 'Role', 'Action', 'Details', 'IP Address'];
      const csvRows = logs.map((log: any) => [
        log.id,
        log.timestamp.toISOString(),
        log.userId,
        log.User?.email || '',
        log.User?.role || '',
        log.action,
        JSON.stringify(log.details),
        log.ipAddress
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
        }
      });
    }

    // Default to JSON format
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      recordCount: logs.length,
      logs: logs.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        userId: log.userId,
        userEmail: log.User?.email,
        userRole: log.User?.role,
        action: log.action,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      }))
    });

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}