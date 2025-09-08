"use client";

/**
 * Enhanced Crisis Button
 * Always-visible, accessible crisis support access point
 * Features one-click emergency access, keyboard shortcuts, and adaptive display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Heart, 
  Shield,
  Activity,
  Users,
  X,
  Zap,
  Sparkles
} from 'lucide-react';
import { useCrisisStore, useIsInCrisis } from '@/stores/crisisStore';
import { CrisisSeverity } from '@/services/crisis/CrisisDetectionService';

interface EnhancedCrisisButtonProps {
  variant?: 'floating' | 'inline' | 'compact' | 'minimal';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  alwaysVisible?: boolean;
  pulseOnCrisis?: boolean;
  className?: string;
}

export default function EnhancedCrisisButton({
  variant = 'floating',
  position = 'bottom-right',
  alwaysVisible = true,
  pulseOnCrisis = true,
  className = ''
}: EnhancedCrisisButtonProps) {
  // State management
  const {
    currentAssessment,
    emergencyContacts,
    primaryEmergencyContact,
    startChatSession,
    incrementCrisisCount
  } = useCrisisStore();
  
  const isInCrisis = useIsInCrisis();
  
  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<Date | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const controls = useAnimation();
  
  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6'
  };
  
  // Check for crisis state changes
  useEffect(() => {
    if (isInCrisis && pulseOnCrisis) {
      setIsUrgent(true);
      controls.start({
        scale: [1, 1.1, 1],
        transition: { repeat: Infinity, duration: 2 }
      });
      
      // Auto-open if severity is high
      if (currentAssessment && currentAssessment.severity >= CrisisSeverity.HIGH) {
        setIsOpen(true);
      }
    } else {
      setIsUrgent(false);
      controls.stop();
    }
  }, [isInCrisis, currentAssessment, pulseOnCrisis, controls]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + H for help
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setIsOpen(true);
        setIsUrgent(true);
        buttonRef.current?.focus();
      }
      
      // Ctrl/Cmd + 9 for emergency (988)
      if ((e.ctrlKey || e.metaKey) && e.key === '9') {
        e.preventDefault();
        handleEmergencyCall();
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);
  
  // Auto-hide logic for non-crisis situations
  useEffect(() => {
    if (!alwaysVisible && !isInCrisis) {
      const timer = setTimeout(() => {
        if (!lastInteraction || Date.now() - lastInteraction.getTime() > 300000) { // 5 minutes
          setShowQuickActions(false);
        }
      }, 300000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [alwaysVisible, isInCrisis, lastInteraction]);
  
  /**
   * Handle emergency call (988)
   */
  const handleEmergencyCall = useCallback(() => {
    setLastInteraction(new Date());
    incrementCrisisCount();
    
    // Log for analytics
    console.log('[EnhancedCrisisButton] Emergency call initiated');
    
    // Try to call primary emergency contact first if available
    if (primaryEmergencyContact && primaryEmergencyContact.available247) {
      if (confirm(`Call ${primaryEmergencyContact.name} (${primaryEmergencyContact.relationship})?`)) {
        window.location.href = `tel:${primaryEmergencyContact.phone}`;
        return;
      }
    }
    
    // Default to 988
    window.location.href = 'tel:988';
  }, [primaryEmergencyContact, incrementCrisisCount]);
  
  /**
   * Handle text support
   */
  const handleTextSupport = useCallback(() => {
    setLastInteraction(new Date());
    startChatSession(currentAssessment?.severity || CrisisSeverity.MODERATE);
    
    // Open crisis chat
    window.location.href = '/crisis/chat';
  }, [currentAssessment, startChatSession]);
  
  /**
   * Handle safety plan access
   */
  const handleSafetyPlan = useCallback(() => {
    setLastInteraction(new Date());
    window.location.href = '/crisis/safety-plan';
  }, []);
  
  /**
   * Handle breathing exercise
   */
  const handleBreathingExercise = useCallback(() => {
    setLastInteraction(new Date());
    window.location.href = '/wellness/breathing';
  }, []);
  
  /**
   * Handle grounding technique
   */
  const handleGroundingTechnique = useCallback(() => {
    setLastInteraction(new Date());
    window.location.href = '/wellness/grounding';
  }, []);
  
  /**
   * Handle peer support
   */
  const handlePeerSupport = useCallback(() => {
    setLastInteraction(new Date());
    window.location.href = '/community/support';
  }, []);
  
  // Get button color based on crisis severity
  const getButtonColor = () => {
    if (!currentAssessment) return 'bg-primary-500 hover:bg-primary-600';
    
    switch (currentAssessment.severity) {
      case CrisisSeverity.IMMEDIATE:
      case CrisisSeverity.CRITICAL:
        return 'bg-red-500 hover:bg-red-600';
      case CrisisSeverity.HIGH:
        return 'bg-orange-500 hover:bg-orange-600';
      case CrisisSeverity.MODERATE:
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-primary-500 hover:bg-primary-600';
    }
  };
  
  // Floating variant - most prominent
  if (variant === 'floating') {
    return (
      <>
        {/* Main Crisis Button */}
        <motion.button
          ref={buttonRef}
          className={`fixed ${positionClasses[position]} z-50 ${getButtonColor()} text-white p-4 rounded-full shadow-lg transition-all duration-200 ${className}`}
          onClick={() => setIsOpen(!isOpen)}
          animate={controls}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Crisis Support - Press Ctrl+H for quick access"
          role="button"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {isUrgent ? (
            <Zap size={24} className="animate-pulse" />
          ) : (
            <Shield size={24} />
          )}
          
          {/* Notification badge */}
          {isInCrisis && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
          )}
        </motion.button>
        
        {/* Quick Actions (when not open) */}
        <AnimatePresence>
          {showQuickActions && !isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`fixed ${position.includes('bottom') ? 'bottom-20' : 'top-32'} ${position.includes('right') ? 'right-6' : 'left-6'} z-40 flex flex-col gap-2`}
            >
              <motion.button
                onClick={handleEmergencyCall}
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Emergency Call"
              >
                <Phone size={20} />
              </motion.button>
              <motion.button
                onClick={handleTextSupport}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Text Support"
              >
                <MessageCircle size={20} />
              </motion.button>
              <motion.button
                onClick={handleSafetyPlan}
                className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Safety Plan"
              >
                <Heart size={20} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Full Crisis Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`fixed ${position.includes('bottom') ? 'bottom-24' : 'top-32'} ${position.includes('right') ? 'right-6' : 'left-6'} z-50 w-80 max-h-[600px] overflow-y-auto`}
            >
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
                {/* Header */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-primary-500'}`} />
                      <h3 className="font-semibold text-lg">Crisis Support</h3>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      aria-label="Close menu"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {isInCrisis && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                      We&apos;re here to help. You&apos;re not alone.
                    </p>
                  )}
                </div>
                
                {/* Emergency Actions */}
                {(isUrgent || (currentAssessment && currentAssessment.severity >= CrisisSeverity.HIGH)) && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">
                      Immediate Help Available
                    </p>
                    <button
                      onClick={handleEmergencyCall}
                      className="w-full flex items-center gap-3 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <Phone size={20} />
                      <div className="text-left">
                        <p className="font-semibold">Call Crisis Line</p>
                        <p className="text-xs opacity-90">988 or Emergency Contact</p>
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Support Options */}
                <div className="p-4 space-y-2">
                  <button
                    onClick={handleTextSupport}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <MessageCircle className="text-primary-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">Crisis Chat</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Chat with a counselor
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleSafetyPlan}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Heart className="text-purple-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">Safety Plan</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Your coping strategies
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleBreathingExercise}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Activity className="text-blue-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">Breathing Exercise</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Calm your mind
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleGroundingTechnique}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Sparkles className="text-green-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">Grounding Technique</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        5-4-3-2-1 Method
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={handlePeerSupport}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Users className="text-indigo-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">Peer Support</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Connect with others
                      </p>
                    </div>
                  </button>
                </div>
                
                {/* Emergency Contacts */}
                {emergencyContacts.length > 0 && (
                  <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                      Your Emergency Contacts
                    </p>
                    <div className="space-y-1">
                      {emergencyContacts.slice(0, 3).map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => window.location.href = `tel:${contact.phone}`}
                          className="w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <span className="text-sm font-medium">{contact.name}</span>
                          <Phone size={14} className="text-neutral-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 rounded-b-2xl">
                  <p className="text-xs text-center text-neutral-500">
                    Press Ctrl+H anytime for help • Available 24/7
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
  
  // Inline variant - embedded in pages
  if (variant === 'inline') {
    return (
      <div className={`bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-4 mb-4">
          <Shield className="text-primary-500" size={24} />
          <div>
            <h3 className="text-lg font-semibold">Crisis Support Available</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Help is always available when you need it
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={handleEmergencyCall}
            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Phone className="text-red-500" size={20} />
            <span className="text-sm">Call 988</span>
          </button>
          <button
            onClick={handleTextSupport}
            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <MessageCircle className="text-blue-500" size={20} />
            <span className="text-sm">Chat</span>
          </button>
          <button
            onClick={handleSafetyPlan}
            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Heart className="text-purple-500" size={20} />
            <span className="text-sm">Safety Plan</span>
          </button>
          <button
            onClick={handleBreathingExercise}
            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Activity className="text-green-500" size={20} />
            <span className="text-sm">Breathe</span>
          </button>
        </div>
      </div>
    );
  }
  
  // Compact variant - for headers/navigation
  if (variant === 'compact') {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 ${getButtonColor()} text-white rounded-lg transition-colors ${className}`}
        aria-label="Crisis Support"
      >
        <Shield size={18} />
        <span className="font-medium">Crisis Help</span>
        {isInCrisis && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      </button>
    );
  }
  
  // Minimal variant - icon only
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`p-2 ${getButtonColor()} text-white rounded-lg transition-colors ${className}`}
      aria-label="Crisis Support"
    >
      <Shield size={20} />
      {isInCrisis && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
      )}
    </button>
  );
}