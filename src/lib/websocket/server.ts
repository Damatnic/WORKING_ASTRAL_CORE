/**
 * WebSocket Server Implementation
 * Core server logic for real-time communication
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket, Namespace } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  EventCategory,
  MessageEvent,
  CrisisEvent,
  NotificationEvent,
  PresenceEvent,
  RoomEvent,
  SystemEvent,
  TypingEvent,
  ModerationEvent,
  SocketAuth,
  SocketResponse,
  Message,
  CrisisAlert,
  Notification,
  Room,
  UserPresence,
  PresenceStatus,
  MessagePayload,
  RoomJoinPayload,
  CrisisAlertPayload,
  NotificationPayload,
  TypingPayload,
  PERMISSION_MATRIX,
  CrisisSeverity,
  CrisisStatus,
  MessageType,
  NotificationPriority,
  NotificationType,
  RoomType,
} from "./events";
import { validateMessage, detectCrisisTriggers, moderateContent } from "./middleware";
import { RateLimiter } from "./rate-limiter";
import { MessageQueue } from "./message-queue";
import { PresenceManager } from "./presence-manager";
import { CrisisManager } from "./crisis-manager";
import { NotificationManager } from "./notification-manager";
import crypto from "crypto";

// Socket Server Configuration
export interface SocketServerConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  transports: string[];
  allowEIO3: boolean;
}

// Extended Socket Interface
interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
  isAnonymous?: boolean;
  anonymousId?: string;
  role?: UserRole;
  permissions?: string[];
  rooms: Set<string>;
  rateLimiter?: RateLimiter;
  // Override id property
  id: string;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUserMap: Map<string, string> = new Map(); // socketId -> userId
  private anonymousSessions: Map<string, string> = new Map(); // anonymousId -> temporaryUserId
  private messageQueue: MessageQueue;
  private presenceManager: PresenceManager;
  private crisisManager: CrisisManager;
  private notificationManager: NotificationManager;
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(httpServer: HTTPServer, config?: Partial<SocketServerConfig>) {
    const defaultConfig: SocketServerConfig = {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100 MB
      transports: ["websocket", "polling"],
      allowEIO3: true,
    };

    this.io = new SocketIOServer(httpServer, { ...defaultConfig, ...config });

    // Initialize managers
    this.messageQueue = new MessageQueue();
    this.presenceManager = new PresenceManager();
    this.crisisManager = new CrisisManager(this);
    this.notificationManager = new NotificationManager(this);

    // Setup admin UI in development
    if (process.env.NODE_ENV === "development") {
      instrument(this.io, {
        auth: {
          type: "basic",
          username: process.env.SOCKETIO_ADMIN_USER || "admin",
          password: process.env.SOCKETIO_ADMIN_PASSWORD || "admin",
        },
        mode: "development",
      });
    }

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Middleware Setup
  private setupMiddleware(): void {
    // Authentication middleware
    (this.io as any).use(async (socket: Socket, next: any) => {
      const authSocket = socket as AuthenticatedSocket;
      
      try {
        const token = socket.handshake.auth.token;
        const isAnonymous = socket.handshake.auth.isAnonymous === true;

        if (isAnonymous) {
          // Handle anonymous users
          const anonymousId = this.generateAnonymousId();
          authSocket.isAnonymous = true;
          authSocket.anonymousId = anonymousId;
          authSocket.userId = `anon_${anonymousId}`;
          authSocket.role = UserRole.USER;
          authSocket.permissions = PERMISSION_MATRIX[UserRole.USER];
          
          this.anonymousSessions.set(anonymousId, authSocket.userId);
          
          console.log(`Anonymous user connected: ${anonymousId}`);
          next();
        } else if (token) {
          // Verify JWT token
          const decoded = jwt.verify(
            token,
            process.env.NEXTAUTH_SECRET || "secret"
          ) as any;

          if (decoded.sub) {
            // Fetch user details
            const user = await prisma.user.findUnique({
              where: { id: decoded.sub },
              select: {
                id: true,
                role: true,
                isActive: true,
                lockedUntil: true,
              },
            });

            if (!user || !user.isActive) {
              throw new Error("User not found or inactive");
            }

            if (user.lockedUntil && user.lockedUntil > new Date()) {
              throw new Error("Account is locked");
            }

            authSocket.userId = user.id;
            authSocket.sessionId = decoded.sessionToken;
            authSocket.role = user.role;
            authSocket.permissions = PERMISSION_MATRIX[user.role];
            authSocket.isAnonymous = false;

            // Update last active
            await prisma.user.update({
              where: { id: user.id },
              data: { lastActiveAt: new Date() },
            });

            console.log(`Authenticated user connected: ${user.id}`);
            next();
          } else {
            throw new Error("Invalid token");
          }
        } else {
          throw new Error("No authentication provided");
        }
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });

    // Rate limiting middleware
    (this.io as any).use((socket: Socket, next: any) => {
      const authSocket = socket as AuthenticatedSocket;
      const identifier = authSocket.userId || authSocket.id;
      
      if (!this.rateLimiters.has(identifier)) {
        this.rateLimiters.set(identifier, new RateLimiter(identifier));
      }
      
      authSocket.rateLimiter = this.rateLimiters.get(identifier);
      next();
    });
  }

  // Main Event Handlers
  private setupEventHandlers(): void {
    (this.io as any).on("connection", (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      
      // Track connection
      this.handleConnection(authSocket);

      // System Events
      (authSocket as any).on(SystemEvent.HEARTBEAT, () => this.handleHeartbeat(authSocket));
      (authSocket as any).on(SystemEvent.DISCONNECT, () => this.handleDisconnection(authSocket));

      // Message Events
      (authSocket as any).on(MessageEvent.SEND, (data: MessagePayload, callback: (response: SocketResponse<Message>) => void) =>
        this.handleMessageSend(authSocket, data, callback)
      );
      (authSocket as any).on(MessageEvent.EDIT, (data: { messageId: string; content: string }, callback: (response: SocketResponse) => void) =>
        this.handleMessageEdit(authSocket, data, callback)
      );
      (authSocket as any).on(MessageEvent.DELETE, (data: { messageId: string }, callback: (response: SocketResponse) => void) =>
        this.handleMessageDelete(authSocket, data, callback)
      );
      (authSocket as any).on(MessageEvent.REACT, (data: any, callback) =>
        this.handleMessageReact(authSocket, data, callback)
      );
      (authSocket as any).on(MessageEvent.DELIVERED, (data: any) =>
        this.handleMessageDelivered(authSocket, data)
      );
      (authSocket as any).on(MessageEvent.READ, (data: any) =>
        this.handleMessageRead(authSocket, data)
      );

      // Crisis Events
      (authSocket as any).on(CrisisEvent.ALERT, (data: CrisisAlertPayload, callback) =>
        this.handleCrisisAlert(authSocket, data, callback)
      );
      (authSocket as any).on(CrisisEvent.REQUEST_HELP, (data: any, callback) =>
        this.handleCrisisHelpRequest(authSocket, data, callback)
      );
      (authSocket as any).on(CrisisEvent.COUNSELOR_AVAILABLE, (data: any) =>
        this.handleCounselorAvailability(authSocket, true, data)
      );
      (authSocket as any).on(CrisisEvent.COUNSELOR_BUSY, (data: any) =>
        this.handleCounselorAvailability(authSocket, false, data)
      );

      // Room Events
      (authSocket as any).on(RoomEvent.JOIN, (data: RoomJoinPayload, callback) =>
        this.handleRoomJoin(authSocket, data, callback)
      );
      (authSocket as any).on(RoomEvent.LEAVE, (data: any, callback) =>
        this.handleRoomLeave(authSocket, data, callback)
      );
      (authSocket as any).on(RoomEvent.CREATE, (data: any, callback) =>
        this.handleRoomCreate(authSocket, data, callback)
      );
      (authSocket as any).on(RoomEvent.PARTICIPANTS, (data: any, callback) =>
        this.handleGetParticipants(authSocket, data, callback)
      );

      // Presence Events
      (authSocket as any).on(PresenceEvent.UPDATE, (data: any) =>
        this.handlePresenceUpdate(authSocket, data)
      );

      // Typing Events
      (authSocket as any).on(TypingEvent.START, (data: TypingPayload) =>
        this.handleTypingStart(authSocket, data)
      );
      (authSocket as any).on(TypingEvent.STOP, (data: TypingPayload) =>
        this.handleTypingStop(authSocket, data)
      );

      // Notification Events
      (authSocket as any).on(NotificationEvent.ACKNOWLEDGE, (data: any) =>
        this.handleNotificationAcknowledge(authSocket, data)
      );

      // Moderation Events (Admin only)
      if (authSocket.role && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(authSocket.role)) {
        (authSocket as any).on(ModerationEvent.USER_KICK, (data: any, callback) =>
          this.handleUserKick(authSocket, data, callback)
        );
        (authSocket as any).on(ModerationEvent.USER_BAN, (data: any, callback) =>
          this.handleUserBan(authSocket, data, callback)
        );
      }
    });
  }

  // Connection Management
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    // Track socket connection
    this.socketUserMap.set(socket.id, userId);
    
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socket.id);

    // Update presence
    this.presenceManager.setUserOnline(userId, socket.id);

    // Send connection success
    (socket as any).emit(SystemEvent.AUTH_SUCCESS, {
      userId,
      sessionId: socket.sessionId,
      isAnonymous: socket.isAnonymous,
      role: socket.role,
    });

    // Deliver queued messages
    this.deliverQueuedMessages(socket);

    // Notify others of presence
    this.broadcastPresence(userId, PresenceStatus.ONLINE);

    console.log(`User ${userId} connected with socket ${socket.id}`);
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    // Remove socket tracking
    this.socketUserMap.delete(socket.id);
    
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      // If no more sockets for this user
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        this.presenceManager.setUserOffline(userId);
        this.broadcastPresence(userId, PresenceStatus.OFFLINE);
        
        // Clean up anonymous session
        if (socket.isAnonymous && socket.anonymousId) {
          this.anonymousSessions.delete(socket.anonymousId);
        }
      }
    }

    // Clean up rate limiter
    if (userSockets?.size === 0) {
      const identifier = socket.userId || socket.id;
      this.rateLimiters.delete(identifier);
    }

    console.log(`User ${userId} disconnected from socket ${socket.id}`);
  }

  private handleHeartbeat(socket: AuthenticatedSocket): void {
    (socket as any).emit(SystemEvent.HEARTBEAT, { timestamp: new Date() });
    this.presenceManager.updateLastSeen(socket.userId!);
  }

  // Message Handlers
  private async handleMessageSend(
    socket: AuthenticatedSocket,
    data: MessagePayload,
    callback: (response: SocketResponse<Message>) => void
  ): Promise<void> {
    try {
      // Rate limiting
      if (!socket.rateLimiter!.checkLimit("message")) {
        return callback({
          success: false,
          error: {
            code: "RATE_LIMIT",
            message: "Too many messages. Please slow down.",
          },
          timestamp: new Date(),
        });
      }

      // Validate message
      const validation = await validateMessage(data, socket.userId!);
      if (!validation.valid) {
        return callback({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error!,
          },
          timestamp: new Date(),
        });
      }

      // Check room membership
      if (!socket.rooms.has(data.roomId)) {
        return callback({
          success: false,
          error: {
            code: "NOT_IN_ROOM",
            message: "You must join the room first",
          },
          timestamp: new Date(),
        });
      }

      // Content moderation
      const moderation = await moderateContent(data.content);
      if (moderation.flagged) {
        // Handle flagged content
        if (moderation.severity === "high") {
          return callback({
            success: false,
            error: {
              code: "CONTENT_BLOCKED",
              message: "Message contains inappropriate content",
            },
            timestamp: new Date(),
          });
        }
        
        // Flag for review but allow for lower severity
        this.io.to("moderators").emit(ModerationEvent.CONTENT_FLAGGED, {
          userId: socket.userId,
          content: data.content,
          reason: moderation.reason,
        });
      }

      // Crisis detection
      const crisisTriggers = await detectCrisisTriggers(data.content);
      if (crisisTriggers.detected) {
        this.crisisManager.handlePotentialCrisis(socket.userId!, crisisTriggers);
      }

      // Create message
      const message: Message = {
        id: this.generateMessageId(),
        roomId: data.roomId,
        authorId: socket.userId!,
        authorName: socket.isAnonymous ? `Anonymous ${socket.anonymousId?.slice(0, 8)}` : undefined,
        content: data.content,
        type: data.type || MessageType.TEXT,
        timestamp: new Date(),
        delivered: false,
        read: false,
        reactions: [],
        replyTo: data.replyTo,
        attachments: data.attachments,
        metadata: data.metadata,
      };

      // Store message in database (async)
      this.storeMessage(message);

      // Broadcast to room
      (socket as any).to(data.roomId).emit(MessageEvent.RECEIVE, message);

      // Send success response
      callback({
        success: true,
        data: message,
        timestamp: new Date(),
      });

      // Update delivery status
      this.updateMessageDeliveryStatus(message.id, data.roomId);

    } catch (error) {
      console.error("Error sending message:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to send message",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleMessageEdit(
    socket: AuthenticatedSocket,
    data: { messageId: string; content: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      // Verify message ownership
      const message = await this.getMessage(data.messageId);
      if (!message || message.authorId !== socket.userId) {
        return callback({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You can only edit your own messages",
          },
          timestamp: new Date(),
        });
      }

      // Update message
      const updatedMessage = {
        ...message,
        content: data.content,
        edited: true,
        editedAt: new Date(),
      };

      // Store update
      await this.updateMessage(updatedMessage);

      // Broadcast edit
      (socket as any).to(message.roomId).emit(MessageEvent.EDIT, {
        messageId: data.messageId,
        content: data.content,
        editedAt: updatedMessage.editedAt,
      });

      callback({
        success: true,
        data: updatedMessage,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error editing message:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to edit message",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleMessageDelete(
    socket: AuthenticatedSocket,
    data: { messageId: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      // Verify ownership or admin
      const message = await this.getMessage(data.messageId);
      if (!message) {
        return callback({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Message not found",
          },
          timestamp: new Date(),
        });
      }

      const canDelete = message.authorId === socket.userId ||
        socket.role === UserRole.ADMIN ||
        socket.role === UserRole.SUPER_ADMIN;

      if (!canDelete) {
        return callback({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You cannot delete this message",
          },
          timestamp: new Date(),
        });
      }

      // Delete message
      await this.deleteMessage(data.messageId);

      // Broadcast deletion
      (socket as any).to(message.roomId).emit(MessageEvent.DELETE, {
        messageId: data.messageId,
      });

      callback({
        success: true,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error deleting message:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete message",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleMessageReact(
    socket: AuthenticatedSocket,
    data: { messageId: string; emoji: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      const message = await this.getMessage(data.messageId);
      if (!message) {
        return callback({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Message not found",
          },
          timestamp: new Date(),
        });
      }

      // Add or remove reaction
      const existingReaction = message.reactions?.find(
        r => r.userId === socket.userId && r.emoji === data.emoji
      );

      if (existingReaction) {
        // Remove reaction
        message.reactions = message.reactions?.filter(
          r => !(r.userId === socket.userId && r.emoji === data.emoji)
        );
      } else {
        // Add reaction
        if (!message.reactions) message.reactions = [];
        message.reactions.push({
          emoji: data.emoji,
          userId: socket.userId!,
          timestamp: new Date(),
        });
      }

      // Update message
      await this.updateMessage(message);

      // Broadcast reaction
      (socket as any).to(message.roomId).emit(MessageEvent.REACT, {
        messageId: data.messageId,
        reactions: message.reactions,
      });

      callback({
        success: true,
        data: message.reactions,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error reacting to message:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to react to message",
        },
        timestamp: new Date(),
      });
    }
  }

  private handleMessageDelivered(
    socket: AuthenticatedSocket,
    data: { messageId: string }
  ): void {
    // Update delivery status
    this.updateMessageDeliveryStatus(data.messageId, null, true);
  }

  private handleMessageRead(
    socket: AuthenticatedSocket,
    data: { messageIds: string[] }
  ): void {
    // Update read status for multiple messages
    data.messageIds.forEach(messageId => {
      this.updateMessageReadStatus(messageId, socket.userId!);
    });
  }

  // Crisis Handlers
  private async handleCrisisAlert(
    socket: AuthenticatedSocket,
    data: CrisisAlertPayload,
    callback: (response: SocketResponse<CrisisAlert>) => void
  ): Promise<void> {
    try {
      // Rate limiting for crisis alerts
      if (!socket.rateLimiter!.checkLimit("crisis")) {
        return callback({
          success: false,
          error: {
            code: "RATE_LIMIT",
            message: "Crisis alert rate limit reached. If this is an emergency, please call 911.",
          },
          timestamp: new Date(),
        });
      }

      const alert = await this.crisisManager.createAlert(socket.userId!, data);

      callback({
        success: true,
        data: alert,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error creating crisis alert:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create crisis alert",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleCrisisHelpRequest(
    socket: AuthenticatedSocket,
    data: any,
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      const result = await this.crisisManager.requestHelp(socket.userId!, data);
      callback({
        success: true,
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error requesting crisis help:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to request help",
        },
        timestamp: new Date(),
      });
    }
  }

  private handleCounselorAvailability(
    socket: AuthenticatedSocket,
    available: boolean,
    data: any
  ): void {
    if (socket.role !== UserRole.CRISIS_COUNSELOR &&
        socket.role !== UserRole.THERAPIST &&
        socket.role !== UserRole.ADMIN &&
        socket.role !== UserRole.SUPER_ADMIN) {
      return;
    }

    this.crisisManager.updateCounselorAvailability(socket.userId!, available);
  }

  // Room Handlers
  private async handleRoomJoin(
    socket: AuthenticatedSocket,
    data: RoomJoinPayload,
    callback: (response: SocketResponse<Room>) => void
  ): Promise<void> {
    try {
      // Check room exists and user can join
      const room = await this.getRoom(data.roomId);
      if (!room) {
        return callback({
          success: false,
          error: {
            code: "ROOM_NOT_FOUND",
            message: "Room does not exist",
          },
          timestamp: new Date(),
        });
      }

      // Check if banned
      if (room.bannedUsers.includes(socket.userId!)) {
        return callback({
          success: false,
          error: {
            code: "BANNED",
            message: "You are banned from this room",
          },
          timestamp: new Date(),
        });
      }

      // Check capacity
      if (room.currentParticipants >= room.maxParticipants) {
        return callback({
          success: false,
          error: {
            code: "ROOM_FULL",
            message: "Room is full",
          },
          timestamp: new Date(),
        });
      }

      // Join room
      (socket as any).join(data.roomId);
      socket.rooms.add(data.roomId);

      // Update room participants
      await this.addRoomParticipant(data.roomId, socket.userId!);

      // Notify others
      (socket as any).to(data.roomId).emit(RoomEvent.JOIN, {
        userId: socket.userId,
        roomId: data.roomId,
      });

      callback({
        success: true,
        data: room,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error joining room:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to join room",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleRoomLeave(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      // Leave room
      (socket as any).leave(data.roomId);
      socket.rooms.delete(data.roomId);

      // Update room participants
      await this.removeRoomParticipant(data.roomId, socket.userId!);

      // Notify others
      (socket as any).to(data.roomId).emit(RoomEvent.LEAVE, {
        userId: socket.userId,
        roomId: data.roomId,
      });

      callback({
        success: true,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error leaving room:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to leave room",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleRoomCreate(
    socket: AuthenticatedSocket,
    data: Partial<Room>,
    callback: (response: SocketResponse<Room>) => void
  ): Promise<void> {
    try {
      // Check permissions
      if (!socket.permissions?.includes(RoomEvent.CREATE)) {
        return callback({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You don't have permission to create rooms",
          },
          timestamp: new Date(),
        });
      }

      // Create room
      const room = await this.createRoom({
        ...data,
        createdBy: socket.userId!,
      });

      // Auto-join creator
      (socket as any).join(room.id);
      socket.rooms.add(room.id);

      callback({
        success: true,
        data: room,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error creating room:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create room",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleGetParticipants(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      const participants = await this.getRoomParticipants(data.roomId);
      callback({
        success: true,
        data: participants,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error getting participants:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get participants",
        },
        timestamp: new Date(),
      });
    }
  }

  // Presence Handlers
  private handlePresenceUpdate(
    socket: AuthenticatedSocket,
    data: Partial<UserPresence>
  ): void {
    this.presenceManager.updatePresence(socket.userId!, data);
    this.broadcastPresence(socket.userId!, data.status || PresenceStatus.ONLINE);
  }

  // Typing Handlers
  private handleTypingStart(
    socket: AuthenticatedSocket,
    data: TypingPayload
  ): void {
    (socket as any).to(data.roomId).emit(TypingEvent.START, {
      userId: socket.userId,
      roomId: data.roomId,
    });
  }

  private handleTypingStop(
    socket: AuthenticatedSocket,
    data: TypingPayload
  ): void {
    (socket as any).to(data.roomId).emit(TypingEvent.STOP, {
      userId: socket.userId,
      roomId: data.roomId,
    });
  }

  // Notification Handlers
  private handleNotificationAcknowledge(
    socket: AuthenticatedSocket,
    data: { notificationId: string }
  ): void {
    this.notificationManager.acknowledgeNotification(
      socket.userId!,
      data.notificationId
    );
  }

  // Moderation Handlers
  private async handleUserKick(
    socket: AuthenticatedSocket,
    data: { userId: string; roomId: string; reason?: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      // Check permissions
      if (!socket.permissions?.includes(RoomEvent.KICK)) {
        return callback({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You don't have permission to kick users",
          },
          timestamp: new Date(),
        });
      }

      // Get target user's sockets
      const targetSockets = this.connectedUsers.get(data.userId);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          const targetSocket = (this.io as any).sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.leave(data.roomId);
            targetSocket.emit(RoomEvent.KICK, {
              roomId: data.roomId,
              reason: data.reason,
            });
          }
        });
      }

      // Remove from room participants
      await this.removeRoomParticipant(data.roomId, data.userId);

      callback({
        success: true,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error kicking user:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to kick user",
        },
        timestamp: new Date(),
      });
    }
  }

  private async handleUserBan(
    socket: AuthenticatedSocket,
    data: { userId: string; roomId: string; reason?: string },
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      // Check permissions
      if (!socket.permissions?.includes(RoomEvent.BAN)) {
        return callback({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You don't have permission to ban users",
          },
          timestamp: new Date(),
        });
      }

      // Kick user first
      await this.handleUserKick(socket, data, () => {});

      // Add to banned list
      await this.banUserFromRoom(data.roomId, data.userId);

      callback({
        success: true,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error banning user:", error);
      callback({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to ban user",
        },
        timestamp: new Date(),
      });
    }
  }

  // Helper Methods
  private generateAnonymousId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private async deliverQueuedMessages(socket: AuthenticatedSocket): Promise<void> {
    const messages = await this.messageQueue.getQueuedMessages(socket.userId!);
    messages.forEach(message => {
      (socket as any).emit(MessageEvent.RECEIVE, message);
    });
  }

  private broadcastPresence(userId: string, status: PresenceStatus): void {
    this.io.emit(PresenceEvent.UPDATE, {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  // Database Operations (stubs - implement with Prisma)
  private async storeMessage(message: Message): Promise<void> {
    // Store in database
    await prisma.chatMessage.create({
      data: {
        id: message.id,
        roomId: message.roomId,
        authorId: message.authorId,
        content: message.content,
        type: message.type,
        metadata: message.metadata,
        reactions: message.reactions || [],
      },
    });
  }

  private async getMessage(messageId: string): Promise<Message | null> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    
    if (!message) return null;
    
    return {
      id: message.id,
      roomId: message.roomId,
      authorId: message.authorId,
      content: message.content,
      type: message.type as MessageType,
      timestamp: message.createdAt,
      edited: message.edited,
      editedAt: message.editedAt || undefined,
      reactions: message.reactions as any[],
      metadata: message.metadata as any,
      delivered: false,
      read: false,
    };
  }

  private async updateMessage(message: Message): Promise<void> {
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: {
        content: message.content,
        edited: message.edited,
        editedAt: message.editedAt,
        reactions: message.reactions || [],
      },
    });
  }

  private async deleteMessage(messageId: string): Promise<void> {
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });
  }

  private async getRoom(roomId: string): Promise<Room | null> {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        ChatParticipant: {
          where: { isActive: true },
        },
        ChatModerator: true,
      },
    });
    
    if (!room) return null;
    
    return {
      id: room.id,
      name: room.name,
      topic: room.topic,
      description: room.description,
      type: RoomType.GROUP,
      maxParticipants: room.maxParticipants,
      currentParticipants: room.ChatParticipant.length,
      isActive: room.isActive,
      isPrivate: false,
      isAnonymous: false,
      createdBy: "",
      createdAt: room.createdAt,
      moderators: room.ChatModerator.map(m => m.userId),
      bannedUsers: [],
      settings: room.settings as any,
    };
  }

  private async createRoom(data: Partial<Room>): Promise<Room> {
    const roomId = `room_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    
    const room = await prisma.chatRoom.create({
      data: {
        id: roomId,
        name: data.name || "New Room",
        topic: data.topic || "",
        description: data.description || "",
        maxParticipants: data.maxParticipants || 20,
        isActive: true,
        settings: data.settings || {},
        rules: [],
      },
    });
    
    // Add creator as participant
    await prisma.chatParticipant.create({
      data: {
        id: crypto.randomBytes(16).toString("hex"),
        roomId: room.id,
        userId: data.createdBy!,
        isActive: true,
      },
    });
    
    return {
      id: room.id,
      name: room.name,
      topic: room.topic,
      description: room.description,
      type: data.type || RoomType.GROUP,
      maxParticipants: room.maxParticipants,
      currentParticipants: 1,
      isActive: room.isActive,
      isPrivate: data.isPrivate || false,
      isAnonymous: data.isAnonymous || false,
      createdBy: data.createdBy!,
      createdAt: room.createdAt,
      moderators: [],
      bannedUsers: [],
      settings: room.settings as any,
    };
  }

  private async addRoomParticipant(roomId: string, userId: string): Promise<void> {
    await prisma.chatParticipant.upsert({
      where: {
        roomId_userId: { roomId, userId },
      },
      update: {
        isActive: true,
        leftAt: null,
      },
      create: {
        id: crypto.randomBytes(16).toString("hex"),
        roomId,
        userId,
        isActive: true,
      },
    });
  }

  private async removeRoomParticipant(roomId: string, userId: string): Promise<void> {
    await prisma.chatParticipant.update({
      where: {
        roomId_userId: { roomId, userId },
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  private async getRoomParticipants(roomId: string): Promise<any[]> {
    const participants = await prisma.chatParticipant.findMany({
      where: {
        roomId,
        isActive: true,
      },
    });
    
    return participants.map(p => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
    }));
  }

  private async banUserFromRoom(roomId: string, userId: string): Promise<void> {
    // This would need to be implemented with a proper ban list in the database
    // For now, we'll just mark them as inactive
    await this.removeRoomParticipant(roomId, userId);
  }

  private updateMessageDeliveryStatus(
    messageId: string,
    roomId: string | null,
    delivered: boolean = false
  ): void {
    // Update delivery status in database
    // This would be implemented with proper tracking
  }

  private updateMessageReadStatus(messageId: string, userId: string): void {
    // Update read status in database
    // This would be implemented with proper tracking
  }

  // Public Methods
  public sendNotification(userId: string, notification: Notification): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(NotificationEvent.PUSH, notification);
      });
    } else {
      // Queue notification for offline user
      this.notificationManager.queueNotification(userId, notification);
    }
  }

  public broadcastCrisisAlert(alert: CrisisAlert): void {
    // Broadcast to crisis counselors
    this.io.to("crisis_counselors").emit(CrisisEvent.ALERT, alert);
    
    // Also send to admins
    this.io.to("admins").emit(CrisisEvent.ALERT, alert);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getUserSockets(userId: string): Set<string> | undefined {
    return this.connectedUsers.get(userId);
  }
}

// Singleton instance
let socketServer: WebSocketServer | null = null;

export function initializeSocketServer(httpServer: HTTPServer): WebSocketServer {
  if (!socketServer) {
    socketServer = new WebSocketServer(httpServer);
  }
  return socketServer;
}

export function getSocketServer(): WebSocketServer | null {
  return socketServer;
}