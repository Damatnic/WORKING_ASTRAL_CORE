import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/platform/notifications - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build where clause
    const where: any = { userId: user.id  };
    
    if (category && category !== 'all') {
      where.metadata = {
        path: '$.category',
        equals: category
      };
    }

    if (priority && priority !== 'all') {
      where.metadata = {
        ...where.metadata,
        path: '$.priority',
        equals: priority
      };
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    // Fetch notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          User: {
            select: {
              displayName: true,
              avatarUrl: true
            }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    // Fetch delivery status for each notification
    const notificationIds = notifications.map(n => n.id);
    const deliveryStatuses = await prisma.notificationDelivery.findMany({
      where: { notificationId: { in: notificationIds } }
    });

    // Group delivery statuses by notification ID
    const deliveryMap = deliveryStatuses.reduce((acc, delivery) => {
      if (!acc[delivery.notificationId]) {
        acc[delivery.notificationId] = {};
      }
      acc[delivery.notificationId][delivery.channel] = delivery.status;
      return acc;
    }, {} as Record<string, Record<string, string>>);

    // Transform notifications to match frontend interface
    const transformedNotifications = notifications.map(notification => {
      const metadata = notification.metadata as any || {};
      const channels = metadata.channels || ['in_app'];
      
      return {
        id: notification.id,
        type: notification.type as any,
        priority: metadata.priority || 'medium',
        title: notification.title,
        message: notification.message,
        timestamp: notification.createdAt,
        isRead: notification.isRead,
        category: metadata.category || 'system',
        actionable: metadata.actionable || false,
        actions: metadata.actions || [],
        metadata: {
          senderId: metadata.senderId,
          senderName: metadata.senderName,
          senderRole: metadata.senderRole,
          clientId: metadata.clientId,
          sessionId: metadata.sessionId,
          appointmentId: metadata.appointmentId
        },
        channels,
        deliveryStatus: deliveryMap[notification.id] || {}
      };
    });

    return NextResponse.json({
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/platform/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN', 'CRISIS_COUNSELOR', 'THERAPIST'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    const notificationSchema = z.object({
      targetUserId: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error', 'crisis', 'message', 'appointment', 'system']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      title: z.string(),
      message: z.string(),
      category: z.enum(['therapy', 'crisis', 'community', 'system', 'appointment', 'safety', 'wellness']),
      channels: z.array(z.enum(['in_app', 'email', 'sms', 'push', 'phone_call'])),
      actionable: z.boolean().optional(),
      actions: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['primary', 'secondary', 'danger']),
        url: z.string().optional()
      })).optional(),
      metadata: z.record(z.any()).optional()
    });

    const validatedData = notificationSchema.parse(body);

    // Create the notification
    const notification = await prisma.notification.create({
        data: {
          id: generatePrismaCreateFields().id,userId: validatedData.targetUserId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        isPriority: validatedData.priority === 'urgent' || validatedData.priority === 'high',
        metadata: {
          priority: validatedData.priority,
          category: validatedData.category,
          channels: validatedData.channels,
          actionable: validatedData.actionable || false,
          actions: validatedData.actions || [],
          ...validatedData.metadata
        }
      }
    });

    // Create delivery records for each channel
    const deliveryRecords = validatedData.channels.map((channel: string) => ({
      notificationId: notification.id,
      channel,
      status: 'pending'
    }));

    await prisma.notificationDelivery.createMany({
      data: deliveryRecords
    });

    // TODO: Trigger actual delivery mechanisms (email, SMS, push, etc.)
    // This would integrate with services like SendGrid, Twilio, FCM, etc.

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        createdAt: notification.createdAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH /api/platform/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id ,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      // Update delivery status
      const unreadNotifications = await prisma.notification.findMany({
        where: { userId: user.id  },
        select: { id: true }
      });

      await prisma.notificationDelivery.updateMany({
        where: {
          notificationId: { in: unreadNotifications.map(n => n.id) },
          channel: 'in_app'
        },
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' }, { status: 200 });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id 
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      // Update delivery status
      await prisma.notificationDelivery.updateMany({
        where: {
          notificationId: { in: notificationIds },
          channel: 'in_app'
        },
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, message: 'Notifications marked as read' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' }, { status: 500 });
  }
}

// DELETE /api/platform/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Delete the notification (cascade will delete delivery records)
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: user.id 
      }
    });

    return NextResponse.json({ success: true, message: 'Notification deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' }, { status: 500 });
  }
}