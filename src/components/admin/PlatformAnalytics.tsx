'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  MapPinIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
    retention: number;
    churn: number;
  };
  engagement: {
    sessions: number;
    avgSessionDuration: number;
    messages: number;
    posts: number;
    likes: number;
    shares: number;
  };
  mental_health: {
    crisisInterventions: number;
    therapySessions: number;
    supportGroups: number;
    safetyPlans: number;
    riskAssessments: number;
  };
  platform: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    apiCalls: number;
    dataTransfer: number;
    storage: number;
  };
}

interface TimeSeriesData {
  date: Date;
  users: number;
  sessions: number;
  messages: number;
  crises: number;
  therapy: number;
}

interface UserDemographics {
  age: Record<string, number>;
  location: Record<string, number>;
  role: Record<string, number>;
  device: Record<string, number>;
  timeZone: Record<string, number>;
}

interface PerformanceMetrics {
  pageLoad: number;
  apiResponse: number;
  errorRate: number;
  successRate: number;
  concurrent: number;
  throughput: number;
}

const mockMetrics: PlatformMetrics = {
  users: {
    total: 15847,
    active: 8934,
    new: 187,
    growth: 12.5,
    retention: 78.3,
    churn: 4.2
  },
  engagement: {
    sessions: 23456,
    avgSessionDuration: 24.7,
    messages: 89342,
    posts: 4521,
    likes: 23891,
    shares: 1247
  },
  mental_health: {
    crisisInterventions: 234,
    therapySessions: 1856,
    supportGroups: 445,
    safetyPlans: 789,
    riskAssessments: 567
  },
  platform: {
    uptime: 99.97,
    responseTime: 245,
    errorRate: 0.12,
    apiCalls: 2845672,
    dataTransfer: 1247.3,
    storage: 834.7
  }
};

const mockTimeSeriesData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
  date: subDays(new Date(), 29 - i),
  users: Math.floor(Math.random() * 1000) + 8000,
  sessions: Math.floor(Math.random() * 500) + 1000,
  messages: Math.floor(Math.random() * 2000) + 3000,
  crises: Math.floor(Math.random() * 20) + 5,
  therapy: Math.floor(Math.random() * 100) + 50
}));

const mockDemographics: UserDemographics = {
  age: {
    '18-24': 2456,
    '25-34': 4321,
    '35-44': 3789,
    '45-54': 2645,
    '55-64': 1834,
    '65+': 802
  },
  location: {
    'United States': 8934,
    'Canada': 2145,
    'United Kingdom': 1876,
    'Australia': 987,
    'Germany': 743,
    'France': 621,
    'Other': 541
  },
  role: {
    'Regular Users': 12456,
    'Helpers': 2341,
    'Therapists': 876,
    'Crisis Counselors': 123,
    'Administrators': 51
  },
  device: {
    'Mobile': 9847,
    'Desktop': 4321,
    'Tablet': 1679
  },
  timeZone: {
    'PST': 3456,
    'EST': 4321,
    'CST': 2789,
    'MST': 1876,
    'GMT': 2145,
    'Other': 1260
  }
};

const mockPerformance: PerformanceMetrics = {
  pageLoad: 1.24,
  apiResponse: 245,
  errorRate: 0.12,
  successRate: 99.88,
  concurrent: 1247,
  throughput: 8934
};

export default function PlatformAnalytics() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'engagement' | 'mental_health' | 'performance'>('users');
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'comparison' | 'export'>('overview');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const getTimeRangeLabel = useCallback((range: string) => {
    switch (range) {
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case 'custom': return 'Custom Range';
      default: return 'Last 30 Days';
    }
  }, []);

  const filteredTimeSeriesData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '24h':
        startDate = startOfDay(subDays(now, 1));
        break;
      case '7d':
        startDate = startOfWeek(subDays(now, 7));
        break;
      case '30d':
        startDate = startOfMonth(subDays(now, 30));
        break;
      case '90d':
        startDate = startOfMonth(subDays(now, 90));
        break;
      case 'custom':
        startDate = new Date(customDateRange.start);
        break;
      default:
        startDate = startOfMonth(subDays(now, 30));
    }
    
    return mockTimeSeriesData.filter(data => data.date >= startDate);
  }, [timeRange, customDateRange]);

  const getTrendDirection = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };

  const getTrendColor = (direction: string, isPositive: boolean = true) => {
    if (direction === 'stable') return 'text-gray-600';
    const isGood = isPositive ? direction === 'up' : direction === 'down';
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  const MetricCard = ({ title, value, subtitle, trend, isPositive = true, icon: Icon }: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { direction: 'up' | 'down' | 'stable'; value: number };
    isPositive?: boolean;
    icon: React.ElementType;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-1 ${getTrendColor(trend.direction, isPositive)}`}>
              {trend.direction === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />}
              {trend.direction === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
              <span className="text-sm font-medium">
                {trend.direction === 'stable' ? 'No change' : `${trend.value.toFixed(1)}%`}
              </span>
            </div>
          )}
        </div>
        <Icon className="h-8 w-8 text-blue-600" />
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={mockMetrics.users.total.toLocaleString()}
          subtitle={`${mockMetrics.users.new} new today`}
          trend={{ direction: 'up', value: mockMetrics.users.growth }}
          icon={UserGroupIcon}
        />
        <MetricCard
          title="Active Users"
          value={mockMetrics.users.active.toLocaleString()}
          subtitle={`${((mockMetrics.users.active / mockMetrics.users.total) * 100).toFixed(1)}% of total`}
          trend={{ direction: 'up', value: 8.3 }}
          icon={UserGroupIcon}
        />
        <MetricCard
          title="Daily Sessions"
          value={mockMetrics.engagement.sessions.toLocaleString()}
          subtitle={`${mockMetrics.engagement.avgSessionDuration} min avg`}
          trend={{ direction: 'up', value: 15.2 }}
          icon={ClockIcon}
        />
        <MetricCard
          title="System Uptime"
          value={`${mockMetrics.platform.uptime}%`}
          subtitle="Operational"
          trend={{ direction: 'stable', value: 0 }}
          icon={ChartBarIcon}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {filteredTimeSeriesData.slice(-7).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-600 rounded-t-sm"
                  style={{ height: `${(data.users / Math.max(...filteredTimeSeriesData.map(d => d.users))) * 200}px` }}
                />
                <span className="text-xs text-gray-500 mt-2 transform rotate-45">
                  {format(data.date, 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mental Health Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Crisis Interventions</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-red-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-red-600 rounded-full"
                    style={{ width: `${(mockMetrics.mental_health.crisisInterventions / 500) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">
                  {mockMetrics.mental_health.crisisInterventions}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Therapy Sessions</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-blue-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-blue-600 rounded-full"
                    style={{ width: `${(mockMetrics.mental_health.therapySessions / 2000) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">
                  {mockMetrics.mental_health.therapySessions}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Support Groups</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-green-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-green-600 rounded-full"
                    style={{ width: `${(mockMetrics.mental_health.supportGroups / 500) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">
                  {mockMetrics.mental_health.supportGroups}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Safety Plans</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-purple-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-purple-600 rounded-full"
                    style={{ width: `${(mockMetrics.mental_health.safetyPlans / 1000) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">
                  {mockMetrics.mental_health.safetyPlans}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Roles</h3>
          <div className="space-y-3">
            {Object.entries(mockDemographics.role).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{role}</span>
                <div className="flex items-center">
                  <div className="w-20 h-2 bg-gray-200 rounded-full mr-3">
                    <div 
                      className="h-2 bg-blue-600 rounded-full"
                      style={{ width: `${(count / mockMetrics.users.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Usage</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(mockDemographics.device).map(([device, count]) => {
              const Icon = device === 'Mobile' ? DevicePhoneMobileIcon : 
                         device === 'Desktop' ? ComputerDesktopIcon : 
                         GlobeAltIcon;
              return (
                <div key={device} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Icon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-900">{count.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{device}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((count / Object.values(mockDemographics.device).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
          <div className="space-y-3">
            {Object.entries(mockDemographics.location).slice(0, 6).map(([location, count]) => (
              <div key={location} className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{location}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded-full mr-3">
                    <div 
                      className="h-2 bg-green-600 rounded-full"
                      style={{ width: `${(count / Object.values(mockDemographics.location)[0]) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailed = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Page Load Time</span>
                <span className="font-medium">{mockPerformance.pageLoad}s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    mockPerformance.pageLoad < 2 ? 'bg-green-500' :
                    mockPerformance.pageLoad < 4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((mockPerformance.pageLoad / 5) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">API Response Time</span>
                <span className="font-medium">{mockPerformance.apiResponse}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    mockPerformance.apiResponse < 200 ? 'bg-green-500' :
                    mockPerformance.apiResponse < 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((mockPerformance.apiResponse / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium">{mockPerformance.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${mockPerformance.successRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Error Rate</span>
                <span className="font-medium">{mockPerformance.errorRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    mockPerformance.errorRate < 1 ? 'bg-green-500' :
                    mockPerformance.errorRate < 5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(mockPerformance.errorRate * 20, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{mockPerformance.concurrent.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Concurrent Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mockPerformance.throughput.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Requests/min</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{(mockMetrics.platform.dataTransfer / 1024).toFixed(1)} GB</div>
              <div className="text-sm text-gray-600">Data Transfer</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{mockMetrics.platform.storage.toFixed(0)} GB</div>
              <div className="text-sm text-gray-600">Storage Used</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Series Analysis</h3>
        <div className="h-80 flex items-end justify-between space-x-1">
          {filteredTimeSeriesData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col">
                <div 
                  className="w-full bg-blue-600 rounded-t-sm mb-1"
                  style={{ height: `${(data.users / Math.max(...filteredTimeSeriesData.map(d => d.users))) * 60}px` }}
                  title={`Users: ${data.users}`}
                />
                <div 
                  className="w-full bg-green-600 mb-1"
                  style={{ height: `${(data.sessions / Math.max(...filteredTimeSeriesData.map(d => d.sessions))) * 60}px` }}
                  title={`Sessions: ${data.sessions}`}
                />
                <div 
                  className="w-full bg-purple-600 mb-1"
                  style={{ height: `${(data.messages / Math.max(...filteredTimeSeriesData.map(d => d.messages))) * 60}px` }}
                  title={`Messages: ${data.messages}`}
                />
                <div 
                  className="w-full bg-red-600"
                  style={{ height: `${(data.crises / Math.max(...filteredTimeSeriesData.map(d => d.crises))) * 60}px` }}
                  title={`Crises: ${data.crises}`}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2 transform rotate-45 whitespace-nowrap">
                {format(data.date, 'MMM d')}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-4 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded mr-2" />
            <span className="text-sm text-gray-600">Users</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded mr-2" />
            <span className="text-sm text-gray-600">Sessions</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-600 rounded mr-2" />
            <span className="text-sm text-gray-600">Messages</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded mr-2" />
            <span className="text-sm text-gray-600">Crisis Events</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <DocumentArrowDownIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <div className="font-medium text-gray-900">CSV Export</div>
            <div className="text-sm text-gray-500">Download raw data</div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center">
            <PrinterIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <div className="font-medium text-gray-900">PDF Report</div>
            <div className="text-sm text-gray-500">Formatted report</div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center">
            <ShareIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <div className="font-medium text-gray-900">Share Dashboard</div>
            <div className="text-sm text-gray-500">Generate link</div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
        <div className="prose max-w-none">
          <h4>Platform Performance Report</h4>
          <p><strong>Period:</strong> {getTimeRangeLabel(timeRange)}</p>
          <p><strong>Generated:</strong> {format(new Date(), 'PPpp')}</p>
          
          <h5>Key Metrics</h5>
          <ul>
            <li>Total Users: {mockMetrics.users.total.toLocaleString()} ({mockMetrics.users.growth > 0 ? '+' : ''}{mockMetrics.users.growth}%)</li>
            <li>Daily Active Users: {mockMetrics.users.active.toLocaleString()}</li>
            <li>System Uptime: {mockMetrics.platform.uptime}%</li>
            <li>Crisis Interventions: {mockMetrics.mental_health.crisisInterventions}</li>
          </ul>
          
          <h5>Notable Trends</h5>
          <ul>
            <li>User growth has increased by {mockMetrics.users.growth}% this period</li>
            <li>Average session duration is {mockMetrics.engagement.avgSessionDuration} minutes</li>
            <li>Crisis intervention response time improved by 15%</li>
            <li>Platform stability maintained at {mockMetrics.platform.uptime}% uptime</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Analytics</h2>
          <p className="text-gray-600">Comprehensive platform metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {timeRange === 'custom' && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'detailed', label: 'Detailed', icon: EyeIcon },
            { id: 'export', label: 'Export', icon: DocumentArrowDownIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewType(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  viewType === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {viewType === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderOverview()}
          </motion.div>
        )}

        {viewType === 'detailed' && (
          <motion.div
            key="detailed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderDetailed()}
          </motion.div>
        )}

        {viewType === 'export' && (
          <motion.div
            key="export"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderExport()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}