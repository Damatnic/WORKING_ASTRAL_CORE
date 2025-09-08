/**
 * WebSocket Client Implementation
 * Browser-side Socket.IO client with automatic reconnection and state management
 */

import { io, Socket } from "socket.io-client";
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
  SocketResponse,
  CrisisSeverity,
  MessageType,
} from "./events";

// Client Configuration
export interface ClientConfig {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: string[];
  auth?: {
    token?: string;
    isAnonymous?: boolean;
  };
}

// Connection State
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// Event Listeners
export type MessageListener = (message: Message) => void;
export type CrisisListener = (alert: CrisisAlert) => void;
export type NotificationListener = (notification: Notification) => void;
export type PresenceListener = (presence: UserPresence) => void;
export type RoomListener = (room: Room) => void;
export type TypingListener = (data: { userId: string; roomId: string }) => void;
export type ConnectionListener = (state: ConnectionState) => void;
export type ErrorListener = (error: Error) => void;

export class WebSocketClient {
  private socket: Socket | null = null;
  private config: ClientConfig;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: MessagePayload[] = [];
  private currentRooms: Set<string> = new Set();
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Event handlers
  private messageHandlers: Map<string, Set<MessageListener>> = new Map();
  private crisisHandlers: Set<CrisisListener> = new Set();
  private notificationHandlers: Set<NotificationListener> = new Set();
  private presenceHandlers: Set<PresenceListener> = new Set();
  private roomHandlers: Map<string, Set<RoomListener>> = new Map();
  private typingHandlers: Map<string, Set<TypingListener>> = new Map();
  private connectionHandlers: Set<ConnectionListener> = new Set();
  private errorHandlers: Set<ErrorListener> = new Set();

  // User state
  private userId: string | null = null;
  private sessionId: string | null = null;
  private isAnonymous: boolean = false;
  private userRole: string | null = null;

  constructor(config: ClientConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3000",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // Connection Management
  public connect(auth?: { token?: string; isAnonymous?: boolean }): void {
    if (this.socket?.connected) {
      console.warn("WebSocket already connected");
      return;
    }

    this.updateConnectionState(ConnectionState.CONNECTING);

    try {
      this.socket = io(this.config.url!, {
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        transports: this.config.transports,
        auth: auth || this.config.auth || {},
      });

      this.setupEventHandlers();
      this.startHeartbeat();
    } catch (error) {
      console.error("Failed to initialize WebSocket connection:", error);
      this.updateConnectionState(ConnectionState.ERROR);
      this.handleError(error as Error);
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.currentRooms.clear();
    this.messageQueue = [];
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // System Events
    this.socket.on("connect", this.handleConnect.bind(this));
    this.socket.on("disconnect", this.handleDisconnect.bind(this));
    this.socket.on("connect_error", this.handleConnectError.bind(this));
    this.socket.on(SystemEvent.AUTH_SUCCESS, this.handleAuthSuccess.bind(this));
    this.socket.on(SystemEvent.AUTH_FAILURE, this.handleAuthFailure.bind(this));
    this.socket.on(SystemEvent.HEARTBEAT, this.handleHeartbeat.bind(this));
    this.socket.on(SystemEvent.ERROR, this.handleSystemError.bind(this));

    // Message Events
    this.socket.on(MessageEvent.RECEIVE, this.handleMessageReceive.bind(this));
    this.socket.on(MessageEvent.EDIT, this.handleMessageEdit.bind(this));
    this.socket.on(MessageEvent.DELETE, this.handleMessageDelete.bind(this));
    this.socket.on(MessageEvent.REACT, this.handleMessageReact.bind(this));

    // Crisis Events
    this.socket.on(CrisisEvent.ALERT, this.handleCrisisAlert.bind(this));
    this.socket.on((CrisisEvent as any).COUNSELOR_ASSIGNED, this.handleCounselorAssigned.bind(this));
    this.socket.on(CrisisEvent.ESCALATED, this.handleCrisisEscalated.bind(this));
    this.socket.on((CrisisEvent as any).RESOLVED, this.handleCrisisResolved.bind(this));

    // Notification Events
    this.socket.on(NotificationEvent.PUSH, this.handleNotificationPush.bind(this));
    this.socket.on((NotificationEvent as any).CLEAR, this.handleNotificationClear.bind(this));

    // Presence Events
    this.socket.on(PresenceEvent.UPDATE, this.handlePresenceUpdate.bind(this));
    this.socket.on(PresenceEvent.ONLINE, this.handleUserOnline.bind(this));
    this.socket.on(PresenceEvent.OFFLINE, this.handleUserOffline.bind(this));

    // Room Events
    this.socket.on(RoomEvent.JOIN, this.handleRoomJoin.bind(this));
    this.socket.on(RoomEvent.LEAVE, this.handleRoomLeave.bind(this));
    this.socket.on(RoomEvent.KICK, this.handleRoomKick.bind(this));
    this.socket.on(RoomEvent.UPDATE, this.handleRoomUpdate.bind(this));

    // Typing Events
    this.socket.on(TypingEvent.START, this.handleTypingStart.bind(this));
    this.socket.on(TypingEvent.STOP, this.handleTypingStop.bind(this));

    // Moderation Events
    this.socket.on(ModerationEvent.CONTENT_FLAGGED, this.handleContentFlagged.bind(this));
    this.socket.on(ModerationEvent.USER_MUTED, this.handleUserMuted.bind(this));
  }

  // Connection Event Handlers
  private handleConnect(): void {
    console.log("WebSocket connected");
    this.updateConnectionState(ConnectionState.CONNECTED);
    this.processMessageQueue();
    this.rejoinRooms();
  }

  private handleDisconnect(reason: string): void {
    console.log("WebSocket disconnected:", reason);
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    
    if (this.config.reconnection && reason !== "io client disconnect") {
      this.attemptReconnect();
    }
  }

  private handleConnectError(error: Error): void {
    console.error("WebSocket connection error:", error);
    this.updateConnectionState(ConnectionState.ERROR);
    this.handleError(error);
  }

  private handleAuthSuccess(data: {
    userId: string;
    sessionId: string;
    isAnonymous: boolean;
    role: string;
  }): void {
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.isAnonymous = data.isAnonymous;
    this.userRole = data.role;
    
    console.log("WebSocket authentication successful:", {
      userId: this.userId,
      isAnonymous: this.isAnonymous,
      role: this.userRole,
    });
  }

  private handleAuthFailure(error: { message: string }): void {
    console.error("WebSocket authentication failed:", error.message);
    this.disconnect();
    this.handleError(new Error(error.message));
  }

  private handleSystemError(error: { code: string; message: string }): void {
    console.error("WebSocket system error:", error);
    this.handleError(new Error(`${error.code}: ${error.message}`));
  }

  // Message Methods
  public sendMessage(
    payload: MessagePayload,
    callback?: (response: SocketResponse<Message>) => void
  ): void {
    if (!this.isConnected()) {
      this.messageQueue.push(payload);
      console.warn("Socket not connected, message queued");
      return;
    }

    this.socket!.emit(MessageEvent.SEND, payload, (response: SocketResponse<Message>) => {
      if (response.success) {
        console.log("Message sent successfully:", response.data);
      } else {
        console.error("Failed to send message:", response.error);
        this.handleError(new Error(response.error?.message || "Failed to send message"));
      }
      callback?.(response);
    });
  }

  public editMessage(
    messageId: string,
    content: string,
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(MessageEvent.EDIT, { messageId, content }, callback);
  }

  public deleteMessage(
    messageId: string,
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(MessageEvent.DELETE, { messageId }, callback);
  }

  public reactToMessage(
    messageId: string,
    emoji: string,
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(MessageEvent.REACT, { messageId, emoji }, callback);
  }

  public markMessageDelivered(messageId: string): void {
    if (!this.isConnected()) return;
    this.socket!.emit(MessageEvent.DELIVERED, { messageId });
  }

  public markMessagesRead(messageIds: string[]): void {
    if (!this.isConnected()) return;
    this.socket!.emit(MessageEvent.READ, { messageIds });
  }

  // Crisis Methods
  public sendCrisisAlert(
    payload: CrisisAlertPayload,
    callback?: (response: SocketResponse<CrisisAlert>) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected - Crisis alert cannot be sent!");
      // Still try to connect and send
      this.connect();
      setTimeout(() => {
        if (this.isConnected()) {
          this.sendCrisisAlert(payload, callback);
        }
      }, 1000);
      return;
    }

    this.socket!.emit(CrisisEvent.ALERT, payload, callback);
  }

  public requestCrisisHelp(
    data: { message: string; severity: CrisisSeverity },
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected - Crisis help request cannot be sent!");
      this.connect();
      setTimeout(() => {
        if (this.isConnected()) {
          this.requestCrisisHelp(data, callback);
        }
      }, 1000);
      return;
    }

    this.socket!.emit(CrisisEvent.REQUEST_HELP, data, callback);
  }

  public setCounselorAvailability(available: boolean): void {
    if (!this.isConnected()) return;
    
    const event = available 
      ? CrisisEvent.COUNSELOR_AVAILABLE 
      : CrisisEvent.COUNSELOR_BUSY;
    
    this.socket!.emit(event, { timestamp: new Date() });
  }

  // Room Methods
  public joinRoom(
    payload: RoomJoinPayload,
    callback?: (response: SocketResponse<Room>) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(RoomEvent.JOIN, payload, (response: SocketResponse<Room>) => {
      if (response.success) {
        this.currentRooms.add(payload.roomId);
        console.log("Joined room:", payload.roomId);
      } else {
        console.error("Failed to join room:", response.error);
      }
      callback?.(response);
    });
  }

  public leaveRoom(
    roomId: string,
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(RoomEvent.LEAVE, { roomId }, (response: SocketResponse) => {
      if (response.success) {
        this.currentRooms.delete(roomId);
        console.log("Left room:", roomId);
      } else {
        console.error("Failed to leave room:", response.error);
      }
      callback?.(response);
    });
  }

  public createRoom(
    data: Partial<Room>,
    callback?: (response: SocketResponse<Room>) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(RoomEvent.CREATE, data, callback);
  }

  public getRoomParticipants(
    roomId: string,
    callback?: (response: SocketResponse) => void
  ): void {
    if (!this.isConnected()) {
      console.error("Socket not connected");
      return;
    }

    this.socket!.emit(RoomEvent.PARTICIPANTS, { roomId }, callback);
  }

  // Typing Methods
  public startTyping(roomId: string): void {
    if (!this.isConnected()) return;

    // Clear existing timer for this room
    const existingTimer = this.typingTimers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Send typing start event
    this.socket!.emit(TypingEvent.START, { roomId });

    // Auto-stop typing after 3 seconds
    const timer = setTimeout(() => {
      this.stopTyping(roomId);
    }, 3000);
    
    this.typingTimers.set(roomId, timer);
  }

  public stopTyping(roomId: string): void {
    if (!this.isConnected()) return;

    // Clear timer
    const timer = this.typingTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(roomId);
    }

    // Send typing stop event
    this.socket!.emit(TypingEvent.STOP, { roomId });
  }

  // Presence Methods
  public updatePresence(status: PresenceStatus, customStatus?: string): void {
    if (!this.isConnected()) return;

    this.socket!.emit(PresenceEvent.UPDATE, {
      status,
      customStatus,
      lastSeen: new Date(),
    });
  }

  // Notification Methods
  public acknowledgeNotification(notificationId: string): void {
    if (!this.isConnected()) return;

    this.socket!.emit(NotificationEvent.ACKNOWLEDGE, { notificationId });
  }

  // Event Handlers for Incoming Events
  private handleMessageReceive(message: Message): void {
    this.messageHandlers.get(message.roomId)?.forEach(handler => handler(message));
  }

  private handleMessageEdit(data: { messageId: string; content: string; editedAt: Date }): void {
    // Handle message edit
    console.log("Message edited:", data);
  }

  private handleMessageDelete(data: { messageId: string }): void {
    // Handle message deletion
    console.log("Message deleted:", data);
  }

  private handleMessageReact(data: { messageId: string; reactions: any[] }): void {
    // Handle message reactions
    console.log("Message reactions updated:", data);
  }

  private handleCrisisAlert(alert: CrisisAlert): void {
    console.log("Crisis alert received:", alert);
    this.crisisHandlers.forEach(handler => handler(alert));
  }

  private handleCounselorAssigned(data: any): void {
    console.log("Counselor assigned:", data);
  }

  private handleCrisisEscalated(data: any): void {
    console.log("Crisis escalated:", data);
  }

  private handleCrisisResolved(data: any): void {
    console.log("Crisis resolved:", data);
  }

  private handleNotificationPush(notification: Notification): void {
    console.log("Notification received:", notification);
    this.notificationHandlers.forEach(handler => handler(notification));
  }

  private handleNotificationClear(data: any): void {
    console.log("Notifications cleared:", data);
  }

  private handlePresenceUpdate(presence: UserPresence): void {
    this.presenceHandlers.forEach(handler => handler(presence));
  }

  private handleUserOnline(data: { userId: string }): void {
    console.log("User online:", data.userId);
  }

  private handleUserOffline(data: { userId: string }): void {
    console.log("User offline:", data.userId);
  }

  private handleRoomJoin(data: { userId: string; roomId: string }): void {
    console.log("User joined room:", data);
  }

  private handleRoomLeave(data: { userId: string; roomId: string }): void {
    console.log("User left room:", data);
  }

  private handleRoomKick(data: { roomId: string; reason?: string }): void {
    console.log("Kicked from room:", data);
    this.currentRooms.delete(data.roomId);
  }

  private handleRoomUpdate(room: Room): void {
    this.roomHandlers.get(room.id)?.forEach(handler => handler(room));
  }

  private handleTypingStart(data: { userId: string; roomId: string }): void {
    this.typingHandlers.get(data.roomId)?.forEach(handler => handler(data));
  }

  private handleTypingStop(data: { userId: string; roomId: string }): void {
    this.typingHandlers.get(data.roomId)?.forEach(handler => handler(data));
  }

  private handleContentFlagged(data: any): void {
    console.log("Content flagged:", data);
  }

  private handleUserMuted(data: any): void {
    console.log("User muted:", data);
  }

  // Heartbeat Management
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.socket!.emit(SystemEvent.HEARTBEAT);
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleHeartbeat(data: { timestamp: Date }): void {
    // Heartbeat acknowledged
  }

  // Reconnection Logic
  private attemptReconnect(): void {
    this.updateConnectionState(ConnectionState.RECONNECTING);
    
    this.clearReconnectTimer();
    
    this.reconnectTimer = setTimeout(() => {
      console.log("Attempting to reconnect...");
      this.connect();
    }, this.config.reconnectionDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private rejoinRooms(): void {
    this.currentRooms.forEach(roomId => {
      this.joinRoom({ roomId });
    });
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  // State Management
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionHandlers.forEach(handler => handler(state));
  }

  private handleError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  // Public Event Listeners
  public onMessage(roomId: string, handler: MessageListener): () => void {
    if (!this.messageHandlers.has(roomId)) {
      this.messageHandlers.set(roomId, new Set());
    }
    this.messageHandlers.get(roomId)!.add(handler);
    
    return () => {
      this.messageHandlers.get(roomId)?.delete(handler);
    };
  }

  public onCrisisAlert(handler: CrisisListener): () => void {
    this.crisisHandlers.add(handler);
    return () => this.crisisHandlers.delete(handler);
  }

  public onNotification(handler: NotificationListener): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  public onPresence(handler: PresenceListener): () => void {
    this.presenceHandlers.add(handler);
    return () => this.presenceHandlers.delete(handler);
  }

  public onRoom(roomId: string, handler: RoomListener): () => void {
    if (!this.roomHandlers.has(roomId)) {
      this.roomHandlers.set(roomId, new Set());
    }
    this.roomHandlers.get(roomId)!.add(handler);
    
    return () => {
      this.roomHandlers.get(roomId)?.delete(handler);
    };
  }

  public onTyping(roomId: string, handler: TypingListener): () => void {
    if (!this.typingHandlers.has(roomId)) {
      this.typingHandlers.set(roomId, new Set());
    }
    this.typingHandlers.get(roomId)!.add(handler);
    
    return () => {
      this.typingHandlers.get(roomId)?.delete(handler);
    };
  }

  public onConnectionChange(handler: ConnectionListener): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  public onError(handler: ErrorListener): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // Getters
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public isAnonymousUser(): boolean {
    return this.isAnonymous;
  }

  public getUserRole(): string | null {
    return this.userRole;
  }

  public getCurrentRooms(): string[] {
    return Array.from(this.currentRooms);
  }

  // Cleanup
  public destroy(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.crisisHandlers.clear();
    this.notificationHandlers.clear();
    this.presenceHandlers.clear();
    this.roomHandlers.clear();
    this.typingHandlers.clear();
    this.connectionHandlers.clear();
    this.errorHandlers.clear();
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
  }
}

// Singleton instance
let clientInstance: WebSocketClient | null = null;

export function getWebSocketClient(config?: ClientConfig): WebSocketClient {
  if (!clientInstance) {
    clientInstance = new WebSocketClient(config);
  }
  return clientInstance;
}

export function destroyWebSocketClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}