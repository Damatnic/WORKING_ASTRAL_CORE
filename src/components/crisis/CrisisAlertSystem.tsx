'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellAlertIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ShieldExclamationIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  BellSnoozeIcon,
  ExclamationCircleIcon,
  HeartIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { format, differenceInMinutes, isAfter, addMinutes } from 'date-fns';

interface CrisisAlert {
  id: string;
  type: 'client_emergency' | 'system_critical' | 'staffing_urgent' | 'protocol_violation' | 'technical_failure' | 'security_breach';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  clientId?: string;
  clientName?: string;
  location?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  snoozedUntil?: Date;
  escalationLevel: number;
  escalationHistory: EscalationStep[];
  requiredActions: AlertAction[];
  relatedAlerts: string[];
  tags: string[];
  metadata: { [key: string]: any };
  soundEnabled: boolean;
  autoEscalateAfter?: number; // minutes
}

interface EscalationStep {
  level: number;
  timestamp: Date;
  escalatedBy: string;
  reason: string;
  notifiedUsers: string[];
  actions: string[];
}

interface AlertAction {
  id: string;
  action: string;
  required: boolean;
  assignedTo?: string;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

interface AlertFilter {
  severity: string[];
  type: string[];
  status: 'all' | 'unresolved' | 'acknowledged' | 'resolved';
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'all';
}

interface AlertSubscription {
  userId: string;
  alertTypes: string[];
  severityThreshold: 'info' | 'low' | 'medium' | 'high' | 'critical';
  soundEnabled: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface CrisisAlertSystemProps {
  className?: string;
}

// API helper function
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

// Empty alert template for new alerts
const createEmptyAlert = (): CrisisAlert => ({
  id: '',
  type: "notification" as any,
  severity: 'low',
  title: '',
  description: '',
  source: 'System',
  timestamp: new Date(),
  acknowledged: false,
  resolved: false,
  escalationLevel: 0,
  escalationHistory: [],
  requiredActions: [],
  relatedAlerts: [],
  tags: [],
  metadata: {
      missingStaff: 'Crisis Counselor Smith',
      backupAssigned: 'Crisis Counselor Johnson'
    },
    soundEnabled: false
});

const alertTypeConfig = {
  client_emergency: {
    icon: ExclamationTriangleIcon,
    color: 'text-red-600 bg-red-100',
    label: 'Client Emergency'
  },
  system_critical: {
    icon: ExclamationCircleIcon,
    color: 'text-orange-600 bg-orange-100',
    label: 'System Critical'
  },
  staffing_urgent: {
    icon: UserIcon,
    color: 'text-blue-600 bg-blue-100',
    label: 'Staffing Urgent'
  },
  protocol_violation: {
    icon: ShieldExclamationIcon,
    color: 'text-purple-600 bg-purple-100',
    label: 'Protocol Violation'
  },
  technical_failure: {
    icon: ExclamationCircleIcon,
    color: 'text-gray-600 bg-gray-100',
    label: 'Technical Failure'
  },
  security_breach: {
    icon: ShieldExclamationIcon,
    color: 'text-red-600 bg-red-100',
    label: 'Security Breach'
  }
};

const severityConfig = {
  critical: {
    color: 'text-red-700 bg-red-100 border-red-300',
    animation: 'animate-pulse',
    sound: true
  },
  high: {
    color: 'text-orange-700 bg-orange-100 border-orange-300',
    animation: '',
    sound: true
  },
  medium: {
    color: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    animation: '',
    sound: false
  },
  low: {
    color: 'text-blue-700 bg-blue-100 border-blue-300',
    animation: '',
    sound: false
  },
  info: {
    color: 'text-gray-700 bg-gray-100 border-gray-300',
    animation: '',
    sound: false
  }
};

export default function CrisisAlertSystem({ className = "" }: CrisisAlertSystemProps) {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<CrisisAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AlertFilter>({
    severity: [],
    type: [],
    status: 'all',
    timeRange: 'day'
  });

  // Sound notification hook
  const playAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;
    
    const config = severityConfig[severity as keyof typeof severityConfig];
    if (config.sound) {
      // In a real implementation, this would play actual sound
      console.log(`Playing ${severity} alert sound`);
    }
  }, [soundEnabled]);

  // Fetch alerts from API
  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchWithAuth('/api/crisis/alerts');
        
        if (data.alerts) {
          const transformedAlerts = data.alerts.map((alert: any) => ({
            id: alert.id,
            type: alert.type || 'notification',
            severity: alert.severity || 'low',
            title: alert.message || 'Crisis Alert',
            description: alert.message,
            source: 'Crisis System',
            clientId: alert.clientId,
            clientName: alert.clientName,
            timestamp: new Date(alert.timestamp),
            acknowledged: alert.acknowledged || false,
            acknowledgedBy: alert.acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
            resolved: alert.resolved || false,
            resolvedBy: alert.resolvedBy,
            resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
            escalationLevel: 0,
            escalationHistory: [],
            requiredActions: alert.actions?.map((action: string, index: number) => ({
              id: `action_${index}`,
              action,
              required: true,
              completed: false
            })) || [],
            relatedAlerts: [],
            tags: [],
            metadata: {},
            soundEnabled: alert.severity === 'critical' || alert.severity === 'high'
          }));
          
          setAlerts(transformedAlerts);
          setFilteredAlerts(transformedAlerts);
          
          // Play sound for new critical alerts
          if (soundEnabled) {
            const criticalAlerts = transformedAlerts.filter(
              (a: CrisisAlert) => a.severity === 'critical' && !a.acknowledged
            );
            if (criticalAlerts.length > 0) {
              // Would play sound here
              console.log('Playing alert sound for critical alerts');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError('Failed to load crisis alerts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();

    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, soundEnabled]);

  // Filter alerts
  useEffect(() => {
    let filtered = [...alerts];

    // Filter by severity
    if (filters.severity.length > 0) {
      filtered = filtered.filter(alert => filters.severity.includes(alert.severity));
    }

    // Filter by type
    if (filters.type.length > 0) {
      filtered = filtered.filter(alert => filters.type.includes(alert.type));
    }

    // Filter by status
    switch (filters.status) {
      case 'unresolved':
        filtered = filtered.filter(alert => !alert.resolved);
        break;
      case 'acknowledged':
        filtered = filtered.filter(alert => alert.acknowledged && !alert.resolved);
        break;
      case 'resolved':
        filtered = filtered.filter(alert => alert.resolved);
        break;
    }

    // Filter by time range
    const now = new Date();
    switch (filters.timeRange) {
      case 'hour':
        filtered = filtered.filter(alert => 
          differenceInMinutes(now, alert.timestamp) <= 60
        );
        break;
      case 'day':
        filtered = filtered.filter(alert => 
          differenceInMinutes(now, alert.timestamp) <= 1440
        );
        break;
      case 'week':
        filtered = filtered.filter(alert => 
          differenceInMinutes(now, alert.timestamp) <= 10080
        );
        break;
    }

    // Sort by severity and timestamp
    filtered.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder];
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder];
      
      if (aSeverity !== bSeverity) {
        return aSeverity - bSeverity;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setFilteredAlerts(filtered);
  }, [alerts, filters]);

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: 'Current User',
            acknowledgedAt: new Date()
          }
        : alert
    ));
  };

  const handleResolve = (alertId: string, resolution?: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId
        ? {
            ...alert,
            resolved: true,
            resolvedBy: 'Current User',
            resolvedAt: new Date()
          }
        : alert
    ));
  };

  const handleSnooze = (alertId: string, minutes: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId
        ? {
            ...alert,
            snoozedUntil: addMinutes(new Date(), minutes)
          }
        : alert
    ));
  };

  const handleEscalate = (alertId: string, reason: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id !== alertId) return alert;

      const newEscalation: EscalationStep = {
        level: alert.escalationLevel + 1,
        timestamp: new Date(),
        escalatedBy: 'Current User',
        reason,
        notifiedUsers: [], // Would be determined by escalation rules
        actions: [] // Would be determined by escalation rules
      };

      return {
        ...alert,
        escalationLevel: alert.escalationLevel + 1,
        escalationHistory: [...alert.escalationHistory, newEscalation]
      };
    }));
  };

  const toggleAlertExpanded = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  const unresolvedAlerts = filteredAlerts.filter(alert => !alert.resolved);
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.acknowledged && !alert.resolved);

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BellAlertIcon className="h-6 w-6 text-red-600" />
              Real-Time Crisis Alert System
            </h2>
            <p className="text-gray-600 mt-1">
              Monitor and respond to crisis alerts and system notifications
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}
              title={soundEnabled ? 'Sound On' : 'Sound Off'}
            >
              {soundEnabled ? <SpeakerWaveIcon className="h-5 w-5" /> : <SpeakerXMarkIcon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}
              title={autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            >
              <ArrowPathIcon className={`h-5 w-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${criticalAlerts.length > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <FireIcon className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              <span className="font-medium text-gray-900">Critical</span>
            </div>
            <div className={`text-2xl font-bold mt-1 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {criticalAlerts.length}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-gray-900">Unresolved</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{unresolvedAlerts.length}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Acknowledged</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{acknowledgedAlerts.length}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900">Total Today</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">{filteredAlerts.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Alerts</option>
            <option value="unresolved">Unresolved</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="all">All Time</option>
          </select>
          
          <select
            onChange={(e) => {
              const severity = e.target.value;
              setFilters(prev => ({
                ...prev,
                severity: severity ? [severity] : []
              }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          
          <select
            onChange={(e) => {
              const type = e.target.value;
              setFilters(prev => ({
                ...prev,
                type: type ? [type] : []
              }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Types</option>
            <option value="client_emergency">Client Emergency</option>
            <option value="system_critical">System Critical</option>
            <option value="staffing_urgent">Staffing Urgent</option>
            <option value="protocol_violation">Protocol Violation</option>
            <option value="technical_failure">Technical Failure</option>
            <option value="security_breach">Security Breach</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="p-6">
        {filteredAlerts.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredAlerts.map(alert => {
                const config = alertTypeConfig[alert.type];
                const severityConfig = severityConfig[alert.severity as keyof typeof severityConfig];
                const Icon = config.icon;
                const isExpanded = expandedAlerts.has(alert.id);
                const isSnoozed = alert.snoozedUntil && isAfter(alert.snoozedUntil, new Date());

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`border-2 rounded-lg ${severityConfig.color} ${severityConfig.animation} ${
                      alert.resolved ? 'opacity-60' : ''
                    } ${isSnoozed ? 'opacity-40' : ''}`}
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-black/5 transition-colors"
                      onClick={() => toggleAlertExpanded(alert.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">{alert.title}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${severityConfig.color}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              {alert.escalationLevel > 0 && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                  Level {alert.escalationLevel}
                                </span>
                              )}
                              {alert.clientName && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {alert.clientName}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-700 text-sm mb-2 line-clamp-2">{alert.description}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {format(alert.timestamp, 'h:mm a')} ({differenceInMinutes(new Date(), alert.timestamp)}m ago)
                              </span>
                              <span>{alert.source}</span>
                              {alert.location && (
                                <span className="flex items-center gap-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  {alert.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {alert.resolved ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : alert.acknowledged ? (
                            <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 animate-pulse" />
                          )}
                          
                          {isSnoozed && (
                            <BellSnoozeIcon className="h-4 w-4 text-gray-400" />
                          )}
                          
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t px-4 pb-4"
                        >
                          {/* Required Actions */}
                          {alert.requiredActions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Required Actions:</h4>
                              <div className="space-y-2">
                                {alert.requiredActions.map(action => (
                                  <div key={action.id} className="flex items-center justify-between p-2 bg-white/50 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        action.completed ? 'bg-green-500' : 'bg-gray-300'
                                      }`} />
                                      <span className="text-sm">{action.action}</span>
                                      {action.required && (
                                        <span className="text-xs bg-red-100 text-red-800 px-1 rounded">Required</span>
                                      )}
                                    </div>
                                    {action.assignedTo && (
                                      <span className="text-xs text-gray-600">{action.assignedTo}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Escalation History */}
                          {alert.escalationHistory.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Escalation History:</h4>
                              <div className="space-y-2">
                                {alert.escalationHistory.map((escalation, index) => (
                                  <div key={index} className="p-2 bg-purple-50 rounded text-sm">
                                    <div className="font-medium">Level {escalation.level} - {escalation.reason}</div>
                                    <div className="text-xs text-gray-600">
                                      {format(escalation.timestamp, 'MMM d, h:mm a')} by {escalation.escalatedBy}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags and Metadata */}
                          <div className="mb-4">
                            {alert.tags.length > 0 && (
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
                                {alert.tags.map(tag => (
                                  <span key={tag} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded mr-1">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-3 border-t">
                            {!alert.acknowledged && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcknowledge(alert.id);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Acknowledge
                              </button>
                            )}
                            
                            {!alert.resolved && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const resolution = prompt('Enter resolution notes:');
                                    handleResolve(alert.id, resolution || undefined);
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  Resolve
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const reason = prompt('Reason for escalation:');
                                    if (reason) handleEscalate(alert.id, reason);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                  Escalate
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const minutes = parseInt(prompt('Snooze for how many minutes?') || '30');
                                    if (minutes > 0) handleSnooze(alert.id, minutes);
                                  }}
                                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                                >
                                  Snooze
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(alert);
                                setShowAlertModal(true);
                              }}
                              className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                            >
                              View Details
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts</h3>
            <p className="text-gray-600">No alerts match your current filters.</p>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {showAlertModal && selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Alert Details - {selectedAlert.title}
                </h2>
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Alert Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Type:</strong> {alertTypeConfig[selectedAlert.type].label}</div>
                      <div><strong>Severity:</strong> {selectedAlert.severity}</div>
                      <div><strong>Source:</strong> {selectedAlert.source}</div>
                      <div><strong>Timestamp:</strong> {format(selectedAlert.timestamp, 'PPP p')}</div>
                      {selectedAlert.clientName && (
                        <div><strong>Client:</strong> {selectedAlert.clientName}</div>
                      )}
                      {selectedAlert.location && (
                        <div><strong>Location:</strong> {selectedAlert.location}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Status</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Acknowledged:</strong> {selectedAlert.acknowledged ? 'Yes' : 'No'}</div>
                      {selectedAlert.acknowledgedBy && (
                        <div><strong>Acknowledged by:</strong> {selectedAlert.acknowledgedBy}</div>
                      )}
                      <div><strong>Resolved:</strong> {selectedAlert.resolved ? 'Yes' : 'No'}</div>
                      {selectedAlert.resolvedBy && (
                        <div><strong>Resolved by:</strong> {selectedAlert.resolvedBy}</div>
                      )}
                      <div><strong>Escalation Level:</strong> {selectedAlert.escalationLevel}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700">{selectedAlert.description}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}