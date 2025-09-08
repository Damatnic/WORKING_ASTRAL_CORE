'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  Brain,
  Moon,
  Coffee,
  Utensils,
  Users,
  CheckCircle,
  TrendingUp,
  Zap,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Eye,
  Smile,
  Frown,
  Meh,
  Plus,
  Minus,
  Star,
  Flame,
  Award,
  Lightbulb,
  BarChart3,
  Target,
  RefreshCw,
  Share2,
  BookOpen,
  MessageSquare,
  Camera,
  Mic,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CheckInResponse {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleep: number | null;
  socialConnection: number | null;
  physicalActivity: number | null;
  nutrition: number | null;
  weather: string;
  location: string;
  gratitude: string[];
  challenges: string;
  wins: string;
  notes: string;
  photos: string[];
  voice_note: string;
  tags: string[];
}

export default function WellnessCheckInPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [showExtendedQuestions, setShowExtendedQuestions] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(7);
  const [longestStreak, setLongestStreak] = useState(23);
  const [totalCheckIns, setTotalCheckIns] = useState(156);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState('sunny');
  const [quickTags, setQuickTags] = useState<string[]>([]);
  
  const [responses, setResponses] = useState<CheckInResponse>({
    mood: null,
    energy: null,
    stress: null,
    sleep: null,
    socialConnection: null,
    physicalActivity: null,
    nutrition: null,
    weather: 'sunny',
    location: '',
    gratitude: ['', '', ''],
    challenges: '',
    wins: '',
    notes: '',
    photos: [],
    voice_note: '',
    tags: []
  });

  // Enhanced questions with context and tips
  const coreQuestions = [
    {
      id: 'mood',
      title: 'How is your mood right now?',
      subtitle: 'Take a moment to check in with your emotional state',
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
      scale: { low: 'Very Down', high: 'Euphoric' },
      tips: [
        'Consider what emotions you\'re feeling beyond just good/bad',
        'Notice if your mood has changed since this morning',
        'Remember that all emotions are valid and temporary'
      ],
      followUp: 'What might be contributing to this mood?'
    },
    {
      id: 'energy',
      title: 'What\'s your energy level?',
      subtitle: 'How energetic and motivated do you feel?',
      icon: Zap,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      scale: { low: 'Completely Drained', high: 'Bursting with Energy' },
      tips: [
        'Energy can be physical, mental, or emotional',
        'Consider your sleep, nutrition, and recent activities',
        'Low energy is normal - be kind to yourself'
      ],
      followUp: 'What usually helps boost your energy?'
    },
    {
      id: 'stress',
      title: 'How stressed are you feeling?',
      subtitle: 'Rate your current stress and tension levels',
      icon: Brain,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      scale: { low: 'Completely Calm', high: 'Extremely Stressed' },
      tips: [
        'Stress can be mental, physical, or emotional',
        'Consider what might be causing stress today',
        'Even small stressors can add up throughout the day'
      ],
      followUp: 'What\'s your biggest stressor right now?'
    },
    {
      id: 'sleep',
      title: 'How well did you sleep?',
      subtitle: 'Rate the quality of your last night\'s sleep',
      icon: Moon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      scale: { low: 'Terrible Sleep', high: 'Amazing Sleep' },
      tips: [
        'Consider both quantity and quality of sleep',
        'Think about how refreshed you felt waking up',
        'Poor sleep affects mood, energy, and stress'
      ],
      followUp: 'What time did you go to bed last night?'
    }
  ];

  const extendedQuestions = [
    {
      id: 'socialConnection',
      title: 'How connected do you feel to others?',
      subtitle: 'Rate your sense of social connection and support',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      scale: { low: 'Very Isolated', high: 'Deeply Connected' },
      tips: [
        'Connection can be quality over quantity',
        'Consider both in-person and digital interactions',
        'Feeling disconnected is common and valid'
      ]
    },
    {
      id: 'physicalActivity',
      title: 'How active have you been?',
      subtitle: 'Rate your physical activity level today',
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      scale: { low: 'Completely Sedentary', high: 'Very Active' },
      tips: [
        'Movement includes walking, stretching, and formal exercise',
        'Any movement is better than none',
        'Consider how activity affects your mood and energy'
      ]
    },
    {
      id: 'nutrition',
      title: 'How well have you nourished yourself?',
      subtitle: 'Rate how well you\'ve eaten and hydrated today',
      icon: Coffee,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      scale: { low: 'Poorly Nourished', high: 'Very Well Nourished' },
      tips: [
        'Consider both food and water intake',
        'Nourishment affects energy and mood significantly',
        'Focus on how food makes you feel, not judgment'
      ]
    }
  ];

  const allQuestions = showExtendedQuestions ? [...coreQuestions, ...extendedQuestions] : coreQuestions;
  const currentQuestion = allQuestions[currentStep];
  const isComplete = currentStep >= allQuestions.length;

  const weatherOptions = [
    { value: 'sunny', icon: Sun, label: 'Sunny', color: 'text-yellow-500' },
    { value: 'cloudy', icon: Cloud, label: 'Cloudy', color: 'text-gray-500' },
    { value: 'rainy', icon: CloudRain, label: 'Rainy', color: 'text-blue-500' },
    { value: 'windy', icon: Wind, label: 'Windy', color: 'text-green-500' }
  ];

  const commonTags = [
    'work', 'family', 'friends', 'exercise', 'meditation', 'nature', 
    'music', 'reading', 'cooking', 'travel', 'learning', 'creative',
    'grateful', 'anxious', 'excited', 'tired', 'productive', 'social'
  ];

  const moodEmojis = [
    { range: [1, 2], emoji: '😞', label: 'Very Low' },
    { range: [3, 4], emoji: '😔', label: 'Low' },
    { range: [5, 6], emoji: '😐', label: 'Neutral' },
    { range: [7, 8], emoji: '🙂', label: 'Good' },
    { range: [9, 10], emoji: '😊', label: 'Excellent' }
  ];

  const getPersonalizedRecommendations = () => {
    const recs = [];
    
    if (responses.mood && responses.mood < 5) {
      recs.push({
        type: 'mood',
        title: 'Mood Boost Activities',
        activities: [
          'Take a 5-minute walk outside',
          'Listen to your favorite uplifting song',
          'Call or text someone who makes you smile',
          'Practice gratitude - list 3 good things from today'
        ],
        icon: Heart,
        color: 'bg-pink-50 text-pink-700'
      });
    }

    if (responses.stress && responses.stress > 7) {
      recs.push({
        type: 'stress',
        title: 'Stress Relief Techniques',
        activities: [
          'Try the 4-7-8 breathing technique',
          'Do a 2-minute body scan meditation',
          'Write down what\'s stressing you',
          'Take 10 deep breaths and release tension'
        ],
        icon: Brain,
        color: 'bg-blue-50 text-blue-700'
      });
    }

    if (responses.energy && responses.energy < 4) {
      recs.push({
        type: 'energy',
        title: 'Energy Boosting Ideas',
        activities: [
          'Drink a glass of water',
          'Do 10 jumping jacks or stretch',
          'Step outside for natural light',
          'Have a healthy snack with protein'
        ],
        icon: Zap,
        color: 'bg-green-50 text-green-700'
      });
    }

    if (responses.sleep && responses.sleep < 5) {
      recs.push({
        type: 'sleep',
        title: 'Better Sleep Tonight',
        activities: [
          'Set a bedtime 1 hour earlier tonight',
          'Avoid screens 30 minutes before bed',
          'Try gentle stretching or meditation',
          'Create a calming bedtime routine'
        ],
        icon: Moon,
        color: 'bg-purple-50 text-purple-700'
      });
    }

    return recs;
  };

  const handleRating = (rating: number) => {
    if (!currentQuestion) return;
    
    setResponses({
      ...responses,
      [currentQuestion.id]: rating
    });
    
    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentStep < allQuestions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setCurrentStep(allQuestions.length); // Move to completion
      }
    }, 1000);
  };

  const handleSubmit = () => {
    // Calculate streak and other metrics
    const newStreak = currentStreak + 1;
    setCurrentStreak(newStreak);
    setTotalCheckIns(totalCheckIns + 1);
    
    // In a real app, this would save to backend
    console.log('Enhanced check-in submitted:', {
      ...responses,
      streak: newStreak,
      timestamp: new Date().toISOString(),
      recommendations: getPersonalizedRecommendations()
    });
    
    router.push('/wellness?checkin=success');
  };

  const getOverallWellness = () => {
    const ratings = Object.values(responses).filter(v => typeof v === 'number') as number[];
    if (ratings.length === 0) return 0;
    
    // Invert stress for overall calculation
    const adjustedRatings = ratings.map((rating, index) => {
      const questionId = Object.keys(responses)[index];
      return questionId === 'stress' ? 11 - rating : rating;
    });
    
    return Math.round(adjustedRatings.reduce((a, b) => a + b, 0) / adjustedRatings.length);
  };

  const getStreakMessage = () => {
    if (currentStreak >= 30) return "🎉 Incredible dedication!";
    if (currentStreak >= 14) return "🔥 You're on fire!";
    if (currentStreak >= 7) return "⭐ Amazing consistency!";
    if (currentStreak >= 3) return "💪 Building momentum!";
    return "🌱 Great start!";
  };

  const toggleTag = (tag: string) => {
    setQuickTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Completion screen with enhanced insights
  if (isComplete) {
    const recommendations = getPersonalizedRecommendations();
    const overallScore = getOverallWellness();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full"
        >
          {/* Header with Streak */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative inline-block mb-4"
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
              {currentStreak >= 7 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center"
                >
                  <Flame className="w-4 h-4" />
                </motion.div>
              )}
            </motion.div>
            
            <h2 className="text-3xl font-bold text-neutral-800 mb-2">Check-in Complete!</h2>
            <p className="text-neutral-600 mb-4">
              {getStreakMessage()} You&apos;ve checked in {currentStreak} days in a row!
            </p>
            
            <div className="flex justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{currentStreak}</div>
                <div className="text-sm text-neutral-600">Current Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{totalCheckIns}</div>
                <div className="text-sm text-neutral-600">Total Check-ins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{overallScore}/10</div>
                <div className="text-sm text-neutral-600">Wellness Score</div>
              </div>
            </div>
          </div>

          {/* Personalized Insights */}
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-neutral-800">Personalized Recommendations</h3>
              </div>
              
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className={`${rec.color} rounded-lg p-4`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <rec.icon className="w-5 h-5" />
                      <h4 className="font-semibold">{rec.title}</h4>
                    </div>
                    <ul className="text-sm space-y-1">
                      {rec.activities.map((activity, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60" />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <div className="space-y-4">
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium text-lg shadow-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Save Check-in & Continue</span>
              </div>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/wellness/analytics')}
                className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 py-3 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Trends</span>
              </button>
              
              <button
                onClick={() => router.push('/wellness/goals')}
                className="flex items-center justify-center space-x-2 bg-purple-100 text-purple-700 py-3 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Target className="w-4 h-4" />
                <span>Set Goals</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              <h1 className="text-3xl font-bold text-neutral-800">Daily Wellness Check-in</h1>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-neutral-600">How are you doing today?</p>
                <div className="flex items-center space-x-2 text-sm">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">{currentStreak} day streak</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowExtendedQuestions(!showExtendedQuestions)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showExtendedQuestions
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {showExtendedQuestions ? 'Quick Mode' : 'Detailed Mode'}
            </button>
            <div className="text-sm text-neutral-500">
              {currentStep + 1} of {allQuestions.length}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Progress Bar */}
        <div className="relative w-full bg-neutral-200 rounded-full h-3 mb-8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / allQuestions.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-500"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm"
          />
        </div>

        {/* Enhanced Question Card */}
        <div className="flex items-center justify-center">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full"
          >
            {/* Question Header */}
            <div className={`${currentQuestion.bgColor} rounded-2xl p-6 text-center mb-8 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
              <currentQuestion.icon className={`w-16 h-16 ${currentQuestion.color} mx-auto mb-4 relative z-10`} />
              <h2 className="text-2xl font-bold text-neutral-800 mb-2 relative z-10">
                {currentQuestion.title}
              </h2>
              <p className="text-neutral-600 relative z-10">
                {currentQuestion.subtitle}
              </p>
            </div>

            {/* Enhanced Rating Scale */}
            <div className="space-y-6">
              <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 10 }).map((_, index) => {
                  const rating = index + 1;
                  const isSelected = responses[currentQuestion.id as keyof CheckInResponse] === rating;
                  const emoji = moodEmojis.find(e => e.range && e.range[0] !== undefined && e.range[1] !== undefined && rating >= e.range[0] && rating <= e.range[1]);
                  
                  return (
                    <motion.button
                      key={rating}
                      onClick={() => handleRating(rating)}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={`aspect-square rounded-2xl font-bold text-lg transition-all relative overflow-hidden ${
                        isSelected
                          ? `${currentQuestion.color.replace('text-', 'bg-')} text-white shadow-xl transform scale-110`
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:scale-105'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 bg-white opacity-20 rounded-2xl"
                        />
                      )}
                      {currentQuestion.id === 'mood' && emoji && rating >= 7 && isSelected ? (
                        <span className="text-2xl">{emoji?.emoji}</span>
                      ) : (
                        <span className="relative z-10">{rating}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-sm text-neutral-500">
                <span className="flex items-center space-x-1">
                  <span>{currentQuestion.scale.low}</span>
                  {currentQuestion.id === 'mood' && <Frown className="w-4 h-4" />}
                </span>
                <span className="flex items-center space-x-1">
                  <span>{currentQuestion.scale.high}</span>
                  {currentQuestion.id === 'mood' && <Smile className="w-4 h-4" />}
                </span>
              </div>
            </div>

            {/* Tips Section */}
            {currentQuestion.tips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-4 bg-neutral-50 rounded-xl"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-semibold text-neutral-800">Quick Tips</h4>
                </div>
                <ul className="space-y-2">
                  {currentQuestion.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-neutral-600">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <div className="flex items-center space-x-2">
                {responses[currentQuestion.id as keyof CheckInResponse] && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center space-x-2 text-green-600"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Answered</span>
                  </motion.div>
                )}
              </div>
              
              <button
                onClick={() => {
                  if (currentStep < allQuestions.length - 1) {
                    setCurrentStep(currentStep + 1);
                  } else {
                    setCurrentStep(allQuestions.length);
                  }
                }}
                disabled={!responses[currentQuestion.id as keyof CheckInResponse]}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <span>{currentStep === allQuestions.length - 1 ? 'Complete' : 'Next'}</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Context Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center mt-8 space-x-8 text-sm text-neutral-500"
        >
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4" />
            <span>Check-in #{totalCheckIns + 1}</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}