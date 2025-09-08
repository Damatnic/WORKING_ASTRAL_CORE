import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

export interface WSMessage {
  id: string;
  type: 'message' | 'typing' | 'presence' | 'notification' | 'crisis_alert' | 'file_share';
  from: string;
  to?: string;
  roomId?: string;
  content?: string;
  data?: any;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  encrypted?: boolean;
}

export interface WebSocketHookResult {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: Omit<WSMessage, 'id' | 'from' | 'timestamp'>) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  messages: WSMessage[];
  onlineUsers: Set<string>;
}

interface UseWebSocketOptions {
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookResult {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  
  const {
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const connect = useCallback(() => {
    if (!session?.user || isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/websocket?userId=${(session as any).user.id}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        
        onConnect?.();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          
          // Handle different message types
          switch (message.type) {
            case 'message':
            case 'file_share':
              setMessages(prev => [...prev, message]);
              break;
              
            case 'presence':
              if (message.data?.online) {
                setOnlineUsers(prev => new Set([...prev, message.from]));
              } else {
                setOnlineUsers(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(message.from);
                  return newSet;
                });
              }
              break;
              
            case 'typing':
              // Handle typing indicators
              break;
              
            case 'notification':
            case 'crisis_alert':
              // Handle system notifications
              break;
          }
          
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        onDisconnect?.();
        
        // Attempt reconnection if enabled
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached');
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
        onError?.(event);
      };
      
      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to create connection');
      setIsConnecting(false);
    }
  }, [session, isConnecting, isConnected, reconnect, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, [socket]);

  const sendMessage = useCallback((message: Omit<WSMessage, 'id' | 'from' | 'timestamp'>) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !(session as any)?.user?.id) {
      console.warn('Cannot send message: WebSocket not connected or no user session');
      return;
    }

    const fullMessage: WSMessage = {
      ...message,
      id: crypto.randomUUID(),
      from: (session as any).user.id,
      timestamp: new Date()
    };

    try {
      socket.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }, [socket, session]);

  const joinRoom = useCallback((roomId: string) => {
    sendMessage({
      type: 'presence',
      roomId,
      data: { action: 'join' }
    });
  }, [sendMessage]);

  const leaveRoom = useCallback((roomId: string) => {
    sendMessage({
      type: 'presence',
      roomId,
      data: { action: 'leave' }
    });
  }, [sendMessage]);

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      roomId,
      data: { isTyping }
    });
  }, [sendMessage]);

  // Connect when session is available
  useEffect(() => {
    if ((session as any)?.user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [(session as any)?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    joinRoom,
    leaveRoom,
    sendTyping,
    messages,
    onlineUsers
  };
}