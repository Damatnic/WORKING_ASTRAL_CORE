/**
 * AI WebSocket Service
 * Real-time bidirectional communication for AI therapy sessions
 */

import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableEncryption: boolean;
}

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  payload: any;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  encrypted?: boolean;
}

export type MessageType = 
  | 'chat_message'
  | 'ai_response'
  | 'intervention_start'
  | 'intervention_update'
  | 'intervention_complete'
  | 'crisis_alert'
  | 'human_handoff'
  | 'session_start'
  | 'session_end'
  | 'typing_indicator'
  | 'presence_update'
  | 'system_notification'
  | 'error';

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  latency: number;
}

export interface SessionState {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  interventionCount: number;
  aiConfidence: number;
  riskLevel?: string;
  humanOversight: boolean;
}

export interface RealtimeMetrics {
  messagesPerMinute: number;
  averageResponseTime: number;
  activeConnections: number;
  queuedMessages: number;
  errorRate: number;
}

export class AIWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionState;
  private sessionState: SessionState | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private metrics: RealtimeMetrics;
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    this.config = this.getDefaultConfig(config);
    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0,
      latency: 0
    };
    this.metrics = this.initializeMetrics();
    this.initializeHandlers();
  }

  private getDefaultConfig(partial: Partial<WebSocketConfig>): WebSocketConfig {
    return {
      url: partial.url || process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.astralcore.ai/ws',
      reconnectInterval: partial.reconnectInterval || 3000,
      maxReconnectAttempts: partial.maxReconnectAttempts || 10,
      heartbeatInterval: partial.heartbeatInterval || 30000,
      messageTimeout: partial.messageTimeout || 10000,
      enableEncryption: partial.enableEncryption !== false
    };
  }

  private initializeMetrics(): RealtimeMetrics {
    return {
      messagesPerMinute: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      queuedMessages: 0,
      errorRate: 0
    };
  }

  private initializeHandlers(): void {
    // Register default handlers for system messages
    this.registerHandler('error', this.handleError.bind(this));
    this.registerHandler('system_notification', this.handleSystemNotification.bind(this));
    this.registerHandler('presence_update', this.handlePresenceUpdate.bind(this));
  }

  public async connect(sessionId: string, userId: string): Promise<void> {
    if (this.connectionState.status === 'connected') {
      console.log('WebSocket already connected');
      return;
    }

    this.connectionState.status = 'connecting';
    this.emit('connecting');

    try {
      // Create WebSocket connection with authentication
      const url = `${this.config.url}?sessionId=${sessionId}&userId=${userId}`;
      this.ws = new WebSocket(url);

      this.setupEventListeners();
      
      // Wait for connection to open
      await this.waitForConnection();
      
      // Start session
      this.sessionState = {
        id: sessionId,
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        interventionCount: 0,
        aiConfidence: 1.0,
        humanOversight: false
      };

      // Send session start message
      await this.send({
        type: 'session_start',
        payload: { sessionId, userId }
      });

      // Start heartbeat
      this.startHeartbeat();

      this.connectionState.status = 'connected';
      this.connectionState.lastConnected = new Date();
      this.connectionState.reconnectAttempts = 0;
      
      this.emit('connected', { sessionId, userId });
      
      // Process queued messages
      await this.processMessageQueue();

    } catch (error) {
      this.connectionState.status = 'error';
      this.emit('error', error);
      await this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.metrics.activeConnections++;
    };

    this.ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        await this.handleMessage(message);
        this.updateMetrics('message_received');
      } catch (error) {
        console.error('Error parsing message:', error);
        this.updateMetrics('error');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionState.status = 'error';
      this.emit('error', error);
      this.updateMetrics('error');
    };

    this.ws.onclose = async (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.connectionState.status = 'disconnected';
      this.metrics.activeConnections--;
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Attempt reconnection if not intentional close
      if (event.code !== 1000) {
        await this.handleReconnect();
      }
    };
  }

  private async waitForConnection(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      const checkConnection = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timer);
          clearInterval(checkConnection);
          resolve();
        }
      }, 100);
    });
  }

  private async handleReconnect(): Promise<void> {
    if (this.connectionState.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('max_reconnect_attempts');
      return;
    }

    this.connectionState.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(async () => {
      console.log(`Reconnection attempt ${this.connectionState.reconnectAttempts}`);
      this.emit('reconnecting', { attempt: this.connectionState.reconnectAttempts });
      
      if (this.sessionState) {
        await this.connect(this.sessionState.id, this.sessionState.userId);
      }
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const ping = Date.now();
        await this.send({
          type: 'system_notification',
          payload: { type: 'ping', timestamp: ping }
        });
        
        // Measure latency when pong received
        this.once('pong', () => {
          this.connectionState.latency = Date.now() - ping;
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async send(
    message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'sessionId'>
  ): Promise<void> {
    const fullMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      sessionId: this.sessionState?.id || '',
      ...message
    };

    // Encrypt if enabled
    if (this.config.enableEncryption && message.type === 'chat_message') {
      fullMessage.payload = await this.encryptPayload(fullMessage.payload);
      fullMessage.encrypted = true;
    }

    // Queue message if not connected
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(fullMessage);
      this.metrics.queuedMessages++;
      return;
    }

    // Send message
    try {
      this.ws.send(JSON.stringify(fullMessage));
      
      // Track pending messages that expect responses
      if (this.expectsResponse(message.type)) {
        this.trackPendingMessage(fullMessage);
      }
      
      // Update session activity
      if (this.sessionState) {
        this.sessionState.lastActivity = new Date();
        this.sessionState.messageCount++;
      }
      
      this.updateMetrics('message_sent');
      this.emit('message_sent', fullMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageQueue.push(fullMessage);
      this.updateMetrics('error');
      throw error;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private expectsResponse(type: MessageType): boolean {
    return ['chat_message', 'intervention_start'].includes(type);
  }

  private trackPendingMessage(message: WebSocketMessage): void {
    this.pendingMessages.set(message.id, {
      message,
      timestamp: Date.now(),
      timeout: setTimeout(() => {
        this.handleMessageTimeout(message.id);
      }, this.config.messageTimeout)
    });
  }

  private handleMessageTimeout(messageId: string): void {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      this.pendingMessages.delete(messageId);
      this.emit('message_timeout', pending.message);
      this.updateMetrics('timeout');
    }
  }

  private async handleMessage(message: WebSocketMessage): Promise<void> {
    // Decrypt if necessary
    if (message.encrypted) {
      message.payload = await this.decryptPayload(message.payload);
    }

    // Handle response to pending message
    if (message.payload?.responseToId) {
      this.resolvePendingMessage(message.payload.responseToId, message);
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type) || [];
    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Handler error for ${message.type}:`, error);
      }
    }

    // Emit message event
    this.emit('message', message);
    this.emit(`message:${message.type}`, message);

    // Update session state based on message type
    this.updateSessionState(message);
  }

  private resolvePendingMessage(messageId: string, response: WebSocketMessage): void {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      const responseTime = Date.now() - pending.timestamp;
      this.updateAverageResponseTime(responseTime);
      this.pendingMessages.delete(messageId);
      this.emit('message_response', { request: pending.message, response, responseTime });
    }
  }

  private updateSessionState(message: WebSocketMessage): void {
    if (!this.sessionState) return;

    switch (message.type) {
      case 'ai_response':
        if (message.payload.confidence !== undefined) {
          this.sessionState.aiConfidence = message.payload.confidence;
        }
        if (message.payload.riskLevel) {
          this.sessionState.riskLevel = message.payload.riskLevel;
        }
        break;
      
      case 'intervention_start':
        this.sessionState.interventionCount++;
        break;
      
      case 'human_handoff':
        this.sessionState.humanOversight = true;
        break;
      
      case 'crisis_alert':
        this.sessionState.riskLevel = 'critical';
        break;
    }
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.metrics.queuedMessages--;
      
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('queued_message_sent', message);
      } catch (error) {
        console.error('Error sending queued message:', error);
        this.messageQueue.unshift(message); // Put it back
        this.metrics.queuedMessages++;
        break;
      }
    }
  }

  public registerHandler(type: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  public unregisterHandler(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private async handleError(message: WebSocketMessage): Promise<void> {
    console.error('WebSocket error message:', message.payload);
    this.emit('error_message', message.payload);
  }

  private async handleSystemNotification(message: WebSocketMessage): Promise<void> {
    if (message.payload.type === 'ping') {
      // Respond to ping
      await this.send({
        type: 'system_notification',
        payload: { type: 'pong', timestamp: Date.now() }
      });
    } else if (message.payload.type === 'pong') {
      this.emit('pong');
    }
  }

  private async handlePresenceUpdate(message: WebSocketMessage): Promise<void> {
    this.emit('presence', message.payload);
  }

  public async sendChatMessage(content: string, metadata?: any): Promise<void> {
    await this.send({
      type: 'chat_message',
      payload: {
        content,
        metadata,
        timestamp: new Date()
      }
    });
  }

  public async sendTypingIndicator(isTyping: boolean): Promise<void> {
    await this.send({
      type: 'typing_indicator',
      payload: { isTyping }
    });
  }

  public async startIntervention(
    interventionId: string,
    interventionData: any
  ): Promise<void> {
    await this.send({
      type: 'intervention_start',
      payload: {
        interventionId,
        ...interventionData
      }
    });
  }

  public async updateIntervention(
    interventionId: string,
    update: any
  ): Promise<void> {
    await this.send({
      type: 'intervention_update',
      payload: {
        interventionId,
        ...update
      }
    });
  }

  public async completeIntervention(
    interventionId: string,
    result: any
  ): Promise<void> {
    await this.send({
      type: 'intervention_complete',
      payload: {
        interventionId,
        ...result
      }
    });
  }

  public async requestHumanHandoff(reason: string): Promise<void> {
    await this.send({
      type: 'human_handoff',
      payload: {
        reason,
        requestedAt: new Date()
      }
    });
  }

  public async disconnect(): Promise<void> {
    // Clear timers
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear pending messages
    for (const pending of this.pendingMessages.values()) {
      clearTimeout(pending.timeout);
    }
    this.pendingMessages.clear();

    // Send session end if connected
    if (this.ws?.readyState === WebSocket.OPEN && this.sessionState) {
      await this.send({
        type: 'session_end',
        payload: {
          duration: Date.now() - this.sessionState.startTime.getTime(),
          messageCount: this.sessionState.messageCount,
          interventionCount: this.sessionState.interventionCount
        }
      });
    }

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.connectionState.status = 'disconnected';
    this.sessionState = null;
    this.emit('disconnected', { intentional: true });
  }

  private async encryptPayload(payload: any): Promise<string> {
    // Placeholder for encryption
    // In production, use proper encryption
    return JSON.stringify(payload);
  }

  private async decryptPayload(encrypted: string): Promise<any> {
    // Placeholder for decryption
    // In production, use proper decryption
    return JSON.parse(encrypted);
  }

  private updateMetrics(event: string): void {
    const now = Date.now();
    
    switch (event) {
      case 'message_sent':
      case 'message_received':
        // Update messages per minute
        // This is a simplified calculation
        this.metrics.messagesPerMinute++;
        break;
      
      case 'error':
        this.metrics.errorRate++;
        break;
      
      case 'timeout':
        this.metrics.errorRate++;
        break;
    }

    this.metrics.queuedMessages = this.messageQueue.length;
    
    // Emit metrics update periodically
    this.emit('metrics', this.metrics);
  }

  private updateAverageResponseTime(responseTime: number): void {
    // Simple moving average
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public getSessionState(): SessionState | null {
    return this.sessionState ? { ...this.sessionState } : null;
  }

  public getMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }
}

interface PendingMessage {
  message: WebSocketMessage;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

type MessageHandler = (message: WebSocketMessage) => Promise<void>;

export default AIWebSocketService;