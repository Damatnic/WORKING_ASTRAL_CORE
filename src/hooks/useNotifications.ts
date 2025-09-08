import { create } from 'zustand';

export type NotificationType = 'system' | 'community' | 'message' | 'invite' | 'reminder';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  data?: Record<string, any>;
}

interface NotificationState {
  notifications: AppNotification[];
  unread: number;
  add: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AppNotification,'id'|'createdAt'|'read'>>) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  unread: 0,
  add: (n) => set((state) => {
    const id = n.id || `ntf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const notif: AppNotification = {
      id,
      type: n.type || 'system',
      title: n.title || 'Notification',
      body: n.body || '',
      createdAt: n.createdAt || Date.now(),
      read: n.read ?? false,
      data: n.data,
    };
    const list = [notif, ...state.notifications].slice(0, 50);
    const unread = list.filter(x => !x.read).length;
    return { notifications: list, unread };
  }),
  markAllRead: () => set((state) => {
    const list = state.notifications.map(n => ({ ...n, read: true }));
    return { notifications: list, unread: 0 };
  }),
  remove: (id) => set((state) => {
    const list = state.notifications.filter(n => n.id !== id);
    const unread = list.filter(x => !x.read).length;
    return { notifications: list, unread };
  }),
  clear: () => set({ notifications: [], unread: 0 }),
}));

