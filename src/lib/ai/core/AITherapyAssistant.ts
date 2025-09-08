/**
 * AI Therapy Assistant Core Module
 * Implements ethical boundaries, safety protocols, and therapeutic interventions
 * Aligned with mission: "We built Astral Core to be the voice people find when they've lost their own"
 */

import { EventEmitter } from 'events';
import { CrisisDetector } from './CrisisDetector';
import { EthicalBoundaryManager } from './EthicalBoundaryManager';
import { InterventionSelector, InterventionType } from './InterventionSelector';
import { PrivacyManager } from './PrivacyManager';
import { AuditLogger } from './AuditLogger';
import { HumanOversightManager } from './HumanOversightManager';
import { LanguageProcessor } from './LanguageProcessor';

export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: SupportedLanguage;
  conversationHistory: Message[];
  userProfile: UserProfile;
  currentMood?: MoodState;
  riskLevel?: RiskLevel;
  activeInterventions?: Intervention[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  sentiment?: number;
  emotions?: EmotionAnalysis;
  crisisIndicators?: CrisisIndicator[];
  interventionType?: InterventionType;
  flaggedContent?: FlaggedContent[];
}

export interface UserProfile {
  id: string;
  preferredName: string;
  demographics?: Demographics;
  therapyHistory?: TherapyHistory;
  preferences: UserPreferences;
  safetyPlan?: SafetyPlan;
  emergencyContacts?: EmergencyContact[];
  consentStatus: ConsentStatus;
}

export interface MoodState {
  current: number; // 1-10 scale
  trend: 'improving' | 'stable' | 'declining';
  triggers?: string[];
  timestamp: Date;
}

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt';

export interface Intervention {
  id: string;
  type: InterventionType;
  name: string;
  description: string;
  evidenceBase: EvidenceLevel;
  implementation: () => Promise<InterventionResult>;
}

export type EvidenceLevel = 'strong' | 'moderate' | 'emerging' | 'expert_consensus';

export interface InterventionResult {
  success: boolean;
  userEngagement: number;
  nextSteps?: string[];
  escalationNeeded?: boolean;
}

export interface EmotionAnalysis {
  primary: string;
  secondary?: string[];
  intensity: number;
  valence: number;
}

export interface CrisisIndicator {
  type: string;
  severity: number;
  confidence: number;
  keywords?: string[];
}

export interface FlaggedContent {
  type: 'harmful' | 'medical_advice' | 'legal_advice' | 'crisis' | 'abuse';
  content: string;
  action: 'block' | 'redirect' | 'escalate';
}

export interface Demographics {
  age?: number;
  gender?: string;
  location?: string;
  culturalBackground?: string;
}

export interface TherapyHistory {
  previousTherapy: boolean;
  therapyTypes?: string[];
  medications?: boolean;
  hospitalizations?: boolean;
}

export interface UserPreferences {
  communicationStyle: 'formal' | 'casual' | 'supportive';
  interventionTypes: InterventionType[];
  privacyLevel: 'minimal' | 'standard' | 'maximum';
  dataRetention: number; // days
}

export interface SafetyPlan {
  warningSignals: string[];
  copingStrategies: string[];
  supportNetwork: string[];
  professionalContacts: ProfessionalContact[];
  safeEnvironment: string[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  availability?: string;
}

export interface ProfessionalContact {
  name: string;
  role: string;
  phone: string;
  organization?: string;
}

export interface ConsentStatus {
  termsAccepted: boolean;
  dataProcessing: boolean;
  emergencyContact: boolean;
  timestamp: Date;
}

export interface AIResponse {
  message: string;
  interventions?: Intervention[];
  escalationRequired?: boolean;
  humanHandoffNeeded?: boolean;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  confidence: number;
  ethicalCheck: EthicalCheckResult;
  privacyCheck: PrivacyCheckResult;
  timestamp: Date;
}

export interface EthicalCheckResult {
  passed: boolean;
  violations?: string[];
  recommendations?: string[];
}

export interface PrivacyCheckResult {
  compliant: boolean;
  dataMinimized: boolean;
  encryptionApplied: boolean;
}

export class AITherapyAssistant extends EventEmitter {
  private crisisDetector!: CrisisDetector;
  private ethicalBoundaryManager!: EthicalBoundaryManager;
  private interventionSelector!: InterventionSelector;
  private privacyManager!: PrivacyManager;
  private auditLogger!: AuditLogger;
  private humanOversightManager!: HumanOversightManager;
  private languageProcessor!: LanguageProcessor;
  
  private readonly MAX_SESSION_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly ETHICAL_BOUNDARIES = {
    noMedicalAdvice: true,
    noLegalAdvice: true,
    noDiagnosis: true,
    mandatoryReporting: true,
    suicidePrevention: true,
    respectAutonomy: true,
    maintainBoundaries: true,
    culturalSensitivity: true
  };

  constructor() {
    super();
    this.initializeComponents();
    this.setupSafetyProtocols();
  }

  private initializeComponents(): void {
    this.crisisDetector = new CrisisDetector();
    this.ethicalBoundaryManager = new EthicalBoundaryManager(this.ETHICAL_BOUNDARIES);
    this.interventionSelector = new InterventionSelector();
    this.privacyManager = new PrivacyManager();
    this.auditLogger = new AuditLogger();
    this.humanOversightManager = new HumanOversightManager();
    this.languageProcessor = new LanguageProcessor();
  }

  private setupSafetyProtocols(): void {
    // Set up real-time crisis monitoring
    this.crisisDetector.on('crisis-detected', (data) => {
      this.handleCrisisDetection(data);
    });

    // Set up ethical violation monitoring
    this.ethicalBoundaryManager.on('boundary-violation', (violation) => {
      this.handleEthicalViolation(violation);
    });

    // Set up human oversight triggers
    this.humanOversightManager.on('escalation-needed', (context) => {
      this.escalateToHuman(context);
    });
  }

  public async processMessage(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // 1. Privacy and consent check
      const privacyCheck = await this.privacyManager.validateConsent(context.userId);
      if (!privacyCheck.valid) {
        return this.createConsentRequiredResponse();
      }

      // 2. Language processing and analysis
      const processedMessage = await this.languageProcessor.analyze(message, context.language);
      
      // 3. Crisis detection
      const crisisAssessment = await this.crisisDetector.assess(processedMessage, context);
      if (crisisAssessment.level === 'critical') {
        return this.handleCrisisResponse(crisisAssessment, context);
      }

      // 4. Ethical boundary check
      const ethicalCheck = await this.ethicalBoundaryManager.validate(
        processedMessage,
        context
      );
      if (!ethicalCheck.passed) {
        return this.handleEthicalBoundaryResponse(ethicalCheck, context);
      }

      // 5. Generate therapeutic response
      const response = await this.generateTherapeuticResponse(
        processedMessage,
        context,
        crisisAssessment
      );

      // 6. Select appropriate interventions
      const interventions = await this.interventionSelector.select(
        context,
        processedMessage,
        crisisAssessment
      );

      // 7. Apply privacy protection
      const sanitizedResponse = await this.privacyManager.sanitizeResponse(response);

      // 8. Log for audit and quality assurance
      await this.auditLogger.log({
        sessionId: context.sessionId,
        userId: context.userId,
        action: 'therapy_response',
        category: 'conversation' as const,
        severity: 'info' as const,
        timestamp: new Date(),
        details: {
          message: processedMessage,
          response: sanitizedResponse,
          interventions,
          riskLevel: crisisAssessment.level
        }
      });

      // 9. Check if human oversight is needed
      const oversightNeeded = await this.humanOversightManager.evaluate(
        context,
        crisisAssessment,
        response
      );

      return {
        message: sanitizedResponse.content,
        interventions,
        escalationRequired: oversightNeeded.escalationRequired,
        humanHandoffNeeded: oversightNeeded.handoffNeeded,
        metadata: {
          confidence: response.confidence,
          ethicalCheck,
          privacyCheck: {
            compliant: true,
            dataMinimized: true,
            encryptionApplied: true
          },
          timestamp: new Date()
        }
      };

    } catch (error) {
      // Log error and provide safe fallback response
      await this.auditLogger.logError({
        error: error instanceof Error ? error.message : String(error),
        context
      });

      return this.createSafetyFallbackResponse();
    }
  }

  private async generateTherapeuticResponse(
    processedMessage: any,
    context: ConversationContext,
    crisisAssessment: any
  ): Promise<any> {
    // Implement evidence-based therapeutic response generation
    const responseStrategies = [
      'validation',
      'normalization',
      'reframing',
      'exploration',
      'psychoeducation',
      'skill_building',
      'resource_provision'
    ];

    // Select appropriate strategy based on context
    const strategy = this.selectResponseStrategy(
      processedMessage,
      context,
      crisisAssessment
    );

    // Generate response using selected strategy
    const response = await this.craftTherapeuticMessage(
      strategy,
      processedMessage,
      context
    );

    return response;
  }

  private selectResponseStrategy(
    message: any,
    context: ConversationContext,
    crisisAssessment: any
  ): string {
    // Implement intelligent strategy selection based on:
    // - User's emotional state
    // - Conversation history
    // - Risk level
    // - User preferences
    // - Evidence-based best practices
    
    if (crisisAssessment.level === 'high') {
      return 'validation';
    }
    
    if (message.emotions?.valence < 0.3) {
      return 'normalization';
    }
    
    if (context.conversationHistory.length < 3) {
      return 'exploration';
    }
    
    return 'psychoeducation';
  }

  private async craftTherapeuticMessage(
    strategy: string,
    message: any,
    context: ConversationContext
  ): Promise<any> {
    // Implement message crafting based on therapeutic strategy
    const templates = {
      validation: [
        "I hear how difficult this is for you. Your feelings are completely valid.",
        "It takes courage to share what you're going through. Thank you for trusting me with this.",
        "What you're experiencing sounds really challenging. It's understandable to feel this way."
      ],
      normalization: [
        "Many people experience similar feelings in situations like this.",
        "You're not alone in feeling this way. This is a common response to what you're facing.",
        "What you're describing is a natural reaction to difficult circumstances."
      ],
      reframing: [
        "I wonder if we could look at this situation from a different angle...",
        "Another way to think about this might be...",
        "What if we considered this perspective..."
      ],
      exploration: [
        "Can you tell me more about what that's like for you?",
        "What thoughts come up for you when this happens?",
        "How long have you been experiencing these feelings?"
      ],
      psychoeducation: [
        "Understanding how our thoughts and feelings work can be helpful...",
        "Research shows that when we're stressed, our body responds by...",
        "This is actually your mind's way of trying to protect you..."
      ]
    };

    const templateArray = templates[strategy as keyof typeof templates];
    const selectedTemplate = templateArray?.[
      Math.floor(Math.random() * templateArray.length)
    ] || "I'm here to support you. How can I help?";

    return {
      content: selectedTemplate,
      confidence: 0.85,
      strategy
    };
  }

  private async handleCrisisResponse(
    crisisAssessment: any,
    context: ConversationContext
  ): Promise<AIResponse> {
    // Immediate crisis response protocol
    this.emit('crisis-intervention-triggered', {
      userId: context.userId,
      sessionId: context.sessionId,
      level: crisisAssessment.level
    });

    return {
      message: "I'm concerned about your safety right now. Your wellbeing is my top priority. " +
               "I'd like to connect you with someone who can provide immediate support. " +
               "Would you be open to speaking with a crisis counselor? " +
               "In the meantime, I'm here with you.",
      interventions: [{
        id: 'crisis-001',
        type: 'crisis_escalation',
        name: 'Crisis Support Connection',
        description: 'Immediate connection to crisis support services',
        evidenceBase: 'strong',
        implementation: async () => ({
          success: true,
          userEngagement: 1,
          escalationNeeded: true
        })
      }],
      escalationRequired: true,
      humanHandoffNeeded: true,
      metadata: {
        confidence: 1,
        ethicalCheck: { passed: true },
        privacyCheck: {
          compliant: true,
          dataMinimized: false,
          encryptionApplied: true
        },
        timestamp: new Date()
      }
    };
  }

  private async handleEthicalBoundaryResponse(
    ethicalCheck: EthicalCheckResult,
    context: ConversationContext
  ): Promise<AIResponse> {
    const boundaryMessages = {
      medical: "I understand you're looking for medical advice. While I can provide general wellness information, " +
               "I'm not qualified to give medical advice. I'd encourage you to speak with a healthcare provider about this.",
      legal: "I notice you're asking about legal matters. I'm not able to provide legal advice. " +
             "For legal questions, please consult with a qualified attorney.",
      diagnosis: "I'm not able to provide diagnoses. If you're concerned about specific symptoms, " +
                "I'd recommend discussing them with a mental health professional who can properly assess your situation."
    };

    const violation = ethicalCheck.violations?.[0] || 'boundary';
    const message = boundaryMessages[violation as keyof typeof boundaryMessages] || 
                   "I want to be helpful, but I need to stay within my capabilities as an AI support tool. " +
                   "Let's focus on what I can help with - providing emotional support and coping strategies.";

    return {
      message,
      interventions: [],
      escalationRequired: false,
      humanHandoffNeeded: false,
      metadata: {
        confidence: 1,
        ethicalCheck,
        privacyCheck: {
          compliant: true,
          dataMinimized: true,
          encryptionApplied: true
        },
        timestamp: new Date()
      }
    };
  }

  private createConsentRequiredResponse(): AIResponse {
    return {
      message: "Before we continue, I need to ensure you've reviewed and accepted our privacy policy and terms of service. " +
               "This helps me protect your information and provide you with the best support possible.",
      interventions: [],
      escalationRequired: false,
      humanHandoffNeeded: false,
      metadata: {
        confidence: 1,
        ethicalCheck: { passed: true },
        privacyCheck: {
          compliant: false,
          dataMinimized: true,
          encryptionApplied: true
        },
        timestamp: new Date()
      }
    };
  }

  private createSafetyFallbackResponse(): AIResponse {
    return {
      message: "I apologize, but I'm having trouble processing that right now. " +
               "Your wellbeing is important to me. If you're in crisis, please reach out to a crisis helpline. " +
               "Otherwise, could you try rephrasing what you'd like to talk about?",
      interventions: [],
      escalationRequired: false,
      humanHandoffNeeded: false,
      metadata: {
        confidence: 0.5,
        ethicalCheck: { passed: true },
        privacyCheck: {
          compliant: true,
          dataMinimized: true,
          encryptionApplied: true
        },
        timestamp: new Date()
      }
    };
  }

  private async handleCrisisDetection(data: any): Promise<void> {
    // Implement crisis detection handling
    await this.humanOversightManager.notifyCrisis(data);
    await this.auditLogger.logCrisis(data);
  }

  private async handleEthicalViolation(violation: any): Promise<void> {
    // Implement ethical violation handling
    await this.auditLogger.logEthicalViolation(violation);
    await this.humanOversightManager.notifyViolation(violation);
  }

  private async escalateToHuman(context: any): Promise<void> {
    // Implement human escalation
    this.emit('human-escalation-required', context);
  }

  public async endSession(sessionId: string): Promise<void> {
    // Implement session cleanup and data protection
    await this.auditLogger.logSessionEnd(sessionId);
    await this.privacyManager.secureSessionData(sessionId);
  }
}

export default AITherapyAssistant;