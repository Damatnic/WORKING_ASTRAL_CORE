import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/crisis/stats - Get crisis statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true, id: true }
    });

    if (!user || !['CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'THERAPIST'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get date ranges
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));

    // Get total interventions (crisis reports) this week
    const totalInterventions = await prisma.crisisReport.count({
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    });

    // Get total interventions last week for comparison
    const lastWeekInterventions = await prisma.crisisReport.count({
      where: {
        createdAt: {
          gte: lastWeekStart,
          lte: lastWeekEnd
        }
      }
    });

    // Get active clients (unresolved crisis reports)
    const activeClients = await prisma.crisisReport.count({
      where: {
        resolved: false
      }
    });

    // Get high risk clients
    const highRiskClients = await prisma.crisisReport.count({
      where: {
        severityLevel: { gte: 7 },
        resolved: false
      }
    });

    // Calculate average response time
    const responseTimeData = await prisma.crisisReport.aggregate({
      _avg: {
        responseTime: true
      },
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    });

    // Get successful de-escalations (resolved cases with severity < 8)
    const successfulDeEscalations = await prisma.crisisReport.count({
      where: {
        resolved: true,
        severityLevel: { lt: 8 },
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    });

    // Get referrals made (assuming referral is stored in encryptedDetails)
    const referralReports = await prisma.crisisReport.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      select: {
        encryptedDetails: true
      }
    });

    const referralsMade = referralReports.filter(report => {
      const details = report.encryptedDetails as any;
      return details?.referrals && details.referrals.length > 0;
    }).length;

    // Get hospitalizations this week (emergency contact used or high severity resolved)
    const hospitalizationsThisWeek = await prisma.crisisReport.count({
      where: {
        OR: [
          { emergencyContactUsed: true },
          { 
            severityLevel: { gte: 9 },
            resolved: true
          }
        ],
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    });

    // Get follow-ups due (checking encryptedDetails for nextFollowUp)
    const upcomingFollowUps = await prisma.crisisReport.findMany({
      where: {
        resolved: false
      },
      select: {
        encryptedDetails: true
      }
    });

    const followUpsDue = upcomingFollowUps.filter(report => {
      const details = report.encryptedDetails as any;
      if (details?.nextFollowUp) {
        const followUpDate = new Date(details.nextFollowUp);
        return followUpDate <= new Date(Date.now() + 48 * 60 * 60 * 1000); // Due within 48 hours
      }
      return false;
    }).length;

    // Calculate trends
    const interventionTrend = lastWeekInterventions > 0 
      ? Math.round(((totalInterventions - lastWeekInterventions) / lastWeekInterventions) * 100)
      : 0;

    // Get additional metrics for detailed stats
    const criticalAlerts = await prisma.safetyAlert.count({
      where: {
        severity: 'critical',
        handled: false
      }
    });

    const activeCounselors = await prisma.user.count({
      where: {
        role: 'CRISIS_COUNSELOR',
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Active in last 24 hours
        }
      }
    });

    // Get intervention types breakdown
    const interventionTypes = await prisma.crisisReport.groupBy({
      by: ['interventionType'],
      _count: true,
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    });

    // Get risk level distribution
    const severityDistribution = await prisma.crisisReport.groupBy({
      by: ['severityLevel'],
      _count: true,
      where: {
        resolved: false
      }
    });

    const riskLevelDistribution = {
      low: severityDistribution.filter(s => s.severityLevel <= 3).reduce((sum, s) => sum + s._count, 0),
      moderate: severityDistribution.filter(s => s.severityLevel > 3 && s.severityLevel <= 6).reduce((sum, s) => sum + s._count, 0),
      high: severityDistribution.filter(s => s.severityLevel > 6 && s.severityLevel < 9).reduce((sum, s) => sum + s._count, 0),
      imminent: severityDistribution.filter(s => s.severityLevel >= 9).reduce((sum, s) => sum + s._count, 0)
    };

    return NextResponse.json({
      stats: {
        totalInterventions,
        activeClients,
        highRiskClients,
        avgResponseTime: responseTimeData._avg.responseTime || 0,
        successfulDeEscalations,
        referralsMade,
        hospitalizationsThisWeek,
        followUpsDue,
        criticalAlerts,
        activeCounselors
      },
      trends: {
        interventions: interventionTrend,
        activeClientsChange: 0, // Would need historical data
        highRiskChange: 0 // Would need historical data
      },
      breakdown: {
        interventionTypes: interventionTypes.map(type => ({
          type: type.interventionType,
          count: type._count
        })),
        riskLevels: riskLevelDistribution
      },
      period: {
        start: weekStart,
        end: weekEnd
      }
    });
  } catch (error) {
    console.error('Error fetching crisis statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}