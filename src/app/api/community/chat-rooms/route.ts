
// Chat rooms API with CRUD operations and real-time support preparation
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest, withRoles } from "@/lib/auth-middleware-exports";
import { UserRole } from "@/types/prisma";
import { z } from "zod";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Input validation schemas
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  topic: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  maxParticipants: z.number().int().min(2).max(50).optional().default(20),
  language: z.string().length(2).optional().default("en"),
  rules: z.array(z.string()).optional().default([]),
  settings: z.object({
    allowAnonymous: z.boolean().optional().default(true),
    requireModeration: z.boolean().optional().default(false),
    minTrustScore: z.number().min(0).max(1).optional().default(0),
    autoModerate: z.boolean().optional().default(true),
    allowFileSharing: z.boolean().optional().default(false),
  }).optional().default(() => ({
    allowAnonymous: true,
    requireModeration: false,
    minTrustScore: 0,
    autoModerate: true,
    allowFileSharing: false,
  })),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  maxParticipants: z.number().int().min(2).max(50).optional(),
  rules: z.array(z.string()).optional(),
  settings: z.object({
    allowAnonymous: z.boolean().optional(),
    requireModeration: z.boolean().optional(),
    minTrustScore: z.number().min(0).max(1).optional(),
    autoModerate: z.boolean().optional(),
    allowFileSharing: z.boolean().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  topic: z.string().optional(),
  language: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  includeParticipants: z.coerce.boolean().optional().default(false),
});

// GET /api/community/chat-rooms - Get all chat rooms
export async function GET(req: NextRequest) {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const params = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      topic: searchParams.get("topic"),
      language: searchParams.get("language"),
      isActive: searchParams.get("isActive"),
      search: searchParams.get("search"),
      includeParticipants: searchParams.get("includeParticipants"),
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {};

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    } else {
      where.isActive = true; // Default to active rooms only
    }

    if (params.topic) {
      where.topic = params.topic;
    }

    if (params.language) {
      where.language = params.language;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // Get rooms with optional participant info
    const includeClause: any = {
      _count: {
        select: {
          ChatParticipant: {
            where: { isActive: true },
          },
          ChatMessage: true,
        },
      },
    };

    if (params.includeParticipants) {
      includeClause.ChatParticipant = {
        where: { isActive: true },
        take: 5, // Show first 5 active participants
        select: {
          userId: true,
          joinedAt: true,
        },
      };
    }

    const [rooms, totalCount] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { lastActivity: "desc" },
        include: includeClause,
      }),
      prisma.chatRoom.count({ where }),
    ]);

    // Process rooms for response
    const processedRooms = rooms.map(room => {
      const { ChatParticipant, _count, ...roomData } = room as any;
      return {
        ...roomData,
        participantCount: _count?.ChatParticipant || 0,
        messageCount: _count?.ChatMessage || 0,
        participants: ChatParticipant || undefined,
        isFull: (_count?.ChatParticipant || 0) >= room.maxParticipants,
      };
    });

    return NextResponse.json({
      rooms: processedRooms,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error fetching chat rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat rooms" },
      { status: 500 }
    );
  }
}

// POST /api/community/chat-rooms - Create a new chat room (Helper/Admin only)
export async function POST(req: NextRequest) {
  return withRoles(
  [UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      
      // Parse and validate input
      const body = await (req as any).json();
      const validatedData = createRoomSchema.parse(body);

      // Check if a similar room already exists
      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          name: validatedData.name,
          topic: validatedData.topic,
          isActive: true,
        },
      });

      if (existingRoom) {
        return NextResponse.json(
          { error: "A similar chat room already exists" },
          { status: 409 }
        );
      }

      // Add default rules based on topic
      const defaultRules = [
        "Be respectful and supportive",
        "No harassment or discrimination",
        "Maintain confidentiality",
        "No spam or promotional content",
        "Crisis situations will be escalated to counselors",
      ];

      // Add topic-specific rules
      const topicRules: Record<string, string[]> = {
        anxiety: ["Share coping strategies respectfully", "Avoid triggering descriptions"],
        depression: ["Focus on support, not medical advice", "Encourage professional help when needed"],
        crisis: ["This is not a replacement for emergency services", "Counselors are monitoring"],
      };

      const allRules = [
        ...defaultRules,
        ...(topicRules[validatedData.topic] || []),
        ...validatedData.rules,
      ];

      // Create the chat room
      const room = await (prisma.chatRoom as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          name: validatedData.name,
          topic: validatedData.topic,
          description: validatedData.description,
          maxParticipants: validatedData.maxParticipants,
          language: validatedData.language,
          rules: allRules,
          settings: validatedData.settings,
          isActive: true,
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Add the creator as the first moderator
      await (prisma.chatModerator as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          roomId: room.id,
          userId,
          permissions: ["manage_participants", "delete_messages", "ban_users"],
        },
      });

      // Log room creation
      await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
          userId,
          action: "create_chat_room",
          resource: "chat_room",
          resourceId: room.id,
          details: {
            name: room.name,
            topic: room.topic,
          },
          outcome: "success",
        },
      });

      return NextResponse.json({
        message: "Chat room created successfully",
        room,
      }, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error creating chat room:", error);
      return NextResponse.json(
        { error: "Failed to create chat room" },
        { status: 500 }
      );
    }
  }
  );
}

// PUT /api/community/chat-rooms - Update a chat room (Moderator only)
export async function PUT(req: NextRequest) {
  return withRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER], async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const roomId = searchParams.get("id");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Check if room exists
    const existingRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      return NextResponse.json(
        { error: "Chat room not found" },
        { status: 404 }
      );
    }

    // Check if user is a moderator or admin
    const isModerator = await prisma.chatModerator.findFirst({
      where: {
        roomId,
        userId,
      },
    });

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

    if (!isModerator && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to update this chat room" },
        { status: 403 }
      );
    }

    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = updateRoomSchema.parse(body);

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.maxParticipants !== undefined) {
      // Check current participant count
      const currentParticipants = await prisma.chatParticipant.count({
        where: {
          roomId,
          isActive: true,
        },
      });

      if (validatedData.maxParticipants < currentParticipants) {
        return NextResponse.json(
          { 
            error: "Cannot reduce max participants below current count",
            currentCount: currentParticipants,
          },
          { status: 400 }
        );
      }

      updateData.maxParticipants = validatedData.maxParticipants;
    }

    if (validatedData.rules !== undefined) {
      updateData.rules = validatedData.rules;
    }

    if (validatedData.settings !== undefined) {
      updateData.settings = {
        ...(existingRoom.settings as object || {}),
        ...validatedData.settings,
      };
    }

    if (validatedData.isActive !== undefined && isAdmin) {
      updateData.isActive = validatedData.isActive;
    }

    // Update the room
    const updatedRoom = await prisma.chatRoom.update({
      where: { id: roomId },
      data: updateData,
    });

    // Log the update
    await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
        userId,
        action: "update_chat_room",
        resource: "chat_room",
        resourceId: roomId,
        details: {
          changes: Object.keys(updateData),
        },
        outcome: "success",
      },
    });

    return NextResponse.json({
      message: "Chat room updated successfully",
      room: updatedRoom,
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating chat room:", error);
    return NextResponse.json(
      { error: "Failed to update chat room" },
      { status: 500 }
    );
  }
  });
}

// DELETE /api/community/chat-rooms - Delete/deactivate a chat room (Admin only)
export async function DELETE(req: NextRequest) {
  return withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const roomId = searchParams.get("id");
      const permanent = searchParams.get("permanent") === "true";

      if (!roomId) {
        return NextResponse.json(
          { error: "Room ID is required" },
          { status: 400 }
        );
      }

      // Check if room exists
      const existingRoom = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          _count: {
            select: {
              ChatMessage: true,
              ChatParticipant: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      if (!existingRoom) {
        return NextResponse.json(
          { error: "Chat room not found" },
          { status: 404 }
        );
      }

      // Check for active participants
      if (existingRoom._count.ChatParticipant > 0 && !permanent) {
        return NextResponse.json(
          { 
            error: "Cannot delete room with active participants. Deactivate it instead or use permanent=true",
            activeParticipants: existingRoom._count.ChatParticipant,
          },
          { status: 400 }
        );
      }

      if (permanent) {
        // Permanently delete the room and all related data
        await prisma.$transaction([
          // First remove all participants
          prisma.chatParticipant.deleteMany({
            where: { roomId },
          }),
          // Remove all moderators
          prisma.chatModerator.deleteMany({
            where: { roomId },
          }),
          // Remove all messages
          prisma.chatMessage.deleteMany({
            where: { roomId },
          }),
          // Finally delete the room
          prisma.chatRoom.delete({
            where: { id: roomId },
          }),
        ]);

        // Log the deletion
        await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
            userId,
            action: "delete_chat_room",
            resource: "chat_room",
            resourceId: roomId,
            details: {
              name: existingRoom.name,
              messageCount: existingRoom._count.ChatMessage,
              permanent: true,
            },
            outcome: "success",
          },
        });

        return NextResponse.json({
          message: "Chat room permanently deleted",
        }, { status: 200 });
      } else {
        // Soft delete - just deactivate the room
        const updatedRoom = await prisma.chatRoom.update({
          where: { id: roomId },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });

        // Remove all active participants
        await prisma.chatParticipant.updateMany({
          where: {
            roomId,
            isActive: true,
          },
          data: {
            isActive: false,
            leftAt: new Date(),
          },
        });

        // Log the deactivation
        await (prisma.auditLog as any).create({
        data: {
          id: generatePrismaCreateFields().id,
            userId,
            action: "deactivate_chat_room",
            resource: "chat_room",
            resourceId: roomId,
            details: {
              name: existingRoom.name,
            },
            outcome: "success",
          },
        });

        return NextResponse.json({
          message: "Chat room deactivated successfully",
          room: updatedRoom,
        }, { status: 200 });
      }

    } catch (error) {
      console.error("Error deleting chat room:", error);
      return NextResponse.json(
        { error: "Failed to delete chat room" },
        { status: 500 }
      );
    }
  }
  );
}