/**
 * WellnessMetrics - Comprehensive wellness tracking component
 * Tracks mood, sleep, medications, symptoms, habits, and energy levels
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Heart,
  Moon,
  Sun,
  Battery,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertCircle,
  CheckCircle,
  Plus,
  Calendar,
  Clock,
  Pill,
  Droplets,
  Wind,
  Zap,
  Cloud,
  CloudRain,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadarController,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadarController,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WellnessMetricsProps {
  data: any;
  onUpdate?: (metrics: any) => void;
}

interface MoodEntry {
  timestamp: Date;
  overall: number;
  dimensions: {
    anxiety: number;
    depression: number;
    stress: number;
    energy: number;
    focus: number;
    irritability: number;
    motivation: number;
    social: number;
  };
  triggers?: string[];
  notes?: string;
  weather?: string;
}

interface SleepEntry {
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  quality: number;
  duration: number;
  interruptions: number;
  dreams: boolean;
  notes?: string;
}

interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  taken: boolean;
  time?: Date;
  sideEffects?: string[];
}

interface SymptomEntry {
  id: string;
  name: string;
  severity: number;
  timestamp: Date;
  duration?: number;
  notes?: string;
}

interface HabitEntry {
  id: string;
  name: string;
  category: 'wellness' | 'exercise' | 'nutrition' | 'social' | 'mindfulness';
  completed: boolean;
  streak: number;
  bestStreak: number;
  completionRate: number;
}

const WellnessMetrics: React.FC<WellnessMetricsProps> = ({ data, onUpdate }: WellnessMetricsProps) => {
  const [activeTab, setActiveTab] = useState<'mood' | 'sleep' | 'medication' | 'symptoms' | 'habits'>('mood');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodEntry | null>(null);
  const [recentSleep, setRecentSleep] = useState<SleepEntry[]>([]);
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [phq9Score, setPhq9Score] = useState<number | null>(null);
  const [gad7Score, setGad7Score] = useState<number | null>(null);

  useEffect(() => {
    // Load initial data
    loadMetricsData();
  }, []);

  const loadMetricsData = async () => {
    // In production, fetch from API
    setCurrentMood({
      timestamp: new Date(),
      overall: data?.mood?.current || 7,
      dimensions: data?.mood?.dimensions || {
        anxiety: 4,
        depression: 3,
        stress: 5,
        energy: 7,
        focus: 6,
        irritability: 3,
        motivation: 7,
        social: 6
      }
    });

    setMedications([
      {
        id: '1',
        name: 'Sertraline',
        dosage: '50mg',
        frequency: 'Daily',
        taken: true,
        time: new Date()
      },
      {
        id: '2',
        name: 'Vitamin D',
        dosage: '2000 IU',
        frequency: 'Daily',
        taken: false
      }
    ]);

    setHabits([
      {
        id: '1',
        name: 'Morning Meditation',
        category: 'mindfulness',
        completed: true,
        streak: 12,
        bestStreak: 30,
        completionRate: 85
      },
      {
        id: '2',
        name: 'Exercise',
        category: 'exercise',
        completed: false,
        streak: 3,
        bestStreak: 15,
        completionRate: 65
      },
      {
        id: '3',
        name: 'Journaling',
        category: 'wellness',
        completed: true,
        streak: 7,
        bestStreak: 21,
        completionRate: 78
      }
    ]);
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return <Smile className="w-6 h-6 text-green-500" />;
    if (score >= 5) return <Meh className="w-6 h-6 text-yellow-500" />;
    return <Frown className="w-6 h-6 text-red-500" />;
  };

  const getWeatherIcon = (weather?: string) => {
    switch (weather) {
      case 'sunny':
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-4 h-4 text-gray-500" />;
      case 'rainy':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMoodTracking = () => {
    if (!currentMood) return null;

    // Prepare radar chart data for mood dimensions
    const radarData = {
      labels: ['Anxiety', 'Depression', 'Stress', 'Energy', 'Focus', 'Irritability', 'Motivation', 'Social'],
      datasets: [{
        label: 'Current',
        data: Object.values(currentMood.dimensions),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
      }]
    };

    const radarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 10,
          ticks: {
            stepSize: 2
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    };

    return (
      <div className="space-y-6">
        {/* Overall Mood */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Current Mood
            </h4>
            <div className="flex items-center gap-4">
              {getMoodEmoji(currentMood.overall)}
              <span className="text-2xl font-bold text-purple-600">
                {currentMood.overall}/10
              </span>
            </div>
          </div>

          {/* Quick Mood Selector */}
          <div className="flex justify-between mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentMood({ ...currentMood, overall: value })}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentMood.overall === value
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
                `}
              >
                {value}
              </motion.button>
            ))}
          </div>

          {/* Mood Dimensions Radar Chart */}
          <div className="h-64">
            <Radar data={radarData} options={radarOptions} />
          </div>

          {/* Dimension Sliders */}
          <div className="mt-6 space-y-3">
            {Object.entries(currentMood.dimensions).map(([dimension, value]) => (
              <div key={dimension} className="flex items-center gap-4">
                <span className="w-24 text-sm capitalize">{dimension}</span>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCurrentMood({
                        ...currentMood,
                        dimensions: {
                          ...currentMood.dimensions,
                          [dimension]: parseInt(e.target.value)
                        }
                      });
                    }}
                    className="w-full"
                  />
                </div>
                <span className="w-8 text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Quick Tags */}
          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">What influenced your mood?</p>
            <div className="flex flex-wrap gap-2">
              {['Work', 'Family', 'Sleep', 'Exercise', 'Weather', 'Social', 'Health', 'Finances'].map(tag => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    px-3 py-1 rounded-full text-sm
                    ${currentMood.triggers?.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
                  `}
                  onClick={() => {
                    const triggers = currentMood.triggers || [];
                    if (triggers.includes(tag)) {
                      setCurrentMood({
                        ...currentMood,
                        triggers: triggers.filter(t => t !== tag)
                      });
                    } else {
                      setCurrentMood({
                        ...currentMood,
                        triggers: [...triggers, tag]
                      });
                    }
                  }}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <textarea
              placeholder="Any additional notes about your mood..."
              className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 resize-none"
              rows={3}
              value={currentMood.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentMood({ ...currentMood, notes: e.target.value })}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg"
          >
            Save Mood Entry
          </motion.button>
        </div>

        {/* PHQ-9 and GAD-7 Assessments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              PHQ-9 Depression Screen
            </h4>
            {phq9Score !== null ? (
              <div>
                <p className="text-3xl font-bold text-blue-600">{phq9Score}/27</p>
                <p className="text-sm text-gray-500 mt-1">
                  {phq9Score < 5 ? 'Minimal' :
                   phq9Score < 10 ? 'Mild' :
                   phq9Score < 15 ? 'Moderate' :
                   phq9Score < 20 ? 'Moderately Severe' : 'Severe'}
                </p>
                <button className="mt-3 text-sm text-blue-500 underline">Retake Assessment</button>
              </div>
            ) : (
              <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                Take Assessment
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-500" />
              GAD-7 Anxiety Screen
            </h4>
            {gad7Score !== null ? (
              <div>
                <p className="text-3xl font-bold text-purple-600">{gad7Score}/21</p>
                <p className="text-sm text-gray-500 mt-1">
                  {gad7Score < 5 ? 'Minimal' :
                   gad7Score < 10 ? 'Mild' :
                   gad7Score < 15 ? 'Moderate' : 'Severe'}
                </p>
                <button className="mt-3 text-sm text-purple-500 underline">Retake Assessment</button>
              </div>
            ) : (
              <button className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                Take Assessment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSleepTracking = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-500" />
          Sleep Quality Tracker
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">
              {data?.sleep?.duration || 7.5}h
            </p>
            <p className="text-sm text-gray-500">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {data?.sleep?.quality || 75}%
            </p>
            <p className="text-sm text-gray-500">Quality</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {data?.sleep?.consistency || 80}%
            </p>
            <p className="text-sm text-gray-500">Consistency</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Bedtime</label>
            <input
              type="time"
              className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Wake Time</label>
            <input
              type="time"
              className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Sleep Quality</label>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full mt-1"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-medium rounded-lg"
        >
          Log Sleep
        </motion.button>
      </div>
    </div>
  );

  const renderMedicationTracking = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Pill className="w-5 h-5 text-green-500" />
          Medication Management
        </h4>

        <div className="mb-4">
          <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="font-medium">Adherence Rate</span>
            <span className="text-2xl font-bold text-green-600">
              {data?.medications?.adherence || 92}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {medications.map(med => (
            <div
              key={med.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div>
                <h5 className="font-semibold">{med.name}</h5>
                <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
              </div>
              <div className="flex items-center gap-2">
                {med.taken ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                  >
                    Take Now
                  </motion.button>
                )}
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium rounded-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </motion.button>
      </div>
    </div>
  );

  const renderHabitTracking = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Habit Tracker
        </h4>

        <div className="space-y-3">
          {habits.map(habit => (
            <div
              key={habit.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={habit.completed}
                    onChange={() => {
                      setHabits(habits.map(h => 
                        h.id === habit.id ? { ...h, completed: !h.completed } : h
                      ));
                    }}
                    className="w-5 h-5"
                  />
                  <div>
                    <h5 className="font-semibold">{habit.name}</h5>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500">
                        Streak: {habit.streak} days
                      </span>
                      <span className="text-sm text-gray-500">
                        Best: {habit.bestStreak} days
                      </span>
                      <span className="text-sm text-gray-500">
                        {habit.completionRate}% completion
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 ml-8">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                      style={{ width: `${habit.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Habit
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'mood', label: 'Mood', icon: Brain },
          { id: 'sleep', label: 'Sleep', icon: Moon },
          { id: 'medication', label: 'Medication', icon: Pill },
          { id: 'symptoms', label: 'Symptoms', icon: Activity },
          { id: 'habits', label: 'Habits', icon: Zap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-all
              ${activeTab === tab.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-500 text-blue-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'mood' && renderMoodTracking()}
            {activeTab === 'sleep' && renderSleepTracking()}
            {activeTab === 'medication' && renderMedicationTracking()}
            {activeTab === 'habits' && renderHabitTracking()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WellnessMetrics;