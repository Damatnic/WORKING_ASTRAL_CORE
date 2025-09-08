// Import base types from index to avoid conflicts
import type { UUID, Timestamp, PhoneNumber, BaseEntity } from './index';

// Therapy Session Types
export type SessionType = 'individual' | 'group' | 'family' | 'couples' | 'consultation' | 'assessment';
export type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type SessionFormat = 'in_person' | 'video' | 'phone' | 'chat';
export type TherapyModality = 'cbt' | 'dbt' | 'emdr' | 'psychodynamic' | 'humanistic' | 'family_systems' | 'gestalt' | 'solution_focused' | 'narrative' | 'acceptance_commitment';
export type TreatmentGoalStatus = 'active' | 'achieved' | 'modified' | 'discontinued';
export type ProgressRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Main Therapy Session Interface
export interface TherapySession extends BaseEntity {
  // Session Identification
  sessionNumber: number;
  type: SessionType;
  format: SessionFormat;
  status: SessionStatus;
  
  // Participants
  therapistId: UUID;
  clientId: UUID; // Primary client
  additionalParticipants?: UUID[]; // For group/family therapy
  
  // Scheduling
  scheduledAt: Timestamp;
  duration: number; // in minutes
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  actualDuration?: number;
  
  // Location (for in-person or hybrid sessions)
  location?: {
    type: 'office' | 'client_home' | 'community' | 'hospital' | 'virtual';
    address?: string;
    room?: string;
    notes?: string;
  };
  
  // Session Content
  treatmentPlan?: UUID;
  modalities: TherapyModality[];
  focusAreas: string[];
  interventionsUsed: string[];
  homeworkAssigned?: string[];
  
  // Documentation
  sessionNotes: SessionNote[];
  progressNotes: ProgressNote[];
  assessments?: Assessment[];
  
  // Billing and Insurance
  billingInfo?: {
    insuranceUsed: boolean;
    copay?: number;
    sessionRate?: number;
    billingCode?: string;
    insuranceClaimNumber?: string;
  };
  
  // Technical Information (for virtual sessions)
  virtualSessionInfo?: {
    platformUsed: string;
    recordingEnabled: boolean;
    recordingUrl?: string;
    connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    technicalIssues?: string[];
  };
  
  // Session Outcome
  clientShowedUp: boolean;
  therapistShowedUp: boolean;
  cancellationReason?: string;
  cancellationCategory?: 'client_request' | 'therapist_emergency' | 'illness' | 'scheduling_conflict' | 'technical_issues' | 'other';
  noShowReason?: string;
  
  // Follow-up
  nextSessionScheduled: boolean;
  nextSessionDate?: Timestamp;
  followUpRequired: boolean;
  followUpNotes?: string;
  
  // Crisis Information
  crisisAssessment?: CrisisAssessment;
  safetyPlanReviewed: boolean;
  safetyPlanUpdated: boolean;
  
  // Metadata
  metadata?: {
    clientMoodPre?: ProgressRating;
    clientMoodPost?: ProgressRating;
    therapistNotes?: string;
    sessionRating?: ProgressRating;
    technicalNotes?: string;
  };
}

// Session Notes
export interface SessionNote extends BaseEntity {
  sessionId: UUID;
  type: 'soap' | 'dap' | 'progress' | 'treatment' | 'crisis' | 'supervision';
  content: string;
  isPrivate: boolean; // Only therapist can see
  section?: 'subjective' | 'objective' | 'assessment' | 'plan'; // For SOAP notes
  authorId: UUID;
  supervisorReviewed: boolean;
  supervisorComments?: string;
}

// Progress Notes
export interface ProgressNote extends BaseEntity {
  sessionId: UUID;
  goalId?: UUID;
  progressRating: ProgressRating;
  description: string;
  interventions: string[];
  clientResponse: string;
  homeworkCompliance?: ProgressRating;
  barriers?: string[];
  breakthroughs?: string[];
  nextSteps: string[];
}

// Crisis Assessment within Session
export interface CrisisAssessment {
  suicidalIdeation: {
    present: boolean;
    severity?: 'mild' | 'moderate' | 'severe';
    plan: boolean;
    means: boolean;
    intent: boolean;
    details?: string;
  };
  homicidalIdeation: {
    present: boolean;
    severity?: 'mild' | 'moderate' | 'severe';
    target?: string;
    plan: boolean;
    means: boolean;
    intent: boolean;
  };
  selfHarm: {
    current: boolean;
    history: boolean;
    methods?: string[];
    lastIncident?: Timestamp;
  };
  substanceUse: {
    currentUse: boolean;
    riskLevel: 'none' | 'low' | 'moderate' | 'high';
    substances?: string[];
    impact?: string;
  };
  overallRisk: 'low' | 'moderate' | 'high' | 'imminent';
  actionsTaken: string[];
  referrals: string[];
  followUpRequired: boolean;
}

// Treatment Plan
export interface TreatmentPlan extends BaseEntity {
  // Basic Information
  clientId: UUID;
  therapistId: UUID;
  title: string;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'terminated';
  
  // Clinical Information
  primaryDiagnosis: Diagnosis;
  secondaryDiagnoses?: Diagnosis[];
  presentingProblems: string[];
  strengthsAndResources: string[];
  
  // Treatment Information
  treatmentModality: TherapyModality[];
  treatmentApproach: string;
  estimatedDuration: number; // in weeks
  sessionFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'as-needed';
  
  // Goals and Objectives
  goals: TreatmentGoal[];
  
  // Therapeutic Relationship
  therapeuticAlliance: {
    rating?: ProgressRating;
    notes?: string;
    lastAssessed?: Timestamp;
  };
  
  // Progress and Outcomes
  overallProgress: ProgressRating;
  dischargeCriteria: string[];
  dischargeEstimate?: Timestamp;
  
  // Supervision and Review
  supervisorId?: UUID;
  lastReviewDate?: Timestamp;
  nextReviewDate: Timestamp;
  reviewNotes?: string;
  
  // Authorization and Insurance
  authorization?: {
    insuranceProvider: string;
    authorizationNumber: string;
    authorizedSessions: number;
    usedSessions: number;
    expirationDate: Timestamp;
  };
}

// Treatment Goals
export interface TreatmentGoal extends BaseEntity {
  treatmentPlanId: UUID;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: TreatmentGoalStatus;
  targetDate: Timestamp;
  
  // Measurement
  measurableObjectives: Objective[];
  progressMetrics: string[];
  currentProgress: ProgressRating;
  
  // Interventions
  plannedInterventions: string[];
  usedInterventions: string[];
  
  // Review Information
  lastReviewed: Timestamp;
  reviewNotes?: string;
  modificationHistory?: GoalModification[];
}

export interface Objective extends BaseEntity {
  goalId: UUID;
  description: string;
  isCompleted: boolean;
  completedDate?: Timestamp;
  progressRating: ProgressRating;
  measurementCriteria: string;
  targetBehavior: string;
  interventions: string[];
}

export interface GoalModification {
  date: Timestamp;
  modifiedBy: UUID;
  previousState: string;
  newState: string;
  reason: string;
}

// Diagnoses
export interface Diagnosis {
  code: string; // DSM-5 or ICD-10 code
  description: string;
  specifiers?: string[];
  severity?: 'mild' | 'moderate' | 'severe';
  isPrimary: boolean;
  dateOfDiagnosis: Timestamp;
  diagnosticCriteriaMet: string[];
  differentialDiagnoses?: string[];
  prognosticFactors?: string[];
}

// Assessments
export interface Assessment extends BaseEntity {
  sessionId?: UUID;
  clientId: UUID;
  assessmentType: AssessmentType;
  title: string;
  instrument?: string; // Name of standardized instrument used
  
  // Administration Details
  administeredBy: UUID;
  administeredAt: Timestamp;
  format: 'self_report' | 'interview' | 'observation' | 'performance_based';
  
  // Results
  results: AssessmentResult[];
  interpretation: string;
  recommendations: string[];
  
  // Scoring
  rawScore?: number;
  standardScore?: number;
  percentile?: number;
  qualitativeRating?: string;
  
  // Validity and Reliability
  validityIndicators?: Record<string, any>;
  testingConditions: string;
  limitationsAndCaveats?: string[];
  
  // Follow-up
  reassessmentRecommended: boolean;
  reassessmentDate?: Timestamp;
}

export type AssessmentType = 
  | 'intake'
  | 'diagnostic'
  | 'psychological'
  | 'cognitive'
  | 'personality'
  | 'mood'
  | 'anxiety'
  | 'trauma'
  | 'substance_use'
  | 'suicide_risk'
  | 'functional'
  | 'outcome_measure'
  | 'progress_monitoring';

export interface AssessmentResult {
  domain: string;
  score: number | string;
  interpretation: string;
  significantFindings?: string[];
  recommendations?: string[];
}

// Client-Therapist Relationship
export interface TherapistClient extends BaseEntity {
  therapistId: UUID;
  clientId: UUID;
  relationshipType: 'primary' | 'secondary' | 'consulting' | 'supervisory';
  status: 'active' | 'inactive' | 'terminated' | 'transferred';
  
  // Relationship Timeline
  startDate: Timestamp;
  endDate?: Timestamp;
  totalSessions: number;
  activeSessionCount: number;
  
  // Treatment Information
  currentTreatmentPlan?: UUID;
  treatmentHistory: UUID[];
  
  // Communication Preferences
  preferredContactMethod: 'email' | 'phone' | 'secure_message' | 'none';
  emergencyContact: boolean;
  
  // Boundaries and Agreements
  therapeuticContract?: {
    signedDate: Timestamp;
    contractTerms: string[];
    clientConsents: string[];
    boundaries: string[];
  };
  
  // Insurance and Billing
  insuranceInformation?: InsuranceInfo;
  billingArrangement: 'insurance' | 'self_pay' | 'sliding_scale' | 'pro_bono';
  
  // Termination Information
  terminationReason?: 'goals_met' | 'client_request' | 'therapist_referral' | 'insurance_issues' | 'non_compliance' | 'ethical_concerns' | 'other';
  terminationNotes?: string;
  referralProvided?: string;
}

// Insurance Information
export interface InsuranceInfo {
  provider: string;
  planName: string;
  subscriberId: string;
  groupNumber?: string;
  effectiveDate: Timestamp;
  expirationDate?: Timestamp;
  copay?: number;
  deductible?: number;
  coinsurance?: number;
  annualLimit?: number;
  authorizationRequired: boolean;
  mentalHealthBenefits: boolean;
}

// Therapist Profile and Specializations
export interface TherapyTherapistProfile extends BaseEntity {
  // Basic Information
  name: string;
  email: string;
  
  // Professional Information
  licenseNumber: string;
  licenseState: string;
  licenseType: string;
  licenseExpirationDate: Timestamp;
  
  // Education and Training
  education: Education[];
  certifications: Certification[];
  trainings: Training[];
  
  // Clinical Practice
  specializations: string[];
  treatmentModalities: TherapyModality[];
  ageGroups: AgeGroup[];
  populationsServed: string[];
  languagesSpoken: string[];
  
  // Practice Settings
  practiceType: 'private' | 'group' | 'community' | 'hospital' | 'clinic' | 'employee_assistance';
  acceptingNewClients: boolean;
  waitlistAvailable: boolean;
  
  // Availability and Scheduling
  availability: TherapistAvailability;
  sessionTypes: SessionType[];
  sessionFormats: SessionFormat[];
  
  // Rates and Insurance
  rates: {
    individual: number;
    couples: number;
    family: number;
    group: number;
    assessment: number;
    consultation: number;
  };
  acceptsInsurance: boolean;
  insurancesAccepted: string[];
  slidingScaleAvailable: boolean;
  
  // Professional Development
  continuingEducationCredits: number;
  lastCEDate?: Timestamp;
  requiredCECredits: number;
  
  // Supervision
  isSupervisor: boolean;
  isSupervised: boolean;
  supervisorId?: UUID;
  supervisees?: UUID[];
  
  // Statistics
  totalClientsServed: number;
  yearsOfExperience: number;
  averageSessionRating?: number;
  clientRetentionRate?: number;
}

export interface Education {
  institution: string;
  degree: string;
  major: string;
  graduationYear: number;
  gpa?: number;
  honors?: string[];
}

export interface Certification {
  name: string;
  issuingOrganization: string;
  issueDate: Timestamp;
  expirationDate?: Timestamp;
  credentialNumber?: string;
  isActive: boolean;
  requiresRenewal: boolean;
  ceuRequired?: number;
}

export interface Training {
  title: string;
  provider: string;
  completionDate: Timestamp;
  hours: number;
  type: 'workshop' | 'conference' | 'course' | 'certification' | 'supervision';
  category: string;
  ceuCredits?: number;
}

export type AgeGroup = 'children' | 'adolescents' | 'young_adults' | 'adults' | 'geriatric';

// Therapist Availability
export interface TherapistAvailability {
  timezone: string;
  regularSchedule: AvailabilitySlot[];
  exceptions: ScheduleException[];
  bufferTime: number; // minutes between sessions
  advanceBooking: number; // days in advance clients can book
  lastMinuteCancellation: number; // hours before session
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  sessionTypes: SessionType[];
  isActive: boolean;
}

export interface ScheduleException {
  startDate: Timestamp;
  endDate: Timestamp;
  type: 'vacation' | 'conference' | 'personal' | 'emergency' | 'holiday';
  description: string;
  affectsExistingAppointments: boolean;
}

// Group Therapy Specific Types
export interface TherapyGroup extends BaseEntity {
  name: string;
  description: string;
  therapistId: UUID;
  coTherapistId?: UUID;
  
  // Group Details
  groupType: 'support' | 'skills' | 'process' | 'psychoeducational' | 'therapy';
  focusArea: string;
  population: string;
  ageRange?: {
    min: number;
    max: number;
  };
  
  // Structure
  maxMembers: number;
  currentMembers: number;
  isOpenGroup: boolean; // Can add members anytime
  duration: number; // total weeks
  sessionLength: number; // minutes per session
  
  // Scheduling
  meetingSchedule: {
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
  
  // Status
  status: 'forming' | 'active' | 'closed' | 'completed';
  startDate: Timestamp;
  endDate?: Timestamp;
  
  // Members
  members: GroupMembership[];
  
  // Materials and Curriculum
  curriculum?: string[];
  handouts?: UUID[];
  assignments?: string[];
}

export interface GroupMembership extends BaseEntity {
  groupId: UUID;
  clientId: UUID;
  joinDate: Timestamp;
  leaveDate?: Timestamp;
  status: 'active' | 'inactive' | 'graduated' | 'dropped_out';
  
  // Participation
  attendance: number; // percentage
  participationLevel: 'high' | 'medium' | 'low';
  goals: string[];
  progress: ProgressRating;
  
  // Notes
  memberNotes?: string[];
  behavioralObservations?: string[];
  groupDynamicsRole?: string;
}

// Supervision and Training
export interface Supervision extends BaseEntity {
  supervisorId: UUID;
  superviseeId: UUID;
  
  // Structure
  type: 'individual' | 'group' | 'peer' | 'administrative';
  format: SessionFormat;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  duration: number; // minutes per session
  
  // Requirements
  totalHoursRequired: number;
  hoursCompleted: number;
  startDate: Timestamp;
  expectedEndDate: Timestamp;
  
  // Documentation
  supervisionNotes: SupervisionNote[];
  evaluations: SupervisionEvaluation[];
  
  // Status
  status: 'active' | 'completed' | 'terminated';
  isLicensureSupervision: boolean;
}

export interface SupervisionNote extends BaseEntity {
  supervisionId: UUID;
  sessionDate: Timestamp;
  duration: number;
  casesDiscussed: UUID[]; // therapy session IDs
  skillsAddressed: string[];
  learningObjectives: string[];
  supervisorFeedback: string;
  superviseeReflections?: string;
  actionItems: string[];
  nextSessionFocus?: string[];
}

export interface SupervisionEvaluation extends BaseEntity {
  supervisionId: UUID;
  evaluationDate: Timestamp;
  evaluationType: 'quarterly' | 'mid_year' | 'annual' | 'final';
  
  // Competency Areas
  competencyRatings: Array<{
    area: string;
    rating: ProgressRating;
    comments: string;
  }>;
  
  // Overall Assessment
  overallRating: ProgressRating;
  strengths: string[];
  areasForDevelopment: string[];
  goalsMet: string[];
  goalsForNextPeriod: string[];
  
  // Recommendations
  recommendContinuation: boolean;
  recommendationsForImprovement?: string[];
  additionalTrainingNeeded?: string[];
  
  // Signatures and Approval
  supervisorSignature: boolean;
  supervisorSignatureDate?: Timestamp;
  superviseeSignature: boolean;
  superviseeSignatureDate?: Timestamp;
}

// API Request/Response Types
export interface CreateSessionRequest {
  clientId: UUID;
  type: SessionType;
  format: SessionFormat;
  scheduledAt: Timestamp;
  duration: number;
  treatmentPlan?: UUID;
  notes?: string;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  notes?: string;
  interventionsUsed?: string[];
  homeworkAssigned?: string[];
  nextSessionDate?: Timestamp;
}

export interface SessionResponse {
  id: UUID;
  sessionNumber: number;
  type: SessionType;
  format: SessionFormat;
  status: SessionStatus;
  client: {
    id: UUID;
    name: string;
  };
  therapist: {
    id: UUID;
    name: string;
  };
  scheduledAt: Timestamp;
  duration: number;
  actualDuration?: number;
  notes?: SessionNote[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TherapistSearchFilters {
  specializations?: string[];
  treatmentModalities?: TherapyModality[];
  ageGroups?: AgeGroup[];
  sessionFormats?: SessionFormat[];
  acceptsInsurance?: boolean;
  insurancesAccepted?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // km
  };
  availableAfter?: Timestamp;
  priceRange?: {
    min: number;
    max: number;
  };
  languages?: string[];
  acceptingNewClients?: boolean;
}

// Type Guards and Validators
export function isValidSessionStatus(status: any): status is SessionStatus {
  const validStatuses: SessionStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
  return validStatuses.includes(status);
}

export function isValidSessionType(type: any): type is SessionType {
  const validTypes: SessionType[] = ['individual', 'group', 'family', 'couples', 'consultation', 'assessment'];
  return validTypes.includes(type);
}

export function isValidProgressRating(rating: any): rating is ProgressRating {
  return typeof rating === 'number' && rating >= 1 && rating <= 10;
}

export function canCancelSession(session: TherapySession, currentTime: Timestamp = new Date()): boolean {
  const sessionTime = new Date(session.scheduledAt);
  const timeDiff = sessionTime.getTime() - new Date(currentTime).getTime();
  const hoursUntilSession = timeDiff / (1000 * 60 * 60);
  
  return hoursUntilSession >= 24; // Can cancel if more than 24 hours away
}

export function calculateSessionOutcome(session: TherapySession): 'positive' | 'neutral' | 'negative' {
  if (!session.metadata?.clientMoodPost || !session.metadata?.clientMoodPre) {
    return 'neutral';
  }
  
  const moodChange = session.metadata.clientMoodPost - session.metadata.clientMoodPre;
  
  if (moodChange >= 2) return 'positive';
  if (moodChange <= -2) return 'negative';
  return 'neutral';
}

// Constants
export const SESSION_DURATION_OPTIONS = [30, 45, 50, 60, 75, 90, 120] as const;
export const CANCELLATION_FEES = {
  SAME_DAY: 1.0,
  LESS_THAN_24_HOURS: 0.5,
  MORE_THAN_24_HOURS: 0.0
} as const;
export const SUPERVISION_REQUIREMENTS = {
  PRE_LICENSED: { hoursPerWeek: 1, totalHours: 4000 },
  POST_LICENSED: { hoursPerWeek: 0.5, totalHours: 100 }
} as const;