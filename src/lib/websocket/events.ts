/**
 * WebSocket Event Types and Interfaces
 * Centralized event definitions for the real-time communication system
 */

import { UserRole } from "@prisma/client";

// Event Categories
export enum EventCategory {
  MESSAGE = "message",
  CRISIS = "crisis",
  NOTIFICATION = "notification",
  PRESENCE = "presence",
  ROOM = "room",
  SYSTEM = "system",
  TYPING = "typing",
  MODERATION = "moderation",
}

// Message Events
export enum MessageEvent {
  SEND = "message:send",
  RECEIVE = "message:receive",
  EDIT = "message:edit",
  DELETE = "message:delete",
  REACT = "message:react",
  DELIVERED = "message:delivered",
  READ = "message:read",
  FILE_UPLOAD = "message:file_upload",
}

// Crisis Events
export enum CrisisEvent {
  ALERT = "crisis:alert",
  ESCALATE = "crisis:escalate",
  COUNSELOR_AVAILABLE = "crisis:counselor_available",
  COUNSELOR_BUSY = "crisis:counselor_busy",
  REQUEST_HELP = "crisis:request_help",
  HELP_ASSIGNED = "crisis:help_assigned",
  TRIGGER_DETECTED = "crisis:trigger_detected",
  SAFETY_CHECK = "crisis:safety_check",
  EMERGENCY_PROTOCOL = "crisis:emergency_protocol",
  ALERT_UPDATED = "crisis:alert_updated",
  INTERVENTION_STARTED = "crisis:intervention_started",
  INTERVENTION_COMPLETED = "crisis:intervention_completed",
  REPORT_CREATED = "crisis:report_created",
  REPORT_ESCALATED = "crisis:report_escalated",
}

// Notification Events
export enum NotificationEvent {
  PUSH = "notification:push",
  ACKNOWLEDGE = "notification:acknowledge",
  DISMISS = "notification:dismiss",
  BATCH = "notification:batch",
}

// Presence Events
export enum PresenceEvent {
  ONLINE = "presence:online",
  OFFLINE = "presence:offline",
  AWAY = "presence:away",
  BUSY = "presence:busy",
  UPDATE = "presence:update",
}

// Room Events
export enum RoomEvent {
  JOIN = "room:join",
  LEAVE = "room:leave",
  CREATE = "room:create",
  DELETE = "room:delete",
  UPDATE = "room:update",
  INVITE = "room:invite",
  KICK = "room:kick",
  BAN = "room:ban",
  UNBAN = "room:unban",
  PARTICIPANTS = "room:participants",
}

// System Events
export enum SystemEvent {
  CONNECT = "system:connect",
  DISCONNECT = "system:disconnect",
  RECONNECT = "system:reconnect",
  ERROR = "system:error",
  HEARTBEAT = "system:heartbeat",
  AUTH = "system:auth",
  AUTH_SUCCESS = "system:auth_success",
  AUTH_FAILED = "system:auth_failed",
  RATE_LIMIT = "system:rate_limit",
}

// Typing Events
export enum TypingEvent {
  START = "typing:start",
  STOP = "typing:stop",
}

// Moderation Events
export enum ModerationEvent {
  CONTENT_FLAGGED = "moderation:content_flagged",
  CONTENT_REMOVED = "moderation:content_removed",
  USER_WARNED = "moderation:user_warned",
  USER_MUTED = "moderation:user_muted",
  USER_BANNED = "moderation:user_banned",
  USER_KICK = "moderation:user_kick",
  USER_BAN = "moderation:user_ban",
}

// Message Types
export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  delivered?: boolean;
  read?: boolean;
  reactions?: MessageReaction[];
  replyTo?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  encrypted?: boolean;
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  AUDIO = "audio",
  VIDEO = "video",
  SYSTEM = "system",
  CRISIS_ALERT = "crisis_alert",
  MOOD_CHECK = "mood_check",
  RESOURCE_SHARE = "resource_share",
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

// Crisis Alert Types
export interface CrisisAlert {
  id: string;
  userId: string;
  severity: CrisisSeverity;
  type: CrisisType;
  message: string;
  location?: CrisisLocation;
  triggers?: string[];
  currentMood?: number;
  suicidalIdeation?: boolean;
  selfHarmRisk?: boolean;
  assignedCounselors?: string[];
  status: CrisisStatus;
  timestamp: Date;
  escalationLevel?: number;
  previousAlerts?: string[];
  contactedEmergency?: boolean;
}

export enum CrisisSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

export enum CrisisType {
  SUICIDAL_IDEATION = "suicidal_ideation",
  SELF_HARM = "self_harm",
  PANIC_ATTACK = "panic_attack",
  SEVERE_DEPRESSION = "severe_depression",
  PSYCHOTIC_EPISODE = "psychotic_episode",
  SUBSTANCE_CRISIS = "substance_crisis",
  DOMESTIC_VIOLENCE = "domestic_violence",
  OTHER = "other",
}

export enum CrisisStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  EMERGENCY_DISPATCHED = "emergency_dispatched",
}

export interface CrisisLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  isShared: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  data?: Record<string, any>;
  read: boolean;
  acknowledged: boolean;
  timestamp: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  MESSAGE = "message",
  CRISIS_ALERT = "crisis_alert",
  APPOINTMENT = "appointment",
  REMINDER = "reminder",
  SYSTEM = "system",
  COMMUNITY = "community",
  ACHIEVEMENT = "achievement",
  WARNING = "warning",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
  CRITICAL = "critical",
}

export enum NotificationCategory {
  PERSONAL = "personal",
  PROFESSIONAL = "professional",
  CRISIS = "crisis",
  COMMUNITY = "community",
  SYSTEM = "system",
}

// Room Types
export interface Room {
  id: string;
  name: string;
  topic?: string;
  description?: string;
  type: RoomType;
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  isPrivate: boolean;
  isAnonymous: boolean;
  createdBy: string;
  createdAt: Date;
  moderators: string[];
  bannedUsers: string[];
  settings: RoomSettings;
  metadata?: Record<string, any>;
}

export enum RoomType {
  DIRECT = "direct",
  GROUP = "group",
  SUPPORT_GROUP = "support_group",
  CRISIS = "crisis",
  THERAPY_SESSION = "therapy_session",
  ANONYMOUS = "anonymous",
  PUBLIC = "public",
}

export interface RoomSettings {
  allowFileSharing: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  autoModeration: boolean;
  profanityFilter: boolean;
  requireApproval: boolean;
  maxMessageLength: number;
  slowMode?: number; // seconds between messages
  endToEndEncryption: boolean;
}

// Crisis Trigger Detection Result
export interface CrisisTrigger {
  detected: boolean;
  severity?: "low" | "medium" | "high";
  triggers?: string[];
  keywords?: string[];
  suggestedResponse?: string;
  requiresImmediate?: boolean;
}

// User Presence
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: Date;
  currentRoom?: string;
  isTyping?: boolean;
  typingIn?: string;
  customStatus?: string;
  devices: DeviceInfo[];
}

export enum PresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  BUSY = "busy",
  OFFLINE = "offline",
  INVISIBLE = "invisible",
  IN_CRISIS = "in_crisis",
  IN_SESSION = "in_session",
}

export interface DeviceInfo {
  id: string;
  type: "web" | "mobile" | "desktop";
  platform?: string;
  lastActive: Date;
}

// Socket Authentication
export interface SocketAuth {
  token: string;
  userId?: string;
  sessionId?: string;
  isAnonymous?: boolean;
  anonymousId?: string;
  role?: UserRole;
  permissions?: string[];
}

// Socket Response
export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: SocketError;
  timestamp: Date;
}

export interface SocketError {
  code: string;
  message: string;
  details?: any;
}

// Event Payloads
export interface MessagePayload {
  roomId: string;
  content: string;
  type?: MessageType;
  replyTo?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface RoomJoinPayload {
  roomId: string;
  password?: string;
  isAnonymous?: boolean;
}

export interface CrisisAlertPayload {
  severity: CrisisSeverity;
  type: CrisisType;
  message: string;
  triggers?: string[];
  currentMood?: number;
  suicidalIdeation?: boolean;
  selfHarmRisk?: boolean;
  shareLocation?: boolean;
}

export interface NotificationPayload {
  userIds: string[];
  notification: Omit<Notification, "id" | "userId" | "timestamp">;
}

export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

// Rate Limiting
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  message: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    message: "Too many messages. Please slow down.",
  },
  crisis: {
    windowMs: 300000, // 5 minutes
    maxRequests: 3,
    message: "Crisis alert rate limit reached. If this is an emergency, please call 911.",
  },
  room: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: "Too many room operations. Please try again later.",
  },
};

// Permission Checks
const USER_PERMISSIONS = [
  MessageEvent.SEND,
  MessageEvent.EDIT,
  MessageEvent.DELETE,
  MessageEvent.REACT,
  RoomEvent.JOIN,
  RoomEvent.LEAVE,
  PresenceEvent.UPDATE,
  CrisisEvent.REQUEST_HELP,
];

const HELPER_PERMISSIONS = [
  ...USER_PERMISSIONS,
  RoomEvent.CREATE,
  ModerationEvent.CONTENT_FLAGGED,
];

const THERAPIST_PERMISSIONS = [
  ...HELPER_PERMISSIONS,
  CrisisEvent.HELP_ASSIGNED,
  RoomEvent.INVITE,
];

const CRISIS_COUNSELOR_PERMISSIONS = [
  ...THERAPIST_PERMISSIONS,
  CrisisEvent.ESCALATE,
  CrisisEvent.EMERGENCY_PROTOCOL,
  CrisisEvent.COUNSELOR_AVAILABLE,
  CrisisEvent.COUNSELOR_BUSY,
];

const ADMIN_PERMISSIONS = [
  ...CRISIS_COUNSELOR_PERMISSIONS,
  RoomEvent.DELETE,
  RoomEvent.KICK,
  RoomEvent.BAN,
  RoomEvent.UNBAN,
  ModerationEvent.CONTENT_REMOVED,
  ModerationEvent.USER_WARNED,
  ModerationEvent.USER_MUTED,
];

const SUPER_ADMIN_PERMISSIONS = [
  ...Object.values(MessageEvent),
  ...Object.values(CrisisEvent),
  ...Object.values(NotificationEvent),
  ...Object.values(PresenceEvent),
  ...Object.values(RoomEvent),
  ...Object.values(SystemEvent),
  ...Object.values(TypingEvent),
  ...Object.values(ModerationEvent),
];

export const PERMISSION_MATRIX: Record<UserRole, string[]> = {
  [UserRole.USER]: USER_PERMISSIONS,
  [UserRole.HELPER]: HELPER_PERMISSIONS,
  [UserRole.THERAPIST]: THERAPIST_PERMISSIONS,
  [UserRole.CRISIS_COUNSELOR]: CRISIS_COUNSELOR_PERMISSIONS,
  [UserRole.ADMIN]: ADMIN_PERMISSIONS,
  [UserRole.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,
};

// Validation Schemas
export const MESSAGE_VALIDATION = {
  maxLength: 5000,
  minLength: 1,
  maxAttachments: 10,
  maxAttachmentSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "application/pdf",
    "text/plain",
  ],
};

export const ROOM_VALIDATION = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxTopicLength: 50,
  minParticipants: 2,
  maxParticipants: 100,
  maxModerators: 10,
};