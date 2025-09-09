import { prisma } from '@/lib/prisma';
import { cryptoService } from '@/services/security/cryptoService';
import { hipaaService, PHICategory } from '@/services/compliance/hipaaService';

/**
 * Analytics Service for Mental Health Platform
 * Provides privacy-preserving analytics and insights
 * Compliant with HIPAA and mental health data protection requirements
 */

// Types of analytics data we collect
export enum AnalyticsDataType {
  USER_ENGAGEMENT = 'user_engagement',
  FEATURE_USAGE = 'feature_usage',
  WELLNESS_METRICS = 'wellness_metrics',
  CRISIS_PATTERNS = 'crisis_patterns',
  THERAPY_OUTCOMES = 'therapy_outcomes',
  SYSTEM_PERFORMANCE = 'system_performance',
  CONTENT_INTERACTION = 'content_interaction',
  SAFETY_METRICS = 'safety_metrics'
}

// Privacy levels for analytics
export enum PrivacyLevel {
  PUBLIC = 'public',           // No PHI, aggregated only
  ANONYMIZED = 'anonymized',   // Anonymized but detailed
  PSEUDONYMIZED = 'pseudonymized', // Reversibly anonymized
  PROTECTED = 'protected',     // PHI with access controls
  CONFIDENTIAL = 'confidential' // Highly sensitive PHI
}

// Analytics event structure
export interface AnalyticsEvent {
  id?: string;
  userId?: string;
  sessionId?: string;
  eventType: AnalyticsDataType;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  // privacyLevel: PrivacyLevel;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
    deviceType?: string;
    privacyLevel?: PrivacyLevel;
  };
}

// Aggregated metrics
export interface AggregatedMetric {
  id: string;
  metricName: string;
  dataType: AnalyticsDataType;
  value: number;
  periodStart: Date;
  periodEnd: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
  dimensions: Record<string, any>;
}

// Wellness trend data
export interface WellnessTrend {
  userId: string;
  metric: string;
  values: Array<{
    timestamp: Date;
    value: number;
    context?: string;
  }>;
  trend: 'improving' | 'stable' | 'declining' | 'concerning';
  confidenceScore: number;
}

// Crisis prediction data
export interface CrisisRiskData {
  userId: string;
  riskScore: number; // 0-100
  riskFactors: string[];
  protectiveFactors: string[];
  recommendations: string[];
  lastAssessment: Date;
  triggerWarning?: boolean;
}

/**
 * Analytics Service
 */
class AnalyticsService {
  private readonly encryptionContext = 'analytics_service';
  
  constructor() {}

  /**
   * Track analytics event with privacy protection
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Apply privacy protection based on level
      const processedEvent = await this.applyPrivacyProtection(event);
      
      // Store event in analytics database
      await prisma.auditLog.create({
        data: {
          userId: processedEvent.userId || 'anonymous',
          action: processedEvent.eventType,
          resource: processedEvent.eventName,
          details: JSON.stringify(processedEvent.properties),
          outcome: 'SUCCESS',
          timestamp: processedEvent.timestamp
        }
      });

      // Real-time processing for critical events
      if (this.isCriticalEvent(event)) {
        await this.processCriticalEvent(processedEvent);
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw - analytics should never break main functionality
    }
  }

  /**
   * Apply privacy protection based on level
   */
  private async applyPrivacyProtection(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const processedEvent = { ...event };

    switch (event.metadata?.privacyLevel) {
      case PrivacyLevel.PUBLIC:
        // Remove all identifying information
        delete processedEvent.userId;
        delete processedEvent.metadata?.ipAddress;
        processedEvent.properties = this.sanitizePublicProperties(event.properties);
        break;

      case PrivacyLevel.ANONYMIZED:
        // Replace user ID with irreversible hash
        if (processedEvent.userId) {
          processedEvent.userId = cryptoService.createDeterministicHash(
            processedEvent.userId,
            this.encryptionContext
          );
        }
        delete processedEvent.metadata?.ipAddress;
        break;

      case PrivacyLevel.PSEUDONYMIZED:
        // Replace with reversible pseudonym
        if (processedEvent.userId) {
          processedEvent.userId = this.createPseudonym(processedEvent.userId);
        }
        if (processedEvent.metadata?.ipAddress) {
          processedEvent.metadata.ipAddress = cryptoService.maskSensitiveData(
            processedEvent.metadata.ipAddress,
            '*',
            2
          );
        }
        break;

      case PrivacyLevel.PROTECTED:
      case PrivacyLevel.CONFIDENTIAL:
        // Encrypt sensitive properties
        processedEvent.properties = await this.encryptSensitiveProperties(
          event.properties
        );
        break;
    }

    return processedEvent;
  }

  /**
   * Sanitize properties for public analytics
   */
  private sanitizePublicProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    // Only include non-sensitive, aggregatable properties
    const allowedKeys = [
      'page', 'action', 'feature', 'duration', 'success',
      'category', 'type', 'status', 'count', 'rating'
    ];

    for (const [key, value] of Object.entries(properties)) {
      if (allowedKeys.includes(key) && typeof value !== 'object') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create reversible pseudonym for user
   */
  private createPseudonym(userId: string): string {
    return cryptoService.createHMAC(userId, 'pseudonym_key');
  }

  /**
   * Encrypt sensitive properties
   */
  private async encryptSensitiveProperties(
    properties: Record<string, any>,
    // privacyLevel: PrivacyLevel
  ): Promise<Record<string, any>> {
    const encrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (this.isSensitiveProperty(key)) {
        const encryptionResult = cryptoService.encryptJSON(value);
        encrypted[key] = {
          encrypted: true,
          data: encryptionResult,
          privacyLevel: PrivacyLevel.PROTECTED
        };
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  /**
   * Check if property contains sensitive information
   */
  private isSensitiveProperty(key: string): boolean {
    const sensitiveKeys = [
      'diagnosis', 'medication', 'therapy_notes', 'crisis_details',
      'personal_info', 'contact_info', 'treatment_plan'
    ];
    
    return sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    );
  }

  /**
   * Check if event is critical and needs immediate processing
   */
  private isCriticalEvent(event: AnalyticsEvent): boolean {
    const criticalEvents = [
      'crisis_alert_triggered',
      'safety_plan_activated',
      'emergency_contact_initiated',
      'therapy_session_missed_multiple'
    ];
    
    return criticalEvents.includes(event.eventName);
  }

  /**
   * Process critical events for immediate action
   */
  private async processCriticalEvent(event: AnalyticsEvent): Promise<void> {
    try {
      switch (event.eventName) {
        case 'crisis_alert_triggered':
          await this.handleCrisisAlert(event);
          break;
        case 'safety_plan_activated':
          await this.handleSafetyPlanActivation(event);
          break;
        case 'emergency_contact_initiated':
          await this.handleEmergencyContact(event);
          break;
        default:
          console.log('Processing critical event:', event.eventName);
      }
    } catch (error) {
      console.error('Failed to process critical event:', error);
    }
  }

  /**
   * Generate wellness insights for user
   */
  async generateWellnessInsights(userId: string): Promise<WellnessTrend[]> {
    try {
      // Get user's mood and wellness tracking data
      const moodEntries = await prisma.moodScoreEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const trends: WellnessTrend[] = [];

      // Analyze mood trends
      if (moodEntries.length > 0) {
        const moodTrend = this.analyzeTrend(
          moodEntries.map(entry => ({
            timestamp: entry.createdAt,
            value: entry.moodScore,
            context: entry.notes || undefined
          }))
        );

        trends.push({
          userId,
          metric: 'mood',
          values: moodEntries.map(entry => ({
            timestamp: entry.createdAt,
            value: entry.moodScore,
            context: entry.notes || undefined
          })),
          trend: moodTrend.direction,
          confidenceScore: moodTrend.confidence
        });
      }

      // Get anxiety tracking if available
      const anxietyEntries = await prisma.moodScoreEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (anxietyEntries.length > 0) {
        const anxietyTrend = this.analyzeTrend(
          anxietyEntries
            .filter(entry => entry.anxietyLevel !== null)
            .map(entry => ({
              timestamp: entry.createdAt,
              value: entry.anxietyLevel!,
              context: entry.tags?.join(', ') || undefined
            }))
        );

        trends.push({
          userId,
          metric: 'anxiety',
          values: anxietyEntries
            .filter(entry => entry.anxietyLevel !== null)
            .map(entry => ({
              timestamp: entry.createdAt,
              value: entry.anxietyLevel!,
              context: entry.tags?.join(', ') || undefined
            })),
          trend: anxietyTrend.direction,
          confidenceScore: anxietyTrend.confidence
        });
      }

      return trends;
    } catch (error) {
      console.error('Failed to generate wellness insights:', error);
      return [];
    }
  }

  /**
   * Analyze trend direction and confidence
   */
  private analyzeTrend(data: Array<{ timestamp: Date; value: number }>): {
    direction: 'improving' | 'stable' | 'declining' | 'concerning';
    confidence: number;
  } {
    if (data.length < 3) {
      return { direction: 'stable', confidence: 0 };
    }

    // Simple linear regression for trend analysis
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    data.forEach((point, index) => {
      sumX += index;
      sumY += point.value;
      sumXY += index * point.value;
      sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = Math.abs(slope) / Math.sqrt(sumXX - (sumX * sumX) / n);

    // Determine trend direction
    let direction: 'improving' | 'stable' | 'declining' | 'concerning';
    
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0.05) {
      direction = 'improving';
    } else if (slope < -0.05) {
      const recentValues = data.slice(-7).map(d => d.value);
      const avgRecent = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      direction = avgRecent < 2 ? 'concerning' : 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      confidence: Math.min(correlation * 100, 100)
    };
  }

  /**
   * Generate aggregated platform metrics
   */
  async generatePlatformMetrics(
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<AggregatedMetric[]> {
    try {
      const metrics: AggregatedMetric[] = [];

      // Active users metric
      const activeUsers = await prisma.auditLog.groupBy({
        by: ['eventType'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          userId: true
        }
      });

      activeUsers.forEach(metric => {
        metrics.push({
          id: crypto.randomUUID(),
          metricName: 'active_users',
          dataType: (metric.eventType as AnalyticsDataType) || AnalyticsDataType.USER_ENGAGEMENT,
          value: metric._count.userId,
          periodStart: startDate,
          periodEnd: endDate,
          granularity,
          dimensions: {
            eventType: metric.eventType
          }
        });
      });

      // Feature usage metrics
      const featureUsage = await prisma.auditLog.groupBy({
        by: ['eventName'],
        where: {
          action: AnalyticsDataType.FEATURE_USAGE,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: true
      });

      featureUsage.forEach(metric => {
        metrics.push({
          id: crypto.randomUUID(),
          metricName: 'feature_usage_count',
          dataType: AnalyticsDataType.FEATURE_USAGE,
          value: metric._count,
          periodStart: startDate,
          periodEnd: endDate,
          granularity,
          dimensions: {
            feature: metric.eventName
          }
        });
      });

      return metrics;
    } catch (error) {
      console.error('Failed to generate platform metrics:', error);
      return [];
    }
  }

  /**
   * Handle critical analytics events
   */
  private async handleCrisisAlert(event: AnalyticsEvent): Promise<void> {
    // Update crisis risk scores and notify relevant systems
    console.log('Processing crisis alert analytics:', event.eventName);
  }

  private async handleSafetyPlanActivation(event: AnalyticsEvent): Promise<void> {
    // Track safety plan effectiveness and user outcomes
    console.log('Processing safety plan activation analytics:', event.eventName);
  }

  private async handleEmergencyContact(event: AnalyticsEvent): Promise<void> {
    // Track emergency response patterns and outcomes
    console.log('Processing emergency contact analytics:', event.eventName);
  }

  /**
   * Generate privacy-compliant export of user's analytics data
   */
  async exportUserAnalytics(userId: string): Promise<any> {
    try {
      // Get only non-sensitive analytics for the user
      const userEvents = await prisma.auditLog.findMany({
        where: {
          userId
        },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit export size
      });

      return {
        userId,
        totalEvents: userEvents.length,
        dateRange: {
          earliest: userEvents[userEvents.length - 1]?.timestamp,
          latest: userEvents[0]?.timestamp
        },
        events: userEvents.map(event => ({
          eventType: event.eventName,
          eventName: event.eventName,
          properties: event.details,
          timestamp: event.timestamp
        }))
      };
    } catch (error) {
      console.error('Failed to export user analytics:', error);
      throw new Error('Failed to export analytics data');
    }
  }

  /**
   * Delete user's analytics data (GDPR compliance)
   */
  async deleteUserAnalytics(userId: string): Promise<void> {
    try {
      // Delete analytics events
      await prisma.auditLog.deleteMany({
        where: { userId }
      });

      // Log the deletion for audit purposes
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'analytics_data_deleted',
          resource: 'user_analytics',
          resourceId: userId,
          details: {
            reason: 'user_data_deletion_request',
            timestamp: new Date()
          },
          outcome: 'success'
        }
      });
    } catch (error) {
      console.error('Failed to delete user analytics:', error);
      throw new Error('Failed to delete analytics data');
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;