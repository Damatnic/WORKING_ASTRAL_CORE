// Socket.io Server Configuration for Real-time Community Features
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import CryptoJS from 'crypto-js';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const prisma = new PrismaClient();

// Lazy load bad-words to avoid build issues
let BadWordsFilter: any = null;
let badWordsFilter: any = null;

async function getBadWordsFilter() {
  if (!badWordsFilter) {
    try {
      BadWordsFilter = await import('bad-words').then(m => (m as any).default || m);
      badWordsFilter = new BadWordsFilter();
    } catch (error) {
      console.warn('Bad words filter not available:', error);
      // Fallback implementation
      badWordsFilter = {
        isProfane: () => false,
        clean: (text: string) => text
      };
    }
  }
  return badWordsFilter;
}

// Initialize Redis for caching and rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Rate limiting configuration
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 messages per minute
  analytics: true,
});

// Message validation schema
const messageSchema = z.object({
  roomId: z.string(),
  content: z.string().min(1).max(1000),
  type: z.enum(['text', 'supportive', 'resource']),
});

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptMessage(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decryptMessage(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Crisis keywords for detection
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'not worth living',
  'self harm', 'hurt myself', 'cutting', 'overdose',
  'no one would care', 'better off without me', 'goodbye forever',
  'final goodbye', 'last message', 'can\'t go on'
];

// Socket authentication middleware
async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
      return next(new Error('No cookies provided'));
    }

    const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
    if (!cookieString) {
      return next(new Error('No valid cookies provided'));
    }
    const parsedCookies = parse(cookieString);
    const token = parsedCookies['auth-token'];
    
    if (!token) {
      return next(new Error('No auth token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Get or create anonymous identity
    const identity = await prisma.anonymousIdentity.findUnique({
      where: { userId: decoded.userId },
      include: { user: true }
    });

    if (!identity) {
      // Create anonymous identity if doesn't exist
      const newIdentity = await prisma.anonymousIdentity.create({
        data: {
          userId: decoded.userId,
          displayName: generateAnonymousName(),
          avatar: generateAvatar(),
          colorTheme: generateColorTheme(),
          languages: ['en'],
          badges: [],
        },
      });
      socket.data.identity = newIdentity;
    } else {
      socket.data.identity = identity;
    }

    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}

// Generate anonymous display names
function generateAnonymousName(): string {
  const adjectives = ['Caring', 'Supportive', 'Kind', 'Gentle', 'Warm', 'Friendly', 'Helpful'];
  const nouns = ['Friend', 'Listener', 'Helper', 'Companion', 'Soul', 'Heart', 'Spirit'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}${noun}${num}`;
}

// Generate avatar
function generateAvatar(): string {
  const avatars = [
    '🌟', '🌈', '🦋', '🌸', '🌺', '🌻', '🌷', '🌹',
    '🕊️', '💫', '⭐', '🌙', '☀️', '🌊', '🌿', '🍃'
  ];
  return avatars[Math.floor(Math.random() * avatars.length)] || '🌟';
}

// Generate color theme
function generateColorTheme(): string {
  const themes = [
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#6366F1', '#14B8A6', '#F97316'
  ];
  return themes[Math.floor(Math.random() * themes.length)] || '#8B5CF6';
}

// Crisis detection
async function detectCrisis(message: string, userId: string): Promise<boolean> {
  const lowerMessage = message.toLowerCase();
  
  // Check for crisis keywords
  const containsCrisisKeyword = CRISIS_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );

  if (containsCrisisKeyword) {
    // Create safety alert
    await prisma.safetyAlert.create({
      data: {
        type: 'crisis',
        severity: 'high',
        userId,
        context: 'chat_message',
        indicators: ['crisis_keyword_detected'],
        handled: false,
        actions: ['auto_resources_sent', 'moderator_notified'],
      },
    });
    return true;
  }

  return false;
}

// Content moderation
async function moderateContent(content: string): Promise<{
  isClean: boolean;
  filteredContent: string;
  violations: string[];
}> {
  const violations: string[] = [];
  let filteredContent = content;

  // Check for profanity
  const filter = getBadWordsFilter();
  if ((filter as any).isProfane(content)) {
    violations.push('profanity');
    filteredContent = (filter as any).clean(content);
  }

  // Check for excessive caps (shouting)
  const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsPercentage > 0.7 && content.length > 10) {
    violations.push('excessive_caps');
    filteredContent = content.toLowerCase();
  }

  // Check for spam patterns
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlPattern) || [];
  if (urls.length > 2) {
    violations.push('spam_urls');
    filteredContent = content.replace(urlPattern, '[link removed]');
  }

  return {
    isClean: violations.length === 0,
    filteredContent,
    violations,
  };
}

let ioRef: SocketIOServer | null = null;
export function getSocketIO(): SocketIOServer | null {
  return ioRef;
}

// Initialize Socket.io server
export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer);
  ioRef = io;
  
  // Configure CORS after initialization
  (io as any).engine.on("connection_error", (err: { req: any; code: number; message: string; context: any }) => {
    console.log(err.req);      // the request object
    console.log(err.code);     // the error code
    console.log(err.message);  // the error message
    console.log(err.context);  // some additional error context
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket: Socket) => {
    console.log(`User connected: ${socket.data.identity.displayName}`);

    // Join user to their personal room
    socket.join(`user:${socket.data.userId}`);

    // Handle joining chat rooms
    socket.on('join-room', async (roomId: string) => {
      try {
        // Check if room exists and user can join
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            ChatParticipant: {
              where: { userId: socket.data.userId, isActive: true }
            }
          }
        });

        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }

        // Check participant limit
        const participantCount = await prisma.chatParticipant.count({
          where: { roomId, isActive: true }
        });

        if (participantCount >= room.maxParticipants && room.participants.length === 0) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Add participant if not already in room
        if (room.participants.length === 0) {
          await prisma.chatParticipant.create({
            data: {
              roomId,
              userId: socket.data.userId,
            }
          });
        }

        // Join socket room
        socket.join(`room:${roomId}`);
        
        // Send recent messages
        const recentMessages = await prisma.chatMessage.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            
          }
        });

        // Decrypt messages before sending
        const decryptedMessages = recentMessages.map((msg: any) => ({
          ...msg,
          content: decryptMessage(msg.content),
        }));

        socket.emit('room-joined', {
          roomId,
          messages: decryptedMessages.reverse(),
          participantCount: participantCount + (room.participants.length === 0 ? 1 : 0),
        });

        // Notify others
        socket.to(`room:${roomId}`).emit('user-joined', {
          user: socket.data.identity.displayName,
          participantCount: participantCount + (room.participants.length === 0 ? 1 : 0),
        });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle sending messages
    socket.on('send-message', async (data: unknown) => {
      try {
        // Validate message
        const validatedData = messageSchema.parse(data);
        
        // Rate limiting
        const identifier = `msg:${socket.data.userId}`;
        const { success } = await ratelimit.limit(identifier);
        
        if (!success) {
          socket.emit('error', { message: 'Too many messages. Please slow down.' });
          return;
        }

        // Check if user is in room
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            roomId: validatedData.roomId,
            userId: socket.data.userId,
            isActive: true,
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        // Crisis detection
        const isCrisis = await detectCrisis(validatedData.content, socket.data.userId);
        if (isCrisis) {
          // Send crisis resources immediately
          socket.emit('crisis-resources', {
            message: 'We\'re here for you. Please reach out for support:',
            resources: [
              { name: 'Crisis Helpline', contact: '988', available: '24/7' },
              { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
              { name: 'Emergency Services', contact: '911', available: '24/7' },
            ]
          });
        }

        // Content moderation
        const moderation = await moderateContent(validatedData.content);
        
        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            roomId: validatedData.roomId,
            authorId: socket.data.identity.id,
            content: encryptMessage(moderation.filteredContent),
            type: isCrisis ? 'crisis_alert' : validatedData.type,
            metadata: {
              moderated: !moderation.isClean,
              violations: moderation.violations,
              crisis: isCrisis,
            },
            reactions: [],
            flags: [],
          },
          include: {
            
          }
        });

        // Prepare message for broadcast
        const broadcastMessage = {
          ...message,
          content: moderation.filteredContent, // Send unencrypted to clients
        };

        // Send to room participants
        io.to(`room:${validatedData.roomId}`).emit('new-message', broadcastMessage);

        // Update room last activity
        await prisma.chatRoom.update({
          where: { id: validatedData.roomId },
          data: { lastActivity: new Date() }
        });

        // Update trust score for positive interaction
        if (!isCrisis && moderation.isClean) {
          await updateTrustScore(socket.data.userId, 'message_sent', 1);
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle leaving rooms
    socket.on('leave-room', async (roomId: string) => {
      try {
        await prisma.chatParticipant.updateMany({
          where: {
            roomId,
            userId: socket.data.userId,
          },
          data: {
            isActive: false,
            leftAt: new Date(),
          }
        });

        socket.leave(`room:${roomId}`);
        
        const participantCount = await prisma.chatParticipant.count({
          where: { roomId, isActive: true }
        });

        socket.to(`room:${roomId}`).emit('user-left', {
          user: socket.data.identity.displayName,
          participantCount,
        });
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Handle reactions
    socket.on('add-reaction', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      try {
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId }
        });

        if (!message) return;

        const reactions = message.reactions as any[] || [];
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);

        if (existingReaction) {
          if (!existingReaction.users.includes(socket.data.userId)) {
            existingReaction.users.push(socket.data.userId);
            existingReaction.count++;
          }
        } else {
          reactions.push({
            emoji,
            count: 1,
            users: [socket.data.userId],
          });
        }

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { reactions }
        });

        io.to(`room:${message.roomId}`).emit('reaction-added', {
          messageId,
          reactions,
        });
      } catch (error) {
        console.error('Add reaction error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing-start', ({ roomId }: { roomId: string }) => {
      socket.to(`room:${roomId}`).emit('user-typing', {
        user: socket.data.identity.displayName,
      });
    });

    socket.on('typing-stop', ({ roomId }: { roomId: string }) => {
      socket.to(`room:${roomId}`).emit('user-stopped-typing', {
        user: socket.data.identity.displayName,
      });
    });

    // Handle reporting
    socket.on('report-message', async ({ messageId, reason }: { messageId: string; reason: string }) => {
      try {
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId }
        });

        if (!message) return;

        const flags = message.flags as any[] || [];
        flags.push({
          type: 'user_report',
          flaggedBy: socket.data.userId,
          flaggedAt: new Date(),
          reason,
          resolved: false,
        });

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { flags }
        });

        // Create safety alert for moderators
        await prisma.safetyAlert.create({
          data: {
            type: 'harassment',
            severity: 'medium',
            userId: message.authorId,
            context: `Message reported in chat`,
            indicators: [reason],
            handled: false,
            actions: ['pending_review'],
          }
        });

        socket.emit('report-submitted', { messageId });
      } catch (error) {
        console.error('Report message error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.data.identity.displayName}`);
      
      // Mark user as inactive in all rooms
      await prisma.chatParticipant.updateMany({
        where: {
          userId: socket.data.userId,
          isActive: true,
        },
        data: {
          isActive: false,
          leftAt: new Date(),
        }
      });
    });
  });

  return io;
}

// Update trust score
async function updateTrustScore(userId: string, action: string, points: number) {
  try {
    const trustMetric = await prisma.trustMetric.findUnique({
      where: { userId }
    });

    if (!trustMetric) {
      await prisma.trustMetric.create({
        data: {
          userId,
          score: points,
          level: 'new',
          factors: {
            participation: points,
          },
          history: [
            {
              type: 'positive',
              description: action,
              impact: points,
              timestamp: new Date(),
            }
          ],
          restrictions: [],
        }
      });
    } else {
      const newScore = trustMetric.score + points;
      const level = getTrustLevel(newScore);

      await prisma.trustMetric.update({
        where: { userId },
        data: {
          score: newScore,
          level,
          history: [
            ...trustMetric.history as any[],
            {
              type: points > 0 ? 'positive' : 'negative',
              description: action,
              impact: points,
              timestamp: new Date(),
            }
          ],
          lastUpdated: new Date(),
        }
      });
    }
  } catch (error) {
    console.error('Update trust score error:', error);
  }
}

// Get trust level based on score
function getTrustLevel(score: number): string {
  if (score >= 1000) return 'expert';
  if (score >= 500) return 'veteran';
  if (score >= 200) return 'trusted';
  if (score >= 50) return 'basic';
  return 'new';
}

export default initSocketServer;
