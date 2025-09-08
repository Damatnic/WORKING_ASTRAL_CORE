/**
 * Cache Strategies for AstralCore Mental Health Platform
 * Optimized caching strategies for different data types with HIPAA compliance
 * 
 * Features:
 * - User session caching with security
 * - Profile caching with data sensitivity handling
 * - Wellness data aggregation caching
 * - Community content caching with real-time updates
 * - Crisis resource caching with high availability
 * - Therapy session management caching
 * - System configuration caching
 */

import { redisCacheService, CacheType } from './redis-cache';
import { createHash } from 'crypto';

/**
 * Base cache strategy interface
 */
interface CacheStrategy<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<boolean>;
  invalidate(key: string): Promise<boolean>;
  invalidatePattern(pattern: string): Promise<number>;
  warmUp?(): Promise<void>;
}

/**
 * User Session Cache Strategy
 * Handles user authentication sessions with security
 */
export class SessionCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'SESSION';
  
  async get(sessionToken: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, sessionToken);
    } catch (error) {
      console.error('[SessionCache] Get error:', error);
      return null;
    }
  }
  
  async set(sessionToken: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    try {
      // Add session metadata
      const enrichedSession = {
        ...sessionData,
        lastAccessed: new Date().toISOString(),
        ipAddress: sessionData.ipAddress || 'unknown',
        userAgent: sessionData.userAgent || 'unknown',
      };
      
      return await redisCacheService.set(this.cacheType, sessionToken, enrichedSession, ttl);
    } catch (error) {
      console.error('[SessionCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(sessionToken: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, sessionToken);
    } catch (error) {
      console.error('[SessionCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:session:*${pattern}*`);
  }
  
  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    return await this.invalidatePattern(userId);
  }
  
  /**
   * Touch session to extend TTL
   */
  async touch(sessionToken: string, ttl: number = 86400): Promise<boolean> {
    const session = await this.get(sessionToken);
    if (session) {
      session.lastAccessed = new Date().toISOString();
      return await this.set(sessionToken, session, ttl);
    }
    return false;
  }
}

/**
 * User Profile Cache Strategy
 * Handles user profile data with PII protection
 */
export class UserProfileCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'USER_PROFILE';
  
  async get(userId: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, userId);
    } catch (error) {
      console.error('[UserProfileCache] Get error:', error);
      return null;
    }
  }
  
  async set(userId: string, profileData: any, ttl: number = 3600): Promise<boolean> {
    try {
      // Remove sensitive fields before caching
      const cacheableProfile = this.sanitizeProfile(profileData);
      
      return await redisCacheService.set(this.cacheType, userId, cacheableProfile, ttl);
    } catch (error) {
      console.error('[UserProfileCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(userId: string): Promise<boolean> {
    try {
      // Also invalidate related caches
      await Promise.all([
        redisCacheService.delete(this.cacheType, userId),
        redisCacheService.delete('DASHBOARD_METRICS', userId),
        redisCacheService.delete('WELLNESS_AGGREGATION', userId),
      ]);
      
      return true;
    } catch (error) {
      console.error('[UserProfileCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:user:*${pattern}*`);
  }
  
  /**
   * Remove sensitive data from profile before caching
   */
  private sanitizeProfile(profile: any): any {
    const { 
      password, 
      ssn, 
      creditCard, 
      bankAccount,
      emergencyContact,
      ...sanitized 
    } = profile;
    
    return {
      ...sanitized,
      lastCached: new Date().toISOString(),
    };
  }
  
  /**
   * Cache multiple profiles in batch
   */
  async batchSet(profiles: Map<string, any>, ttl?: number): Promise<boolean> {
    try {
      const sanitizedProfiles = new Map();
      
      profiles.forEach((profile, userId) => {
        sanitizedProfiles.set(userId, this.sanitizeProfile(profile));
      });
      
      return await redisCacheService.batchSet(this.cacheType, sanitizedProfiles, ttl);
    } catch (error) {
      console.error('[UserProfileCache] Batch set error:', error);
      return false;
    }
  }
}

/**
 * Wellness Data Aggregation Cache Strategy
 * Handles aggregated wellness metrics and insights
 */
export class WellnessAggregationCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'WELLNESS_AGGREGATION';
  
  async get(key: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, key);
    } catch (error) {
      console.error('[WellnessAggregationCache] Get error:', error);
      return null;
    }
  }
  
  async set(key: string, aggregationData: any, ttl: number = 1800): Promise<boolean> {
    try {
      const enrichedData = {
        ...aggregationData,
        computedAt: new Date().toISOString(),
        version: '1.0',
      };
      
      return await redisCacheService.set(this.cacheType, key, enrichedData, ttl);
    } catch (error) {
      console.error('[WellnessAggregationCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(key: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, key);
    } catch (error) {
      console.error('[WellnessAggregationCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:wellness:*${pattern}*`);
  }
  
  /**
   * Cache user's wellness summary
   */
  async cacheUserWellnessSummary(
    userId: string,
    summary: any,
    ttl: number = 1800
  ): Promise<boolean> {
    const key = `user:${userId}:summary`;
    return await this.set(key, summary, ttl);
  }
  
  /**
   * Cache mood trend data
   */
  async cacheMoodTrends(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    trends: any,
    ttl: number = 3600
  ): Promise<boolean> {
    const key = `user:${userId}:mood:${period}`;
    return await this.set(key, trends, ttl);
  }
  
  /**
   * Cache wellness insights
   */
  async cacheWellnessInsights(
    userId: string,
    insights: any,
    ttl: number = 7200
  ): Promise<boolean> {
    const key = `user:${userId}:insights`;
    return await this.set(key, insights, ttl);
  }
  
  /**
   * Invalidate all wellness data for a user
   */
  async invalidateUserWellnessData(userId: string): Promise<number> {
    return await this.invalidatePattern(`user:${userId}`);
  }
}

/**
 * Community Post Ranking Cache Strategy
 * Handles community posts with real-time ranking updates
 */
export class CommunityRankingCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'COMMUNITY_RANKING';
  
  async get(key: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, key);
    } catch (error) {
      console.error('[CommunityRankingCache] Get error:', error);
      return null;
    }
  }
  
  async set(key: string, rankingData: any, ttl: number = 600): Promise<boolean> {
    try {
      const enrichedData = {
        ...rankingData,
        rankedAt: new Date().toISOString(),
        algorithm: 'engagement_score',
      };
      
      return await redisCacheService.set(this.cacheType, key, enrichedData, ttl);
    } catch (error) {
      console.error('[CommunityRankingCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(key: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, key);
    } catch (error) {
      console.error('[CommunityRankingCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:community:*${pattern}*`);
  }
  
  /**
   * Cache trending posts
   */
  async cacheTrendingPosts(posts: any[], ttl: number = 300): Promise<boolean> {
    const key = 'trending:posts';
    return await this.set(key, { posts, trendingAt: Date.now() }, ttl);
  }
  
  /**
   * Cache hot topics
   */
  async cacheHotTopics(topics: any[], ttl: number = 900): Promise<boolean> {
    const key = 'hot:topics';
    return await this.set(key, { topics, updatedAt: Date.now() }, ttl);
  }
  
  /**
   * Cache user feed rankings
   */
  async cacheUserFeedRanking(
    userId: string,
    feedData: any,
    ttl: number = 600
  ): Promise<boolean> {
    const key = `user:${userId}:feed`;
    return await this.set(key, feedData, ttl);
  }
  
  /**
   * Invalidate all community rankings
   */
  async invalidateAllRankings(): Promise<void> {
    await Promise.all([
      this.invalidate('trending:posts'),
      this.invalidate('hot:topics'),
      this.invalidatePattern('user:*:feed'),
    ]);
  }
}

/**
 * Crisis Resources Cache Strategy
 * High-availability caching for critical crisis resources
 */
export class CrisisResourcesCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'CRISIS_RESOURCES';
  
  async get(key: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, key);
    } catch (error) {
      console.error('[CrisisResourcesCache] Get error:', error);
      return null;
    }
  }
  
  async set(key: string, resourceData: any, ttl: number = 7200): Promise<boolean> {
    try {
      const enrichedData = {
        ...resourceData,
        cachedAt: new Date().toISOString(),
        priority: 'critical',
      };
      
      return await redisCacheService.set(this.cacheType, key, enrichedData, ttl);
    } catch (error) {
      console.error('[CrisisResourcesCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(key: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, key);
    } catch (error) {
      console.error('[CrisisResourcesCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:crisis:*${pattern}*`);
  }
  
  /**
   * Cache emergency hotlines
   */
  async cacheEmergencyHotlines(hotlines: any[]): Promise<boolean> {
    const key = 'emergency:hotlines';
    return await this.set(key, { hotlines, type: 'emergency' }, 86400); // 24 hour TTL
  }
  
  /**
   * Cache crisis intervention protocols
   */
  async cacheCrisisProtocols(protocols: any[]): Promise<boolean> {
    const key = 'protocols:crisis';
    return await this.set(key, { protocols, lastUpdated: Date.now() }, 43200); // 12 hour TTL
  }
  
  /**
   * Cache safety planning resources
   */
  async cacheSafetyPlanningResources(resources: any[]): Promise<boolean> {
    const key = 'safety:planning';
    return await this.set(key, { resources, version: '2.0' }, 21600); // 6 hour TTL
  }
  
  /**
   * Cache location-based crisis resources
   */
  async cacheLocationResources(
    location: string,
    resources: any[]
  ): Promise<boolean> {
    const locationHash = createHash('sha256').update(location).digest('hex').substring(0, 8);
    const key = `location:${locationHash}`;
    return await this.set(key, { location, resources }, 14400); // 4 hour TTL
  }
  
  /**
   * Warm up critical crisis resources
   */
  async warmUp(): Promise<void> {
    try {
      console.log('[CrisisResourcesCache] Warming up critical resources...');
      
      // Cache emergency hotlines
      await this.cacheEmergencyHotlines([
        { id: '1', name: 'National Suicide Prevention Lifeline', number: '988', available: '24/7' },
        { id: '2', name: 'Crisis Text Line', number: '741741', available: '24/7' },
        { id: '3', name: 'SAMHSA National Helpline', number: '1-800-662-4357', available: '24/7' },
      ]);
      
      console.log('[CrisisResourcesCache] Warm up completed');
    } catch (error) {
      console.error('[CrisisResourcesCache] Warm up error:', error);
    }
  }
}

/**
 * Therapy Session Availability Cache Strategy
 * Manages therapy session scheduling and availability
 */
export class TherapyAvailabilityCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'THERAPY_AVAILABILITY';
  
  async get(key: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, key);
    } catch (error) {
      console.error('[TherapyAvailabilityCache] Get error:', error);
      return null;
    }
  }
  
  async set(key: string, availabilityData: any, ttl: number = 900): Promise<boolean> {
    try {
      const enrichedData = {
        ...availabilityData,
        lastChecked: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      return await redisCacheService.set(this.cacheType, key, enrichedData, ttl);
    } catch (error) {
      console.error('[TherapyAvailabilityCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(key: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, key);
    } catch (error) {
      console.error('[TherapyAvailabilityCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:therapy:*${pattern}*`);
  }
  
  /**
   * Cache therapist availability
   */
  async cacheTherapistAvailability(
    therapistId: string,
    availability: any[],
    ttl: number = 900
  ): Promise<boolean> {
    const key = `therapist:${therapistId}:availability`;
    return await this.set(key, { slots: availability }, ttl);
  }
  
  /**
   * Cache available time slots for a date
   */
  async cacheDateAvailability(
    date: string,
    availableSlots: any[],
    ttl: number = 1800
  ): Promise<boolean> {
    const key = `date:${date}:slots`;
    return await this.set(key, { date, availableSlots }, ttl);
  }
  
  /**
   * Invalidate availability when session is booked
   */
  async invalidateOnBooking(therapistId: string, date: string): Promise<void> {
    await Promise.all([
      this.invalidate(`therapist:${therapistId}:availability`),
      this.invalidate(`date:${date}:slots`),
    ]);
  }
}

/**
 * System Configuration Cache Strategy
 * Handles system-wide configuration with long TTL
 */
export class SystemConfigCacheStrategy implements CacheStrategy<any> {
  private readonly cacheType: CacheType = 'SYSTEM_CONFIG';
  
  async get(key: string): Promise<any | null> {
    try {
      return await redisCacheService.get(this.cacheType, key);
    } catch (error) {
      console.error('[SystemConfigCache] Get error:', error);
      return null;
    }
  }
  
  async set(key: string, configData: any, ttl: number = 21600): Promise<boolean> {
    try {
      const enrichedData = {
        ...configData,
        lastUpdated: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      };
      
      return await redisCacheService.set(this.cacheType, key, enrichedData, ttl);
    } catch (error) {
      console.error('[SystemConfigCache] Set error:', error);
      return false;
    }
  }
  
  async invalidate(key: string): Promise<boolean> {
    try {
      return await redisCacheService.delete(this.cacheType, key);
    } catch (error) {
      console.error('[SystemConfigCache] Invalidate error:', error);
      return false;
    }
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    return await redisCacheService.invalidatePattern(`astral:config:*${pattern}*`);
  }
  
  /**
   * Cache feature flags
   */
  async cacheFeatureFlags(flags: Record<string, boolean>): Promise<boolean> {
    const key = 'feature:flags';
    return await this.set(key, flags, 43200); // 12 hour TTL
  }
  
  /**
   * Cache rate limiting configuration
   */
  async cacheRateLimits(limits: Record<string, number>): Promise<boolean> {
    const key = 'rate:limits';
    return await this.set(key, limits, 86400); // 24 hour TTL
  }
  
  /**
   * Cache maintenance status
   */
  async cacheMaintenanceStatus(status: any): Promise<boolean> {
    const key = 'maintenance:status';
    return await this.set(key, status, 300); // 5 minute TTL
  }
  
  /**
   * Warm up system configuration
   */
  async warmUp(): Promise<void> {
    try {
      console.log('[SystemConfigCache] Warming up system configuration...');
      
      // Default feature flags
      await this.cacheFeatureFlags({
        communityEnabled: true,
        crisisInterventionEnabled: true,
        therapySessionsEnabled: true,
        aiInsightsEnabled: true,
      });
      
      // Default rate limits
      await this.cacheRateLimits({
        api: 1000,
        auth: 10,
        crisis: 100,
      });
      
      // Maintenance status
      await this.cacheMaintenanceStatus({
        isMaintenanceMode: false,
        scheduledMaintenance: null,
      });
      
      console.log('[SystemConfigCache] Warm up completed');
    } catch (error) {
      console.error('[SystemConfigCache] Warm up error:', error);
    }
  }
}

// Export strategy instances
export const sessionCache = new SessionCacheStrategy();
export const userProfileCache = new UserProfileCacheStrategy();
export const wellnessAggregationCache = new WellnessAggregationCacheStrategy();
export const communityRankingCache = new CommunityRankingCacheStrategy();
export const crisisResourcesCache = new CrisisResourcesCacheStrategy();
export const therapyAvailabilityCache = new TherapyAvailabilityCacheStrategy();
export const systemConfigCache = new SystemConfigCacheStrategy();

/**
 * Cache Strategy Manager
 * Coordinates cache warming and invalidation across all strategies
 */
export class CacheStrategyManager {
  private strategies: Map<string, CacheStrategy<any>> = new Map();
  
  constructor() {
    this.strategies.set('session', sessionCache);
    this.strategies.set('userProfile', userProfileCache);
    this.strategies.set('wellness', wellnessAggregationCache);
    this.strategies.set('community', communityRankingCache);
    this.strategies.set('crisis', crisisResourcesCache);
    this.strategies.set('therapy', therapyAvailabilityCache);
    this.strategies.set('config', systemConfigCache);
  }
  
  /**
   * Warm up all cache strategies
   */
  async warmUpAll(): Promise<void> {
    console.log('[CacheStrategyManager] Starting cache warm up...');
    
    const warmUpPromises = Array.from(this.strategies.entries())
      .filter(([_, strategy]) => strategy.warmUp)
      .map(async ([name, strategy]) => {
        try {
          await strategy.warmUp!();
          console.log(`[CacheStrategyManager] ${name} cache warmed up`);
        } catch (error) {
          console.error(`[CacheStrategyManager] ${name} cache warm up failed:`, error);
        }
      });
    
    await Promise.all(warmUpPromises);
    console.log('[CacheStrategyManager] Cache warm up completed');
  }
  
  /**
   * Get strategy by name
   */
  getStrategy<T>(name: string): CacheStrategy<T> | null {
    return this.strategies.get(name) as CacheStrategy<T> || null;
  }
  
  /**
   * Invalidate cache across multiple strategies
   */
  async invalidateAcrossStrategies(
    strategyKeys: Array<{ strategy: string; key: string }>
  ): Promise<void> {
    const invalidationPromises = strategyKeys.map(async ({ strategy, key }) => {
      const cacheStrategy = this.getStrategy(strategy);
      if (cacheStrategy) {
        await cacheStrategy.invalidate(key);
      }
    });
    
    await Promise.all(invalidationPromises);
  }
}

// Export manager instance
export const cacheStrategyManager = new CacheStrategyManager();