'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Heart,
  Target,
  Award,
  ArrowLeft,
  Download,
  Filter,
  Clock,
  Flame,
  Star,
  Brain,
  Moon,
  Zap,
  Eye,
  Users,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  BarChart2,
  PieChart,
  LineChart,
  Share2,
  Settings,
  Bell,
  BookOpen,
  Sparkles,
  RefreshCw,
  Calendar as CalendarIcon,
  ChevronRight,
  Info,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function WellnessAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overall');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('area');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Comprehensive analytics data
  const analytics = {
    overview: {
      totalSessions: 284,
      averageRating: 7.8,
      currentStreak: 12,
      longestStreak: 23,
      totalMinutes: 4680,
      weeklyGoal: 7,
      weeklyProgress: 5,
      improvementScore: 85,
      consistencyScore: 78,
      wellnessScore: 82,
      lastWeekImprovement: 12,
      monthlyGoalProgress: 87,
      totalBadgesEarned: 15
    },
    
    detailedTrends: {
      mood: {
        current: [6, 7, 8, 7, 9, 8, 7, 8, 9, 7, 8, 9, 8, 7, 9, 8, 7, 8, 9, 8, 7, 8, 9, 7, 8, 9, 8, 7, 8, 9],
        previous: [5, 6, 7, 6, 8, 7, 6, 7, 8, 6, 7, 8, 7, 6, 8, 7, 6, 7, 8, 7, 6, 7, 8, 6, 7, 8, 7, 6, 7, 8],
        average: 7.9,
        trend: '+12%',
        correlation: { sleep: 0.76, exercise: 0.68, stress: -0.82 }
      },
      stress: {
        current: [8, 7, 6, 7, 5, 6, 7, 6, 4, 6, 5, 4, 5, 6, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5, 6, 4, 5, 6, 5, 4],
        previous: [9, 8, 7, 8, 6, 7, 8, 7, 5, 7, 6, 5, 6, 7, 5, 6, 7, 6, 5, 6, 7, 6, 5, 6, 7, 5, 6, 7, 6, 5],
        average: 5.3,
        trend: '-18%',
        correlation: { work: 0.74, social: -0.61, mindfulness: -0.85 }
      },
      energy: {
        current: [5, 6, 7, 8, 7, 8, 9, 8, 9, 8, 9, 10, 9, 8, 9, 8, 7, 8, 9, 8, 9, 8, 7, 8, 9, 8, 9, 8, 7, 8],
        previous: [4, 5, 6, 7, 6, 7, 8, 7, 8, 7, 8, 9, 8, 7, 8, 7, 6, 7, 8, 7, 8, 7, 6, 7, 8, 7, 8, 7, 6, 7],
        average: 8.1,
        trend: '+25%',
        correlation: { exercise: 0.89, sleep: 0.73, nutrition: 0.67 }
      },
      sleep: {
        current: [6, 7, 8, 7, 8, 9, 8, 9, 8, 9, 8, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8, 9, 8, 7, 8, 9],
        previous: [5, 6, 7, 6, 7, 8, 7, 8, 7, 8, 7, 8, 7, 6, 7, 8, 7, 6, 7, 8, 7, 6, 7, 8, 7, 8, 7, 6, 7, 8],
        average: 8.0,
        trend: '+15%',
        correlation: { bedtime: -0.72, screenTime: -0.58, exercise: 0.65 }
      }
    },

    activities: [
      { 
        name: 'Mindfulness', 
        sessions: 67, 
        minutes: 1005, 
        improvement: '+23%', 
        avgDuration: 15, 
        consistency: 89,
        favoriteTime: 'Morning',
        completionRate: 94,
        benefitScore: 8.7
      },
      { 
        name: 'Breathing', 
        sessions: 45, 
        minutes: 675, 
        improvement: '+18%', 
        avgDuration: 15, 
        consistency: 76,
        favoriteTime: 'Evening',
        completionRate: 87,
        benefitScore: 8.3
      },
      { 
        name: 'Mood Tracking', 
        sessions: 89, 
        minutes: 178, 
        improvement: '+31%', 
        avgDuration: 2, 
        consistency: 95,
        favoriteTime: 'Morning',
        completionRate: 98,
        benefitScore: 9.1
      },
      { 
        name: 'Journaling', 
        sessions: 23, 
        minutes: 690, 
        improvement: '+12%', 
        avgDuration: 30, 
        consistency: 62,
        favoriteTime: 'Evening',
        completionRate: 81,
        benefitScore: 8.9
      }
    ],

    patterns: {
      bestDayOfWeek: 'Tuesday',
      bestTimeOfDay: '7:00 AM',
      mostProductiveHour: 9,
      challengingDays: ['Monday', 'Friday'],
      streakPatterns: {
        longestStreak: 23,
        averageStreak: 8.5,
        streakFrequency: 'Every 2.3 weeks'
      },
      seasonalTrends: {
        spring: 8.2,
        summer: 8.7,
        fall: 7.9,
        winter: 7.4
      }
    },

    insights: [
      {
        id: 'mood-sleep',
        type: 'correlation',
        title: 'Sleep Quality Drives Mood',
        description: 'Strong correlation (76%) between sleep quality and next-day mood. Prioritizing sleep could boost your mood significantly.',
        actionable: true,
        impact: 'high',
        suggestion: 'Try setting a consistent bedtime routine',
        icon: Moon,
        color: 'blue'
      },
      {
        id: 'stress-mindfulness',
        type: 'improvement',
        title: 'Mindfulness Reduces Stress',
        description: 'Days with mindfulness practice show 40% lower stress levels. Your consistency is paying off!',
        actionable: true,
        impact: 'high', 
        suggestion: 'Continue daily mindfulness, especially on high-stress days',
        icon: Brain,
        color: 'purple'
      },
      {
        id: 'energy-exercise',
        type: 'pattern',
        title: 'Tuesday Energy Peak',
        description: 'Your energy levels consistently peak on Tuesdays. Consider scheduling important tasks then.',
        actionable: true,
        impact: 'medium',
        suggestion: 'Plan challenging activities for Tuesday mornings',
        icon: Zap,
        color: 'green'
      },
      {
        id: 'weekend-dip',
        type: 'warning',
        title: 'Weekend Routine Gap',
        description: 'Wellness activities drop 60% on weekends. This affects Monday motivation.',
        actionable: true,
        impact: 'medium',
        suggestion: 'Create a lighter weekend wellness routine',
        icon: AlertCircle,
        color: 'orange'
      }
    ],

    achievements: [
      { name: 'Mindfulness Master', earned: true, date: '2024-12-15', category: 'practice', rarity: 'rare' },
      { name: 'Consistency Champion', earned: true, date: '2024-12-10', category: 'streaks', rarity: 'epic' },
      { name: 'Mood Tracker Pro', earned: true, date: '2024-12-08', category: 'tracking', rarity: 'common' },
      { name: 'Stress Warrior', earned: false, progress: 78, category: 'wellness', rarity: 'rare' },
      { name: 'Sleep Optimizer', earned: false, progress: 65, category: 'health', rarity: 'uncommon' },
      { name: 'Wellness Guru', earned: false, progress: 45, category: 'mastery', rarity: 'legendary' }
    ],

    predictions: {
      nextWeekMood: 8.3,
      stressReduction: 15,
      goalCompletion: 92,
      recommendations: [
        'Focus on evening wind-down routine',
        'Try morning stretching sessions', 
        'Consider meditation before stressful meetings'
      ]
    }
  };

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
    { value: 'all', label: 'All time' }
  ];

  const metrics = [
    { value: 'overall', label: 'Overall Wellness', icon: Heart },
    { value: 'mood', label: 'Mood Trends', icon: Heart },
    { value: 'stress', label: 'Stress Levels', icon: Brain },
    { value: 'energy', label: 'Energy Patterns', icon: Zap },
    { value: 'sleep', label: 'Sleep Quality', icon: Moon }
  ];

  const currentTrend = analytics.detailedTrends[selectedMetric as keyof typeof analytics.detailedTrends] || analytics.detailedTrends.mood;
  
  const getInsightIcon = (insight: any) => {
    const IconComponent = insight.icon;
    return <IconComponent className="w-5 h-5" />;
  };

  const getInsightColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800', 
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const exportOptions = [
    { label: 'PDF Report', format: 'pdf', icon: Download },
    { label: 'CSV Data', format: 'csv', icon: BarChart2 },
    { label: 'Share Link', format: 'share', icon: Share2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link 
              href="/wellness"
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-800">Advanced Analytics</h1>
              <p className="text-neutral-600 mt-1">Deep insights into your wellness journey</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            
            <div className="flex bg-neutral-100 rounded-lg p-1">
              {[
                { type: 'area', icon: LineChart },
                { type: 'bar', icon: BarChart3 }, 
                { type: 'line', icon: BarChart2 }
              ].map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type as any)}
                  className={`p-2 rounded-md transition-all ${
                    chartType === type ? 'bg-white shadow-sm' : 'hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4 text-neutral-600" />
                </button>
              ))}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showExportOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 min-w-[160px]"
                  >
                    {exportOptions.map(option => (
                      <button
                        key={option.format}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-neutral-50 transition-colors"
                      >
                        <option.icon className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm text-neutral-700">{option.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Wellness Score', 
              value: analytics.overview.wellnessScore, 
              suffix: '/100',
              change: `+${analytics.overview.lastWeekImprovement}%`,
              icon: Target, 
              color: 'text-blue-600',
              bgColor: 'bg-blue-50'
            },
            { 
              label: 'Current Streak', 
              value: analytics.overview.currentStreak, 
              suffix: ' days',
              subtext: `Best: ${analytics.overview.longestStreak} days`,
              icon: Flame, 
              color: 'text-orange-500',
              bgColor: 'bg-orange-50'
            },
            { 
              label: 'Total Sessions', 
              value: analytics.overview.totalSessions,
              change: '+23%',
              subtext: `${Math.round(analytics.overview.totalMinutes/60)} hours total`,
              icon: Activity, 
              color: 'text-green-500',
              bgColor: 'bg-green-50'
            },
            { 
              label: 'Consistency', 
              value: analytics.overview.consistencyScore, 
              suffix: '%',
              change: '+8%',
              icon: CheckCircle2, 
              color: 'text-purple-500',
              bgColor: 'bg-purple-50'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metric.bgColor} rounded-2xl p-6 border border-opacity-20`}
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={`w-8 h-8 ${metric.color}`} />
                {metric.change && (
                  <div className={`flex items-center space-x-1 text-sm font-medium ${
                    metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change.startsWith('+') ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span>{metric.change}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-neutral-800 mb-1">
                {metric.value}{metric.suffix}
              </div>
              <div className="text-sm text-neutral-600">{metric.label}</div>
              {metric.subtext && (
                <div className="text-xs text-neutral-500 mt-2">{metric.subtext}</div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Advanced Chart Section */}
        <div className="grid lg:grid-cols-4 gap-8 mb-8">
          
          {/* Main Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-800">Wellness Trends</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                >
                  {metrics.map(metric => (
                    <option key={metric.value} value={metric.value}>{metric.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    compareMode 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {compareMode ? 'Hide Comparison' : 'Compare Periods'}
                </button>
              </div>
            </div>
            
            {/* Chart Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{currentTrend.average}</div>
                <div className="text-sm text-neutral-600">Average</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  currentTrend.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentTrend.trend}
                </div>
                <div className="text-sm text-neutral-600">Change</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.max(...currentTrend.current)}
                </div>
                <div className="text-sm text-neutral-600">Peak</div>
              </div>
            </div>
            
            {/* Enhanced Chart Visualization */}
            <div className="h-80 flex items-end justify-between space-x-1">
              {currentTrend.current.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  {compareMode && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${((currentTrend.previous?.[index] ?? 0) / 10) * 100}%` }}
                      transition={{ delay: index * 0.02 }}
                      className="w-full bg-neutral-300 rounded-t-sm opacity-50 mb-1"
                    />
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(value / 10) * 100}%` }}
                    transition={{ delay: index * 0.02 }}
                    className={`w-full rounded-t-lg ${
                      selectedMetric === 'mood' ? 'bg-gradient-to-t from-pink-400 to-pink-500' :
                      selectedMetric === 'stress' ? 'bg-gradient-to-t from-red-400 to-red-500' :
                      selectedMetric === 'energy' ? 'bg-gradient-to-t from-green-400 to-green-500' :
                      selectedMetric === 'sleep' ? 'bg-gradient-to-t from-blue-400 to-blue-500' :
                      'bg-gradient-to-t from-purple-400 to-purple-500'
                    } hover:opacity-80 transition-opacity cursor-pointer`}
                    title={`Day ${index + 1}: ${value}/10`}
                  />
                  <div className="text-xs text-neutral-500 mt-1">{index + 1}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Correlations Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <h3 className="text-lg font-bold text-neutral-800 mb-4">Correlations</h3>
            
            <div className="space-y-4">
              {Object.entries(currentTrend.correlation).map(([factor, correlation], index) => (
                <motion.div
                  key={factor}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium text-neutral-700">{factor}</span>
                    <span className={`font-bold ${
                      Math.abs(correlation) > 0.7 ? 'text-green-600' :
                      Math.abs(correlation) > 0.4 ? 'text-yellow-600' :
                      'text-neutral-600'
                    }`}>
                      {correlation > 0 ? '+' : ''}{(correlation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        correlation > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.abs(correlation) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* AI Insights Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-neutral-800">AI-Powered Insights</h2>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Generate New</span>
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {analytics.insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`${getInsightColor(insight.color)} rounded-2xl p-6 border-2 cursor-pointer hover:shadow-lg transition-all`}
                onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getInsightIcon(insight)}
                    <h3 className="font-bold">{insight.title}</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {insight.impact} impact
                  </div>
                </div>
                
                <p className="text-sm mb-4">{insight.description}</p>
                
                {insight.actionable && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">💡 {insight.suggestion}</div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      selectedInsight === insight.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                )}
                
                <AnimatePresence>
                  {selectedInsight === insight.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-current border-opacity-20"
                    >
                      <button className="w-full bg-white bg-opacity-50 hover:bg-opacity-75 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Create Action Plan
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Activity Breakdown */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <h3 className="text-xl font-bold text-neutral-800 mb-6">Activity Deep Dive</h3>
            
            <div className="space-y-6">
              {analytics.activities.map((activity, index) => (
                <motion.div
                  key={activity.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="p-4 rounded-lg bg-gradient-to-r from-neutral-50 to-neutral-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-neutral-800">{activity.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <span>{activity.sessions} sessions</span>
                        <span>{activity.avgDuration} min avg</span>
                        <span className="text-green-600 font-medium">{activity.improvement}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{activity.benefitScore}</div>
                      <div className="text-xs text-neutral-500">benefit score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Consistency</div>
                      <div className="font-bold text-neutral-800">{activity.consistency}%</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Best Time</div>
                      <div className="font-bold text-neutral-800">{activity.favoriteTime}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Completion</div>
                      <div className="font-bold text-neutral-800">{activity.completionRate}%</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{Math.round((activity.sessions / 100) * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((activity.sessions / 100) * 100, 100)}%` }}
                        transition={{ delay: 0.8 + index * 0.1, duration: 1 }}
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Enhanced Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-800">Achievements & Badges</h3>
              <div className="text-sm text-neutral-600">
                {analytics.achievements.filter(a => a.earned).length} / {analytics.achievements.length}
              </div>
            </div>
            
            <div className="space-y-4">
              {analytics.achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                    achievement.earned 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' 
                      : 'bg-neutral-50 border-2 border-neutral-200'
                  }`}
                >
                  <div className={`p-3 rounded-full ${
                    achievement.earned 
                      ? 'bg-yellow-100' 
                      : 'bg-neutral-200'
                  }`}>
                    <Award className={`w-6 h-6 ${
                      achievement.earned 
                        ? 'text-yellow-600' 
                        : 'text-neutral-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-bold ${
                        achievement.earned 
                          ? 'text-neutral-800' 
                          : 'text-neutral-600'
                      }`}>
                        {achievement.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        achievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-700' :
                        achievement.rarity === 'epic' ? 'bg-blue-100 text-blue-700' :
                        achievement.rarity === 'rare' ? 'bg-green-100 text-green-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {achievement.rarity}
                      </span>
                    </div>
                    
                    {achievement.earned ? (
                      <p className="text-sm text-yellow-600 font-medium">
                        Earned {new Date(achievement.date!).toLocaleDateString()}
                      </p>
                    ) : (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600">Progress</span>
                          <span className="font-medium">{achievement.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.progress}%` }}
                            transition={{ delay: 0.9 + index * 0.1, duration: 1 }}
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {achievement.earned && (
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Predictions & Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl text-white p-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Brain className="w-8 h-8" />
            <h2 className="text-2xl font-bold">AI Predictions & Recommendations</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-20 rounded-2xl p-6">
              <h3 className="font-bold mb-2">Next Week Prediction</h3>
              <div className="text-3xl font-bold mb-2">{analytics.predictions.nextWeekMood}/10</div>
              <p className="text-sm opacity-90">Expected mood score</p>
            </div>
            
            <div className="bg-white bg-opacity-20 rounded-2xl p-6">
              <h3 className="font-bold mb-2">Stress Reduction</h3>
              <div className="text-3xl font-bold mb-2">-{analytics.predictions.stressReduction}%</div>
              <p className="text-sm opacity-90">Predicted improvement</p>
            </div>
            
            <div className="bg-white bg-opacity-20 rounded-2xl p-6">
              <h3 className="font-bold mb-2">Goal Achievement</h3>
              <div className="text-3xl font-bold mb-2">{analytics.predictions.goalCompletion}%</div>
              <p className="text-sm opacity-90">Completion likelihood</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Personalized Recommendations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {analytics.predictions.recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5" />
                    <span className="font-medium">{rec}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}