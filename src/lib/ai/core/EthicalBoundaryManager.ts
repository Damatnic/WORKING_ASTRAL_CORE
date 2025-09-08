/**
 * Ethical Boundary Management System
 * Ensures AI operates within ethical guidelines and professional boundaries
 */

import { EventEmitter } from 'events';

export interface EthicalBoundaries {
  noMedicalAdvice: boolean;
  noLegalAdvice: boolean;
  noDiagnosis: boolean;
  mandatoryReporting: boolean;
  suicidePrevention: boolean;
  respectAutonomy: boolean;
  maintainBoundaries: boolean;
  culturalSensitivity: boolean;
}

export interface EthicalCheckResult {
  passed: boolean;
  violations?: string[];
  warnings?: string[];
  recommendations?: string[];
  requiredActions?: string[];
}

export interface BoundaryViolation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  context: string;
  timestamp: Date;
  action: 'block' | 'modify' | 'warn' | 'escalate';
}

export type ViolationType = 
  | 'medical_advice'
  | 'legal_advice'
  | 'diagnosis_attempt'
  | 'boundary_crossing'
  | 'inappropriate_relationship'
  | 'harmful_suggestion'
  | 'confidentiality_breach'
  | 'cultural_insensitivity'
  | 'autonomy_violation'
  | 'competence_exceeded';

interface BoundaryRule {
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  violationType: ViolationType;
  severity: BoundaryViolation['severity'];
  action: BoundaryViolation['action'];
}

export class EthicalBoundaryManager extends EventEmitter {
  private boundaries: EthicalBoundaries;
  private boundaryRules!: BoundaryRule[];
  private violationHistory: Map<string, BoundaryViolation[]>;

  constructor(boundaries: EthicalBoundaries) {
    super();
    this.boundaries = boundaries;
    this.violationHistory = new Map();
    this.initializeBoundaryRules();
  }

  private initializeBoundaryRules(): void {
    this.boundaryRules = [
      // Medical advice boundaries
      {
        id: 'medical_001',
        name: 'Prescription Medication',
        description: 'Cannot recommend prescription medications',
        patterns: [
          /\b(prescribe|prescription|medication|drug|dosage|mg)\b.*\b(take|use|try)\b/i,
          /\b(should|must|need to) (take|use) \b(medication|drug|prescription)\b/i,
          /\bstop taking\b.*\bmedication\b/i,
          /\bchange\b.*\bdosage\b/i
        ],
        violationType: 'medical_advice',
        severity: 'critical',
        action: 'block'
      },
      {
        id: 'medical_002',
        name: 'Medical Diagnosis',
        description: 'Cannot provide medical diagnoses',
        patterns: [
          /\byou (have|suffer from|are experiencing)\b.*\b(disorder|disease|condition|syndrome)\b/i,
          /\bdiagnos(is|e)\b.*\b(is|are|could be|might be)\b/i,
          /\bsounds like\b.*\b(depression|anxiety|PTSD|bipolar|schizophrenia)\b/i
        ],
        violationType: 'diagnosis_attempt',
        severity: 'high',
        action: 'block'
      },
      // Legal advice boundaries
      {
        id: 'legal_001',
        name: 'Legal Advice',
        description: 'Cannot provide legal advice',
        patterns: [
          /\b(sue|lawsuit|legal action|court|lawyer|attorney)\b.*\b(should|must|need to)\b/i,
          /\b(legal|law|statute|regulation)\b.*\b(requires|allows|prohibits)\b/i,
          /\byour (legal )?rights\b.*\b(are|include)\b/i
        ],
        violationType: 'legal_advice',
        severity: 'high',
        action: 'block'
      },
      // Boundary crossing
      {
        id: 'boundary_001',
        name: 'Personal Relationship',
        description: 'Must maintain professional boundaries',
        patterns: [
          /\b(love|romantic|date|relationship)\b.*\b(you|me|us)\b/i,
          /\b(my|your) (phone|email|address|personal)\b/i,
          /\bmeet\b.*\b(in person|offline|real life)\b/i
        ],
        violationType: 'boundary_crossing',
        severity: 'high',
        action: 'block'
      },
      // Harmful suggestions
      {
        id: 'harm_001',
        name: 'Harmful Actions',
        description: 'Cannot suggest harmful actions',
        patterns: [
          /\b(hurt|harm|punish|revenge)\b.*\b(yourself|someone|them)\b/i,
          /\b(alcohol|drugs|substance)\b.*\b(cope|feel better|help)\b/i,
          /\bavoid\b.*\b(therapy|therapist|help|support)\b/i
        ],
        violationType: 'harmful_suggestion',
        severity: 'critical',
        action: 'block'
      },
      // Cultural sensitivity
      {
        id: 'cultural_001',
        name: 'Cultural Insensitivity',
        description: 'Must respect cultural differences',
        patterns: [
          /\b(your culture|your religion)\b.*\b(wrong|bad|inferior)\b/i,
          /\b(should|must)\b.*\b(change|abandon)\b.*\b(culture|religion|beliefs)\b/i
        ],
        violationType: 'cultural_insensitivity',
        severity: 'high',
        action: 'modify'
      }
    ];
  }

  public async validate(
    message: any,
    context: any
  ): Promise<EthicalCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const requiredActions: string[] = [];

    // Extract text content
    const text = this.extractText(message);
    const userContext = context.userProfile;

    // Check each boundary rule
    for (const rule of this.boundaryRules) {
      const violation = this.checkBoundaryRule(text, rule);
      if (violation) {
        await this.handleViolation(violation, context);
        
        switch (violation.severity) {
          case 'critical':
            violations.push(rule.name);
            requiredActions.push(`Block: ${rule.description}`);
            break;
          case 'high':
            violations.push(rule.name);
            break;
          case 'medium':
            warnings.push(rule.name);
            break;
          case 'low':
            warnings.push(rule.name);
            break;
        }
      }
    }

    // Check for mandatory reporting requirements
    if (this.boundaries.mandatoryReporting) {
      const reportingCheck = await this.checkMandatoryReporting(message, context);
      if (reportingCheck.required) {
        requiredActions.push('Mandatory reporting protocol activated');
        this.emit('mandatory-reporting', reportingCheck);
      }
    }

    // Check for competence boundaries
    const competenceCheck = this.checkCompetenceBoundaries(message, context);
    if (!competenceCheck.withinCompetence) {
      warnings.push('Request may exceed AI competence');
      recommendations.push('Consider human professional referral');
    }

    // Generate recommendations based on context
    const contextRecommendations = this.generateContextualRecommendations(
      message,
      context,
      violations,
      warnings
    );
    recommendations.push(...contextRecommendations);

    // Determine if check passed
    const passed = violations.length === 0;

    // Log the ethical check
    await this.logEthicalCheck({
      passed,
      violations,
      warnings,
      recommendations,
      context: context.sessionId,
      timestamp: new Date()
    });

    return {
      passed,
      violations: violations.length > 0 ? violations : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      requiredActions: requiredActions.length > 0 ? requiredActions : undefined
    };
  }

  private extractText(message: any): string {
    if (typeof message === 'string') return message;
    return message.content || message.text || '';
  }

  private checkBoundaryRule(text: string, rule: BoundaryRule): BoundaryViolation | null {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        return {
          type: rule.violationType,
          severity: rule.severity,
          content: match?.[0] || text,
          context: this.extractContext(text, pattern),
          timestamp: new Date(),
          action: rule.action
        };
      }
    }
    return null;
  }

  private extractContext(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    if (!match) return text.substring(0, 100);
    
    const index = text.indexOf(match[0]);
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + match[0].length + 30);
    
    return text.substring(start, end);
  }

  private async handleViolation(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Store violation in history
    const userId = context.userId;
    if (!this.violationHistory.has(userId)) {
      this.violationHistory.set(userId, []);
    }
    this.violationHistory.get(userId)!.push(violation);

    // Emit violation event for monitoring
    this.emit('boundary-violation', {
      violation,
      userId,
      sessionId: context.sessionId
    });

    // Take action based on violation severity
    switch (violation.action) {
      case 'escalate':
        await this.escalateViolation(violation, context);
        break;
      case 'block':
        await this.blockContent(violation, context);
        break;
      case 'modify':
        await this.suggestModification(violation, context);
        break;
      case 'warn':
        await this.issueWarning(violation, context);
        break;
    }
  }

  private async checkMandatoryReporting(
    message: any,
    context: any
  ): Promise<{ required: boolean; reason?: string; details?: any }> {
    const text = this.extractText(message);
    
    // Check for child abuse
    if (/\b(child|minor|kid)\b.*\b(abuse|hurt|harm|danger)\b/i.test(text)) {
      return {
        required: true,
        reason: 'Potential child abuse disclosed',
        details: { type: 'child_abuse', confidence: 0.8 }
      };
    }

    // Check for elder abuse
    if (/\b(elder|elderly|senior)\b.*\b(abuse|neglect|harm)\b/i.test(text)) {
      return {
        required: true,
        reason: 'Potential elder abuse disclosed',
        details: { type: 'elder_abuse', confidence: 0.7 }
      };
    }

    // Check for imminent danger to others
    if (/\b(going to|will|plan to)\b.*\b(kill|hurt|harm)\b.*\b(someone|person|people)\b/i.test(text)) {
      return {
        required: true,
        reason: 'Imminent danger to others',
        details: { type: 'threat_to_others', confidence: 0.9 }
      };
    }

    return { required: false };
  }

  private checkCompetenceBoundaries(
    message: any,
    context: any
  ): { withinCompetence: boolean; reason?: string } {
    const text = this.extractText(message);
    
    // Check for complex trauma that requires specialized treatment
    if (/\b(complex PTSD|dissociative|multiple personality|DID)\b/i.test(text)) {
      return {
        withinCompetence: false,
        reason: 'Requires specialized trauma treatment'
      };
    }

    // Check for severe mental illness requiring medication management
    if (/\b(psychosis|schizophrenia|bipolar|mania)\b/i.test(text)) {
      return {
        withinCompetence: false,
        reason: 'Requires psychiatric evaluation and treatment'
      };
    }

    // Check for eating disorders requiring medical monitoring
    if (/\b(anorexia|bulimia|eating disorder)\b.*\b(severe|extreme|dangerous)\b/i.test(text)) {
      return {
        withinCompetence: false,
        reason: 'Requires medical monitoring and specialized treatment'
      };
    }

    return { withinCompetence: true };
  }

  private generateContextualRecommendations(
    message: any,
    context: any,
    violations: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    // If medical advice was attempted, suggest medical consultation
    if (violations.includes('Prescription Medication') || 
        violations.includes('Medical Diagnosis')) {
      recommendations.push('Encourage consultation with healthcare provider');
      recommendations.push('Provide general wellness information only');
    }

    // If legal advice was attempted, suggest legal consultation
    if (violations.includes('Legal Advice')) {
      recommendations.push('Suggest consultation with legal professional');
      recommendations.push('Focus on emotional support regarding situation');
    }

    // If boundaries were crossed, reinforce therapeutic frame
    if (violations.includes('Personal Relationship')) {
      recommendations.push('Reinforce professional boundaries');
      recommendations.push('Clarify role as AI support tool');
    }

    // If cultural sensitivity issues, adapt approach
    if (warnings.includes('Cultural Insensitivity')) {
      recommendations.push('Acknowledge and respect cultural perspective');
      recommendations.push('Adapt interventions to cultural context');
    }

    return recommendations;
  }

  private async escalateViolation(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Escalate to human oversight
    this.emit('escalation-required', {
      type: 'ethical_violation',
      violation,
      context,
      priority: violation.severity === 'critical' ? 'immediate' : 'high'
    });
  }

  private async blockContent(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Log blocked content
    await this.logBlockedContent(violation, context);
  }

  private async suggestModification(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Suggest alternative phrasing
    this.emit('modification-suggested', {
      original: violation.content,
      suggestion: this.generateAlternative(violation),
      context
    });
  }

  private async issueWarning(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Issue warning but allow continuation
    this.emit('warning-issued', {
      violation,
      context
    });
  }

  private generateAlternative(violation: BoundaryViolation): string {
    // Generate appropriate alternative based on violation type
    const alternatives = {
      medical_advice: "I understand you have medical concerns. While I can't provide medical advice, I can offer emotional support and encourage you to discuss these concerns with a healthcare provider.",
      legal_advice: "I hear that you're dealing with legal matters. While I can't provide legal advice, I can help you process the emotions around this situation.",
      diagnosis_attempt: "I notice you're wondering about specific conditions. A mental health professional would be best equipped to provide proper assessment and diagnosis.",
      boundary_crossing: "I appreciate your trust, but I need to maintain professional boundaries as an AI support tool. Let's focus on how I can best support you within my role.",
      harmful_suggestion: "I'm concerned about what you're suggesting. Let's explore healthier coping strategies that can help you feel better without causing harm.",
      cultural_insensitivity: "I respect your cultural background and beliefs. Let's work within your cultural context to find approaches that feel right for you.",
      inappropriate_relationship: "I appreciate your trust, but I need to maintain appropriate boundaries in our therapeutic relationship. Let's keep our conversation focused on your wellbeing and support."
    };

    return alternatives[violation.type as keyof typeof alternatives] || "Let me rephrase that in a more appropriate way.";
  }

  private async logEthicalCheck(checkResult: any): Promise<void> {
    // Log ethical check for audit
    console.log('[Ethical Check]', JSON.stringify(checkResult, null, 2));
  }

  private async logBlockedContent(
    violation: BoundaryViolation,
    context: any
  ): Promise<void> {
    // Log blocked content for review
    console.log('[Content Blocked]', {
      violation,
      userId: context.userId,
      sessionId: context.sessionId,
      timestamp: new Date()
    });
  }

  public updateBoundaries(newBoundaries: Partial<EthicalBoundaries>): void {
    this.boundaries = { ...this.boundaries, ...newBoundaries };
    this.emit('boundaries-updated', this.boundaries);
  }

  public getViolationHistory(userId: string): BoundaryViolation[] {
    return this.violationHistory.get(userId) || [];
  }

  public clearViolationHistory(userId: string): void {
    this.violationHistory.delete(userId);
  }
}

export default EthicalBoundaryManager;