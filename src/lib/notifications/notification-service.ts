import { prisma } from '@/lib/prisma';
import { Server as SocketIOServer } from 'socket.io';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

// Initialize Redis for pub/sub
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pubClient = redis.duplicate();
const subClient = redis.duplicate();

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + process.env.SUPPORT_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface NotificationPayload {
  userId: string;
  type: 'message' | 'appointment' | 'crisis' | 'reminder' | 'system' | 'community';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
}

export interface NotificationChannel {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export class NotificationService {
  private io: SocketIOServer | null = null;

  // Initialize WebSocket server
  setSocketServer(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  // Setup WebSocket handlers
  private setupSocketHandlers() {
    if (!this.io) return;

    (this as any).io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle user authentication
      socket.on('authenticate', async (token: string) => {
        try {
          // Verify JWT token and get user ID
          const userId = await this.verifyUserToken(token);
          if (userId) {
            // Join user-specific room
            socket.join(`user:${userId}`);
            socket.data.userId = userId;

            // Send any pending notifications
            await this.sendPendingNotifications(userId);
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', 'Invalid authentication');
        }
      });

      // Handle notification acknowledgment
      socket.on('notification_read', async (notificationId: string) => {
        if (socket.data.userId) {
          await this.markAsRead(notificationId, socket.data.userId);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Subscribe to Redis pub/sub for cross-server communication
    subClient.subscribe('notifications');
    subClient.on('message', (channel, message) => {
      if (channel === 'notifications') {
        const notification = JSON.parse(message);
        this.emitToUser(notification.userId, 'new_notification', notification);
      }
    });
  }

  // Verify user token (implement with your auth system)
  private async verifyUserToken(token: string): Promise<string | null> {
    // Implement JWT verification
    // Return user ID if valid, null otherwise
    return null;
  }

  // Create and send notification
  async createNotification(payload: NotificationPayload): Promise<string> {
    try {
      // Store notification in database
      const notification = await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          data: payload.data || {},
          actionUrl: payload.actionUrl,
          actionText: payload.actionText,
          isRead: false,
          expiresAt: payload.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Get user's notification preferences
      const preferences = await this.getUserPreferences(payload.userId);

      // Send through enabled channels
      const channels = this.determineChannels(payload.priority, preferences);
      
      if (channels.inApp) {
        await this.sendInAppNotification(notification);
      }
      
      if (channels.email && preferences.emailEnabled) {
        await this.sendEmailNotification(notification);
      }
      
      if (channels.push && preferences.pushEnabled) {
        await this.sendPushNotification(notification);
      }
      
      if (channels.sms && preferences.smsEnabled && payload.priority === 'urgent') {
        await this.sendSMSNotification(notification);
      }

      // Log notification delivery
      await this.logNotificationDelivery(notification.id, channels);

      return notification.id;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Get user notification preferences
  private async getUserPreferences(userId: string): Promise<any> {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    return preferences || {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      emailFrequency: 'immediate',
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  // Determine which channels to use based on priority
  private determineChannels(
    priority: string,
    preferences: any
  ): NotificationChannel {
    const isQuietHours = this.isInQuietHours(preferences);

    switch (priority) {
      case 'urgent':
        // Always send urgent notifications through all channels
        return {
          inApp: true,
          email: true,
          push: true,
          sms: true,
        };
      case 'high':
        return {
          inApp: true,
          email: !isQuietHours,
          push: !isQuietHours,
          sms: false,
        };
      case 'medium':
        return {
          inApp: true,
          email: preferences.emailFrequency === 'immediate' && !isQuietHours,
          push: !isQuietHours,
          sms: false,
        };
      default:
        return {
          inApp: true,
          email: false,
          push: false,
          sms: false,
        };
    }
  }

  // Check if current time is in user's quiet hours
  private isInQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const start = parseInt(preferences.quietHoursStart);
    const end = parseInt(preferences.quietHoursEnd);

    if (start <= end) {
      return currentHour >= start && currentHour < end;
    } else {
      return currentHour >= start || currentHour < end;
    }
  }

  // Send in-app notification via WebSocket
  private async sendInAppNotification(notification: any): Promise<void> {
    // Emit to specific user room
    this.emitToUser(notification.userId, 'new_notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      createdAt: notification.createdAt,
    });

    // Publish to Redis for cross-server communication
    await pubClient.publish('notifications', JSON.stringify(notification));
  }

  // Send email notification
  private async sendEmailNotification(notification: any): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true },
      });

      if (!user?.email) return;

      const template = await this.getEmailTemplate(notification.type);
      const html = this.renderEmailTemplate(template, {
        userName: (user as any).name,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
      });

      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: notification.title,
        html,
      });

      // Update delivery status
      await prisma.notificationDelivery.create({
        data: {
          id: crypto.randomUUID(),
          notificationId: notification.id,
          channel: 'email',
          status: 'delivered',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      
      // Log failed delivery
      await prisma.notificationDelivery.create({
        data: {
          id: crypto.randomUUID(),
          notificationId: notification.id,
          channel: 'email',
          status: 'failed',
          
          attemptedAt: new Date(),
        },
      });
    }
  }

  // Send push notification
  private async sendPushNotification(notification: any): Promise<void> {
    try {
      // Get user's push subscriptions
      const subscriptions = await (prisma as any).pushSubscription.findMany({
        where: { userId: notification.userId },
      });

      for (const subscription of subscriptions) {
        const pushPayload = {
          title: notification.title,
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            id: notification.id,
            type: notification.type,
            url: notification.actionUrl,
          },
        };

        try {
          await webpush.sendNotification(
            JSON.parse(subscription.subscription),
            JSON.stringify(pushPayload)
          );
        } catch (error) {
          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            await (prisma as any).pushSubscription.delete({
              where: { id: subscription.id },
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  // Send SMS notification (integrate with Twilio or similar)
  private async sendSMSNotification(notification: any): Promise<void> {
    // Implement SMS sending via Twilio, AWS SNS, etc.
    console.log('SMS notification would be sent here');
  }

  // Get email template
  private async getEmailTemplate(type: string): Promise<string> {
    const template = await prisma.notificationTemplate.findFirst({
      where: { type, channel: 'email' },
    });

    return (template as any)?.template || this.getDefaultEmailTemplate();
  }

  // Render email template
  private renderEmailTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || '';
    });
  }

  // Get default email template
  private getDefaultEmailTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{title}}</h1>
            </div>
            <div class="content">
              <p>Hi {{userName}},</p>
              <p>{{message}}</p>
              {{#if actionUrl}}
                <p><a href="{{actionUrl}}" class="button">{{actionText}}</a></p>
              {{/if}}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Emit to specific user
  private emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Send pending notifications
  private async sendPendingNotifications(userId: string): Promise<void> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const notification of notifications) {
      this.emitToUser(userId, 'pending_notification', notification);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  // Log notification delivery
  private async logNotificationDelivery(
    notificationId: string,
    channels: NotificationChannel
  ): Promise<void> {
    const deliveries = [];
    
    for (const [channel, sent] of Object.entries(channels)) {
      if (sent) {
        deliveries.push({
          id: crypto.randomUUID(),
          notificationId,
          channel,
          status: 'pending',
          attemptedAt: new Date(),
        });
      }
    }

    if (deliveries.length > 0) {
      await prisma.notificationDelivery.createMany({
        data: deliveries,
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();