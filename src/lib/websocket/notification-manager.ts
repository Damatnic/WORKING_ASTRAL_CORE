/**
 * WebSocket Notification Manager
 * Handles real-time notifications for the mental health platform
 */

import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface NotificationPayload {
  type: 'info' | 'warning' | 'error' | 'success' | 'crisis';
  title: string;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface CrisisNotificationPayload extends NotificationPayload {
  type: 'crisis';
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertId: string;
  location?: string;
  contactRequired: boolean;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private io: any | undefined = null;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  public initialize(io: any): void {
    this.io = io;
  }

  public async notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Send via WebSocket
      this.io.to(`user:${userId}`).emit('notification', {
        ...payload,
        timestamp: new Date().toISOString()
      });

      // Store in database for persistence
      await prisma.notification.create({
        data: {
          userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          isPriority: payload.priority === 'high' || payload.priority === 'urgent',
          metadata: payload.metadata || {},
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  public async notifyRoles(roles: UserRole[], payload: NotificationPayload): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Get users with specified roles
      const users = await prisma.user.findMany({
        where: { role: { in: roles } },
        select: { id: true }
      });

      // Send to each user
      for (const user of users) {
        await this.notifyUser(user.id, payload);
      }
    } catch (error) {
      console.error('Error notifying roles:', error);
    }
  }

  public async notifyCrisis(payload: CrisisNotificationPayload): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Send to crisis counselors room
      this.io.to('crisis_counselors').emit('crisis_alert', {
        ...payload,
        timestamp: new Date().toISOString()
      });

      // Also notify specific counselors if assigned
      if (payload.userId) {
        await this.notifyUser(payload.userId, payload);
      }

      // Create crisis alert record
      await prisma.safetyAlert.create({
        data: {
          type: 'crisis',
          severity: payload.severity,
          userId: payload.userId || '',
          context: payload.message,
          indicators: [payload.alertId],
          handled: false,
          actions: ['notification_sent'],
        }
      });
    } catch (error) {
      console.error('Error sending crisis notification:', error);
    }
  }

  public async notifyAdmins(payload: NotificationPayload): Promise<void> {
    await this.notifyRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN], payload);
  }

  public async notifyCounselors(payload: NotificationPayload): Promise<void> {
    await this.notifyRoles([UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN], payload);
  }

  public async getNotificationCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        }
      });
      return count;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  public async markAsRead(userId: string, notificationId?: string): Promise<void> {
    try {
      const whereClause = notificationId 
        ? { id: notificationId, userId }
        : { userId, isRead: false };

      await prisma.notification.updateMany({
        where: whereClause,
        data: { isRead: true, readAt: new Date() }
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  public async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  public async broadcast(payload: NotificationPayload): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Broadcast to all connected users
      this.io.emit('broadcast_notification', {
        ...payload,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }
}

export const notificationManager = NotificationManager.getInstance();