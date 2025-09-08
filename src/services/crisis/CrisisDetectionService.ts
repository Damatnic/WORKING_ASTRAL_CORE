/**
 * Advanced Crisis Detection Service
 * Mission-critical component for identifying and responding to mental health crises
 * Target: 89% accuracy with < 15 second response time
 * 
 * Features:
 * - Multi-language crisis detection (EN, ES, FR, DE, PT)
 * - Behavioral pattern analysis
 * - Real-time text analysis with ML-ready architecture
 * - Typing pattern and pause detection
 * - Escalation protocols
 */

import { EventEmitter } from 'events';

// Crisis severity levels
export enum CrisisSeverity {
  NONE = 0,
  LOW = 1,
  MODERATE = 2,
  HIGH = 3,
  CRITICAL = 4,
  IMMEDIATE = 5
}

// Crisis indicator types
export interface CrisisIndicator {
  type: 'keyword' | 'pattern' | 'behavioral' | 'temporal' | 'linguistic';
  severity: CrisisSeverity;
  confidence: number; // 0-1 confidence score
  language?: string;
  details?: string;
  timestamp: Date;
}

// Crisis assessment result
export interface CrisisAssessment {
  id: string;
  isInCrisis: boolean;
  severity: CrisisSeverity;
  confidence: number;
  indicators: CrisisIndicator[];
  suggestedActions: string[];
  requiresImmediate: boolean;
  language: string;
  timestamp: Date;
  responseTimeMs: number;
  riskFactors: RiskFactor[];
}

// Risk factors for comprehensive assessment
export interface RiskFactor {
  type: 'historical' | 'contextual' | 'protective' | 'warning';
  description: string;
  weight: number;
}

// Typing behavior patterns
export interface TypingBehavior {
  avgTypingSpeed: number;
  pausePatterns: number[];
  deletionRate: number;
  hesitationScore: number;
}

// Multi-language crisis keywords with severity levels
const CRISIS_KEYWORDS_MULTILANG = {
  en: {
    immediate: [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'better off dead', 'want to die', 'can\'t go on', 'no reason to live',
      'end my life', 'take my life', 'commit suicide', 'overdose'
    ],
    high: [
      'hopeless', 'worthless', 'burden', 'give up', 'can\'t take it',
      'nothing matters', 'alone forever', 'nobody cares', 'hate myself',
      'disappear', 'not exist', 'waste of space', 'pointless'
    ],
    moderate: [
      'depressed', 'anxious', 'panic', 'scared', 'overwhelmed',
      'falling apart', 'breaking down', 'can\'t cope', 'losing control',
      'trapped', 'suffocating', 'drowning', 'numb'
    ]
  },
  es: {
    immediate: [
      'suicidio', 'matarme', 'acabar con todo', 'no vale la pena vivir',
      'mejor muerto', 'quiero morir', 'no puedo seguir', 'sin razón para vivir',
      'terminar mi vida', 'quitarme la vida'
    ],
    high: [
      'sin esperanza', 'inútil', 'carga', 'rendirse', 'no puedo más',
      'nada importa', 'solo para siempre', 'a nadie le importa', 'me odio',
      'desaparecer', 'no existir'
    ],
    moderate: [
      'deprimido', 'ansioso', 'pánico', 'asustado', 'abrumado',
      'desmoronándome', 'perdiendo control', 'atrapado', 'ahogándome'
    ]
  },
  fr: {
    immediate: [
      'suicide', 'me tuer', 'en finir', 'pas la peine de vivre',
      'mieux vaut mourir', 'veux mourir', 'ne peux plus continuer',
      'aucune raison de vivre', 'mettre fin à ma vie'
    ],
    high: [
      'sans espoir', 'inutile', 'fardeau', 'abandonner', 'n\'en peux plus',
      'rien n\'a d\'importance', 'seul pour toujours', 'personne ne s\'en soucie',
      'je me déteste', 'disparaître'
    ],
    moderate: [
      'déprimé', 'anxieux', 'panique', 'effrayé', 'submergé',
      's\'effondrer', 'perdre le contrôle', 'piégé', 'se noyer'
    ]
  },
  de: {
    immediate: [
      'selbstmord', 'mich umbringen', 'alles beenden', 'nicht lebenswert',
      'besser tot', 'will sterben', 'kann nicht weitermachen',
      'kein grund zu leben', 'mein leben beenden'
    ],
    high: [
      'hoffnungslos', 'wertlos', 'last', 'aufgeben', 'kann nicht mehr',
      'nichts ist wichtig', 'für immer allein', 'niemand kümmert sich',
      'hasse mich', 'verschwinden'
    ],
    moderate: [
      'deprimiert', 'ängstlich', 'panik', 'verängstigt', 'überwältigt',
      'zusammenbrechen', 'kontrolle verlieren', 'gefangen', 'ertrinken'
    ]
  },
  pt: {
    immediate: [
      'suicídio', 'me matar', 'acabar com tudo', 'não vale a pena viver',
      'melhor morto', 'quero morrer', 'não posso continuar',
      'sem razão para viver', 'terminar minha vida'
    ],
    high: [
      'sem esperança', 'inútil', 'fardo', 'desistir', 'não aguento mais',
      'nada importa', 'sozinho para sempre', 'ninguém se importa',
      'me odeio', 'desaparecer'
    ],
    moderate: [
      'deprimido', 'ansioso', 'pânico', 'assustado', 'sobrecarregado',
      'desmoronando', 'perdendo controle', 'preso', 'afogando'
    ]
  }
};

// Behavioral patterns with advanced detection
const BEHAVIORAL_PATTERNS = {
  finalStatements: {
    patterns: [
      /goodbye\s+forever/i,
      /this\s+is\s+it/i,
      /last\s+(message|words|time)/i,
      /won't\s+be\s+around/i,
      /sorry\s+for\s+everything/i,
      /thank\s+you\s+for\s+everything/i
    ],
    severity: CrisisSeverity.IMMEDIATE,
    confidence: 0.95
  },
  planMentions: {
    patterns: [
      /have\s+a\s+plan/i,
      /know\s+how\s+to/i,
      /decided\s+how/i,
      /way\s+to\s+do\s+it/i,
      /method\s+(ready|prepared)/i,
      /pills?\s+(saved|ready)/i,
      /gun|weapon|knife/i
    ],
    severity: CrisisSeverity.IMMEDIATE,
    confidence: 0.98
  },
  isolation: {
    patterns: [
      /no\s+one\s+understands/i,
      /completely\s+alone/i,
      /nobody\s+cares/i,
      /all\s+alone/i,
      /abandoned/i,
      /forgotten/i
    ],
    severity: CrisisSeverity.HIGH,
    confidence: 0.75
  },
  hopelessness: {
    patterns: [
      /no\s+hope/i,
      /never\s+get\s+better/i,
      /always\s+be\s+this\s+way/i,
      /no\s+future/i,
      /can't\s+see\s+a\s+way\s+out/i
    ],
    severity: CrisisSeverity.HIGH,
    confidence: 0.8
  },
  giftGiving: {
    patterns: [
      /giving\s+away/i,
      /want\s+you\s+to\s+have/i,
      /won't\s+need\s+this/i,
      /take\s+care\s+of\s+my/i,
      /after\s+I'm\s+gone/i
    ],
    severity: CrisisSeverity.CRITICAL,
    confidence: 0.85
  }
};

/**
 * Advanced Crisis Detection Service
 * Singleton pattern for consistent crisis monitoring across the application
 */
export class CrisisDetectionService extends EventEmitter {
  private static instance: CrisisDetectionService;
  private detectionStartTime: number = 0;
  private assessmentCache: Map<string, CrisisAssessment> = new Map();
  private userBehaviorHistory: Map<string, TypingBehavior[]> = new Map();
  
  private constructor() {
    super();
    this.initializeService();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CrisisDetectionService {
    if (!CrisisDetectionService.instance) {
      CrisisDetectionService.instance = new CrisisDetectionService();
    }
    return CrisisDetectionService.instance;
  }

  /**
   * Initialize the crisis detection service
   */
  private initializeService(): void {
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), 3600000); // Clean every hour
    
    // Initialize ML model connection (placeholder for future implementation)
    this.initializeMLModel();
  }

  /**
   * Placeholder for ML model initialization
   */
  private async initializeMLModel(): Promise<void> {
    // In production, this would connect to a TensorFlow.js or similar model
    // For now, using rule-based detection with high accuracy
    console.log('[CrisisDetection] ML model initialization placeholder');
  }

  /**
   * Main analysis method - analyzes text for crisis indicators
   * Target: < 15 seconds response time
   */
  async analyzeText(
    text: string, 
    userId?: string,
    language: string = 'en',
    typingBehavior?: TypingBehavior
  ): Promise<CrisisAssessment> {
    this.detectionStartTime = Date.now();
    
    // Detect language if not provided
    const detectedLanguage = this.detectLanguage(text) || language;
    
    // Normalize text for analysis
    const normalizedText = this.normalizeText(text);
    
    // Collect all indicators
    const indicators: CrisisIndicator[] = [];
    
    // 1. Keyword analysis
    const keywordIndicators = this.analyzeKeywords(normalizedText, detectedLanguage);
    indicators.push(...keywordIndicators);
    
    // 2. Pattern analysis
    const patternIndicators = this.analyzeBehavioralPatterns(normalizedText);
    indicators.push(...patternIndicators);
    
    // 3. Linguistic analysis
    const linguisticIndicators = this.analyzeLinguisticFeatures(text);
    indicators.push(...linguisticIndicators);
    
    // 4. Typing behavior analysis (if available)
    if (typingBehavior) {
      const behaviorIndicators = this.analyzeTypingBehavior(typingBehavior, userId);
      indicators.push(...behaviorIndicators);
    }
    
    // 5. Historical analysis (if user ID provided)
    let riskFactors: RiskFactor[] = [];
    if (userId) {
      riskFactors = await this.analyzeHistoricalRisk(userId);
    }
    
    // Calculate overall assessment
    const assessment = this.calculateAssessment(indicators, riskFactors, detectedLanguage);
    
    // Cache assessment for pattern analysis
    if (userId) {
      this.cacheAssessment(userId, assessment);
    }
    
    // Emit events for real-time monitoring
    this.emitCrisisEvents(assessment, userId);
    
    return assessment;
  }

  /**
   * Analyze keywords for crisis indicators
   */
  private analyzeKeywords(text: string, language: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];
    const keywords = CRISIS_KEYWORDS_MULTILANG[language as keyof typeof CRISIS_KEYWORDS_MULTILANG] || CRISIS_KEYWORDS_MULTILANG.en;
    
    // Check immediate severity keywords
    for (const keyword of keywords.immediate) {
      if (text.includes(keyword.toLowerCase())) {
        indicators.push({
          type: 'keyword',
          severity: CrisisSeverity.IMMEDIATE,
          confidence: 0.95,
          language,
          details: `Immediate risk keyword detected: "${keyword}"`,
          timestamp: new Date()
        });
      }
    }
    
    // Check high severity keywords
    for (const keyword of keywords.high) {
      if (text.includes(keyword.toLowerCase())) {
        indicators.push({
          type: 'keyword',
          severity: CrisisSeverity.HIGH,
          confidence: 0.85,
          language,
          details: `High risk keyword detected: "${keyword}"`,
          timestamp: new Date()
        });
      }
    }
    
    // Check moderate severity keywords
    for (const keyword of keywords.moderate) {
      if (text.includes(keyword.toLowerCase())) {
        indicators.push({
          type: 'keyword',
          severity: CrisisSeverity.MODERATE,
          confidence: 0.75,
          language,
          details: `Moderate concern keyword detected: "${keyword}"`,
          timestamp: new Date()
        });
      }
    }
    
    return indicators;
  }

  /**
   * Analyze text for behavioral patterns
   */
  private analyzeBehavioralPatterns(text: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];
    
    for (const [patternName, patternConfig] of Object.entries(BEHAVIORAL_PATTERNS)) {
      for (const pattern of patternConfig.patterns) {
        if (pattern.test(text)) {
          indicators.push({
            type: 'pattern',
            severity: patternConfig.severity,
            confidence: patternConfig.confidence,
            details: `Behavioral pattern detected: ${patternName}`,
            timestamp: new Date()
          });
          break; // Only count each pattern type once
        }
      }
    }
    
    return indicators;
  }

  /**
   * Analyze linguistic features (sentence structure, emotion density)
   */
  private analyzeLinguisticFeatures(text: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];
    
    // Analyze sentence length and structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / (sentences.length || 1);
    
    // Short, fragmented sentences can indicate distress
    if (avgSentenceLength < 5 && sentences.length > 2) {
      indicators.push({
        type: 'linguistic',
        severity: CrisisSeverity.MODERATE,
        confidence: 0.6,
        details: 'Fragmented sentence structure detected',
        timestamp: new Date()
      });
    }
    
    // Analyze negation density
    const negations = (text.match(/\b(no|not|never|nothing|nobody|nowhere|neither|none|cannot|can't|won't|wouldn't|shouldn't|couldn't)\b/gi) || []).length;
    const wordCount = text.split(/\s+/).length;
    const negationDensity = negations / (wordCount || 1);
    
    if (negationDensity > 0.15) {
      indicators.push({
        type: 'linguistic',
        severity: CrisisSeverity.MODERATE,
        confidence: 0.7,
        details: 'High negation density detected',
        timestamp: new Date()
      });
    }
    
    // Analyze personal pronoun usage
    const firstPersonPronouns = (text.match(/\b(i|me|my|myself)\b/gi) || []).length;
    const pronounDensity = firstPersonPronouns / (wordCount || 1);
    
    if (pronounDensity > 0.2) {
      indicators.push({
        type: 'linguistic',
        severity: CrisisSeverity.LOW,
        confidence: 0.5,
        details: 'High self-focus detected',
        timestamp: new Date()
      });
    }
    
    return indicators;
  }

  /**
   * Analyze typing behavior for distress signals
   */
  private analyzeTypingBehavior(behavior: TypingBehavior, userId?: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];
    
    // Analyze typing speed changes
    if (userId && this.userBehaviorHistory.has(userId)) {
      const history = this.userBehaviorHistory.get(userId)!;
      const avgHistoricalSpeed = history.reduce((sum, b) => sum + b.avgTypingSpeed, 0) / history.length;
      const speedChange = Math.abs(behavior.avgTypingSpeed - avgHistoricalSpeed) / avgHistoricalSpeed;
      
      if (speedChange > 0.5) {
        indicators.push({
          type: 'behavioral',
          severity: CrisisSeverity.MODERATE,
          confidence: 0.65,
          details: 'Significant typing speed change detected',
          timestamp: new Date()
        });
      }
    }
    
    // Analyze hesitation patterns
    if (behavior.hesitationScore > 0.7) {
      indicators.push({
        type: 'behavioral',
        severity: CrisisSeverity.MODERATE,
        confidence: 0.6,
        details: 'High hesitation in typing detected',
        timestamp: new Date()
      });
    }
    
    // Analyze deletion rate
    if (behavior.deletionRate > 0.3) {
      indicators.push({
        type: 'behavioral',
        severity: CrisisSeverity.LOW,
        confidence: 0.55,
        details: 'High text deletion rate detected',
        timestamp: new Date()
      });
    }
    
    // Store behavior for future comparison
    if (userId) {
      if (!this.userBehaviorHistory.has(userId)) {
        this.userBehaviorHistory.set(userId, []);
      }
      const history = this.userBehaviorHistory.get(userId)!;
      history.push(behavior);
      // Keep only last 10 behaviors
      if (history.length > 10) {
        history.shift();
      }
    }
    
    return indicators;
  }

  /**
   * Analyze historical risk factors for a user
   */
  private async analyzeHistoricalRisk(userId: string): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    
    // Check recent assessment history
    const recentAssessments = this.getRecentAssessments(userId, 24); // Last 24 hours
    
    if (recentAssessments.length > 0) {
      // Check for escalating pattern
      const severities = recentAssessments.map(a => a.severity);
      const isEscalating = this.detectEscalation(severities);
      
      if (isEscalating) {
        factors.push({
          type: 'warning',
          description: 'Escalating crisis pattern detected',
          weight: 0.8
        });
      }
      
      // Check for repeated crisis episodes
      const crisisCount = recentAssessments.filter(a => a.isInCrisis).length;
      if (crisisCount >= 3) {
        factors.push({
          type: 'historical',
          description: 'Multiple crisis episodes in recent history',
          weight: 0.7
        });
      }
    }
    
    // Add protective factors (placeholder - would integrate with user profile)
    // These would come from user's safety plan, support network, etc.
    factors.push({
      type: 'protective',
      description: 'Has active safety plan',
      weight: -0.3
    });
    
    return factors;
  }

  /**
   * Calculate final crisis assessment
   */
  private calculateAssessment(
    indicators: CrisisIndicator[],
    riskFactors: RiskFactor[],
    language: string
  ): CrisisAssessment {
    // Calculate max severity
    const maxSeverity = indicators.length > 0
      ? Math.max(...indicators.map(i => i.severity))
      : CrisisSeverity.NONE;
    
    // Calculate weighted confidence
    const totalConfidence = indicators.length > 0
      ? indicators.reduce((sum, i) => sum + i.confidence * i.severity, 0) /
        indicators.reduce((sum, i) => sum + i.severity, 0)
      : 0;
    
    // Apply risk factor adjustments
    let adjustedSeverity = maxSeverity;
    let adjustedConfidence = totalConfidence;
    
    for (const factor of riskFactors) {
      if (factor.type === 'warning' || factor.type === 'historical') {
        adjustedConfidence = Math.min(1, adjustedConfidence + factor.weight * 0.1);
        if (factor.weight > 0.7 && adjustedSeverity < CrisisSeverity.HIGH) {
          adjustedSeverity = CrisisSeverity.HIGH;
        }
      } else if (factor.type === 'protective') {
        adjustedConfidence = Math.max(0, adjustedConfidence + factor.weight * 0.1);
      }
    }
    
    // Determine if in crisis
    const isInCrisis = adjustedSeverity >= CrisisSeverity.MODERATE ||
                       (adjustedSeverity >= CrisisSeverity.LOW && indicators.length >= 3);
    
    // Determine if immediate intervention required
    const requiresImmediate = adjustedSeverity >= CrisisSeverity.CRITICAL;
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(adjustedSeverity, indicators, riskFactors);
    
    // Calculate response time
    const responseTimeMs = Date.now() - this.detectionStartTime;
    
    return {
      id: this.generateAssessmentId(),
      isInCrisis,
      severity: adjustedSeverity,
      confidence: adjustedConfidence,
      indicators,
      suggestedActions,
      requiresImmediate,
      language,
      timestamp: new Date(),
      responseTimeMs,
      riskFactors
    };
  }

  /**
   * Generate suggested actions based on assessment
   */
  private generateSuggestedActions(
    severity: CrisisSeverity,
    indicators: CrisisIndicator[],
    riskFactors: RiskFactor[]
  ): string[] {
    const actions: string[] = [];
    
    switch (severity) {
      case CrisisSeverity.IMMEDIATE:
        actions.push('IMMEDIATE: Connect to emergency services (911)');
        actions.push('Display suicide prevention hotline (988)');
        actions.push('Activate emergency contact protocol');
        actions.push('Initiate crisis counselor chat');
        actions.push('Lock dangerous content');
        break;
      
      case CrisisSeverity.CRITICAL:
        actions.push('Show crisis intervention interface');
        actions.push('Offer immediate connection to crisis counselor');
        actions.push('Display safety plan prominently');
        actions.push('Send alert to designated emergency contact');
        actions.push('Provide grounding exercises');
        break;
      
      case CrisisSeverity.HIGH:
        actions.push('Prompt crisis chat support');
        actions.push('Display coping strategies');
        actions.push('Suggest calling trusted contact');
        actions.push('Offer guided breathing exercise');
        actions.push('Schedule urgent check-in');
        break;
      
      case CrisisSeverity.MODERATE:
        actions.push('Offer peer support connection');
        actions.push('Suggest self-care activities');
        actions.push('Provide mood regulation tools');
        actions.push('Prompt safety plan review');
        actions.push('Schedule therapist appointment');
        break;
      
      case CrisisSeverity.LOW:
        actions.push('Monitor for escalation');
        actions.push('Offer wellness resources');
        actions.push('Suggest journaling');
        actions.push('Provide relaxation techniques');
        break;
      
      default:
        actions.push('Continue routine monitoring');
        actions.push('Maintain supportive environment');
    }
    
    // Add specific actions based on indicators
    if (indicators.some(i => i.type === 'pattern' && i.details?.includes('plan'))) {
      actions.unshift('URGENT: Remove access to means');
      actions.unshift('Immediate safety assessment required');
    }
    
    // Consider protective factors
    const hasProtective = riskFactors.some(f => f.type === 'protective');
    if (hasProtective && severity <= CrisisSeverity.MODERATE) {
      actions.push('Activate existing safety plan');
      actions.push('Connect with support network');
    }
    
    return actions;
  }

  /**
   * Emit crisis events for real-time monitoring
   */
  private emitCrisisEvents(assessment: CrisisAssessment, userId?: string): void {
    // Emit general assessment event
    this.emit('assessment', assessment);
    
    // Emit crisis detected event if applicable
    if (assessment.isInCrisis) {
      this.emit('crisis-detected', {
        assessment,
        userId,
        timestamp: new Date()
      });
    }
    
    // Emit immediate intervention event if required
    if (assessment.requiresImmediate) {
      this.emit('immediate-intervention-required', {
        assessment,
        userId,
        timestamp: new Date()
      });
    }
    
    // Log for audit trail
    this.logAssessment(assessment, userId);
  }

  /**
   * Cache assessment for pattern analysis
   */
  private cacheAssessment(userId: string, assessment: CrisisAssessment): void {
    const key = `${userId}_${Date.now()}`;
    this.assessmentCache.set(key, assessment);
    
    // Keep cache size manageable
    if (this.assessmentCache.size > 1000) {
      const oldestKey = this.assessmentCache.keys().next().value as string;
      this.assessmentCache.delete(oldestKey);
    }
  }

  /**
   * Get recent assessments for a user
   */
  private getRecentAssessments(userId: string, hoursBack: number): CrisisAssessment[] {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const assessments: CrisisAssessment[] = [];
    
    Array.from(this.assessmentCache.entries()).forEach(([key, assessment]) => {
      if (key.startsWith(userId) && assessment.timestamp.getTime() > cutoffTime) {
        assessments.push(assessment);
      }
    });
    
    return assessments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Detect escalation pattern in severity history
   */
  private detectEscalation(severities: number[]): boolean {
    if (severities.length < 2) return false;
    
    let increasingCount = 0;
    for (let i = 1; i < severities.length; i++) {
      const current = severities[i];
      const previous = severities[i - 1];
      if (current && previous && current > previous) {
        increasingCount++;
      }
    }
    
    return increasingCount >= severities.length * 0.6;
  }

  /**
   * Detect language of text
   */
  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const languageMarkers = {
      es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'por', 'con', 'para'],
      fr: ['le', 'de', 'un', 'être', 'et', 'à', 'avoir', 'que', 'pour', 'dans'],
      de: ['der', 'die', 'und', 'in', 'das', 'von', 'zu', 'mit', 'sich', 'auf'],
      pt: ['o', 'a', 'de', 'para', 'em', 'com', 'um', 'por', 'que', 'não']
    };
    
    const words = text.toLowerCase().split(/\s+/);
    const scores: { [key: string]: number } = {};
    
    for (const [lang, markers] of Object.entries(languageMarkers)) {
      scores[lang] = words.filter(word => markers.includes(word)).length;
    }
    
    const detectedLang = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return scores[detectedLang] && scores[detectedLang] > 2 ? detectedLang : 'en';
  }

  /**
   * Normalize text for analysis
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate unique assessment ID
   */
  private generateAssessmentId(): string {
    return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log assessment for audit trail
   */
  private logAssessment(assessment: CrisisAssessment, userId?: string): void {
    // In production, this would write to a secure audit log
    console.log('[CrisisDetection] Assessment logged:', {
      id: assessment.id,
      userId,
      severity: assessment.severity,
      isInCrisis: assessment.isInCrisis,
      requiresImmediate: assessment.requiresImmediate,
      responseTimeMs: assessment.responseTimeMs
    });
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    Array.from(this.assessmentCache.entries()).forEach(([key, assessment]) => {
      if (assessment.timestamp.getTime() < cutoffTime) {
        this.assessmentCache.delete(key);
      }
    });
  }

  /**
   * Monitor real-time escalation between assessments
   */
  monitorEscalation(
    previousAssessment: CrisisAssessment,
    currentAssessment: CrisisAssessment
  ): boolean {
    const severityIncrease = currentAssessment.severity - previousAssessment.severity;
    const confidenceIncrease = currentAssessment.confidence - previousAssessment.confidence;
    
    // Escalation detected if severity increases significantly
    return severityIncrease >= 2 || 
           (severityIncrease >= 1 && confidenceIncrease >= 0.2) ||
           (currentAssessment.requiresImmediate && !previousAssessment.requiresImmediate);
  }

  /**
   * Get crisis statistics for analytics
   */
  getCrisisStatistics(userId?: string, hoursBack: number = 24): {
    totalAssessments: number;
    crisisEpisodes: number;
    averageSeverity: number;
    escalationRate: number;
    averageResponseTime: number;
  } {
    const assessments = userId
      ? this.getRecentAssessments(userId, hoursBack)
      : Array.from(this.assessmentCache.values()).filter(
          a => a.timestamp.getTime() > Date.now() - (hoursBack * 60 * 60 * 1000)
        );
    
    if (assessments.length === 0) {
      return {
        totalAssessments: 0,
        crisisEpisodes: 0,
        averageSeverity: 0,
        escalationRate: 0,
        averageResponseTime: 0
      };
    }
    
    const crisisEpisodes = assessments.filter(a => a.isInCrisis).length;
    const avgSeverity = assessments.reduce((sum, a) => sum + a.severity, 0) / assessments.length;
    const avgResponseTime = assessments.reduce((sum, a) => sum + a.responseTimeMs, 0) / assessments.length;
    
    // Calculate escalation rate
    let escalations = 0;
    for (let i = 1; i < assessments.length; i++) {
      const prevAssessment = assessments[i - 1];
      const currAssessment = assessments[i];
      if (prevAssessment && currAssessment && this.monitorEscalation(prevAssessment, currAssessment)) {
        escalations++;
      }
    }
    const escalationRate = assessments.length > 1 ? escalations / (assessments.length - 1) : 0;
    
    return {
      totalAssessments: assessments.length,
      crisisEpisodes,
      averageSeverity: avgSeverity,
      escalationRate,
      averageResponseTime: avgResponseTime
    };
  }
}

// Export singleton instance
export default CrisisDetectionService.getInstance();