// Notifications API with CRUD operations and real-time updates
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { z } from "zod";
import * as crypto from "crypto";

// Input validation schemas
const createNotificationSchema = z.object({
  userId: z.string().optional(), // Admin can send to specific user
  type: z.string(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  isPriority: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  action: z.enum(["mark_read", "mark_unread", "mark_all_read"]).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
  isPriority: z.coerce.boolean().optional(),
  since: z.string().optional(), // ISO date string
});

// GET /api/messaging/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const params = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type"),
      isRead: searchParams.get("isRead"),
      isPriority: searchParams.get("isPriority"),
      since: searchParams.get("since"),
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {
      userId,
    };

    if (params.type) {
      where.type = params.type;
    }

    if (params.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    if (params.isPriority !== undefined) {
      where.isPriority = params.isPriority;
    }

    if (params.since) {
      where.createdAt = {
        gte: new Date(params.since),
      };
    }

    // Get notifications with counts
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [
          { isPriority: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    // Group notifications by type for summary
    const notificationTypes = await prisma.notification.groupBy({
      by: ["type"],
      where: {
        userId,
        isRead: false,
      },
      _count: {
        type: true,
      },
    });

    const typeSummary = notificationTypes.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      notifications,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
      },
      summary: {
        unreadCount,
        typeCounts: typeSummary,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" }, { status: 500 });
  }
});

// POST /api/messaging/notifications - Create a notification (System/Admin only)
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const senderId = req.user!.id;
    const senderRole = req.user!.role;

    // Only admins and system can create notifications
    if (!["ADMIN", "SUPER_ADMIN", "HELPER", "THERAPIST", "CRISIS_COUNSELOR"].includes(senderRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create notifications" }, { status: 403 });
    }

    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = createNotificationSchema.parse(body);

    // Determine target user(s)
    let targetUserIds: string[] = [];

    if (validatedData.userId) {
      // Send to specific user
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: "Target user not found or inactive" }, { status: 404 });
      }

      targetUserIds = [validatedData.userId];
    } else {
      // Broadcast to all active users (admin only)
      if (!["ADMIN", "SUPER_ADMIN"].includes(senderRole)) {
        return NextResponse.json(
          { error: "Only admins can send broadcast notifications" }, { status: 403 });
      }

      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      targetUserIds = users.map(u => u.id);
    }

    // Create notifications for all target users
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map(userId => ({
        userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        isPriority: validatedData.isPriority || false,
        metadata: validatedData.metadata as any || {},
      })),
    });

    // Log admin action
    await prisma.auditLog.create({
        data: {
          id: generatePrismaCreateFields().id,
          userId: senderId,
        action: "create_notification",
        resource: "notification",
        details: {
          type: validatedData.type,
          targetCount: targetUserIds.length,
          broadcast: !validatedData.userId,
        },
        outcome: "success",
      },
    });

    return NextResponse.json({
      message: "Notifications created successfully",
      count: notifications.count,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" }, { status: 500 });
  }
});

// PUT /api/messaging/notifications - Update notification status
export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const notificationId = searchParams.get("id");
    
    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = updateNotificationSchema.parse(body);

    // Handle mark all as read
    if (validatedData.action === "mark_all_read") {
      const updated = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        message: "All notifications marked as read",
        count: updated.count,
      }, { status: 200 });
    }

    // Handle single notification update
    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required for single updates" }, { status: 400 });
    }

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" }, { status: 404 });
    }

    // Update notification
    const isRead = validatedData.action === "mark_read" || validatedData.isRead === true;
    
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });

    return NextResponse.json({
      message: "Notification updated successfully",
      notification: updated,
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" }, { status: 500 });
  }
});

// DELETE /api/messaging/notifications - Delete notifications
export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const notificationId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";
    const deleteRead = searchParams.get("read") === "true";

    if (deleteAll) {
      // Delete all notifications for user
      const deleted = await prisma.notification.deleteMany({
        where: { userId },
      });

      return NextResponse.json({
        message: "All notifications deleted",
        count: deleted.count,
      }, { status: 200 });
    } else if (deleteRead) {
      // Delete only read notifications
      const deleted = await prisma.notification.deleteMany({
        where: {
          userId,
          isRead: true,
        },
      });

      return NextResponse.json({
        message: "Read notifications deleted",
        count: deleted.count,
      }, { status: 200 });
    } else if (notificationId) {
      // Delete single notification
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return NextResponse.json({
        message: "Notification deleted successfully",
      }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Specify notification ID or use 'all' or 'read' parameter" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" }, { status: 500 });
  }
  });
}