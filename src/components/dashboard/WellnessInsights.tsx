'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { WellnessInsight, WellnessRecommendation } from '@/types/wellness';
import Link from 'next/link';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Clock
} from 'lucide-react';


interface WellnessInsightsProps {
  className?: string;
}

export default function WellnessInsights({ className = "" }: WellnessInsightsProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations'>('insights');
  const [insights, setInsights] = useState<WellnessInsight[]>([]);
  const [recommendations, setRecommendations] = useState<WellnessRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchInsights();
    }
  }, [session]);

  // Listen for mood entry updates
  useEffect(() => {
    const handleMoodUpdate = () => {
      fetchInsights();
    };
    
    window.addEventListener('moodEntryAdded', handleMoodUpdate);
    return () => window.removeEventListener('moodEntryAdded', handleMoodUpdate);
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wellness/insights');
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data.insights || []);
        setRecommendations(data.data.recommendations || []);
      } else {
        throw new Error(data.error || 'Failed to load insights');
      }
    } catch (err) {
      console.error('Insights fetch error:', err);
      setError('Unable to load insights');
      // Set empty data for offline mode
      setInsights([]);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get icon for recommendations based on category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mindfulness': return '🧘';
      case 'exercise': return '🚶';
      case 'therapy': return '📝';
      case 'sleep': return '🛏️';
      case 'social': return '💬';
      case 'nutrition': return '🥗';
      case 'hobby': return '🎨';
      default: return '✨';
    }
  };

  const getInsightIcon = (type: WellnessInsight['type']) => {
    switch (type) {
      case 'positive': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'suggestion': return <Lightbulb className="w-5 h-5 text-blue-600" />;
      case 'achievement': return <Award className="w-5 h-5 text-purple-600" />;
      default: return <Brain className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getInsightColor = (type: WellnessInsight['type']) => {
    switch (type) {
      case 'positive': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-red-200 bg-red-50';
      case 'suggestion': return 'border-blue-200 bg-blue-50';
      case 'achievement': return 'border-purple-200 bg-purple-50';
      default: return 'border-neutral-200 bg-neutral-50';
    }
  };

  const getPriorityIndicator = (priority: WellnessInsight['priority']) => {
    switch (priority) {
      case 'high': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'medium': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'low': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    }
  };

  const getRecommendationCategoryColor = (category: WellnessRecommendation['category']) => {
    switch (category) {
      case 'exercise': return 'bg-green-100 text-green-700';
      case 'mindfulness': return 'bg-purple-100 text-purple-700';
      case 'sleep': return 'bg-blue-100 text-blue-700';
      case 'social': return 'bg-pink-100 text-pink-700';
      case 'therapy': return 'bg-wellness-mindful/20 text-wellness-mindful';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyColor = (difficulty: WellnessRecommendation['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-2 mr-3">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">AI Insights</h2>
            <p className="text-sm text-neutral-600">Personalized recommendations for you</p>
          </div>
        </div>
        <div className="flex items-center text-xs text-neutral-500">
          <Sparkles className="w-4 h-4 mr-1" />
          AI Powered
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'insights' 
              ? 'bg-white text-neutral-800 shadow-sm' 
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Insights ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'recommendations' 
              ? 'bg-white text-neutral-800 shadow-sm' 
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Recommendations ({recommendations.length})
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full"
          />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchInsights}
            className="mt-2 text-xs text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Insights Tab */}
      {!isLoading && !error && activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    {getInsightIcon(insight.type)}
                    <h3 className="font-semibold text-neutral-800 ml-2">{insight.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPriorityIndicator(insight.priority)}
                    <span className="text-xs text-neutral-500">{formatTimestamp(insight.createdAt)}</span>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-700 mb-3">{insight.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    insight.category === 'mood' ? 'bg-pink-100 text-pink-700' :
                    insight.category === 'sleep' ? 'bg-blue-100 text-blue-700' :
                    insight.category === 'activity' ? 'bg-green-100 text-green-700' :
                    insight.category === 'goals' ? 'bg-purple-100 text-purple-700' :
                    insight.category === 'general' ? 'bg-gray-100 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {insight.category}
                  </span>
                  
                  {insight.actionItems && insight.actionItems.length > 0 && (
                    <div className="flex gap-2">
                      {insight.actionItems.map((action, idx) => (
                        <Link
                          key={idx}
                          href={action.link || '#'}
                          className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          {action.label}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500 text-sm mb-2">No insights available yet</p>
              <p className="text-neutral-400 text-xs">Start tracking your mood to receive personalized insights</p>
              <Link
                href="/wellness/mood-tracker"
                className="inline-block mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
              >
                Start Tracking
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {!isLoading && !error && activeTab === 'recommendations' && (
        <div className="grid md:grid-cols-2 gap-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getCategoryIcon(rec.category)}</span>
                    <div>
                      <h3 className="font-semibold text-neutral-800 group-hover:text-primary-700">
                        {rec.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRecommendationCategoryColor(rec.category)}`}>
                          {rec.category}
                        </span>
                        <span className={`text-xs font-medium ${getDifficultyColor(rec.difficulty)}`}>
                          {rec.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-600 mb-3">{rec.description}</p>
                
                {rec.benefits && rec.benefits.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-neutral-700 mb-1">Benefits:</p>
                    <div className="flex flex-wrap gap-1">
                      {rec.benefits.slice(0, 3).map((benefit, idx) => (
                        <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-neutral-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {rec.estimatedTime} min
                  </div>
                  <button className="text-sm font-medium text-primary-600 group-hover:text-primary-700 transition-colors">
                    Try Now →
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8">
              <p className="text-neutral-500 text-sm mb-2">No recommendations available</p>
              <p className="text-neutral-400 text-xs">We&apos;ll generate personalized recommendations as we learn more about you</p>
            </div>
          )}
        </div>
      )}

      {/* AI Learning Notice */}
      <div className="mt-6 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-center text-sm">
          <Brain className="w-4 h-4 text-purple-600 mr-2" />
          <span className="text-neutral-700">
            These insights improve as we learn more about your patterns and preferences.
          </span>
        </div>
      </div>
    </div>
  );
}