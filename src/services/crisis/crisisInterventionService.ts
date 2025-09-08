/**
 * Crisis Intervention and Emergency Response System
 * 24/7 crisis support, risk assessment, safety planning, and emergency coordination
 * Designed for immediate response to mental health crises
 */

import { auditLogger, AuditEventType, AuditSeverity } from '@/services/security/auditLogger';
import { hipaaService, PHICategory } from '@/services/compliance/hipaaService';

// Crisis types and severity levels
export enum CrisisType {
  SUICIDAL_IDEATION = 'suicidal_ideation',
  SUICIDE_ATTEMPT = 'suicide_attempt',
  SELF_HARM = 'self_harm',
  PSYCHOTIC_EPISODE = 'psychotic_episode',
  SEVERE_DEPRESSION = 'severe_depression',
  PANIC_ATTACK = 'panic_attack',
  MANIC_EPISODE = 'manic_episode',
  SUBSTANCE_OVERDOSE = 'substance_overdose',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  CHILD_ABUSE = 'child_abuse',
  ELDER_ABUSE = 'elder_abuse',
  HOMICIDAL_IDEATION = 'homicidal_ideation',
  TRAUMA_RESPONSE = 'trauma_response'
}

export enum CrisisSeverity {
  LOW = 'low',           // Supportive intervention
  MODERATE = 'moderate', // Active intervention
  HIGH = 'high',         // Immediate clinical response
  CRITICAL = 'critical'  // Emergency services required
}

export enum CrisisStatus {
  ACTIVE = 'active',
  STABILIZED = 'stabilized',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  TRANSFERRED = 'transferred'
}

// Crisis intervention record
export interface CrisisIntervention {
  id: string;
  
  // Basic information
  userId: string;
  initiatedBy: 'self_report' | 'system_detected' | 'clinician_referred' | 'third_party_report';
  crisisType: CrisisType;
  severity: CrisisSeverity;
  status: CrisisStatus;
  
  // Timing
  reportedAt: Date;
  responseTime: Date;
  resolvedAt?: Date;
  
  // Location and contact
  location?: Location;
  contactInformation: ContactInfo;
  safetyStatus: SafetyStatus;
  
  // Assessment
  riskAssessment: CrisisRiskAssessment;
  immediateNeeds: string[];
  availableResources: string[];
  
  // Intervention details
  interventions: CrisisInterventionAction[];
  responders: CrisisResponder[];
  referrals: CrisisReferral[];
  
  // Safety planning
  safetyPlan?: CrisisSafetyPlan;
  followUpPlan: FollowUpPlan;
  
  // Documentation
  narrative: string;
  clientStatement?: string;
  collateralInfo?: CollateralInformation[];
  
  // Outcomes
  disposition: CrisisDisposition;
  effectiveness: number; // 1-10 scale
  clientSatisfaction?: number; // 1-10 scale
  
  // Administrative
  legalConsiderations?: LegalConsiderations;
  insurance?: InsuranceInfo;
  cost?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  encryptedFields: string[];
}

export interface Location {
  type: 'home' | 'work' | 'school' | 'public' | 'healthcare' | 'other';
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description: string;
  safetyLevel: 'safe' | 'concerning' | 'dangerous';
}

export interface ContactInfo {
  phone: string;
  alternatePhone?: string;
  email?: string;
  preferredMethod: 'phone' | 'text' | 'email' | 'video';
  language: string;
  interpreter?: boolean;
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isNotified: boolean;
  notifiedAt?: Date;
  response?: string;
}

export interface SafetyStatus {
  immediateDanger: boolean;
  meansAccess: MeansAccess[];
  protectiveFactors: string[];
  supportSystem: SupportPerson[];
  previousAttempts: boolean;
  substanceUse: boolean;
  medicalConcerns: string[];
}

export interface MeansAccess {
  type: 'firearms' | 'medications' | 'sharp_objects' | 'toxic_substances' | 'high_places' | 'other';
  description: string;
  accessibility: 'immediate' | 'easily_obtained' | 'difficult' | 'secured' | 'removed';
  actions: string[]; // Actions taken to secure/remove
}

export interface SupportPerson {
  name: string;
  relationship: string;
  contact: string;
  availability: 'immediate' | 'within_hours' | 'within_days' | 'limited';
  supportType: string[];
}

export interface CrisisRiskAssessment {
  suicideRisk: RiskLevel;
  homicideRisk: RiskLevel;
  selfHarmRisk: RiskLevel;
  psychosisRisk: RiskLevel;
  
  riskFactors: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  
  // Specific assessments
  columbiaRating?: number; // Columbia Suicide Severity Rating Scale
  sadPersons?: number;     // SAD PERSONS scale
  customAssessments?: CustomAssessment[];
  
  // Decision matrix
  overallRisk: RiskLevel;
  confidenceLevel: number; // 1-10
  assessorId: string;
  assessmentDate: Date;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'moderate' | 'high';
  timeframe: 'historical' | 'recent' | 'current';
  source: 'client_report' | 'observation' | 'collateral' | 'records';
}

export interface ProtectiveFactor {
  factor: string;
  strength: 'weak' | 'moderate' | 'strong';
  reliability: 'questionable' | 'moderate' | 'reliable';
  source: string;
}

export interface CustomAssessment {
  name: string;
  score: number;
  maxScore: number;
  interpretation: string;
}

// Intervention actions and responses
export interface CrisisInterventionAction {
  id: string;
  type: InterventionType;
  description: string;
  startTime: Date;
  duration: number; // minutes
  
  // Personnel
  primaryInterventionist: string;
  assistants: string[];
  
  // Details
  techniques: string[];
  clientResponse: ClientResponse;
  effectiveness: number; // 1-10
  
  // Follow-up
  nextSteps: string[];
  referrals: string[];
  
  // Documentation
  notes: string;
  completedAt: Date;
}

export enum InterventionType {
  RISK_ASSESSMENT = 'risk_assessment',
  SAFETY_PLANNING = 'safety_planning',
  DE_ESCALATION = 'de_escalation',
  ACTIVE_LISTENING = 'active_listening',
  PROBLEM_SOLVING = 'problem_solving',
  RESOURCE_CONNECTION = 'resource_connection',
  FAMILY_NOTIFICATION = 'family_notification',
  EMERGENCY_SERVICES = 'emergency_services',
  HOSPITALIZATION = 'hospitalization',
  MEDICATION_MANAGEMENT = 'medication_management',
  FOLLOW_UP_SCHEDULING = 'follow_up_scheduling'
}

export interface ClientResponse {
  cooperationLevel: 'full' | 'partial' | 'minimal' | 'resistant';
  emotionalState: EmotionalState;
  cognitiveState: CognitiveState;
  behavioralObservations: string[];
  verbalContent: string;
  nonverbalCues: string[];
}

export interface EmotionalState {
  mood: string;
  affect: string;
  anxiety: number; // 1-10
  depression: number; // 1-10
  anger: number; // 1-10
  hopelessness: number; // 1-10
}

export interface CognitiveState {
  orientation: 'oriented' | 'mild_confusion' | 'moderate_confusion' | 'severe_confusion';
  memoryIntact: boolean;
  concentrationLevel: 'good' | 'fair' | 'poor';
  judgmentIntact: boolean;
  insightLevel: 'full' | 'partial' | 'limited' | 'absent';
  thoughtProcess: 'organized' | 'circumstantial' | 'tangential' | 'disorganized';
  thoughtContent: string[];
}

export interface CrisisResponder {
  id: string;
  role: ResponderRole;
  name: string;
  credentials: string[];
  organization: string;
  contactInfo: string;
  responseTime: Date;
  duration: number;
  primaryRole: boolean;
}

export enum ResponderRole {
  CRISIS_COUNSELOR = 'crisis_counselor',
  PSYCHIATRIST = 'psychiatrist',
  PSYCHOLOGIST = 'psychologist',
  SOCIAL_WORKER = 'social_worker',
  PEER_SUPPORT = 'peer_support',
  EMERGENCY_MEDICAL = 'emergency_medical',
  POLICE_CIT = 'police_cit', // Crisis Intervention Team
  MOBILE_CRISIS = 'mobile_crisis',
  CASE_MANAGER = 'case_manager',
  FAMILY_MEMBER = 'family_member'
}

export interface CrisisReferral {
  id: string;
  type: ReferralType;
  organization: string;
  contactPerson: string;
  contactInfo: string;
  urgency: 'immediate' | 'within_24h' | 'within_week' | 'routine';
  status: 'pending' | 'confirmed' | 'declined' | 'no_response';
  notes: string;
  followUpDate?: Date;
}

export enum ReferralType {
  INPATIENT_PSYCHIATRIC = 'inpatient_psychiatric',
  OUTPATIENT_THERAPY = 'outpatient_therapy',
  PSYCHIATRIST = 'psychiatrist',
  SUBSTANCE_ABUSE = 'substance_abuse',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  LEGAL_SERVICES = 'legal_services',
  HOUSING = 'housing',
  FINANCIAL_ASSISTANCE = 'financial_assistance',
  MEDICAL_CARE = 'medical_care',
  SUPPORT_GROUP = 'support_group'
}

export interface CrisisSafetyPlan {
  id: string;
  personalWarningSignsInternal: string[];
  personalWarningSignsExternal: string[];
  
  // Coping strategies
  internalCopingStrategies: string[];
  distractionActivities: string[];
  
  // Social support
  socialContacts: SafetyPlanContact[];
  professionalContacts: SafetyPlanContact[];
  
  // Environment safety
  lethalMeansRestriction: LethalMeansRestriction[];
  safeEnvironment: string[];
  
  // Reasons for living
  reasonsForLiving: string[];
  hopeStatements: string[];
  
  // Crisis contacts
  crisisHotlines: CrisisHotline[];
  emergencyServices: EmergencyService[];
  
  // Plan details
  createdDate: Date;
  lastReviewed: Date;
  reviewedBy: string[];
  clientAgreement: boolean;
  effectiveness: number; // Client-rated 1-10
}

export interface SafetyPlanContact {
  name: string;
  relationship: string;
  phone: string;
  whenToCall: string;
  backup: boolean;
}

export interface LethalMeansRestriction {
  means: string;
  action: 'removed' | 'secured' | 'limited_access' | 'monitoring';
  details: string;
  responsiblePerson?: string;
  timeline: string;
}

export interface CrisisHotline {
  name: string;
  number: string;
  type: 'national' | 'local' | 'specialized';
  availability: string;
  language: string[];
}

export interface EmergencyService {
  type: 'police' | 'fire' | 'ems' | 'hospital' | 'mobile_crisis';
  name: string;
  contact: string;
  address?: string;
  specialties: string[];
}

export interface FollowUpPlan {
  immediateFollowUp: {
    timeframe: string;
    method: 'phone' | 'in_person' | 'video' | 'text';
    responsible: string;
    scheduled?: Date;
  };
  
  shortTermPlan: {
    appointments: Appointment[];
    goals: string[];
    monitoring: string[];
  };
  
  longTermPlan: {
    treatmentGoals: string[];
    supportServices: string[];
    preventionStrategies: string[];
  };
  
  contingencyPlan: {
    triggers: string[];
    earlyWarnings: string[];
    actions: string[];
    contacts: string[];
  };
}

export interface Appointment {
  type: string;
  provider: string;
  date: Date;
  confirmed: boolean;
  reminders: boolean;
}

export interface CollateralInformation {
  source: 'family' | 'friend' | 'employer' | 'teacher' | 'healthcare' | 'legal' | 'other';
  name: string;
  relationship: string;
  contact: string;
  consentObtained: boolean;
  information: string;
  reliability: 'high' | 'medium' | 'low' | 'questionable';
  timestamp: Date;
}

export interface CrisisDisposition {
  outcome: DispositionOutcome;
  level: 'community' | 'outpatient' | 'intensive_outpatient' | 'partial_hospital' | 'inpatient' | 'emergency';
  location?: string;
  reasoning: string;
  clientAgreement: boolean;
  legalStatus?: 'voluntary' | 'involuntary' | 'court_ordered';
  followUpRequired: boolean;
}

export enum DispositionOutcome {
  STABILIZED_COMMUNITY = 'stabilized_community',
  OUTPATIENT_REFERRAL = 'outpatient_referral',
  INTENSIVE_OUTPATIENT = 'intensive_outpatient',
  PARTIAL_HOSPITALIZATION = 'partial_hospitalization',
  VOLUNTARY_ADMISSION = 'voluntary_admission',
  INVOLUNTARY_COMMITMENT = 'involuntary_commitment',
  EMERGENCY_DETENTION = 'emergency_detention',
  MEDICAL_ADMISSION = 'medical_admission',
  DECEASED = 'deceased',
  LEFT_AMA = 'left_against_medical_advice',
  TRANSFERRED = 'transferred'
}

export interface LegalConsiderations {
  mandatoryReporting: boolean;
  reportingAgency?: string;
  reportNumber?: string;
  guardianship?: string;
  courtOrders?: string[];
  legalHolds?: string[];
  dutyToWarn?: boolean;
  warnedParties?: string[];
}

export interface InsuranceInfo {
  carrier: string;
  policyNumber: string;
  groupNumber?: string;
  authorization?: string;
  coverage: string;
  copay?: number;
  deductible?: number;
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  IMMINENT = 'imminent'
}

class CrisisInterventionService {
  private static instance: CrisisInterventionService;
  private activeInterventions: Map<string, CrisisIntervention> = new Map();
  private safetyPlans: Map<string, CrisisSafetyPlan> = new Map();
  private hotlines: CrisisHotline[] = [];
  
  private constructor() {
    this.initializeCrisisHotlines();
  }

  static getInstance(): CrisisInterventionService {
    if (!CrisisInterventionService.instance) {
      CrisisInterventionService.instance = new CrisisInterventionService();
    }
    return CrisisInterventionService.instance;
  }

  /**
   * Initiate crisis intervention
   */
  async initiateCrisisIntervention(
    userId: string,
    crisisData: {
      crisisType: CrisisType;
      severity?: CrisisSeverity;
      initiatedBy: 'self_report' | 'system_detected' | 'clinician_referred' | 'third_party_report';
      location?: Partial<Location>;
      immediateNeeds?: string[];
      description: string;
    }
  ): Promise<CrisisIntervention> {
    try {
      // Determine severity if not provided
      const severity = crisisData.severity || this.assessInitialSeverity(crisisData.crisisType);

      const intervention: CrisisIntervention = {
        id: this.generateCrisisId(),
        userId,
        initiatedBy: crisisData.initiatedBy,
        crisisType: crisisData.crisisType,
        severity,
        status: CrisisStatus.ACTIVE,
        reportedAt: new Date(),
        responseTime: new Date(),
        location: crisisData.location as Location,
        contactInformation: await this.getContactInformation(userId),
        safetyStatus: await this.getInitialSafetyStatus(userId),
        riskAssessment: await this.performInitialRiskAssessment(userId, crisisData),
        immediateNeeds: crisisData.immediateNeeds || [],
        availableResources: await this.identifyAvailableResources(userId),
        interventions: [],
        responders: [],
        referrals: [],
        followUpPlan: this.createInitialFollowUpPlan(severity),
        narrative: crisisData.description,
        disposition: {
          outcome: DispositionOutcome.STABILIZED_COMMUNITY, // Initial, will be updated
          level: 'community',
          reasoning: 'Initial assessment pending',
          clientAgreement: false,
          followUpRequired: true
        },
        effectiveness: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        encryptedFields: []
      };

      // Encrypt sensitive fields
      await this.encryptInterventionData(intervention);

      this.activeInterventions.set(intervention.id, intervention);

      // Immediate crisis response based on severity
      await this.executeImmediateResponse(intervention);

      // Audit log
      await auditLogger.logCrisisIntervention(
        userId,
        'crisis_intervention_initiated',
        {
          resourceId: intervention.id,
          severity: this.mapCrisisSeverityToAuditSeverity(severity),
          details: {
            crisisType: crisisData.crisisType,
            initiatedBy: crisisData.initiatedBy,
            location: crisisData.location?.type,
            immediateNeeds: crisisData.immediateNeeds
          }
        }
      );

      return intervention;

    } catch (error) {
      await auditLogger.logEvent(
        AuditEventType.SECURITY_BREACH,
        'crisis_intervention_failed',
        {
          userId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          outcome: 'failure'
        }
      );
      throw error;
    }
  }

  /**
   * Update crisis intervention with assessment results
   */
  async updateCrisisAssessment(
    crisisId: string,
    assessmentData: {
      riskAssessment?: Partial<CrisisRiskAssessment>;
      safetyStatus?: Partial<SafetyStatus>;
      interventions?: CrisisInterventionAction[];
      clientResponse?: ClientResponse;
    },
    assessorId: string
  ): Promise<CrisisIntervention> {
    const intervention = this.activeInterventions.get(crisisId);
    if (!intervention) {
      throw new Error('Crisis intervention not found');
    }

    // Update risk assessment
    if (assessmentData.riskAssessment) {
      intervention.riskAssessment = {
        ...intervention.riskAssessment,
        ...assessmentData.riskAssessment,
        assessorId,
        assessmentDate: new Date()
      };
    }

    // Update safety status
    if (assessmentData.safetyStatus) {
      intervention.safetyStatus = {
        ...intervention.safetyStatus,
        ...assessmentData.safetyStatus
      };
    }

    // Add new interventions
    if (assessmentData.interventions) {
      intervention.interventions.push(...assessmentData.interventions);
    }

    // Update severity based on new assessment
    intervention.severity = this.calculateSeverityFromAssessment(intervention.riskAssessment);
    intervention.updatedAt = new Date();

    this.activeInterventions.set(crisisId, intervention);

    // Check if escalation is needed
    await this.checkForEscalation(intervention);

    // Audit log
    await auditLogger.logEvent(
      AuditEventType.PHI_UPDATE,
      'crisis_assessment_updated',
      {
        userId: intervention.userId,
        crisisId,
        assessorId,
        severity: this.mapCrisisSeverityToAuditSeverity(intervention.severity),
        details: {
          riskLevel: intervention.riskAssessment.overallRisk,
          interventionCount: intervention.interventions.length
        }
      }
    );

    return intervention;
  }

  /**
   * Create safety plan during crisis
   */
  async createCrisisSafetyPlan(
    crisisId: string,
    userId: string,
    safetyPlanData: Omit<CrisisSafetyPlan, 'id' | 'createdDate' | 'lastReviewed' | 'effectiveness'>
  ): Promise<CrisisSafetyPlan> {
    const intervention = this.activeInterventions.get(crisisId);
    if (!intervention || intervention.userId !== userId) {
      throw new Error('Crisis intervention not found or access denied');
    }

    const safetyPlan: CrisisSafetyPlan = {
      id: this.generateSafetyPlanId(),
      createdDate: new Date(),
      lastReviewed: new Date(),
      effectiveness: 0,
      ...safetyPlanData
    };

    this.safetyPlans.set(safetyPlan.id, safetyPlan);
    intervention.safetyPlan = safetyPlan;
    intervention.updatedAt = new Date();

    this.activeInterventions.set(crisisId, intervention);

    // Audit log
    await auditLogger.logEvent(
      AuditEventType.CRISIS_INTERVENTION,
      'safety_plan_created',
      {
        userId,
        crisisId,
        safetyPlanId: safetyPlan.id,
        details: {
          contactCount: safetyPlan.socialContacts.length + safetyPlan.professionalContacts.length,
          copingStrategiesCount: safetyPlan.internalCopingStrategies.length,
          reasonsCount: safetyPlan.reasonsForLiving.length
        }
      }
    );

    return safetyPlan;
  }

  /**
   * Resolve crisis intervention
   */
  async resolveCrisisIntervention(
    crisisId: string,
    resolution: {
      disposition: CrisisDisposition;
      effectiveness: number;
      clientSatisfaction?: number;
      followUpPlan?: FollowUpPlan;
      finalNotes: string;
    },
    resolverId: string
  ): Promise<CrisisIntervention> {
    const intervention = this.activeInterventions.get(crisisId);
    if (!intervention) {
      throw new Error('Crisis intervention not found');
    }

    if (intervention.status === CrisisStatus.RESOLVED) {
      throw new Error('Crisis intervention already resolved');
    }

    // Update intervention
    intervention.status = CrisisStatus.RESOLVED;
    intervention.resolvedAt = new Date();
    intervention.disposition = resolution.disposition;
    intervention.effectiveness = resolution.effectiveness;
    intervention.clientSatisfaction = resolution.clientSatisfaction;
    intervention.narrative += `\n\nResolution: ${resolution.finalNotes}`;
    
    if (resolution.followUpPlan) {
      intervention.followUpPlan = resolution.followUpPlan;
    }

    intervention.updatedAt = new Date();
    this.activeInterventions.set(crisisId, intervention);

    // Schedule follow-up if required
    if (resolution.disposition.followUpRequired) {
      await this.scheduleFollowUp(intervention);
    }

    // Calculate total intervention time
    const totalTime = intervention.resolvedAt.getTime() - intervention.reportedAt.getTime();

    // Audit log
    await auditLogger.logCrisisIntervention(
      intervention.userId,
      'crisis_intervention_resolved',
      {
        crisisId,
        resolverId,
        disposition: resolution.disposition.outcome,
        effectiveness: resolution.effectiveness.toString(),
        details: {
          totalTime,
          interventionCount: intervention.interventions.length,
          responderCount: intervention.responders.length,
          clientSatisfaction: resolution.clientSatisfaction
        }
      }
    );

    return intervention;
  }

  /**
   * Get crisis resources and hotlines
   */
  async getCrisisResources(location?: string): Promise<{
    hotlines: CrisisHotline[];
    emergencyServices: EmergencyService[];
    localResources: any[];
  }> {
    // Filter resources based on location if provided
    let hotlines = this.hotlines;
    const emergencyServices = this.getEmergencyServices();
    
    if (location) {
      // In production, filter by location
      hotlines = this.hotlines.filter(h => 
        h.type === 'national' || h.type === 'local'
      );
    }

    return {
      hotlines,
      emergencyServices,
      localResources: [] // Would be populated with local resources
    };
  }

  /**
   * Get active crisis interventions for monitoring
   */
  async getActiveCrises(filters?: {
    severity?: CrisisSeverity;
    type?: CrisisType;
    assignedTo?: string;
  }): Promise<CrisisIntervention[]> {
    let activeCrises = Array.from(this.activeInterventions.values())
      .filter(crisis => crisis.status === CrisisStatus.ACTIVE);

    // Apply filters
    if (filters?.severity) {
      activeCrises = activeCrises.filter(c => c.severity === filters.severity);
    }
    
    if (filters?.type) {
      activeCrises = activeCrises.filter(c => c.crisisType === filters.type);
    }

    if (filters?.assignedTo) {
      activeCrises = activeCrises.filter(c => 
        c.responders.some(r => r.id === filters.assignedTo)
      );
    }

    // Sort by severity and time
    activeCrises.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return a.reportedAt.getTime() - b.reportedAt.getTime();
    });

    return activeCrises;
  }

  // Private helper methods

  private initializeCrisisHotlines(): void {
    this.hotlines = [
      {
        name: 'National Suicide Prevention Lifeline',
        number: '988',
        type: 'national',
        availability: '24/7',
        language: ['English', 'Spanish']
      },
      {
        name: 'Crisis Text Line',
        number: 'Text HOME to 741741',
        type: 'national',
        availability: '24/7',
        language: ['English', 'Spanish']
      },
      {
        name: 'National Domestic Violence Hotline',
        number: '1-800-799-7233',
        type: 'specialized',
        availability: '24/7',
        language: ['English', 'Spanish', '200+ languages via interpretation']
      },
      {
        name: 'SAMHSA National Helpline',
        number: '1-800-662-4357',
        type: 'national',
        availability: '24/7',
        language: ['English', 'Spanish']
      }
    ];
  }

  private assessInitialSeverity(crisisType: CrisisType): CrisisSeverity {
    const highSeverityCrises = [
      CrisisType.SUICIDE_ATTEMPT,
      CrisisType.SUBSTANCE_OVERDOSE,
      CrisisType.HOMICIDAL_IDEATION,
      CrisisType.PSYCHOTIC_EPISODE
    ];

    const moderateSeverityCrises = [
      CrisisType.SUICIDAL_IDEATION,
      CrisisType.SELF_HARM,
      CrisisType.SEVERE_DEPRESSION,
      CrisisType.MANIC_EPISODE
    ];

    if (highSeverityCrises.includes(crisisType)) {
      return CrisisSeverity.HIGH;
    } else if (moderateSeverityCrises.includes(crisisType)) {
      return CrisisSeverity.MODERATE;
    } else {
      return CrisisSeverity.LOW;
    }
  }

  private async getContactInformation(userId: string): Promise<ContactInfo> {
    // In production, retrieve from user profile
    return {
      phone: 'unknown',
      preferredMethod: 'phone',
      language: 'English',
      interpreter: false,
      emergencyContacts: []
    };
  }

  private async getInitialSafetyStatus(userId: string): Promise<SafetyStatus> {
    // In production, retrieve from user data and assessments
    return {
      immediateDanger: false,
      meansAccess: [],
      protectiveFactors: [],
      supportSystem: [],
      previousAttempts: false,
      substanceUse: false,
      medicalConcerns: []
    };
  }

  private async performInitialRiskAssessment(
    userId: string,
    crisisData: any
  ): Promise<CrisisRiskAssessment> {
    // Basic initial assessment - would be more comprehensive in production
    return {
      suicideRisk: crisisData.crisisType === CrisisType.SUICIDAL_IDEATION ? RiskLevel.MODERATE : RiskLevel.LOW,
      homicideRisk: crisisData.crisisType === CrisisType.HOMICIDAL_IDEATION ? RiskLevel.HIGH : RiskLevel.LOW,
      selfHarmRisk: crisisData.crisisType === CrisisType.SELF_HARM ? RiskLevel.MODERATE : RiskLevel.LOW,
      psychosisRisk: crisisData.crisisType === CrisisType.PSYCHOTIC_EPISODE ? RiskLevel.HIGH : RiskLevel.LOW,
      riskFactors: [],
      protectiveFactors: [],
      overallRisk: RiskLevel.MODERATE,
      confidenceLevel: 5,
      assessorId: 'system',
      assessmentDate: new Date()
    };
  }

  private async identifyAvailableResources(userId: string): Promise<string[]> {
    return [
      'Crisis hotlines',
      'Emergency services',
      'Mobile crisis team',
      'Hospital emergency department'
    ];
  }

  private createInitialFollowUpPlan(severity: CrisisSeverity): FollowUpPlan {
    const timeframes = {
      [CrisisSeverity.CRITICAL]: 'within 1 hour',
      [CrisisSeverity.HIGH]: 'within 4 hours',
      [CrisisSeverity.MODERATE]: 'within 24 hours',
      [CrisisSeverity.LOW]: 'within 72 hours'
    };

    return {
      immediateFollowUp: {
        timeframe: timeframes[severity],
        method: 'phone',
        responsible: 'crisis_team'
      },
      shortTermPlan: {
        appointments: [],
        goals: ['Stabilization', 'Safety planning'],
        monitoring: ['Daily check-ins', 'Risk assessment']
      },
      longTermPlan: {
        treatmentGoals: ['Ongoing mental health treatment'],
        supportServices: ['Counseling', 'Case management'],
        preventionStrategies: ['Safety planning', 'Support network']
      },
      contingencyPlan: {
        triggers: ['Worsening symptoms', 'New stressors'],
        earlyWarnings: ['Sleep disturbance', 'Social isolation'],
        actions: ['Contact crisis team', 'Use safety plan'],
        contacts: ['Crisis hotline', 'Emergency services']
      }
    };
  }

  private async executeImmediateResponse(intervention: CrisisIntervention): Promise<void> {
    switch (intervention.severity) {
      case CrisisSeverity.CRITICAL:
        await this.executeCriticalResponse(intervention);
        break;
      case CrisisSeverity.HIGH:
        await this.executeHighResponse(intervention);
        break;
      case CrisisSeverity.MODERATE:
        await this.executeModerateResponse(intervention);
        break;
      default:
        await this.executeLowResponse(intervention);
    }
  }

  private async executeCriticalResponse(intervention: CrisisIntervention): Promise<void> {
    // Immediate emergency response
    console.log('CRITICAL CRISIS ALERT: Immediate emergency response required');
    // In production: notify emergency services, mobile crisis team, supervisors
  }

  private async executeHighResponse(intervention: CrisisIntervention): Promise<void> {
    // Urgent clinical response
    console.log('HIGH PRIORITY CRISIS: Urgent clinical response within 1 hour');
    // In production: assign crisis clinician, notify supervisors, prepare resources
  }

  private async executeModerateResponse(intervention: CrisisIntervention): Promise<void> {
    // Standard crisis response
    console.log('MODERATE CRISIS: Standard crisis response within 4 hours');
    // In production: assign crisis counselor, schedule assessment
  }

  private async executeLowResponse(intervention: CrisisIntervention): Promise<void> {
    // Supportive response
    console.log('LOW LEVEL CRISIS: Supportive intervention within 24 hours');
    // In production: provide resources, schedule follow-up
  }

  private async encryptInterventionData(intervention: CrisisIntervention): Promise<void> {
    // Mark sensitive fields for encryption
    intervention.encryptedFields = [
      'narrative',
      'clientStatement',
      'contactInformation',
      'location'
    ];
  }

  private calculateSeverityFromAssessment(assessment: CrisisRiskAssessment): CrisisSeverity {
    if (assessment.overallRisk === RiskLevel.IMMINENT) return CrisisSeverity.CRITICAL;
    if (assessment.overallRisk === RiskLevel.HIGH) return CrisisSeverity.HIGH;
    if (assessment.overallRisk === RiskLevel.MODERATE) return CrisisSeverity.MODERATE;
    return CrisisSeverity.LOW;
  }

  private async checkForEscalation(intervention: CrisisIntervention): Promise<void> {
    const previousSeverity = intervention.severity;
    const newSeverity = this.calculateSeverityFromAssessment(intervention.riskAssessment);

    if (newSeverity !== previousSeverity) {
      intervention.severity = newSeverity;
      await this.executeImmediateResponse(intervention);
    }
  }

  private async scheduleFollowUp(intervention: CrisisIntervention): Promise<void> {
    // In production, integrate with scheduling system
    console.log(`Scheduling follow-up for crisis ${intervention.id}`);
  }

  private getEmergencyServices(): EmergencyService[] {
    return [
      {
        type: 'police',
        name: 'Emergency Services',
        contact: '911',
        specialties: ['Crisis intervention', 'Emergency response']
      },
      {
        type: 'hospital',
        name: 'Emergency Department',
        contact: '911',
        specialties: ['Medical emergency', 'Psychiatric emergency']
      }
    ];
  }

  private generateCrisisId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `crisis_${timestamp}_${random}`;
  }

  private generateSafetyPlanId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `safety_${timestamp}_${random}`;
  }

  private mapCrisisSeverityToAuditSeverity(crisisSeverity: CrisisSeverity): AuditSeverity {
    switch (crisisSeverity) {
      case CrisisSeverity.LOW:
        return AuditSeverity.LOW;
      case CrisisSeverity.MODERATE:
        return AuditSeverity.MEDIUM;
      case CrisisSeverity.HIGH:
        return AuditSeverity.HIGH;
      case CrisisSeverity.CRITICAL:
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.LOW;
    }
  }
}

// Export singleton instance
export const crisisInterventionService = CrisisInterventionService.getInstance();
