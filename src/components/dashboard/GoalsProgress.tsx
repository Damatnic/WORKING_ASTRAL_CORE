'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Plus,
  Edit3,
  ArrowRight,
  Star,
  Award
} from 'lucide-react';
import Link from 'next/link';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'mental-health' | 'wellness' | 'social' | 'personal';
  progress: number;
  target: number;
  unit: string;
  deadline?: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  milestones: Array<{
    title: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

interface GoalsProgressProps {
  className?: string;
}

export default function GoalsProgress({ className = "" }: GoalsProgressProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Sample goals data - in production, this would come from user's actual goals
  const goals: Goal[] = [
    {
      id: '1',
      title: 'Daily Mood Tracking',
      description: 'Track mood consistently for 30 days',
      category: 'mental-health',
      progress: 23,
      target: 30,
      unit: 'days',
      deadline: '2024-02-01',
      isCompleted: false,
      priority: 'high',
      milestones: [
        { title: 'Track for 7 days', completed: true, completedAt: '2024-01-08' },
        { title: 'Track for 14 days', completed: true, completedAt: '2024-01-15' },
        { title: 'Track for 21 days', completed: true, completedAt: '2024-01-22' },
        { title: 'Complete 30 days', completed: false }
      ]
    },
    {
      id: '2',
      title: 'Meditation Practice',
      description: 'Meditate for at least 10 minutes daily',
      category: 'wellness',
      progress: 8,
      target: 21,
      unit: 'sessions',
      deadline: '2024-01-31',
      isCompleted: false,
      priority: 'medium',
      milestones: [
        { title: 'Complete first session', completed: true, completedAt: '2024-01-02' },
        { title: 'Complete 7 sessions', completed: true, completedAt: '2024-01-09' },
        { title: 'Complete 14 sessions', completed: false },
        { title: 'Complete 21 sessions', completed: false }
      ]
    },
    {
      id: '3',
      title: 'Connect with Support Group',
      description: 'Participate in community discussions',
      category: 'social',
      progress: 5,
      target: 10,
      unit: 'posts',
      deadline: '2024-01-25',
      isCompleted: false,
      priority: 'medium',
      milestones: [
        { title: 'First post', completed: true, completedAt: '2024-01-03' },
        { title: '5 posts', completed: true, completedAt: '2024-01-20' },
        { title: '10 posts', completed: false }
      ]
    },
    {
      id: '4',
      title: 'Sleep Schedule',
      description: 'Maintain consistent bedtime for 2 weeks',
      category: 'wellness',
      progress: 14,
      target: 14,
      unit: 'nights',
      isCompleted: true,
      priority: 'high',
      milestones: [
        { title: '3 nights', completed: true, completedAt: '2024-01-05' },
        { title: '7 nights', completed: true, completedAt: '2024-01-09' },
        { title: '14 nights', completed: true, completedAt: '2024-01-16' }
      ]
    }
  ];

  const activeGoals = goals.filter(goal => !goal.isCompleted);
  const completedGoals = goals.filter(goal => goal.isCompleted);

  const getCategoryColor = (category: Goal['category']) => {
    switch (category) {
      case 'mental-health': return 'bg-primary-100 text-primary-700';
      case 'wellness': return 'bg-wellness-mindful/20 text-wellness-mindful';
      case 'social': return 'bg-green-100 text-green-700';
      case 'personal': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const completedCount = goals.filter(g => g.isCompleted).length;
  const totalProgress = goals.reduce((sum, goal) => sum + (goal.progress / goal.target), 0) / goals.length;

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-primary-100 rounded-lg p-2 mr-3">
            <Target className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Goals & Progress</h2>
            <p className="text-sm text-neutral-600">{completedCount} of {goals.length} goals completed</p>
          </div>
        </div>
        <Link href="/wellness/goals">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Goal
          </motion.button>
        </Link>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary-700">Overall Progress</span>
          <span className="text-sm font-bold text-primary-800">{Math.round(totalProgress * 100)}%</span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress * 100}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="bg-primary-500 h-2 rounded-full"
          />
        </div>
        <p className="text-xs text-primary-600 mt-2">Keep up the great work!</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'active' 
              ? 'bg-white text-neutral-800 shadow-sm' 
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Active ({activeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'completed' 
              ? 'bg-white text-neutral-800 shadow-sm' 
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Completed ({completedGoals.length})
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {(activeTab === 'active' ? activeGoals : completedGoals).slice(0, 3).map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border-2 ${getPriorityColor(goal.priority)} transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="font-semibold text-neutral-800 mr-2">{goal.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                    {goal.category.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mb-2">{goal.description}</p>
                
                {/* Progress */}
                <div className="flex items-center mb-2">
                  <div className="flex-1 bg-neutral-200 rounded-full h-2 mr-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(goal.progress / goal.target) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                      className={`h-2 rounded-full ${
                        goal.isCompleted ? 'bg-green-500' : 'bg-primary-500'
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-neutral-700">
                    {goal.progress}/{goal.target} {goal.unit}
                  </span>
                </div>

                {/* Deadline */}
                {goal.deadline && !goal.isCompleted && (
                  <div className="flex items-center text-xs text-neutral-600">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>
                      {(() => {
                        const days = getDaysUntilDeadline(goal.deadline);
                        if (days === null) return '';
                        if (days < 0) return 'Overdue';
                        if (days === 0) return 'Due today';
                        if (days === 1) return 'Due tomorrow';
                        return `${days} days left`;
                      })()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center ml-4">
                {goal.isCompleted ? (
                  <div className="flex items-center text-green-600">
                    <Award className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium">Complete!</span>
                  </div>
                ) : (
                  <button className="text-neutral-400 hover:text-neutral-600 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="flex space-x-2">
              {goal.milestones.map((milestone, mIndex) => (
                <div
                  key={mIndex}
                  className={`flex-1 h-1 rounded-full ${
                    milestone.completed ? 'bg-green-500' : 'bg-neutral-200'
                  }`}
                  title={milestone.title}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All */}
      <div className="mt-4 text-center">
        <Link href="/wellness/goals" className="group inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
          View all goals
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}