// WebSocket Types

export interface WebSocketMessage {
  id: string;
  type: WebSocketMessageType;
  channel?: string;
  data: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export enum WebSocketMessageType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  
  // Authentication
  AUTH_REQUEST = 'auth_request',
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  
  // Chat/messaging
  MESSAGE = 'message',
  MESSAGE_EDIT = 'message_edit',
  MESSAGE_DELETE = 'message_delete',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  
  // Presence
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  USER_STATUS = 'user_status',
  PRESENCE_UPDATE = 'presence_update',
  
  // Room/channel management
  ROOM_CREATE = 'room_create',
  ROOM_DELETE = 'room_delete',
  ROOM_JOIN = 'room_join',
  ROOM_LEAVE = 'room_leave',
  ROOM_UPDATE = 'room_update',
  
  // Notifications
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  
  // Crisis
  CRISIS_ALERT = 'crisis_alert',
  CRISIS_UPDATE = 'crisis_update',
  CRISIS_RESOLVED = 'crisis_resolved',
  
  // System
  SYSTEM_MESSAGE = 'system_message',
  BROADCAST = 'broadcast',
  
  // Custom events
  CUSTOM = 'custom'
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  sessionId: string;
  status: ConnectionStatus;
  connectedAt: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
  channels: string[];
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface WebSocketRoom {
  id: string;
  name: string;
  type: RoomType;
  participants: string[];
  maxParticipants?: number;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
  SUPPORT = 'support',
  CRISIS = 'crisis'
}

export interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  pingInterval: number;
  pongTimeout: number;
  heartbeat: boolean;
  auth?: {
    token?: string;
    userId?: string;
    sessionId?: string;
  };
}

export interface WebSocketEvent {
  type: string;
  handler: (data: any) => void | Promise<void>;
}

export interface WebSocketState {
  status: ConnectionStatus;
  reconnectAttempt: number;
  lastError?: string;
  lastConnected?: string;
  messageQueue: WebSocketMessage[];
}

export interface WebSocketChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  attachments?: MessageAttachment[];
  replyTo?: string;
  editedAt?: string;
  deletedAt?: string;
  reactions?: WebSocketMessageReaction[];
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

export interface WebSocketMessageReaction {
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface PresenceUpdate {
  userId: string;
  status: UserPresenceStatus;
  lastSeen: string;
  activeRooms?: string[];
  customStatus?: string;
}

export enum UserPresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline',
  INVISIBLE = 'invisible'
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}