import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';
import { NotificationTemplate, NotificationPreference, User } from '@prisma/client';

// Initialize services
const emailTransporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'support@example.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Notification channel types
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Template variable replacement
export function processTemplate(template: string, variables: Record<string, any>): string {
  let processed = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processed = processed.replace(regex, String(value));
  }
  
  return processed;
}

// Check if user should receive notification based on preferences
export async function shouldSendNotification(
  userId: string,
  category: string,
  channel: NotificationChannel,
  priority: NotificationPriority = 'normal'
): Promise<boolean> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId }
  });
  
  if (!preference) return true; // Default to sending if no preferences set
  
  // Check if channel is enabled
  const channelEnabled = {
    'email': preference.emailEnabled,
    'sms': preference.smsEnabled,
    'push': preference.pushEnabled,
    'in-app': preference.inAppEnabled
  }[channel];
  
  if (!channelEnabled) return false;
  
  // Check category preferences
  const categoryPrefs = preference.categories as Record<string, boolean>;
  if (categoryPrefs && category in categoryPrefs && !categoryPrefs[category]) {
    return false;
  }
  
  // Check quiet hours (skip for urgent notifications)
  if (priority !== 'urgent' && preference.quietHoursStart && preference.quietHoursEnd) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preference.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preference.quietHoursEnd.split(':').map(Number);
    
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;
    
    if (quietEnd > quietStart) {
      // Normal case: quiet hours don't cross midnight
      if (currentTime >= quietStart && currentTime < quietEnd) return false;
    } else {
      // Quiet hours cross midnight
      if (currentTime >= quietStart || currentTime < quietEnd) return false;
    }
  }
  
  return true;
}

// Send email notification
export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const info = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html
    });
    
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send SMS notification
export async function sendSMSNotification(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!twilioClient) {
    return {
      success: false,
      error: 'SMS service not configured'
    };
  }
  
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    
    return { success: true };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send push notification
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send in-app notification
export async function sendInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any,
  isPriority: boolean = false
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
      isPriority
    }
  });
}

// Queue notification for batch sending
export async function queueNotification(
  userId: string,
  templateId: string | null,
  channel: NotificationChannel,
  recipient: string,
  subject: string | null,
  content: string,
  priority: NotificationPriority = 'normal',
  scheduledFor?: Date,
  metadata?: any
): Promise<string> {
  const notification = await prisma.notificationQueue.create({
    data: {
      userId,
      templateId,
      channel,
      recipient,
      subject,
      content,
      priority,
      metadata,
      scheduledFor: scheduledFor || new Date(),
      status: 'pending'
    }
  });
  
  return notification.id;
}

// Process notification queue
export async function processNotificationQueue(limit: number = 100): Promise<{
  processed: number;
  failed: number;
}> {
  const now = new Date();
  
  // Get pending notifications that are scheduled
  const notifications = await prisma.notificationQueue.findMany({
    where: {
      status: 'pending',
      scheduledFor: { lte: now },
      attempts: { lt: 3 }
    },
    orderBy: [
      { priority: 'desc' },
      { scheduledFor: 'asc' }
    ],
    take: limit
  });
  
  let processed = 0;
  let failed = 0;
  
  for (const notification of notifications) {
    try {
      // Update status to processing
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: 'processing',
          attempts: { increment: 1 }
        }
      });
      
      let result: { success: boolean; error?: string };
      
      switch (notification.channel) {
        case 'email':
          result = await sendEmailNotification(
            notification.recipient,
            notification.subject || 'Notification',
            notification.content
          );
          break;
          
        case 'sms':
          result = await sendSMSNotification(
            notification.recipient,
            notification.content
          );
          break;
          
        case 'push':
          // Parse subscription from recipient (stored as JSON string)
          const subscription = JSON.parse(notification.recipient);
          result = await sendPushNotification(subscription, {
            title: notification.subject || 'Notification',
            body: notification.content
          });
          break;
          
        case 'in-app':
          await sendInAppNotification(
            notification.userId,
            'system',
            notification.subject || 'Notification',
            notification.content,
            notification.metadata,
            notification.priority === 'urgent' || notification.priority === 'high'
          );
          result = { success: true };
          break;
          
        default:
          result = { success: false, error: 'Unknown channel' };
      }
      
      if (result.success) {
        // Mark as sent
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });
        
        // Log delivery
        await prisma.notificationLog.create({
          data: {
            userId: notification.userId,
            queueId: notification.id,
            templateId: notification.templateId,
            channel: notification.channel,
            recipient: notification.recipient,
            content: notification.content,
            status: 'delivered',
            deliveredAt: new Date(),
            metadata: notification.metadata
          }
        });
        
        processed++;
      } else {
        // Handle failure
        const shouldRetry = notification.attempts < notification.maxAttempts;
        
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: shouldRetry ? 'pending' : 'failed',
            failureReason: result.error
          }
        });
        
        // Log failure
        await prisma.notificationLog.create({
          data: {
            userId: notification.userId,
            queueId: notification.id,
            templateId: notification.templateId,
            channel: notification.channel,
            recipient: notification.recipient,
            content: notification.content,
            status: 'failed',
            errorDetails: { error: result.error },
            metadata: notification.metadata
          }
        });
        
        failed++;
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      failed++;
    }
  }
  
  return { processed, failed };
}

// Send notification using template
export async function sendTemplatedNotification(
  userId: string,
  templateName: string,
  variables: Record<string, any>,
  channels?: NotificationChannel[]
): Promise<{ sent: number; failed: number }> {
  // Get template
  const template = await prisma.notificationTemplate.findFirst({
    where: {
      name: templateName,
      isActive: true
    }
  });
  
  if (!template) {
    throw new Error(`Template ${templateName} not found or inactive`);
  }
  
  // Get user and preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      NotificationPreference: true
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Determine channels to use
  const targetChannels = channels || (template.channels as NotificationChannel[]);
  
  let sent = 0;
  let failed = 0;
  
  // Add user data to variables
  const fullVariables = {
    ...variables,
    userName: user.displayName || user.firstName || 'User',
    userEmail: user.email || ''
  };
  
  // Process template content
  const content = processTemplate(template.contentTemplate, fullVariables);
  const subject = template.subject ? processTemplate(template.subject, fullVariables) : undefined;
  
  // Send to each channel
  for (const channel of targetChannels) {
    // Check if should send
    const shouldSend = await shouldSendNotification(
      userId,
      template.category,
      channel,
      template.priority as NotificationPriority
    );
    
    if (!shouldSend) continue;
    
    try {
      let recipient: string;
      
      switch (channel) {
        case 'email':
          if (!user.email) continue;
          recipient = user.email;
          break;
          
        case 'sms':
          if (!user.phoneNumber) continue;
          recipient = user.phoneNumber;
          break;
          
        case 'push':
          // Get push subscription from user settings
          const pushSub = (user.NotificationPreference as any)?.metadata as any;
          if (!pushSub?.pushSubscription) continue;
          recipient = JSON.stringify(pushSub.pushSubscription);
          break;
          
        case 'in-app':
          recipient = userId;
          break;
          
        default:
          continue;
      }
      
      await queueNotification(
        userId,
        template.id,
        channel,
        recipient,
        subject,
        content,
        template.priority as NotificationPriority,
        undefined,
        { variables: fullVariables }
      );
      
      sent++;
    } catch (error) {
      console.error(`Failed to queue ${channel} notification:`, error);
      failed++;
    }
  }
  
  return { sent, failed };
}

// Batch send notifications
export async function batchSendNotifications(
  userIds: string[],
  templateName: string,
  baseVariables: Record<string, any>,
  channels?: NotificationChannel[]
): Promise<{
  totalSent: number;
  totalFailed: number;
  results: Array<{ userId: string; sent: number; failed: number }>;
}> {
  const results: Array<{ userId: string; sent: number; failed: number }> = [];
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const userId of userIds) {
    try {
      const result = await sendTemplatedNotification(
        userId,
        templateName,
        baseVariables,
        channels
      );
      
      results.push({ userId, ...result });
      totalSent += result.sent;
      totalFailed += result.failed;
    } catch (error) {
      console.error(`Failed to send notifications to user ${userId}:`, error);
      results.push({ userId, sent: 0, failed: 1 });
      totalFailed++;
    }
  }
  
  return { totalSent, totalFailed, results };
}

// Mark notifications as read
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<number> {
  const where = notificationIds
    ? { id: { in: notificationIds }, userId, isRead: false }
    : { userId, isRead: false };
  
  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
  
  return result.count;
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  });
}

// Clean up old notifications
export async function cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
      isPriority: false
    }
  });
  
  return result.count;
}