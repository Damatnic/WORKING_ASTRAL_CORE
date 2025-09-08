// Community & Peer Support Type Definitions
// Maintains complete anonymity - no PII collected

import { z } from 'zod';

// Zod Schemas for Validation
export const groupCreationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  topic: z.enum(['anxiety', 'depression', 'trauma', 'grief', 'addiction', 'relationships', 'self-harm', 'eating-disorders', 'bipolar', 'ocd', 'ptsd', 'general-support']),
  language: z.string().min(2).max(5),
  maxMembers: z.number().min(2).max(50),
  privacy: z.enum(['public', 'private', 'invite-only']),
  requiresApproval: z.boolean(),
  guidelines: z.array(z.string()),
  tags: z.array(z.string()),
  supportLevel: z.enum(['peer', 'guided', 'professional'])
});

export interface AnonymousUser {
  sessionId: string; // Temporary session identifier
  avatar: string; // Generated avatar identifier
  nickname: string; // System-generated anonymous nickname
  joinedAt: Date;
  trustScore: number; // Community trust metric (0-100)
  supportRole: 'peer' | 'mentor' | 'moderator';
  languages: string[];
  timezone: string;
}

export interface AnonymousIdentity {
  id: string;
  avatar: string;
  displayName: string;
  trustScore?: number;
}

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  topic: GroupTopic;
  language: string;
  maxMembers: number;
  currentMembers: number;
  moderators: string[]; // Session IDs
  privacy: 'public' | 'private' | 'invite-only';
  isPrivate?: boolean;
  requiresApproval: boolean;
  guidelines: string[];
  createdAt: Date;
  lastActivity: Date;
  tags: string[];
  supportLevel: 'peer' | 'guided' | 'professional';
}

export interface PeerMatch {
  matchId: string;
  participants: [string, string]; // Session IDs
  compatibilityScore: number; // 0-100
  matchReason: string[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt: Date;
  endedAt?: Date;
  chatEnabled: boolean;
  videoEnabled: boolean;
  feedback?: MatchFeedback;
}

export interface CommunityPost {
  id: string;
  authorSessionId: string;
  authorNickname: string;
  content: string;
  type: 'story' | 'milestone' | 'question' | 'encouragement';
  tags: string[];
  reactions: PostReaction[];
  replies: Reply[];
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  sentiment: 'positive' | 'neutral' | 'struggling';
  helpfulVotes: number;
  reportCount: number;
  moderationStatus: ModerationStatus;
  // Additional properties for UI components
  title?: string;
  author?: AnonymousIdentity;
  category?: string;
  likes?: number;
  comments?: Reply[];
  userInteraction?: {
    liked?: boolean;
    bookmarked?: boolean;
    reported?: boolean;
  };
  supportLevel?: 'seeking-support' | 'offering-support' | 'celebrating';
}

export interface WellnessChallenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // days
  participants: ChallengeParticipant[];
  goals: ChallengeGoal[];
  rewards: Reward[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  communityProgress: number; // 0-100
  tags: string[];
}

export interface Milestone {
  id: string;
  userSessionId: string;
  type: MilestoneType;
  title: string;
  description: string;
  achievedAt: Date;
  celebrationCount: number;
  isPublic: boolean;
  supportMessages: SupportMessage[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderSessionId: string;
  senderNickname: string;
  content: string;
  timestamp: Date;
  isEncrypted: boolean;
  readBy: string[];
  reactions: MessageReaction[];
  replyTo?: string;
  attachments?: Attachment[];
  moderationFlags: string[];
}

export interface ModerationReport {
  id: string;
  reporterSessionId: string;
  targetType: 'user' | 'post' | 'message' | 'group';
  targetId: string;
  reason: ReportReason;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'escalated';
  moderatorNotes?: string;
  actionTaken?: ModeratorAction;
  createdAt: Date;
  resolvedAt?: Date;
}

// Enums and Supporting Types

export type GroupTopic = 
  | 'anxiety'
  | 'depression'
  | 'trauma'
  | 'grief'
  | 'addiction'
  | 'relationships'
  | 'self-harm'
  | 'eating-disorders'
  | 'bipolar'
  | 'ocd'
  | 'ptsd'
  | 'general-support';

export type ChallengeType =
  | 'mindfulness'
  | 'gratitude'
  | 'exercise'
  | 'sleep'
  | 'social-connection'
  | 'creativity'
  | 'nutrition'
  | 'self-care';

export type MilestoneType =
  | 'days-streak'
  | 'first-share'
  | 'helping-others'
  | 'challenge-complete'
  | 'therapy-session'
  | 'crisis-overcome'
  | 'goal-achieved'
  | 'community-contributor';

export type ReportReason =
  | 'harmful-content'
  | 'crisis-risk'
  | 'harassment'
  | 'spam'
  | 'misinformation'
  | 'triggering-content'
  | 'privacy-violation'
  | 'other';

export type ModeratorAction =
  | 'content-removed'
  | 'user-warned'
  | 'user-suspended'
  | 'user-banned'
  | 'crisis-escalation'
  | 'no-action'
  | 'content-edited';

export interface PostReaction {
  type: 'heart' | 'support' | 'celebrate' | 'understand';
  count: number;
  sessionIds: string[];
}

export interface Reply {
  id: string;
  authorSessionId: string;
  authorNickname: string;
  content: string;
  createdAt: Date;
  helpfulVotes: number;
  moderationStatus: ModerationStatus;
}

export interface MatchFeedback {
  helpful: boolean;
  rating: number; // 1-5
  comment?: string;
  wouldRecommend: boolean;
}

export interface ChallengeParticipant {
  sessionId: string;
  nickname: string;
  progress: number; // 0-100
  joinedAt: Date;
  lastActivity: Date;
  completedGoals: string[];
}

export interface ChallengeGoal {
  id: string;
  title: string;
  description: string;
  points: number;
  repeatable: boolean;
  frequency?: 'daily' | 'weekly' | 'once';
}

export interface Reward {
  id: string;
  type: 'badge' | 'achievement' | 'milestone';
  title: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SupportMessage {
  id: string;
  fromSessionId: string;
  fromNickname: string;
  message: string;
  timestamp: Date;
}

export interface MessageReaction {
  type: string;
  sessionIds: string[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'document';
  url: string;
  thumbnail?: string;
  size: number;
  mimeType: string;
}

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed';

// WebSocket Event Types

export interface CommunityWebSocketEvents {
  'group:join': { groupId: string; sessionId: string };
  'group:leave': { groupId: string; sessionId: string };
  'group:message': { groupId: string; message: ChatMessage };
  'peer:request': { fromSessionId: string; toSessionId: string };
  'peer:accept': { matchId: string };
  'peer:decline': { matchId: string };
  'peer:message': { matchId: string; message: ChatMessage };
  'peer:typing': { matchId: string; typing: boolean };
  'peer:media': { matchId: string; mediaType: string; enabled: boolean };
  'post:new': { post: CommunityPost };
  'post:reaction': { postId: string; reaction: PostReaction };
  'milestone:achieved': { milestone: Milestone };
  'challenge:join': { challengeId: string; sessionId: string };
  'challenge:progress': { challengeId: string; sessionId: string; progress: number };
  'moderation:flag': { report: ModerationReport };
  'crisis:detected': { sessionId: string; severity: number };
}

// Privacy & Security Types

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  algorithm: 'RSA-OAEP' | 'AES-GCM';
}

export interface SessionSecurity {
  sessionId: string;
  encryptionKeys: EncryptionKeys;
  verificationToken: string;
  expiresAt: Date;
  trustLevel: number;
  ipHash: string; // Hashed IP for rate limiting
}

// Analytics Types (Anonymous)

export interface CommunityMetrics {
  totalActiveUsers: number;
  totalGroups: number;
  totalPosts: number;
  totalMatches: number;
  averageEngagement: number;
  topTopics: string[];
  peakHours: number[];
  sentimentTrend: 'improving' | 'stable' | 'declining';
  crisisInterventions: number;
  helpfulContentRate: number;
}

// UserEngagementMetrics moved to analytics.ts to avoid conflicts
// Import from analytics.ts if needed: import { UserEngagementMetrics } from './analytics';

// Crisis Intervention Types
export interface CrisisProtocol {
  id: string;
  name?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  triggerType?: string;
  indicators?: string[];
  actions?: CrisisAction[];
  immediateActions?: CrisisAction[];
  followUpActions?: CrisisAction[];
  resources: CrisisResource[];
  escalationPath: any[];
  timeframe?: number; // minutes
  isActive?: boolean;
}

export interface CrisisAction {
  id: string;
  type: 'notify' | 'redirect' | 'contact' | 'escalate' | 'monitor' | 'notify_moderator' | 'connect_counselor' | 'provide_resources';
  priority: number;
  description: string;
  automated: boolean;
  conditions: string[];
}

export interface CrisisResource {
  id: string;
  type: 'hotline' | 'chat' | 'text' | 'emergency' | 'website';
  name: string;
  description: string;
  contact: string;
  availability?: '24/7' | 'business-hours' | 'weekends';
  available24x7?: boolean;
  languages: string[];
  region?: string;
  countries?: string[];
  specializations?: string[];
}

export interface SafetyAlert {
  id: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  timestamp: Date;
  resolved: boolean;
  actions: string[];
}

// Additional missing types for components
export interface ChatRoom {
  id: string;
  name: string;
  topic: GroupTopic;
  members: AnonymousUser[];
  isActive: boolean;
  lastActivity: Date;
}

export interface Message {
  id: string;
  content: string;
  sender: AnonymousUser;
  timestamp: Date;
  reactions: MessageReaction[];
  roomId: string;
  authorId: string;
  author?: AnonymousIdentity;
  type?: 'text' | 'crisis_alert' | 'system';
}

// Mentorship Types
export interface MentorProfile {
  id: string;
  sessionId: string;
  rating: number;
  reviews: Review[];
  specializations: SupportTopic[];
  experience: string;
  approach: string;
  availability: MentorAvailability;
  verified: boolean;
  languages: string[];
  timezone: string;
  preferences: MentorPreferences;
  currentMentees: number;
  maxMentees: number;
  stats: {
    totalSessions: number;
    successRate: number;
    responseTime: number; // hours
  };
}

export interface MentorshipRequest {
  id: string;
  menteeSessionId: string;
  mentorSessionId: string;
  topic: SupportTopic;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
}

export type SupportTopic =
  | 'anxiety'
  | 'depression' 
  | 'trauma'
  | 'relationships'
  | 'grief'
  | 'addiction'
  | 'stress'
  | 'self_esteem'
  | 'work_life_balance'
  | 'family_issues'
  | 'social_anxiety'
  | 'panic_attacks'
  | 'eating_disorders'
  | 'sleep_issues'
  | 'anger_management';

export interface MentorPreferences {
  maxConcurrentMentees?: number;
  preferredTopics?: SupportTopic[];
  sessionDuration?: number; // minutes
  availableTimeSlots?: string[];
  communicationStyle?: 'structured' | 'conversational' | 'goal_oriented' | 'balanced';
  languages?: string[];
  timeZone?: string;
  sessionFrequency?: string;
  preferredTimes?: string[];
}

export interface Review {
  id: string;
  reviewerSessionId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
  verified: boolean;
  helpful: number; // helpful votes
}

export interface MentorAvailability {
  timezone: string;
  schedule: {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
  };
  nextAvailable: Date;
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
  available: boolean;
}