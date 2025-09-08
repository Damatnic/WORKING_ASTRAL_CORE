"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Activity, 
  Sun,
  Moon,
  Leaf,
  Target,
  BarChart3,
  Calendar,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  TrendingUp,
  Flame,
  Award,
  Clock,
  Star,
  Zap,
  BookOpen,
  Users,
  CloudRain,
  CloudSun,
  ThumbsUp,
  Timer,
  Sparkles,
  Trophy,
  Bookmark,
  RotateCcw,
  TrendingDown,
  Search,
  Filter,
  Bell,
  Lightbulb,
  RefreshCw,
  Shuffle,
  Command,
  PartyPopper
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WellnessPage() {
  const router = useRouter();
  const [expandedAction, setExpandedAction] = useState<number | null>(null);
  const [quickMoodRating, setQuickMoodRating] = useState<number | null>(null);
  const [showQuickMoodSuccess, setShowQuickMoodSuccess] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(['mood-tracker', 'breathing']);
  const [currentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [todayIntention, setTodayIntention] = useState('');
  const [showIntentionInput, setShowIntentionInput] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock user wellness data - in a real app, this would come from an API
  const wellnessStats = {
    currentStreak: 7,
    totalSessions: 42,
    weeklyGoalProgress: 5,
    weeklyGoal: 7,
    lastCheckIn: '2 hours ago',
    wellnessScore: 85,
    recentMoods: [7, 8, 6, 9, 7, 8, 9], // Last 7 days
    achievements: [
      { id: 'streak-7', name: '7-Day Streak', icon: Flame, unlocked: true },
      { id: 'first-session', name: 'First Session', icon: Star, unlocked: true },
      { id: 'mood-master', name: 'Mood Master', icon: Heart, unlocked: true },
      { id: 'zen-master', name: 'Zen Master', icon: Leaf, unlocked: false },
    ]
  };

  const recentActivity = [
    { action: 'Completed breathing exercise', time: '2 hours ago', icon: Activity, color: 'text-wellness-calm' },
    { action: 'Mood check-in: Feeling great', time: '5 hours ago', icon: Heart, color: 'text-wellness-growth' },
    { action: 'Set new wellness goal', time: '1 day ago', icon: Target, color: 'text-primary-600' },
    { action: 'Journal entry completed', time: '2 days ago', icon: BookOpen, color: 'text-wellness-mindful' },
  ];

  const wellnessTips = [
    {
      title: "Practice the 5-4-3-2-1 Grounding Technique",
      description: "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
      category: "Mindfulness",
      icon: Leaf
    },
    {
      title: "Take Regular Movement Breaks",
      description: "Every 30 minutes, stand up and do some light stretching or walk around for 2-3 minutes.",
      category: "Physical Wellness",
      icon: Activity
    },
    {
      title: "Set a Daily Gratitude Intention",
      description: "Each morning, identify three things you're grateful for and one person you want to appreciate.",
      category: "Mental Health",
      icon: Heart
    },
    {
      title: "Practice the 4-7-8 Breathing Method",
      description: "Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. Repeat 4 times for instant calm.",
      category: "Stress Relief",
      icon: Activity
    },
    {
      title: "Create a Digital Sunset Routine",
      description: "Put devices away 1 hour before bed and do calming activities like reading or gentle stretching.",
      category: "Sleep Health",
      icon: Moon
    }
  ];

  // Time-based recommendations
  const getTimeBasedRecommendations = () => {
    const hour = currentTime.getHours();
    if (hour < 10) {
      return {
        title: "Good Morning! Start Fresh",
        suggestions: [
          { name: "Morning Mindfulness", icon: Sun, description: "5-min morning meditation", action: () => router.push('/wellness/mindfulness?session=morning') },
          { name: "Daily Intention Setting", icon: Target, description: "Set today's wellness goal", action: () => router.push('/wellness/goals?mode=daily') },
        ]
      };
    } else if (hour < 14) {
      return {
        title: "Midday Energy Boost",
        suggestions: [
          { name: "Quick Stress Relief", icon: Activity, description: "3-min breathing break", action: () => router.push('/wellness/breathing?session=quick') },
          { name: "Mood Check-in", icon: Heart, description: "How are you feeling?", action: () => router.push('/wellness/mood-tracker?mode=quick') },
        ]
      };
    } else if (hour < 18) {
      return {
        title: "Afternoon Recharge",
        suggestions: [
          { name: "Energy Breathing", icon: Zap, description: "Energizing breath work", action: () => router.push('/wellness/breathing?type=energizing') },
          { name: "Progress Review", icon: BarChart3, description: "Check your daily progress", action: () => router.push('/wellness/analytics') },
        ]
      };
    } else {
      return {
        title: "Evening Wind Down",
        suggestions: [
          { name: "Relaxation Session", icon: Moon, description: "Prepare for rest", action: () => router.push('/wellness/mindfulness?session=evening') },
          { name: "Daily Reflection", icon: BookOpen, description: "Journal about your day", action: () => router.push('/wellness/journal?mode=reflection') },
        ]
      };
    }
  };

  const timeRecommendations = getTimeBasedRecommendations();

  // Close expanded menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandedAction(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close expanded menu when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedAction(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const wellnessTools = [
    {
      icon: Brain,
      title: "Mood Tracking",
      description: "Track your daily mood patterns and identify triggers",
      color: "bg-wellness-mindful",
      link: "/wellness/mood-tracker"
    },
    {
      icon: Activity,
      title: "Breathing Exercises", 
      description: "Guided breathing exercises for stress relief and anxiety",
      color: "bg-wellness-calm",
      link: "/wellness/breathing"
    },
    {
      icon: Target,
      title: "Goal Setting",
      description: "Set and track personal wellness and mental health goals",
      color: "bg-wellness-growth",
      link: "/wellness/goals"
    },
    {
      icon: Sun,
      title: "Daily Check-ins",
      description: "Regular wellness check-ins to monitor your progress",
      color: "bg-wellness-balanced",
      link: "/wellness/check-in"
    },
    {
      icon: BarChart3,
      title: "Progress Analytics",
      description: "Visualize your wellness journey with detailed insights",
      color: "bg-primary-500",
      link: "/wellness/analytics"
    },
    {
      icon: Leaf,
      title: "Mindfulness",
      description: "Meditation and mindfulness exercises for mental clarity",
      color: "bg-green-500",
      link: "/wellness/mindfulness"
    }
  ];

  const quickActions = [
    {
      title: "Take a Quick Mood Check",
      description: "2-minute assessment",
      icon: Heart,
      action: "Start Now",
      options: [
        { name: "Quick Check-in", time: "2 min", action: () => router.push('/wellness/mood-tracker?mode=quick') },
        { name: "Detailed Assessment", time: "5 min", action: () => router.push('/wellness/mood-tracker?mode=detailed') },
        { name: "Weekly Review", time: "10 min", action: () => router.push('/wellness/mood-tracker?mode=weekly') }
      ]
    },
    {
      title: "5-Minute Breathing Exercise",
      description: "Reduce stress instantly",
      icon: Activity,
      action: "Begin",
      options: [
        { name: "Box Breathing", time: "4 min", action: () => router.push('/wellness/breathing?type=box') },
        { name: "4-7-8 Technique", time: "3 min", action: () => router.push('/wellness/breathing?type=478') },
        { name: "Deep Belly Breathing", time: "5 min", action: () => router.push('/wellness/breathing?type=belly') },
        { name: "Custom Session", time: "Variable", action: () => router.push('/wellness/breathing?type=custom') }
      ]
    },
    {
      title: "Set a Wellness Goal",
      description: "Plan your wellness journey",
      icon: Target,
      action: "Create Goal",
      options: [
        { name: "Mood Goal", time: "3 min", action: () => router.push('/wellness/goals?type=mood') },
        { name: "Habit Goal", time: "5 min", action: () => router.push('/wellness/goals?type=habit') },
        { name: "Mindfulness Goal", time: "4 min", action: () => router.push('/wellness/goals?type=mindfulness') },
        { name: "Exercise Goal", time: "3 min", action: () => router.push('/wellness/goals?type=exercise') }
      ]
    }
  ];

  const handleActionClick = (actionIndex: number) => {
    if (expandedAction === actionIndex) {
      setExpandedAction(null);
    } else {
      setExpandedAction(actionIndex);
    }
  };

  const handleToolClick = (toolLink: string) => {
    router.push(toolLink);
  };

  const handleQuickMoodRating = (rating: number) => {
    setQuickMoodRating(rating);
    setShowQuickMoodSuccess(true);
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      setShowQuickMoodSuccess(false);
    }, 3000);
    
    // In a real app, this would save to the backend
    console.log('Quick mood rating saved:', rating);
  };

  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const calculateMoodTrend = () => {
    const recent = wellnessStats.recentMoods.slice(-3);
    const older = wellnessStats.recentMoods.slice(-6, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  };

  const moodTrend = calculateMoodTrend();

  const handleIntentionSave = () => {
    setShowIntentionInput(false);
    if (todayIntention.trim()) {
      // In a real app, this would save to backend
      console.log('Today\'s intention saved:', todayIntention);
    }
  };

  const cycleTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % wellnessTips.length);
  };

  const filteredTools = wellnessTools.filter(tool => 
    searchTerm === '' || 
    tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Celebration effect for streaks
  useEffect(() => {
    if (wellnessStats.currentStreak >= 7) {
      const timer = setTimeout(() => {
        setShowStreakCelebration(true);
        setTimeout(() => setShowStreakCelebration(false), 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [wellnessStats.currentStreak]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            setShowSearch(!showSearch);
            break;
          case 'm':
            event.preventDefault();
            router.push('/wellness/mood-tracker');
            break;
          case 'b':
            event.preventDefault();
            router.push('/wellness/breathing');
            break;
          case 'i':
            event.preventDefault();
            setShowIntentionInput(!showIntentionInput);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showSearch, showIntentionInput, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-calm/10 via-white to-wellness-growth/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-wellness-growth rounded-full p-4 mr-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-4xl font-bold text-neutral-800">
                    Wellness Hub
                  </h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="text-sm text-neutral-500">
                      Track progress • Build habits • Find balance
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center space-x-3">
                {/* Search Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-3 rounded-full bg-white shadow-soft border border-neutral-200 hover:shadow-md transition-shadow"
                  title="Search tools (⌘K)"
                >
                  <Search className="w-5 h-5 text-neutral-600" />
                </motion.button>

                {/* Keyboard Shortcuts Info */}
                <div className="hidden lg:flex items-center space-x-2 text-xs text-neutral-500 bg-neutral-50 px-3 py-2 rounded-full">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                  <span className="text-neutral-300">•</span>
                  <span>M</span>
                  <span className="text-neutral-300">•</span>
                  <span>B</span>
                  <span className="text-neutral-300">•</span>
                  <span>I</span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-md mx-auto mb-6"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search wellness tools..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <p className="text-xl text-neutral-600 mb-4">
              Tools and resources to support your mental health journey
            </p>
          </motion.div>

          {/* Streak Celebration */}
          <AnimatePresence>
            {showStreakCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-8 text-center border-4 border-orange-200"
              >
                <PartyPopper className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-orange-600 mb-2">🎉 Amazing Streak!</h2>
                <p className="text-neutral-700 mb-4">You&apos;ve maintained your wellness routine for {wellnessStats.currentStreak} days straight!</p>
                <div className="flex items-center justify-center space-x-2">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <span className="text-3xl font-bold text-orange-500">{wellnessStats.currentStreak}</span>
                  <span className="text-neutral-600">days</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily Intention Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-neutral-800">Today&apos;s Intention</h3>
              </div>
              <button
                onClick={() => setShowIntentionInput(!showIntentionInput)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {todayIntention ? 'Edit' : 'Set Intention'}
              </button>
            </div>

            {showIntentionInput ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="What's your intention for today?"
                  value={todayIntention}
                  onChange={(e) => setTodayIntention(e.target.value)}
                  className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleIntentionSave()}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleIntentionSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowIntentionInput(false)}
                    className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                {todayIntention ? (
                  <p className="text-lg text-neutral-700 italic">&ldquo;{todayIntention}&rdquo;</p>
                ) : (
                  <p className="text-neutral-500">Set your intention for today to stay focused on what matters most</p>
                )}
              </div>
            )}
          </motion.div>

          {/* Personal Wellness Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 mb-8"
          >
            {/* Wellness Score */}
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">Wellness Score</h3>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-wellness-growth to-wellness-mindful flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{wellnessStats.wellnessScore}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">This week</span>
                  <span className="text-wellness-growth font-medium">+12%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-wellness-growth to-wellness-mindful h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${wellnessStats.wellnessScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">Current Streak</h3>
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-500">{wellnessStats.currentStreak}</div>
                <div className="text-sm text-neutral-600">days in a row</div>
                <div className="text-xs text-neutral-500">Last check-in: {wellnessStats.lastCheckIn}</div>
              </div>
            </div>

            {/* Weekly Progress */}
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">Weekly Goal</h3>
                <Target className="w-6 h-6 text-wellness-calm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-wellness-calm">{wellnessStats.weeklyGoalProgress}</span>
                  <span className="text-neutral-600">/ {wellnessStats.weeklyGoal}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-wellness-calm h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${(wellnessStats.weeklyGoalProgress / wellnessStats.weeklyGoal) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-500">
                  {wellnessStats.weeklyGoal - wellnessStats.weeklyGoalProgress} sessions to go
                </div>
              </div>
            </div>

            {/* Mood Trend */}
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">Mood Trend</h3>
                {moodTrend === 'improving' ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : moodTrend === 'declining' ? (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                ) : (
                  <ArrowRight className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className="space-y-2">
                <div className={`text-lg font-semibold capitalize ${
                  moodTrend === 'improving' ? 'text-green-500' :
                  moodTrend === 'declining' ? 'text-red-500' : 'text-neutral-600'
                }`}>
                  {moodTrend}
                </div>
                <div className="flex space-x-1">
                  {wellnessStats.recentMoods.slice(-7).map((mood, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-gradient-to-t from-wellness-calm to-wellness-mindful rounded-full opacity-70"
                      style={{ height: `${(mood / 10) * 20 + 4}px` }}
                    />
                  ))}
                </div>
                <div className="text-xs text-neutral-500">Last 7 days</div>
              </div>
            </div>
          </motion.div>

          {/* Quick Mood Check-in Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-wellness-growth/10 to-wellness-mindful/10 rounded-2xl p-6 mb-8 border border-wellness-growth/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Heart className="w-6 h-6 text-wellness-growth" />
                <h3 className="font-semibold text-neutral-800">Quick Mood Check-in</h3>
              </div>
              <Timer className="w-5 h-5 text-neutral-500" />
            </div>

            {!showQuickMoodSuccess ? (
              <div className="space-y-4">
                <p className="text-neutral-600">How are you feeling right now?</p>
                <div className="flex space-x-2 justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <motion.button
                      key={rating}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleQuickMoodRating(rating)}
                      className={`w-12 h-12 rounded-full border-2 font-semibold transition-all ${
                        quickMoodRating === rating
                          ? 'bg-wellness-growth text-white border-wellness-growth'
                          : 'border-neutral-300 hover:border-wellness-growth hover:bg-wellness-growth/10'
                      }`}
                    >
                      {rating}
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Very Low</span>
                  <span>Excellent</span>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">Thanks for checking in!</p>
                <p className="text-sm text-neutral-600">Your mood ({quickMoodRating}/10) has been recorded.</p>
              </motion.div>
            )}
          </motion.div>

          {/* Time-based Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-800">{timeRecommendations.title}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {timeRecommendations.suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.1 }}
                  onClick={suggestion.action}
                  className="flex items-center space-x-4 p-4 rounded-xl border-2 border-neutral-100 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-all group"
                >
                  <div className="p-3 rounded-full bg-primary-100 group-hover:bg-primary-200 transition-colors">
                    <suggestion.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-800 group-hover:text-primary-700 transition-colors">
                      {suggestion.name}
                    </h4>
                    <p className="text-sm text-neutral-600">{suggestion.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Quick Wellness Actions
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6" ref={containerRef}>
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="relative"
                >
                  <div 
                    className={`text-center p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${
                      expandedAction === index 
                        ? 'border-wellness-calm shadow-lg bg-wellness-calm/5' 
                        : 'border-neutral-100 hover:border-wellness-calm hover:shadow-md'
                    }`}
                    onClick={() => handleActionClick(index)}
                  >
                    <action.icon className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                      expandedAction === index 
                        ? 'text-wellness-mindful' 
                        : 'text-wellness-calm group-hover:text-wellness-mindful'
                    }`} />
                    <h3 className="font-bold text-lg text-neutral-800 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-4">
                      {action.description}
                    </p>
                    <div className="flex items-center justify-center text-wellness-calm font-semibold hover:text-wellness-mindful transition-colors">
                      <span>{action.action}</span>
                      {expandedAction === index ? (
                        <ChevronUp className="w-4 h-4 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2" />
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedAction === index && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 z-10 mt-2 bg-white rounded-xl shadow-lg border border-neutral-200 p-4"
                      >
                        <div className="space-y-3">
                          {action.options?.map((option, optionIndex) => (
                            <motion.div
                              key={option.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: optionIndex * 0.1 }}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-wellness-calm/10 cursor-pointer transition-colors group/option"
                              onClick={(e) => {
                                e.stopPropagation();
                                option.action();
                                setExpandedAction(null);
                              }}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-neutral-800 group-hover/option:text-wellness-mindful transition-colors">
                                  {option.name}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                  {option.time}
                                </div>
                              </div>
                              <Play className="w-4 h-4 text-wellness-calm opacity-0 group-hover/option:opacity-100 transition-opacity" />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity & Achievements */}
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            
            {/* Recent Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-neutral-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Activity className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-bold text-neutral-800">Recent Activity</h2>
                </div>
                <Link href="/wellness/analytics" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.1 }}
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-neutral-100">
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800">{activity.action}</p>
                      <p className="text-xs text-neutral-500">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
                  <Plus className="w-4 h-4" />
                  <span>Quick Journal Entry</span>
                </button>
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-neutral-800">Achievements</h2>
              </div>
              
              <div className="space-y-4">
                {wellnessStats.achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 + index * 0.1 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      achievement.unlocked 
                        ? 'bg-yellow-50 border border-yellow-200' 
                        : 'bg-neutral-50 border border-neutral-200 opacity-60'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      achievement.unlocked 
                        ? 'bg-yellow-100' 
                        : 'bg-neutral-200'
                    }`}>
                      <achievement.icon className={`w-4 h-4 ${
                        achievement.unlocked 
                          ? 'text-yellow-600' 
                          : 'text-neutral-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        achievement.unlocked 
                          ? 'text-neutral-800' 
                          : 'text-neutral-500'
                      }`}>
                        {achievement.name}
                      </p>
                      {achievement.unlocked && (
                        <p className="text-xs text-yellow-600">Unlocked!</p>
                      )}
                    </div>
                    {achievement.unlocked && (
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    )}
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Progress:</span>
                  <span className="font-medium text-neutral-800">
                    {wellnessStats.achievements.filter(a => a.unlocked).length} / {wellnessStats.achievements.length}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${(wellnessStats.achievements.filter(a => a.unlocked).length / wellnessStats.achievements.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Wellness Tools Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-neutral-800">
                Wellness Tools & Resources
              </h2>
              <div className="flex items-center space-x-2 text-sm text-neutral-600">
                <Bookmark className="w-4 h-4" />
                <span>{favorites.length} favorites</span>
              </div>
            </div>

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4 flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Your Favorites</span>
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wellnessTools
                    .filter(tool => favorites.includes(tool.link.split('/').pop()!))
                    .map((tool, index) => (
                      <motion.div
                        key={`fav-${tool.title}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + index * 0.1 }}
                        className="relative bg-white rounded-2xl shadow-soft border-2 border-yellow-200 overflow-hidden hover:shadow-glow transition-all duration-300 group cursor-pointer"
                        onClick={() => handleToolClick(tool.link)}
                      >
                        <div className="absolute top-3 right-3 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(tool.link.split('/').pop()!);
                            }}
                            className="p-1 rounded-full bg-white shadow-md hover:scale-110 transition-transform"
                          >
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          </button>
                        </div>
                        
                        <div className={`${tool.color} p-4`}>
                          <tool.icon className="w-8 h-8 text-white" />
                        </div>
                        
                        <div className="p-6">
                          <h3 className="font-bold text-xl text-neutral-800 mb-3 group-hover:text-primary-700 transition-colors">
                            {tool.title}
                          </h3>
                          <p className="text-neutral-600 mb-4 group-hover:text-neutral-700 transition-colors">
                            {tool.description}
                          </p>
                          <div className="flex items-center text-primary-600 font-semibold group-hover:text-primary-700 transition-colors">
                            <span>Explore Tool</span>
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            {/* All Tools Section */}
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">
              All Wellness Tools
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool, index) => {
                const toolId = tool.link.split('/').pop()!;
                const isFavorite = favorites.includes(toolId);
                
                return (
                  <motion.div
                    key={tool.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="relative bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden hover:shadow-glow transition-all duration-300 group cursor-pointer"
                    onClick={() => handleToolClick(tool.link)}
                  >
                    {/* Favorite Button */}
                    <div className="absolute top-3 right-3 z-10">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(toolId);
                        }}
                        className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                      >
                        {isFavorite ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        ) : (
                          <Star className="w-4 h-4 text-neutral-400 hover:text-yellow-500 transition-colors" />
                        )}
                      </motion.button>
                    </div>
                    
                    <div className={`${tool.color} p-4`}>
                      <tool.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-xl text-neutral-800 mb-3 group-hover:text-primary-700 transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-neutral-600 mb-4 group-hover:text-neutral-700 transition-colors">
                        {tool.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-primary-600 font-semibold group-hover:text-primary-700 transition-colors">
                          <span>Explore Tool</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                        {isFavorite && (
                          <div className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                            <Bookmark className="w-3 h-3" />
                            <span>Saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    
                    {/* Subtle pulse animation for favorites */}
                    {isFavorite && (
                      <motion.div
                        animate={{ 
                          boxShadow: [
                            '0 0 0 0 rgba(234, 179, 8, 0.4)',
                            '0 0 0 4px rgba(234, 179, 8, 0.1)',
                            '0 0 0 0 rgba(234, 179, 8, 0.4)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Wellness Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-wellness-calm/20 to-wellness-mindful/20 rounded-2xl p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Daily Wellness Tips
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Practice gratitude by writing down 3 things you&apos;re thankful for each day</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Take regular breaks from screens and social media</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Engage in regular physical activity, even if it&apos;s just a short walk</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Maintain a consistent sleep schedule for better mental health</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Connect with friends and family regularly</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Practice mindfulness or meditation for just 5-10 minutes daily</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center">
            <Link 
              href="/"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
