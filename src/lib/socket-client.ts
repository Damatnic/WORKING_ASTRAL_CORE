// Socket.io Client Configuration
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

// Socket store using Zustand
export const useSocket = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  connecting: false,
  error: null,

  connect: () => {
    const state = get();
    
    if (state.socket?.connected || state.connecting) {
      return;
    }

    set({ connecting: true, error: null });

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected');
      set({ connected: true, connecting: false, socket });
      toast.success('Connected to community');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      set({ connected: false });
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        // Reconnect if not already connected
        if (!socket.connected) {
          (socket as any).connect();
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ 
        connecting: false, 
        error: error.message,
        connected: false 
      });
      toast.error('Connection failed. Please check your internet connection.');
    });

    // Global error handler
    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    // Crisis resources handler
    socket.on('crisis-resources', (data: {
      message: string;
      resources: Array<{
        name: string;
        contact: string;
        available: string;
      }>;
    }) => {
      // Show crisis resources in a special modal
      if (window.showCrisisResources) {
        window.showCrisisResources(data);
      } else {
        toast(data.message, {
          duration: 10000,
          icon: '🆘',
        });
      }
    });

    // Real-time notifications
    const push = (payload: any, fallbackTitle: string, type: any = 'system') => {
      try {
        const { add } = useNotifications.getState();
        const title = payload?.title || fallbackTitle;
        const body = payload?.body || payload?.message || '';
        add({ type, title, body, data: payload });
      } catch (e) {
        console.error('Failed to add notification:', e);
      }
    };

    socket.on('notification', (payload: any) => push(payload, 'Notification', payload?.type));
    socket.on('notification:new', (payload: any) => push(payload, 'Notification', payload?.type));
    socket.on('community:invite', (payload: any) => push(payload, 'Community invite', 'invite'));
    socket.on('community:reply', (payload: any) => push(payload, 'New reply', 'community'));
    socket.on('message:new', (payload: any) => push(payload, 'New message', 'message'));

    set({ socket });
  },

  disconnect: () => {
    const state = get();
    
    if (state.socket) {
      state.socket.disconnect();
      set({ socket: null, connected: false, connecting: false });
      toast.success('Disconnected from community');
    }
  },

  emit: (event: string, data?: any) => {
    const state = get();
    
    if (!state.socket?.connected) {
      console.warn('Socket not connected, cannot emit event:', event);
      toast.error('Not connected. Please refresh the page.');
      return;
    }

    state.socket.emit(event, data);
  },

  on: (event: string, handler: (...args: any[]) => void) => {
    const state = get();
    
    if (!state.socket) {
      console.warn('Socket not initialized, cannot listen to event:', event);
      return;
    }

    state.socket.on(event, handler);
  },

  off: (event: string, handler?: (...args: any[]) => void) => {
    const state = get();
    
    if (!state.socket) {
      return;
    }

    if (handler) {
      state.socket.off(event, handler);
    } else {
      state.socket.off(event);
    }
  },
}));

// Custom hook for socket events
import { useEffect } from 'react';

export function useSocketEvent(
  event: string,
  handler: (...args: any[]) => void,
  deps: any[] = []
) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, handler);

    return () => {
      off(event, handler);
    };
  }, [event, ...deps]);
}

// Auto-connect on app load
if (typeof window !== 'undefined') {
  // Only connect if user is authenticated
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });
      
      if (response.ok) {
        useSocket.getState().connect();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  checkAuth();
}

// Type declarations for window
declare global {
  interface Window {
    showCrisisResources?: (data: {
      message: string;
      resources: Array<{
        name: string;
        contact: string;
        available: string;
      }>;
    }) => void;
  }
}
