/**
 * Alert Manager
 * Comprehensive alerting system with thresholds, routing, and escalation
 */

import { EventEmitter } from 'events';
import { getMonitoringConfig, MonitoringConfig } from './config';
import nodemailer from 'nodemailer';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical' | 'crisis';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  source: string;
  timestamp: number;
  resolvedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  escalationLevel: number;
  lastEscalatedAt?: number;
  suppressedUntil?: number;
  metadata: Record<string, any>;
  fingerprint: string; // For deduplication
  
  // Crisis-specific fields
  isCrisis?: boolean;
  userId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  interventionRequired?: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  cooldown: number; // Minimum time between alerts of this type
  channels: NotificationChannel[];
  escalation?: EscalationPolicy;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'regex';
  threshold: number | string;
  timeWindow?: number; // Time window to evaluate condition
  minDataPoints?: number; // Minimum data points required
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  maxEscalations: number;
}

export interface EscalationLevel {
  level: number;
  delay: number; // Time to wait before escalating (ms)
  channels: NotificationChannel[];
  requiresAcknowledgment: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  averageResolutionTime: number;
  escalationRate: number;
}

class AlertManager extends EventEmitter {
  private config: MonitoringConfig;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private suppressionRules: Map<string, number> = new Map(); // fingerprint -> until timestamp
  private lastAlertTime: Map<string, number> = new Map(); // type -> timestamp
  private escalationTimers: Map<string, NodeJS.Timer> = new Map();
  private emailTransporter: any;

  constructor() {
    super();
    this.config = getMonitoringConfig();
    this.initializeEmailTransporter();
    this.initializeDefaultRules();
    this.startCleanupTimer();
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter(): void {
    if (this.config.notifications.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.notifications.email.smtp.host,
          port: this.config.notifications.email.smtp.port,
          secure: this.config.notifications.email.smtp.secure,
          auth: {
            user: this.config.notifications.email.smtp.auth.user,
            pass: this.config.notifications.email.smtp.auth.pass,
          },
        });
      } catch (error) {
        console.error('Failed to initialize email transporter:', error);
      }
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High memory usage alert
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      enabled: true,
      conditions: [{
        metric: 'memory_percentage',
        operator: 'gt',
        threshold: this.config.performance.memoryThreshold,
        timeWindow: 300000, // 5 minutes
        minDataPoints: 3,
      }],
      severity: 'warning',
      cooldown: 300000, // 5 minutes
      channels: [
        { type: 'email', config: {}, enabled: true },
        { type: 'slack', config: {}, enabled: true },
      ],
    });

    // High CPU usage alert
    this.addRule({
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      enabled: true,
      conditions: [{
        metric: 'cpu_percentage',
        operator: 'gt',
        threshold: this.config.performance.cpuThreshold,
        timeWindow: 300000,
        minDataPoints: 3,
      }],
      severity: 'warning',
      cooldown: 300000,
      channels: [
        { type: 'email', config: {}, enabled: true },
        { type: 'slack', config: {}, enabled: true },
      ],
    });

    // Slow response time alert
    this.addRule({
      id: 'slow_response_time',
      name: 'Slow Response Time',
      enabled: true,
      conditions: [{
        metric: 'response_time_avg',
        operator: 'gt',
        threshold: this.config.performance.responseTimeThreshold,
        timeWindow: 600000, // 10 minutes
        minDataPoints: 5,
      }],
      severity: 'warning',
      cooldown: 600000,
      channels: [
        { type: 'email', config: {}, enabled: true },
        { type: 'slack', config: {}, enabled: true },
      ],
    });

    // High error rate alert
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      enabled: true,
      conditions: [{
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.05, // 5%
        timeWindow: 300000,
        minDataPoints: 10,
      }],
      severity: 'error',
      cooldown: 300000,
      channels: [
        { type: 'email', config: {}, enabled: true },
        { type: 'slack', config: {}, enabled: true },
      ],
      escalation: {
        enabled: true,
        levels: [
          {
            level: 1,
            delay: 900000, // 15 minutes
            channels: [{ type: 'email', config: { to: 'oncall@astralcore.com' }, enabled: true }],
            requiresAcknowledgment: true,
          },
        ],
        maxEscalations: 1,
      },
    });

    // Database connectivity alert
    this.addRule({
      id: 'database_down',
      name: 'Database Connection Failed',
      enabled: true,
      conditions: [{
        metric: 'database_status',
        operator: 'eq',
        threshold: 'unhealthy',
      }],
      severity: 'critical',
      cooldown: 60000, // 1 minute
      channels: [
        { type: 'email', config: {}, enabled: true },
        { type: 'slack', config: {}, enabled: true },
      ],
      escalation: {
        enabled: true,
        levels: [
          {
            level: 1,
            delay: 300000, // 5 minutes
            channels: [{ type: 'email', config: { to: 'oncall@astralcore.com' }, enabled: true }],
            requiresAcknowledgment: true,
          },
          {
            level: 2,
            delay: 900000, // 15 minutes
            channels: [{ type: 'sms', config: { to: '+1234567890' }, enabled: false }],
            requiresAcknowledgment: true,
          },
        ],
        maxEscalations: 2,
      },
    });

    // Crisis intervention alert (special handling)
    this.addRule({
      id: 'crisis_intervention',
      name: 'Crisis Intervention Required',
      enabled: true,
      conditions: [{
        metric: 'crisis_risk_level',
        operator: 'eq',
        threshold: 'critical',
      }],
      severity: 'crisis',
      cooldown: 0, // No cooldown for crisis alerts
      channels: [
        { type: 'email', config: { priority: 'high' }, enabled: true },
        { type: 'slack', config: { channel: '#crisis' }, enabled: true },
      ],
      escalation: {
        enabled: true,
        levels: [
          {
            level: 1,
            delay: 60000, // 1 minute
            channels: [
              { type: 'email', config: { to: 'crisis-team@astralcore.com' }, enabled: true },
              { type: 'sms', config: { to: '+1234567890' }, enabled: false },
            ],
            requiresAcknowledgment: true,
          },
        ],
        maxEscalations: 1,
      },
    });
  }

  /**
   * Add a new alert rule
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }

  /**
   * Remove an alert rule
   */
  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.emit('rule:removed', ruleId);
  }

  /**
   * Get all alert rules
   */
  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Create a new alert
   */
  public async createAlert(params: {
    type: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    source: string;
    metadata?: Record<string, any>;
    isCrisis?: boolean;
    userId?: string;
    riskLevel?: Alert['riskLevel'];
  }): Promise<Alert> {
    const alertId = this.generateAlertId();
    const fingerprint = this.generateFingerprint(params);
    
    // Check for suppression
    if (this.isAlertSuppressed(fingerprint)) {
      console.log(`Alert suppressed: ${params.type}`);
      return this.createSuppressedAlert(alertId, params, fingerprint);
    }

    // Check cooldown
    if (this.isInCooldown(params.type)) {
      console.log(`Alert in cooldown: ${params.type}`);
      return this.createSuppressedAlert(alertId, params, fingerprint);
    }

    const alert: Alert = {
      id: alertId,
      type: params.type,
      severity: params.severity,
      status: 'active',
      title: params.title,
      message: params.message,
      source: params.source,
      timestamp: Date.now(),
      escalationLevel: 0,
      metadata: params.metadata || {},
      fingerprint,
      isCrisis: params.isCrisis || params.severity === 'crisis',
      userId: params.userId,
      riskLevel: params.riskLevel,
      interventionRequired: params.isCrisis || params.severity === 'crisis',
    };

    this.alerts.set(alertId, alert);
    this.lastAlertTime.set(params.type, Date.now());

    // Send notifications
    await this.sendNotifications(alert);

    // Set up escalation if needed
    this.setupEscalation(alert);

    // Apply suppression rules
    if (this.config.alerts.suppression.enabled) {
      this.applySuppression(fingerprint);
    }

    this.emit('alert:created', alert);

    // Special handling for crisis alerts
    if (alert.isCrisis && this.config.alerts.crisis.enabled) {
      this.emit('alert:crisis', alert);
      await this.handleCrisisAlert(alert);
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;

    // Clear escalation timer
    this.clearEscalation(alertId);

    this.emit('alert:acknowledged', alert);
    return true;
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();

    // Clear escalation timer
    this.clearEscalation(alertId);

    // Send resolution notifications
    await this.sendResolutionNotifications(alert);

    this.emit('alert:resolved', alert);
    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active');
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alert by ID
   */
  public getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get alert statistics
   */
  public getStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    const now = Date.now();
    const oneDayAgo = now - 86400000; // 24 hours
    
    const recentAlerts = alerts.filter(a => a.timestamp > oneDayAgo);
    
    const resolvedAlerts = recentAlerts.filter(a => a.status === 'resolved');
    const avgResolutionTime = resolvedAlerts.length > 0 ?
      resolvedAlerts.reduce((sum, a) => sum + ((a.resolvedAt || 0) - a.timestamp), 0) / resolvedAlerts.length : 0;

    const escalatedAlerts = recentAlerts.filter(a => a.escalationLevel > 0);

    return {
      totalAlerts: recentAlerts.length,
      activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
      resolvedAlerts: resolvedAlerts.length,
      suppressedAlerts: recentAlerts.filter(a => a.status === 'suppressed').length,
      alertsByType: this.groupAlertsByField(recentAlerts, 'type'),
      alertsBySeverity: this.groupAlertsByField(recentAlerts, 'severity'),
      averageResolutionTime: avgResolutionTime,
      escalationRate: recentAlerts.length > 0 ? escalatedAlerts.length / recentAlerts.length : 0,
    };
  }

  /**
   * Handle crisis alerts with immediate notification
   */
  private async handleCrisisAlert(alert: Alert): Promise<void> {
    if (!this.config.alerts.crisis.immediateNotification) return;

    // Send to all crisis channels immediately
    const crisisChannels = this.config.alerts.crisis.channels;
    
    for (const channelType of crisisChannels) {
      try {
        switch (channelType) {
          case 'email':
            await this.sendEmail(alert, { priority: 'urgent', template: 'crisis' });
            break;
          case 'slack':
            await this.sendSlack(alert, { channel: this.config.notifications.slack.channels.crisis });
            break;
          case 'sms':
            // SMS implementation would go here
            console.log('Crisis SMS notification:', alert.title);
            break;
        }
      } catch (error) {
        console.error(`Failed to send crisis notification via ${channelType}:`, error);
      }
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const rule = this.rules.get(alert.type);
    if (!rule) return;

    for (const channel of rule.channels.filter(c => c.enabled)) {
      try {
        await this.sendNotification(alert, channel);
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Send a single notification
   */
  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmail(alert, channel.config);
        break;
      case 'slack':
        await this.sendSlack(alert, channel.config);
        break;
      case 'webhook':
        await this.sendWebhook(alert, channel.config);
        break;
      case 'sms':
        await this.sendSMS(alert, channel.config);
        break;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(alert: Alert, config: any): Promise<void> {
    if (!this.emailTransporter || !this.config.notifications.email.enabled) return;

    const template = config.template || 'alert';
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const body = this.formatEmailBody(alert, template);

    const mailOptions = {
      from: this.config.notifications.email.from,
      to: config.to || process.env.ALERT_EMAIL || 'alerts@astralcore.com',
      subject,
      html: body,
      priority: config.priority || (alert.severity === 'crisis' ? 'urgent' : 'normal'),
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(alert: Alert, config: any): Promise<void> {
    if (!this.config.notifications.slack.enabled) return;

    const webhook = this.config.notifications.slack.webhook;
    if (!webhook) return;

    const payload = {
      text: `Alert: ${alert.title}`,
      channel: config.channel || this.config.notifications.slack.channels.alerts,
      username: 'Astral Core Monitor',
      icon_emoji: ':warning:',
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Source', value: alert.source, short: true },
          { title: 'Time', value: new Date(alert.timestamp).toISOString(), short: true },
        ],
      }],
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    if (!this.config.notifications.webhook.enabled) return;

    const url = config.url || this.config.notifications.webhook.url;
    if (!url) return;

    const payload = {
      alert,
      timestamp: Date.now(),
      source: 'astralcore-monitor',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.notifications.webhook.timeout),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMS(alert: Alert, config: any): Promise<void> {
    // SMS implementation would depend on the provider (Twilio, AWS SNS, etc.)
    console.log('SMS notification:', {
      to: config.to,
      message: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`,
    });
  }

  /**
   * Setup escalation for an alert
   */
  private setupEscalation(alert: Alert): void {
    const rule = this.rules.get(alert.type);
    if (!rule?.escalation?.enabled) return;

    const escalationLevel = rule.escalation.levels[0];
    if (!escalationLevel) return;

    const timer = setTimeout(() => {
      this.escalateAlert(alert.id);
    }, escalationLevel.delay);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') return;

    const rule = this.rules.get(alert.type);
    if (!rule?.escalation) return;

    alert.escalationLevel++;
    alert.lastEscalatedAt = Date.now();

    const escalationLevel = rule.escalation.levels[alert.escalationLevel - 1];
    if (!escalationLevel) return;

    // Send escalation notifications
    for (const channel of escalationLevel.channels.filter(c => c.enabled)) {
      try {
        await this.sendNotification(alert, channel);
      } catch (error) {
        console.error(`Failed to send escalation notification:`, error);
      }
    }

    this.emit('alert:escalated', { alert, level: alert.escalationLevel });

    // Setup next escalation level if exists and not at max
    if (
      alert.escalationLevel < rule.escalation.levels.length &&
      alert.escalationLevel < rule.escalation.maxEscalations
    ) {
      const nextLevel = rule.escalation.levels[alert.escalationLevel];
      const timer = setTimeout(() => {
        this.escalateAlert(alertId);
      }, nextLevel.delay);

      this.escalationTimers.set(alertId, timer);
    }
  }

  /**
   * Clear escalation for an alert
   */
  private clearEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  /**
   * Check if alert type is in cooldown
   */
  private isInCooldown(alertType: string): boolean {
    const rule = this.rules.get(alertType);
    if (!rule || rule.cooldown === 0) return false;

    const lastAlertTime = this.lastAlertTime.get(alertType);
    if (!lastAlertTime) return false;

    return Date.now() - lastAlertTime < rule.cooldown;
  }

  /**
   * Check if alert is suppressed
   */
  private isAlertSuppressed(fingerprint: string): boolean {
    const suppressedUntil = this.suppressionRules.get(fingerprint);
    return suppressedUntil ? Date.now() < suppressedUntil : false;
  }

  /**
   * Apply suppression rules
   */
  private applySuppression(fingerprint: string): void {
    const window = this.config.alerts.suppression.window;
    this.suppressionRules.set(fingerprint, Date.now() + window);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate alert fingerprint for deduplication
   */
  private generateFingerprint(params: any): string {
    const key = `${params.type}_${params.source}_${JSON.stringify(params.metadata || {})}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Create suppressed alert
   */
  private createSuppressedAlert(alertId: string, params: any, fingerprint: string): Alert {
    const alert: Alert = {
      id: alertId,
      type: params.type,
      severity: params.severity,
      status: 'suppressed',
      title: params.title,
      message: params.message,
      source: params.source,
      timestamp: Date.now(),
      escalationLevel: 0,
      metadata: params.metadata || {},
      fingerprint,
    };

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Format email body
   */
  private formatEmailBody(alert: Alert, template: string): string {
    const isCrisis = template === 'crisis' || alert.isCrisis;
    
    return `
    <html>
    <body style="font-family: Arial, sans-serif; margin: 20px;">
      ${isCrisis ? '<div style="background: #ff4444; color: white; padding: 10px; margin-bottom: 20px; font-weight: bold;">🚨 CRISIS ALERT 🚨</div>' : ''}
      
      <h2 style="color: ${this.getSeverityColor(alert.severity)};">${alert.title}</h2>
      
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Source:</strong> ${alert.source}</p>
      <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
      
      <h3>Details:</h3>
      <p>${alert.message}</p>
      
      ${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
      <h3>Additional Information:</h3>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
      ` : ''}
      
      ${isCrisis ? `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin-top: 20px; border-radius: 5px;">
        <strong>Crisis Alert:</strong> This alert requires immediate attention. Please follow crisis intervention protocols.
      </div>
      ` : ''}
    </body>
    </html>
    `;
  }

  /**
   * Get color for alert severity
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      info: '#36a2eb',
      warning: '#ffce56',
      error: '#ff6384',
      critical: '#ff4444',
      crisis: '#8b0000',
    };
    return colors[severity] || '#888888';
  }

  /**
   * Send resolution notifications
   */
  private async sendResolutionNotifications(alert: Alert): Promise<void> {
    // Only send for higher severity alerts
    if (!['error', 'critical', 'crisis'].includes(alert.severity)) return;

    const resolutionAlert = {
      ...alert,
      title: `RESOLVED: ${alert.title}`,
      message: `Alert has been resolved. Duration: ${this.formatDuration(alert.timestamp, alert.resolvedAt!)}`,
    };

    // Send to email
    if (this.config.notifications.email.enabled) {
      try {
        await this.sendEmail(resolutionAlert, { template: 'recovery' });
      } catch (error) {
        console.error('Failed to send resolution email:', error);
      }
    }

    // Send to Slack
    if (this.config.notifications.slack.enabled) {
      try {
        await this.sendSlack(resolutionAlert, {});
      } catch (error) {
        console.error('Failed to send resolution Slack message:', error);
      }
    }
  }

  /**
   * Group alerts by field
   */
  private groupAlertsByField(alerts: Alert[], field: keyof Alert): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      const value = alert[field] as string;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Format duration
   */
  private formatDuration(start: number, end: number): string {
    const duration = end - start;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldAlerts();
      this.cleanupSuppressionRules();
    }, 3600000); // Run every hour
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const retentionTime = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - retentionTime;

    for (const [id, alert] of this.alerts) {
      if (alert.status === 'resolved' && alert.timestamp < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Clean up expired suppression rules
   */
  private cleanupSuppressionRules(): void {
    const now = Date.now();
    for (const [fingerprint, until] of this.suppressionRules) {
      if (now >= until) {
        this.suppressionRules.delete(fingerprint);
      }
    }
  }
}

// Singleton instance
export const alertManager = new AlertManager();

export default alertManager;