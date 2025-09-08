"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Target,
  Heart,
  Brain,
  Users,
  ArrowLeft,
  Download,
  Filter,
  ChevronDown,
  Activity,
  HelpCircle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Mock data for charts
  const moodTrendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Average Mood',
        data: [3.2, 3.8, 4.1, 4.3],
        borderColor: '#8B5CF6',
        backgroundColor: '#8B5CF6',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const sessionActivityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Therapy Sessions',
        data: [2, 1, 3, 2, 1, 0, 1],
        backgroundColor: '#3B82F6',
      },
      {
        label: 'Wellness Activities',
        data: [4, 3, 5, 4, 6, 2, 3],
        backgroundColor: '#10B981',
      },
    ],
  };

  const emotionDistributionData = {
    labels: ['Happy', 'Calm', 'Anxious', 'Sad', 'Excited', 'Stressed'],
    datasets: [
      {
        data: [25, 20, 15, 10, 18, 12],
        backgroundColor: [
          '#F59E0B',
          '#10B981',
          '#F97316',
          '#6366F1',
          '#EC4899',
          '#EF4444',
        ],
      },
    ],
  };

  const wellnessMetrics = [
    {
      name: 'Mood Score',
      current: 4.3,
      previous: 3.8,
      change: '+13%',
      trend: 'up',
      color: 'text-purple-600',
      icon: Heart
    },
    {
      name: 'Therapy Sessions',
      current: 12,
      previous: 8,
      change: '+50%',
      trend: 'up',
      color: 'text-blue-600',
      icon: Brain
    },
    {
      name: 'Wellness Activities',
      current: 27,
      previous: 22,
      change: '+23%',
      trend: 'up',
      color: 'text-green-600',
      icon: Activity
    },
    {
      name: 'Community Engagement',
      current: 8,
      previous: 12,
      change: '-33%',
      trend: 'down',
      color: 'text-orange-600',
      icon: Users
    }
  ];

  const insights = [
    {
      type: 'improvement',
      title: 'Mood Improvement',
      description: 'Your average mood has improved by 13% this month, showing consistent progress.',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      type: 'pattern',
      title: 'Weekly Pattern',
      description: 'You tend to have better mood scores on weekends. Consider applying weekend strategies to weekdays.',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      type: 'goal',
      title: 'Goal Achievement',
      description: 'You\'ve completed 85% of your wellness goals this month. Keep up the great work!',
      icon: Target,
      color: 'text-purple-600'
    }
  ];

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
              </Link>
              <div className="flex items-center">
                <div className="bg-primary-500 rounded-full p-3 mr-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-800">Analytics Dashboard</h1>
                  <p className="text-neutral-600">Insights into your mental health journey</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e: any) => setTimeRange(e.target.value)}
                  className="appearance-none bg-white border border-neutral-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
              
              <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </motion.div>

          {/* Metrics Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {wellnessMetrics.map((metric, index) => (
              <div key={metric.name} className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className={`w-8 h-8 ${metric.color}`} />
                  <span className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
                <div className="text-3xl font-bold text-neutral-800 mb-1">
                  {metric.current}
                </div>
                <div className="text-neutral-600 text-sm">
                  {metric.name}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  vs. {metric.previous} last period
                </div>
              </div>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Mood Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-neutral-200 p-6"
            >
              <h3 className="text-xl font-bold text-neutral-800 mb-6">Mood Trend</h3>
              <div className="h-64">
                <Line data={moodTrendData} options={chartOptions} />
              </div>
            </motion.div>

            {/* Emotion Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6"
            >
              <h3 className="text-xl font-bold text-neutral-800 mb-6">Emotion Distribution</h3>
              <div className="h-64">
                <Doughnut data={emotionDistributionData} options={doughnutOptions} />
              </div>
            </motion.div>
          </div>

          {/* Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <h3 className="text-xl font-bold text-neutral-800 mb-6">Weekly Activity</h3>
            <div className="h-64">
              <Bar data={sessionActivityData} options={chartOptions} />
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <h3 className="text-xl font-bold text-neutral-800 mb-6">AI-Generated Insights</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {insights.map((insight, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <insight.icon className={`w-6 h-6 ${insight.color} mr-3`} />
                    <h4 className="font-semibold text-neutral-800">{insight.title}</h4>
                  </div>
                  <p className="text-neutral-600 text-sm">{insight.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Goal Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6"
          >
            <h3 className="text-xl font-bold text-neutral-800 mb-6">Goal Progress</h3>
            <div className="space-y-4">
              {[
                { name: 'Daily Mood Tracking', progress: 90, target: '30 days' },
                { name: 'Weekly Therapy Sessions', progress: 75, target: '4 sessions' },
                { name: 'Mindfulness Practice', progress: 60, target: '10 minutes daily' },
                { name: 'Physical Activity', progress: 40, target: '3 times per week' }
              ].map((goal, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-neutral-800">{goal.name}</h4>
                    <span className="text-sm text-neutral-600">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-neutral-500">Target: {goal.target}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Help & Guidance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8"
          >
            <div className="flex items-center mb-6">
              <HelpCircle className="w-6 h-6 text-blue-500 mr-3" />
              <h3 className="text-2xl font-bold text-neutral-800">Understanding Your Analytics</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                  Reading Your Data
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Trends over time:</strong>
                      <span className="text-neutral-600"> Look for patterns in your mood and wellness data across weeks and months</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Correlation insights:</strong>
                      <span className="text-neutral-600"> Notice how therapy sessions, mood tracking, and wellness activities affect each other</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Progress indicators:</strong>
                      <span className="text-neutral-600"> Upward trends in wellness scores and goal completion show positive progress</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <Info className="w-5 h-5 text-blue-500 mr-2" />
                  Key Metrics Explained
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Mood Score</h5>
                    <p className="text-neutral-600 text-sm">
                      Average of your daily mood ratings (1-5 scale). Higher scores indicate better overall emotional well-being.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Wellness Activities</h5>
                    <p className="text-neutral-600 text-sm">
                      Count of beneficial activities like breathing exercises, mindfulness, and mood tracking.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Community Engagement</h5>
                    <p className="text-neutral-600 text-sm">
                      Your participation in support groups, forums, and peer interactions for social wellness.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Items Based on Data */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                <Target className="w-5 h-5 text-purple-500 mr-2" />
                Actionable Insights
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">✓ What&#39;s Working Well</h5>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Your mood trend shows consistent improvement</li>
                    <li>• High therapy session engagement</li>
                    <li>• Strong wellness activity participation</li>
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h5 className="font-medium text-amber-800 mb-2">⚡ Areas to Focus On</h5>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>• Community engagement could be increased</li>
                    <li>• Consider more frequent mood tracking</li>
                    <li>• Set additional wellness goals for motivation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Help Links */}
            <div className="border-t border-neutral-200 pt-6">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4">Take Action Based on Your Data</h4>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard/goals"
                  className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Update Goals
                </Link>
                <Link
                  href="/wellness/mood-tracker"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Track Mood
                </Link>
                <Link
                  href="/therapy"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Start Session
                </Link>
                <Link
                  href="/community"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join Community
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/dashboard"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}