'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Brain,
  Moon,
  Sunrise,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';


interface WellnessOverviewProps {
  className?: string;
}

export default function WellnessOverview({ className = "" }: WellnessOverviewProps) {
  const { data: session } = useSession();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);

  useEffect(() => {
    if (session?.user) {
      fetchWellnessData();
    }
  }, [session, selectedPeriod]);

  const fetchWellnessData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/wellness/overview?period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wellness data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOverviewData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load wellness data');
      }
    } catch (err) {
      console.error('Wellness data fetch error:', err);
      setError('Unable to load wellness data');
      // Set default data for offline mode
      setOverviewData({
        stats: {
          averageMood: 0,
          averageEnergy: 0,
          averageAnxiety: 0,
          currentStreak: 0,
          totalEntries: 0,
          moodTrend: 'stable',
          lastEntry: null
        },
        weeklyData: [],
        insights: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Default values for loading state
  const currentMood = overviewData?.stats?.lastEntry || { mood: 0, energy: 0, anxiety: 0 };
  const moodTrend = overviewData?.stats?.moodTrend === 'improving' ? 1 : 
                    overviewData?.stats?.moodTrend === 'declining' ? -1 : 0;
  const energyTrend = 0; // Could be calculated from weekly data
  const sleepTrend = 0; // Could be calculated from weekly data
  const averages = {
    mood: overviewData?.stats?.averageMood || 0,
    energy: overviewData?.stats?.averageEnergy || 0,
    sleep: 5 // Default as we don't track sleep separately yet
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4" />; // Neutral
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMoodDescription = (mood: number) => {
    if (mood >= 8) return 'Excellent';
    if (mood >= 6) return 'Good';
    if (mood >= 4) return 'Fair';
    return 'Struggling';
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-wellness-mindful/10 rounded-lg p-2 mr-3">
            <Heart className="w-6 h-6 text-wellness-mindful" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Wellness Overview</h2>
            <p className="text-sm text-neutral-600">Your mental health journey</p>
          </div>
        </div>
        <div className="flex bg-neutral-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedPeriod === 'week' 
                ? 'bg-white text-neutral-800 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedPeriod === 'month' 
                ? 'bg-white text-neutral-800 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-3 border-wellness-mindful/20 border-t-wellness-mindful rounded-full"
          />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchWellnessData}
            className="mt-2 text-xs text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Current Status */}
      {!isLoading && !error && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-wellness-mindful/10 to-wellness-mindful/5 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Heart className="w-4 h-4 text-wellness-mindful mr-2" />
                <span className="text-sm font-medium text-neutral-700">Mood</span>
              </div>
              {getTrendIcon(moodTrend)}
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-neutral-800">{currentMood.mood || 0}</span>
              <span className="text-sm text-neutral-600 ml-1">/10</span>
              {moodTrend !== 0 && (
                <span className={`text-xs ml-2 ${getTrendColor(moodTrend)}`}>
                  {moodTrend > 0 ? '+' : ''}{Math.abs(moodTrend)}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 mt-1">{getMoodDescription(currentMood.mood || 0)}</p>
          </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-wellness-growth/10 to-wellness-growth/5 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Activity className="w-4 h-4 text-wellness-growth mr-2" />
              <span className="text-sm font-medium text-neutral-700">Energy</span>
            </div>
            {getTrendIcon(energyTrend)}
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-neutral-800">{currentMood.energy || 0}</span>
            <span className="text-sm text-neutral-600 ml-1">/10</span>
            <span className={`text-xs ml-2 ${getTrendColor(energyTrend)}`}>
              {energyTrend > 0 ? '+' : ''}{energyTrend}
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">Energy level</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-wellness-balanced/10 to-wellness-balanced/5 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Moon className="w-4 h-4 text-wellness-balanced mr-2" />
              <span className="text-sm font-medium text-neutral-700">Sleep</span>
            </div>
            {getTrendIcon(sleepTrend)}
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-neutral-800">{currentMood.anxiety ? (10 - currentMood.anxiety) : 5}</span>
            <span className="text-sm text-neutral-600 ml-1">/10</span>
            <span className={`text-xs ml-2 ${getTrendColor(sleepTrend)}`}>
              {sleepTrend > 0 ? '+' : ''}{sleepTrend}
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">Sleep quality</p>
        </motion.div>
      </div>
    )}

      {/* Week Averages */}
      {!isLoading && !error && (
        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">
            {selectedPeriod === 'week' ? "This Week's" : "This Month's"} Averages
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-wellness-mindful">
                {averages.mood > 0 ? averages.mood.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-neutral-600">Mood</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-wellness-growth">
                {averages.energy > 0 ? averages.energy.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-neutral-600">Energy</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-wellness-balanced">
                {overviewData?.stats?.totalEntries > 0 ? averages.sleep.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-neutral-600">Sleep</p>
            </div>
          </div>
          
          {overviewData?.stats?.currentStreak > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Current Streak</span>
                <span className="text-lg font-bold text-wellness-growth">
                  {overviewData.stats.currentStreak} days 🔥
                </span>
              </div>
            </div>
          )}
          
          {overviewData?.stats?.totalEntries === 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200 text-center">
              <p className="text-sm text-neutral-500">No mood entries yet</p>
              <Link href="/wellness/mood-tracker" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                Start tracking to see your averages
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-3">
        <Link href="/wellness/mood-tracker" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200 group-hover:border-primary-300 transition-all"
          >
            <div className="bg-primary-500 rounded-lg p-2 mr-3">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-neutral-800 text-sm">Log Mood</p>
              <p className="text-xs text-neutral-600">Track how you&apos;re feeling</p>
            </div>
            <ArrowRight className="w-4 h-4 text-primary-600 group-hover:translate-x-1 transition-transform" />
          </motion.div>
        </Link>

        <Link href="/wellness/analytics" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center p-3 bg-gradient-to-r from-wellness-mindful/10 to-wellness-mindful/20 rounded-lg border border-wellness-mindful/30 group-hover:border-wellness-mindful/50 transition-all"
          >
            <div className="bg-wellness-mindful rounded-lg p-2 mr-3">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-neutral-800 text-sm">View Analytics</p>
              <p className="text-xs text-neutral-600">Detailed wellness insights</p>
            </div>
            <ArrowRight className="w-4 h-4 text-wellness-mindful group-hover:translate-x-1 transition-transform" />
          </motion.div>
        </Link>
      </div>

      {/* Insights */}
      {!isLoading && !error && overviewData?.insights && overviewData.insights.length > 0 && (
        <div className="space-y-3 mt-4">
          {overviewData.insights.slice(0, 2).map((insight: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`p-3 rounded-lg border ${
                insight.type === 'positive' ? 'bg-green-50 border-green-200' :
                insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                insight.type === 'achievement' ? 'bg-purple-50 border-purple-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start">
                <Brain className={`w-4 h-4 mt-0.5 mr-2 flex-shrink-0 ${
                  insight.type === 'positive' ? 'text-green-600' :
                  insight.type === 'warning' ? 'text-red-600' :
                  insight.type === 'achievement' ? 'text-purple-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    insight.type === 'positive' ? 'text-green-800' :
                    insight.type === 'warning' ? 'text-red-800' :
                    insight.type === 'achievement' ? 'text-purple-800' :
                    'text-blue-800'
                  }`}>{insight.title}</p>
                  <p className={`text-sm mt-1 ${
                    insight.type === 'positive' ? 'text-green-700' :
                    insight.type === 'warning' ? 'text-red-700' :
                    insight.type === 'achievement' ? 'text-purple-700' :
                    'text-blue-700'
                  }`}>{insight.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}