"use client";

/**
 * Crisis Intervention System
 * Main component for comprehensive crisis management
 * Coordinates all crisis-related features and interventions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Heart, 
  Shield,
  Activity,
  Users,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import CrisisDetectionService, { 
  CrisisAssessment, 
  CrisisSeverity,
  TypingBehavior 
} from '@/services/crisis/CrisisDetectionService';
import { useCrisisStore } from '@/stores/crisisStore';

interface CrisisInterventionSystemProps {
  userId?: string;
  language?: string;
  className?: string;
}

export default function CrisisInterventionSystem({
  userId,
  language = 'en',
  className = ''
}: CrisisInterventionSystemProps) {
  // Crisis state management
  const {
    currentAssessment,
    crisisHistory,
    setAssessment,
    addToHistory
  } = useCrisisStore();

  // Local state
  const [isMonitoring] = useState(true);
  const [showInterventionPanel, setShowInterventionPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [escalationDetected, setEscalationDetected] = useState(false);
  
  // Refs for text monitoring
  const lastKeyPressTime = useRef<number>(Date.now());
  const keyPressIntervals = useRef<number[]>([]);
  const deletionCount = useRef<number>(0);
  const totalKeystrokes = useRef<number>(0);

  // Initialize crisis detection service
  useEffect(() => {
    const detectionService = CrisisDetectionService;
    
    // Listen for crisis events
    detectionService.on('crisis-detected', handleCrisisDetected);
    detectionService.on('immediate-intervention-required', handleImmediateIntervention);
    detectionService.on('assessment', handleAssessmentUpdate);
    
    return () => {
      detectionService.removeListener('crisis-detected', handleCrisisDetected);
      detectionService.removeListener('immediate-intervention-required', handleImmediateIntervention);
      detectionService.removeListener('assessment', handleAssessmentUpdate);
    };
  }, []);

  /**
   * Handle crisis detection event
   */
  const handleCrisisDetected = useCallback((event: any) => {
    console.log('[CrisisIntervention] Crisis detected:', event);
    setShowInterventionPanel(true);
    
    // Trigger appropriate interventions based on severity
    if (event.assessment.severity >= CrisisSeverity.HIGH) {
      activateEmergencyProtocol();
    }
  }, []);

  /**
   * Handle immediate intervention requirement
   */
  const handleImmediateIntervention = useCallback((event: any) => {
    console.log('[CrisisIntervention] Immediate intervention required:', event);
    setShowInterventionPanel(true);
    setEscalationDetected(true);
    
    // Immediately show emergency resources
    activateEmergencyProtocol();
    
    // In production, this would also:
    // - Alert designated emergency contacts
    // - Connect to crisis counselor
    // - Log for immediate review
  }, []);

  /**
   * Handle assessment updates
   */
  const handleAssessmentUpdate = useCallback((assessment: CrisisAssessment) => {
    setAssessment(assessment);
    
    if (assessment.isInCrisis) {
      addToHistory(assessment);
      setShowInterventionPanel(true);
    }
    
    // Check for escalation
    if (crisisHistory.length > 0) {
      const previousAssessment = crisisHistory[crisisHistory.length - 1];
      if (previousAssessment) {
        const isEscalating = CrisisDetectionService.monitorEscalation(previousAssessment, assessment);
        setEscalationDetected(isEscalating);
      }
    }
  }, [setAssessment, addToHistory, crisisHistory]);

  /**
   * Activate emergency protocol
   */
  const activateEmergencyProtocol = useCallback(() => {
    // Show emergency resources immediately
    const emergencyModal = document.getElementById('emergency-modal');
    if (emergencyModal) {
      emergencyModal.style.display = 'block';
    }
    
    // Play alert sound (if enabled in settings)
    playAlertSound();
    
    // Send notifications (if permitted)
    sendEmergencyNotification();
  }, []);

  /**
   * Monitor text input for crisis indicators
   */
  const monitorTextInput = useCallback(async (text: string) => {
    if (!isMonitoring || !text) return;
    
    setIsProcessing(true);
    
    try {
      // Calculate typing behavior
      const behavior = calculateTypingBehavior();
      
      // Analyze text for crisis indicators
      const assessment = await CrisisDetectionService.analyzeText(
        text,
        userId,
        language,
        behavior
      );
      
      // Handle the assessment
      handleAssessmentUpdate(assessment);
      
    } catch (error) {
      console.error('[CrisisIntervention] Error analyzing text:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isMonitoring, userId, language, handleAssessmentUpdate]);

  /**
   * Calculate typing behavior metrics
   */
  const calculateTypingBehavior = useCallback((): TypingBehavior => {
    const intervals = keyPressIntervals.current;
    const avgTypingSpeed = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
    
    // Calculate pause patterns (intervals > 1000ms)
    const pausePatterns = intervals.filter(i => i > 1000);
    
    // Calculate deletion rate
    const deletionRate = totalKeystrokes.current > 0
      ? deletionCount.current / totalKeystrokes.current
      : 0;
    
    // Calculate hesitation score (based on pauses and deletions)
    const hesitationScore = Math.min(1, (pausePatterns.length / 10) + (deletionRate * 2));
    
    return {
      avgTypingSpeed,
      pausePatterns,
      deletionRate,
      hesitationScore
    };
  }, []);

  /**
   * Track keystroke patterns
   */
  const trackKeystroke = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const interval = now - lastKeyPressTime.current;
    
    keyPressIntervals.current.push(interval);
    if (keyPressIntervals.current.length > 50) {
      keyPressIntervals.current.shift();
    }
    
    lastKeyPressTime.current = now;
    totalKeystrokes.current++;
    
    if (event.key === 'Backspace' || event.key === 'Delete') {
      deletionCount.current++;
    }
  }, []);

  /**
   * Play alert sound for emergency situations
   */
  const playAlertSound = () => {
    // Only play if user has not disabled sounds
    if (typeof window !== 'undefined' && window.Audio) {
      // Use a gentle, non-alarming sound
      // In production, this would use a properly licensed audio file
      const audio = new Audio('/sounds/gentle-alert.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Could not play alert sound:', e));
    }
  };

  /**
   * Send emergency notification
   */
  const sendEmergencyNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Crisis Support Available', {
        body: 'Immediate help is available. Click here to access crisis resources.',
        icon: '/icons/crisis-support.png',
        badge: '/icons/badge.png',
        requireInteraction: true
      });
    }
  };

  /**
   * Handle emergency call
   */
  const handleEmergencyCall = () => {
    // Track interaction for analytics
    logCrisisInteraction('emergency_call_initiated');
    
    // Initiate call to crisis hotline
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:988';
    }
  };

  /**
   * Handle text support request
   */
  const handleTextSupport = () => {
    logCrisisInteraction('text_support_requested');
    
    // Open crisis chat interface
    // This would integrate with real crisis text service
    window.open('/crisis/chat', '_blank');
  };

  /**
   * Handle safety plan access
   */
  const handleSafetyPlan = () => {
    logCrisisInteraction('safety_plan_accessed');
    window.location.href = '/crisis/safety-plan';
  };

  /**
   * Log crisis interactions for improvement
   */
  const logCrisisInteraction = (action: string) => {
    // In production, this would send to analytics service
    console.log('[CrisisIntervention] Interaction:', {
      action,
      userId,
      timestamp: new Date(),
      severity: currentAssessment?.severity,
      confidence: currentAssessment?.confidence
    });
  };

  /**
   * Get severity color and styling
   */
  const getSeverityStyle = (severity: CrisisSeverity) => {
    switch (severity) {
      case CrisisSeverity.IMMEDIATE:
        return 'bg-red-100 border-red-500 text-red-900';
      case CrisisSeverity.CRITICAL:
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case CrisisSeverity.HIGH:
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case CrisisSeverity.MODERATE:
        return 'bg-blue-100 border-blue-500 text-blue-900';
      case CrisisSeverity.LOW:
        return 'bg-green-100 border-green-500 text-green-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  return (
    <>
      {/* Crisis Monitoring Indicator */}
      {isMonitoring && (
        <div className="fixed top-4 right-4 z-40">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-neutral-900/90 rounded-full shadow-sm border border-neutral-200 dark:border-neutral-700"
          >
            <Shield className="w-4 h-4 text-wellness-calm" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Crisis Protection Active
            </span>
            {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
          </motion.div>
        </div>
      )}

      {/* Crisis Intervention Panel */}
      <AnimatePresence>
        {showInterventionPanel && currentAssessment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-labelledby="crisis-intervention-title"
            aria-modal="true"
          >
            <motion.div
              className={`relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden ${className}`}
              initial={{ y: 50 }}
              animate={{ y: 0 }}
            >
              {/* Header with severity indicator */}
              <div className={`p-6 border-b-4 ${getSeverityStyle(currentAssessment.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8" />
                    <div>
                      <h2 id="crisis-intervention-title" className="text-2xl font-bold">
                        Support Available Now
                      </h2>
                      <p className="text-sm mt-1 opacity-90">
                        We&apos;re here to help. You&apos;re not alone.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInterventionPanel(false)}
                    className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                    aria-label="Close intervention panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {escalationDetected && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-500 text-white rounded-lg"
                  >
                    <p className="font-semibold">Immediate attention needed</p>
                    <p className="text-sm mt-1">
                      We&apos;ve noticed signs that you may need immediate support. 
                      Please reach out to someone right now.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Crisis Resources */}
              <div className="p-6 space-y-4">
                {/* Emergency Contact Options */}
                {currentAssessment.severity >= CrisisSeverity.HIGH && (
                  <div className="p-4 bg-crisis-background border-2 border-crisis-accent rounded-xl">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Immediate Help Available
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={handleEmergencyCall}
                        className="flex items-center gap-3 p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors group"
                        aria-label="Call 988 Crisis Lifeline"
                      >
                        <Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <p className="font-bold">Call 988</p>
                          <p className="text-sm opacity-90">24/7 Crisis Lifeline</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleTextSupport}
                        className="flex items-center gap-3 p-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors group"
                        aria-label="Text Crisis Support"
                      >
                        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <p className="font-bold">Text Support</p>
                          <p className="text-sm opacity-90">Chat with counselor</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-wellness-calm" />
                    Recommended Actions
                  </h3>
                  <div className="space-y-2">
                    {currentAssessment.suggestedActions.slice(0, 5).map((action, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            logCrisisInteraction(`action_selected_${index}`);
                          }
                        }}
                      >
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm">{action}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Safety Plan Access */}
                <button
                  onClick={handleSafetyPlan}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-wellness-calm/10 hover:bg-wellness-calm/20 rounded-xl transition-colors group"
                  aria-label="Access your safety plan"
                >
                  <Heart className="w-6 h-6 text-wellness-calm group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="font-semibold">Access Your Safety Plan</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Review your personalized coping strategies
                    </p>
                  </div>
                </button>

                {/* Support Network */}
                <button
                  className="w-full flex items-center justify-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-xl transition-colors group"
                  aria-label="Connect with support network"
                >
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="font-semibold">Connect with Support Network</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Reach out to your trusted contacts
                    </p>
                  </div>
                </button>
              </div>

              {/* Footer with reassurance */}
              <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Remember: This is temporary. Help is available, and things can get better.
                </p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="text-xs text-neutral-500">
                    Confidence: {Math.round(currentAssessment.confidence * 100)}%
                  </span>
                  <span className="text-xs text-neutral-500">
                    Response Time: {currentAssessment.responseTimeMs}ms
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden text input monitor */}
      {isMonitoring && (
        <div className="sr-only" aria-hidden="true">
          <textarea
            className="absolute -left-full"
            onKeyDown={trackKeystroke}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => monitorTextInput(e.target.value)}
            aria-label="Crisis monitoring input"
          />
        </div>
      )}
    </>
  );
}