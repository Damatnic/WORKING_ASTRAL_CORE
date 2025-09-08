// Crisis intervention and management types

export interface CounselorDashboardResponse {
  stats: CounselorStats;
  recentAlerts: AlertResponse[];
  activeInterventions: InterventionResponse[];
  pendingEscalations: EscalationResponse[];
  myAssignments: {
    alerts: AlertResponse[];
    interventions: InterventionResponse[];
  };
  systemStatus: {
    websocketConnected: boolean;
    databaseHealthy: boolean;
    emergencyServicesAvailable: boolean;
  };
}

export interface CounselorStats {
  activeAlerts: number;
  pendingReports: number;
  activeInterventions: number;
  escalations: number;
  resolvedToday: number;
  averageResponseTime: number;
  onlineCounselors: number;
  availableCounselors: number;
}

export interface AlertResponse {
  id: string;
  type: string;
  severity: string;
  userId: string;
  context: string;
  indicators: string[];
  handled: boolean;
  handledBy?: string;
  actions: string[];
  notes?: string;
  detectedAt: Date;
  handledAt?: Date;
}

export interface ReportResponse {
  id: string;
  userId?: string;
  severityLevel: number;
  triggerType: string;
  interventionType: string;
  responseTime: number;
  resolved: boolean;
  resolvedAt?: Date;
  emergencyContactUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  details?: any;
}

export interface InterventionResponse {
  id: string;
  reportId?: string;
  userId: string;
  counselorId?: string;
  type: string;
  priority: number;
  status: string;
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  followUpRequired: boolean;
}

export interface EscalationResponse {
  id: string;
  alertId: string;
  escalatedBy: string;
  reason: string;
  urgency: number;
  requestedAction: string;
  status: string;
  createdAt: Date;
}

export interface CreateReportRequest {
  userId?: string;
  severityLevel: number;
  triggerType: TriggerType;
  interventionType: InterventionType;
  details: {
    description: string;
    symptoms: string[];
    duration: string;
    previousIncidents?: boolean;
    currentMedications?: string[];
    emergencyContacts?: Array<{
      name: string;
      relationship: string;
      phone: string;
    }>;
  };
  isAnonymous?: boolean;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  reviewNotes?: string;
  actionTaken?: string;
  resolved?: boolean;
  resolvedAt?: Date | string;
  responseNotes?: string;
  followUpRequired?: boolean;
  referralMade?: boolean;
}

export interface ReportFilters {
  status?: ReportStatus[];
  severityLevel?: number[];
  triggerType?: string[];
  interventionType?: InterventionType;
  userId?: string;
  resolved?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  startDate?: string;
  endDate?: string;
  counselorId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Enums
export enum CrisisSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical",
  IMMINENT = "imminent"
}

export enum TriggerType {
  SELF_HARM = "self_harm",
  SUICIDAL_IDEATION = "suicidal_ideation",
  ANXIETY_ATTACK = "anxiety_attack",
  PANIC_ATTACK = "panic_attack",
  DEPRESSION_EPISODE = "depression_episode",
  SUBSTANCE_USE = "substance_use",
  TRAUMA_TRIGGER = "trauma_trigger",
  RELATIONSHIP_CRISIS = "relationship_crisis",
  FINANCIAL_STRESS = "financial_stress",
  GRIEF_LOSS = "grief_loss",
  OTHER = "other"
}

export enum InterventionType {
  SELF_HELP = "self_help",
  PEER_SUPPORT = "peer_support",
  COUNSELOR_CHAT = "counselor_chat",
  COUNSELOR_CALL = "counselor_call",
  EMERGENCY_SERVICES = "emergency_services",
  WELLNESS_CHECK = "wellness_check"
}

export enum ReportStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  ACTIVE = "active",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

// Additional response types
export interface CrisisResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Crisis alert types
export interface CrisisAlert {
  id: string;
  type: string;
  severity: CrisisSeverity;
  status: string;
  userId: string;
  assignedCounselors: string[];
  context: string;
  indicators: string[];
  handled: boolean;
  actions: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisAlertPayload {
  type: string;
  severity: CrisisSeverity;
  userId: string;
  context: string;
  indicators: string[];
  location?: string;
  contactMethod?: string;
}

// Safety plan types
export interface SafetyPlanSection {
  id: string;
  title: string;
  content: string[];
  isRequired: boolean;
}

export interface CreateSafetyPlanRequest {
  userId?: string;
  warningSignals: {
    title: string;
    items: string[];
    notes?: string;
  };
  copingStrategies: {
    title: string;
    items: string[];
    notes?: string;
  };
  supportContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    available: string;
  }>;
  safeEnvironment: {
    title: string;
    items: string[];
    notes?: string;
  };
  reasonsToLive?: {
    title: string;
    items: string[];
    notes?: string;
  };
}

export interface UpdateSafetyPlanRequest {
  warningSignals?: {
    title: string;
    items: string[];
    notes?: string;
  };
  copingStrategies?: {
    title: string;
    items: string[];
    notes?: string;
  };
  supportContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    available: string;
  }>;
  safeEnvironment?: {
    title: string;
    items: string[];
    notes?: string;
  };
  reasonsToLive?: {
    title: string;
    items: string[];
    notes?: string;
  };
  isActive?: boolean;
}

export interface SafetyPlanResponse {
  id: string;
  userId: string;
  warningSignals: {
    title: string;
    items: string[];
    notes?: string;
  };
  copingStrategies: {
    title: string;
    items: string[];
    notes?: string;
  };
  supportContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    available: string;
  }>;
  safeEnvironment: {
    title: string;
    items: string[];
    notes?: string;
  };
  reasonsToLive?: {
    title: string;
    items: string[];
    notes?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date;
}