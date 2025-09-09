// Messaging conversations API with CRUD operations and privacy features
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { z } from "zod";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Input validation schemas
const createConversationSchema = z.object({
  type: z.enum(["direct", "group", "support"]).optional().default("direct"),
  title: z.string().min(1).max(100).optional(),
  participantIds: z.array(z.string()).min(1).max(50),
  isAnonymous: z.boolean().optional().default(true),
  metadata: z.object({
    purpose: z.string().optional(),
    topic: z.string().optional(),
  }).optional(),
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  metadata: z.object({
    purpose: z.string().optional(),
    topic: z.string().optional(),
  }).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  type: z.enum(["direct", "group", "support"]).optional(),
  active: z.coerce.boolean().optional().default(true),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

// GET /api/messaging/conversations - Get user's conversations
export async function GET(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const params = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type"),
      active: searchParams.get("active"),
      unreadOnly: searchParams.get("unreadOnly"),
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause for participant filter
    const participantWhere: any = {
      userId,
      isActive: params.active,
    };

    // Get conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        type: params.type,
        Participants: {
          some: participantWhere,
        },
      },
      skip,
      take: params.limit,
      orderBy: { lastActivity: "desc" },
      include: {
        Participants: {
          where: { isActive: true },
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                AnonymousIdentity: {
                  select: {
                    displayName: true,
                    avatar: true,
                    colorTheme: true,
                  },
                },
              },
            },
          },
        },
        Messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get last message
          where: { isDeleted: false },
        },
        _count: {
          select: {
            Messages: {
              where: {
                isDeleted: false,
                createdAt: {
                  gt: new Date(), // This will be replaced with user's lastReadAt
                },
              },
            },
          },
        },
      },
    });

    // Process conversations with unread counts and anonymous handling
    const processedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const userParticipant = conv.Participants.find(p => p.userId === userId);
        
        // Calculate unread count
        const unreadCount = await prisma.directMessage.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: userParticipant?.lastReadAt || new Date(0) },
            senderId: { not: userId },
            isDeleted: false,
          },
        });

        // Process participants for anonymous mode
        const processedParticipants = conv.Participants.map(participant => {
          const { User, ...participantData } = participant;
          
          if (conv.isAnonymous && User?.AnonymousIdentity) {
            return {
              ...participantData,
              User: {
                displayName: User.AnonymousIdentity.displayName,
                avatar: User.AnonymousIdentity.avatar,
                isAnonymous: true,
              },
            };
          } else if (User) {
            return {
              ...participantData,
              User: {
                id: User.id,
                displayName: User.displayName,
                avatar: User.avatarUrl,
                isAnonymous: false,
              },
            };
          }
          return participantData;
        });

        // Get conversation title (for direct messages, use other participant's name)
        let title = conv.title;
        if (!title && conv.type === "direct") {
          const otherParticipant = processedParticipants.find(p => p.userId !== userId);
          title = (otherParticipant as any)?.User?.displayName || "Anonymous User";
        }

        return {
          id: conv.id,
          type: conv.type,
          title,
          isAnonymous: conv.isAnonymous,
          lastActivity: conv.lastActivity,
          metadata: conv.metadata,
          participants: processedParticipants,
          lastMessage: conv.Messages[0] || null,
          unreadCount,
          isMuted: userParticipant?.isMuted || false,
        };
      })
    );

    // Filter by unread if requested
    const filteredConversations = params.unreadOnly
      ? processedConversations.filter(c => c.unreadCount > 0)
      : processedConversations;

    const totalCount = await prisma.conversation.count({
      where: {
        type: params.type,
        Participants: {
          some: participantWhere,
        },
      },
    });

    return NextResponse.json({
      conversations: filteredConversations,
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
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
  });
}

// POST /api/messaging/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    
    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = createConversationSchema.parse(body);

    // Ensure user is included in participants
    const allParticipantIds = Array.from(new Set([userId, ...validatedData.participantIds]));

    // For direct messages, ensure only 2 participants
    if (validatedData.type === "direct" && allParticipantIds.length !== 2) {
      return NextResponse.json(
        { error: "Direct conversations must have exactly 2 participants" },
        { status: 400 }
      );
    }

    // Check if users exist and are active
    const users = await prisma.user.findMany({
      where: {
        id: { in: allParticipantIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length !== allParticipantIds.length) {
      return NextResponse.json(
        { error: "One or more participants not found or inactive" },
        { status: 400 }
      );
    }

    // For direct messages, check if conversation already exists
    if (validatedData.type === "direct") {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: "direct",
          Participants: {
            every: {
              userId: { in: allParticipantIds },
            },
          },
        },
        include: {
          Participants: {
            where: { userId },
          },
        },
      });

      if (existingConversation) {
        // Reactivate if user had left
        const userParticipant = existingConversation.Participants[0];
        if (userParticipant && !userParticipant.isActive) {
          await prisma.conversationParticipant.update({
            where: { id: userParticipant.id },
            data: {
              isActive: true,
              leftAt: null,
              joinedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          message: "Conversation already exists",
          conversationId: existingConversation.id,
        });
      }
    }

    // Create anonymous identities if needed
    if (validatedData.isAnonymous) {
      for (const participantId of allParticipantIds) {
        const hasIdentity = await prisma.anonymousIdentity.findUnique({
          where: { userId: participantId },
        });

        if (!hasIdentity) {
          const themes = ["Supportive", "Caring", "Listening", "Understanding", "Helpful"];
          const icons = ["Heart", "Star", "Moon", "Sun", "Cloud"];
          const randomTheme = themes[Math.floor(Math.random() * themes.length)];
          const randomIcon = icons[Math.floor(Math.random() * icons.length)];
          const randomNumber = Math.floor(Math.random() * 1000);

          await prisma.anonymousIdentity.create({
        data: {
          id: crypto.randomUUID(),
              userId: participantId,
              displayName: `${randomTheme}${randomIcon}${randomNumber}`,
              avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${participantId}`,
              colorTheme: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
              trustScore: 0.5,
              badges: [],
              languages: ["en"],
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    // Create the conversation
    const conversation = await prisma.conversation.create({
        data: {
          id: crypto.randomUUID(),
        type: validatedData.type,
        title: validatedData.title,
        isAnonymous: validatedData.isAnonymous,
        metadata: validatedData.metadata || {},
        lastActivity: new Date(),
        updatedAt: new Date(),
        Participants: {
          create: allParticipantIds.map(participantId => ({
            id: crypto.randomUUID(),
            userId: participantId,
            role: participantId === userId ? "member" : "member",
            isActive: true,
          })),
        },
      },
      include: {
        Participants: {
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                AnonymousIdentity: {
                  select: {
                    displayName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Send system message for group conversations
    if (validatedData.type === "group") {
      await prisma.directMessage.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          senderId: userId,
          content: `${validatedData.isAnonymous ? "Anonymous user" : "User"} created the group`,
          type: "system",
        },
      });
    }

    return NextResponse.json({
      message: "Conversation created successfully",
      conversation: {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        isAnonymous: conversation.isAnonymous,
        participants: conversation.Participants.length,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
  });
}

// PUT /api/messaging/conversations - Update conversation settings
export async function PUT(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const conversationId = searchParams.get("id");
    const action = searchParams.get("action"); // mute, unmute, leave, etc.

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Check if user is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Handle specific actions
    if (action === "mute") {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { isMuted: true },
      });

      return NextResponse.json({
        message: "Conversation muted successfully",
      });
    } else if (action === "unmute") {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { isMuted: false },
      });

      return NextResponse.json({
        message: "Conversation unmuted successfully",
      });
    } else if (action === "leave") {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      // Add system message
      await prisma.directMessage.create({
        data: {
          id: crypto.randomUUID(),
          conversationId,
          senderId: userId,
          content: "Left the conversation",
          type: "system",
        },
      });

      return NextResponse.json({
        message: "Left conversation successfully",
      });
    } else if (action === "mark_read") {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });

      return NextResponse.json({
        message: "Conversation marked as read",
      });
    } else {
      // Update conversation metadata
      const body = await (req as any).json();
      const validatedData = updateConversationSchema.parse(body);

      // Only allow updates for group conversations and by moderators
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      if (conversation.type !== "group" || participant.role !== "moderator") {
        return NextResponse.json(
          { error: "Only group moderators can update conversation details" },
          { status: 403 }
        );
      }

      const currentMetadata = conversation.metadata as any || {};
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          title: validatedData.title,
          metadata: validatedData.metadata ? {
            ...currentMetadata,
            ...validatedData.metadata,
          } : currentMetadata,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: "Conversation updated successfully",
        conversation: updatedConversation,
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
  });
}

// DELETE /api/messaging/conversations - Delete conversation (for user)
export async function DELETE(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Check if user is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // For direct messages, just leave the conversation
    // For group messages, remove the participant
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    // Check if all participants have left (cleanup empty conversations)
    const activeParticipants = await prisma.conversationParticipant.count({
      where: {
        conversationId,
        isActive: true,
      },
    });

    if (activeParticipants === 0) {
      // Delete the conversation and all messages if no active participants
      await prisma.$transaction([
        prisma.directMessage.deleteMany({
          where: { conversationId },
        }),
        prisma.conversationParticipant.deleteMany({
          where: { conversationId },
        }),
        prisma.conversation.delete({
          where: { id: conversationId },
        }),
      ]);
    }

    return NextResponse.json({
      message: "Conversation deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
  });
}