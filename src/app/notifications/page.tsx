'use client';

import { useState } from 'react';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { Bell, X, Clock, Users, MessageSquare, Calendar, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcons = {
  system: Settings,
  community: Users,
  message: MessageSquare,
  invite: Users,
  reminder: Calendar,
};

const typeColors = {
  system: 'bg-blue-100 text-blue-600',
  community: 'bg-green-100 text-green-600', 
  message: 'bg-purple-100 text-purple-600',
  invite: 'bg-orange-100 text-orange-600',
  reminder: 'bg-yellow-100 text-yellow-600',
};

export default function NotificationsPage() {
  const { notifications, markAllRead, remove } = useNotifications();
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredNotifications = selectedType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === selectedType);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedType === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({notifications.length})
        </button>
        {['system', 'community', 'message', 'invite', 'reminder'].map(type => {
          const count = notifications.filter(n => n.type === type).length;
          if (count === 0) return null;
          
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                selectedType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {selectedType === 'all' 
                ? "You're all caught up! Check back later for updates."
                : `No ${selectedType} notifications found.`}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={remove}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const IconComponent = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || 'bg-gray-100 text-gray-600';

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex gap-3">
        <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${notification.read ? 'text-gray-900' : 'text-blue-900'}`}>
              {notification.title}
            </h3>
            <button
              onClick={() => onRemove(notification.id)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Remove notification"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <p className="text-gray-600 text-sm mb-2">
            {notification.body}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            <span className="capitalize">• {notification.type}</span>
            {!notification.read && (
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px]">
                New
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}