'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Star,
  Edit3,
  Trash2,
  Flag,
  Activity,
  Heart,
  Brain,
  Moon,
  Users,
  Share2,
  MessageCircle,
  Award,
  BarChart3,
  Zap,
  Timer,
  Repeat,
  AlertCircle,
  BookOpen,
  Lightbulb,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default function WellnessGoalsPage() {
  const [activeTab, setActiveTab] = useState('goals');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSMARTGuide, setShowSMARTGuide] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'mindfulness',
    frequency: 'daily',
    target: 1,
    unit: 'session',
    isSpecific: false,
    isMeasurable: false,
    isAchievable: false,
    isRelevant: false,
    isTimeBound: false,
    deadline: '',
    whyImportant: ''
  });
  const [newHabit, setNewHabit] = useState({
    name: '',
    trigger: '',
    reward: '',
    difficulty: 'easy',
    category: 'mindfulness'
  });
  const [habits, setHabits] = useState([
    {
      id: 1,
      name: 'Morning Meditation',
      trigger: 'After I wake up',
      reward: 'Feel calm and centered',
      difficulty: 'easy',
      category: 'mindfulness',
      streak: 12,
      completedToday: true,
      totalCompletions: 45
    },
    {
      id: 2,
      name: 'Evening Gratitude',
      trigger: 'Before I go to bed',
      reward: 'Sense of appreciation',
      difficulty: 'easy',
      category: 'mood',
      streak: 8,
      completedToday: false,
      totalCompletions: 23
    }
  ]);
  const [socialGoals, setSocialGoals] = useState([
    {
      id: 1,
      title: 'Mindful Community Challenge',
      description: 'Join 50+ people in a 21-day mindfulness journey',
      participants: 47,
      category: 'mindfulness',
      progress: 14,
      target: 21,
      joined: true
    },
    {
      id: 2,
      title: 'Sleep Accountability Group',
      description: 'Commit to better sleep habits with your wellness buddy',
      participants: 12,
      category: 'sleep',
      progress: 5,
      target: 30,
      joined: false
    }
  ]);

  const [goals, setGoals] = useState([
    {
      id: 1,
      title: 'Daily Mindfulness',
      description: 'Practice mindfulness meditation for at least 10 minutes each day',
      category: 'mindfulness',
      frequency: 'daily',
      target: 1,
      unit: 'session',
      progress: 12,
      totalDays: 14,
      streak: 5,
      isActive: true,
      createdAt: '2024-12-01',
      smartScore: 4,
      whyImportant: 'To reduce stress and improve focus for better work-life balance',
      milestones: [
        { days: 7, name: 'First Week', achieved: true },
        { days: 21, name: 'Habit Formation', achieved: false },
        { days: 30, name: 'One Month Strong', achieved: false }
      ]
    },
    {
      id: 2,
      title: 'Mood Tracking',
      description: 'Record my mood and energy levels twice daily',
      category: 'mood',
      frequency: 'daily',
      target: 2,
      unit: 'check-in',
      progress: 8,
      totalDays: 7,
      streak: 3,
      isActive: true,
      createdAt: '2024-12-08',
      smartScore: 3
    },
    {
      id: 3,
      title: 'Quality Sleep',
      description: 'Get 7-8 hours of sleep each night',
      category: 'sleep',
      frequency: 'daily',
      target: 7,
      unit: 'hours',
      progress: 4,
      totalDays: 7,
      streak: 2,
      isActive: true,
      createdAt: '2024-12-10',
      smartScore: 4,
      deadline: '2025-01-10'
    },
    {
      id: 4,
      title: 'Weekly Reflection',
      description: 'Complete a comprehensive weekly wellness review',
      category: 'reflection',
      frequency: 'weekly',
      target: 1,
      unit: 'session',
      progress: 3,
      totalDays: 4,
      streak: 1,
      isActive: false,
      completedAt: '2024-11-30',
      smartScore: 5
    }
  ]);

  const smartCriteria = [
    { key: 'isSpecific', label: 'Specific', description: 'Clear and well-defined', icon: Target },
    { key: 'isMeasurable', label: 'Measurable', description: 'Quantifiable progress', icon: BarChart3 },
    { key: 'isAchievable', label: 'Achievable', description: 'Realistic and attainable', icon: CheckCircle },
    { key: 'isRelevant', label: 'Relevant', description: 'Meaningful to your wellness', icon: Heart },
    { key: 'isTimeBound', label: 'Time-bound', description: 'Has a clear deadline', icon: Calendar }
  ];

  const categories = [
    { id: 'mindfulness', name: 'Mindfulness', icon: Brain, color: 'text-purple-500' },
    { id: 'mood', name: 'Mood', icon: Heart, color: 'text-pink-500' },
    { id: 'exercise', name: 'Exercise', icon: Activity, color: 'text-green-500' },
    { id: 'sleep', name: 'Sleep', icon: Moon, color: 'text-blue-500' },
    { id: 'habit', name: 'Habit', icon: Target, color: 'text-orange-500' },
    { id: 'nutrition', name: 'Nutrition', icon: Heart, color: 'text-red-500' },
    { id: 'social', name: 'Social', icon: Users, color: 'text-indigo-500' }
  ];

  const activeGoals = goals.filter(goal => goal.isActive);
  const completedGoals = goals.filter(goal => !goal.isActive);

  const handleCreateGoal = () => {
    const smartScore = Object.values({
      isSpecific: newGoal.isSpecific,
      isMeasurable: newGoal.isMeasurable,
      isAchievable: newGoal.isAchievable,
      isRelevant: newGoal.isRelevant,
      isTimeBound: newGoal.isTimeBound
    }).filter(Boolean).length;

    const goal = {
      id: Date.now(),
      ...newGoal,
      progress: 0,
      totalDays: 1,
      streak: 0,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      smartScore,
      milestones: generateMilestones(newGoal.target, newGoal.frequency),
      accountabilityPartner: null
    } as any;
    
    setGoals([...goals, goal]);
    resetNewGoal();
    setShowCreateForm(false);
  };

  const resetNewGoal = () => {
    setNewGoal({
      title: '',
      description: '',
      category: 'mindfulness',
      frequency: 'daily',
      target: 1,
      unit: 'session',
      isSpecific: false,
      isMeasurable: false,
      isAchievable: false,
      isRelevant: false,
      isTimeBound: false,
      deadline: '',
      whyImportant: ''
    });
  };

  const generateMilestones = (target: number, frequency: string) => {
    const milestones = [];
    if (frequency === 'daily') {
      milestones.push(
        { days: 7, name: 'First Week', achieved: false },
        { days: 21, name: 'Habit Formation', achieved: false },
        { days: 30, name: 'One Month Strong', achieved: false },
        { days: 90, name: 'Quarter Champion', achieved: false }
      );
    }
    return milestones;
  };

  const handleCreateHabit = () => {
    const habit = {
      id: Date.now(),
      ...newHabit,
      streak: 0,
      completedToday: false,
      totalCompletions: 0
    };
    setHabits([...habits, habit]);
    setNewHabit({
      name: '',
      trigger: '',
      reward: '',
      difficulty: 'easy',
      category: 'mindfulness'
    });
    setShowHabits(false);
  };

  const toggleHabitCompletion = (habitId: number) => {
    setHabits(habits.map(habit => {
      if (habit.id === habitId) {
        const wasCompleted = habit.completedToday;
        return {
          ...habit,
          completedToday: !wasCompleted,
          streak: !wasCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1),
          totalCompletions: !wasCompleted ? habit.totalCompletions + 1 : habit.totalCompletions - 1
        };
      }
      return habit;
    }));
  };

  const joinSocialGoal = (goalId: number) => {
    setSocialGoals(socialGoals.map(goal => 
      goal.id === goalId ? { ...goal, joined: !goal.joined } : goal
    ));
  };

  const getProgressPercentage = (goal: any) => {
    return Math.min((goal.progress / goal.totalDays) * 100, 100);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category || categories[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-neutral-800">Wellness Goals & Habits</h1>
              <p className="text-neutral-600 mt-1">SMART goals, habit formation, and social accountability</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSMARTGuide(true)}
              className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">SMART Guide</span>
            </button>
            <motion.button
              onClick={() => setShowCreateForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Goal</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Target className="w-8 h-8 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold text-neutral-800">{activeGoals.length}</div>
                <div className="text-sm text-neutral-600">Active Goals</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-neutral-800">{completedGoals.length}</div>
                <div className="text-sm text-neutral-600">Completed</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-neutral-800">
                  {Math.round(activeGoals.reduce((acc, goal) => acc + getProgressPercentage(goal), 0) / activeGoals.length || 0)}%
                </div>
                <div className="text-sm text-neutral-600">Avg Progress</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-200"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-neutral-800">
                  {Math.max(...activeGoals.map(g => g.streak), 0)}
                </div>
                <div className="text-sm text-neutral-600">Best Streak</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center space-x-1 bg-neutral-100 rounded-xl p-1 mb-8 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'goals'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>SMART Goals</span>
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'habits'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Habits</span>
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'social'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Social</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
          </button>
        </div>

        {/* SMART Goals View */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            {activeGoals.map((goal, index) => {
              const category = getCategoryIcon(goal.category) || categories[0];
              const progressPercentage = getProgressPercentage(goal);
              const smartScore = goal.smartScore || 0;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full bg-neutral-100`}>
                        {category && <category.icon className={`w-6 h-6 ${category.color}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-neutral-800">{goal.title}</h3>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < smartScore ? 'text-yellow-500 fill-current' : 'text-neutral-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-neutral-500 ml-1">SMART</span>
                          </div>
                        </div>
                        <p className="text-neutral-600 mb-4">{goal.description}</p>
                        
                        {goal.whyImportant && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start space-x-2">
                              <Heart className="w-4 h-4 text-blue-500 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-blue-800">Why this matters:</div>
                                <div className="text-sm text-blue-600">{goal.whyImportant}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-neutral-500" />
                            <span className="text-neutral-600 capitalize">{goal.frequency}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-neutral-500" />
                            <span className="text-neutral-600">{goal.target} {goal.unit}/{goal.frequency}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Flag className="w-4 h-4 text-neutral-500" />
                            <span className="text-neutral-600">{goal.streak} day streak</span>
                          </div>
                          {goal.deadline && (
                            <div className="flex items-center space-x-2">
                              <Timer className="w-4 h-4 text-neutral-500" />
                              <span className="text-neutral-600">Due {new Date(goal.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                        <Share2 className="w-4 h-4 text-neutral-600" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                        <Edit3 className="w-4 h-4 text-neutral-600" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4 text-neutral-600" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Progress</span>
                      <span className="font-medium text-neutral-800">
                        {goal.progress}/{goal.totalDays} days ({Math.round(progressPercentage)}%)
                      </span>
                    </div>
                    
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-2 rounded-full bg-gradient-to-r ${
                          progressPercentage >= 80 ? 'from-green-400 to-green-500' :
                          progressPercentage >= 60 ? 'from-yellow-400 to-yellow-500' :
                          'from-blue-400 to-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-neutral-800 mb-3">Milestones</h4>
                      <div className="flex space-x-4 overflow-x-auto">
                        {goal.milestones.map((milestone: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex-shrink-0 text-center p-2 rounded-lg ${
                              milestone.achieved
                                ? 'bg-green-100 text-green-700'
                                : goal.progress >= milestone.days
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            <div className="text-xs font-medium">{milestone.name}</div>
                            <div className="text-xs">{milestone.days} days</div>
                            {milestone.achieved && <Award className="w-3 h-3 mx-auto mt-1" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Habits View */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-neutral-800">Daily Habits</h2>
                <p className="text-neutral-600 text-sm">Build lasting changes through small, consistent actions</p>
              </div>
              <button
                onClick={() => setShowHabits(true)}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Habit</span>
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {habits.map((habit) => {
                const category = getCategoryIcon(habit.category) || categories[0];
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-neutral-100">
                          {category && <category.icon className={`w-5 h-5 ${category.color}`} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-800">{habit.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-neutral-600 mt-1">
                            <Zap className="w-3 h-3" />
                            <span>{habit.streak} day streak</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleHabitCompletion(habit.id)}
                        className={`p-2 rounded-full transition-colors ${
                          habit.completedToday
                            ? 'bg-green-100 text-green-600'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-green-50 hover:text-green-600'
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-neutral-700">Trigger: </span>
                        <span className="text-neutral-600">{habit.trigger}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-700">Reward: </span>
                        <span className="text-neutral-600">{habit.reward}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Total completions</span>
                        <span className="font-medium text-neutral-800">{habit.totalCompletions}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Social Goals View */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Social Accountability</h2>
              <p className="text-neutral-600">Join community challenges and find accountability partners</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {socialGoals.map((goal) => {
                const category = getCategoryIcon(goal.category) || categories[0];
                const progressPercentage = (goal.progress / goal.target) * 100;
                
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-neutral-100">
                          {category && <category.icon className={`w-5 h-5 ${category.color}`} />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-neutral-800 mb-1">{goal.title}</h3>
                          <p className="text-sm text-neutral-600 mb-2">{goal.description}</p>
                          <div className="flex items-center space-x-3 text-xs text-neutral-500">
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{goal.participants} participants</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Day {goal.progress}/{goal.target}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => joinSocialGoal(goal.id)}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        goal.joined
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      {goal.joined ? 'Leave Challenge' : 'Join Challenge'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {activeTab === 'completed' && (
        <div className="space-y-6">
          {completedGoals.map((goal, index) => {
            const category = getCategoryIcon(goal.category) || categories[0];
            const progressPercentage = getProgressPercentage(goal);
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-green-200 p-6 opacity-75"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-neutral-800 mb-2">{goal.title}</h3>
                      <p className="text-neutral-600 mb-4">{goal.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-600">Completed {goal.completedAt}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-600">{goal.streak} day final streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800">Goal Achieved! 🎉</div>
                  <div className="text-xs text-green-600">Completed all requirements successfully</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}

        {/* Create Goal Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-neutral-800 mb-6">Create SMART Goal</h2>
                
                <div className="space-y-6">
                  {/* SMART Goal Criteria */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-blue-800 mb-3">SMART Goal Framework</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {smartCriteria.map((criterion) => (
                        <label key={criterion.key} className="flex flex-col items-center text-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newGoal[criterion.key as keyof typeof newGoal] as boolean}
                            onChange={(e) => setNewGoal({...newGoal, [criterion.key]: e.target.checked})}
                            className="mb-1"
                          />
                          <criterion.icon className="w-4 h-4 text-blue-600 mb-1" />
                          <span className="text-xs font-medium text-blue-700">{criterion.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Goal Title *
                    </label>
                    <input
                      type="text"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                      placeholder="e.g., Practice 10 minutes of daily meditation"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                      placeholder="Describe exactly what you want to achieve and how you'll measure success"
                      rows={3}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Why is this important to you?
                    </label>
                    <textarea
                      value={newGoal.whyImportant}
                      onChange={(e) => setNewGoal({...newGoal, whyImportant: e.target.value})}
                      placeholder="Connect this goal to your deeper values and motivations"
                      rows={2}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Category
                      </label>
                      <select
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={newGoal.frequency}
                        onChange={(e) => setNewGoal({...newGoal, frequency: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Target Amount *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newGoal.target}
                        onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Unit
                      </label>
                      <select
                        value={newGoal.unit}
                        onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="session">session</option>
                        <option value="minute">minute</option>
                        <option value="hour">hour</option>
                        <option value="check-in">check-in</option>
                        <option value="entry">entry</option>
                        <option value="page">page</option>
                        <option value="step">step</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Target Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* SMART Score Display */}
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">SMART Score</span>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }, (_, i) => {
                          const smartScore = Object.values({
                            isSpecific: newGoal.isSpecific,
                            isMeasurable: newGoal.isMeasurable,
                            isAchievable: newGoal.isAchievable,
                            isRelevant: newGoal.isRelevant,
                            isTimeBound: newGoal.isTimeBound
                          }).filter(Boolean).length;
                          return (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < smartScore ? 'text-yellow-500 fill-current' : 'text-neutral-300'
                              }`}
                            />
                          );
                        })}
                        <span className="text-sm text-neutral-600 ml-2">
                          {Object.values({
                            isSpecific: newGoal.isSpecific,
                            isMeasurable: newGoal.isMeasurable,
                            isAchievable: newGoal.isAchievable,
                            isRelevant: newGoal.isRelevant,
                            isTimeBound: newGoal.isTimeBound
                          }).filter(Boolean).length}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-3 px-4 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={!newGoal.title.trim()}
                    className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    Create Goal
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}  
        </AnimatePresence>

        {/* SMART Guide Modal */}
        <AnimatePresence>
          {showSMARTGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowSMARTGuide(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-neutral-800 mb-6">SMART Goals Framework</h2>
                
                <div className="space-y-6">
                  {smartCriteria.map((criterion) => (
                    <div key={criterion.key} className="flex items-start space-x-4">
                      <div className="p-3 rounded-full bg-blue-100">
                        <criterion.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-800 mb-1">{criterion.label}</h3>
                        <p className="text-neutral-600 text-sm">{criterion.description}</p>
                        <div className="mt-2">
                          {criterion.key === 'isSpecific' && (
                            <p className="text-xs text-neutral-500">
                              Example: &quot;Practice mindfulness meditation for 10 minutes&quot; instead of &quot;Be more mindful&quot;
                            </p>
                          )}
                          {criterion.key === 'isMeasurable' && (
                            <p className="text-xs text-neutral-500">
                              Example: &quot;Read 20 pages per day&quot; instead of &quot;Read more books&quot;
                            </p>
                          )}
                          {criterion.key === 'isAchievable' && (
                            <p className="text-xs text-neutral-500">
                              Example: Start with 5 minutes daily instead of jumping to 60 minutes
                            </p>
                          )}
                          {criterion.key === 'isRelevant' && (
                            <p className="text-xs text-neutral-500">
                              Example: Choose goals that align with your personal values and life situation
                            </p>
                          )}
                          {criterion.key === 'isTimeBound' && (
                            <p className="text-xs text-neutral-500">
                              Example: &quot;Complete within 30 days&quot; instead of &quot;someday&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setShowSMARTGuide(false)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Got it!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}  
        </AnimatePresence>

        {/* Add Habit Modal */}
        <AnimatePresence>
          {showHabits && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowHabits(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
              >
                <h2 className="text-2xl font-bold text-neutral-800 mb-6">Create New Habit</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Habit Name
                    </label>
                    <input
                      type="text"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                      placeholder="e.g., Morning meditation"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Trigger (When will you do this?)
                    </label>
                    <input
                      type="text"
                      value={newHabit.trigger}
                      onChange={(e) => setNewHabit({...newHabit, trigger: e.target.value})}
                      placeholder="e.g., After I wake up"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Reward (How will you feel after?)
                    </label>
                    <input
                      type="text"
                      value={newHabit.reward}
                      onChange={(e) => setNewHabit({...newHabit, reward: e.target.value})}
                      placeholder="e.g., Feel calm and centered"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Category
                      </label>
                      <select
                        value={newHabit.category}
                        onChange={(e) => setNewHabit({...newHabit, category: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={newHabit.difficulty}
                        onChange={(e) => setNewHabit({...newHabit, difficulty: e.target.value})}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="easy">Easy (1-2 mins)</option>
                        <option value="medium">Medium (5-10 mins)</option>
                        <option value="hard">Hard (15+ mins)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setShowHabits(false)}
                    className="flex-1 py-3 px-4 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateHabit}
                    disabled={!newHabit.name.trim()}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Create Habit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}  
        </AnimatePresence>

      </div>
    </div>
  );
}