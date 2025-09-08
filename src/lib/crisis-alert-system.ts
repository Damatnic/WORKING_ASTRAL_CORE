import { prisma } from './prisma';
import { WebSocketServer } from './websocket/server';
import { auditLog } from './audit-logger';

export interface CrisisAlert {
  id: string;
  userId: string;
  reportId?: string;
  type: 'self_harm' | 'suicide_ideation' | 'substance_abuse' | 'domestic_violence' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  contactInfo?: string;
  isActive: boolean;
  assignedCounselorId?: string;
  responseTime?: number;
  escalationLevel: number;
  metadata?: {
    keywordTriggers?: string[];
    confidenceScore?: number;
    sources?: string[];
    relatedReports?: string[];
  };
  createdAt: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
}

export class CrisisAlertSystem {
  private webSocketServer: WebSocketServer;
  
  constructor(webSocketServer: WebSocketServer) {
    this.webSocketServer = webSocketServer;
  }

  async triggerAlert(alertData: Omit<CrisisAlert, 'id' | 'createdAt' | 'isActive' | 'escalationLevel'>): Promise<CrisisAlert> {
    try {
      // Create crisis alert in database
      const alert = await (prisma as any).crisisAlert.create({
        data: {
          userId: alertData.userId,
          reportId: alertData.reportId,
          type: alertData.type,
          severity: alertData.severity,
          description: alertData.description,
          location: alertData.location,
          contactInfo: alertData.contactInfo,
          isActive: true,
          escalationLevel: 1,
          metadata: alertData.metadata as any,
          createdAt: new Date()
        }
      });

      // Auto-assign to available crisis counselor
      const assignedCounselor = await this.assignToCounselor(alert.id);
      if (assignedCounselor) {
        await (prisma as any).crisisAlert.update({
          where: { id: alert.id },
          data: { assignedCounselorId: assignedCounselor.id }
        });
      }

      // Broadcast alert to all crisis counselors via WebSocket
      await this.broadcastAlert(alert);

      // Create crisis report if not exists
      if (!alertData.reportId) {
        await this.createCrisisReport(alert);
      }

      // Audit log
      await auditLog({
        userId: alertData.userId,
        userEmail: 'system',
        action: 'crisis_alert_triggered',
        resource: 'crisis_alert',
        details: {
          alertId: alert.id,
          type: alertData.type,
          severity: alertData.severity,
          assignedCounselor: assignedCounselor?.id
        }
      });

      // Schedule escalation if not responded within time limit
      this.scheduleEscalation(alert.id);

      return alert as CrisisAlert;
    } catch (error) {
      console.error('Failed to trigger crisis alert:', error);
      throw error;
    }
  }

  private async assignToCounselor(alertId: string) {
    try {
      // Find available crisis counselors (online and not overloaded)
      const availableCounselors = await prisma.user.findMany({
        where: {
          role: 'CRISIS_COUNSELOR',
          isActive: true,
          lastLoginAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Active in last 15 minutes
          }
        },
        include: {
          assignedCrisisReports: {
            where: {
              status: { in: ['OPEN', 'IN_PROGRESS'] }
            }
          }
        }
      });

      // Sort by workload (least busy first)
      const sortedCounselors = availableCounselors
        .sort((a, b) => (a as any).assignedCrisisReports.length - (b as any).assignedCrisisReports.length)
        .filter(counselor => (counselor as any).assignedCrisisReports.length < 5); // Max 5 active cases

      return sortedCounselors[0] || null;
    } catch (error) {
      console.error('Failed to assign counselor:', error);
      return null;
    }
  }

  private async broadcastAlert(alert: any) {
    try {
      // Get all online crisis counselors and supervisors
      const recipients = await prisma.user.findMany({
        where: {
          role: { in: ['CRISIS_COUNSELOR', 'ADMIN'] },
          isActive: true
        }
      });

      // Broadcast via WebSocket to each recipient
      for (const recipient of recipients) {
        (this as any).webSocketServer.sendToUser(recipient.id, {
          id: crypto.randomUUID(),
          type: 'crisis_alert',
          from: 'system',
          to: recipient.id,
          content: alert.description,
          priority: alert.severity === 'critical' ? 'urgent' : 'high',
          timestamp: new Date(),
          data: {
            alertId: alert.id,
            userId: alert.userId,
            type: alert.type,
            severity: alert.severity,
            location: alert.location,
            contactInfo: alert.contactInfo,
            assignedCounselorId: alert.assignedCounselorId,
            actionRequired: true,
            escalationLevel: alert.escalationLevel
          }
        });
      }

      // Also send push notifications (if implemented)
      await this.sendPushNotifications(alert, recipients);
    } catch (error) {
      console.error('Failed to broadcast crisis alert:', error);
    }
  }

  private async createCrisisReport(alert: any) {
    try {
      const report = await prisma.crisisReport.create({
        data: {
          userId: alert.userId,
          
          description: alert.description,
          severity: alert.severity,
          location: alert.location,
          contactInfo: alert.contactInfo,
          status: 'OPEN',
          assignedCounselorId: alert.assignedCounselorId,
          riskLevel: alert.severity,
          metadata: {
            alertId: alert.id,
            autoGenerated: true,
            ...alert.metadata
          }
        }
      });

      // Update alert with report ID
      await (prisma as any).crisisAlert.update({
        where: { id: alert.id },
        data: { reportId: report.id }
      });

      return report;
    } catch (error) {
      console.error('Failed to create crisis report:', error);
    }
  }

  private scheduleEscalation(alertId: string) {
    // Critical alerts: 2 minutes
    // High alerts: 5 minutes
    // Medium alerts: 10 minutes
    // Low alerts: 30 minutes
    
    setTimeout(async () => {
      try {
        const alert = await (prisma as any).crisisAlert.findUnique({
          where: { id: alertId }
        });

        if (!alert || !alert.isActive || alert.respondedAt) {
          return; // Alert resolved or already responded
        }

        // Escalate the alert
        await this.escalateAlert(alertId);
      } catch (error) {
        console.error('Failed to escalate alert:', error);
      }
    }, this.getEscalationDelay(alertId));
  }

  private getEscalationDelay(alertId: string): number {
    // In a real implementation, you'd fetch the alert severity
    // For now, default to 5 minutes
    return 5 * 60 * 1000; // 5 minutes
  }

  private async escalateAlert(alertId: string) {
    try {
      const alert = await (prisma as any).crisisAlert.findUnique({
        where: { id: alertId }
      });

      if (!alert || !alert.isActive) return;

      // Increase escalation level
      const newEscalationLevel = alert.escalationLevel + 1;
      
      await (prisma as any).crisisAlert.update({
        where: { id: alertId },
        data: { 
          escalationLevel: newEscalationLevel,
          severity: newEscalationLevel >= 3 ? 'CRITICAL' : alert.severity
        }
      });

      // Notify supervisors and additional counselors
      const supervisors = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPERVISOR'] },
          isActive: true
        }
      });

      for (const supervisor of supervisors) {
        (this as any).webSocketServer.sendToUser(supervisor.id, {
          id: crypto.randomUUID(),
          type: 'crisis_alert',
          from: 'system',
          to: supervisor.id,
          content: `ESCALATED: Crisis alert ${alertId} requires immediate attention`,
          priority: 'urgent',
          timestamp: new Date(),
          data: {
            alertId,
            escalated: true,
            escalationLevel: newEscalationLevel,
            originalSeverity: alert.severity
          }
        });
      }

      // Schedule next escalation if needed
      if (newEscalationLevel < 5) {
        this.scheduleEscalation(alertId);
      }

      // Audit escalation
      await auditLog({
        userId: 'system',
        userEmail: 'system',
        action: 'crisis_alert_escalated',
        resource: 'crisis_alert',
        details: {
          alertId,
          escalationLevel: newEscalationLevel,
          previousLevel: alert.escalationLevel
        }
      });
    } catch (error) {
      console.error('Failed to escalate alert:', error);
    }
  }

  async respondToAlert(alertId: string, counselorId: string, responseType: 'acknowledge' | 'accept' | 'transfer'): Promise<void> {
    try {
      const updateData: any = {
        respondedAt: new Date(),
        responseTime: Date.now() - (await (prisma as any).crisisAlert.findUnique({ where: { id: alertId } }))!.createdAt.getTime()
      };

      if (responseType === 'accept') {
        updateData.assignedCounselorId = counselorId;
      }

      await (prisma as any).crisisAlert.update({
        where: { id: alertId },
        data: updateData
      });

      // Notify other counselors that alert has been responded to
      const otherCounselors = await prisma.user.findMany({
        where: {
          role: 'CRISIS_COUNSELOR',
          id: { not: counselorId },
          isActive: true
        }
      });

      for (const counselor of otherCounselors) {
        (this as any).webSocketServer.sendToUser(counselor.id, {
          id: crypto.randomUUID(),
          type: 'crisis_alert',
          from: 'system',
          to: counselor.id,
          content: `Crisis alert ${alertId} has been ${responseType}d by another counselor`,
          priority: 'medium',
          timestamp: new Date(),
          data: {
            alertId,
            responseType,
            respondedBy: counselorId,
            status: 'responded'
          }
        });
      }

      // Audit response
      await auditLog({
        userId: counselorId,
        userEmail: 'counselor',
        action: 'crisis_alert_responded',
        resource: 'crisis_alert',
        details: {
          alertId,
          responseType,
          responseTime: updateData.responseTime
        }
      });
    } catch (error) {
      console.error('Failed to respond to alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string, counselorId: string, resolution: string): Promise<void> {
    try {
      await (prisma as any).crisisAlert.update({
        where: { id: alertId },
        data: {
          isActive: false,
          resolvedAt: new Date()
        }
      });

      // Update related crisis report
      const alert = await (prisma as any).crisisAlert.findUnique({
        where: { id: alertId }
      });

      if (alert?.reportId) {
        await prisma.crisisReport.update({
          where: { id: alert.reportId },
          data: {
            
            resolvedAt: new Date(),
            resolution
          }
        });
      }

      // Audit resolution
      await auditLog({
        userId: counselorId,
        userEmail: 'counselor',
        action: 'crisis_alert_resolved',
        resource: 'crisis_alert',
        details: {
          alertId,
          resolution,
          reportId: alert?.reportId
        }
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  private async sendPushNotifications(alert: any, recipients: any[]) {
    // Placeholder for push notification implementation
    // Would integrate with service like Firebase Cloud Messaging, OneSignal, etc.
    console.log(`Would send push notifications for crisis alert ${alert.id} to ${recipients.length} recipients`);
  }

  // AI-powered crisis detection from messages/posts
  async analyzePotentialCrisis(content: string, userId: string, source: 'message' | 'post' | 'journal'): Promise<void> {
    try {
      // Simple keyword detection (in production, would use AI/ML)
      const crisisKeywords = {
        suicide: ['suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead'],
        selfHarm: ['cut myself', 'hurt myself', 'self harm', 'cutting', 'burning myself'],
        substance: ['overdose', 'too many pills', 'drink myself', 'getting high to forget'],
        violence: ['hurt me', 'threatens me', 'hits me', 'abusive', 'scared for my life']
      };

      let detectedType: CrisisAlert['type'] | null = null;
      const keywordMatches: string[] = [];
      let confidenceScore = 0;

      for (const [type, keywords] of Object.entries(crisisKeywords)) {
        for (const keyword of keywords) {
          if (content.toLowerCase().includes(keyword)) {
            detectedType = type as CrisisAlert['type'];
            keywordMatches.push(keyword);
            confidenceScore += 0.2;
          }
        }
      }

      // Trigger alert if crisis detected with sufficient confidence
      if (detectedType && confidenceScore >= 0.4) {
        await this.triggerAlert({
          userId,
          type: detectedType,
          severity: confidenceScore >= 0.8 ? 'critical' : 'high',
          description: `Potential crisis detected in ${source}: ${content.substring(0, 200)}...`,
          metadata: {
            keywordTriggers: keywordMatches,
            confidenceScore,
            sources: [source],
            
          }
        });
      }
    } catch (error) {
      console.error('Failed to analyze potential crisis:', error);
    }
  }
}