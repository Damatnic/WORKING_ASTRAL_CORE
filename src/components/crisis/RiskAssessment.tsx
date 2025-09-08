"use client";

/**
 * Risk Assessment Component
 * Professional-grade mental health risk evaluation tools
 * Includes Columbia Suicide Severity Rating Scale (C-SSRS), PHQ-9, GAD-7
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck,
  AlertTriangle,
  Shield,
  TrendingUp,
  CheckCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Activity,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  useCrisisStore,
  RiskAssessmentQuestion,
  RiskAssessmentResponse,
  RiskAssessmentResult
} from '@/stores/crisisStore';
import CrisisDetectionService, { CrisisSeverity } from '@/services/crisis/CrisisDetectionService';

interface RiskAssessmentProps {
  userId: string;
  assessmentType?: 'columbia' | 'phq9' | 'gad7' | 'comprehensive';
  onComplete?: (result: RiskAssessmentResult) => void;
  className?: string;
}

// Columbia Suicide Severity Rating Scale questions
const COLUMBIA_QUESTIONS: RiskAssessmentQuestion[] = [
  {
    id: 'c1',
    question: 'Have you wished you were dead or wished you could go to sleep and not wake up?',
    type: 'columbia',
    weight: 1,
    criticalThreshold: 1
  },
  {
    id: 'c2',
    question: 'Have you actually had any thoughts of killing yourself?',
    type: 'columbia',
    weight: 2,
    criticalThreshold: 1
  },
  {
    id: 'c3',
    question: 'Have you been thinking about how you might do this?',
    type: 'columbia',
    weight: 3,
    criticalThreshold: 1
  },
  {
    id: 'c4',
    question: 'Have you had these thoughts and had some intention of acting on them?',
    type: 'columbia',
    weight: 4,
    criticalThreshold: 1
  },
  {
    id: 'c5',
    question: 'Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?',
    type: 'columbia',
    weight: 5,
    criticalThreshold: 1
  },
  {
    id: 'c6',
    question: 'Have you ever done anything, started to do anything, or prepared to do anything to end your life?',
    type: 'columbia',
    weight: 3,
    criticalThreshold: 1
  }
];

// PHQ-9 Depression Scale questions
const PHQ9_QUESTIONS: RiskAssessmentQuestion[] = [
  {
    id: 'phq1',
    question: 'Little interest or pleasure in doing things',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq2',
    question: 'Feeling down, depressed, or hopeless',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq3',
    question: 'Trouble falling or staying asleep, or sleeping too much',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq4',
    question: 'Feeling tired or having little energy',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq5',
    question: 'Poor appetite or overeating',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq6',
    question: 'Feeling bad about yourself or that you are a failure',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq7',
    question: 'Trouble concentrating on things',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq8',
    question: 'Moving or speaking slowly, or being fidgety or restless',
    type: 'phq9',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'phq9',
    question: 'Thoughts that you would be better off dead or of hurting yourself',
    type: 'phq9',
    weight: 3,
    criticalThreshold: 1
  }
];

// GAD-7 Anxiety Scale questions
const GAD7_QUESTIONS: RiskAssessmentQuestion[] = [
  {
    id: 'gad1',
    question: 'Feeling nervous, anxious, or on edge',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad2',
    question: 'Not being able to stop or control worrying',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad3',
    question: 'Worrying too much about different things',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad4',
    question: 'Trouble relaxing',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad5',
    question: 'Being so restless that it is hard to sit still',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad6',
    question: 'Becoming easily annoyed or irritable',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  },
  {
    id: 'gad7',
    question: 'Feeling afraid, as if something awful might happen',
    type: 'gad7',
    weight: 1,
    criticalThreshold: 3
  }
];

// Response options for different assessment types
const COLUMBIA_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' }
];

const PHQ9_GAD7_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' }
];

export default function RiskAssessment({
  userId,
  assessmentType = 'comprehensive',
  onComplete,
  className = ''
}: RiskAssessmentProps) {
  // Store hooks
  const {
    setRiskAssessment,
    markAssessmentDue,
    lastRiskAssessment
  } = useCrisisStore();
  
  // Local state
  const [currentAssessment, setCurrentAssessment] = useState<'columbia' | 'phq9' | 'gad7'>('columbia');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<RiskAssessmentResponse[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RiskAssessmentResult | null>(null);
  
  // Get questions based on assessment type
  const getQuestions = useCallback(() => {
    switch (assessmentType) {
      case 'columbia':
        return COLUMBIA_QUESTIONS;
      case 'phq9':
        return PHQ9_QUESTIONS;
      case 'gad7':
        return GAD7_QUESTIONS;
      case 'comprehensive':
        switch (currentAssessment) {
          case 'columbia':
            return COLUMBIA_QUESTIONS;
          case 'phq9':
            return PHQ9_QUESTIONS;
          case 'gad7':
            return GAD7_QUESTIONS;
        }
    }
  }, [assessmentType, currentAssessment]);
  
  // Get response options
  const getOptions = useCallback(() => {
    const questions = getQuestions();
    if (!questions.length || !questions[0]) return [];
    
    const questionType = questions[0].type;
    return questionType === 'columbia' ? COLUMBIA_OPTIONS : PHQ9_GAD7_OPTIONS;
  }, [getQuestions]);
  
  const questions = getQuestions();
  const options = getOptions();
  const currentQuestion = questions[currentQuestionIndex];
  
  /**
   * Handle response selection
   */
  const handleResponse = (value: number) => {
    if (!currentQuestion) return;
    
    const response: RiskAssessmentResponse = {
      questionId: currentQuestion.id,
      response: value,
      timestamp: new Date()
    };
    
    setResponses([...responses, response]);
    
    // Check for critical response
    if (currentQuestion.criticalThreshold && value >= currentQuestion.criticalThreshold) {
      handleCriticalResponse(currentQuestion, value);
    }
    
    // Move to next question or assessment
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (assessmentType === 'comprehensive') {
      // Move to next assessment type
      if (currentAssessment === 'columbia') {
        setCurrentAssessment('phq9');
        setCurrentQuestionIndex(0);
      } else if (currentAssessment === 'phq9') {
        setCurrentAssessment('gad7');
        setCurrentQuestionIndex(0);
      } else {
        // All assessments complete
        analyzeResponses();
      }
    } else {
      // Single assessment complete
      analyzeResponses();
    }
  };
  
  /**
   * Handle critical response that needs immediate attention
   */
  const handleCriticalResponse = (question: RiskAssessmentQuestion, value: number) => {
    console.log('[RiskAssessment] Critical response detected:', question.id, value);
    
    // For Columbia questions with suicidal ideation
    if (question.type === 'columbia' && question.weight >= 3) {
      // Trigger immediate intervention
      const assessment = {
        id: `critical_${Date.now()}`,
        isInCrisis: true,
        severity: CrisisSeverity.IMMEDIATE,
        confidence: 0.95,
        indicators: [],
        suggestedActions: ['Connect to crisis counselor immediately', 'Display emergency resources'],
        requiresImmediate: true,
        language: 'en',
        timestamp: new Date(),
        responseTimeMs: 0,
        riskFactors: []
      };
      
      CrisisDetectionService.emit('immediate-intervention-required', {
        assessment,
        userId,
        timestamp: new Date()
      });
    }
    
    // For PHQ-9 question 9 (suicidal thoughts)
    if (question.id === 'phq9' && value >= 1) {
      const assessment = {
        id: `phq9_critical_${Date.now()}`,
        isInCrisis: true,
        severity: value >= 2 ? CrisisSeverity.HIGH : CrisisSeverity.MODERATE,
        confidence: 0.85,
        indicators: [],
        suggestedActions: ['Offer crisis support', 'Schedule urgent check-in'],
        requiresImmediate: value >= 2,
        language: 'en',
        timestamp: new Date(),
        responseTimeMs: 0,
        riskFactors: []
      };
      
      CrisisDetectionService.emit('crisis-detected', {
        assessment,
        userId,
        timestamp: new Date()
      });
    }
  };
  
  /**
   * Analyze all responses and generate result
   */
  const analyzeResponses = async () => {
    setIsAnalyzing(true);
    
    // Calculate scores
    const columbiaResponses = responses.filter(r => r.questionId.startsWith('c'));
    const phq9Responses = responses.filter(r => r.questionId.startsWith('phq'));
    const gad7Responses = responses.filter(r => r.questionId.startsWith('gad'));
    
    // Columbia scoring
    const columbiaScore = columbiaResponses.reduce((score, response) => {
      const question = COLUMBIA_QUESTIONS.find(q => q.id === response.questionId);
      return score + (response.response as number) * (question?.weight || 1);
    }, 0);
    
    // PHQ-9 scoring
    const phq9Score = phq9Responses.reduce((score, response) => {
      return score + (response.response as number);
    }, 0);
    
    // GAD-7 scoring
    const gad7Score = gad7Responses.reduce((score, response) => {
      return score + (response.response as number);
    }, 0);
    
    // Determine overall risk level
    let risk: 'low' | 'moderate' | 'high' | 'immediate' = 'low';
    const recommendations: string[] = [];
    
    // Columbia risk assessment
    if (columbiaScore > 0) {
      const hasActiveSuicidalIdeation = columbiaResponses.some(r => 
        ['c2', 'c3', 'c4', 'c5'].includes(r.questionId) && r.response === 1
      );
      
      if (hasActiveSuicidalIdeation) {
        risk = 'immediate';
        recommendations.push('Immediate crisis intervention required');
        recommendations.push('Connect with crisis counselor or emergency services');
        recommendations.push('Implement safety plan immediately');
      } else if (columbiaResponses.find(r => r.questionId === 'c1' && r.response === 1)) {
        risk = 'high';
        recommendations.push('Schedule urgent appointment with mental health professional');
        recommendations.push('Develop or review safety plan');
        recommendations.push('Increase check-ins and support');
      }
    }
    
    // PHQ-9 risk assessment
    if (phq9Score > 0) {
      if (phq9Score >= 20) {
        risk = risk === 'immediate' ? 'immediate' : 'high';
        recommendations.push('Severe depression detected - immediate professional help recommended');
      } else if (phq9Score >= 15) {
        risk = risk === 'low' ? 'high' : risk;
        recommendations.push('Moderately severe depression - therapy and possible medication indicated');
      } else if (phq9Score >= 10) {
        risk = risk === 'low' ? 'moderate' : risk;
        recommendations.push('Moderate depression - consider therapy');
      } else if (phq9Score >= 5) {
        recommendations.push('Mild depression - monitor symptoms');
      }
    }
    
    // GAD-7 risk assessment
    if (gad7Score > 0) {
      if (gad7Score >= 15) {
        risk = risk === 'low' ? 'high' : risk;
        recommendations.push('Severe anxiety - professional treatment recommended');
      } else if (gad7Score >= 10) {
        risk = risk === 'low' ? 'moderate' : risk;
        recommendations.push('Moderate anxiety - consider therapy');
      } else if (gad7Score >= 5) {
        recommendations.push('Mild anxiety - practice self-care and coping strategies');
      }
    }
    
    // Add general recommendations
    if (risk === 'low') {
      recommendations.push('Continue regular self-care practices');
      recommendations.push('Maintain social connections');
      recommendations.push('Schedule routine mental health check-ups');
    }
    
    // Create result
    const assessmentResult: RiskAssessmentResult = {
      id: `assessment_${Date.now()}`,
      userId,
      assessmentType: assessmentType === 'comprehensive' ? 'Comprehensive' : assessmentType.toUpperCase(),
      responses,
      score: columbiaScore + phq9Score + gad7Score,
      risk,
      recommendations,
      timestamp: new Date()
    };
    
    setResult(assessmentResult);
    setRiskAssessment(assessmentResult);
    setIsAnalyzing(false);
    setShowResults(true);
    
    if (onComplete) {
      onComplete(assessmentResult);
    }
  };
  
  /**
   * Navigate to previous question
   */
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Remove last response
      setResponses(responses.slice(0, -1));
    } else if (assessmentType === 'comprehensive' && currentAssessment !== 'columbia') {
      // Go to previous assessment type
      if (currentAssessment === 'phq9') {
        setCurrentAssessment('columbia');
        setCurrentQuestionIndex(COLUMBIA_QUESTIONS.length - 1);
      } else if (currentAssessment === 'gad7') {
        setCurrentAssessment('phq9');
        setCurrentQuestionIndex(PHQ9_QUESTIONS.length - 1);
      }
    }
  };
  
  /**
   * Calculate progress percentage
   */
  const getProgress = () => {
    if (assessmentType === 'comprehensive') {
      const totalQuestions = COLUMBIA_QUESTIONS.length + PHQ9_QUESTIONS.length + GAD7_QUESTIONS.length;
      return (responses.length / totalQuestions) * 100;
    } else {
      return ((currentQuestionIndex + 1) / questions.length) * 100;
    }
  };
  
  /**
   * Get risk level color
   */
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'immediate':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default:
        return 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800';
    }
  };
  
  // Check if assessment is due
  useEffect(() => {
    if (lastRiskAssessment) {
      const daysSinceLastAssessment = Math.floor(
        (Date.now() - new Date(lastRiskAssessment.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Mark as due if more than 7 days for high risk, 14 days for moderate, 30 days for low
      if (
        (lastRiskAssessment.risk === 'high' && daysSinceLastAssessment >= 7) ||
        (lastRiskAssessment.risk === 'moderate' && daysSinceLastAssessment >= 14) ||
        (lastRiskAssessment.risk === 'low' && daysSinceLastAssessment >= 30)
      ) {
        markAssessmentDue();
      }
    }
  }, [lastRiskAssessment, markAssessmentDue]);
  
  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      {!showResults ? (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardCheck className="w-8 h-8 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold">Risk Assessment</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {assessmentType === 'comprehensive' 
                    ? 'Comprehensive mental health evaluation'
                    : `${assessmentType.toUpperCase()} Assessment`}
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="font-medium">{Math.round(getProgress())}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgress()}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            
            {/* Current assessment type indicator */}
            {assessmentType === 'comprehensive' && (
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentAssessment === 'columbia' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  currentAssessment === 'phq9' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                }`}>
                  {currentAssessment === 'columbia' ? 'Suicide Risk' :
                   currentAssessment === 'phq9' ? 'Depression' : 'Anxiety'}
                </div>
              </div>
            )}
          </div>
          
          {/* Question */}
          {!isAnalyzing && currentQuestion ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                  <h2 className="text-lg font-medium mb-6">
                    {currentQuestion.question}
                  </h2>
                  
                  {/* Time period context for PHQ-9 and GAD-7 */}
                  {currentQuestion.type !== 'columbia' && currentQuestionIndex === 0 && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Over the last 2 weeks, how often have you been bothered by the following?
                      </p>
                    </div>
                  )}
                  
                  {/* Response options */}
                  <div className="space-y-3">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleResponse(option.value)}
                        className="w-full p-4 text-left bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0 && currentAssessment === 'columbia'}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setShowResults(true)}
                    className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    Skip Assessment
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            // Analyzing screen
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="w-12 h-12 text-primary-500" />
              </motion.div>
              <p className="mt-4 text-lg font-medium">Analyzing responses...</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                Generating personalized recommendations
              </p>
            </div>
          )}
        </>
      ) : (
        // Results screen
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold">Assessment Results</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileText size={18} />
              Export
            </button>
          </div>
          
          {result && (
            <>
              {/* Risk Level */}
              <div className={`p-6 rounded-xl ${getRiskColor(result.risk)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-80 mb-1">Risk Level</p>
                    <p className="text-2xl font-bold capitalize">{result.risk}</p>
                  </div>
                  {result.risk === 'immediate' && (
                    <AlertTriangle className="w-8 h-8" />
                  )}
                  {result.risk === 'high' && (
                    <AlertCircle className="w-8 h-8" />
                  )}
                  {result.risk === 'moderate' && (
                    <TrendingUp className="w-8 h-8" />
                  )}
                  {result.risk === 'low' && (
                    <CheckCircle className="w-8 h-8" />
                  )}
                </div>
              </div>
              
              {/* Scores Breakdown */}
              {assessmentType === 'comprehensive' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Columbia</p>
                    <p className="text-xl font-semibold">
                      {responses.filter(r => r.questionId.startsWith('c')).filter(r => r.response === 1).length}/6
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">PHQ-9</p>
                    <p className="text-xl font-semibold">
                      {responses.filter(r => r.questionId.startsWith('phq')).reduce((sum, r) => sum + (r.response as number), 0)}/27
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">GAD-7</p>
                    <p className="text-xl font-semibold">
                      {responses.filter(r => r.questionId.startsWith('gad')).reduce((sum, r) => sum + (r.response as number), 0)}/21
                    </p>
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {result.recommendations.map((recommendation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recommendation}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                {result.risk === 'immediate' && (
                  <button
                    onClick={() => window.location.href = 'tel:988'}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Call Crisis Line (988)
                  </button>
                )}
                {result.risk === 'high' && (
                  <button
                    onClick={() => window.location.href = '/crisis/chat'}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Start Crisis Chat
                  </button>
                )}
                <button
                  onClick={() => window.location.href = '/crisis/safety-plan'}
                  className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  {result.risk === 'immediate' || result.risk === 'high' ? 'Access Safety Plan' : 'Create Safety Plan'}
                </button>
              </div>
              
              {/* Professional Help Notice */}
              {(result.risk === 'immediate' || result.risk === 'high') && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> This assessment indicates you may benefit from immediate professional support. 
                    Please reach out to a mental health professional or crisis support service as soon as possible.
                  </p>
                </div>
              )}
            </>
          )}
          
          {/* Retake Assessment */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => {
                setCurrentQuestionIndex(0);
                setResponses([]);
                setShowResults(false);
                setResult(null);
                setCurrentAssessment('columbia');
              }}
              className="w-full py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Take Another Assessment
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}