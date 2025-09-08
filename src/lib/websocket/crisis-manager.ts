/**
 * Crisis Manager
 * Handles crisis detection, alerting, and counselor coordination
 */

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  CrisisEvent,
  CrisisAlert,
  CrisisAlertPayload,
  CrisisSeverity,
  CrisisStatus,
  CrisisTrigger,
  NotificationPriority,
} from "./events";
// Interface to avoid circular dependency with WebSocketServer
interface WebSocketServerInterface {
  sendNotification(userId: string, notification: any): void;
  broadcastCrisisAlert(alert: any): void;
  getIO(): any;
  isUserOnline(userId: string): boolean;
}

// Crisis keywords for detection
const CRISIS_KEYWORDS = {
  critical: [
    "suicide", "kill myself", "end it all", "can't go on", "want to die",
    "better off dead", "no point living", "ending my life", "overdose",
    "self harm", "cutting", "hurting myself"
  ],
  high: [
    "hopeless", "worthless", "can't take it", "giving up", "no way out",
    "trapped", "unbearable", "can't cope", "breaking down", "falling apart",
    "panic attack", "can't breathe", "losing control"
  ],
  medium: [
    "depressed", "anxious", "scared", "alone", "isolated", "struggling",
    "overwhelmed", "stressed", "crying", "can't sleep", "nightmares",
    "flashback", "triggered"
  ],
};

// Crisis response templates
const CRISIS_RESPONSES = {
  immediate: {
    message: "I can see you're going through something really difficult right now. Your safety is our top priority.",
    actions: ["Connect with crisis counselor", "Show crisis resources", "Activate safety plan"],
  },
  urgent: {
    message: "It sounds like you're experiencing a lot of distress. Let's get you some immediate support.",
    actions: ["Priority counselor queue", "Share coping strategies", "Check safety plan"],
  },
  moderate: {
    message: "I hear that you're struggling. You don't have to go through this alone.",
    actions: ["Offer support resources", "Suggest coping techniques", "Schedule check-in"],
  },
};

export class CrisisManager {
  private server: WebSocketServerInterface;
  private activeAlerts: Map<string, CrisisAlert> = new Map();
  private counselorQueue: Map<string, Set<string>> = new Map(); // counselorId -> Set of alertIds
  private availableCounselors: Set<string> = new Set();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: WebSocketServerInterface) {
    this.server = server;
    this.initializeCounselors();
  }

  // Initialize available counselors from database
  private async initializeCounselors(): Promise<void> {
    try {
      const counselors = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.CRISIS_COUNSELOR, UserRole.THERAPIST, UserRole.ADMIN],
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      // Check which counselors are online
      counselors.forEach(counselor => {
        if (this.server.isUserOnline(counselor.id)) {
          this.availableCounselors.add(counselor.id);
        }
      });

      console.log(`Initialized with ${this.availableCounselors.size} available counselors`);
    } catch (error) {
      console.error("Failed to initialize counselors:", error);
    }
  }

  // Create a new crisis alert
  public async createAlert(
    userId: string,
    payload: CrisisAlertPayload
  ): Promise<CrisisAlert> {
    const alertId = this.generateAlertId();
    
    const alert: CrisisAlert = {
      id: alertId,
      userId,
      severity: payload.severity,
      status: CrisisStatus.PENDING,
      message: payload.message,
      triggers: payload.triggers || [],
      location: (payload as any).location,
      
      timestamp: new Date(),
      assignedCounselors: [],
      resolvedAt: null,
      notes: [],
      interventions: [],
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);

    // Save to database
    await this.saveAlertToDatabase(alert);

    // Broadcast to counselors
    this.server.broadcastCrisisAlert(alert);

    // Auto-assign if critical
    if (alert.severity === CrisisSeverity.CRITICAL) {
      await this.autoAssignCounselor(alert);
      this.startEscalationTimer(alert);
    }

    // Send immediate response to user
    this.sendImmediateResponse(userId, alert.severity);

    // Log the alert
    await this.logCrisisEvent(userId, "crisis_alert_created", alert);

    return alert;
  }

  // Handle potential crisis detected in message content
  public async handlePotentialCrisis(
    userId: string,
    triggers: CrisisTrigger
  ): Promise<void> {
    // Check if user already has active alert
    const existingAlert = this.getUserActiveAlert(userId);
    if (existingAlert) {
      // Update existing alert
      await this.updateAlertSeverity(existingAlert, triggers);
      return;
    }

    // Determine severity based on triggers
    const severity = this.determineSeverity(triggers);
    
    if (severity === (CrisisSeverity as any).NONE) {
      return;
    }

    // Create automated alert
    const alert = await this.createAlert(userId, {
      severity,
      message: "Crisis indicators detected in user communication",
      triggers: triggers.keywords,
      
    });

    // Notify user support is available
    this.server.sendNotification(userId, {
      id: this.generateNotificationId(),
      type: "crisis_support" as any,
      title: "Support Available",
      message: "We noticed you might be going through a difficult time. Support is available if you need it.",
      priority: NotificationPriority.HIGH,
      timestamp: new Date(),
      actionUrl: "/crisis/support",
      actionLabel: "Get Help Now",
    });
  }

  // Request crisis help
  public async requestHelp(
    userId: string,
    data: { message: string; severity: CrisisSeverity }
  ): Promise<any> {
    // Create or update alert
    const existingAlert = this.getUserActiveAlert(userId);
    
    if (existingAlert) {
      // Update existing alert
      existingAlert.message = data.message;
      existingAlert.severity = data.severity;
      existingAlert.status = (CrisisStatus as any).ACTIVE;
      
      await this.updateAlert(existingAlert);
      return existingAlert;
    }

    // Create new help request
    const alert = await this.createAlert(userId, {
      severity: data.severity,
      message: data.message,
      
    });

    // Immediately assign counselor for help requests
    await this.autoAssignCounselor(alert);

    return alert;
  }

  // Auto-assign counselor to alert
  private async autoAssignCounselor(alert: CrisisAlert): Promise<void> {
    // Find available counselor with least load
    let selectedCounselor: string | null = null;
    let minLoad = Infinity;

    for (const counselorId of this.availableCounselors) {
      const load = this.counselorQueue.get(counselorId)?.size || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedCounselor = counselorId;
      }
    }

    if (selectedCounselor) {
      await this.assignCounselor(alert.id, selectedCounselor);
    } else {
      // No counselors available - escalate
      await this.escalateAlert(alert);
    }
  }

  // Assign counselor to alert
  public async assignCounselor(
    alertId: string,
    counselorId: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.assignedCounselors = [counselorId];
    alert.status = CrisisStatus.ASSIGNED;

    // Update counselor queue
    if (!this.counselorQueue.has(counselorId)) {
      this.counselorQueue.set(counselorId, new Set());
    }
    this.counselorQueue.get(counselorId)!.add(alertId);

    // Update database
    await this.updateAlertInDatabase(alert);

    // Notify counselor
    this.server.sendNotification(counselorId, {
      id: this.generateNotificationId(),
      type: "crisis_assignment" as any,
      title: "Crisis Alert Assigned",
      message: `You have been assigned to a ${alert.severity} severity crisis alert`,
      priority: NotificationPriority.URGENT,
      timestamp: new Date(),
      actionUrl: `/crisis/alert/${alertId}`,
      actionLabel: "View Alert",
      metadata: { alertId },
    });

    // Notify user
    this.server.sendNotification(alert.userId, {
      id: this.generateNotificationId(),
      type: "counselor_assigned" as any,
      title: "Counselor Assigned",
      message: "A crisis counselor has been assigned to help you",
      priority: NotificationPriority.HIGH,
      timestamp: new Date(),
    });

    // Broadcast assignment
    this.server.getIO().emit((CrisisEvent as any).COUNSELOR_ASSIGNED, {
      alertId,
      counselorId,
      timestamp: new Date(),
    });

    // Cancel escalation timer
    this.cancelEscalationTimer(alertId);
  }

  // Update counselor availability
  public updateCounselorAvailability(
    counselorId: string,
    available: boolean
  ): void {
    if (available) {
      this.availableCounselors.add(counselorId);
      
      // Check for pending alerts to assign
      this.assignPendingAlerts();
    } else {
      this.availableCounselors.delete(counselorId);
      
      // Reassign counselor's active alerts
      const alerts = this.counselorQueue.get(counselorId);
      if (alerts) {
        alerts.forEach(alertId => {
          const alert = this.activeAlerts.get(alertId);
          if (alert) {
            this.autoAssignCounselor(alert);
          }
        });
        this.counselorQueue.delete(counselorId);
      }
    }
  }

  // Escalate alert
  private async escalateAlert(alert: CrisisAlert): Promise<void> {
    alert.status = CrisisStatus.ESCALATED;
    
    // Update database
    await this.updateAlertInDatabase(alert);

    // Notify all admins and senior counselors
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
      },
      select: { id: true },
    });

    admins.forEach(admin => {
      this.server.sendNotification(admin.id, {
        id: this.generateNotificationId(),
        type: "crisis_escalation" as any,
        title: "URGENT: Crisis Escalation",
        message: `Critical crisis alert requires immediate attention`,
        priority: "urgent",
        timestamp: new Date(),
        actionUrl: `/crisis/alert/${alert.id}`,
        actionLabel: "Respond Now",
        metadata: { alertId: alert.id },
      });
    });

    // Broadcast escalation
    this.server.getIO().emit(CrisisEvent.ESCALATED, {
      alertId: alert.id,
      severity: alert.severity,
      timestamp: new Date(),
    });

    // Send emergency protocols if critical
    if (alert.severity === CrisisSeverity.CRITICAL) {
      await this.activateEmergencyProtocol(alert);
    }
  }

  // Activate emergency protocol
  private async activateEmergencyProtocol(alert: CrisisAlert): Promise<void> {
    // Log emergency activation
    await this.logCrisisEvent(alert.userId, "emergency_protocol_activated", alert);

    // Check if we have emergency contact information
    const user = await prisma.user.findUnique({
      where: { id: alert.userId },
      include: {
        UserProfile: {
          include: {
            
          },
        },
      },
    });

    if ((user as any)?.UserProfile?.EmergencyContacts?.length) {
      // Notify emergency contacts (implement based on contact preferences)
      for (const contact of (user as any).UserProfile.EmergencyContacts) {
        if (contact.notifyInCrisis) {
          // Send notification to emergency contact
          console.log(`Notifying emergency contact: ${contact.name}`);
        }
      }
    }

    // Activate user's safety plan if exists
    const safetyPlan = await prisma.safetyPlan.findFirst({
      where: {
        userId: alert.userId,
        isActive: true,
      },
    });

    if (safetyPlan) {
      // Send safety plan to user
      this.server.sendNotification(alert.userId, {
        id: this.generateNotificationId(),
        type: "safety_plan_activated" as any,
        title: "Your Safety Plan",
        message: "Your safety plan has been activated. Follow the steps you've prepared.",
        priority: "urgent",
        timestamp: new Date(),
        actionUrl: "/wellness/safety-plan",
        actionLabel: "View Safety Plan",
        metadata: { safetyPlanId: safetyPlan.id },
      });
    }
  }

  // Resolve alert
  public async resolveAlert(
    alertId: string,
    counselorId: string,
    notes: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = CrisisStatus.RESOLVED;
    (alert as any).resolvedAt = new Date();
    (alert as any).notesEncrypted.push({
      author: counselorId,
      content: notes,
      timestamp: new Date(),
    });

    // Update database
    await this.updateAlertInDatabase(alert);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Remove from counselor queue
    this.counselorQueue.get(counselorId)?.delete(alertId);

    // Cancel timers
    this.cancelEscalationTimer(alertId);

    // Notify user
    this.server.sendNotification(alert.userId, {
      id: this.generateNotificationId(),
      type: "crisis_resolved" as any,
      title: "Crisis Support Completed",
      message: "Your crisis support session has been completed. We're here if you need us again.",
      priority: "normal",
      timestamp: new Date(),
    });

    // Broadcast resolution
    this.server.getIO().emit((CrisisEvent as any).RESOLVED, {
      alertId,
      timestamp: new Date(),
    });

    // Log resolution
    await this.logCrisisEvent(alert.userId, "crisis_alert_resolved", alert);
  }

  // Helper methods
  private getUserActiveAlert(userId: string): CrisisAlert | null {
    for (const alert of this.activeAlerts.values()) {
      if (alert.userId === userId && alert.status !== CrisisStatus.RESOLVED) {
        return alert;
      }
    }
    return null;
  }

  private async updateAlertSeverity(
    alert: CrisisAlert,
    triggers: CrisisTrigger
  ): Promise<void> {
    const newSeverity = this.determineSeverity(triggers);
    
    if (newSeverity > alert.severity) {
      alert.severity = newSeverity;
      alert.triggers = [...alert.triggers, ...triggers.keywords];
      
      await this.updateAlertInDatabase(alert);
      
      // Re-escalate if needed
      if (newSeverity === CrisisSeverity.CRITICAL && (!alert.assignedCounselors || alert.assignedCounselors.length === 0)) {
        await this.escalateAlert(alert);
      }
    }
  }

  private determineSeverity(triggers: CrisisTrigger): CrisisSeverity {
    if (triggers.severity) {
      return triggers.severity;
    }

    // Analyze keywords to determine severity
    const keywords = triggers.keywords.map((k: any) => k.toLowerCase());
    
    for (const keyword of CRISIS_KEYWORDS.critical) {
      if (keywords.some(k => k.includes(keyword))) {
        return CrisisSeverity.CRITICAL;
      }
    }
    
    for (const keyword of CRISIS_KEYWORDS.high) {
      if (keywords.some(k => k.includes(keyword))) {
        return CrisisSeverity.HIGH;
      }
    }
    
    for (const keyword of CRISIS_KEYWORDS.medium) {
      if (keywords.some(k => k.includes(keyword))) {
        return CrisisSeverity.MEDIUM;
      }
    }
    
    return CrisisSeverity.LOW;
  }

  private sendImmediateResponse(userId: string, severity: CrisisSeverity): void {
    let response = CRISIS_RESPONSES.moderate;
    
    if (severity === CrisisSeverity.CRITICAL) {
      response = CRISIS_RESPONSES.immediate;
    } else if (severity === CrisisSeverity.HIGH) {
      response = CRISIS_RESPONSES.urgent;
    }

    this.server.sendNotification(userId, {
      id: this.generateNotificationId(),
      type: "crisis_response" as any,
      title: "We're Here to Help",
      message: response.message,
      priority: "urgent",
      timestamp: new Date(),
      actions: response.actions.map(action => ({
        label: action,
        url: this.getActionUrl(action),
      })),
    });
  }

  private getActionUrl(action: string): string {
    const actionMap: Record<string, string> = {
      "Connect with crisis counselor": "/crisis/chat",
      "Show crisis resources": "/crisis/resources",
      "Activate safety plan": "/wellness/safety-plan",
      "Priority counselor queue": "/crisis/priority-support",
      "Share coping strategies": "/wellness/coping-strategies",
      "Check safety plan": "/wellness/safety-plan",
      "Offer support resources": "/resources/support",
      "Suggest coping techniques": "/wellness/coping",
      "Schedule check-in": "/wellness/check-in",
    };
    
    return actionMap[action] || "/crisis";
  }

  private assignPendingAlerts(): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.status === CrisisStatus.PENDING && (!alert.assignedCounselors || alert.assignedCounselors.length === 0)) {
        this.autoAssignCounselor(alert);
      }
    }
  }

  private startEscalationTimer(alert: CrisisAlert): void {
    // Escalate if not handled within 2 minutes for critical alerts
    const timeout = alert.severity === CrisisSeverity.CRITICAL ? 120000 : 300000;
    
    const timer = setTimeout(() => {
      if (alert.status === CrisisStatus.PENDING) {
        this.escalateAlert(alert);
      }
    }, timeout);
    
    this.escalationTimers.set(alert.id, timer);
  }

  private cancelEscalationTimer(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private async updateAlert(alert: CrisisAlert): Promise<void> {
    await this.updateAlertInDatabase(alert);
    
    // Broadcast update
    this.server.getIO().emit((CrisisEvent as any).UPDATED, {
      alertId: alert.id,
      status: alert.status,
      severity: alert.severity,
      timestamp: new Date(),
    });
  }

  // Database operations
  private async saveAlertToDatabase(alert: CrisisAlert): Promise<void> {
    try {
      await prisma.safetyAlert.create({
        data: {
          id: alert.id,
          userId: alert.userId,
          severity: alert.severity,
          
          handled: false,
          metadata: {
            triggers: alert.triggers,
            location: alert.location,
            contactMethod: (alert as any).contactMethod,
            status: alert.status,
          },
        },
      });
    } catch (error) {
      console.error("Failed to save alert to database:", error);
    }
  }

  private async updateAlertInDatabase(alert: CrisisAlert): Promise<void> {
    try {
      await prisma.safetyAlert.update({
        where: { id: alert.id },
        data: {
          severity: alert.severity,
          
          handled: alert.status === CrisisStatus.RESOLVED,
          handledBy: alert.assignedCounselors?.[0] || null,
          handledAt: (alert as any).resolvedAt,
          metadata: {
            triggers: alert.triggers,
            location: alert.location,
            contactMethod: (alert as any).contactMethod,
            status: alert.status,
            notes: (alert as any).notesEncrypted,
            interventions: (alert as any).interventions,
          },
        },
      });
    } catch (error) {
      console.error("Failed to update alert in database:", error);
    }
  }

  private async logCrisisEvent(
    userId: string,
    action: string,
    alert: CrisisAlert
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource: "crisis_alert",
          resourceId: alert.id,
          details: {
            severity: alert.severity,
            status: alert.status,
            assignedCounselors: alert.assignedCounselors,
          },
          outcome: "success",
        },
      });
    } catch (error) {
      console.error("Failed to log crisis event:", error);
    }
  }

  // ID generators
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public cleanup(): void {
    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.clear();
    this.activeAlerts.clear();
    this.counselorQueue.clear();
    this.availableCounselors.clear();
  }
}