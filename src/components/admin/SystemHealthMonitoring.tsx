'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SignalIcon,
  WifiIcon,
  CloudIcon,
  CommandLineIcon,
  EyeIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { format, subMinutes, subHours, subDays } from 'date-fns';

interface SystemMetric {
  id: string;
  name: string;
  category: 'server' | 'database' | 'network' | 'application' | 'security';
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  threshold: {
    warning: number;
    critical: number;
  };
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
  history: Array<{
    timestamp: Date;
    value: number;
  }>;
}

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'security' | 'availability' | 'capacity' | 'maintenance';
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
  escalationLevel: number;
  affectedServices: string[];
  recommendedActions: string[];
}

interface ServiceStatus {
  id: string;
  name: string;
  type: 'api' | 'database' | 'cache' | 'queue' | 'storage' | 'external';
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
  endpoint?: string;
  dependencies: string[];
  incidents: number;
}

interface PerformanceMetric {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  errors: number;
  responseTime: number;
}

const mockMetrics: SystemMetric[] = [
  {
    id: 'cpu-usage',
    name: 'CPU Usage',
    category: 'server',
    value: 67.3,
    unit: '%',
    status: 'warning',
    threshold: { warning: 70, critical: 85 },
    lastUpdated: new Date(),
    trend: 'up',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 30 + 50
    }))
  },
  {
    id: 'memory-usage',
    name: 'Memory Usage',
    category: 'server',
    value: 54.2,
    unit: '%',
    status: 'healthy',
    threshold: { warning: 80, critical: 95 },
    lastUpdated: new Date(),
    trend: 'stable',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 20 + 45
    }))
  },
  {
    id: 'disk-usage',
    name: 'Disk Usage',
    category: 'server',
    value: 78.9,
    unit: '%',
    status: 'warning',
    threshold: { warning: 75, critical: 90 },
    lastUpdated: new Date(),
    trend: 'up',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 10 + 70
    }))
  },
  {
    id: 'db-connections',
    name: 'Database Connections',
    category: 'database',
    value: 127,
    unit: 'connections',
    status: 'healthy',
    threshold: { warning: 180, critical: 200 },
    lastUpdated: new Date(),
    trend: 'stable',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 50 + 100
    }))
  },
  {
    id: 'response-time',
    name: 'API Response Time',
    category: 'application',
    value: 245,
    unit: 'ms',
    status: 'healthy',
    threshold: { warning: 500, critical: 1000 },
    lastUpdated: new Date(),
    trend: 'down',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 100 + 200
    }))
  },
  {
    id: 'error-rate',
    name: 'Error Rate',
    category: 'application',
    value: 0.12,
    unit: '%',
    status: 'healthy',
    threshold: { warning: 1, critical: 5 },
    lastUpdated: new Date(),
    trend: 'stable',
    history: Array.from({ length: 60 }, (_, i) => ({
      timestamp: subMinutes(new Date(), 59 - i),
      value: Math.random() * 0.5
    }))
  }
];

const mockAlerts: SystemAlert[] = [
  {
    id: 'alert-1',
    title: 'High CPU Usage Detected',
    message: 'Server CPU usage has exceeded 70% for the past 15 minutes',
    severity: 'warning',
    category: 'performance',
    timestamp: subMinutes(new Date(), 15),
    source: 'application-server-1',
    acknowledged: false,
    resolved: false,
    escalated: false,
    escalationLevel: 1,
    affectedServices: ['API Gateway', 'User Authentication'],
    recommendedActions: [
      'Check for resource-intensive processes',
      'Consider scaling up server resources',
      'Review recent deployments for performance issues'
    ]
  },
  {
    id: 'alert-2',
    title: 'Database Connection Pool Warning',
    message: 'Database connection pool is approaching capacity (85% utilized)',
    severity: 'warning',
    category: 'capacity',
    timestamp: subMinutes(new Date(), 8),
    source: 'database-primary',
    acknowledged: true,
    acknowledgedBy: 'admin_chen',
    acknowledgedAt: subMinutes(new Date(), 5),
    resolved: false,
    escalated: false,
    escalationLevel: 1,
    affectedServices: ['Database', 'User Management'],
    recommendedActions: [
      'Monitor connection usage patterns',
      'Optimize long-running queries',
      'Consider increasing connection pool size'
    ]
  },
  {
    id: 'alert-3',
    title: 'SSL Certificate Expiring Soon',
    message: 'SSL certificate for api.astralcore.com expires in 7 days',
    severity: 'info',
    category: 'security',
    timestamp: subHours(new Date(), 2),
    source: 'ssl-monitor',
    acknowledged: true,
    acknowledgedBy: 'admin_wilson',
    acknowledgedAt: subHours(new Date(), 1),
    resolved: false,
    escalated: false,
    escalationLevel: 1,
    affectedServices: ['API Gateway'],
    recommendedActions: [
      'Renew SSL certificate',
      'Update certificate in load balancer',
      'Verify certificate installation'
    ]
  }
];

const mockServices: ServiceStatus[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    type: 'api',
    status: 'operational',
    uptime: 99.97,
    responseTime: 145,
    lastCheck: new Date(),
    endpoint: 'https://api.astralcore.com/health',
    dependencies: ['database', 'cache'],
    incidents: 0
  },
  {
    id: 'database-primary',
    name: 'Primary Database',
    type: 'database',
    status: 'operational',
    uptime: 99.99,
    responseTime: 23,
    lastCheck: new Date(),
    dependencies: [],
    incidents: 0
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    type: 'cache',
    status: 'operational',
    uptime: 99.95,
    responseTime: 5,
    lastCheck: new Date(),
    dependencies: [],
    incidents: 0
  },
  {
    id: 'file-storage',
    name: 'File Storage',
    type: 'storage',
    status: 'degraded',
    uptime: 98.2,
    responseTime: 890,
    lastCheck: new Date(),
    dependencies: [],
    incidents: 2
  },
  {
    id: 'email-service',
    name: 'Email Service',
    type: 'external',
    status: 'operational',
    uptime: 99.8,
    responseTime: 234,
    lastCheck: subMinutes(new Date(), 2),
    dependencies: [],
    incidents: 0
  }
];

const mockPerformanceData: PerformanceMetric[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: subHours(new Date(), 23 - i),
  cpu: Math.random() * 30 + 50,
  memory: Math.random() * 20 + 45,
  disk: Math.random() * 10 + 70,
  network: Math.random() * 50 + 100,
  requests: Math.random() * 1000 + 5000,
  errors: Math.random() * 50,
  responseTime: Math.random() * 100 + 200
}));

export default function SystemHealthMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetric[]>(mockMetrics);
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [services, setServices] = useState<ServiceStatus[]>(mockServices);
  const [performanceData] = useState<PerformanceMetric[]>(mockPerformanceData);
  const [activeView, setActiveView] = useState<'overview' | 'metrics' | 'alerts' | 'services' | 'performance'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedMetric, setSelectedMetric] = useState<SystemMetric | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetrics(prevMetrics => 
        prevMetrics.map(metric => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * 5,
          lastUpdated: new Date(),
          history: [
            ...metric.history.slice(1),
            {
              timestamp: new Date(),
              value: metric.value + (Math.random() - 0.5) * 5
            }
          ]
        }))
      );
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            acknowledged: true,
            acknowledgedBy: 'current_admin',
            acknowledgedAt: new Date()
          }
        : alert
    ));
  }, []);

  const handleResolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            resolved: true,
            resolvedAt: new Date()
          }
        : alert
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
      case 'major_outage': return 'text-red-600 bg-red-50 border-red-200';
      case 'partial_outage': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'maintenance': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'unknown': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged && !alert.resolved);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  const healthyServices = services.filter(service => service.status === 'operational').length;

  const MetricCard = ({ metric }: { metric: SystemMetric }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-lg shadow-sm border-l-4 p-6 cursor-pointer hover:shadow-md transition-all ${
        metric.status === 'healthy' ? 'border-l-green-500' :
        metric.status === 'warning' ? 'border-l-yellow-500' :
        metric.status === 'critical' ? 'border-l-red-500' : 'border-l-gray-500'
      }`}
      onClick={() => setSelectedMetric(metric)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">
              {metric.unit === '%' ? metric.value.toFixed(1) : Math.round(metric.value)}
            </p>
            <span className="ml-1 text-sm text-gray-500">{metric.unit}</span>
          </div>
          <div className={`flex items-center mt-1 text-sm ${
            metric.trend === 'up' && metric.status === 'critical' ? 'text-red-600' :
            metric.trend === 'up' && metric.status === 'warning' ? 'text-orange-600' :
            metric.trend === 'down' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {metric.trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />}
            {metric.trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
            <span>
              {metric.trend === 'stable' ? 'Stable' : metric.trend === 'up' ? 'Rising' : 'Falling'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(metric.status)}`}>
            {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
          </span>
          <span className="text-xs text-gray-500 mt-2">
            {format(metric.lastUpdated, 'HH:mm:ss')}
          </span>
        </div>
      </div>
    </motion.div>
  );

  if (activeView === 'metrics') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Metrics</h2>
            <p className="text-gray-600">Detailed system performance and health metrics</p>
          </div>
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Overview
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map(metric => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        {selectedMetric && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedMetric.name} - Detailed View</h3>
              <button
                onClick={() => setSelectedMetric(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Value</span>
                    <span className="font-medium">{selectedMetric.value.toFixed(2)} {selectedMetric.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Warning Threshold</span>
                    <span className="text-yellow-600">{selectedMetric.threshold.warning} {selectedMetric.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Critical Threshold</span>
                    <span className="text-red-600">{selectedMetric.threshold.critical} {selectedMetric.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="text-gray-900">{format(selectedMetric.lastUpdated, 'PPp')}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Historical Trend (Last Hour)</h4>
                <div className="h-32 flex items-end justify-between space-x-1">
                  {selectedMetric.history.slice(-20).map((point, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-blue-600 rounded-t-sm"
                      style={{ 
                        height: `${(point.value / Math.max(...selectedMetric.history.map(p => p.value))) * 100}px`,
                        minHeight: '2px'
                      }}
                      title={`${point.value.toFixed(1)} ${selectedMetric.unit} at ${format(point.timestamp, 'HH:mm')}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'alerts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Alerts</h2>
            <p className="text-gray-600">Active alerts and notifications</p>
          </div>
          <div className="flex space-x-2">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {criticalAlerts.length} Critical
            </span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {unacknowledgedAlerts.length} Unacknowledged
            </span>
            <button
              onClick={() => setActiveView('overview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Overview
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg shadow-sm border-l-4 p-6 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'error' ? 'border-l-red-500' :
                alert.severity === 'warning' ? 'border-l-orange-500' :
                'border-l-blue-500'
              } ${alert.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{alert.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.escalated && (
                      <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Escalated
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.message}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Alert Details</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">Source:</span> {alert.source}</p>
                        <p><span className="text-gray-600">Category:</span> {alert.category}</p>
                        <p><span className="text-gray-600">Time:</span> {format(alert.timestamp, 'PPp')}</p>
                        <p><span className="text-gray-600">Affected Services:</span> {alert.affectedServices.join(', ')}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                      <ul className="text-sm space-y-1">
                        {alert.recommendedActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="text-gray-700">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {(alert.acknowledged || alert.resolved) && (
                    <div className="border-t pt-3">
                      {alert.acknowledged && (
                        <p className="text-sm text-gray-600">
                          Acknowledged by {alert.acknowledgedBy} at {format(alert.acknowledgedAt!, 'PPp')}
                        </p>
                      )}
                      {alert.resolved && (
                        <p className="text-sm text-green-700">
                          Resolved at {format(alert.resolvedAt!, 'PPp')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {!alert.acknowledged && !alert.resolved && (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'services') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Service Status</h2>
            <p className="text-gray-600">Current status of all system services</p>
          </div>
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Overview
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white rounded-lg shadow-sm border-l-4 p-6 ${
                service.status === 'operational' ? 'border-l-green-500' :
                service.status === 'degraded' ? 'border-l-yellow-500' :
                service.status === 'partial_outage' ? 'border-l-orange-500' :
                service.status === 'major_outage' ? 'border-l-red-500' :
                'border-l-blue-500'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <span className="text-sm text-gray-500 capitalize">{service.type.replace('_', ' ')}</span>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full border font-medium ${getStatusColor(service.status)}`}>
                  {service.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-medium text-gray-900">{service.uptime.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className={`font-medium ${
                    service.responseTime > 1000 ? 'text-red-600' :
                    service.responseTime > 500 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {service.responseTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Check</span>
                  <span className="text-gray-900">{format(service.lastCheck, 'HH:mm:ss')}</span>
                </div>
                {service.incidents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recent Incidents</span>
                    <span className="text-red-600 font-medium">{service.incidents}</span>
                  </div>
                )}
                {service.dependencies.length > 0 && (
                  <div>
                    <span className="text-gray-600 text-sm">Dependencies:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {service.dependencies.map(dep => (
                        <span key={dep} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'performance') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
            <p className="text-gray-600">Historical performance data and trends</p>
          </div>
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Overview
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Performance Trends</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">System Resources</h4>
              <div className="h-48 flex items-end justify-between space-x-1">
                {performanceData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col">
                    <div 
                      className="bg-blue-600 rounded-t-sm mb-1"
                      style={{ height: `${(data.cpu / 100) * 60}px`, minHeight: '2px' }}
                      title={`CPU: ${data.cpu.toFixed(1)}%`}
                    />
                    <div 
                      className="bg-green-600 mb-1"
                      style={{ height: `${(data.memory / 100) * 60}px`, minHeight: '2px' }}
                      title={`Memory: ${data.memory.toFixed(1)}%`}
                    />
                    <div 
                      className="bg-purple-600"
                      style={{ height: `${(data.disk / 100) * 60}px`, minHeight: '2px' }}
                      title={`Disk: ${data.disk.toFixed(1)}%`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-center space-x-4 mt-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded mr-2" />
                  <span>CPU</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded mr-2" />
                  <span>Memory</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-600 rounded mr-2" />
                  <span>Disk</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Application Metrics</h4>
              <div className="h-48 flex items-end justify-between space-x-1">
                {performanceData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col">
                    <div 
                      className="bg-orange-600 rounded-t-sm mb-1"
                      style={{ height: `${(data.requests / 10000) * 60}px`, minHeight: '2px' }}
                      title={`Requests: ${Math.round(data.requests)}`}
                    />
                    <div 
                      className="bg-red-600 mb-1"
                      style={{ height: `${(data.errors / 100) * 60}px`, minHeight: '2px' }}
                      title={`Errors: ${Math.round(data.errors)}`}
                    />
                    <div 
                      className="bg-yellow-600"
                      style={{ height: `${(data.responseTime / 500) * 60}px`, minHeight: '2px' }}
                      title={`Response Time: ${Math.round(data.responseTime)}ms`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-center space-x-4 mt-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-600 rounded mr-2" />
                  <span>Requests</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded mr-2" />
                  <span>Errors</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-600 rounded mr-2" />
                  <span>Response Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Overview (default view)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health Monitoring</h2>
          <p className="text-gray-600">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center text-sm ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? <PauseIcon className="h-4 w-4 mr-1" /> : <PlayIcon className="h-4 w-4 mr-1" />}
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      {(criticalAlerts.length > 0 || unacknowledgedAlerts.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="font-medium text-red-800">System Alerts Require Attention</h3>
              <p className="text-red-700 text-sm">
                {criticalAlerts.length > 0 && `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''}`}
                {criticalAlerts.length > 0 && unacknowledgedAlerts.length > 0 && ' • '}
                {unacknowledgedAlerts.length > 0 && `${unacknowledgedAlerts.length} unacknowledged alert${unacknowledgedAlerts.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{healthyServices}</div>
          <div className="text-sm text-gray-600">Services Online</div>
          <div className="text-xs text-gray-500 mt-1">
            {healthyServices}/{services.length} operational
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{unacknowledgedAlerts.length}</div>
          <div className="text-sm text-gray-600">Active Alerts</div>
          <div className="text-xs text-gray-500 mt-1">
            {criticalAlerts.length} critical
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {performanceData[performanceData.length - 1]?.requests ? Math.round(performanceData[performanceData.length - 1].requests) : 0}
          </div>
          <div className="text-sm text-gray-600">Requests/Hour</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {performanceData[performanceData.length - 1]?.responseTime ? Math.round(performanceData[performanceData.length - 1].responseTime) : 0}ms
          </div>
          <div className="text-sm text-gray-600">Avg Response Time</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'metrics', label: 'Metrics', icon: ChartBarIcon },
            { id: 'alerts', label: 'Alerts', icon: BellIcon, badge: unacknowledgedAlerts.length },
            { id: 'services', label: 'Services', icon: ServerIcon },
            { id: 'performance', label: 'Performance', icon: CpuChipIcon }
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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.slice(0, 6).map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
          <button
            onClick={() => setActiveView('alerts')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {alerts.slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {alert.severity === 'critical' && <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />}
                {alert.severity === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-3" />}
                {alert.severity === 'info' && <BellIcon className="h-5 w-5 text-blue-600 mr-3" />}
                <div>
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-600">{alert.source} • {format(alert.timestamp, 'MMM d, HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {alert.resolved && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                {alert.acknowledged && !alert.resolved && <ClockIcon className="h-5 w-5 text-yellow-600" />}
                {!alert.acknowledged && !alert.resolved && <XCircleIcon className="h-5 w-5 text-red-600" />}
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent alerts</p>
          )}
        </div>
      </div>
    </div>
  );
}