// Direct messaging API with CRUD operations and crisis detection
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { 
  moderateContent, 
  sanitizeContent, 
  checkContentRateLimit,
  detectCrisis 
} from "@/lib/community/moderation";
import { z } from "zod";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// WebSocket manager for real-time updates (to be implemented)
// This will be replaced with actual WebSocket implementation
const broadcastMessage = async (conversationId: string, message: any) => {
  // Placeholder for WebSocket broadcast
  // In production, this would send the message to all connected clients in the conversation
  console.log(`Broadcasting to conversation ${conversationId}:`, message);
};

// Input validation schemas
const createMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(5000),
  type: z.enum(["text", "image", "file", "system"]).optional().default("text"),
  metadata: z.object({
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    imageUrl: z.string().optional(),
  }).optional(),
});

const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const querySchema = z.object({
  conversationId: z.string(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  before: z.string().optional(), // For pagination
  after: z.string().optional(),  // For pagination
});

const reactionSchema = z.object({
  messageId: z.string(),
  emoji: z.string().min(1).max(10),
  action: z.enum(["add", "remove"]),
});

// GET /api/messaging/messages - Get messages for a conversation
export async function GET(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const params = querySchema.parse({
        conversationId: searchParams.get("conversationId"),
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        before: searchParams.get("before"),
        after: searchParams.get("after"),
      });

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: params.conversationId,
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

    // Build where clause for messages
    const where: any = {
      conversationId: params.conversationId,
      isDeleted: false,
    };

    // Handle cursor-based pagination
    if (params.before) {
      where.createdAt = { lt: new Date(params.before) };
    } else if (params.after) {
      where.createdAt = { gt: new Date(params.after) };
    }

    // Get messages with sender info
    const messages = await prisma.directMessage.findMany({
      where,
      take: params.limit,
      orderBy: { createdAt: params.after ? "asc" : "desc" },
      include: {
        Sender: {
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
    });

    // Get conversation info for anonymous mode
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      select: { isAnonymous: true },
    });

    // Process messages for anonymous mode
    const processedMessages = messages.map(message => {
      const { Sender, ...messageData } = message;
      
      const processedMessage: any = {
        ...messageData,
        isOwn: message.senderId === userId,
      };

      if (conversation?.isAnonymous && Sender?.AnonymousIdentity) {
        processedMessage.sender = {
          displayName: Sender.AnonymousIdentity.displayName,
          avatar: Sender.AnonymousIdentity.avatar,
          isAnonymous: true,
        };
      } else if (Sender) {
        processedMessage.sender = {
          id: Sender.id,
          displayName: Sender.displayName,
          avatar: Sender.avatarUrl,
          isAnonymous: false,
        };
      }

      return processedMessage;
    });

    // Update last read timestamp
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    // Reverse messages if fetching older messages (they were retrieved in desc order)
    const finalMessages = params.after ? processedMessages : processedMessages.reverse();

    return NextResponse.json({
      messages: finalMessages,
      hasMore: messages.length === params.limit,
      conversation: {
        id: params.conversationId,
        isAnonymous: conversation?.isAnonymous,
      },
    });

      } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }
  });
}

// POST /api/messaging/messages - Send a new message
export async function POST(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;

      // Check rate limiting
      if (!checkContentRateLimit(userId, 30)) { // 30 messages per minute
        return NextResponse.json(
          { error: "Rate limit exceeded. Please slow down." },
          { status: 429 }
        );
      }

      // Parse and validate input
      const body = await (req as any).json();
      const validatedData = createMessageSchema.parse(body);

      // Verify user is a participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: validatedData.conversationId,
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

      // Get conversation details
      const conversation = await prisma.conversation.findUnique({
        where: { id: validatedData.conversationId },
        include: {
          Participants: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // Sanitize content for text messages
      let processedContent = validatedData.content;
      if (validatedData.type === "text") {
        processedContent = sanitizeContent(validatedData.content);

        // Moderate content
        const moderationResult = await moderateContent(
          processedContent,
          userId,
          "message"
        );

        // Handle crisis detection
        if (moderationResult.crisisDetected) {
          // Create crisis alert for high-risk content
          if (moderationResult.crisisLevel === "high") {
            await prisma.safetyAlert.create({
              data: {
                id: crypto.randomUUID(),
                type: "crisis_message",
                severity: "high",
                userId,
                context: `Private message in conversation`,
                indicators: moderationResult.reasons,
                handled: false,
                actions: moderationResult.suggestedActions,
              },
            });

            // Notify crisis counselors for support conversations
            if (conversation.type === "support") {
              await prisma.notification.create({
                data: {
                  id: crypto.randomUUID(),
                  userId,
                  type: "crisis_intervention",
                  title: "Crisis Support Needed",
                  message: "A user in a support conversation may need immediate help",
                  isPriority: true,
                  metadata: JSON.stringify({
                    conversationId: conversation.id,
                    level: moderationResult.crisisLevel,
                  }),
                },
              });
            }
            // Add crisis resources to metadata - extend the metadata object
            const extendedMetadata = {
              ...validatedData.metadata,
              crisisDetected: true,
              interventions: moderationResult.suggestedActions,
            };
            validatedData.metadata = extendedMetadata as any;
          }
        }

        // Block spam in public/group conversations
        if (moderationResult.spamDetected && conversation.type !== "direct") {
          return NextResponse.json(
            { error: "Message blocked due to spam detection" },
            { status: 400 }
          );
        }
      }

      // Create the message
      const message = await prisma.directMessage.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: validatedData.conversationId,
          senderId: userId,
          content: processedContent,
          type: validatedData.type,
          metadata: validatedData.metadata || {},
          reactions: [],
        },
        include: {
          Sender: {
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
      });

      // Update conversation last activity
      await prisma.conversation.update({
        where: { id: validatedData.conversationId },
        data: { lastActivity: new Date() },
      });

      // Create notifications for other participants
      const otherParticipants = conversation.Participants.filter(p => p.userId !== userId);
      
      for (const participant of otherParticipants) {
        // Check if participant has muted the conversation
        const participantSettings = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: validatedData.conversationId,
            userId: participant.userId,
          },
          select: { isMuted: true },
        });

        if (!participantSettings?.isMuted) {
          await prisma.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: participant.userId,
              type: "new_message",
              title: conversation.isAnonymous ? "New anonymous message" : `New message from ${message.Sender?.displayName}`,
              message: validatedData.type === "text"
                ? processedContent.substring(0, 100)
                : `Sent a ${validatedData.type}`,
              metadata: JSON.stringify({
                conversationId: validatedData.conversationId,
                messageId: message.id,
                senderId: conversation.isAnonymous ? null : userId,
              }),
            },
          });
        }
      }

      // Process message for response
      const { Sender, ...messageData } = message;
      const processedMessage: any = {
        ...messageData,
        isOwn: true,
      };

      if (conversation.isAnonymous && Sender?.AnonymousIdentity) {
        processedMessage.sender = {
          displayName: Sender.AnonymousIdentity.displayName,
          avatar: Sender.AnonymousIdentity.avatar,
          isAnonymous: true,
        };
      } else if (Sender) {
        processedMessage.sender = {
          id: Sender.id,
          displayName: Sender.displayName,
          avatar: Sender.avatarUrl,
          isAnonymous: false,
        };
      }

      // Broadcast message to connected clients (WebSocket)
      await broadcastMessage(validatedData.conversationId, processedMessage);

      return NextResponse.json({
        message: "Message sent successfully",
        data: processedMessage,
      }, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }
  });
}

// PUT /api/messaging/messages - Edit or react to a message
export async function PUT(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const messageId = searchParams.get("id");
      const action = searchParams.get("action"); // edit, react

      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required" },
          { status: 400 }
        );
      }

      // Get the message
      const message = await prisma.directMessage.findUnique({
        where: { id: messageId },
        include: {
          Conversation: {
            include: {
              Participants: {
                where: { userId, isActive: true },
              },
            },
          },
        },
      });

      if (!message) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      if (message.isDeleted) {
        return NextResponse.json(
          { error: "Cannot modify deleted message" },
          { status: 400 }
        );
      }

      // Verify user is a participant
      if (message.Conversation.Participants.length === 0) {
        return NextResponse.json(
          { error: "You are not a participant in this conversation" },
          { status: 403 }
        );
      }

      if (action === "react") {
        // Handle reaction
        const body = await (req as any).json();
        const { emoji, action: reactionAction } = reactionSchema.parse({
          messageId,
          ...body,
        });

        const currentReactions = (message.reactions as any[]) || [];
        let updatedReactions = [...currentReactions];

        if (reactionAction === "add") {
          // Check if user already reacted with this emoji
          const existingReaction = updatedReactions.find(
            r => r.userId === userId && r.emoji === emoji
          );

          if (!existingReaction) {
            updatedReactions.push({
              userId,
              emoji,
              timestamp: new Date(),
            });
          }
        } else {
          // Remove reaction
          updatedReactions = updatedReactions.filter(
            r => !(r.userId === userId && r.emoji === emoji)
          );
        }

        const updatedMessage = await prisma.directMessage.update({
          where: { id: messageId },
          data: { reactions: updatedReactions },
        });

        // Broadcast reaction update
        await broadcastMessage(message.conversationId, {
          type: "reaction_update",
          messageId,
          reactions: updatedReactions,
        });

        return NextResponse.json({
          message: "Reaction updated successfully",
          reactions: updatedReactions,
        });
      } else {
        // Handle edit - only sender can edit
        if (message.senderId !== userId) {
          return NextResponse.json(
            { error: "You can only edit your own messages" },
            { status: 403 }
          );
        }

        // Check if message is too old to edit (24 hours)
        const messageAge = Date.now() - message.createdAt.getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (messageAge > twentyFourHours) {
          return NextResponse.json(
            { error: "Messages can only be edited within 24 hours" },
            { status: 400 }
          );
        }

        const body = await (req as any).json();
        const { content } = updateMessageSchema.parse(body);

        // Sanitize and moderate new content
        const sanitizedContent = sanitizeContent(content);
        const moderationResult = await moderateContent(sanitizedContent, userId, "message");

        if (moderationResult.spamDetected || moderationResult.inappropriateContent) {
          return NextResponse.json(
            { error: "Edit blocked due to content violations" },
            { status: 400 }
          );
        }

        const updatedMessage = await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            content: sanitizedContent,
            isEdited: true,
            editedAt: new Date(),
          },
        });

        // Broadcast edit
        await broadcastMessage(message.conversationId, {
          type: "message_edited",
          messageId,
          content: sanitizedContent,
          editedAt: updatedMessage.editedAt,
        });

        return NextResponse.json({
          message: "Message edited successfully",
          data: updatedMessage,
        });
      }

      } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error updating message:", error);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/messaging/messages - Delete a message
export async function DELETE(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const messageId = searchParams.get("id");

      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required" },
          { status: 400 }
        );
      }

      // Get the message
      const message = await prisma.directMessage.findUnique({
        where: { id: messageId },
        include: {
          Conversation: {
            include: {
              Participants: {
                where: { userId, isActive: true },
              },
            },
          },
        },
      });

      if (!message) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      // Verify user is the sender
      if (message.senderId !== userId) {
        return NextResponse.json(
          { error: "You can only delete your own messages" },
          { status: 403 }
        );
      }

      // Verify user is still a participant
      if (message.Conversation.Participants.length === 0) {
        return NextResponse.json(
          { error: "You are not a participant in this conversation" },
          { status: 403 }
        );
      }

      // Soft delete the message
      const updatedMessage = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          content: "[This message has been deleted]",
        },
      });

      // Broadcast deletion
      await broadcastMessage(message.conversationId, {
        type: "message_deleted",
        messageId,
      });

      return NextResponse.json({
        message: "Message deleted successfully",
      });

      } catch (error) {
      console.error("Error deleting message:", error);
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }
  });
}