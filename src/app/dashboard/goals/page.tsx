"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Plus, 
  Edit, 
  Trash, 
  Check,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Star,
  Clock,
  Flag
} from 'lucide-react';
import Link from 'next/link';

export default function GoalsPage() {
  const [goals, setGoals] = useState([
    {
      id: '1',
      title: 'Practice Daily Mindfulness',
      description: 'Meditate for at least 10 minutes every day',
      category: 'Mindfulness',
      targetValue: 30,
      currentValue: 22,
      unit: 'days',
      priority: 'high',
      deadline: '2024-02-15',
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'Weekly Therapy Sessions',
      description: 'Attend AI therapy sessions consistently',
      category: 'Therapy',
      targetValue: 4,
      currentValue: 3,
      unit: 'sessions',
      priority: 'high',
      deadline: '2024-01-31',
      status: 'active',
      createdAt: '2024-01-01'
    },
    {
      id: '3',
      title: 'Mood Tracking Consistency',
      description: 'Log mood daily for better self-awareness',
      category: 'Wellness',
      targetValue: 30,
      currentValue: 18,
      unit: 'entries',
      priority: 'medium',
      deadline: '2024-02-01',
      status: 'active',
      createdAt: '2024-01-10'
    },
    {
      id: '4',
      title: 'Social Connection',
      description: 'Engage with community support groups',
      category: 'Community',
      targetValue: 8,
      currentValue: 8,
      unit: 'interactions',
      priority: 'medium',
      deadline: '2024-01-31',
      status: 'completed',
      createdAt: '2024-01-05'
    },
    {
      id: '5',
      title: 'Sleep Hygiene',
      description: 'Maintain consistent sleep schedule',
      category: 'Health',
      targetValue: 21,
      currentValue: 12,
      unit: 'good nights',
      priority: 'low',
      deadline: '2024-02-10',
      status: 'active',
      createdAt: '2024-01-20'
    }
  ]);

  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: '',
    targetValue: 0,
    unit: '',
    priority: 'medium',
    deadline: ''
  });

  const categories = ['Mindfulness', 'Therapy', 'Wellness', 'Community', 'Health', 'Personal Growth'];
  const priorities = ['low', 'medium', 'high'];

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Mindfulness': return 'bg-purple-100 text-purple-800';
      case 'Therapy': return 'bg-blue-100 text-blue-800';
      case 'Wellness': return 'bg-green-100 text-green-800';
      case 'Community': return 'bg-orange-100 text-orange-800';
      case 'Health': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateGoal = () => {
    if (newGoal.title && newGoal.targetValue > 0) {
      const goal = {
        id: Date.now().toString(),
        ...newGoal,
        currentValue: 0,
        status: 'active' as const,
        createdAt: new Date().toISOString().split('T')[0] || new Date().toISOString()
      };
      setGoals([...goals, goal]);
      setNewGoal({
        title: '',
        description: '',
        category: '',
        targetValue: 0,
        unit: '',
        priority: 'medium',
        deadline: ''
      });
      setShowNewGoalForm(false);
    }
  };

  const updateGoalProgress = (goalId: string, increment: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { 
            ...goal, 
            currentValue: Math.max(0, Math.min(goal.targetValue, goal.currentValue + increment)),
            status: (goal.currentValue + increment >= goal.targetValue) ? 'completed' as const : goal.status
          }
        : goal
    ));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId));
  };

  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-growth/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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
                <div className="bg-wellness-growth rounded-full p-3 mr-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-800">Wellness Goals</h1>
                  <p className="text-neutral-600">Track and achieve your mental health objectives</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowNewGoalForm(true)}
              className="flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Goal
            </button>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-primary-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">{goals.length}</div>
                  <div className="text-sm text-neutral-600">Total Goals</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">{activeGoals.length}</div>
                  <div className="text-sm text-neutral-600">Active</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <Star className="w-8 h-8 text-yellow-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">{completedGoals.length}</div>
                  <div className="text-sm text-neutral-600">Completed</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <Flag className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">
                    {Math.round(goals.reduce((sum, goal) => sum + getProgressPercentage(goal.currentValue, goal.targetValue), 0) / goals.length)}%
                  </div>
                  <div className="text-sm text-neutral-600">Avg Progress</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* New Goal Form */}
          {showNewGoalForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
            >
              <h3 className="text-xl font-bold text-neutral-800 mb-6">Create New Goal</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Goal Title</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e: any) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="Enter goal title..."
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e: any) => setNewGoal({...newGoal, category: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Target Value</label>
                  <input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e: any) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={newGoal.unit}
                    onChange={(e: any) => setNewGoal({...newGoal, unit: e.target.value})}
                    placeholder="days, sessions, etc."
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Priority</label>
                  <select
                    value={newGoal.priority}
                    onChange={(e: any) => setNewGoal({...newGoal, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e: any) => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewGoal({...newGoal, description: e.target.value})}
                  placeholder="Describe your goal..."
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleCreateGoal}
                  className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Create Goal
                </button>
                <button
                  onClick={() => setShowNewGoalForm(false)}
                  className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Active Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-neutral-800 mb-6">Active Goals</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {activeGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-800 mb-2">{goal.title}</h3>
                      <p className="text-neutral-600 text-sm mb-3">{goal.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                          {goal.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority} priority
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => updateGoalProgress(goal.id, 1)}
                        className="p-1 text-green-600 hover:text-green-700 transition-colors"
                        title="Increment progress"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1 text-red-600 hover:text-red-700 transition-colors"
                        title="Delete goal"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-neutral-600">Progress</span>
                      <span className="text-sm font-medium text-neutral-800">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(goal.currentValue, goal.targetValue)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-primary-600 font-medium mt-1">
                      {Math.round(getProgressPercentage(goal.currentValue, goal.targetValue))}% complete
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{getDaysRemaining(goal.deadline)} days left</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Created {goal.createdAt}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">Completed Goals</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {completedGoals.map((goal, index) => (
                  <div key={goal.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-neutral-800">{goal.title}</h3>
                    </div>
                    <p className="text-neutral-600 text-sm mb-2">{goal.description}</p>
                    <div className="text-xs text-green-600 font-medium">
                      Completed {goal.targetValue} {goal.unit}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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