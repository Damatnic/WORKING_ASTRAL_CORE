'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket, WSMessage } from '@/hooks/useWebSocket';
import { useSession } from 'next-auth/react';
import {
  ExclamationTriangleIcon,
  BellIcon,
  XMarkIcon,
  CheckIcon,
  UserIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ArrowUpIcon,
  MapPinIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  BellIcon as BellIconSolid
} from '@heroicons/react/24/solid';

interface CrisisAlert {
  id: string;
  type: 'self_harm' | 'suicide_ideation' | 'substance_abuse' | 'domestic_violence' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  userName?: string;
  userAvatar?: string;
  description: string;
  location?: string;
  contactInfo?: string;
  assignedCounselorId?: string;
  escalationLevel: number;
  isActive: boolean;
  createdAt: Date;
  respondedAt?: Date;
  metadata?: {
    keywordTriggers?: string[];
    confidenceScore?: number;
    sources?: string[];
    autoDetected?: boolean;
  };
}

interface CrisisAlertNotificationsProps {
  userRole: 'CRISIS_COUNSELOR' | 'ADMIN' | 'SUPERVISOR';
  userId: string;
  onAlertClick?: (alert: CrisisAlert) => void;
}

const CrisisAlertNotifications: React.FC<CrisisAlertNotificationsProps> = ({
  userRole,
  userId,
  onAlertClick
}) => {
  const { data: session } = useSession();
  const [activeAlerts, setActiveAlerts] = useState<CrisisAlert[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastAlertSound, setLastAlertSound] = useState<Date | null>(null);

  // WebSocket connection for real-time crisis alerts
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message: WSMessage) => {
      if (message.type === 'crisis_alert') {
        handleCrisisAlert(message);
      }
    }
  });

  const handleCrisisAlert = (message: WSMessage) => {
    if (!message.data) return;

    const alertData = message.data;
    const alert: CrisisAlert = {
      id: alertData.alertId,
      type: alertData.type,
      severity: alertData.severity,
      userId: alertData.userId,
      userName: alertData.userName,
      userAvatar: alertData.userAvatar,
      description: message.content || '',
      location: alertData.location,
      contactInfo: alertData.contactInfo,
      assignedCounselorId: alertData.assignedCounselorId,
      escalationLevel: alertData.escalationLevel || 1,
      isActive: true,
      createdAt: new Date(message.timestamp),
      metadata: alertData.metadata
    };

    // Add or update alert
    setActiveAlerts(prev => {
      const existingIndex = prev.findIndex(a => a.id === alert.id);
      if (existingIndex >= 0) {
        // Update existing alert
        const updated = [...prev];
        updated[existingIndex] = alert;
        return updated;
      } else {
        // Add new alert and increment unread count
        setUnreadCount(count => count + 1);
        playAlertSound(alert.severity);
        return [...prev, alert];
      }
    });

    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Crisis Alert', {
        body: `${alert.severity.toUpperCase()}: ${alert.description.substring(0, 100)}`,
        icon: '/icons/crisis-alert.png',
        tag: alert.id
      });
    }
  };

  const playAlertSound = (severity: CrisisAlert['severity']) => {
    if (!audioEnabled) return;
    
    // Prevent spam by limiting sound frequency
    const now = new Date();
    if (lastAlertSound && now.getTime() - lastAlertSound.getTime() < 5000) {
      return;
    }
    setLastAlertSound(now);

    try {
      const audioFile = severity === 'critical' ? '/sounds/critical-alert.mp3' : '/sounds/alert.mp3';
      const audio = new Audio(audioFile);
      audio.volume = 0.7;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play alert sound:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/crisis/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'respond',
          alertId,
          responseType: 'acknowledge'
        }),
      });

      if (response.ok) {
        setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
        // Send WebSocket acknowledgment
        sendMessage({
          type: 'crisis_alert',
          data: {
            alertId,
            action: 'acknowledge',
            respondedBy: userId
          }
        });
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const acceptAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/crisis/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'respond',
          alertId,
          responseType: 'accept'
        }),
      });

      if (response.ok) {
        // Remove from active alerts and redirect to crisis dashboard
        setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
        setUnreadCount(count => Math.max(0, count - 1));
        
        // Send WebSocket acceptance
        sendMessage({
          type: 'crisis_alert',
          data: {
            alertId,
            action: 'accept',
            respondedBy: userId
          }
        });

        // Call parent handler if provided
        const alert = activeAlerts.find(a => a.id === alertId);
        if (alert && onAlertClick) {
          onAlertClick(alert);
        }
      }
    } catch (error) {
      console.error('Failed to accept alert:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    setAcknowledgedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(alertId);
      return newSet;
    });
    setUnreadCount(count => Math.max(0, count - 1));
  };

  const getSeverityColor = (severity: CrisisAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white border-red-700';
      case 'high': return 'bg-orange-500 text-white border-orange-600';
      case 'medium': return 'bg-yellow-500 text-white border-yellow-600';
      case 'low': return 'bg-blue-500 text-white border-blue-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getSeverityIcon = (severity: CrisisAlert['severity']) => {
    switch (severity) {
      case 'critical': return <ExclamationTriangleIconSolid className="w-5 h-5" />;
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'medium': return <BellIconSolid className="w-5 h-5" />;
      case 'low': return <BellIcon className="w-5 h-5" />;
      default: return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: CrisisAlert['type']) => {
    switch (type) {
      case 'self_harm': return 'Self Harm';
      case 'suicide_ideation': return 'Suicidal Thoughts';
      case 'substance_abuse': return 'Substance Abuse';
      case 'domestic_violence': return 'Domestic Violence';
      case 'other': return 'Crisis Support';
      default: return 'Unknown';
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load existing alerts on mount
  useEffect(() => {
    const loadActiveAlerts = async () => {
      try {
        const response = await fetch('/api/crisis/alerts?status=active&assignedToMe=false');
        if (response.ok) {
          const data = await response.json();
          setActiveAlerts(data.alerts || []);
          setUnreadCount(data.alerts?.length || 0);
        }
      } catch (error) {
        console.error('Failed to load active alerts:', error);
      }
    };

    if (session?.user && ['CRISIS_COUNSELOR', 'ADMIN', 'SUPERVISOR'].includes(userRole)) {
      loadActiveAlerts();
    }
  }, [session, userRole]);

  if (!['CRISIS_COUNSELOR', 'ADMIN', 'SUPERVISOR'].includes(userRole)) {
    return null;
  }

  return (
    <>
      {/* Alert Notification Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsMinimized(!isMinimized)}
          className={`relative p-4 rounded-full shadow-lg ${
            activeAlerts.length > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white transition-colors`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            scale: activeAlerts.length > 0 && !isMinimized ? [1, 1.2, 1] : 1
          }}
          transition={{
            scale: {
              repeat: activeAlerts.length > 0 && !isMinimized ? Infinity : 0,
              duration: 2
            }
          }}
        >
          {activeAlerts.length > 0 ? (
            <ExclamationTriangleIconSolid className="w-6 h-6" />
          ) : (
            <ShieldCheckIcon className="w-6 h-6" />
          )}
          
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {!isConnected && (
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
          )}
        </motion.button>
      </div>

      {/* Alert Notifications Panel */}
      <AnimatePresence>
        {!isMinimized && activeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 400, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400, y: 0 }}
            className="fixed bottom-24 right-6 w-96 max-h-96 overflow-y-auto bg-white rounded-lg shadow-2xl border z-50"
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIconSolid className="w-5 h-5" />
                  <h3 className="font-semibold">Crisis Alerts</h3>
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {activeAlerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="max-h-80 overflow-y-auto">
              {activeAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border-b last:border-b-0 ${
                    acknowledgedAlerts.has(alert.id) ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  } cursor-pointer`}
                  onClick={() => onAlertClick?.(alert)}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getTypeLabel(alert.type)}</p>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                        </p>
                      </div>
                    </div>
                    
                    {alert.escalationLevel > 1 && (
                      <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                        <ArrowUpIcon className="w-3 h-3" />
                        <span>Escalated</span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  {alert.userName && (
                    <div className="flex items-center space-x-2 mb-2">
                      <img
                        src={alert.userAvatar || '/api/placeholder/32/32'}
                        alt={alert.userName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-700">{alert.userName}</span>
                    </div>
                  )}

                  {/* Alert Content */}
                  <p className="text-sm text-gray-800 mb-3 line-clamp-3">
                    {alert.description}
                  </p>

                  {/* Location */}
                  {alert.location && (
                    <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                      <MapPinIcon className="w-3 h-3" />
                      <span>{alert.location}</span>
                    </div>
                  )}

                  {/* Metadata */}
                  {alert.metadata?.autoDetected && (
                    <div className="text-xs text-blue-600 mb-2 flex items-center space-x-1">
                      <InformationCircleIcon className="w-3 h-3" />
                      <span>Auto-detected ({Math.round((alert.metadata.confidenceScore || 0) * 100)}% confidence)</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!acknowledgedAlerts.has(alert.id) && (
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeAlert(alert.id);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                      >
                        <CheckIcon className="w-3 h-3" />
                        <span>Acknowledge</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptAlert(alert.id);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      >
                        <UserIcon className="w-3 h-3" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                      >
                        <XMarkIcon className="w-3 h-3" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}

                  {acknowledgedAlerts.has(alert.id) && (
                    <div className="flex items-center space-x-1 text-green-600 text-xs mt-2">
                      <CheckIcon className="w-3 h-3" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-2 rounded-b-lg flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="flex items-center space-x-1 hover:text-gray-800"
              >
                <BellIcon className="w-3 h-3" />
                <span>{audioEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CrisisAlertNotifications;