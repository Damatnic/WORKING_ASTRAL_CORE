/**
 * Crisis Detection System
 * Real-time analysis and detection of crisis indicators with immediate escalation capabilities
 */

import { EventEmitter } from 'events';

export interface CrisisAssessment {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: CrisisIndicator[];
  immediateRisk: boolean;
  suicidalIdeation: boolean;
  homicidalIdeation: boolean;
  selfHarm: boolean;
  substanceUse: boolean;
  psychosis: boolean;
  recommendations: string[];
  escalationRequired: boolean;
}

export interface CrisisIndicator {
  type: CrisisType;
  severity: number; // 0-1
  confidence: number; // 0-1
  keywords: string[];
  context: string;
}

export type CrisisType = 
  | 'suicidal_ideation'
  | 'suicide_plan'
  | 'suicide_intent'
  | 'self_harm'
  | 'homicidal_ideation'
  | 'psychosis'
  | 'severe_depression'
  | 'panic_attack'
  | 'substance_crisis'
  | 'domestic_violence'
  | 'child_abuse'
  | 'elder_abuse';

interface CrisisPattern {
  pattern: RegExp;
  type: CrisisType;
  severity: number;
  requiresContext?: boolean;
}

export class CrisisDetector extends EventEmitter {
  private readonly CRISIS_PATTERNS: CrisisPattern[] = [
    // Suicidal ideation patterns
    {
      pattern: /\b(kill myself|end my life|suicide|suicidal|want to die|better off dead|no reason to live)\b/i,
      type: 'suicidal_ideation',
      severity: 0.9
    },
    {
      pattern: /\b(plan to|going to|will) (kill|end|take) (myself|my life)\b/i,
      type: 'suicide_plan',
      severity: 1.0
    },
    {
      pattern: /\b(overdose|jumping|hanging|gun|poison|cutting wrists)\b.*\b(myself|my life|suicide)\b/i,
      type: 'suicide_intent',
      severity: 1.0
    },
    // Self-harm patterns
    {
      pattern: /\b(cutting|burning|hurting) myself\b/i,
      type: 'self_harm',
      severity: 0.8
    },
    {
      pattern: /\b(self[- ]?harm|self[- ]?injury|hurt myself)\b/i,
      type: 'self_harm',
      severity: 0.7
    },
    // Homicidal ideation
    {
      pattern: /\b(kill|hurt|harm) (someone|them|him|her|people)\b/i,
      type: 'homicidal_ideation',
      severity: 1.0
    },
    // Severe depression
    {
      pattern: /\b(hopeless|worthless|empty|numb|can't go on|giving up)\b/i,
      type: 'severe_depression',
      severity: 0.6,
      requiresContext: true
    },
    // Panic attacks
    {
      pattern: /\b(can't breathe|heart racing|dying|losing control|panic attack)\b/i,
      type: 'panic_attack',
      severity: 0.7
    },
    // Substance crisis
    {
      pattern: /\b(overdose|too much|mixed|alcohol poisoning)\b/i,
      type: 'substance_crisis',
      severity: 0.9
    },
    // Abuse patterns
    {
      pattern: /\b(hit|beat|abuse|violent|threatens|hurts) me\b/i,
      type: 'domestic_violence',
      severity: 0.9
    },
    {
      pattern: /\b(abuse|molest|inappropriate|touch).*\b(child|kid|minor)\b/i,
      type: 'child_abuse',
      severity: 1.0
    }
  ];

  private readonly PROTECTIVE_FACTORS = [
    'family',
    'friends',
    'support',
    'hope',
    'future',
    'goals',
    'help',
    'better',
    'improving',
    'coping',
    'managing'
  ];

  private readonly ESCALATION_THRESHOLDS = {
    critical: 0.9,
    high: 0.7,
    medium: 0.5,
    low: 0.3
  };

  constructor() {
    super();
  }

  public async assess(
    message: any,
    context: any
  ): Promise<CrisisAssessment> {
    const text = this.extractText(message);
    const indicators: CrisisIndicator[] = [];
    
    // Check for crisis patterns
    for (const pattern of this.CRISIS_PATTERNS) {
      if (pattern.pattern.test(text)) {
        const indicator = this.createIndicator(text, pattern);
        
        // Apply contextual analysis if required
        if (pattern.requiresContext) {
          indicator.severity = await this.analyzeContext(indicator, context);
        }
        
        indicators.push(indicator);
      }
    }

    // Check for protective factors
    const protectiveFactorCount = this.countProtectiveFactors(text);
    
    // Calculate overall risk level
    const assessment = this.calculateRiskLevel(indicators, protectiveFactorCount, context);
    
    // Emit event if crisis detected
    if (assessment.level !== 'none') {
      this.emit('crisis-detected', assessment);
    }

    // Log assessment for monitoring
    await this.logAssessment(assessment, context);

    return assessment;
  }

  private extractText(message: any): string {
    if (typeof message === 'string') {
      return message;
    }
    return message.content || message.text || '';
  }

  private createIndicator(text: string, pattern: CrisisPattern): CrisisIndicator {
    const matches = text.match(pattern.pattern) || [];
    return {
      type: pattern.type,
      severity: pattern.severity,
      confidence: this.calculateConfidence(text, pattern),
      keywords: matches.filter(m => m),
      context: this.extractContext(text, pattern.pattern)
    };
  }

  private calculateConfidence(text: string, pattern: CrisisPattern): number {
    // Base confidence on pattern match
    let confidence = 0.7;
    
    // Increase confidence for explicit statements
    if (text.includes('I am') || text.includes("I'm") || text.includes('I will')) {
      confidence += 0.15;
    }
    
    // Increase confidence for present tense
    if (!text.includes('was') && !text.includes('were') && !text.includes('used to')) {
      confidence += 0.1;
    }
    
    // Decrease confidence for hypothetical statements
    if (text.includes('if') || text.includes('would') || text.includes('might')) {
      confidence -= 0.2;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  private extractContext(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    if (!match) return '';
    
    const index = text.indexOf(match[0]);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + match[0].length + 50);
    
    return text.substring(start, end);
  }

  private async analyzeContext(
    indicator: CrisisIndicator,
    context: any
  ): Promise<number> {
    // Contextual analysis for severity adjustment
    let severity = indicator.severity;
    
    // Check conversation history for escalation
    if (context.conversationHistory) {
      const recentMessages = context.conversationHistory.slice(-5);
      const negativeTrend = this.detectNegativeTrend(recentMessages);
      if (negativeTrend) {
        severity += 0.1;
      }
    }
    
    // Check user profile for risk factors
    if (context.userProfile) {
      const riskFactors = this.assessRiskFactors(context.userProfile);
      severity += riskFactors * 0.05;
    }
    
    // Check time of day (higher risk late night/early morning)
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 6) {
      severity += 0.05;
    }
    
    return Math.min(1, severity);
  }

  private detectNegativeTrend(messages: any[]): boolean {
    if (!messages || messages.length < 2) return false;
    
    let negativeCount = 0;
    for (const message of messages) {
      const sentiment = message.metadata?.sentiment || 0;
      if (sentiment < 0) negativeCount++;
    }
    
    return negativeCount >= messages.length * 0.6;
  }

  private assessRiskFactors(profile: any): number {
    let riskCount = 0;
    
    if (profile.therapyHistory?.hospitalizations) riskCount++;
    if (profile.demographics?.age && (profile.demographics.age < 25 || profile.demographics.age > 65)) riskCount++;
    if (!profile.emergencyContacts || profile.emergencyContacts.length === 0) riskCount++;
    if (!profile.safetyPlan) riskCount++;
    
    return riskCount;
  }

  private countProtectiveFactors(text: string): number {
    const lowerText = text.toLowerCase();
    return this.PROTECTIVE_FACTORS.filter(factor => 
      lowerText.includes(factor)
    ).length;
  }

  private calculateRiskLevel(
    indicators: CrisisIndicator[],
    protectiveFactors: number,
    context: any
  ): CrisisAssessment {
    // Calculate maximum severity
    const maxSeverity = indicators.length > 0 
      ? Math.max(...indicators.map(i => i.severity))
      : 0;
    
    // Adjust for protective factors
    const adjustedSeverity = Math.max(0, maxSeverity - (protectiveFactors * 0.05));
    
    // Determine risk level
    let level: CrisisAssessment['level'] = 'none';
    if (adjustedSeverity >= this.ESCALATION_THRESHOLDS.critical) {
      level = 'critical';
    } else if (adjustedSeverity >= this.ESCALATION_THRESHOLDS.high) {
      level = 'high';
    } else if (adjustedSeverity >= this.ESCALATION_THRESHOLDS.medium) {
      level = 'medium';
    } else if (adjustedSeverity >= this.ESCALATION_THRESHOLDS.low) {
      level = 'low';
    }
    
    // Check for immediate risk indicators
    const immediateRisk = indicators.some(i => 
      i.type === 'suicide_plan' || 
      i.type === 'suicide_intent' ||
      i.type === 'homicidal_ideation'
    );
    
    // Build assessment
    const assessment: CrisisAssessment = {
      level,
      confidence: this.calculateOverallConfidence(indicators),
      indicators,
      immediateRisk,
      suicidalIdeation: indicators.some(i => i.type.includes('suicid')),
      homicidalIdeation: indicators.some(i => i.type === 'homicidal_ideation'),
      selfHarm: indicators.some(i => i.type === 'self_harm'),
      substanceUse: indicators.some(i => i.type === 'substance_crisis'),
      psychosis: indicators.some(i => i.type === 'psychosis'),
      recommendations: this.generateRecommendations(level, indicators),
      escalationRequired: level === 'critical' || level === 'high' || immediateRisk
    };
    
    return assessment;
  }

  private calculateOverallConfidence(indicators: CrisisIndicator[]): number {
    if (indicators.length === 0) return 1;
    
    const totalConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0);
    return totalConfidence / indicators.length;
  }

  private generateRecommendations(
    level: CrisisAssessment['level'],
    indicators: CrisisIndicator[]
  ): string[] {
    const recommendations: string[] = [];
    
    switch (level) {
      case 'critical':
        recommendations.push('Immediate crisis intervention required');
        recommendations.push('Contact emergency services if immediate danger');
        recommendations.push('Activate safety plan');
        recommendations.push('Ensure continuous monitoring');
        break;
      case 'high':
        recommendations.push('Escalate to crisis counselor');
        recommendations.push('Review and update safety plan');
        recommendations.push('Increase check-in frequency');
        recommendations.push('Provide crisis hotline information');
        break;
      case 'medium':
        recommendations.push('Offer coping strategies');
        recommendations.push('Suggest professional support');
        recommendations.push('Monitor for escalation');
        recommendations.push('Provide psychoeducation');
        break;
      case 'low':
        recommendations.push('Continue supportive dialogue');
        recommendations.push('Offer wellness resources');
        recommendations.push('Encourage self-care');
        break;
    }
    
    // Add specific recommendations based on indicators
    if (indicators.some(i => i.type === 'self_harm')) {
      recommendations.push('Provide alternative coping strategies to self-harm');
    }
    if (indicators.some(i => i.type === 'substance_crisis')) {
      recommendations.push('Connect with substance abuse resources');
    }
    if (indicators.some(i => i.type === 'panic_attack')) {
      recommendations.push('Guide through grounding exercises');
    }
    
    return recommendations;
  }

  private async logAssessment(
    assessment: CrisisAssessment,
    context: any
  ): Promise<void> {
    // Log assessment for quality assurance and monitoring
    const logEntry = {
      timestamp: new Date(),
      userId: context.userId,
      sessionId: context.sessionId,
      assessment,
      action: assessment.escalationRequired ? 'escalated' : 'monitored'
    };
    
    // In production, this would write to a secure audit log
    console.log('[Crisis Assessment]', JSON.stringify(logEntry, null, 2));
  }

  public async trainModel(trainingData: any[]): Promise<void> {
    // Placeholder for ML model training
    // In production, this would update crisis detection patterns
    // based on validated crisis scenarios
  }

  public async validateDetection(
    assessment: CrisisAssessment,
    actualOutcome: any
  ): Promise<void> {
    // Placeholder for detection validation
    // Used to improve accuracy over time
  }
}

export default CrisisDetector;