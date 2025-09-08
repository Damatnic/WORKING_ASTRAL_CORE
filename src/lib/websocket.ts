import { Server as HTTPServer } from 'http';

// Use require for socket.io to avoid typing issues
const { Server: SocketIOServer } = require('socket.io');

// Type aliases
type Socket = any;
import { parse } from 'cookie';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// WebSocket events for crisis management
export enum CrisisEvents {
  // Alert events
  ALERT_CREATED = 'crisis:alert:created',
  ALERT_UPDATED = 'crisis:alert:updated',
  ALERT_ASSIGNED = 'crisis:alert:assigned',
  ALERT_RESOLVED = 'crisis:alert:resolved',
  
  // Report events
  REPORT_CREATED = 'crisis:report:created',
  REPORT_UPDATED = 'crisis:report:updated',
  REPORT_ESCALATED = 'crisis:report:escalated',
  
  // Intervention events
  INTERVENTION_REQUESTED = 'crisis:intervention:requested',
  INTERVENTION_STARTED = 'crisis:intervention:started',
  INTERVENTION_COMPLETED = 'crisis:intervention:completed',
  
  // Safety plan events
  SAFETY_PLAN_ACTIVATED = 'crisis:safety:activated',
  SAFETY_PLAN_UPDATED = 'crisis:safety:updated',
  
  // Counselor events
  COUNSELOR_ASSIGNED = 'crisis:counselor:assigned',
  COUNSELOR_MESSAGE = 'crisis:counselor:message',
  COUNSELOR_STATUS = 'crisis:counselor:status',
  
  // System events
  EMERGENCY_BROADCAST = 'crisis:emergency:broadcast',
  SYSTEM_ALERT = 'crisis:system:alert',
}

// Additional WebSocket event constants for API compatibility
export const WEBSOCKET_EVENTS = {
  ...CrisisEvents,
  // Aliases for commonly used events
  ALERT_UPDATED: CrisisEvents.ALERT_UPDATED,
  INTERVENTION_STARTED: CrisisEvents.INTERVENTION_STARTED,  
  INTERVENTION_COMPLETED: CrisisEvents.INTERVENTION_COMPLETED,
  REPORT_UPDATED: CrisisEvents.REPORT_UPDATED,
};

// Room types for different user groups
export enum Rooms {
  CRISIS_COUNSELORS = 'room:crisis-counselors',
  ADMINS = 'room:admins',
  HELPERS = 'room:helpers',
  USER_PREFIX = 'room:user:',
}

// WebSocket authentication middleware
const authenticateSocket = async (socket: Socket, next: (error?: Error) => void) => {
  try {
    const cookies = parse(socket.handshake.headers.cookie || '');
    const sessionToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
    
    if (!sessionToken) {
      return next(new Error('Authentication required'));
    }
    
    // Verify session
    const session = await getServerSession(authOptions);
    const sessionUser = (session as any).user;
    if (!(session as any)?.user) {
      return next(new Error('Invalid session'));
    }
    
    // Attach user to socket
    (socket as any).userId = sessionUser.id;
    (socket as any).userRole = sessionUser.role;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Authorization middleware for crisis counselors
const authorizeCrisisCounselor = (socket: Socket, next: (error?: Error) => void) => {
  const userRole = (socket as any).userRole;
  
  if (![UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
    return next(new Error('Insufficient permissions'));
  }
  
  next();
};

// WebSocket server singleton
let io: any | null = null;

/**
 * Initialize WebSocket server
 * @param httpServer - HTTP server instance
 * @returns Socket.IO server instance
 */
export const initWebSocket = (httpServer: HTTPServer): any => {
  if (io) return io;
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  
  // Apply authentication middleware
  (io as any).use(authenticateSocket);
  
  // Connection handler
  (io as any).on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;
    
    console.log(`User ${userId} connected with role ${userRole}`);
    
    // Join user to their personal room
    socket.join(`${Rooms.USER_PREFIX}${userId}`);
    
    // Join role-based rooms
    if ([UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      socket.join(Rooms.CRISIS_COUNSELORS);
    }
    
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      socket.join(Rooms.ADMINS);
    }
    
    if ([UserRole.HELPER, UserRole.THERAPIST].includes(userRole)) {
      socket.join(Rooms.HELPERS);
    }
    
    // Log connection in audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'websocket_connected',
        resource: 'websocket',
        details: {
          socketId: socket.id,
          userRole,
        },
        outcome: 'success',
      },
    }).catch(console.error);
    
    // Crisis-specific event handlers
    socket.on('crisis:subscribe', async (data) => {
      // Verify permissions for crisis subscription
      if (![UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
        socket.emit('error', { message: 'Unauthorized to subscribe to crisis events' });
        return;
      }
      
      socket.join('crisis:active');
      socket.emit('crisis:subscribed', { status: 'success' });
    });
    
    // Handle crisis alert acknowledgment
    socket.on('crisis:alert:acknowledge', async (data) => {
      const { alertId } = data;
      
      // Verify counselor permissions
      if (![UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
        socket.emit('error', { message: 'Unauthorized to acknowledge alerts' });
        return;
      }
      
      try {
        // Update alert in database
        await prisma.safetyAlert.update({
          where: { id: alertId },
          data: {
            handled: true,
            handledBy: userId,
            handledAt: new Date(),
          },
        });
        
        // Notify all crisis counselors
        io?.to(Rooms.CRISIS_COUNSELORS).emit(CrisisEvents.ALERT_ASSIGNED, {
          alertId,
          counselorId: userId,
          timestamp: new Date(),
        });
        
        // Log action
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'crisis_alert_acknowledged',
            resource: 'safety_alert',
            resourceId: alertId,
            outcome: 'success',
          },
        });
      } catch (error) {
        console.error('Error acknowledging alert:', error);
        socket.emit('error', { message: 'Failed to acknowledge alert' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);
      
      // Log disconnection
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'websocket_disconnected',
          resource: 'websocket',
          details: {
            socketId: socket.id,
          },
          outcome: 'success',
        },
      }).catch(console.error);
    });
  });
  
  return io;
};

/**
 * Get WebSocket server instance
 * @returns Socket.IO server instance or null
 */
export const getIO = (): any | null => io;

/**
 * Emit crisis alert to counselors
 * @param alert - Alert data
 */
export const emitCrisisAlert = (alert: any) => {
  if (!io) return;
  
  io.to(Rooms.CRISIS_COUNSELORS).emit(CrisisEvents.ALERT_CREATED, {
    ...alert,
    timestamp: new Date(),
  });
};

/**
 * Emit emergency broadcast to all connected users
 * @param message - Emergency message
 * @param severity - Severity level
 */
export const emitEmergencyBroadcast = (message: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  if (!io) return;
  
  io.emit(CrisisEvents.EMERGENCY_BROADCAST, {
    message,
    severity,
    timestamp: new Date(),
  });
};

/**
 * Notify specific user
 * @param userId - User ID
 * @param event - Event name
 * @param data - Event data
 */
export const notifyUser = (userId: string, event: string, data: any) => {
  if (!io) return;
  
  io.to(`${Rooms.USER_PREFIX}${userId}`).emit(event, {
    ...data,
    timestamp: new Date(),
  });
};

/**
 * Notify crisis counselors
 * @param event - Event name
 * @param data - Event data
 */
export const notifyCounselors = (event: CrisisEvents, data: any) => {
  if (!io) return;
  
  io.to(Rooms.CRISIS_COUNSELORS).emit(event, {
    ...data,
    timestamp: new Date(),
  });
};

/**
 * Get connected crisis counselors count
 * @returns Number of connected crisis counselors
 */
export const getActiveCounselorsCount = async (): Promise<number> => {
  if (!io) return 0;
  
  const sockets = await (io as any).in(Rooms.CRISIS_COUNSELORS).fetchSockets();
  return sockets.length;
};

/**
 * Check if user is online
 * @param userId - User ID
 * @returns True if user is online
 */
export const isUserOnline = async (userId: string): Promise<boolean> => {
  if (!io) return false;
  
  const sockets = await (io as any).in(`${Rooms.USER_PREFIX}${userId}`).fetchSockets();
  return sockets.length > 0;
};

// Export types for use in API routes
export type { Socket, SocketIOServer };

