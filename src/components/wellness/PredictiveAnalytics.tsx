/**
 * PredictiveAnalytics - AI-powered wellness predictions and insights
 * Provides early warning systems and personalized recommendations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Shield,
  Sparkles,
  Activity,
  Info,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

interface PredictiveAnalyticsProps {
  data: any;
  onInsightAction?: (action: string, data: any) => void;
}

interface Prediction {
  id: string;
  type: 'mood' | 'crisis' | 'wellness' | 'symptom';
  title: string;
  probability: number;
  timeframe: string;
  confidence: number;
  factors: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  trend: 'improving' | 'stable' | 'declining';
  significance: number;
  correlations: Array<{
    factor: string;
    strength: number;
    impact: 'positive' | 'negative';
  }>;
}

interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  actionable: boolean;
  priority: number;
  evidence: string[];
  suggestedActions: string[];
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ data, onInsightAction }: PredictiveAnalyticsProps) => {
  const [activeView, setActiveView] = useState<'predictions' | 'patterns' | 'insights'>('predictions');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [wellnessTrajectory, setWellnessTrajectory] = useState<'improving' | 'stable' | 'declining'>('stable');

  useEffect(() => {
    // Generate predictions based on current data
    generatePredictions();
    identifyPatterns();
    generateInsights();
    calculateRiskScore();
  }, [data]);

  const generatePredictions = () => {
    // AI-based prediction generation (simulated)
    const newPredictions: Prediction[] = [
      {
        id: '1',
        type: 'mood',
        title: 'Mood Improvement Expected',
        probability: 78,
        timeframe: 'Next 7 days',
        confidence: 85,
        factors: ['Consistent sleep pattern', 'Regular exercise', 'Medication adherence'],
        recommendations: [
          'Continue current sleep schedule',
          'Maintain exercise routine',
          'Consider adding morning meditation'
        ],
        severity: 'low'
      },
      {
        id: '2',
        type: 'crisis',
        title: 'Low Crisis Risk',
        probability: 15,
        timeframe: 'Next 24-48 hours',
        confidence: 92,
        factors: ['Stable mood patterns', 'Strong support network', 'Active coping strategies'],
        recommendations: [
          'Keep crisis plan accessible',
          'Stay connected with support network',
          'Monitor for early warning signs'
        ],
        severity: 'low'
      },
      {
        id: '3',
        type: 'wellness',
        title: 'Energy Dip Likely',
        probability: 65,
        timeframe: 'Tomorrow afternoon',
        confidence: 70,
        factors: ['Historical pattern', 'Scheduled activities', 'Sleep debt'],
        recommendations: [
          'Plan a short rest period',
          'Prepare healthy snacks',
          'Consider rescheduling demanding tasks'
        ],
        severity: 'medium'
      },
      {
        id: '4',
        type: 'symptom',
        title: 'Anxiety Spike Risk',
        probability: 45,
        timeframe: 'Next 3 days',
        confidence: 75,
        factors: ['Upcoming deadlines', 'Social events planned', 'Stress accumulation'],
        recommendations: [
          'Practice breathing exercises',
          'Break tasks into smaller steps',
          'Schedule downtime between events'
        ],
        severity: 'medium'
      }
    ];
    
    setPredictions(newPredictions);
  };

  const identifyPatterns = () => {
    const newPatterns: Pattern[] = [
      {
        id: '1',
        name: 'Weekend Recovery Pattern',
        description: 'Your mood consistently improves on weekends',
        trend: 'improving',
        significance: 0.85,
        correlations: [
          { factor: 'Work stress', strength: 0.8, impact: 'negative' },
          { factor: 'Social activities', strength: 0.7, impact: 'positive' },
          { factor: 'Sleep duration', strength: 0.6, impact: 'positive' }
        ]
      },
      {
        id: '2',
        name: 'Exercise-Mood Connection',
        description: 'Physical activity strongly correlates with mood improvement',
        trend: 'improving',
        significance: 0.9,
        correlations: [
          { factor: 'Exercise frequency', strength: 0.85, impact: 'positive' },
          { factor: 'Outdoor time', strength: 0.65, impact: 'positive' },
          { factor: 'Energy levels', strength: 0.75, impact: 'positive' }
        ]
      },
      {
        id: '3',
        name: 'Evening Anxiety Pattern',
        description: 'Anxiety tends to increase in the evening hours',
        trend: 'stable',
        significance: 0.7,
        correlations: [
          { factor: 'Screen time', strength: 0.6, impact: 'negative' },
          { factor: 'Caffeine intake', strength: 0.5, impact: 'negative' },
          { factor: 'Evening routine', strength: 0.7, impact: 'positive' }
        ]
      }
    ];
    
    setPatterns(newPatterns);
  };

  const generateInsights = () => {
    const newInsights: Insight[] = [
      {
        id: '1',
        category: 'Sleep',
        title: 'Optimal Sleep Window Identified',
        description: 'Going to bed between 10:30-11:00 PM results in best mood scores',
        actionable: true,
        priority: 1,
        evidence: [
          '15% better mood when sleeping 10:30-11:00 PM',
          'Consistent 7-8 hour sleep duration',
          'Fewer morning anxiety episodes'
        ],
        suggestedActions: [
          'Set bedtime reminder for 10:15 PM',
          'Create wind-down routine starting at 9:30 PM',
          'Avoid screens after 10:00 PM'
        ]
      },
      {
        id: '2',
        category: 'Activity',
        title: 'Morning Exercise Boost',
        description: 'Morning workouts lead to 25% better focus throughout the day',
        actionable: true,
        priority: 2,
        evidence: [
          'Higher productivity scores on exercise days',
          'Lower afternoon fatigue',
          'Improved mood stability'
        ],
        suggestedActions: [
          'Schedule 20-minute morning walks',
          'Prepare workout clothes night before',
          'Start with 3 days per week'
        ]
      },
      {
        id: '3',
        category: 'Social',
        title: 'Support Network Impact',
        description: 'Regular contact with support network reduces crisis risk by 40%',
        actionable: true,
        priority: 1,
        evidence: [
          'Lower stress after social interactions',
          'Improved coping during difficult periods',
          'Faster recovery from mood dips'
        ],
        suggestedActions: [
          'Schedule weekly check-ins with close friends',
          'Join support group sessions',
          'Use mood buddy feature daily'
        ]
      }
    ];
    
    setInsights(newInsights);
  };

  const calculateRiskScore = () => {
    // Calculate overall wellness risk score
    const factors = {
      moodStability: data?.mood?.trend === 'declining' ? 30 : 10,
      sleepQuality: data?.sleep?.quality < 50 ? 25 : 5,
      medicationAdherence: data?.medications?.adherence < 80 ? 20 : 5,
      socialSupport: 10,
      crisisHistory: 15
    };
    
    const totalRisk = Object.values(factors).reduce((sum, val) => sum + val, 0);
    setRiskScore(Math.min(100, totalRisk));
    
    // Determine trajectory
    if (totalRisk < 30) {
      setWellnessTrajectory('improving');
    } else if (totalRisk < 60) {
      setWellnessTrajectory('stable');
    } else {
      setWellnessTrajectory('declining');
    }
  };

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'mood': return Brain;
      case 'crisis': return Shield;
      case 'wellness': return Activity;
      case 'symptom': return AlertTriangle;
      default: return Info;
    }
  };

  const getPredictionColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const renderPredictions = () => (
    <div className="space-y-4">
      {/* Risk Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Overall Wellness Trajectory
          </h4>
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${wellnessTrajectory === 'improving' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
              wellnessTrajectory === 'stable' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
              'bg-red-100 text-red-700 dark:bg-red-900/30'}
          `}>
            {wellnessTrajectory === 'improving' && <ArrowUp className="inline w-4 h-4 mr-1" />}
            {wellnessTrajectory === 'declining' && <ArrowDown className="inline w-4 h-4 mr-1" />}
            {wellnessTrajectory === 'stable' && <Minus className="inline w-4 h-4 mr-1" />}
            {wellnessTrajectory.charAt(0).toUpperCase() + wellnessTrajectory.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - riskScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-green-400 to-blue-500"
              />
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {100 - riskScore}%
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Wellness score based on multiple health factors
        </p>
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map(prediction => {
          const Icon = getPredictionIcon(prediction.type);
          const colorClass = getPredictionColor(prediction.severity);
          
          return (
            <motion.div
              key={prediction.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPrediction(prediction)}
              className={`
                p-4 rounded-xl cursor-pointer transition-all
                ${selectedPrediction?.id === prediction.id ? 
                  'ring-2 ring-blue-500' : ''}
                ${colorClass}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <h5 className="font-semibold">{prediction.title}</h5>
                </div>
                <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded-full">
                  {prediction.timeframe}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Probability</span>
                  <span className="font-medium">{prediction.probability}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      prediction.severity === 'high' ? 'bg-red-500' :
                      prediction.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${prediction.probability}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Confidence: {prediction.confidence}%
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Prediction View */}
      <AnimatePresence>
        {selectedPrediction && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="font-semibold mb-4">{selectedPrediction.title} - Details</h4>
            
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Contributing Factors
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedPrediction.factors.map((factor, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Recommendations
                </h5>
                <ul className="space-y-2">
                  {selectedPrediction.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onInsightAction?.('apply_recommendations', selectedPrediction)}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Apply Recommendations
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderPatterns = () => (
    <div className="space-y-4">
      {patterns.map(pattern => (
        <div
          key={pattern.id}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                {pattern.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {pattern.description}
              </p>
            </div>
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${pattern.trend === 'improving' ? 'bg-green-100 text-green-700' :
                pattern.trend === 'stable' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}
            `}>
              {pattern.trend}
            </span>
          </div>

          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Significance: </span>
              <span className="font-medium">{Math.round(pattern.significance * 100)}%</span>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Key Correlations
              </h5>
              <div className="space-y-2">
                {pattern.correlations.map((corr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      {corr.impact === 'positive' ? 
                        <ArrowUp className="w-3 h-3 text-green-500" /> :
                        <ArrowDown className="w-3 h-3 text-red-500" />
                      }
                      {corr.factor}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            corr.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${corr.strength * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(corr.strength * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-4">
      {insights.map(insight => (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  {insight.category}
                </span>
              </div>
              <h4 className="font-semibold">{insight.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {insight.description}
              </p>
            </div>
            {insight.priority === 1 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded-full">
                High Priority
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Evidence
              </h5>
              <ul className="space-y-1">
                {insight.evidence.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {insight.actionable && (
              <div>
                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Suggested Actions
                </h5>
                <div className="space-y-2">
                  {insight.suggestedActions.map((action, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onInsightAction?.('take_action', { insight, action })}
                      className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{action}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-500" />
          AI Wellness Analytics
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Predictive insights powered by your wellness data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'predictions', label: 'Predictions', icon: TrendingUp },
          { id: 'patterns', label: 'Patterns', icon: BarChart3 },
          { id: 'insights', label: 'Insights', icon: Sparkles }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`
              flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-all
              ${activeView === tab.id
                ? 'bg-purple-50 dark:bg-purple-900/30 border-b-2 border-purple-500 text-purple-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'predictions' && renderPredictions()}
            {activeView === 'patterns' && renderPatterns()}
            {activeView === 'insights' && renderInsights()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;