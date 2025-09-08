/**
 * ProgressVisualization - Beautiful, meaningful progress tracking and visualization
 * Shows wellness journey with inspiring charts and milestone celebrations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Award,
  Target,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Trophy,
  Star,
  Zap,
  Heart,
  CheckCircle,
  Clock,
  Activity,
  Sparkles
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import * as confetti from 'canvas-confetti';

interface ProgressVisualizationProps {
  data: any;
  onMilestoneReached?: (milestone: any) => void;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  achieved: boolean;
  achievedDate?: Date;
  progress: number;
  reward?: string;
}

const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({ data, onMilestoneReached }: ProgressVisualizationProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeChart, setActiveChart] = useState<'line' | 'bar' | 'radar'>('line');

  useEffect(() => {
    loadMilestones();
    checkForNewMilestones();
  }, [data]);

  const loadMilestones = () => {
    setMilestones([
      {
        id: '1',
        title: '7-Day Streak',
        description: 'Log your mood for 7 consecutive days',
        icon: Zap,
        achieved: true,
        achievedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        progress: 100,
        reward: 'Streak Master Badge'
      },
      {
        id: '2',
        title: 'Meditation Marathon',
        description: 'Complete 30 meditation sessions',
        icon: Heart,
        achieved: false,
        progress: 73,
        reward: 'Zen Badge'
      },
      {
        id: '3',
        title: 'Wellness Warrior',
        description: 'Maintain wellness score above 70 for 2 weeks',
        icon: Trophy,
        achieved: false,
        progress: 85,
        reward: 'Warrior Badge'
      },
      {
        id: '4',
        title: 'Sleep Champion',
        description: 'Achieve 80% sleep quality for 10 nights',
        icon: Star,
        achieved: true,
        achievedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        progress: 100,
        reward: 'Sleep Champion Badge'
      }
    ]);
  };

  const checkForNewMilestones = () => {
    // Check if any new milestones are achieved
    const newlyAchieved = milestones.filter(m => !m.achieved && m.progress >= 100);
    if (newlyAchieved.length > 0 && newlyAchieved[0]) {
      celebrateMilestone(newlyAchieved[0]);
    }
  };

  const celebrateMilestone = (milestone: Milestone) => {
    setShowCelebration(true);
    confetti.default({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    onMilestoneReached?.(milestone);
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const progressData = useMemo(() => {
    const labels = selectedPeriod === 'week' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : selectedPeriod === 'month'
      ? Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      labels,
      datasets: [
        {
          label: 'Wellness Score',
          data: labels.map(() => Math.floor(Math.random() * 30) + 70),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Mood',
          data: labels.map(() => Math.floor(Math.random() * 4) + 6),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4
        }
      ]
    };
  }, [selectedPeriod]);

  const radarData = {
    labels: ['Sleep', 'Exercise', 'Nutrition', 'Mindfulness', 'Social', 'Productivity'],
    datasets: [{
      label: 'Current',
      data: [75, 60, 70, 85, 65, 80],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2
    },
    {
      label: 'Goal',
      data: [90, 80, 85, 90, 75, 85],
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Your Progress
          </h3>
          <div className="flex gap-2">
            {['week', 'month', 'year'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`
                  px-3 py-1 rounded-lg text-sm font-medium transition-all
                  ${selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
                `}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Chart Selection */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'line', icon: LineChart, label: 'Trends' },
            { id: 'bar', icon: BarChart3, label: 'Compare' },
            { id: 'radar', icon: Activity, label: 'Balance' }
          ].map(chart => (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id as any)}
              className={`
                flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all
                ${activeChart === chart.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
              `}
            >
              <chart.icon className="w-4 h-4" />
              {chart.label}
            </button>
          ))}
        </div>

        {/* Chart Display */}
        <div className="h-64 mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChart}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              {activeChart === 'line' && <Line data={progressData} options={chartOptions} />}
              {activeChart === 'bar' && <Bar data={progressData} options={chartOptions} />}
              {activeChart === 'radar' && <Radar data={radarData} options={chartOptions} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Current Streak', value: '12 days', icon: Zap, color: 'text-orange-500' },
            { label: 'Total Sessions', value: '156', icon: Activity, color: 'text-blue-500' },
            { label: 'Avg. Wellness', value: '78%', icon: Heart, color: 'text-pink-500' },
            { label: 'Goals Met', value: '23/30', icon: Target, color: 'text-green-500' }
          ].map(stat => (
            <div key={stat.label} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Milestones & Achievements
          </h4>
          <div className="space-y-3">
            {milestones.map(milestone => {
              const Icon = milestone.icon;
              return (
                <motion.div
                  key={milestone.id}
                  whileHover={{ scale: 1.01 }}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${milestone.achieved
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${milestone.achieved
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-semibold">{milestone.title}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {milestone.description}
                        </p>
                        {milestone.achievedDate && (
                          <p className="text-xs text-green-600 mt-1">
                            Achieved {milestone.achievedDate.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {milestone.achieved ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <div>
                          <p className="text-sm font-medium mb-1">{milestone.progress}%</p>
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
                              style={{ width: `${milestone.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-center mb-2">Milestone Achieved!</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">Keep up the great work!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgressVisualization;