/**
 * Usage Analytics System
 * Privacy-focused analytics for feature usage, user engagement, and treatment outcomes
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { getMonitoringConfig, MonitoringConfig } from './config';
import { auditTrailService } from './audit-trail';

export type AnalyticsEventType = 
  | 'page_view' | 'feature_usage' | 'user_action' | 'session_start' | 'session_end'
  | 'crisis_intervention' | 'therapy_session' | 'mood_tracking' | 'journal_entry'
  | 'assessment_completed' | 'goal_set' | 'goal_achieved' | 'resource_accessed'
  | 'community_interaction' | 'support_request' | 'medication_reminder'
  | 'appointment_scheduled' | 'treatment_plan_updated' | 'outcome_measured';

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: AnalyticsEventType;
  
  // User context (anonymized)
  userId?: string; // Hashed user ID
  sessionId: string;
  
  // Event properties
  properties: Record<string, any>;
  
  // Context
  context: {
    page?: string;
    referrer?: string;
    userAgent?: string;
    device?: {
      type: 'desktop' | 'mobile' | 'tablet';
      os?: string;
      browser?: string;
    };
    location?: {
      country?: string;
      region?: string;
      timezone?: string;
    };
    app: {
      version: string;
      environment: string;
    };
  };
  
  // Privacy and compliance
  anonymized: boolean;
  containsPHI: boolean;
  consentLevel: 'none' | 'basic' | 'enhanced' | 'full';
  
  // Processing metadata
  processed: boolean;
  aggregatedAt?: number;
}

export interface UserJourney {
  userId: string; // Hashed
  sessionId: string;
  startTime: number;
  endTime?: number;
  events: AnalyticsEvent[];
  pages: string[];
  features: string[];
  outcomes: {
    goalAchieved?: boolean;
    treatmentEngagement?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    satisfactionScore?: number;
  };
  duration: number;
  bounced: boolean;
}

export interface FeatureUsage {
  feature: string;
  category: string;
  totalUsers: number;
  totalSessions: number;
  totalEvents: number;
  avgSessionDuration: number;
  returnRate: number;
  completionRate: number;
  satisfactionScore: number;
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export interface TreatmentOutcome {
  outcomeId: string;
  userId: string; // Hashed
  treatmentType: string;
  startDate: number;
  endDate?: number;
  metrics: {
    engagementScore: number;
    adherenceRate: number;
    improvementScore: number;
    satisfactionScore: number;
    riskReduction: number;
  };
  milestones: Array<{
    date: number;
    type: string;
    value: number;
    notes?: string;
  }>;
  status: 'active' | 'completed' | 'discontinued' | 'paused';
}

export interface CrisisAnalytics {
  totalInterventions: number;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  riskLevels: Record<string, number>;
  outcomes: {
    resolved: number;
    escalated: number;
    followUpRequired: number;
  };
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  effectivenessMetrics: {
    immediateResolution: number;
    userSatisfaction: number;
    preventionSuccess: number;
  };
}

export interface EngagementMetrics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  sessionMetrics: {
    avgDuration: number;
    avgPagesPerSession: number;
    bounceRate: number;
  };
  featureAdoption: {
    [feature: string]: {
      users: number;
      adoptionRate: number;
      retentionRate: number;
    };
  };
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
  contentEngagement: {
    mostViewed: Array<{ page: string; views: number }>;
    longestTime: Array<{ page: string; avgTime: number }>;
    highestCompletion: Array<{ feature: string; rate: number }>;
  };
}

export interface AnalyticsConfig {
  enabled: boolean;
  sampling: {
    rate: number;
    strategy: 'random' | 'systematic' | 'stratified';
  };
  privacy: {
    anonymizeUsers: boolean;
    hashUserIds: boolean;
    excludeFields: string[];
    consentRequired: boolean;
  };
  retention: {
    events: number; // days
    aggregated: number; // days
    outcomes: number; // days
  };
  aggregation: {
    enabled: boolean;
    intervals: ('hourly' | 'daily' | 'weekly' | 'monthly')[];
  };
}

class AnalyticsService extends EventEmitter {
  private config: MonitoringConfig;
  private analyticsConfig: AnalyticsConfig;
  private events: Map<string, AnalyticsEvent> = new Map();
  private userJourneys: Map<string, UserJourney> = new Map();
  private featureUsage: Map<string, FeatureUsage> = new Map();
  private treatmentOutcomes: Map<string, TreatmentOutcome> = new Map();
  private hashingSalt: string;
  private aggregationTimer: NodeJS.Timer | null = null;
  private isInitialized = false;

  constructor(analyticsConfig?: Partial<AnalyticsConfig>) {
    super();
    this.config = getMonitoringConfig();
    this.analyticsConfig = {
      enabled: this.config.analytics.enabled,
      sampling: this.config.analytics.sampling,
      privacy: this.config.analytics.privacy,
      retention: {
        events: 90, // 3 months
        aggregated: 365, // 1 year
        outcomes: 2555, // 7 years for HIPAA
      },
      aggregation: {
        enabled: true,
        intervals: ['hourly', 'daily', 'weekly', 'monthly'],
      },
      ...analyticsConfig,
    };
    
    this.hashingSalt = this.getOrCreateSalt();
    
    if (this.analyticsConfig.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize analytics service
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Start aggregation process
    if (this.analyticsConfig.aggregation.enabled) {
      this.startAggregation();
    }

    // Start cleanup process
    this.startCleanup();

    this.isInitialized = true;
    this.emit('analytics:initialized');
  }

  /**
   * Track an analytics event
   */
  public async track(
    type: AnalyticsEventType,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsEvent['context']> = {},
    options: {
      userId?: string;
      sessionId?: string;
      containsPHI?: boolean;
      consentLevel?: AnalyticsEvent['consentLevel'];
    } = {}
  ): Promise<AnalyticsEvent | null> {
    try {
      // Check if analytics is enabled and user has consented
      if (!this.analyticsConfig.enabled) {
        return null;
      }

      // Apply sampling
      if (Math.random() > this.analyticsConfig.sampling.rate) {
        return null;
      }

      // Check consent requirements
      if (this.analyticsConfig.privacy.consentRequired && 
          (!options.consentLevel || options.consentLevel === 'none')) {
        return null;
      }

      // Filter sensitive properties
      const filteredProperties = this.filterSensitiveData(properties);

      // Create analytics event
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type,
        userId: options.userId ? this.hashUserId(options.userId) : undefined,
        sessionId: options.sessionId || this.generateSessionId(),
        properties: filteredProperties,
        context: {
          app: {
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          },
          ...context,
        },
        anonymized: this.analyticsConfig.privacy.anonymizeUsers,
        containsPHI: options.containsPHI || false,
        consentLevel: options.consentLevel || 'basic',
        processed: false,
      };

      // Store event
      this.events.set(event.id, event);

      // Update user journey
      if (event.userId && event.sessionId) {
        this.updateUserJourney(event);
      }

      // Update feature usage
      this.updateFeatureUsage(event);

      // Log to audit trail if contains PHI
      if (event.containsPHI) {
        await auditTrailService.logEvent({
          eventType: 'data_access',
          action: 'analytics_event_tracked',
          outcome: 'success',
          description: `Analytics event tracked: ${type}`,
          containsPHI: true,
          dataClassification: 'phi',
          details: {
            eventType: type,
            eventId: event.id,
            anonymized: event.anonymized,
          },
        });
      }

      // Emit event
      this.emit('analytics:event', event);

      // Process special event types
      await this.processSpecialEvents(event);

      return event;

    } catch (error) {
      console.error('Analytics tracking error:', error);
      return null;
    }
  }

  /**
   * Track page view
   */
  public async trackPageView(
    page: string,
    options: {
      userId?: string;
      sessionId?: string;
      referrer?: string;
      properties?: Record<string, any>;
    } = {}
  ): Promise<void> {
    await this.track('page_view', {
      page,
      ...options.properties,
    }, {
      page,
      referrer: options.referrer,
    }, {
      userId: options.userId,
      sessionId: options.sessionId,
    });
  }

  /**
   * Track feature usage
   */
  public async trackFeatureUsage(
    feature: string,
    action: string,
    options: {
      userId?: string;
      sessionId?: string;
      properties?: Record<string, any>;
      containsPHI?: boolean;
    } = {}
  ): Promise<void> {
    await this.track('feature_usage', {
      feature,
      action,
      ...options.properties,
    }, {}, {
      userId: options.userId,
      sessionId: options.sessionId,
      containsPHI: options.containsPHI,
    });
  }

  /**
   * Track crisis intervention
   */
  public async trackCrisisIntervention(
    interventionData: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      responseTime: number;
      outcome: 'resolved' | 'escalated' | 'follow_up_required';
      interventionType: string;
      effectivenessScore?: number;
    },
    options: {
      userId?: string;
      sessionId?: string;
    } = {}
  ): Promise<void> {
    await this.track('crisis_intervention', interventionData, {}, {
      userId: options.userId,
      sessionId: options.sessionId,
      containsPHI: true,
      consentLevel: 'enhanced',
    });
  }

  /**
   * Track treatment outcome
   */
  public async trackTreatmentOutcome(
    outcomeData: Omit<TreatmentOutcome, 'outcomeId' | 'userId'>,
    userId: string
  ): Promise<void> {
    const hashedUserId = this.hashUserId(userId);
    const outcome: TreatmentOutcome = {
      outcomeId: this.generateOutcomeId(),
      userId: hashedUserId,
      ...outcomeData,
    };

    this.treatmentOutcomes.set(outcome.outcomeId, outcome);

    // Track as analytics event
    await this.track('outcome_measured', {
      treatmentType: outcome.treatmentType,
      engagementScore: outcome.metrics.engagementScore,
      adherenceRate: outcome.metrics.adherenceRate,
      improvementScore: outcome.metrics.improvementScore,
      satisfactionScore: outcome.metrics.satisfactionScore,
      status: outcome.status,
    }, {}, {
      userId,
      containsPHI: true,
      consentLevel: 'full',
    });

    this.emit('analytics:outcome', outcome);
  }

  /**
   * Get engagement metrics
   */
  public getEngagementMetrics(timeWindow: number = 30 * 24 * 60 * 60 * 1000): EngagementMetrics {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const recentEvents = Array.from(this.events.values())
      .filter(event => event.timestamp >= cutoff);

    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));
    const sessions = new Map<string, AnalyticsEvent[]>();
    
    // Group events by session
    recentEvents.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    });

    // Calculate session metrics
    const sessionDurations: number[] = [];
    const pagesPerSession: number[] = [];
    let bouncedSessions = 0;

    sessions.forEach(sessionEvents => {
      if (sessionEvents.length === 0) return;
      
      const sortedEvents = sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
      const duration = sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp;
      sessionDurations.push(duration);
      
      const pages = new Set(sessionEvents
        .filter(e => e.type === 'page_view')
        .map(e => e.properties.page)
      );
      pagesPerSession.push(pages.size);
      
      if (pages.size <= 1) {
        bouncedSessions++;
      }
    });

    // Feature adoption metrics
    const featureEvents = recentEvents.filter(e => e.type === 'feature_usage');
    const featureAdoption: EngagementMetrics['featureAdoption'] = {};
    
    const featureUsers = new Map<string, Set<string>>();
    featureEvents.forEach(event => {
      const feature = event.properties.feature;
      if (!featureUsers.has(feature)) {
        featureUsers.set(feature, new Set());
      }
      if (event.userId) {
        featureUsers.get(feature)!.add(event.userId);
      }
    });
    
    featureUsers.forEach((users, feature) => {
      featureAdoption[feature] = {
        users: users.size,
        adoptionRate: users.size / uniqueUsers.size,
        retentionRate: this.calculateFeatureRetention(feature, Array.from(users)),
      };
    });

    // User retention
    const userRetention = this.calculateUserRetention(recentEvents);

    // Content engagement
    const pageViews = recentEvents.filter(e => e.type === 'page_view');
    const contentEngagement = this.calculateContentEngagement(pageViews);

    return {
      activeUsers: {
        daily: this.getActiveUsers(24 * 60 * 60 * 1000),
        weekly: this.getActiveUsers(7 * 24 * 60 * 60 * 1000),
        monthly: uniqueUsers.size,
      },
      sessionMetrics: {
        avgDuration: sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length || 0,
        avgPagesPerSession: pagesPerSession.reduce((a, b) => a + b, 0) / pagesPerSession.length || 0,
        bounceRate: bouncedSessions / sessions.size || 0,
      },
      featureAdoption,
      userRetention,
      contentEngagement,
    };
  }

  /**
   * Get crisis analytics
   */
  public getCrisisAnalytics(timeWindow: number = 30 * 24 * 60 * 60 * 1000): CrisisAnalytics {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const crisisEvents = Array.from(this.events.values())
      .filter(event => 
        event.type === 'crisis_intervention' && 
        event.timestamp >= cutoff
      );

    const responseTimes = crisisEvents
      .map(e => e.properties.responseTime)
      .filter(rt => typeof rt === 'number')
      .sort((a, b) => a - b);

    const riskLevels = crisisEvents.reduce((acc, event) => {
      const level = event.properties.riskLevel || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const outcomes = crisisEvents.reduce((acc, event) => {
      const outcome = event.properties.outcome || 'unknown';
      if (outcome === 'resolved') acc.resolved++;
      else if (outcome === 'escalated') acc.escalated++;
      else if (outcome === 'follow_up_required') acc.followUpRequired++;
      return acc;
    }, { resolved: 0, escalated: 0, followUpRequired: 0 });

    // Calculate trends
    const trends = this.calculateTrends(crisisEvents);

    // Calculate effectiveness metrics
    const effectivenessMetrics = {
      immediateResolution: outcomes.resolved / crisisEvents.length || 0,
      userSatisfaction: this.calculateAverageScore(crisisEvents, 'satisfactionScore'),
      preventionSuccess: this.calculatePreventionSuccess(crisisEvents),
    };

    return {
      totalInterventions: crisisEvents.length,
      responseTime: {
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      },
      riskLevels,
      outcomes,
      trends,
      effectivenessMetrics,
    };
  }

  /**
   * Get feature usage analytics
   */
  public getFeatureUsage(feature?: string): FeatureUsage[] {
    const features = feature ? [feature] : Array.from(this.featureUsage.keys());
    return features.map(f => this.featureUsage.get(f)).filter(Boolean) as FeatureUsage[];
  }

  /**
   * Get treatment outcomes
   */
  public getTreatmentOutcomes(filters?: {
    treatmentType?: string;
    status?: TreatmentOutcome['status'];
    timeRange?: { start: number; end: number };
  }): TreatmentOutcome[] {
    let outcomes = Array.from(this.treatmentOutcomes.values());
    
    if (filters?.treatmentType) {
      outcomes = outcomes.filter(o => o.treatmentType === filters.treatmentType);
    }
    
    if (filters?.status) {
      outcomes = outcomes.filter(o => o.status === filters.status);
    }
    
    if (filters?.timeRange) {
      outcomes = outcomes.filter(o => 
        o.startDate >= filters.timeRange!.start && 
        o.startDate <= filters.timeRange!.end
      );
    }
    
    return outcomes;
  }

  /**
   * Generate analytics report
   */
  public generateReport(timeWindow: number = 30 * 24 * 60 * 60 * 1000): {
    engagement: EngagementMetrics;
    crisis: CrisisAnalytics;
    features: FeatureUsage[];
    outcomes: {
      total: number;
      byType: Record<string, number>;
      averageMetrics: {
        engagement: number;
        adherence: number;
        improvement: number;
        satisfaction: number;
      };
    };
    summary: {
      totalEvents: number;
      uniqueUsers: number;
      activeSessions: number;
      avgEngagement: number;
    };
  } {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const recentEvents = Array.from(this.events.values())
      .filter(event => event.timestamp >= cutoff);

    const engagement = this.getEngagementMetrics(timeWindow);
    const crisis = this.getCrisisAnalytics(timeWindow);
    const features = this.getFeatureUsage();
    
    const outcomes = this.getTreatmentOutcomes({
      timeRange: { start: cutoff, end: now },
    });
    
    const outcomesByType = outcomes.reduce((acc, outcome) => {
      acc[outcome.treatmentType] = (acc[outcome.treatmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgMetrics = outcomes.reduce((acc, outcome) => {
      acc.engagement += outcome.metrics.engagementScore;
      acc.adherence += outcome.metrics.adherenceRate;
      acc.improvement += outcome.metrics.improvementScore;
      acc.satisfaction += outcome.metrics.satisfactionScore;
      return acc;
    }, { engagement: 0, adherence: 0, improvement: 0, satisfaction: 0 });
    
    if (outcomes.length > 0) {
      Object.keys(avgMetrics).forEach(key => {
        avgMetrics[key as keyof typeof avgMetrics] /= outcomes.length;
      });
    }

    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));
    const uniqueSessions = new Set(recentEvents.map(e => e.sessionId));

    return {
      engagement,
      crisis,
      features,
      outcomes: {
        total: outcomes.length,
        byType: outcomesByType,
        averageMetrics: avgMetrics,
      },
      summary: {
        totalEvents: recentEvents.length,
        uniqueUsers: uniqueUsers.size,
        activeSessions: uniqueSessions.size,
        avgEngagement: engagement.sessionMetrics.avgDuration,
      },
    };
  }

  /**
   * Hash user ID for privacy
   */
  private hashUserId(userId: string): string {
    if (!this.analyticsConfig.privacy.hashUserIds) {
      return this.analyticsConfig.privacy.anonymizeUsers ? 'anonymous' : userId;
    }
    
    return crypto
      .createHash('sha256')
      .update(userId + this.hashingSalt)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Filter sensitive data
   */
  private filterSensitiveData(data: Record<string, any>): Record<string, any> {
    const filtered = { ...data };
    const excludeFields = this.analyticsConfig.privacy.excludeFields;
    
    excludeFields.forEach(field => {
      if (filtered[field]) {
        delete filtered[field];
      }
    });
    
    return filtered;
  }

  /**
   * Update user journey
   */
  private updateUserJourney(event: AnalyticsEvent): void {
    if (!event.userId) return;

    const journeyKey = `${event.userId}_${event.sessionId}`;
    let journey = this.userJourneys.get(journeyKey);

    if (!journey) {
      journey = {
        userId: event.userId,
        sessionId: event.sessionId,
        startTime: event.timestamp,
        events: [],
        pages: [],
        features: [],
        outcomes: {},
        duration: 0,
        bounced: true,
      };
      this.userJourneys.set(journeyKey, journey);
    }

    journey.events.push(event);
    journey.endTime = event.timestamp;
    journey.duration = journey.endTime - journey.startTime;
    journey.bounced = journey.events.length <= 1;

    if (event.type === 'page_view' && event.properties.page) {
      if (!journey.pages.includes(event.properties.page)) {
        journey.pages.push(event.properties.page);
      }
    }

    if (event.type === 'feature_usage' && event.properties.feature) {
      if (!journey.features.includes(event.properties.feature)) {
        journey.features.push(event.properties.feature);
      }
    }
  }

  /**
   * Update feature usage statistics
   */
  private updateFeatureUsage(event: AnalyticsEvent): void {
    if (event.type !== 'feature_usage' || !event.properties.feature) return;

    const feature = event.properties.feature;
    let usage = this.featureUsage.get(feature);

    if (!usage) {
      usage = {
        feature,
        category: event.properties.category || 'general',
        totalUsers: 0,
        totalSessions: 0,
        totalEvents: 0,
        avgSessionDuration: 0,
        returnRate: 0,
        completionRate: 0,
        satisfactionScore: 0,
        trends: {
          daily: new Array(30).fill(0),
          weekly: new Array(52).fill(0),
          monthly: new Array(12).fill(0),
        },
      };
      this.featureUsage.set(feature, usage);
    }

    usage.totalEvents++;
    
    // Update trends
    const now = new Date();
    const dayIndex = now.getDate() - 1;
    const weekIndex = this.getWeekOfYear(now) - 1;
    const monthIndex = now.getMonth();

    usage.trends.daily[dayIndex]++;
    usage.trends.weekly[weekIndex % 52]++;
    usage.trends.monthly[monthIndex]++;
  }

  /**
   * Process special events
   */
  private async processSpecialEvents(event: AnalyticsEvent): Promise<void> {
    // Handle crisis events with immediate processing
    if (event.type === 'crisis_intervention' && event.properties.riskLevel === 'critical') {
      this.emit('analytics:crisis_critical', event);
    }

    // Handle goal achievements
    if (event.type === 'goal_achieved') {
      this.emit('analytics:goal_achieved', event);
    }

    // Handle treatment milestones
    if (event.type === 'outcome_measured' && event.properties.improvementScore > 0.8) {
      this.emit('analytics:treatment_success', event);
    }
  }

  /**
   * Calculate active users for time window
   */
  private getActiveUsers(timeWindow: number): number {
    const cutoff = Date.now() - timeWindow;
    const activeUsers = new Set(
      Array.from(this.events.values())
        .filter(event => event.timestamp >= cutoff && event.userId)
        .map(event => event.userId)
    );
    return activeUsers.size;
  }

  /**
   * Calculate user retention
   */
  private calculateUserRetention(events: AnalyticsEvent[]): EngagementMetrics['userRetention'] {
    // Simplified retention calculation
    // In production, this would track users over time cohorts
    const now = Date.now();
    const day1 = now - 24 * 60 * 60 * 1000;
    const day7 = now - 7 * 24 * 60 * 60 * 1000;
    const day30 = now - 30 * 24 * 60 * 60 * 1000;
    const day90 = now - 90 * 24 * 60 * 60 * 1000;

    const usersDay1 = new Set(events.filter(e => e.timestamp >= day1).map(e => e.userId));
    const usersDay7 = new Set(events.filter(e => e.timestamp >= day7).map(e => e.userId));
    const usersDay30 = new Set(events.filter(e => e.timestamp >= day30).map(e => e.userId));
    const usersDay90 = new Set(events.filter(e => e.timestamp >= day90).map(e => e.userId));

    return {
      day1: usersDay1.size,
      day7: usersDay7.size,
      day30: usersDay30.size,
      day90: usersDay90.size,
    };
  }

  /**
   * Calculate content engagement
   */
  private calculateContentEngagement(pageViews: AnalyticsEvent[]): EngagementMetrics['contentEngagement'] {
    const pageStats = new Map<string, { views: number; totalTime: number }>();
    
    pageViews.forEach(event => {
      const page = event.properties.page;
      const timeOnPage = event.properties.timeOnPage || 0;
      
      if (!pageStats.has(page)) {
        pageStats.set(page, { views: 0, totalTime: 0 });
      }
      
      const stats = pageStats.get(page)!;
      stats.views++;
      stats.totalTime += timeOnPage;
    });

    const mostViewed = Array.from(pageStats.entries())
      .map(([page, stats]) => ({ page, views: stats.views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const longestTime = Array.from(pageStats.entries())
      .map(([page, stats]) => ({ 
        page, 
        avgTime: stats.views > 0 ? stats.totalTime / stats.views : 0 
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Placeholder for completion rates
    const highestCompletion = Array.from(this.featureUsage.values())
      .map(usage => ({ feature: usage.feature, rate: usage.completionRate }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    return {
      mostViewed,
      longestTime,
      highestCompletion,
    };
  }

  /**
   * Calculate feature retention
   */
  private calculateFeatureRetention(feature: string, users: string[]): number {
    // Simplified retention calculation
    // In production, this would track feature usage over time
    return Math.random() * 0.5 + 0.3; // Placeholder: 30-80% retention
  }

  /**
   * Calculate trends
   */
  private calculateTrends(events: AnalyticsEvent[]): CrisisAnalytics['trends'] {
    const hourly = new Array(24).fill(0);
    const daily = new Array(30).fill(0);
    const weekly = new Array(52).fill(0);

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDate() - 1;
      const week = this.getWeekOfYear(date) - 1;

      hourly[hour]++;
      daily[day]++;
      weekly[week % 52]++;
    });

    return { hourly, daily, weekly };
  }

  /**
   * Calculate average score
   */
  private calculateAverageScore(events: AnalyticsEvent[], scoreField: string): number {
    const scores = events
      .map(e => e.properties[scoreField])
      .filter(score => typeof score === 'number');
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Calculate prevention success rate
   */
  private calculatePreventionSuccess(events: AnalyticsEvent[]): number {
    // This would be calculated based on follow-up data
    // For now, return a placeholder
    return 0.75; // 75% prevention success rate
  }

  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique outcome ID
   */
  private generateOutcomeId(): string {
    return `out_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get or create hashing salt
   */
  private getOrCreateSalt(): string {
    const saltFromEnv = process.env.ANALYTICS_SALT;
    if (saltFromEnv) {
      return saltFromEnv;
    }
    
    // In production, this should be stored securely
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Start aggregation process
   */
  private startAggregation(): void {
    // Run aggregation every hour
    this.aggregationTimer = setInterval(() => {
      this.runAggregation();
    }, 60 * 60 * 1000);
  }

  /**
   * Run data aggregation
   */
  private runAggregation(): void {
    // Mark events as processed after aggregation
    const unprocessedEvents = Array.from(this.events.values())
      .filter(event => !event.processed);

    // Aggregate data (implementation would depend on requirements)
    unprocessedEvents.forEach(event => {
      event.processed = true;
      event.aggregatedAt = Date.now();
    });

    this.emit('analytics:aggregation_complete', { 
      processedEvents: unprocessedEvents.length 
    });
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Run data cleanup based on retention policies
   */
  private runCleanup(): void {
    const now = Date.now();
    
    // Clean up old events
    const eventRetentionTime = this.analyticsConfig.retention.events * 24 * 60 * 60 * 1000;
    for (const [id, event] of this.events) {
      if (now - event.timestamp > eventRetentionTime) {
        this.events.delete(id);
      }
    }

    // Clean up old user journeys
    for (const [key, journey] of this.userJourneys) {
      if (now - journey.startTime > eventRetentionTime) {
        this.userJourneys.delete(key);
      }
    }

    // Clean up old outcomes (longer retention for HIPAA compliance)
    const outcomeRetentionTime = this.analyticsConfig.retention.outcomes * 24 * 60 * 60 * 1000;
    for (const [id, outcome] of this.treatmentOutcomes) {
      if (now - outcome.startDate > outcomeRetentionTime) {
        this.treatmentOutcomes.delete(id);
      }
    }

    this.emit('analytics:cleanup_complete');
  }

  /**
   * Destroy analytics service
   */
  public destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    this.isInitialized = false;
    this.emit('analytics:destroyed');
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

export type {
  AnalyticsEvent,
  AnalyticsEventType,
  UserJourney,
  FeatureUsage,
  TreatmentOutcome,
  CrisisAnalytics,
  EngagementMetrics,
  AnalyticsConfig,
};

export default analyticsService;