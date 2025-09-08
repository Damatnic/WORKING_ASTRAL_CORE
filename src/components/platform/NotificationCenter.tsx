'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  CalendarIcon,
  DocumentTextIcon,
  CogIcon,
  TrashIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  BellIcon as BellIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  InformationCircleIcon as InformationCircleIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format } from 'date-fns';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'crisis' | 'message' | 'appointment' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  category: 'therapy' | 'crisis' | 'community' | 'system' | 'appointment' | 'safety' | 'wellness';
  actionable: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => void;
  }>;
  metadata?: Record<string, any>;
  channels?: Array<'in_app' | 'email' | 'sms' | 'push' | 'phone_call'>;
  deliveryStatus?: Record<string, 'pending' | 'sent' | 'delivered' | 'failed'>;
}

interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: {
    title: string;
    message: string;
    emailTemplate: string;
    smsTemplate: string;
    pushTemplate: string;
  };
  triggers: Array<{
    event: string;
    conditions: Record<string, any>;
  }>;
  channels: Array<'in_app' | 'email' | 'sms' | 'push' | 'phone_call'>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userRoles: string[];
  isActive: boolean;
}

interface NotificationPreferences {
  userId: string;
  channels: {
    [key: string]: {
      enabled: boolean;
      categories: string[];
      quietHours: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
  priorities: {
    [key: string]: string[];
  };
  frequency: {
    digest: string;
    summaryTime: string;
  };
  crisis: {
    alwaysNotify: boolean;
    escalationChain: Array<{
      method: string;
      delay: number;
    }>;
  };
}

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'notifications' | 'templates' | 'preferences' | 'analytics'>('notifications');
  const [activeFilter, setActiveFilter] = useState<'all' | 'therapy' | 'crisis' | 'community' | 'system' | 'appointment' | 'safety' | 'wellness'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Load notifications data from API
  useEffect(() => {
    loadNotifications();
    loadTemplates();
    loadPreferences();
  }, [activeFilter, priorityFilter, currentPage]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (activeFilter !== 'all') queryParams.append('category', activeFilter);
      if (priorityFilter !== 'all') queryParams.append('priority', priorityFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '20');

      const response = await fetch(`/api/platform/notifications?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/platform/notifications/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch notification templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load notification templates:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/platform/notifications/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/platform/notifications/${notificationId}/mark-read`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/platform/notifications/mark-all-read', {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/platform/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      const response = await fetch('/api/platform/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPreferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
    const iconClass = priority === 'urgent' ? 'w-6 h-6 text-red-500' : 
                     priority === 'high' ? 'w-5 h-5 text-orange-500' : 
                     'w-5 h-5 text-blue-500';
    
    switch (type) {
      case 'crisis':
        return <ExclamationTriangleIconSolid className={iconClass} />;
      case 'error':
        return <XCircleIconSolid className={iconClass} />;
      case 'warning':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'success':
        return <CheckCircleIconSolid className={iconClass} />;
      case 'appointment':
        return <CalendarIcon className={iconClass} />;
      case 'message':
        return <ChatBubbleLeftIcon className={iconClass} />;
      case 'system':
        return <CogIcon className={iconClass} />;
      default:
        return <InformationCircleIconSolid className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BellIconSolid className="w-8 h-8 text-purple-600" />
                Notification Center
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage notifications, templates, and preferences
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Mark All Read
              </button>
              <button
                onClick={() => loadNotifications()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg
                         font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-6"
        >
          <div className="flex flex-wrap gap-2">
            {['notifications', 'templates', 'preferences', 'analytics'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === view
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications View */}
        {activeView === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                             bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as any)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Categories</option>
                  <option value="crisis">Crisis</option>
                  <option value="therapy">Therapy</option>
                  <option value="community">Community</option>
                  <option value="appointment">Appointments</option>
                  <option value="wellness">Wellness</option>
                  <option value="system">System</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 ${getPriorityColor(notification.priority)}
                               ${!notification.isRead ? 'ring-2 ring-purple-200 dark:ring-purple-800' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(notification.timestamp), 'MMM d, yyyy • h:mm a')} • {notification.category}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              notification.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                              notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {notification.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {notification.message}
                          </p>
                          
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-2 mb-4">
                              {notification.actions.map((action) => (
                                <button
                                  key={action.id}
                                  onClick={action.action}
                                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                                    action.type === 'primary' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                                    action.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                    'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Mark as read"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete notification"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty State */}
            {notifications.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <BellIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No notifications found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You&apos;re all caught up! New notifications will appear here.
                </p>
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                           rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                           rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Other views (templates, preferences, analytics) would go here */}
        {activeView !== 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This view will be implemented with real API integration for {activeView}.
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;