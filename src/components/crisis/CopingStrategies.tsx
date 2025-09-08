'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon,
  BeakerIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  UserGroupIcon,
  BookOpenIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  FireIcon,
  CloudIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  CheckCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface CopingStrategy {
  id: string;
  name: string;
  category: 'breathing' | 'grounding' | 'physical' | 'creative' | 'social' | 'mindfulness' | 'distraction';
  description: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string[];
  benefits: string[];
  isFavorite: boolean;
  timesUsed: number;
  lastUsed?: Date;
}

interface CopingStrategiesProps {
  className?: string;
}

const categoryConfig = {
  breathing: {
    name: 'Breathing Exercises',
    icon: CloudIcon,
    color: 'bg-blue-100 text-blue-600',
    description: 'Regulate your nervous system through controlled breathing'
  },
  grounding: {
    name: 'Grounding Techniques',
    icon: SunIcon,
    color: 'bg-green-100 text-green-600',
    description: 'Connect with the present moment using your senses'
  },
  physical: {
    name: 'Physical Activities',
    icon: FireIcon,
    color: 'bg-red-100 text-red-600',
    description: 'Release tension and endorphins through movement'
  },
  creative: {
    name: 'Creative Expression',
    icon: PaintBrushIcon,
    color: 'bg-purple-100 text-purple-600',
    description: 'Process emotions through artistic activities'
  },
  social: {
    name: 'Social Connection',
    icon: UserGroupIcon,
    color: 'bg-pink-100 text-pink-600',
    description: 'Reach out to others for support and connection'
  },
  mindfulness: {
    name: 'Mindfulness & Meditation',
    icon: SparklesIcon,
    color: 'bg-indigo-100 text-indigo-600',
    description: 'Practice awareness and acceptance of the present moment'
  },
  distraction: {
    name: 'Healthy Distractions',
    icon: BeakerIcon,
    color: 'bg-yellow-100 text-yellow-600',
    description: 'Redirect your focus to positive activities'
  }
};

const defaultStrategies: CopingStrategy[] = [
  // Breathing Exercises
  {
    id: '1',
    name: '4-7-8 Breathing',
    category: 'breathing',
    description: 'A calming breath pattern that activates your relaxation response',
    duration: '2-5 minutes',
    difficulty: 'easy',
    instructions: [
      'Sit comfortably with your back straight',
      'Exhale completely through your mouth',
      'Inhale through your nose for 4 counts',
      'Hold your breath for 7 counts',
      'Exhale through your mouth for 8 counts',
      'Repeat 3-4 times'
    ],
    benefits: ['Reduces anxiety', 'Promotes sleep', 'Lowers heart rate'],
    isFavorite: false,
    timesUsed: 0
  },
  {
    id: '2',
    name: 'Box Breathing',
    category: 'breathing',
    description: 'Equal count breathing to balance your nervous system',
    duration: '2-10 minutes',
    difficulty: 'easy',
    instructions: [
      'Inhale for 4 counts',
      'Hold for 4 counts',
      'Exhale for 4 counts',
      'Hold for 4 counts',
      'Repeat the cycle'
    ],
    benefits: ['Improves focus', 'Reduces stress', 'Balances nervous system'],
    isFavorite: false,
    timesUsed: 0
  },
  // Grounding Techniques
  {
    id: '3',
    name: '5-4-3-2-1 Technique',
    category: 'grounding',
    description: 'Use all five senses to ground yourself in the present',
    duration: '3-5 minutes',
    difficulty: 'easy',
    instructions: [
      'Notice 5 things you can see',
      'Notice 4 things you can touch',
      'Notice 3 things you can hear',
      'Notice 2 things you can smell',
      'Notice 1 thing you can taste'
    ],
    benefits: ['Reduces anxiety', 'Increases present-moment awareness', 'Stops rumination'],
    isFavorite: false,
    timesUsed: 0
  },
  {
    id: '4',
    name: 'Cold Water Technique',
    category: 'grounding',
    description: 'Use cold water to activate your dive response and calm anxiety',
    duration: '1-3 minutes',
    difficulty: 'easy',
    instructions: [
      'Fill a bowl with cold water',
      'Splash cold water on your face',
      'Hold cold water in your hands',
      'Or hold ice cubes for 30 seconds',
      'Focus on the cold sensation'
    ],
    benefits: ['Quick anxiety relief', 'Activates vagus nerve', 'Grounds in body'],
    isFavorite: false,
    timesUsed: 0
  },
  // Physical Activities
  {
    id: '5',
    name: 'Progressive Muscle Relaxation',
    category: 'physical',
    description: 'Systematically tense and relax different muscle groups',
    duration: '10-20 minutes',
    difficulty: 'medium',
    instructions: [
      'Start with your toes and feet',
      'Tense muscles for 5 seconds',
      'Release and notice the relaxation',
      'Move up through each muscle group',
      'Finish with your face and scalp'
    ],
    benefits: ['Releases physical tension', 'Improves body awareness', 'Promotes sleep'],
    isFavorite: false,
    timesUsed: 0
  },
  {
    id: '6',
    name: 'Quick Exercise Burst',
    category: 'physical',
    description: 'Short burst of physical activity to release endorphins',
    duration: '2-10 minutes',
    difficulty: 'medium',
    instructions: [
      'Do jumping jacks for 30 seconds',
      'Try push-ups or wall push-ups',
      'Do a quick walk around the block',
      'Dance to your favorite song',
      'Do stretching or yoga poses'
    ],
    benefits: ['Releases endorphins', 'Reduces stress hormones', 'Improves mood'],
    isFavorite: false,
    timesUsed: 0
  },
  // Creative Expression
  {
    id: '7',
    name: 'Emotion Drawing',
    category: 'creative',
    description: 'Express your feelings through colors, shapes, and lines',
    duration: '5-20 minutes',
    difficulty: 'easy',
    instructions: [
      'Get paper and drawing materials',
      'Don\'t think about creating art',
      'Use colors that match your mood',
      'Draw shapes, lines, or scribbles',
      'Let your emotions flow onto paper'
    ],
    benefits: ['Processes emotions', 'Provides creative outlet', 'Reduces rumination'],
    isFavorite: false,
    timesUsed: 0
  },
  // Mindfulness
  {
    id: '8',
    name: 'Body Scan Meditation',
    category: 'mindfulness',
    description: 'Systematic awareness of physical sensations throughout your body',
    duration: '5-20 minutes',
    difficulty: 'medium',
    instructions: [
      'Lie down or sit comfortably',
      'Close your eyes and breathe naturally',
      'Start at the top of your head',
      'Notice sensations in each body part',
      'Move slowly down to your toes',
      'Don\'t judge, just observe'
    ],
    benefits: ['Increases body awareness', 'Promotes relaxation', 'Develops mindfulness'],
    isFavorite: false,
    timesUsed: 0
  },
  // Social Connection
  {
    id: '9',
    name: 'Reach Out to Someone',
    category: 'social',
    description: 'Connect with a trusted friend, family member, or support person',
    duration: '10-30 minutes',
    difficulty: 'medium',
    instructions: [
      'Think of someone who cares about you',
      'Call, text, or video chat with them',
      'Share how you\'re feeling if comfortable',
      'Ask about their day too',
      'Focus on the connection'
    ],
    benefits: ['Reduces isolation', 'Provides support', 'Improves mood'],
    isFavorite: false,
    timesUsed: 0
  },
  // Healthy Distractions
  {
    id: '10',
    name: 'Puzzle or Brain Game',
    category: 'distraction',
    description: 'Engage your mind with puzzles, games, or mental challenges',
    duration: '5-30 minutes',
    difficulty: 'easy',
    instructions: [
      'Choose a puzzle or brain game app',
      'Try crosswords, sudoku, or word games',
      'Play a video game you enjoy',
      'Do a jigsaw puzzle',
      'Focus fully on the task'
    ],
    benefits: ['Redirects anxious thoughts', 'Provides sense of accomplishment', 'Improves focus'],
    isFavorite: false,
    timesUsed: 0
  }
];

export default function CopingStrategies({ className = "" }: CopingStrategiesProps) {
  const [strategies, setStrategies] = useState<CopingStrategy[]>(defaultStrategies);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeStrategy, setActiveStrategy] = useState<CopingStrategy | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('coping-strategies');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const strategiesWithDates = parsed.map((strategy: any) => ({
          ...strategy,
          lastUsed: strategy.lastUsed ? new Date(strategy.lastUsed) : undefined
        }));
        setStrategies(strategiesWithDates);
      } catch (error) {
        console.error('Error loading coping strategies:', error);
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(seconds => seconds + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const saveStrategies = (updatedStrategies: CopingStrategy[]) => {
    setStrategies(updatedStrategies);
    localStorage.setItem('coping-strategies', JSON.stringify(updatedStrategies));
  };

  const toggleFavorite = (strategyId: string) => {
    const updated = strategies.map(strategy =>
      strategy.id === strategyId
        ? { ...strategy, isFavorite: !strategy.isFavorite }
        : strategy
    );
    saveStrategies(updated);
  };

  const markAsUsed = (strategyId: string) => {
    const updated = strategies.map(strategy =>
      strategy.id === strategyId
        ? { 
            ...strategy, 
            timesUsed: strategy.timesUsed + 1,
            lastUsed: new Date()
          }
        : strategy
    );
    saveStrategies(updated);
  };

  const startTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (activeStrategy) {
      markAsUsed(activeStrategy.id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredStrategies = strategies.filter(strategy => {
    const matchesCategory = selectedCategory === 'all' || strategy.category === selectedCategory;
    const matchesSearch = strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const favoriteStrategies = strategies.filter(s => s.isFavorite);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <HeartIcon className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">Coping Strategies</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover and practice healthy ways to manage difficult emotions and stressful situations
        </p>
      </div>

      {/* Quick Access - Favorites */}
      {favoriteStrategies.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center space-x-2 mb-4">
            <StarIcon className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-yellow-900">Your Favorites</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteStrategies.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => setActiveStrategy(strategy)}
                className="text-left p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 hover:shadow-sm transition-colors"
              >
                <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{strategy.duration}</p>
                {strategy.lastUsed && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Last used: {strategy.lastUsed.toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.name}</option>
          ))}
        </select>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const categoryCount = strategies.filter(s => s.category === key).length;
          const IconComponent = config.icon;
          
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedCategory === key
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-600">{categoryCount} strategies</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredStrategies.map((strategy) => {
            const categoryInfo = categoryConfig[strategy.category];
            const IconComponent = categoryInfo.icon;
            
            return (
              <motion.div
                key={strategy.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <button
                      onClick={() => toggleFavorite(strategy.id)}
                      className={`p-1 rounded transition-colors ${
                        strategy.isFavorite
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-300 hover:text-yellow-500'
                      }`}
                    >
                      <StarIcon className={`w-5 h-5 ${strategy.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{strategy.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{strategy.description}</p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{strategy.duration}</span>
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      strategy.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : strategy.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {strategy.difficulty}
                    </span>
                  </div>

                  {strategy.timesUsed > 0 && (
                    <div className="text-sm text-gray-500 mb-4">
                      Used {strategy.timesUsed} times
                      {strategy.lastUsed && (
                        <span className="block">
                          Last: {strategy.lastUsed.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setActiveStrategy(strategy)}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try This Strategy
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredStrategies.length === 0 && (
        <div className="text-center py-12">
          <HeartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
          <p className="text-gray-600">
            Try adjusting your search or category filter
          </p>
        </div>
      )}

      {/* Strategy Detail Modal */}
      <AnimatePresence>
        {activeStrategy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setActiveStrategy(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${categoryConfig[activeStrategy.category].color}`}>
                      {(() => {
                        const IconComponent = categoryConfig[activeStrategy.category].icon;
                        return <IconComponent className="w-6 h-6" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{activeStrategy.name}</h2>
                      <p className="text-gray-600">{activeStrategy.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span>{activeStrategy.duration}</span>
                        <span className="capitalize">{activeStrategy.difficulty} difficulty</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(activeStrategy.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      activeStrategy.isFavorite
                        ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                        : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'
                    }`}
                  >
                    <StarIcon className={`w-6 h-6 ${activeStrategy.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Timer */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-mono text-gray-900">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="flex space-x-2">
                      {!isTimerRunning ? (
                        <button
                          onClick={startTimer}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <PlayIcon className="w-4 h-4" />
                          <span>Start</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopTimer}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <PauseIcon className="w-4 h-4" />
                          <span>Complete</span>
                        </button>
                      )}
                      <button
                        onClick={() => setTimerSeconds(0)}
                        className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
                    <ol className="space-y-2">
                      {activeStrategy.instructions.map((instruction, index) => (
                        <li key={index} className="flex space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {activeStrategy.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}