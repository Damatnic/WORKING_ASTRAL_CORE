/**
 * Message Queue for offline message delivery
 * Stores messages for offline users and delivers them when they reconnect
 */

import { Message } from "./events";
import { prisma } from "@/lib/prisma";

interface QueuedMessage extends Message {
  queuedAt: Date;
  attempts: number;
  expiresAt: Date;
}

export class MessageQueue {
  private queues: Map<string, QueuedMessage[]> = new Map();
  private maxQueueSize: number = 100;
  private messageExpiry: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Load queued messages from database on startup
    this.loadQueuedMessages();

    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Queue a message for an offline user
   */
  public queueMessage(userId: string, message: Message): void {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }

    const queue = this.queues.get(userId)!;
    
    // Check queue size limit
    if (queue.length >= this.maxQueueSize) {
      // Remove oldest message
      queue.shift();
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      queuedAt: new Date(),
      attempts: 0,
      expiresAt: new Date(Date.now() + this.messageExpiry),
    };

    queue.push(queuedMessage);

    // Persist to database
    this.persistMessage(userId, queuedMessage);
  }

  /**
   * Get queued messages for a user
   */
  public async getQueuedMessages(userId: string): Promise<Message[]> {
    // Get from memory cache first
    const cachedMessages = this.queues.get(userId) || [];
    
    // Also check database for any missed messages
    const dbMessages = await this.loadUserMessages(userId);
    
    // Merge and deduplicate
    const allMessages = [...cachedMessages, ...dbMessages];
    const uniqueMessages = this.deduplicateMessages(allMessages);
    
    // Clear the queue after retrieval
    this.queues.delete(userId);
    await this.clearUserMessages(userId);
    
    return uniqueMessages;
  }

  /**
   * Queue multiple messages for multiple users
   */
  public queueBulkMessages(userIds: string[], message: Message): void {
    for (const userId of userIds) {
      this.queueMessage(userId, message);
    }
  }

  /**
   * Get queue size for a user
   */
  public getQueueSize(userId: string): number {
    return this.queues.get(userId)?.length || 0;
  }

  /**
   * Clear queue for a user
   */
  public clearQueue(userId: string): void {
    this.queues.delete(userId);
    this.clearUserMessages(userId);
  }

  /**
   * Load queued messages from database on startup
   */
  private async loadQueuedMessages(): Promise<void> {
    try {
      // This would load from a QueuedMessage table
      // For now, we'll use a simplified approach
      console.log("Loading queued messages from database...");
    } catch (error) {
      console.error("Error loading queued messages:", error);
    }
  }

  /**
   * Load messages for a specific user from database
   */
  private async loadUserMessages(userId: string): Promise<QueuedMessage[]> {
    try {
      // This would load from a QueuedMessage table
      // Simplified implementation for now
      return [];
    } catch (error) {
      console.error(`Error loading messages for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Persist a message to database
   */
  private async persistMessage(userId: string, message: QueuedMessage): Promise<void> {
    try {
      // This would save to a QueuedMessage table
      // Simplified implementation for now
      console.log(`Persisting message for user ${userId}`);
    } catch (error) {
      console.error(`Error persisting message for user ${userId}:`, error);
    }
  }

  /**
   * Clear persisted messages for a user
   */
  private async clearUserMessages(userId: string): Promise<void> {
    try {
      // This would delete from QueuedMessage table
      // Simplified implementation for now
      console.log(`Clearing messages for user ${userId}`);
    } catch (error) {
      console.error(`Error clearing messages for user ${userId}:`, error);
    }
  }

  /**
   * Remove duplicate messages
   */
  private deduplicateMessages(messages: QueuedMessage[]): Message[] {
    const seen = new Set<string>();
    const unique: Message[] = [];
    
    for (const msg of messages) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        const { queuedAt, attempts, expiresAt, ...message } = msg;
        unique.push(message);
      }
    }
    
    return unique;
  }

  /**
   * Clean up expired messages
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [userId, queue] of this.queues.entries()) {
      const validMessages = queue.filter(msg => 
        msg.expiresAt.getTime() > now
      );
      
      if (validMessages.length === 0) {
        this.queues.delete(userId);
      } else if (validMessages.length < queue.length) {
        this.queues.set(userId, validMessages);
      }
    }
  }

  /**
   * Get statistics about the message queue
   */
  public getStats(): {
    totalQueues: number;
    totalMessages: number;
    largestQueue: { userId: string; size: number } | null;
  } {
    let totalMessages = 0;
    let largestQueue: { userId: string; size: number } | null = null;
    
    for (const [userId, queue] of this.queues.entries()) {
      totalMessages += queue.length;
      
      if (!largestQueue || queue.length > largestQueue.size) {
        largestQueue = { userId, size: queue.length };
      }
    }
    
    return {
      totalQueues: this.queues.size,
      totalMessages,
      largestQueue,
    };
  }

  /**
   * Destroy the message queue
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.queues.clear();
  }
}