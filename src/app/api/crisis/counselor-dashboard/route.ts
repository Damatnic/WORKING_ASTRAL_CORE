import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from '@/lib/prisma';
import { withCrisisCounselor, withRateLimit, AuthenticatedRequest } from '@/lib/auth-middleware-exports';
import { decryptJSON } from '@/lib/encryption';
import { getActiveCounselorsCount, getIO } from '@/lib/websocket-exports';
import {
  CounselorDashboardResponse,
  CounselorStats,
  AlertResponse,
  ReportResponse,
  InterventionResponse,
  EscalationResponse
} from '@/types';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/crisis/counselor-dashboard - Get counselor dashboard data
export async function GET(request: NextRequest) {
  return withCrisisCounselor(request, async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch statistics in parallel
      const [
        activeAlerts,
        pendingReports,
        resolvedToday,
        myAlerts,
        recentAlerts,
        activeCounselorsCount,
        avgResponseTime
      ] = await Promise.all([
        // Active (unhandled) alerts count
        prisma.safetyAlert.count({
          where: { handled: false }
        }),
        
        // Pending reports count
        prisma.crisisReport.count({
          where: { resolved: false }
        }),
        
        // Resolved today count
        prisma.crisisReport.count({
          where: {
            resolved: true,
            resolvedAt: { gte: todayStart }
          }
        }),
        
        // My assigned alerts
        prisma.safetyAlert.findMany({
          where: {
            handledBy: userId,
            handled: false
          },
          take: 10,
          orderBy: { detectedAt: 'desc' }
        }),
        
        // Recent alerts (last 24 hours)
        prisma.safetyAlert.findMany({
          where: {
            detectedAt: { gte: last24Hours }
          },
          take: 20,
          orderBy: [
            { handled: 'asc' },
            { severity: 'desc' },
            { detectedAt: 'desc' }
          ]
        }),
        
        // Active counselors count (from WebSocket)
        getActiveCounselorsCount(),
        
        // Average response time for last 7 days
        prisma.crisisReport.aggregate({
          where: {
            createdAt: { gte: last7Days },
            responseTime: { gt: 0 }
          },
          _avg: {
            responseTime: true
          }
        })
      ]);

      // Get available counselors (those with active sessions in last hour)
      const availableCounselors = await prisma.user.count({
        where: {
          role: 'CRISIS_COUNSELOR',
          lastActiveAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
        }
      });

      // Get active interventions (simplified - using support sessions as proxy)
      const activeInterventions = await prisma.supportSession.findMany({
        where: {
          status: 'active',
          sessionType: 'crisis'
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      // Get pending escalations (high severity unhandled alerts)
      const pendingEscalations = await prisma.safetyAlert.findMany({
        where: {
          severity: { in: ['4', '5'] },
          handled: false
        },
        take: 10,
        orderBy: { detectedAt: 'desc' }
      });

      // Transform data for response
      const stats: CounselorStats = {
        activeAlerts,
        pendingReports,
        activeInterventions: activeInterventions.length,
        escalations: pendingEscalations.length,
        resolvedToday,
        averageResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        onlineCounselors: activeCounselorsCount,
        availableCounselors
      };

      // Transform alerts
      const alertResponses: AlertResponse[] = recentAlerts.map((alert: any) => ({
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

      // Transform my assignments
      const myAlertResponses: AlertResponse[] = myAlerts.map((alert: any) => ({
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

      // Transform interventions (simplified)
      const interventionResponses: InterventionResponse[] = activeInterventions.map(session => ({
        id: session.id,
        reportId: undefined,
        userId: session.userId || '',
        counselorId: session.helperId || undefined,
        type: 'counselor_chat' as any,
        priority: 3,
        status: 'in_progress' as any,
        requestedAt: session.createdAt,
        startedAt: session.startedAt || undefined,
        completedAt: session.endedAt || undefined,
        followUpRequired: false,
      }));

      // Transform escalations (simplified)
      const escalationResponses: EscalationResponse[] = pendingEscalations.map(alert => ({
        id: alert.id,
        alertId: alert.id,
        escalatedBy: 'system',
        reason: `High severity alert: ${alert.type}`,
        urgency: parseInt(alert.severity),
        requestedAction: 'immediate_response',
        status: 'pending',
        createdAt: alert.detectedAt,
      }));

      // Check system status
      const systemStatus = {
        websocketConnected: !!getIO(),
        databaseHealthy: true, // We got here, so DB is working
        emergencyServicesAvailable: true, // Would integrate with actual emergency service API
      };

      // Log dashboard access
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId,
          action: 'view_counselor_dashboard',
          resource: 'crisis_dashboard',
          details: {
            stats,
          },
          outcome: 'success',
        },
      }).catch(console.error);

      const response: CounselorDashboardResponse = {
        stats,
        recentAlerts: alertResponses,
        activeInterventions: interventionResponses,
        pendingEscalations: escalationResponses,
        myAssignments: {
          alerts: myAlertResponses,
          interventions: [], // Would be populated with actual intervention assignments
        },
        systemStatus,
      };

      return NextResponse.json({
        success: true,
        data: response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching counselor dashboard:', error);
      
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,userId: req.user!.id,
          action: 'view_counselor_dashboard',
          resource: 'crisis_dashboard',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          outcome: 'failure',
        },
      }).catch(console.error);

      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }
  });
}