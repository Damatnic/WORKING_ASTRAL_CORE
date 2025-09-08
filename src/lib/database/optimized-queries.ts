/**
 * Optimized Query Builders for AstralCore Mental Health Platform
 * 
 * This module provides highly optimized, pre-built query patterns for common operations
 * in the mental health platform, focusing on:
 * - User search and discovery with intelligent pagination
 * - Wellness data aggregations and analytics
 * - Crisis alert queries for real-time response
 * - Community feed generation with content scoring
 * - Therapy session scheduling and management
 * - HIPAA-compliant audit log queries
 * - Performance analytics and reporting
 */

import { PrismaClient, Prisma, UserRole, ClientStatus, RiskLevel } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Search and pagination interfaces
 */
interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UserSearchFilters {
  role?: UserRole[];
  isActive?: boolean;
  hasProfile?: boolean;
  mentalHealthGoals?: string[];
  location?: string;
  languages?: string[];
  joinedAfter?: Date;
  lastActiveAfter?: Date;
}

interface WellnessAnalyticsFilters {
  userId?: string;
  dateRange?: { start: Date; end: Date };
  moodRange?: { min: number; max: number };
  includeJournalSentiment?: boolean;
  groupBy?: 'day' | 'week' | 'month';
}

interface CommunityFeedOptions {
  userId?: string;
  categories?: string[];
  includeAnonymous?: boolean;
  minEngagement?: number;
  contentTypes?: string[];
  excludeUserIds?: string[];
}

/**
 * Result interfaces
 */
interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: any;
}

interface WellnessAnalytics {
  moodTrends: {
    date: string;
    averageMood: number;
    averageAnxiety?: number;
    averageEnergy?: number;
    entryCount: number;
  }[];
  journalInsights: {
    totalEntries: number;
    averageSentiment: number;
    sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    commonThemes?: string[];
  };
  wellnessScore: {
    current: number;
    change: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };
  milestones: {
    streakDays: number;
    totalCheckIns: number;
    goalsCompleted: number;
  };
}

/**
 * Main Optimized Query Builder Class
 */
export class OptimizedQueryBuilder {
  private prisma: PrismaClient;
  private pool: Pool;

  constructor() {
    this.prisma = new PrismaClient();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      application_name: 'AstralCore_OptimizedQueries',
    });
  }

  // ===============================================================================
  // USER SEARCH AND DISCOVERY QUERIES
  // ===============================================================================

  /**
   * Advanced user search with intelligent filtering and pagination
   */
  async searchUsers(
    searchTerm?: string,
    filters: UserSearchFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, sortBy = 'lastActiveAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const whereClause: any = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
    };

    if (filters.role?.length) {
      whereClause.role = { in: filters.role };
    }

    if (filters.joinedAfter) {
      whereClause.createdAt = { gte: filters.joinedAfter };
    }

    if (filters.lastActiveAfter) {
      whereClause.lastActiveAt = { gte: filters.lastActiveAfter };
    }

    // Full-text search on display name and email
    if (searchTerm) {
      whereClause.OR = [
        {
          displayName: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Advanced filtering by profile data
    if (filters.mentalHealthGoals?.length || filters.hasProfile) {
      whereClause.UserProfile = {
        ...(filters.hasProfile ? {} : { isNot: null }),
        ...(filters.mentalHealthGoals?.length && {
          mentalHealthGoals: {
            hasSome: filters.mentalHealthGoals,
          },
        }),
      };
    }

    // Execute optimized query with parallel count
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          anonymousId: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          lastActiveAt: true,
          createdAt: true,
          UserProfile: {
            select: {
              mentalHealthGoals: true,
              interestedTopics: true,
              wellnessScore: true,
              onboardingCompleted: true,
            },
          },
          // Conditional includes based on role
          ...(filters.role?.includes('HELPER') && {
            HelperProfile: {
              select: {
                title: true,
                specializations: true,
                rating: true,
                isVerified: true,
                acceptingClients: true,
              },
            },
          }),
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Find compatible peer matches based on mental health goals and interests
   */
  async findPeerMatches(
    userId: string,
    preferences: {
      maxDistance?: number;
      sharedGoalsWeight?: number;
      similarInterestsWeight?: number;
      activityLevelWeight?: number;
    } = {}
  ): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      // Get user's profile for matching
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: {
          mentalHealthGoals: true,
          interestedTopics: true,
          preferredCommunication: true,
        },
      });

      if (!userProfile) return [];

      // Complex matching query using raw SQL for performance
      const matchingQuery = `
        WITH user_goals AS (
          SELECT unnest($1::text[]) AS goal
        ),
        user_topics AS (
          SELECT unnest($2::text[]) AS topic
        ),
        compatibility_scores AS (
          SELECT 
            u.id,
            u."displayName",
            u."avatarUrl",
            u."lastActiveAt",
            up."mentalHealthGoals",
            up."interestedTopics",
            ai."trustScore",
            
            -- Calculate compatibility scores
            (
              SELECT COUNT(*)::float / GREATEST(1, array_length($1::text[], 1))
              FROM unnest(up."mentalHealthGoals") goal
              WHERE goal = ANY($1::text[])
            ) * COALESCE($3, 0.4) AS goal_compatibility,
            
            (
              SELECT COUNT(*)::float / GREATEST(1, array_length($2::text[], 1))
              FROM unnest(up."interestedTopics") topic  
              WHERE topic = ANY($2::text[])
            ) * COALESCE($4, 0.3) AS interest_compatibility,
            
            -- Activity level score (based on recent activity)
            CASE 
              WHEN u."lastActiveAt" > NOW() - INTERVAL '1 day' THEN 1.0
              WHEN u."lastActiveAt" > NOW() - INTERVAL '3 days' THEN 0.8
              WHEN u."lastActiveAt" > NOW() - INTERVAL '7 days' THEN 0.6
              ELSE 0.3
            END * COALESCE($5, 0.3) AS activity_score
            
          FROM "User" u
          JOIN "UserProfile" up ON u.id = up."userId"
          LEFT JOIN "AnonymousIdentity" ai ON u.id = ai."userId"
          WHERE 
            u.id != $6 
            AND u."isActive" = true
            AND up."onboardingCompleted" = true
            AND (up."mentalHealthGoals" && $1::text[] OR up."interestedTopics" && $2::text[])
        )
        SELECT 
          id,
          "displayName",
          "avatarUrl", 
          "lastActiveAt",
          "mentalHealthGoals",
          "interestedTopics",
          "trustScore",
          (goal_compatibility + interest_compatibility + activity_score) AS compatibility_score
        FROM compatibility_scores
        WHERE (goal_compatibility + interest_compatibility + activity_score) > 0.3
        ORDER BY compatibility_score DESC
        LIMIT 20
      `;

      const result = await client.query(matchingQuery, [
        userProfile.mentalHealthGoals || [],
        userProfile.interestedTopics || [],
        preferences.sharedGoalsWeight || 0.4,
        preferences.similarInterestsWeight || 0.3,
        preferences.activityLevelWeight || 0.3,
        userId,
      ]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===============================================================================
  // WELLNESS DATA AGGREGATIONS AND ANALYTICS
  // ===============================================================================

  /**
   * Generate comprehensive wellness analytics for a user
   */
  async getWellnessAnalytics(
    userId: string,
    filters: WellnessAnalyticsFilters = {}
  ): Promise<WellnessAnalytics> {
    const { 
      dateRange = { 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
        end: new Date() 
      },
      groupBy = 'day',
    } = filters;

    // Parallel queries for different analytics components
    const [moodData, journalData, currentWellnessScore, milestoneData] = await Promise.all([
      this.getMoodTrends(userId, dateRange, groupBy),
      this.getJournalInsights(userId, dateRange),
      this.getCurrentWellnessScore(userId),
      this.getWellnessMilestones(userId),
    ]);

    return {
      moodTrends: moodData,
      journalInsights: journalData,
      wellnessScore: currentWellnessScore,
      milestones: milestoneData,
    };
  }

  /**
   * Get mood trends with optimized aggregation
   */
  private async getMoodTrends(
    userId: string, 
    dateRange: { start: Date; end: Date },
    groupBy: 'day' | 'week' | 'month'
  ) {
    const client = await this.pool.connect();

    try {
      let dateGrouping: string;
      switch (groupBy) {
        case 'week':
          dateGrouping = "date_trunc('week', \"createdAt\")";
          break;
        case 'month':
          dateGrouping = "date_trunc('month', \"createdAt\")";
          break;
        default:
          dateGrouping = "date_trunc('day', \"createdAt\")";
      }

      const query = `
        SELECT 
          ${dateGrouping} as date,
          ROUND(AVG("moodScore")::numeric, 2) as average_mood,
          ROUND(AVG("anxietyLevel")::numeric, 2) as average_anxiety,
          ROUND(AVG("energyLevel")::numeric, 2) as average_energy,
          COUNT(*) as entry_count
        FROM "MoodEntry"
        WHERE 
          "userId" = $1 
          AND "createdAt" >= $2 
          AND "createdAt" <= $3
        GROUP BY ${dateGrouping}
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await client.query(query, [userId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        averageMood: parseFloat(row.average_mood),
        averageAnxiety: row.average_anxiety ? parseFloat(row.average_anxiety) : undefined,
        averageEnergy: row.average_energy ? parseFloat(row.average_energy) : undefined,
        entryCount: parseInt(row.entry_count),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get journal insights with sentiment analysis
   */
  private async getJournalInsights(userId: string, dateRange: { start: Date; end: Date }) {
    const [journalStats, recentEntries] = await Promise.all([
      this.prisma.journalEntry.aggregate({
        where: {
          userId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _count: { id: true },
        _avg: { sentiment: true },
      }),
      this.prisma.journalEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
          sentiment: { not: null },
        },
        select: { sentiment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate sentiment trend
    let sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (recentEntries.length >= 3) {
      const firstHalf = recentEntries.slice(Math.floor(recentEntries.length / 2));
      const secondHalf = recentEntries.slice(0, Math.floor(recentEntries.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, e) => sum + (e.sentiment || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + (e.sentiment || 0), 0) / secondHalf.length;
      
      const difference = secondAvg - firstAvg;
      if (difference > 0.1) sentimentTrend = 'IMPROVING';
      else if (difference < -0.1) sentimentTrend = 'DECLINING';
    }

    return {
      totalEntries: journalStats._count.id,
      averageSentiment: journalStats._avg.sentiment || 0,
      sentimentTrend,
      commonThemes: [], // Would implement theme extraction
    };
  }

  /**
   * Get current wellness score with trend analysis
   */
  private async getCurrentWellnessScore(userId: string) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { wellnessScore: true, lastAssessmentAt: true },
    });

    // Get previous wellness scores for trend calculation
    const previousScores = await this.prisma.$queryRaw<{wellness_score: number}[]>`
      SELECT "wellnessScore" as wellness_score
      FROM "UserProfile" 
      WHERE "userId" = ${userId}
      ORDER BY "updatedAt" DESC 
      LIMIT 5
    `;

    const currentScore = userProfile?.wellnessScore || 0;
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    let change = 0;

    if (previousScores.length >= 2) {
      const previousScore = previousScores[1].wellness_score;
      change = currentScore - previousScore;
      
      if (change > 5) trend = 'UP';
      else if (change < -5) trend = 'DOWN';
    }

    return {
      current: currentScore,
      change,
      trend,
    };
  }

  /**
   * Get wellness milestones and achievements
   */
  private async getWellnessMilestones(userId: string) {
    const client = await this.pool.connect();

    try {
      const query = `
        WITH mood_streak AS (
          SELECT 
            COUNT(*) as total_check_ins,
            MAX(streak_length) as max_streak
          FROM (
            SELECT 
              COUNT(*) OVER (
                PARTITION BY streak_group 
                ORDER BY "createdAt"
              ) as streak_length
            FROM (
              SELECT 
                "createdAt",
                "createdAt"::date - ROW_NUMBER() OVER (ORDER BY "createdAt")::int AS streak_group
              FROM "MoodEntry"
              WHERE "userId" = $1
                AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
              ORDER BY "createdAt"
            ) grouped_dates
          ) streaks
        ),
        challenge_progress AS (
          SELECT COUNT(*) as goals_completed
          FROM "ChallengeParticipation" cp
          WHERE cp."userId" = $1
            AND cp."completionRate" >= 0.8
        )
        SELECT 
          COALESCE(ms.total_check_ins, 0) as total_check_ins,
          COALESCE(ms.max_streak, 0) as streak_days,
          COALESCE(cp.goals_completed, 0) as goals_completed
        FROM mood_streak ms
        CROSS JOIN challenge_progress cp
      `;

      const result = await client.query(query, [userId]);
      const row = result.rows[0];

      return {
        streakDays: parseInt(row.streak_days),
        totalCheckIns: parseInt(row.total_check_ins),
        goalsCompleted: parseInt(row.goals_completed),
      };
    } finally {
      client.release();
    }
  }

  // ===============================================================================
  // CRISIS ALERT AND SAFETY QUERIES
  // ===============================================================================

  /**
   * Get active crisis alerts with priority scoring
   */
  async getActiveCrisisAlerts(
    options: {
      severityThreshold?: number;
      includeResolved?: boolean;
      limit?: number;
      assignedCounselorId?: string;
    } = {}
  ): Promise<any[]> {
    const { severityThreshold = 1, includeResolved = false, limit = 50 } = options;

    const whereClause: any = {
      ...(severityThreshold && { severityLevel: { gte: severityThreshold } }),
      ...(includeResolved === false && { resolved: false }),
    };

    const crisisReports = await this.prisma.crisisReport.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        severityLevel: true,
        triggerType: true,
        interventionType: true,
        responseTime: true,
        resolved: true,
        resolvedAt: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            displayName: true,
            UserProfile: {
              select: {
                mentalHealthGoals: true,
                crisisContacts: true,
              },
            },
            SafetyPlan: {
              select: {
                id: true,
                isActive: true,
                lastReviewedAt: true,
              },
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: [
        { severityLevel: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Enhance with risk scoring
    return crisisReports.map(report => ({
      ...report,
      riskScore: this.calculateRiskScore(report),
      priority: this.calculatePriority(report),
      estimatedResponseTime: this.estimateResponseTime(report.severityLevel),
    }));
  }

  /**
   * Get crisis intervention analytics
   */
  async getCrisisAnalytics(dateRange: { start: Date; end: Date }) {
    const client = await this.pool.connect();

    try {
      const analyticsQuery = `
        WITH crisis_metrics AS (
          SELECT 
            COUNT(*) as total_reports,
            AVG("severityLevel") as avg_severity,
            AVG("responseTime") as avg_response_time,
            COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count,
            COUNT(CASE WHEN "emergencyContactUsed" = true THEN 1 END) as emergency_contact_used,
            
            -- Trigger type distribution
            COUNT(CASE WHEN "triggerType" = 'SUICIDAL_IDEATION' THEN 1 END) as suicidal_ideation_count,
            COUNT(CASE WHEN "triggerType" = 'PANIC_ATTACK' THEN 1 END) as panic_attack_count,
            COUNT(CASE WHEN "triggerType" = 'SELF_HARM' THEN 1 END) as self_harm_count,
            
            -- Response time by severity
            AVG(CASE WHEN "severityLevel" >= 4 THEN "responseTime" END) as critical_response_time,
            AVG(CASE WHEN "severityLevel" = 3 THEN "responseTime" END) as high_response_time,
            AVG(CASE WHEN "severityLevel" <= 2 THEN "responseTime" END) as moderate_response_time
            
          FROM "CrisisReport"
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
        ),
        trend_analysis AS (
          SELECT 
            date_trunc('day', "createdAt") as date,
            COUNT(*) as daily_count,
            AVG("severityLevel") as daily_avg_severity
          FROM "CrisisReport"
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
          GROUP BY date_trunc('day', "createdAt")
          ORDER BY date DESC
        )
        SELECT 
          cm.*,
          json_agg(
            json_build_object(
              'date', ta.date,
              'count', ta.daily_count,
              'avgSeverity', ta.daily_avg_severity
            ) ORDER BY ta.date DESC
          ) as daily_trends
        FROM crisis_metrics cm
        CROSS JOIN trend_analysis ta
        GROUP BY cm.total_reports, cm.avg_severity, cm.avg_response_time, 
                cm.resolved_count, cm.emergency_contact_used,
                cm.suicidal_ideation_count, cm.panic_attack_count, cm.self_harm_count,
                cm.critical_response_time, cm.high_response_time, cm.moderate_response_time
      `;

      const result = await client.query(analyticsQuery, [dateRange.start, dateRange.end]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ===============================================================================
  // COMMUNITY FEED GENERATION
  // ===============================================================================

  /**
   * Generate personalized community feed with engagement scoring
   */
  async generateCommunityFeed(
    userId?: string,
    options: CommunityFeedOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const client = await this.pool.connect();

    try {
      // Get user preferences for personalization
      let userPreferences: any = null;
      if (userId) {
        userPreferences = await this.prisma.userProfile.findUnique({
          where: { userId },
          select: { mentalHealthGoals: true, interestedTopics: true },
        });
      }

      const feedQuery = `
        WITH post_scores AS (
          SELECT 
            p.id,
            p.title,
            p.content,
            p.category,
            p."isAnonymous",
            p."isPinned",
            p."viewCount",
            p."likeCount",
            p."createdAt",
            p."authorId",
            u."displayName" as author_name,
            u."avatarUrl" as author_avatar,
            
            -- Calculate engagement score
            (
              p."likeCount" * 3 + 
              p."viewCount" * 0.1 + 
              COALESCE(comment_count.count, 0) * 5 +
              CASE WHEN p."isPinned" THEN 50 ELSE 0 END
            ) as engagement_score,
            
            -- Recency score (more recent posts get higher scores)
            CASE 
              WHEN p."createdAt" > NOW() - INTERVAL '1 hour' THEN 100
              WHEN p."createdAt" > NOW() - INTERVAL '6 hours' THEN 80
              WHEN p."createdAt" > NOW() - INTERVAL '24 hours' THEN 60
              WHEN p."createdAt" > NOW() - INTERVAL '3 days' THEN 40
              WHEN p."createdAt" > NOW() - INTERVAL '7 days' THEN 20
              ELSE 10
            END as recency_score,
            
            -- Personalization score (if user preferences available)
            CASE 
              WHEN $3::text[] IS NOT NULL AND (
                p.category = ANY($3::text[]) OR 
                p.title ~* ANY($3::text[]) OR
                p.content ~* ANY($3::text[])
              ) THEN 30
              ELSE 0
            END as personalization_score,
            
            COALESCE(comment_count.count, 0) as comment_count
            
          FROM "CommunityPost" p
          LEFT JOIN "User" u ON p."authorId" = u.id
          LEFT JOIN (
            SELECT "postId", COUNT(*) as count
            FROM "Comment"
            WHERE "isDeleted" = false
            GROUP BY "postId"
          ) comment_count ON p.id = comment_count."postId"
          
          WHERE 
            p."isModerated" = false
            AND ($1::text IS NULL OR p.category = ANY($1::text[]))
            AND ($2::text[] IS NULL OR p."authorId" != ALL($2::text[]))
            AND (NOT $4::boolean OR p."isAnonymous" = true)
        ),
        ranked_posts AS (
          SELECT 
            *,
            (engagement_score + recency_score + personalization_score) as total_score,
            ROW_NUMBER() OVER (
              ORDER BY 
                "isPinned" DESC,
                (engagement_score + recency_score + personalization_score) DESC,
                "createdAt" DESC
            ) as rank
          FROM post_scores
        )
        SELECT 
          id, title, content, category, "isAnonymous", "isPinned",
          "viewCount", "likeCount", "createdAt", "authorId",
          author_name, author_avatar, comment_count, total_score
        FROM ranked_posts
        WHERE rank BETWEEN $5 AND $6
        ORDER BY rank
      `;

      const categories = options.categories?.length ? options.categories : null;
      const excludeUserIds = options.excludeUserIds?.length ? options.excludeUserIds : null;
      const userInterests = userPreferences?.interestedTopics || null;
      
      const posts = await client.query(feedQuery, [
        categories,
        excludeUserIds,
        userInterests,
        options.includeAnonymous || false,
        skip + 1,
        skip + limit,
      ]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "CommunityPost" p
        WHERE 
          p."isModerated" = false
          AND ($1::text[] IS NULL OR p.category = ANY($1::text[]))
          AND ($2::text[] IS NULL OR p."authorId" != ALL($2::text[]))
          AND (NOT $3::boolean OR p."isAnonymous" = true)
      `;

      const totalResult = await client.query(countQuery, [
        categories,
        excludeUserIds,
        options.includeAnonymous || false,
      ]);

      const total = parseInt(totalResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: posts.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        meta: {
          userPersonalized: !!userId,
          categoriesFiltered: !!categories,
        },
      };
    } finally {
      client.release();
    }
  }

  // ===============================================================================
  // THERAPY SESSION SCHEDULING AND MANAGEMENT
  // ===============================================================================

  /**
   * Find available therapy slots with intelligent scheduling
   */
  async findAvailableTherapySlots(
    therapistId?: string,
    options: {
      dateRange?: { start: Date; end: Date };
      sessionType?: string;
      preferredDuration?: number;
      clientTimezone?: string;
    } = {}
  ): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      const availabilityQuery = `
        WITH therapist_schedules AS (
          SELECT 
            t.id as therapist_id,
            t."userId",
            u."displayName" as therapist_name,
            hp.specializations,
            hp.rating,
            hp."isVerified",
            hp."acceptingClients",
            hp."currentClients",
            hp."maxClients",
            hp.availability,
            
            -- Calculate availability score
            CASE 
              WHEN hp."currentClients" < hp."maxClients" * 0.7 THEN 100
              WHEN hp."currentClients" < hp."maxClients" * 0.9 THEN 70
              ELSE 40
            END as availability_score
            
          FROM "TherapistClient" t
          JOIN "User" u ON t."therapistId" = u.id
          JOIN "HelperProfile" hp ON u.id = hp."userId"
          WHERE 
            hp."acceptingClients" = true
            AND hp."isVerified" = true
            AND ($1::text IS NULL OR t."therapistId" = $1)
            AND hp."currentClients" < hp."maxClients"
        ),
        existing_appointments AS (
          SELECT 
            ts."therapistId",
            ts."scheduledTime",
            ts.duration
          FROM "TherapistSession" ts
          WHERE 
            ts.status IN ('SCHEDULED', 'IN_PROGRESS')
            AND ts."scheduledTime" >= $2
            AND ts."scheduledTime" <= $3
        ),
        available_slots AS (
          SELECT 
            ts.*,
            generate_series(
              $2::timestamp,
              $3::timestamp,
              INTERVAL '30 minutes'
            ) as slot_time
          FROM therapist_schedules ts
        )
        SELECT 
          asl.therapist_id,
          asl."userId",
          asl.therapist_name,
          asl.specializations,
          asl.rating,
          asl.availability_score,
          asl.slot_time,
          CASE 
            WHEN ea."scheduledTime" IS NULL THEN true
            ELSE false
          END as is_available
        FROM available_slots asl
        LEFT JOIN existing_appointments ea ON 
          asl.therapist_id = ea."therapistId" 
          AND ea."scheduledTime" <= asl.slot_time + INTERVAL '30 minutes'
          AND ea."scheduledTime" + (ea.duration * INTERVAL '1 minute') > asl.slot_time
        WHERE ea."scheduledTime" IS NULL
        ORDER BY 
          asl.availability_score DESC,
          asl.rating DESC,
          asl.slot_time ASC
        LIMIT 100
      `;

      const defaultStart = new Date();
      const defaultEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

      const result = await client.query(availabilityQuery, [
        therapistId || null,
        options.dateRange?.start || defaultStart,
        options.dateRange?.end || defaultEnd,
      ]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get therapy session analytics for therapists
   */
  async getTherapySessionAnalytics(
    therapistId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const client = await this.pool.connect();

    try {
      const analyticsQuery = `
        WITH session_metrics AS (
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions,
            COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_sessions,
            COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_show_sessions,
            AVG(duration) as avg_session_duration,
            SUM(COALESCE(fee, 0)) as total_revenue,
            
            -- Client outcomes
            COUNT(DISTINCT "clientId") as unique_clients,
            AVG(
              CASE WHEN tc.progress IS NOT NULL THEN tc.progress ELSE 0 END
            ) as avg_client_progress
            
          FROM "TherapistSession" ts
          LEFT JOIN "TherapistClient" tc ON ts."clientId" = tc.id
          WHERE 
            ts."therapistId" = $1
            AND ts."scheduledTime" >= $2
            AND ts."scheduledTime" <= $3
        ),
        client_risk_distribution AS (
          SELECT 
            COUNT(CASE WHEN "riskLevel" = 'LOW' THEN 1 END) as low_risk_clients,
            COUNT(CASE WHEN "riskLevel" = 'MODERATE' THEN 1 END) as moderate_risk_clients,
            COUNT(CASE WHEN "riskLevel" = 'HIGH' THEN 1 END) as high_risk_clients,
            COUNT(CASE WHEN "riskLevel" = 'CRISIS' THEN 1 END) as crisis_clients
          FROM "TherapistClient"
          WHERE "therapistId" = $1 AND status = 'ACTIVE'
        )
        SELECT 
          sm.*,
          crd.*
        FROM session_metrics sm
        CROSS JOIN client_risk_distribution crd
      `;

      const result = await client.query(analyticsQuery, [
        therapistId,
        dateRange.start,
        dateRange.end,
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ===============================================================================
  // AUDIT LOG AND COMPLIANCE QUERIES
  // ===============================================================================

  /**
   * Get HIPAA-compliant audit logs with advanced filtering
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      actions?: string[];
      resources?: string[];
      dateRange?: { start: Date; end: Date };
      outcome?: 'SUCCESS' | 'FAILURE';
      ipAddress?: string;
    } = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.actions?.length) {
      whereClause.action = { in: filters.actions };
    }

    if (filters.resources?.length) {
      whereClause.resource = { in: filters.resources };
    }

    if (filters.dateRange) {
      whereClause.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters.outcome) {
      whereClause.outcome = filters.outcome;
    }

    if (filters.ipAddress) {
      whereClause.ipAddress = filters.ipAddress;
    }

    const [auditLogs, totalCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          outcome: true,
          timestamp: true,
          User: {
            select: {
              displayName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: auditLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  // ===============================================================================
  // HELPER METHODS
  // ===============================================================================

  private calculateRiskScore(crisisReport: any): number {
    let score = crisisReport.severityLevel * 20; // Base score from severity
    
    // Add points based on trigger type
    const triggerScores: { [key: string]: number } = {
      'SUICIDAL_IDEATION': 40,
      'SELF_HARM': 35,
      'PANIC_ATTACK': 25,
      'SUBSTANCE_ABUSE': 30,
      'DOMESTIC_VIOLENCE': 35,
    };
    
    score += triggerScores[crisisReport.triggerType] || 20;
    
    // Adjust for response time (longer response time = higher risk)
    if (crisisReport.responseTime > 300) { // 5 minutes
      score += 20;
    } else if (crisisReport.responseTime > 60) { // 1 minute
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  private calculatePriority(crisisReport: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskScore = this.calculateRiskScore(crisisReport);
    
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private estimateResponseTime(severityLevel: number): number {
    // Return estimated response time in seconds
    switch (severityLevel) {
      case 5: return 30;   // 30 seconds for critical
      case 4: return 120;  // 2 minutes for high
      case 3: return 300;  // 5 minutes for moderate
      case 2: return 900;  // 15 minutes for low
      case 1: return 1800; // 30 minutes for minimal
      default: return 300;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.pool.end();
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let optimizedQueryBuilder: OptimizedQueryBuilder | null = null;

export function getOptimizedQueryBuilder(): OptimizedQueryBuilder {
  if (!optimizedQueryBuilder) {
    optimizedQueryBuilder = new OptimizedQueryBuilder();
  }
  return optimizedQueryBuilder;
}

export default getOptimizedQueryBuilder;