/**
 * Human Oversight Management System
 * Ensures human professionals can monitor and intervene when necessary
 */

import { EventEmitter } from 'events';

export interface OversightRequest {
  id: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'immediate';
  type: OversightType;
  userId: string;
  sessionId: string;
  reason: string;
  context: any;
  status: OversightStatus;
  assignedTo?: string;
  resolution?: OversightResolution;
}

export type OversightType = 
  | 'crisis_escalation'
  | 'ethical_violation'
  | 'clinical_review'
  | 'complex_case'
  | 'medication_question'
  | 'legal_issue'
  | 'mandatory_reporting'
  | 'technical_limitation'
  | 'user_request';

export type OversightStatus = 
  | 'pending'
  | 'assigned'
  | 'in_review'
  | 'resolved'
  | 'escalated'
  | 'cancelled';

export interface OversightResolution {
  resolvedBy: string;
  resolvedAt: Date;
  action: ResolutionAction;
  notes: string;
  followUp?: FollowUpAction;
}

export type ResolutionAction = 
  | 'human_takeover'
  | 'provided_guidance'
  | 'referred_to_professional'
  | 'crisis_intervention'
  | 'no_action_needed'
  | 'system_override';

export interface FollowUpAction {
  type: 'check_in' | 'schedule_appointment' | 'monitor' | 'transfer_care';
  timeline: string;
  assignedTo: string;
}

export interface HumanProfessional {
  id: string;
  name: string;
  role: ProfessionalRole;
  credentials: string[];
  specialties: string[];
  availability: AvailabilityStatus;
  currentCaseload: number;
  maxCaseload: number;
  languages: string[];
  contactInfo: ContactInfo;
}

export type ProfessionalRole = 
  | 'therapist'
  | 'psychiatrist'
  | 'crisis_counselor'
  | 'clinical_supervisor'
  | 'social_worker'
  | 'nurse_practitioner';

export interface AvailabilityStatus {
  status: 'available' | 'busy' | 'offline' | 'on_call';
  nextAvailable?: Date;
  schedule?: Schedule[];
}

export interface Schedule {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  timezone: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  pager?: string;
  emergencyContact?: string;
}

export interface EscalationCriteria {
  riskLevel: string;
  keywords: string[];
  patterns: RegExp[];
  timeoutMinutes: number;
  autoEscalate: boolean;
}

export interface OversightMetrics {
  totalRequests: number;
  pendingRequests: number;
  averageResponseTime: number;
  resolutionRate: number;
  escalationRate: number;
  professionalUtilization: Map<string, number>;
}

export class HumanOversightManager extends EventEmitter {
  private oversightRequests: Map<string, OversightRequest>;
  private professionals: Map<string, HumanProfessional>;
  private escalationCriteria: EscalationCriteria[];
  private assignmentQueue: OversightRequest[];
  private metrics: OversightMetrics;

  constructor() {
    super();
    this.oversightRequests = new Map();
    this.professionals = new Map();
    this.escalationCriteria = [];
    this.assignmentQueue = [];
    this.metrics = this.initializeMetrics();
    this.initializeEscalationCriteria();
    this.startMonitoring();
  }

  private initializeMetrics(): OversightMetrics {
    return {
      totalRequests: 0,
      pendingRequests: 0,
      averageResponseTime: 0,
      resolutionRate: 0,
      escalationRate: 0,
      professionalUtilization: new Map()
    };
  }

  private initializeEscalationCriteria(): void {
    this.escalationCriteria = [
      {
        riskLevel: 'critical',
        keywords: ['suicide', 'kill myself', 'end my life'],
        patterns: [/\bsuicid(e|al)\b/i],
        timeoutMinutes: 5,
        autoEscalate: true
      },
      {
        riskLevel: 'high',
        keywords: ['self harm', 'cutting', 'overdose'],
        patterns: [/\bself[- ]?harm\b/i],
        timeoutMinutes: 15,
        autoEscalate: true
      },
      {
        riskLevel: 'medium',
        keywords: ['crisis', 'emergency', 'urgent'],
        patterns: [/\b(crisis|emergency)\b/i],
        timeoutMinutes: 30,
        autoEscalate: false
      }
    ];
  }

  private startMonitoring(): void {
    // Check for timeout escalations every minute
    setInterval(() => {
      this.checkTimeoutEscalations();
    }, 60 * 1000);

    // Update metrics every 5 minutes
    setInterval(() => {
      this.updateMetrics();
    }, 5 * 60 * 1000);
  }

  public async evaluate(
    context: any,
    crisisAssessment: any,
    response: any
  ): Promise<{
    escalationRequired: boolean;
    handoffNeeded: boolean;
    reason?: string;
  }> {
    let escalationRequired = false;
    let handoffNeeded = false;
    let reason = '';

    // Check crisis level
    if (crisisAssessment.level === 'critical' || crisisAssessment.level === 'high') {
      escalationRequired = true;
      reason = `Crisis level: ${crisisAssessment.level}`;
    }

    // Check for immediate risk
    if (crisisAssessment.immediateRisk) {
      handoffNeeded = true;
      reason = 'Immediate risk detected';
    }

    // Check response confidence
    if (response.confidence < 0.5) {
      escalationRequired = true;
      reason = 'Low AI confidence in response';
    }

    // Check escalation criteria
    for (const criteria of this.escalationCriteria) {
      if (this.matchesCriteria(context, crisisAssessment, criteria)) {
        escalationRequired = true;
        if (criteria.autoEscalate) {
          handoffNeeded = true;
        }
        reason = `Matched escalation criteria: ${criteria.riskLevel}`;
        break;
      }
    }

    // Check user request for human
    if (context.userProfile?.preferences?.preferHuman) {
      handoffNeeded = true;
      reason = 'User requested human professional';
    }

    return {
      escalationRequired,
      handoffNeeded,
      reason: reason || undefined
    };
  }

  private matchesCriteria(
    context: any,
    assessment: any,
    criteria: EscalationCriteria
  ): boolean {
    // Check risk level
    if (assessment.level === criteria.riskLevel) {
      return true;
    }

    // Check keywords in conversation
    const recentMessages = context.conversationHistory?.slice(-5) || [];
    for (const message of recentMessages) {
      const text = message.content?.toLowerCase() || '';
      
      // Check keywords
      if (criteria.keywords.some(keyword => text.includes(keyword))) {
        return true;
      }
      
      // Check patterns
      if (criteria.patterns.some(pattern => pattern.test(text))) {
        return true;
      }
    }

    return false;
  }

  public async requestOversight(params: {
    type: OversightType;
    priority: OversightRequest['priority'];
    userId: string;
    sessionId: string;
    reason: string;
    context: any;
  }): Promise<OversightRequest> {
    const request: OversightRequest = {
      id: this.generateRequestId(),
      timestamp: new Date(),
      priority: params.priority,
      type: params.type,
      userId: params.userId,
      sessionId: params.sessionId,
      reason: params.reason,
      context: params.context,
      status: 'pending'
    };

    this.oversightRequests.set(request.id, request);
    this.assignmentQueue.push(request);
    this.metrics.totalRequests++;
    this.metrics.pendingRequests++;

    // Attempt immediate assignment
    await this.assignRequest(request);

    // Emit event for monitoring
    this.emit('oversight-requested', request);

    // Send notifications based on priority
    if (request.priority === 'immediate') {
      await this.sendImmediateAlert(request);
    }

    return request;
  }

  private generateRequestId(): string {
    return `oversight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async assignRequest(request: OversightRequest): Promise<void> {
    // Find available professional
    const professional = this.findAvailableProfessional(request);
    
    if (professional) {
      request.assignedTo = professional.id;
      request.status = 'assigned';
      this.assignmentQueue = this.assignmentQueue.filter(r => r.id !== request.id);
      
      // Update professional's caseload
      professional.currentCaseload++;
      
      // Notify professional
      await this.notifyProfessional(professional, request);
      
      this.emit('request-assigned', { request, professional });
    } else {
      // Add to queue if no professional available
      if (request.priority === 'immediate') {
        await this.escalateToSupervisor(request);
      }
    }
  }

  private findAvailableProfessional(request: OversightRequest): HumanProfessional | null {
    const availableProfessionals = Array.from(this.professionals.values())
      .filter(p => {
        // Check availability
        if (p.availability.status !== 'available') return false;
        
        // Check caseload
        if (p.currentCaseload >= p.maxCaseload) return false;
        
        // Check specialties match
        if (request.type === 'crisis_escalation' && !p.specialties.includes('crisis')) {
          return false;
        }
        
        // Check language match
        const userLanguage = request.context?.language || 'en';
        if (!p.languages.includes(userLanguage)) return false;
        
        return true;
      });

    // Sort by current caseload (load balancing)
    availableProfessionals.sort((a, b) => a.currentCaseload - b.currentCaseload);

    return availableProfessionals[0] || null;
  }

  private async notifyProfessional(
    professional: HumanProfessional,
    request: OversightRequest
  ): Promise<void> {
    // Send notification based on priority
    const notification = {
      to: professional.id,
      type: 'oversight_assignment',
      priority: request.priority,
      request: request,
      timestamp: new Date()
    };

    // In production, this would send actual notifications
    this.emit('professional-notified', notification);

    // Log notification
    console.log(`Notified ${professional.name} about request ${request.id}`);
  }

  private async sendImmediateAlert(request: OversightRequest): Promise<void> {
    // Send immediate alerts for critical situations
    const alert = {
      type: 'immediate_oversight',
      request: request,
      timestamp: new Date(),
      channels: ['pager', 'phone', 'app']
    };

    // Notify all on-call professionals
    const onCallProfessionals = Array.from(this.professionals.values())
      .filter(p => p.availability.status === 'on_call');

    for (const professional of onCallProfessionals) {
      await this.notifyProfessional(professional, request);
    }

    this.emit('immediate-alert-sent', alert);
  }

  private async escalateToSupervisor(request: OversightRequest): Promise<void> {
    request.status = 'escalated';
    
    // Find clinical supervisor
    const supervisor = Array.from(this.professionals.values())
      .find(p => p.role === 'clinical_supervisor');

    if (supervisor) {
      request.assignedTo = supervisor.id;
      await this.notifyProfessional(supervisor, request);
    }

    this.emit('request-escalated', request);
  }

  public async resolveRequest(
    requestId: string,
    resolution: OversightResolution
  ): Promise<void> {
    const request = this.oversightRequests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = 'resolved';
    request.resolution = resolution;
    
    // Update professional's caseload
    if (request.assignedTo) {
      const professional = this.professionals.get(request.assignedTo);
      if (professional) {
        professional.currentCaseload--;
      }
    }

    // Update metrics
    this.metrics.pendingRequests--;
    const responseTime = resolution.resolvedAt.getTime() - request.timestamp.getTime();
    this.updateAverageResponseTime(responseTime);

    this.emit('request-resolved', { request, resolution });

    // Schedule follow-up if needed
    if (resolution.followUp) {
      await this.scheduleFollowUp(request, resolution.followUp);
    }
  }

  private updateAverageResponseTime(newResponseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    const currentAverage = this.metrics.averageResponseTime;
    
    this.metrics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + newResponseTime) / totalRequests;
  }

  private async scheduleFollowUp(
    request: OversightRequest,
    followUp: FollowUpAction
  ): Promise<void> {
    // Create follow-up task
    const followUpTask = {
      originalRequest: request.id,
      type: followUp.type,
      timeline: followUp.timeline,
      assignedTo: followUp.assignedTo,
      createdAt: new Date()
    };

    this.emit('follow-up-scheduled', followUpTask);
  }

  private checkTimeoutEscalations(): void {
    const now = new Date();
    
    for (const request of this.assignmentQueue) {
      const criteria = this.escalationCriteria.find(c => 
        c.riskLevel === request.context?.riskLevel
      );
      
      if (criteria) {
        const timeElapsed = (now.getTime() - request.timestamp.getTime()) / (60 * 1000);
        
        if (timeElapsed > criteria.timeoutMinutes) {
          // Escalate due to timeout
          this.escalateToSupervisor(request);
        }
      }
    }
  }

  private updateMetrics(): void {
    const resolved = Array.from(this.oversightRequests.values())
      .filter(r => r.status === 'resolved').length;
    
    const escalated = Array.from(this.oversightRequests.values())
      .filter(r => r.status === 'escalated').length;
    
    this.metrics.resolutionRate = 
      this.metrics.totalRequests > 0 
        ? (resolved / this.metrics.totalRequests) * 100
        : 0;
    
    this.metrics.escalationRate = 
      this.metrics.totalRequests > 0
        ? (escalated / this.metrics.totalRequests) * 100
        : 0;

    // Update professional utilization
    for (const professional of this.professionals.values()) {
      const utilization = 
        professional.maxCaseload > 0
          ? (professional.currentCaseload / professional.maxCaseload) * 100
          : 0;
      
      this.metrics.professionalUtilization.set(professional.id, utilization);
    }

    this.emit('metrics-updated', this.metrics);
  }

  public async registerProfessional(professional: HumanProfessional): Promise<void> {
    this.professionals.set(professional.id, professional);
    this.emit('professional-registered', professional);
    
    // Process any pending requests that match this professional
    await this.processQueueForProfessional(professional);
  }

  private async processQueueForProfessional(
    professional: HumanProfessional
  ): Promise<void> {
    const matchingRequests = this.assignmentQueue.filter(request => {
      // Check if this professional can handle the request
      const userLanguage = request.context?.language || 'en';
      return professional.languages.includes(userLanguage) &&
             professional.currentCaseload < professional.maxCaseload;
    });

    for (const request of matchingRequests) {
      await this.assignRequest(request);
    }
  }

  public async updateProfessionalAvailability(
    professionalId: string,
    availability: AvailabilityStatus
  ): Promise<void> {
    const professional = this.professionals.get(professionalId);
    if (!professional) {
      throw new Error(`Professional ${professionalId} not found`);
    }

    professional.availability = availability;
    
    if (availability.status === 'available') {
      // Process queue when professional becomes available
      await this.processQueueForProfessional(professional);
    }

    this.emit('availability-updated', { professional, availability });
  }

  public async notifyCrisis(data: any): Promise<void> {
    await this.requestOversight({
      type: 'crisis_escalation',
      priority: 'immediate',
      userId: data.userId,
      sessionId: data.sessionId,
      reason: 'Crisis detected by AI system',
      context: data
    });
  }

  public async notifyViolation(violation: any): Promise<void> {
    const priority = violation.severity === 'critical' ? 'high' : 'medium';
    
    await this.requestOversight({
      type: 'ethical_violation',
      priority,
      userId: violation.userId,
      sessionId: violation.sessionId,
      reason: `Ethical violation: ${violation.type}`,
      context: violation
    });
  }

  public getMetrics(): OversightMetrics {
    return { ...this.metrics };
  }

  public getPendingRequests(): OversightRequest[] {
    return Array.from(this.oversightRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'assigned');
  }

  public getRequestById(requestId: string): OversightRequest | undefined {
    return this.oversightRequests.get(requestId);
  }

  public getProfessionals(): HumanProfessional[] {
    return Array.from(this.professionals.values());
  }

  public async generateReport(params: {
    startDate: Date;
    endDate: Date;
    professionalId?: string;
  }): Promise<any> {
    const requests = Array.from(this.oversightRequests.values())
      .filter(r => {
        const inDateRange = r.timestamp >= params.startDate && 
                           r.timestamp <= params.endDate;
        const matchesProfessional = !params.professionalId || 
                                   r.assignedTo === params.professionalId;
        return inDateRange && matchesProfessional;
      });

    const report = {
      period: { start: params.startDate, end: params.endDate },
      totalRequests: requests.length,
      byType: this.groupByType(requests),
      byPriority: this.groupByPriority(requests),
      byStatus: this.groupByStatus(requests),
      averageResponseTime: this.calculateAverageResponseTime(requests),
      resolutionRate: this.calculateResolutionRate(requests),
      professionalPerformance: params.professionalId 
        ? this.getProfessionalPerformance(params.professionalId, requests)
        : undefined
    };

    return report;
  }

  private groupByType(requests: OversightRequest[]): Record<OversightType, number> {
    const grouped: Partial<Record<OversightType, number>> = {};
    
    for (const request of requests) {
      grouped[request.type] = (grouped[request.type] || 0) + 1;
    }
    
    return grouped as Record<OversightType, number>;
  }

  private groupByPriority(
    requests: OversightRequest[]
  ): Record<OversightRequest['priority'], number> {
    const grouped: Partial<Record<OversightRequest['priority'], number>> = {};
    
    for (const request of requests) {
      grouped[request.priority] = (grouped[request.priority] || 0) + 1;
    }
    
    return grouped as Record<OversightRequest['priority'], number>;
  }

  private groupByStatus(
    requests: OversightRequest[]
  ): Record<OversightStatus, number> {
    const grouped: Partial<Record<OversightStatus, number>> = {};
    
    for (const request of requests) {
      grouped[request.status] = (grouped[request.status] || 0) + 1;
    }
    
    return grouped as Record<OversightStatus, number>;
  }

  private calculateAverageResponseTime(requests: OversightRequest[]): number {
    const resolved = requests.filter(r => r.resolution);
    if (resolved.length === 0) return 0;
    
    const totalTime = resolved.reduce((sum, r) => {
      const responseTime = r.resolution!.resolvedAt.getTime() - r.timestamp.getTime();
      return sum + responseTime;
    }, 0);
    
    return totalTime / resolved.length;
  }

  private calculateResolutionRate(requests: OversightRequest[]): number {
    if (requests.length === 0) return 0;
    
    const resolved = requests.filter(r => r.status === 'resolved').length;
    return (resolved / requests.length) * 100;
  }

  private getProfessionalPerformance(
    professionalId: string,
    requests: OversightRequest[]
  ): any {
    const assignedRequests = requests.filter(r => r.assignedTo === professionalId);
    const resolvedRequests = assignedRequests.filter(r => r.resolution);
    
    return {
      totalAssigned: assignedRequests.length,
      totalResolved: resolvedRequests.length,
      averageResponseTime: this.calculateAverageResponseTime(resolvedRequests),
      resolutionRate: this.calculateResolutionRate(assignedRequests),
      byResolutionAction: this.groupByResolutionAction(resolvedRequests)
    };
  }

  private groupByResolutionAction(
    requests: OversightRequest[]
  ): Record<ResolutionAction, number> {
    const grouped: Partial<Record<ResolutionAction, number>> = {};
    
    for (const request of requests) {
      if (request.resolution) {
        const action = request.resolution.action;
        grouped[action] = (grouped[action] || 0) + 1;
      }
    }
    
    return grouped as Record<ResolutionAction, number>;
  }
}

export default HumanOversightManager;