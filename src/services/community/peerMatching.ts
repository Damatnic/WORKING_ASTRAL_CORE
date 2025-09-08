// Peer Matching Algorithm Service
// Intelligently matches peers based on compatibility while maintaining anonymity

import { AnonymousUser, PeerMatch, GroupTopic } from '@/types/community';

interface MatchingPreferences {
  topics?: GroupTopic[];
  languages?: string[];
  timezone?: string;
  supportType?: 'listener' | 'mutual' | 'mentor';
  availability?: {
    days: string[];
    hours: { start: number; end: number };
  };
}

interface CompatibilityFactors {
  topicMatch: number;
  languageMatch: number;
  timezoneCompatibility: number;
  availabilityOverlap: number;
  supportTypeAlignment: number;
  experienceBalance: number;
  recentActivityScore: number;
}

export class PeerMatchingService {
  private readonly MINIMUM_COMPATIBILITY_SCORE = 60;
  private readonly OPTIMAL_COMPATIBILITY_SCORE = 80;
  
  // Weight factors for different matching criteria
  private readonly WEIGHTS = {
    topicMatch: 0.25,
    languageMatch: 0.20,
    timezoneCompatibility: 0.15,
    availabilityOverlap: 0.15,
    supportTypeAlignment: 0.10,
    experienceBalance: 0.10,
    recentActivityScore: 0.05
  };

  /**
   * Find compatible peer matches for a user
   */
  async findMatches(
    user: AnonymousUser,
    preferences: MatchingPreferences,
    availablePeers: AnonymousUser[]
  ): Promise<PeerMatch[]> {
    const potentialMatches: PeerMatch[] = [];

    // Filter out incompatible peers
    const compatiblePeers = this.filterIncompatiblePeers(
      user,
      preferences,
      availablePeers
    );

    // Calculate compatibility scores
    for (const peer of compatiblePeers) {
      const compatibility = await this.calculateCompatibility(
        user,
        peer,
        preferences
      );

      if (compatibility.score >= this.MINIMUM_COMPATIBILITY_SCORE) {
        const match: PeerMatch = {
          matchId: this.generateMatchId(),
          participants: [user.sessionId, peer.sessionId],
          compatibilityScore: compatibility.score,
          matchReason: compatibility.reasons,
          status: 'pending',
          startedAt: new Date(),
          chatEnabled: true,
          videoEnabled: false
        };

        potentialMatches.push(match);
      }
    }

    // Sort by compatibility score and return top matches
    return potentialMatches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 5);
  }

  /**
   * Calculate comprehensive compatibility between two users
   */
  private async calculateCompatibility(
    userA: AnonymousUser,
    userB: AnonymousUser,
    preferences: MatchingPreferences
  ): Promise<{ score: number; reasons: string[] }> {
    const factors: CompatibilityFactors = {
      topicMatch: 0,
      languageMatch: 0,
      timezoneCompatibility: 0,
      availabilityOverlap: 0,
      supportTypeAlignment: 0,
      experienceBalance: 0,
      recentActivityScore: 0
    };

    const matchReasons: string[] = [];

    // Topic compatibility
    if (preferences.topics) {
      factors.topicMatch = this.calculateTopicCompatibility(preferences.topics);
      if (factors.topicMatch > 70) {
        matchReasons.push('Shared experiences and challenges');
      }
    }

    // Language match
    const commonLanguages = userA.languages.filter(lang => 
      userB.languages.includes(lang)
    );
    if (commonLanguages.length > 0) {
      factors.languageMatch = 100;
      matchReasons.push(`Common language: ${commonLanguages[0]}`);
    }

    // Timezone compatibility
    factors.timezoneCompatibility = this.calculateTimezoneCompatibility(
      userA.timezone,
      userB.timezone
    );
    if (factors.timezoneCompatibility > 80) {
      matchReasons.push('Similar timezone for real-time support');
    }

    // Availability overlap
    if (preferences.availability) {
      factors.availabilityOverlap = this.calculateAvailabilityOverlap(
        preferences.availability,
        userB
      );
      if (factors.availabilityOverlap > 60) {
        matchReasons.push('Overlapping availability');
      }
    }

    // Support type alignment
    factors.supportTypeAlignment = this.calculateSupportTypeAlignment(
      preferences.supportType,
      userB.supportRole
    );
    if (factors.supportTypeAlignment > 80) {
      matchReasons.push('Compatible support styles');
    }

    // Experience balance
    factors.experienceBalance = this.calculateExperienceBalance(
      userA.trustScore,
      userB.trustScore
    );
    if (factors.experienceBalance > 70) {
      matchReasons.push('Balanced experience levels');
    }

    // Recent activity
    factors.recentActivityScore = this.calculateRecentActivity(userB);
    if (factors.recentActivityScore > 80) {
      matchReasons.push('Recently active in the community');
    }

    // Calculate weighted score
    const totalScore = this.calculateWeightedScore(factors);

    // Add special compatibility bonuses
    const bonusScore = await this.calculateBonusCompatibility(userA, userB);
    const finalScore = Math.min(100, totalScore + bonusScore);

    return {
      score: Math.round(finalScore),
      reasons: matchReasons
    };
  }

  /**
   * Filter out incompatible peers based on hard constraints
   */
  private filterIncompatiblePeers(
    user: AnonymousUser,
    preferences: MatchingPreferences,
    peers: AnonymousUser[]
  ): AnonymousUser[] {
    return peers.filter(peer => {
      // Don't match with self
      if (peer.sessionId === user.sessionId) return false;

      // Language requirement
      if (preferences.languages && preferences.languages.length > 0) {
        const hasCommonLanguage = peer.languages.some(lang =>
          preferences.languages!.includes(lang)
        );
        if (!hasCommonLanguage) return false;
      }

      // Minimum trust score
      if (peer.trustScore < 20) return false;

      // Check if peer is available for matching
      if (peer.supportRole === 'moderator') return false;

      return true;
    });
  }

  /**
   * Calculate topic compatibility based on shared interests
   */
  private calculateTopicCompatibility(topics: GroupTopic[]): number {
    // In a real implementation, this would compare user's topics with peer's
    // For now, return a simulated score
    const commonTopicsScore = topics.length * 20;
    return Math.min(100, commonTopicsScore);
  }

  /**
   * Calculate timezone compatibility
   */
  private calculateTimezoneCompatibility(tz1: string, tz2: string): number {
    // Parse timezone offsets
    const offset1 = this.getTimezoneOffset(tz1);
    const offset2 = this.getTimezoneOffset(tz2);
    
    const hourDifference = Math.abs(offset1 - offset2);
    
    if (hourDifference === 0) return 100;
    if (hourDifference <= 3) return 80;
    if (hourDifference <= 6) return 60;
    if (hourDifference <= 9) return 40;
    return 20;
  }

  /**
   * Calculate availability overlap
   */
  private calculateAvailabilityOverlap(
    availability: any,
    peer: AnonymousUser
  ): number {
    // Simplified calculation - in production would check actual schedules
    return 70; // Placeholder
  }

  /**
   * Calculate support type alignment
   */
  private calculateSupportTypeAlignment(
    preferredType?: string,
    peerRole?: string
  ): number {
    if (!preferredType || !peerRole) return 50;

    const alignmentMap: Record<string, Record<string, number>> = {
      listener: { peer: 80, mentor: 60 },
      mutual: { peer: 100, mentor: 40 },
      mentor: { peer: 40, mentor: 100 }
    };

    return alignmentMap[preferredType]?.[peerRole] || 50;
  }

  /**
   * Calculate experience balance for healthy peer relationships
   */
  private calculateExperienceBalance(
    trustScore1: number,
    trustScore2: number
  ): number {
    const difference = Math.abs(trustScore1 - trustScore2);
    
    // Ideal is similar experience levels or mentoring relationship
    if (difference < 10) return 100; // Very similar
    if (difference < 20) return 80;  // Similar
    if (difference > 50) return 90;  // Good for mentoring
    if (difference < 30) return 60;  // Somewhat similar
    return 40; // Large gap
  }

  /**
   * Calculate recent activity score
   */
  private calculateRecentActivity(user: AnonymousUser): number {
    const now = new Date();
    const joinedDate = new Date(user.joinedAt);
    const daysSinceJoined = (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Assume activity based on join date for now
    if (daysSinceJoined < 1) return 100;
    if (daysSinceJoined < 7) return 80;
    if (daysSinceJoined < 30) return 60;
    if (daysSinceJoined < 90) return 40;
    return 20;
  }

  /**
   * Calculate weighted total score
   */
  private calculateWeightedScore(factors: CompatibilityFactors): number {
    let totalScore = 0;
    
    totalScore += factors.topicMatch * this.WEIGHTS.topicMatch;
    totalScore += factors.languageMatch * this.WEIGHTS.languageMatch;
    totalScore += factors.timezoneCompatibility * this.WEIGHTS.timezoneCompatibility;
    totalScore += factors.availabilityOverlap * this.WEIGHTS.availabilityOverlap;
    totalScore += factors.supportTypeAlignment * this.WEIGHTS.supportTypeAlignment;
    totalScore += factors.experienceBalance * this.WEIGHTS.experienceBalance;
    totalScore += factors.recentActivityScore * this.WEIGHTS.recentActivityScore;
    
    return totalScore;
  }

  /**
   * Calculate bonus compatibility factors
   */
  private async calculateBonusCompatibility(
    userA: AnonymousUser,
    userB: AnonymousUser
  ): Promise<number> {
    let bonus = 0;

    // Both users are mentors - great for peer support
    if (userA.supportRole === 'mentor' && userB.supportRole === 'mentor') {
      bonus += 5;
    }

    // High trust scores on both sides
    if (userA.trustScore > 80 && userB.trustScore > 80) {
      bonus += 5;
    }

    // New user with experienced peer
    const isNewUser = userA.trustScore < 30;
    const isExperienced = userB.trustScore > 70;
    if (isNewUser && isExperienced && userB.supportRole === 'mentor') {
      bonus += 10;
    }

    return bonus;
  }

  /**
   * Get timezone offset in hours
   */
  private getTimezoneOffset(timezone: string): number {
    // Simplified - in production would use proper timezone library
    const offsets: Record<string, number> = {
      'UTC': 0,
      'EST': -5,
      'CST': -6,
      'MST': -7,
      'PST': -8,
      'CET': 1,
      'JST': 9,
      'AEST': 10
    };
    
    return offsets[timezone] || 0;
  }

  /**
   * Generate unique match ID
   */
  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate and initiate a peer match
   */
  async initiateMatch(match: PeerMatch): Promise<boolean> {
    try {
      // Verify both participants are available
      // Send match notifications
      // Set up encrypted chat channel
      
      match.status = 'active';
      match.chatEnabled = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initiate match:', error);
      return false;
    }
  }

  /**
   * End a peer match session
   */
  async endMatch(
    matchId: string,
    reason: 'completed' | 'cancelled',
    feedback?: any
  ): Promise<void> {
    // Update match status
    // Collect feedback if provided
    // Update trust scores based on interaction
    // Clean up chat channels
  }

  /**
   * Get match recommendations with explanations
   */
  async getMatchRecommendations(
    user: AnonymousUser,
    preferences: MatchingPreferences
  ): Promise<{
    matches: PeerMatch[];
    insights: string[];
  }> {
    // Get available peers (this would come from a database in production)
    const availablePeers = await this.getAvailablePeers();
    
    const matches = await this.findMatches(user, preferences, availablePeers);
    
    const insights = this.generateMatchingInsights(matches, preferences);
    
    return { matches, insights };
  }

  /**
   * Generate insights about matching results
   */
  private generateMatchingInsights(
    matches: PeerMatch[],
    preferences: MatchingPreferences
  ): string[] {
    const insights: string[] = [];

    if (matches.length === 0) {
      insights.push('No matches found. Try broadening your preferences.');
    } else if (matches.length < 3) {
      insights.push('Limited matches available. Consider adjusting your availability.');
    } else {
      const avgScore = matches.reduce((sum, m) => sum + m.compatibilityScore, 0) / matches.length;
      if (avgScore > this.OPTIMAL_COMPATIBILITY_SCORE) {
        insights.push('Excellent matches found based on your preferences!');
      } else {
        insights.push('Good matches available. Compatibility will improve as you engage more.');
      }
    }

    if (preferences.supportType === 'mentor') {
      insights.push('Mentors are matched based on experience and availability.');
    }

    return insights;
  }

  /**
   * Mock function to get available peers
   */
  private async getAvailablePeers(): Promise<AnonymousUser[]> {
    // In production, this would query the database
    return [];
  }
}

// Export singleton instance
export const peerMatchingService = new PeerMatchingService();