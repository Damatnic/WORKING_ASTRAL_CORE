'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  DocumentTextIcon,
  CogIcon,
  BellIcon,
  EyeIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type {
  SystemMetrics,
  UserAnalytics,
  SystemAlert,
  PlatformActivity,
  AdminMetricsResponse
} from '@/types/admin';

// Default empty states for initial load
const defaultMetrics: SystemMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  newUsersToday: 0,
  totalSessions: 0,
  averageSessionLength: 0,
  totalCrisisInterventions: 0,
  activeCrisisInterventions: 0,
  totalTherapySessions: 0,
  totalMessages: 0,
  systemUptime: 0,
  serverLoad: 0,
  databaseSize: 0,
  storageUsed: 0,
  bandwidthUsed: 0
};

const defaultAnalytics: UserAnalytics = {
  usersByRole: {},
  usersByLocation: {},
  userGrowth: [],
  activeUsersByTimeOfDay: [],
  sessionDurationDistribution: []
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>(defaultMetrics);
  const [analytics, setAnalytics] = useState<UserAnalytics>(defaultAnalytics);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [activity, setActivity] = useState<PlatformActivity[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'users' | 'security' | 'performance' | 'alerts' | 'activity'>('overview');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data from API
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await fetch(`/api/admin/metrics?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      }

      const data: AdminMetricsResponse = await response.json();
      
      setMetrics(data.metrics);
      setAnalytics(data.analytics);
      setAlerts(data.alerts);
      setActivity(data.activity);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  // Fetch data on mount and when timeRange changes
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivitySeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'crisis_alert': return ExclamationTriangleIcon;
      case 'user_registration': return UserGroupIcon;
      case 'security_event': return ShieldCheckIcon;
      case 'therapy_session': return DocumentTextIcon;
      case 'system_update': return CogIcon;
      case 'content_moderation': return EyeIcon;
      default: return BellIcon;
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, resolved: true, resolvedBy: 'Current Admin', resolvedAt: new Date().toISOString() }
            : alert
        ));
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const unresolved = alerts.filter(alert => !alert.resolved);
  const critical = unresolved.filter(alert => alert.severity === 'critical').length;
  const high = unresolved.filter(alert => alert.severity === 'high').length;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and system administration</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Admin
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'users', label: 'Users', icon: UserGroupIcon },
            { id: 'security', label: 'Security', icon: ShieldCheckIcon },
            { id: 'performance', label: 'Performance', icon: ServerIcon },
            { id: 'alerts', label: 'Alerts', icon: ExclamationTriangleIcon, badge: unresolved.length },
            { id: 'activity', label: 'Activity', icon: BellIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers.toLocaleString()}</p>
                    <p className="text-sm text-green-600 flex items-center">
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      +{metrics.newUsersToday} today
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      {metrics.totalUsers > 0 ? ((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1) : '0'}% of total
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Crisis Interventions</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeCrisisInterventions}</p>
                    <p className="text-sm text-orange-600">
                      {metrics.totalCrisisInterventions.toLocaleString()} total
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.systemUptime}%</p>
                    <p className="text-sm text-green-600 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Operational
                    </p>
                  </div>
                  <ServerIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* System Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Server Load</span>
                      <span className="font-medium">{metrics.serverLoad}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metrics.serverLoad > 80 ? 'bg-red-600' :
                          metrics.serverLoad > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${metrics.serverLoad}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Database Size</span>
                      <span className="font-medium">{metrics.databaseSize} GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${(metrics.databaseSize / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Storage Used</span>
                      <span className="font-medium">{metrics.storageUsed} GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-purple-600 rounded-full"
                        style={{ width: `${(metrics.storageUsed / 2000) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Bandwidth (MB/hr)</span>
                      <span className="font-medium">{metrics.bandwidthUsed}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-indigo-600 rounded-full"
                        style={{ width: `${(metrics.bandwidthUsed / 2000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.totalSessions.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.averageSessionLength}m</div>
                    <div className="text-sm text-gray-600">Avg Session</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{metrics.totalTherapySessions.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Therapy Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{(metrics.totalMessages / 1000).toFixed(0)}k</div>
                    <div className="text-sm text-gray-600">Messages</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
                  <div className="flex space-x-2">
                    {critical > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {critical} Critical
                      </span>
                    )}
                    {high > 0 && (
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {high} High
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      alert.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    }`}>
                      <div className="flex items-start">
                        <div className={`p-1 rounded-full mr-3 ${
                          alert.resolved ? 'bg-green-100' : getSeverityColor(alert.severity).split(' ')[1]
                        }`}>
                          {alert.resolved ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ExclamationTriangleIcon className={`h-4 w-4 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className={`font-medium ${alert.resolved ? 'text-gray-600' : 'text-gray-900'}`}>
                              {alert.title}
                            </h4>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${
                              alert.resolved ? 'text-gray-600 bg-gray-50 border-gray-200' : getSeverityColor(alert.severity)
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className={`text-sm ${alert.resolved ? 'text-gray-500' : 'text-gray-600'}`}>
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(alert.timestamp), 'MMM d, yyyy HH:mm')}
                            {alert.resolved && alert.resolvedBy && (
                              <span> • Resolved by {alert.resolvedBy}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!alert.resolved && alert.actionRequired && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {alerts.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setActiveView('alerts')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View all alerts ({alerts.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state for alerts */}
            {alerts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Alerts</h3>
                  <p className="text-gray-600">All systems are operating normally</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.usersByRole).length > 0 ? (
                    Object.entries(analytics.usersByRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                        <div className="flex items-center">
                          <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                            <div 
                              className="h-2 bg-blue-600 rounded-full"
                              style={{ width: `${metrics.totalUsers > 0 ? (count / metrics.totalUsers) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No user data available</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Device</h3>
                {analytics.usersByDevice && Object.keys(analytics.usersByDevice).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(analytics.usersByDevice).map(([device, count]) => {
                      const Icon = device === 'Mobile' ? DevicePhoneMobileIcon : 
                                 device === 'Desktop' ? ComputerDesktopIcon : 
                                 GlobeAltIcon;
                      return (
                        <div key={device} className="text-center p-4 bg-gray-50 rounded-lg">
                          <Icon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                          <div className="text-lg font-bold text-gray-900">{count.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">{device}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {((count / Object.values(analytics.usersByDevice!).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Device data not available</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top User Locations</h3>
              <div className="space-y-3">
                {Object.entries(analytics.usersByLocation).length > 0 ? (
                  Object.entries(analytics.usersByLocation).slice(0, 8).map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">{location}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                          <div 
                            className="h-2 bg-green-600 rounded-full"
                            style={{ width: `${(count / Math.max(...Object.values(analytics.usersByLocation))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No location data available</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Critical ({critical})
                  </button>
                  <button className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    High ({high})
                  </button>
                  <button className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Resolved ({alerts.filter(a => a.resolved).length})
                  </button>
                </div>
              </div>

              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${
                      alert.resolved 
                        ? 'bg-gray-50 border-gray-200' 
                        : alert.severity === 'critical' 
                          ? 'bg-red-50 border-red-200' 
                          : alert.severity === 'high'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-gray-300'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className={`p-2 rounded-full mr-4 ${
                            alert.resolved 
                              ? 'bg-green-100' 
                              : getSeverityColor(alert.severity).split(' ')[1]
                          }`}>
                            {alert.resolved ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <ExclamationTriangleIcon className={`h-5 w-5 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h4 className={`font-semibold ${alert.resolved ? 'text-gray-600' : 'text-gray-900'}`}>
                                {alert.title}
                              </h4>
                              <span className={`ml-3 px-2 py-1 text-xs rounded-full border ${
                                alert.resolved ? 'text-gray-600 bg-gray-100 border-gray-200' : getSeverityColor(alert.severity)
                              }`}>
                                {alert.type.replace('_', ' ')} • {alert.severity}
                              </span>
                            </div>
                            <p className={`text-sm mb-3 ${alert.resolved ? 'text-gray-500' : 'text-gray-700'}`}>
                              {alert.message}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {format(new Date(alert.timestamp), 'MMM d, yyyy HH:mm')}
                              </span>
                              <span className="flex items-center">
                                <ServerIcon className="h-3 w-3 mr-1" />
                                {alert.affectedSystems.join(', ')}
                              </span>
                            </div>
                            {alert.resolved && alert.resolvedBy && alert.resolvedAt && (
                              <div className="mt-2 text-xs text-green-600">
                                Resolved by {alert.resolvedBy} at {format(new Date(alert.resolvedAt), 'MMM d, yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                        </div>
                        {!alert.resolved && alert.actionRequired && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts</h3>
                  <p className="text-gray-600">All systems are operating normally</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Activity Feed</h3>
              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item) => {
                    const Icon = getActivityIcon(item.type);
                    return (
                      <div key={item.id} className="flex items-start p-3 hover:bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full mr-4 ${
                          item.severity === 'error' ? 'bg-red-100' :
                          item.severity === 'warning' ? 'bg-yellow-100' :
                          item.severity === 'success' ? 'bg-green-100' :
                          'bg-blue-100'
                        }`}>
                          <Icon className={`h-4 w-4 ${getActivitySeverityColor(item.severity)}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            {item.username && (
                              <span className="flex items-center">
                                <UserIcon className="h-3 w-3 mr-1" />
                                {item.username}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full ${
                              item.severity === 'error' ? 'bg-red-100 text-red-700' :
                              item.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              item.severity === 'success' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {item.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-gray-600">Platform activity will appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}