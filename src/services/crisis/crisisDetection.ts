/**
 * Crisis Detection Service
 * Advanced pattern matching and ML-ready crisis detection system
 * Target: 89% accuracy in identifying crisis situations
 */

export interface CrisisIndicator {
  type: "keyword" | "pattern" | "behavioral" | "temporal";
  severity: 1 | 2 | 3 | 4 | 5; // 1 = low concern, 5 = immediate danger
  confidence: number; // 0-1 confidence score
}

export interface CrisisAssessment {
  isInCrisis: boolean;
  severity: number;
  confidence: number;
  indicators: CrisisIndicator[];
  suggestedActions: string[];
  requiresImmediate: boolean;
}

// Crisis keywords categorized by severity
const CRISIS_KEYWORDS = {
  immediate: [
    "suicide", "kill myself", "end it all", "not worth living",
    "better off dead", "want to die", "can't go on", "no reason to live"
  ],
  high: [
    "hopeless", "worthless", "burden", "give up", "can't take it",
    "nothing matters", "alone forever", "nobody cares", "hate myself"
  ],
  moderate: [
    "depressed", "anxious", "panic", "scared", "overwhelmed",
    "falling apart", "breaking down", "can't cope", "losing control"
  ],
  contextual: [
    "tired", "stressed", "worried", "sad", "lonely",
    "frustrated", "angry", "confused", "lost", "empty"
  ]
};

// Behavioral patterns that may indicate crisis
// const BEHAVIORAL_PATTERNS = {
//   suddenWithdrawal: {
//     indicator: "Sudden cessation of regular activity",
//     severity: 3
//   },
//   giftGiving: {
//     indicator: "Mentions of giving away possessions",
//     severity: 4
//   },
//   finalStatements: {
//     indicator: "Language suggesting finality or goodbye",
//     severity: 5
//   },
//   planMentions: {
//     indicator: "References to specific harmful plans",
//     severity: 5
//   },
//   isolationLanguage: {
//     indicator: "Expressions of extreme isolation",
//     severity: 3
//   }
// };

export class CrisisDetectionService {
  private static instance: CrisisDetectionService;
  
  private constructor() {}
  
  static getInstance(): CrisisDetectionService {
    if (!CrisisDetectionService.instance) {
      CrisisDetectionService.instance = new CrisisDetectionService();
    }
    return CrisisDetectionService.instance;
  }

  /**
   * Analyze text for crisis indicators
   */
  analyzeText(text: string): CrisisAssessment {
    const normalizedText = text.toLowerCase();
    const indicators: CrisisIndicator[] = [];
    let maxSeverity = 0;
    let totalConfidence = 0;

    // Check for immediate crisis keywords
    for (const keyword of CRISIS_KEYWORDS.immediate) {
      if (normalizedText.includes(keyword)) {
        indicators.push({
          type: "keyword",
          severity: 5,
          confidence: 0.95
        });
        maxSeverity = 5;
      }
    }

    // Check for high-risk keywords
    for (const keyword of CRISIS_KEYWORDS.high) {
      if (normalizedText.includes(keyword)) {
        indicators.push({
          type: "keyword",
          severity: 4,
          confidence: 0.85
        });
        maxSeverity = Math.max(maxSeverity, 4);
      }
    }

    // Check for moderate keywords
    for (const keyword of CRISIS_KEYWORDS.moderate) {
      if (normalizedText.includes(keyword)) {
        indicators.push({
          type: "keyword",
          severity: 3,
          confidence: 0.75
        });
        maxSeverity = Math.max(maxSeverity, 3);
      }
    }

    // Check for behavioral patterns
    const patterns = this.detectBehavioralPatterns(normalizedText);
    indicators.push(...patterns);
    
    if (patterns.length > 0) {
      const patternSeverity = Math.max(...patterns.map(p => p.severity));
      maxSeverity = Math.max(maxSeverity, patternSeverity);
    }

    // Calculate overall confidence
    if (indicators.length > 0) {
      totalConfidence = indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length;
    }

    // Determine if user is in crisis
    const isInCrisis = maxSeverity >= 3 || (maxSeverity >= 2 && indicators.length >= 3);
    const requiresImmediate = maxSeverity >= 4;

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(maxSeverity, indicators);

    return {
      isInCrisis,
      severity: maxSeverity,
      confidence: totalConfidence,
      indicators,
      suggestedActions,
      requiresImmediate
    };
  }

  /**
   * Analyze user behavior patterns over time
   */
  analyzeBehaviorPattern(
    moodHistory: number[],
    activityLevel: number[],
    socialInteraction: number[]
  ): CrisisAssessment {
    const indicators: CrisisIndicator[] = [];
    
    // Check for declining mood pattern
    const moodTrend = this.calculateTrend(moodHistory);
    if (moodTrend < -0.3) {
      indicators.push({
        type: "temporal",
        severity: Math.min(5, Math.floor(Math.abs(moodTrend) * 5)) as 1 | 2 | 3 | 4 | 5,
        confidence: 0.8
      });
    }

    // Check for social withdrawal
    const socialTrend = this.calculateTrend(socialInteraction);
    if (socialTrend < -0.4) {
      indicators.push({
        type: "behavioral",
        severity: 3,
        confidence: 0.75
      });
    }

    // Check for activity level changes
    const activityTrend = this.calculateTrend(activityLevel);
    if (Math.abs(activityTrend) > 0.5) {
      indicators.push({
        type: "behavioral",
        severity: 2,
        confidence: 0.7
      });
    }

    const maxSeverity = indicators.length > 0 
      ? Math.max(...indicators.map(i => i.severity))
      : 0;
    
    const avgConfidence = indicators.length > 0
      ? indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length
      : 0;

    return {
      isInCrisis: maxSeverity >= 3,
      severity: maxSeverity,
      confidence: avgConfidence,
      indicators,
      suggestedActions: this.generateSuggestedActions(maxSeverity, indicators),
      requiresImmediate: maxSeverity >= 4
    };
  }

  /**
   * Detect behavioral patterns in text
   */
  private detectBehavioralPatterns(text: string): CrisisIndicator[] {
    const patterns: CrisisIndicator[] = [];

    // Check for final statements
    if (text.match(/goodbye|farewell|this is it|last (message|words|time)/)) {
      patterns.push({
        type: "pattern",
        severity: 5,
        confidence: 0.9
      });
    }

    // Check for plan mentions
    if (text.match(/(have a plan|know how|decided how|way to do it)/)) {
      patterns.push({
        type: "pattern",
        severity: 5,
        confidence: 0.95
      });
    }

    // Check for isolation language
    if (text.match(/(no one understands|completely alone|nobody cares|all alone)/)) {
      patterns.push({
        type: "pattern",
        severity: 3,
        confidence: 0.7
      });
    }

    return patterns;
  }

  /**
   * Calculate trend from numerical array (-1 to 1)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.max(-1, Math.min(1, slope));
  }

  /**
   * Generate suggested actions based on assessment
   */
  private generateSuggestedActions(severity: number, _indicators: CrisisIndicator[]): string[] {
    const actions: string[] = [];

    if (severity >= 4) {
      actions.push("Show crisis hotline immediately");
      actions.push("Offer emergency contact button");
      actions.push("Suggest calling 988 or emergency services");
      actions.push("Display safety plan if available");
    } else if (severity >= 3) {
      actions.push("Offer crisis chat support");
      actions.push("Suggest coping strategies");
      actions.push("Prompt for safety plan creation");
      actions.push("Offer to connect with peer support");
    } else if (severity >= 2) {
      actions.push("Suggest self-care activities");
      actions.push("Offer mood tracking tools");
      actions.push("Provide wellness resources");
      actions.push("Suggest scheduling with therapist");
    } else {
      actions.push("Continue monitoring");
      actions.push("Offer wellness check-in");
    }

    return actions;
  }

  /**
   * Real-time monitoring for crisis escalation
   */
  monitorEscalation(
    previousAssessment: CrisisAssessment,
    currentAssessment: CrisisAssessment
  ): boolean {
    const severityIncrease = currentAssessment.severity - previousAssessment.severity;
    const confidenceIncrease = currentAssessment.confidence - previousAssessment.confidence;
    
    // Escalation detected if severity increases by 2+ or confidence significantly increases
    return severityIncrease >= 2 || (severityIncrease >= 1 && confidenceIncrease >= 0.2);
  }
}

export default CrisisDetectionService;