import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth-middleware';
import {
  createAuditLog,
  successResponse,
  errorResponse,
  getClientIp,
} from '@/lib/api-utils';

// GET /api/admin/analytics - Get comprehensive analytics data
export const GET = withAdmin(async (req) => {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const period = searchParams.get('period') || '30d';
    const metric = searchParams.get('metric') || 'all';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Collect analytics data based on requested metrics
    const analytics: any = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
    
    // User analytics
    if (metric === 'all' || metric === 'users') {
      const [
        totalUsers,
        activeUsers,
        newUsers,
        verifiedUsers,
        usersByRole,
        userGrowth,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        
        // Active users (logged in within period)
        prisma.user.count({
          where: {
            lastActiveAt: { gte: startDate },
          },
        }),
        
        // New users
        prisma.user.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Verified users
        prisma.user.count({
          where: {
            isEmailVerified: true,
          },
        }),
        
        // Users by role
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
        
        // User growth over time
        prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
          FROM "User"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,
      ]);
      
      analytics.users = {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        verified: verifiedUsers,
        byRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item.role] = item._count;
          return acc;
        }, {}),
        growth: userGrowth,
        retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0,
      };
    }
    
    // Mental health analytics
    if (metric === 'all' || metric === 'mentalHealth') {
      const [
        totalMoodEntries,
        avgMoodScore,
        moodTrends,
        journalEntries,
        safetyPlans,
        crisisReports,
      ] = await Promise.all([
        // Total mood entries
        prisma.moodEntry.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Average mood score
        prisma.moodEntry.aggregate({
          where: {
            createdAt: { gte: startDate },
          },
          _avg: {
            moodScore: true,
            anxietyLevel: true,
            energyLevel: true,
          },
        }),
        
        // Mood trends over time
        prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            AVG(mood_score) as avg_mood,
            AVG(anxiety_level) as avg_anxiety,
            AVG(energy_level) as avg_energy,
            COUNT(*) as entries
          FROM "MoodEntry"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,
        
        // Journal entries
        prisma.journalEntry.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Active safety plans
        prisma.safetyPlan.count({
          where: {
            isActive: true,
          },
        }),
        
        // Crisis reports
        prisma.crisisReport.groupBy({
          by: ['severityLevel'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
      ]);
      
      analytics.mentalHealth = {
        moodEntries: totalMoodEntries,
        averages: {
          mood: avgMoodScore._avg.moodScore?.toFixed(2) || 0,
          anxiety: avgMoodScore._avg.anxietyLevel?.toFixed(2) || 0,
          energy: avgMoodScore._avg.energyLevel?.toFixed(2) || 0,
        },
        trends: moodTrends,
        journalEntries,
        activeSafetyPlans: safetyPlans,
        crisisReports: crisisReports.reduce((acc: any, item: any) => {
          acc[`level_${item.severityLevel}`] = item._count;
          return acc;
        }, {}),
      };
    }
    
    // Support analytics
    if (metric === 'all' || metric === 'support') {
      const [
        totalSessions,
        sessionsByType,
        avgSessionRating,
        helpers,
        appointments,
      ] = await Promise.all([
        // Total support sessions
        prisma.supportSession.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Sessions by type
        prisma.supportSession.groupBy({
          by: ['sessionType', 'status'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
        
        // Average session rating
        prisma.supportSession.aggregate({
          where: {
            rating: { not: null },
            createdAt: { gte: startDate },
          },
          _avg: {
            rating: true,
          },
        }),
        
        // Active helpers
        prisma.helperProfile.count({
          where: {
            acceptingClients: true,
            isVerified: true,
          },
        }),
        
        // Appointments
        prisma.appointment.groupBy({
          by: ['status'],
          where: {
            scheduledAt: { gte: startDate },
          },
          _count: true,
        }),
      ]);
      
      analytics.support = {
        totalSessions,
        sessionsByType: sessionsByType.reduce((acc: any, item: any) => {
          const key = `${item.sessionType}_${item.status}`;
          acc[key] = item._count;
          return acc;
        }, {}),
        averageRating: avgSessionRating._avg.rating?.toFixed(2) || 0,
        activeHelpers: helpers,
        appointments: appointments.reduce((acc: any, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
      };
    }
    
    // Community analytics
    if (metric === 'all' || metric === 'community') {
      const [
        totalPosts,
        activeChatRooms,
        supportGroups,
        challenges,
      ] = await Promise.all([
        // Community posts
        prisma.communityPost.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Active chat rooms
        prisma.chatRoom.count({
          where: {
            isActive: true,
            lastActivity: { gte: startDate },
          },
        }),
        
        // Support groups
        prisma.supportGroup.count({
          where: {
            isActive: true,
          },
        }),
        
        // Active wellness challenges
        prisma.wellnessChallenge.count({
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        }),
      ]);
      
      analytics.community = {
        posts: totalPosts,
        activeChatRooms,
        supportGroups,
        activeWellnessChallenges: challenges,
      };
    }
    
    // System health analytics
    if (metric === 'all' || metric === 'system') {
      const [
        auditLogs,
        failedLogins,
        moderationActions,
        safetyAlerts,
      ] = await Promise.all([
        // Audit logs by action
        prisma.auditLog.groupBy({
          by: ['action', 'outcome'],
          where: {
            timestamp: { gte: startDate },
          },
          _count: true,
        }),
        
        // Failed login attempts
        prisma.auditLog.count({
          where: {
            action: 'login_failed',
            timestamp: { gte: startDate },
          },
        }),
        
        // Moderation actions
        prisma.moderationAction.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // Safety alerts
        prisma.safetyAlert.groupBy({
          by: ['severity', 'handled'],
          where: {
            detectedAt: { gte: startDate },
          },
          _count: true,
        }),
      ]);
      
      analytics.system = {
        auditLogs: auditLogs.reduce((acc: any, item: any) => {
          const key = `${item.action}_${item.outcome}`;
          acc[key] = item._count;
          return acc;
        }, {}),
        failedLogins,
        moderationActions,
        safetyAlerts: safetyAlerts.reduce((acc: any, item: any) => {
          const key = `${item.severity}_${item.handled ? 'handled' : 'pending'}`;
          acc[key] = item._count;
          return acc;
        }, {}),
      };
    }
    
    // Performance metrics
    if (metric === 'all' || metric === 'performance') {
      // Database size and performance
      const dbStats = await prisma.$queryRaw`
        SELECT 
          pg_database_size(current_database()) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections
      `;
      
      analytics.performance = {
        database: dbStats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
    }
    
    // Log analytics access
    await createAuditLog({
      userId: req.user?.id,
      action: 'admin.analytics.view',
      resource: 'analytics',
      details: {
        period,
        metric,
      },
      outcome: 'success',
      ipAddress: getClientIp(req),
      userAgent: ((req as any).headers || req).get('user-agent') || undefined,
    });
    
    return successResponse(analytics, 200);
  } catch (error) {
    console.error('Admin analytics error:', error);
    return errorResponse('Failed to fetch analytics', 500);
  }
});