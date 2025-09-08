/**
 * Presence Manager for tracking user online status
 * Manages user presence, activity, and status updates
 */

import { UserPresence, PresenceStatus, DeviceInfo } from "./events";

export class PresenceManager {
  private presenceData: Map<string, UserPresence> = new Map();
  private deviceSessions: Map<string, Map<string, DeviceInfo>> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up stale presence data every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, 30 * 1000);
  }

  /**
   * Set user as online
   */
  public setUserOnline(userId: string, socketId: string, deviceInfo?: Partial<DeviceInfo>): void {
    const currentPresence = this.presenceData.get(userId);
    
    const newPresence: UserPresence = {
      userId,
      status: PresenceStatus.ONLINE,
      lastSeen: new Date(),
      currentRoom: currentPresence?.currentRoom,
      isTyping: false,
      customStatus: currentPresence?.customStatus,
      devices: [],
    };

    // Add device info
    if (!this.deviceSessions.has(userId)) {
      this.deviceSessions.set(userId, new Map());
    }

    const userDevices = this.deviceSessions.get(userId)!;
    const device: DeviceInfo = {
      id: socketId,
      type: deviceInfo?.type || "web",
      platform: deviceInfo?.platform,
      lastActive: new Date(),
    };

    userDevices.set(socketId, device);
    newPresence.devices = Array.from(userDevices.values());

    this.presenceData.set(userId, newPresence);
  }

  /**
   * Set user as offline
   */
  public setUserOffline(userId: string, socketId?: string): void {
    if (socketId) {
      // Remove specific device
      const userDevices = this.deviceSessions.get(userId);
      if (userDevices) {
        userDevices.delete(socketId);
        
        // If no more devices, set as offline
        if (userDevices.size === 0) {
          this.deviceSessions.delete(userId);
          this.setFullyOffline(userId);
        } else {
          // Update presence with remaining devices
          const presence = this.presenceData.get(userId);
          if (presence) {
            presence.devices = Array.from(userDevices.values());
            presence.lastSeen = new Date();
          }
        }
      }
    } else {
      // Set fully offline
      this.deviceSessions.delete(userId);
      this.setFullyOffline(userId);
    }
  }

  /**
   * Set user as fully offline
   */
  private setFullyOffline(userId: string): void {
    const presence = this.presenceData.get(userId);
    if (presence) {
      presence.status = PresenceStatus.OFFLINE;
      presence.lastSeen = new Date();
      presence.currentRoom = undefined;
      presence.isTyping = false;
      presence.typingIn = undefined;
      presence.devices = [];
    }

    // Remove from typing users
    for (const [roomId, typingSet] of this.typingUsers.entries()) {
      typingSet.delete(userId);
    }
  }

  /**
   * Update user presence
   */
  public updatePresence(userId: string, updates: Partial<UserPresence>): void {
    const current = this.presenceData.get(userId) || {
      userId,
      status: PresenceStatus.OFFLINE,
      lastSeen: new Date(),
      devices: [],
    };

    const updated: UserPresence = {
      ...current,
      ...updates,
      lastSeen: new Date(),
    };

    this.presenceData.set(userId, updated);
  }

  /**
   * Update last seen time
   */
  public updateLastSeen(userId: string): void {
    const presence = this.presenceData.get(userId);
    if (presence) {
      presence.lastSeen = new Date();
      
      // Update device activity
      const userDevices = this.deviceSessions.get(userId);
      if (userDevices) {
        for (const device of userDevices.values()) {
          device.lastActive = new Date();
        }
      }
    }
  }

  /**
   * Set user typing status
   */
  public setTyping(userId: string, roomId: string, isTyping: boolean): void {
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Set());
    }

    const roomTypingUsers = this.typingUsers.get(roomId)!;
    
    if (isTyping) {
      roomTypingUsers.add(userId);
    } else {
      roomTypingUsers.delete(userId);
    }

    // Update presence
    const presence = this.presenceData.get(userId);
    if (presence) {
      presence.isTyping = isTyping;
      presence.typingIn = isTyping ? roomId : undefined;
    }
  }

  /**
   * Get typing users in a room
   */
  public getTypingUsers(roomId: string): string[] {
    const typingSet = this.typingUsers.get(roomId);
    return typingSet ? Array.from(typingSet) : [];
  }

  /**
   * Set user's current room
   */
  public setCurrentRoom(userId: string, roomId: string | undefined): void {
    const presence = this.presenceData.get(userId);
    if (presence) {
      presence.currentRoom = roomId;
    }
  }

  /**
   * Get user presence
   */
  public getUserPresence(userId: string): UserPresence | undefined {
    return this.presenceData.get(userId);
  }

  /**
   * Get multiple users' presence
   */
  public getBulkPresence(userIds: string[]): Map<string, UserPresence> {
    const result = new Map<string, UserPresence>();
    
    for (const userId of userIds) {
      const presence = this.presenceData.get(userId);
      if (presence) {
        result.set(userId, presence);
      }
    }
    
    return result;
  }

  /**
   * Get online users
   */
  public getOnlineUsers(): string[] {
    const online: string[] = [];
    
    for (const [userId, presence] of this.presenceData.entries()) {
      if (presence.status === PresenceStatus.ONLINE) {
        online.push(userId);
      }
    }
    
    return online;
  }

  /**
   * Get users in a specific room
   */
  public getUsersInRoom(roomId: string): string[] {
    const users: string[] = [];
    
    for (const [userId, presence] of this.presenceData.entries()) {
      if (presence.currentRoom === roomId && presence.status === PresenceStatus.ONLINE) {
        users.push(userId);
      }
    }
    
    return users;
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    const presence = this.presenceData.get(userId);
    return presence?.status === PresenceStatus.ONLINE;
  }

  /**
   * Set custom status
   */
  public setCustomStatus(userId: string, status: string | undefined): void {
    const presence = this.presenceData.get(userId);
    if (presence) {
      presence.customStatus = status;
    }
  }

  /**
   * Clean up stale presence data
   */
  private cleanupStalePresence(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, presence] of this.presenceData.entries()) {
      // Skip offline users
      if (presence.status === PresenceStatus.OFFLINE) {
        continue;
      }
      
      const lastSeenTime = presence.lastSeen.getTime();
      if (now - lastSeenTime > staleThreshold) {
        // Mark as away if stale
        presence.status = PresenceStatus.AWAY;
      }
      
      // Clean up very old presence data (24 hours)
      if (now - lastSeenTime > 24 * 60 * 60 * 1000) {
        this.presenceData.delete(userId);
        this.deviceSessions.delete(userId);
      }
    }
    
    // Clean up empty typing rooms
    for (const [roomId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.size === 0) {
        this.typingUsers.delete(roomId);
      }
    }
  }

  /**
   * Get presence statistics
   */
  public getStats(): {
    totalUsers: number;
    onlineUsers: number;
    awayUsers: number;
    offlineUsers: number;
    typingUsers: number;
    activeRooms: number;
  } {
    let onlineUsers = 0;
    let awayUsers = 0;
    let offlineUsers = 0;
    let typingUsers = 0;
    const activeRooms = new Set<string>();
    
    for (const presence of this.presenceData.values()) {
      switch (presence.status) {
        case PresenceStatus.ONLINE:
          onlineUsers++;
          break;
        case PresenceStatus.AWAY:
          awayUsers++;
          break;
        case PresenceStatus.OFFLINE:
          offlineUsers++;
          break;
      }
      
      if (presence.isTyping) {
        typingUsers++;
      }
      
      if (presence.currentRoom) {
        activeRooms.add(presence.currentRoom);
      }
    }
    
    return {
      totalUsers: this.presenceData.size,
      onlineUsers,
      awayUsers,
      offlineUsers,
      typingUsers,
      activeRooms: activeRooms.size,
    };
  }

  /**
   * Destroy the presence manager
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.presenceData.clear();
    this.deviceSessions.clear();
    this.typingUsers.clear();
  }
}