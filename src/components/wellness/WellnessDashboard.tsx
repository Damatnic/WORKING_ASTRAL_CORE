/**
 * Advanced Wellness Dashboard - The most comprehensive mental health dashboard
 * Features adaptive layouts, predictive analytics, and therapeutic interventions
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Heart,
  Moon,
  Sun,
  Activity,
  TrendingUp,
  Calendar,
  Users,
  Shield,
  Sparkles,
  ChevronRight,
  Settings,
  Plus,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Target,
  HeartHandshake,
  Pill,
  BookOpen,
  Mic,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, type AuthContextType } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useWebSocket } from '@/hooks/useWebSocket';
import AdaptiveLayout from './AdaptiveLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load heavy components for better performance
const PredictiveAnalytics = lazy(() => import('./PredictiveAnalytics'));
const WellnessMetrics = lazy(() => import('./WellnessMetrics'));
const TherapeuticToolsHub = lazy(() => import('./TherapeuticTools/TherapeuticToolsHub'));
const ProgressVisualization = lazy(() => import('./ProgressVisualization'));
const ProfessionalConnectionHub = lazy(() => import('./ProfessionalConnectionHub'));
const CommunityWellness = lazy(() => import('./CommunityWellness'));

interface WellnessData {
  mood: {
    current: number;
    trend: 'improving' | 'stable' | 'declining';
    dimensions: {
      anxiety: number;
      depression: number;
      stress: number;
      energy: number;
      focus: number;
    };
  };
  sleep: {
    quality: number;
    duration: number;
    consistency: number;
  };
  medications: {
    adherence: number;
    nextDose: Date | null;
    sideEffects: string[];
  };
  activities: {
    completed: number;
    scheduled: number;
    streak: number;
  };
  crisisRisk: 'low' | 'moderate' | 'elevated' | 'high';
  wellnessScore: number;
  recommendations: string[];
}

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: React.ElementType;
  priority: number;
  visible: boolean;
  minimized: boolean;
  gridArea?: string;
}

const WellnessDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth() as any;
  const { track } = useAnalytics();
  // TODO: Fix WebSocket implementation - current hook expects URL parameter
  // const { subscribe, unsubscribe } = useWebSocket();
  
  // Placeholder functions until WebSocket is properly implemented
  const subscribe = (channel: string, callback: (data: any) => void) => {
    console.log(`Would subscribe to ${channel}`);
  };
  
  const unsubscribe = (channel: string) => {
    console.log(`Would unsubscribe from ${channel}`);
  };
  
  const [wellnessData, setWellnessData] = useState<WellnessData | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layoutMode, setLayoutMode] = useState<'adaptive' | 'grid' | 'focus'>('adaptive');
  const [voiceNavigationEnabled, setVoiceNavigationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);

  // Initialize dashboard with personalized layout
  useEffect(() => {
    initializeDashboard();
    setupRealtimeUpdates();
    
    return () => {
      unsubscribe('wellness-update');
      unsubscribe('crisis-alert');
    };
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      // Fetch user's wellness data and preferences
      const [userData, layoutPreferences] = await Promise.all([
        fetchWellnessData(),
        fetchLayoutPreferences()
      ]);
      
      setWellnessData(userData);
      
      // Configure widgets based on user needs and crisis risk
      const configuredWidgets = configureWidgets(userData, layoutPreferences);
      setWidgets(configuredWidgets);
      
      track('wellness_dashboard_loaded', {
        userId: user?.id,
        wellnessScore: userData.wellnessScore,
        crisisRisk: userData.crisisRisk
      });
    } catch (error) {
      console.error('Dashboard initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWellnessData = async (): Promise<WellnessData> => {
    // In production, this would fetch from API
    return {
      mood: {
        current: 7,
        trend: 'improving',
        dimensions: {
          anxiety: 4,
          depression: 3,
          stress: 5,
          energy: 7,
          focus: 6
        }
      },
      sleep: {
        quality: 75,
        duration: 7.5,
        consistency: 80
      },
      medications: {
        adherence: 92,
        nextDose: new Date(Date.now() + 4 * 60 * 60 * 1000),
        sideEffects: []
      },
      activities: {
        completed: 5,
        scheduled: 8,
        streak: 12
      },
      crisisRisk: 'low',
      wellnessScore: 78,
      recommendations: [
        'Continue your meditation practice - it\'s improving your anxiety levels',
        'Your sleep consistency has improved by 15% this week',
        'Consider adding a morning walk to boost energy levels'
      ]
    };
  };

  const fetchLayoutPreferences = async () => {
    // Fetch user's saved layout preferences
    return {
      preferredLayout: 'adaptive',
      widgetOrder: [],
      hiddenWidgets: []
    };
  };

  const configureWidgets = (data: WellnessData, preferences: any): DashboardWidget[] => {
    const baseWidgets: DashboardWidget[] = [
      {
        id: 'wellness-score',
        type: 'score',
        title: 'Wellness Score',
        icon: Heart,
        priority: data.crisisRisk === 'high' ? 2 : 1,
        visible: true,
        minimized: false
      },
      {
        id: 'mood-tracker',
        type: 'mood',
        title: 'Mood Insights',
        icon: Brain,
        priority: 1,
        visible: true,
        minimized: false
      },
      {
        id: 'predictive-analytics',
        type: 'analytics',
        title: 'Wellness Predictions',
        icon: TrendingUp,
        priority: 2,
        visible: true,
        minimized: false
      },
      {
        id: 'therapeutic-tools',
        type: 'tools',
        title: 'Therapeutic Tools',
        icon: Sparkles,
        priority: 1,
        visible: true,
        minimized: false
      },
      {
        id: 'sleep-tracker',
        type: 'sleep',
        title: 'Sleep Quality',
        icon: Moon,
        priority: 3,
        visible: true,
        minimized: false
      },
      {
        id: 'medication-tracker',
        type: 'medication',
        title: 'Medications',
        icon: Pill,
        priority: 2,
        visible: true,
        minimized: false
      },
      {
        id: 'progress-viz',
        type: 'progress',
        title: 'Your Progress',
        icon: BarChart3,
        priority: 2,
        visible: true,
        minimized: false
      },
      {
        id: 'professional-hub',
        type: 'professional',
        title: 'Care Team',
        icon: HeartHandshake,
        priority: 3,
        visible: true,
        minimized: false
      },
      {
        id: 'community',
        type: 'community',
        title: 'Support Network',
        icon: Users,
        priority: 4,
        visible: true,
        minimized: false
      }
    ];

    // Adjust widget priorities based on crisis risk
    if (data.crisisRisk === 'high' || data.crisisRisk === 'elevated') {
      // Prioritize crisis support and professional connection
      baseWidgets.find(w => w.id === 'professional-hub')!.priority = 1;
      baseWidgets.unshift({
        id: 'crisis-support',
        type: 'crisis',
        title: 'Crisis Support',
        icon: Shield,
        priority: 0,
        visible: true,
        minimized: false
      });
    }

    return baseWidgets.sort((a, b) => a.priority - b.priority);
  };

  const setupRealtimeUpdates = () => {
    subscribe('wellness-update', (data: any) => {
      setWellnessData(prev => ({
        ...prev!,
        ...data
      }));
    });

    subscribe('crisis-alert', (data: any) => {
      // Handle crisis alerts with appropriate UI changes
      if (data.severity === 'high') {
        setLayoutMode('focus');
        setSelectedWidget('crisis-support');
      }
    });
  };

  const handleWidgetInteraction = useCallback((widgetId: string, action: string) => {
    track('widget_interaction', {
      widgetId,
      action,
      timestamp: Date.now()
    });

    switch (action) {
      case 'expand':
        setSelectedWidget(widgetId);
        break;
      case 'minimize':
        setWidgets(prev => prev.map(w => 
          w.id === widgetId ? { ...w, minimized: true } : w
        ));
        break;
      case 'hide':
        setWidgets(prev => prev.map(w => 
          w.id === widgetId ? { ...w, visible: false } : w
        ));
        break;
      default:
        break;
    }
  }, [track]);

  const toggleVoiceNavigation = () => {
    setVoiceNavigationEnabled(prev => !prev);
    if (!voiceNavigationEnabled) {
      // Initialize voice navigation
      initializeVoiceCommands();
    }
  };

  const initializeVoiceCommands = () => {
    // Voice navigation setup would go here
    console.log('Voice navigation initialized');
  };

  const renderWellnessScore = () => {
    if (!wellnessData) return null;

    const scoreColor = wellnessData.wellnessScore >= 70 ? 'text-green-600' :
                       wellnessData.wellnessScore >= 50 ? 'text-yellow-600' :
                       'text-red-600';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          p-6 rounded-2xl
          ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'}
          backdrop-blur-lg border
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          shadow-xl
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Wellness Score
          </h3>
          <motion.div
            className={`text-3xl font-bold ${scoreColor}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {wellnessData.wellnessScore}
          </motion.div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Trend</span>
            <span className={`
              flex items-center gap-1
              ${wellnessData.mood.trend === 'improving' ? 'text-green-500' :
                wellnessData.mood.trend === 'stable' ? 'text-yellow-500' :
                'text-red-500'}
            `}>
              <TrendingUp className="w-4 h-4" />
              {wellnessData.mood.trend}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Activities</span>
            <span className="text-blue-500">
              {wellnessData.activities.completed}/{wellnessData.activities.scheduled}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Streak</span>
            <span className="text-purple-500 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {wellnessData.activities.streak} days
            </span>
          </div>
        </div>

        {wellnessData.crisisRisk !== 'low' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              mt-4 p-3 rounded-lg
              ${wellnessData.crisisRisk === 'high' ? 'bg-red-500/20 border-red-500' :
                wellnessData.crisisRisk === 'elevated' ? 'bg-orange-500/20 border-orange-500' :
                'bg-yellow-500/20 border-yellow-500'}
              border
            `}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Crisis Risk: {wellnessData.crisisRisk}
              </span>
            </div>
            <button
              className="mt-2 text-sm underline hover:no-underline"
              onClick={() => handleWidgetInteraction('crisis-support', 'expand')}
            >
              Get Support Now
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const renderInsights = () => {
    if (!wellnessData || !showInsights) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          p-6 rounded-2xl mb-6
          ${theme === 'dark' ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30' : 
            'bg-gradient-to-r from-purple-100 to-blue-100'}
          backdrop-blur-lg border
          ${theme === 'dark' ? 'border-purple-700/30' : 'border-purple-200'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Insights & Recommendations
          </h3>
          <button
            onClick={() => setShowInsights(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {wellnessData.recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{rec}</p>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            mt-4 px-4 py-2 rounded-lg w-full
            ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 
              'bg-purple-500 hover:bg-purple-600'}
            text-white font-medium flex items-center justify-center gap-2
          `}
        >
          <Brain className="w-4 h-4" />
          View Detailed Analysis
        </motion.button>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`
      min-h-screen p-4 md:p-6 lg:p-8
      ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}
    `}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name || 'Friend'}
            </h1>
            <p className="text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleVoiceNavigation}
              className={`
                p-3 rounded-lg
                ${voiceNavigationEnabled ? 
                  'bg-blue-500 text-white' : 
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                shadow-lg
              `}
              aria-label="Toggle voice navigation"
            >
              <Mic className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                p-3 rounded-lg
                ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                shadow-lg
              `}
              aria-label="Dashboard settings"
            >
              <Settings className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2
                bg-gradient-to-r from-blue-500 to-purple-600
                text-white font-medium shadow-lg
              `}
            >
              <Plus className="w-4 h-4" />
              Quick Entry
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* AI Insights */}
      {renderInsights()}

      {/* Dashboard Layout */}
      <AdaptiveLayout
        mode={layoutMode}
        widgets={widgets}
        wellnessData={wellnessData}
        onLayoutChange={setLayoutMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Wellness Score Card */}
          {widgets.find(w => w.id === 'wellness-score')?.visible && renderWellnessScore()}

          {/* Dynamic Widget Rendering */}
          <AnimatePresence>
            {widgets.filter(w => w.visible).map(widget => (
              <motion.div
                key={widget.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={widget.minimized ? 'md:col-span-1' : 'md:col-span-2 lg:col-span-2'}
              >
                <>
                  {widget.type === 'mood' && <WellnessMetrics data={wellnessData} />}
                  {widget.type === 'analytics' && <PredictiveAnalytics data={wellnessData} />}
                  {widget.type === 'tools' && <TherapeuticToolsHub />}
                  {widget.type === 'progress' && <ProgressVisualization data={wellnessData} />}
                  {widget.type === 'professional' && <ProfessionalConnectionHub />}
                  {widget.type === 'community' && <CommunityWellness />}
                </>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AdaptiveLayout>

      {/* Floating Action Button for Crisis Support */}
      {wellnessData?.crisisRisk !== 'low' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-red-500 text-white shadow-2xl z-50"
          onClick={() => handleWidgetInteraction('crisis-support', 'expand')}
        >
          <Shield className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
};

export default WellnessDashboard;