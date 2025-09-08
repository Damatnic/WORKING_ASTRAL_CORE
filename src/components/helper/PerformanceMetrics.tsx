'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  StarIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  TrophyIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subWeeks, subMonths, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  previousValue: number;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: 'client_satisfaction' | 'response_time' | 'session_quality' | 'availability';
  description: string;
}

interface ClientFeedback {
  id: string;
  clientName: string;
  clientId: string;
  rating: number;
  feedback: string;
  sessionDate: Date;
  sessionType: 'video' | 'chat' | 'phone';
  anonymous: boolean;
  categories: {
    communication: number;
    helpfulness: number;
    professionalism: number;
    empathy: number;
  };
}

interface SessionStats {
  id: string;
  date: Date;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  averageDuration: number;
  averageRating: number;
  responseRate: number; // percentage of messages responded to within target time
}

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  status: 'on_track' | 'behind' | 'achieved' | 'at_risk';
  category: string;
}

interface PerformanceMetricsProps {
  className?: string;
}

// Performance data will be fetched from API

export default function PerformanceMetrics({ className = "" }: PerformanceMetricsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'goals' | 'analytics'>('overview');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [feedback, setFeedback] = useState<ClientFeedback[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch performance data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [metricsRes, feedbackRes, goalsRes] = await Promise.all([
          fetch('/api/helper/metrics'),
          fetch('/api/helper/feedback'),
          fetch('/api/helper/goals')
        ]);

        if (!metricsRes.ok || !feedbackRes.ok || !goalsRes.ok) {
          throw new Error('Failed to fetch performance data');
        }

        const [metricsData, feedbackData, goalsData] = await Promise.all([
          metricsRes.json(),
          feedbackRes.json(),
          goalsRes.json()
        ]);

        setMetrics(metricsData.metrics || []);
        setFeedback(feedbackData.feedback || []);
        setGoals(goalsData.goals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFeedback, setSelectedFeedback] = useState<ClientFeedback | null>(null);

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'client_satisfaction':
        return HeartIcon;
      case 'response_time':
        return ClockIcon;
      case 'session_quality':
        return CheckCircleIcon;
      case 'availability':
        return CalendarDaysIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getMetricColor = (trend: string, value: number, target?: number) => {
    if (target && value >= target) return 'text-green-600';
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'on_track':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'behind':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'at_risk':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGoalProgress = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const averageFeedbackRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

  const categoryAverages = {
    communication: feedback.reduce((sum, f) => sum + f.categories.communication, 0) / feedback.length,
    helpfulness: feedback.reduce((sum, f) => sum + f.categories.helpfulness, 0) / feedback.length,
    professionalism: feedback.reduce((sum, f) => sum + f.categories.professionalism, 0) / feedback.length,
    empathy: feedback.reduce((sum, f) => sum + f.categories.empathy, 0) / feedback.length,
  };

  const MetricCard = ({ metric }: { metric: PerformanceMetric }) => {
    const IconComponent = getMetricIcon(metric.category);
    const isImprovement = (metric.category === 'response_time' || metric.category === 'no_show_rate') ? 
      metric.trend === 'up' && metric.trendPercentage < 0 : metric.trend === 'up';
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{metric.name}</h3>
            <p className="text-sm text-gray-600">{metric.description}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <IconComponent className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {metric.value}{metric.unit === 'stars' ? '' : metric.unit}
              {metric.unit === 'stars' && (
                <span className="flex items-center gap-1 text-lg">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon 
                      key={i} 
                      className={`w-5 h-5 ${i < Math.floor(metric.value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isImprovement ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metric.trendPercentage).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">vs last period</span>
            </div>
          </div>
          
          {metric.target && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Target</div>
              <div className={`text-sm font-medium ${metric.value >= metric.target ? 'text-green-600' : 'text-orange-600'}`}>
                {metric.target}{metric.unit}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-indigo-600" />
              Performance Metrics & Feedback
            </h2>
            <p className="text-gray-600 mt-1">Track your performance and client satisfaction</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Overall Performance Score */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Performance Score</h3>
              <p className="text-sm text-gray-600">Based on all key metrics</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-indigo-600">92</div>
              <div className="text-sm text-gray-600">out of 100</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Performance Score</span>
              <span>92/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'feedback', label: 'Client Feedback', icon: ChatBubbleLeftRightIcon },
              { id: 'goals', label: 'Goals', icon: TrophyIcon },
              { id: 'analytics', label: 'Analytics', icon: DocumentTextIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {metrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Achievement</h3>
                    <p className="text-sm text-gray-600 mb-4">You&apos;ve maintained a 4.8+ star rating for 3 consecutive weeks!</p>
                    <div className="flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">Client Satisfaction Excellence</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Area for Improvement</h3>
                    <p className="text-sm text-gray-600 mb-4">Client retention rate has decreased by 5.4% this period.</p>
                    <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                      View Action Plan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Feedback Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{averageFeedbackRating.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Overall Rating</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{categoryAverages.communication.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Communication</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{categoryAverages.helpfulness.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Helpfulness</div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    <div className="text-2xl font-bold text-indigo-600">{categoryAverages.professionalism.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Professionalism</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200">
                    <div className="text-2xl font-bold text-pink-600">{categoryAverages.empathy.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Empathy</div>
                  </div>
                </div>

                {/* Recent Feedback */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Client Feedback</h3>
                  {feedback.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-gray-200 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.clientName}</h4>
                            <p className="text-sm text-gray-600">
                              {format(item.sessionDate, 'MMM dd, yyyy')} • {item.sessionType} session
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon 
                                key={i} 
                                className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{item.rating}.0</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4">&ldquo;{item.feedback}&rdquo;</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(item.categories).map(([category, rating]) => (
                          <div key={category} className="text-center">
                            <div className="text-sm font-medium text-gray-900 capitalize">{category}</div>
                            <div className="flex items-center justify-center mt-1">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon 
                                  key={i} 
                                  className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => setSelectedFeedback(item)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Goals</h3>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Set New Goal
                  </button>
                </div>

                <div className="space-y-4">
                  {goals.map((goal) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-gray-200 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{goal.title}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getGoalStatusColor(goal.status)}`}>
                              {goal.status.replace('_', ' ').charAt(0).toUpperCase() + goal.status.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-4">{goal.description}</p>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Deadline:</span> {format(goal.deadline, 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {goal.current}<span className="text-sm font-normal">/{goal.target} {goal.unit}</span>
                          </div>
                          <div className="text-sm text-gray-600">{getGoalProgress(goal).toFixed(0)}% Complete</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span>{goal.current} / {goal.target} {goal.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              goal.status === 'achieved' ? 'bg-green-500' :
                              goal.status === 'on_track' ? 'bg-blue-500' :
                              goal.status === 'behind' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${getGoalProgress(goal)}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center py-12">
                  <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-gray-600">Detailed charts, trends, and performance insights will be available here.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback Detail Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedFeedback(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Feedback Details</h3>
                    <p className="text-gray-600">{selectedFeedback.clientName} • {format(selectedFeedback.sessionDate, 'MMMM dd, yyyy')}</p>
                  </div>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Overall Rating</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon 
                            key={i} 
                            className={`w-6 h-6 ${i < selectedFeedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-lg font-medium text-gray-900">{selectedFeedback.rating}.0 out of 5</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Feedback</h4>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-4">&ldquo;{selectedFeedback.feedback}&rdquo;</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Category Ratings</h4>
                    <div className="grid grid-cols-2 gap-6">
                      {Object.entries(selectedFeedback.categories).map(([category, rating]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900 capitalize">{category}</span>
                            <span className="text-gray-600">{rating}/5</span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon 
                                key={i} 
                                className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Session Type</h4>
                      <p className="text-gray-600 capitalize">{selectedFeedback.sessionType} Session</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Privacy</h4>
                      <p className="text-gray-600">{selectedFeedback.anonymous ? 'Anonymous' : 'Named'} Feedback</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}