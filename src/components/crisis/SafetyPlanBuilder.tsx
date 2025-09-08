"use client";

/**
 * Safety Plan Builder Component
 * Helps users create and maintain personalized crisis safety plans
 * Based on evidence-based Stanley-Brown Safety Planning Intervention
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield,
  AlertTriangle,
  Heart,
  Users,
  Phone,
  MapPin,
  Sparkles,
  Plus,
  X,
  Edit,
  Save,
  Download,
  CheckCircle,
  Clock,
  Star,
  Activity
} from 'lucide-react';
import { 
  useCrisisStore, 
  SafetyPlan, 
  CopingStrategy,
  EmergencyContact 
} from '@/stores/crisisStore';

interface SafetyPlanBuilderProps {
  userId: string;
  onComplete?: (plan: SafetyPlan) => void;
  className?: string;
}

// Coping strategy categories with icons
const COPING_CATEGORIES = {
  distraction: {
    label: 'Distraction',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    examples: ['Watch a movie', 'Play a game', 'Go for a walk', 'Listen to music']
  },
  comfort: {
    label: 'Comfort',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    examples: ['Take a warm bath', 'Wrap in a blanket', 'Pet an animal', 'Drink tea']
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    examples: ['Call a friend', 'Visit family', 'Join online community', 'Text someone']
  },
  professional: {
    label: 'Professional',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    examples: ['Call therapist', 'Use crisis line', 'Visit counselor', 'Contact psychiatrist']
  },
  environment: {
    label: 'Environment',
    icon: MapPin,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    examples: ['Go to safe place', 'Remove harmful items', 'Change location', 'Visit nature']
  }
};

// Step indicators for guided creation
const STEPS = [
  { id: 'warning-signs', label: 'Warning Signs', icon: AlertTriangle },
  { id: 'coping-strategies', label: 'Coping Strategies', icon: Sparkles },
  { id: 'reasons-to-live', label: 'Reasons to Live', icon: Heart },
  { id: 'social-contacts', label: 'Social Contacts', icon: Users },
  { id: 'professional-contacts', label: 'Professional Help', icon: Phone },
  { id: 'safe-environment', label: 'Safe Environment', icon: MapPin }
];

export default function SafetyPlanBuilder({
  userId,
  onComplete,
  className = ''
}: SafetyPlanBuilderProps) {
  // Store hooks
  const {
    activeSafetyPlan,
    setSafetyPlan
  } = useCrisisStore();
  
  // Local state
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditing, setIsEditing] = useState(!activeSafetyPlan);
  const [planData, setPlanData] = useState<Partial<SafetyPlan>>({
    warningSignals: activeSafetyPlan?.warningSignals || [],
    copingStrategies: activeSafetyPlan?.copingStrategies || [],
    reasonsToLive: activeSafetyPlan?.reasonsToLive || [],
    emergencyContacts: activeSafetyPlan?.emergencyContacts || [],
    professionalContacts: activeSafetyPlan?.professionalContacts || [],
    safeEnvironment: activeSafetyPlan?.safeEnvironment || []
  });
  
  // Temporary input states
  const [newWarningSign, setNewWarningSign] = useState('');
  const [newCopingStrategy, setNewCopingStrategy] = useState({ title: '', description: '', category: 'distraction' });
  const [newReasonToLive, setNewReasonToLive] = useState('');
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [newSafePlace, setNewSafePlace] = useState('');
  
  /**
   * Add warning sign
   */
  const addWarningSign = () => {
    if (!newWarningSign.trim()) return;
    
    setPlanData(prev => ({
      ...prev,
      warningSignals: [...(prev.warningSignals || []), newWarningSign]
    }));
    setNewWarningSign('');
  };
  
  /**
   * Remove warning sign
   */
  const removeWarningSign = (index: number) => {
    setPlanData(prev => ({
      ...prev,
      warningSignals: prev.warningSignals?.filter((_, i) => i !== index) || []
    }));
  };
  
  /**
   * Add coping strategy
   */
  const addCopingStrategyItem = () => {
    if (!newCopingStrategy.title.trim()) return;
    
    const strategy: CopingStrategy = {
      id: `strategy_${Date.now()}`,
      category: newCopingStrategy.category as keyof typeof COPING_CATEGORIES,
      title: newCopingStrategy.title,
      description: newCopingStrategy.description,
      effectiveness: 0
    };
    
    setPlanData(prev => ({
      ...prev,
      copingStrategies: [...(prev.copingStrategies || []), strategy]
    }));
    
    setNewCopingStrategy({ title: '', description: '', category: 'distraction' });
  };
  
  /**
   * Remove coping strategy
   */
  const removeCopingStrategy = (id: string) => {
    setPlanData(prev => ({
      ...prev,
      copingStrategies: prev.copingStrategies?.filter(s => s.id !== id) || []
    }));
  };
  
  /**
   * Add reason to live
   */
  const addReasonToLive = () => {
    if (!newReasonToLive.trim()) return;
    
    setPlanData(prev => ({
      ...prev,
      reasonsToLive: [...(prev.reasonsToLive || []), newReasonToLive]
    }));
    setNewReasonToLive('');
  };
  
  /**
   * Add emergency contact
   */
  const addEmergencyContactItem = () => {
    if (!newContact.name || !newContact.phone) return;
    
    const contact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: newContact.name,
      phone: newContact.phone,
      relationship: newContact.relationship,
      available247: false,
      isProfessional: currentStep === 4
    };
    
    if (currentStep === 4) {
      setPlanData(prev => ({
        ...prev,
        professionalContacts: [...(prev.professionalContacts || []), contact]
      }));
    } else {
      setPlanData(prev => ({
        ...prev,
        emergencyContacts: [...(prev.emergencyContacts || []), contact]
      }));
    }
    
    setNewContact({ name: '', phone: '', relationship: '' });
  };
  
  /**
   * Add safe environment item
   */
  const addSafeEnvironment = () => {
    if (!newSafePlace.trim()) return;
    
    setPlanData(prev => ({
      ...prev,
      safeEnvironment: [...(prev.safeEnvironment || []), newSafePlace]
    }));
    setNewSafePlace('');
  };
  
  /**
   * Save safety plan
   */
  const saveSafetyPlan = () => {
    const completePlan: SafetyPlan = {
      id: activeSafetyPlan?.id || `plan_${Date.now()}`,
      userId,
      warningSignals: planData.warningSignals || [],
      copingStrategies: planData.copingStrategies || [],
      reasonsToLive: planData.reasonsToLive || [],
      emergencyContacts: planData.emergencyContacts || [],
      professionalContacts: planData.professionalContacts || [],
      safeEnvironment: planData.safeEnvironment || [],
      createdAt: activeSafetyPlan?.createdAt || new Date(),
      updatedAt: new Date(),
      lastReviewed: new Date()
    };
    
    setSafetyPlan(completePlan);
    setIsEditing(false);
    
    if (onComplete) {
      onComplete(completePlan);
    }
  };
  
  /**
   * Export safety plan as PDF
   */
  const exportPlan = () => {
    // In production, this would generate a proper PDF
    const planText = `
SAFETY PLAN
Created: ${new Date().toLocaleDateString()}

WARNING SIGNS:
${planData.warningSignals?.map(s => `- ${s}`).join('\n')}

COPING STRATEGIES:
${planData.copingStrategies?.map(s => `- ${s.title}: ${s.description}`).join('\n')}

REASONS TO LIVE:
${planData.reasonsToLive?.map(r => `- ${r}`).join('\n')}

SUPPORT CONTACTS:
${planData.emergencyContacts?.map(c => `- ${c.name} (${c.relationship}): ${c.phone}`).join('\n')}

PROFESSIONAL HELP:
${planData.professionalContacts?.map(c => `- ${c.name}: ${c.phone}`).join('\n')}

SAFE ENVIRONMENT:
${planData.safeEnvironment?.map(e => `- ${e}`).join('\n')}
    `;
    
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safety-plan.txt';
    a.click();
  };
  
  /**
   * Get step progress
   */
  const getStepProgress = () => {
    const totalSteps = STEPS.length;
    const completedSteps = [
      planData.warningSignals?.length,
      planData.copingStrategies?.length,
      planData.reasonsToLive?.length,
      planData.emergencyContacts?.length,
      planData.professionalContacts?.length,
      planData.safeEnvironment?.length
    ].filter(count => count && count > 0).length;
    
    return (completedSteps / totalSteps) * 100;
  };
  
  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold">
                {activeSafetyPlan && !isEditing ? 'Your Safety Plan' : 'Create Safety Plan'}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                A personalized plan to help you through difficult times
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {activeSafetyPlan && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                  Edit
                </button>
                <button
                  onClick={exportPlan}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Download size={18} />
                  Export
                </button>
              </>
            )}
            {isEditing && (
              <button
                onClick={saveSafetyPlan}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <Save size={18} />
                Save Plan
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {isEditing && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">Progress</span>
              <span className="font-medium">{Math.round(getStepProgress())}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: 0 }}
                animate={{ width: `${getStepProgress()}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
        
        {/* Step Indicators */}
        {isEditing && (
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  currentStep === index
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <step.icon size={20} />
                <span className="text-xs hidden md:inline">{step.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Content */}
      {isEditing ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Step 1: Warning Signs */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Warning Signs</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  What thoughts, feelings, or behaviors tell you a crisis might be developing?
                </p>
                
                <div className="space-y-3 mb-4">
                  {planData.warningSignals?.map((signal, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <span>{signal}</span>
                      <button
                        onClick={() => removeWarningSign(index)}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWarningSign}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWarningSign(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addWarningSign()}
                    placeholder="e.g., Feeling isolated, trouble sleeping..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={addWarningSign}
                    className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 2: Coping Strategies */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Coping Strategies</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  What can you do on your own to help yourself not act on urges to harm yourself?
                </p>
                
                {/* Coping strategies by category */}
                {Object.entries(COPING_CATEGORIES).map(([key, category]) => {
                  const strategies = planData.copingStrategies?.filter(s => s.category === key) || [];
                  
                  return (
                    <div key={key} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <category.icon className={`w-5 h-5 ${category.color}`} />
                        <h3 className="font-medium">{category.label}</h3>
                        <span className="text-sm text-neutral-500">({strategies.length})</span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {strategies.map((strategy) => (
                          <motion.div
                            key={strategy.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`p-3 ${category.bgColor} rounded-lg`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{strategy.title}</p>
                                {strategy.description && (
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    {strategy.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeCopingStrategy(strategy.id)}
                                className="p-1 hover:bg-black/10 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Add new coping strategy */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-3">Add New Strategy</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newCopingStrategy.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCopingStrategy(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Strategy name"
                        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <select
                        value={newCopingStrategy.category}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCopingStrategy(prev => ({ ...prev, category: e.target.value }))}
                        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {Object.entries(COPING_CATEGORIES).map(([key, cat]) => (
                          <option key={key} value={key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={newCopingStrategy.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCopingStrategy(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={2}
                    />
                    <button
                      onClick={addCopingStrategyItem}
                      className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                    >
                      Add Strategy
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Reasons to Live */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Reasons to Live</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  What are your reasons for living? What gives your life meaning?
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {planData.reasonsToLive?.map((reason, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span>{reason}</span>
                      </div>
                      <button
                        onClick={() => {
                          setPlanData(prev => ({
                            ...prev,
                            reasonsToLive: prev.reasonsToLive?.filter((_, i) => i !== index) || []
                          }));
                        }}
                        className="p-1 hover:bg-black/10 rounded"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReasonToLive}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewReasonToLive(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addReasonToLive()}
                    placeholder="e.g., My family, my pet, future goals..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={addReasonToLive}
                    className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Steps 4 & 5: Contacts */}
            {(currentStep === 3 || currentStep === 4) && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {currentStep === 3 ? 'Social Support Contacts' : 'Professional Help'}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  {currentStep === 3
                    ? 'People you can reach out to for support or distraction'
                    : 'Professional help and crisis resources available to you'}
                </p>
                
                <div className="space-y-3 mb-4">
                  {(currentStep === 3 ? planData.emergencyContacts : planData.professionalContacts)?.map((contact) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <Phone className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {contact.relationship} • {contact.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const field = currentStep === 3 ? 'emergencyContacts' : 'professionalContacts';
                          setPlanData(prev => ({
                            ...prev,
                            [field]: prev[field]?.filter(c => c.id !== contact.id) || []
                          }));
                        }}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-3">Add Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                      className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone"
                      className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={newContact.relationship}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                      placeholder="Relationship"
                      className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    onClick={addEmergencyContactItem}
                    className="w-full mt-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                  >
                    Add Contact
                  </button>
                </div>
                
                {currentStep === 4 && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Crisis Hotlines</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>988 Suicide & Crisis Lifeline</span>
                        <span className="font-mono">988</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Crisis Text Line</span>
                        <span className="font-mono">Text HOME to 741741</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emergency Services</span>
                        <span className="font-mono">911</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 6: Safe Environment */}
            {currentStep === 5 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Creating a Safe Environment</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  How can you make your environment safer during a crisis?
                </p>
                
                <div className="space-y-3 mb-4">
                  {planData.safeEnvironment?.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>{item}</span>
                      </div>
                      <button
                        onClick={() => {
                          setPlanData(prev => ({
                            ...prev,
                            safeEnvironment: prev.safeEnvironment?.filter((_, i) => i !== index) || []
                          }));
                        }}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSafePlace}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSafePlace(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addSafeEnvironment()}
                    placeholder="e.g., Remove sharp objects, go to a friend's house..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={addSafeEnvironment}
                    className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>
              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={saveSafetyPlan}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Complete Plan
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        // View Mode - Display saved plan
        <div className="space-y-8">
          {activeSafetyPlan && (
            <>
              {/* Last reviewed */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <p className="text-sm">
                    Last reviewed: {new Date(activeSafetyPlan.lastReviewed).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Warning Signs */}
              {activeSafetyPlan.warningSignals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Warning Signs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeSafetyPlan.warningSignals.map((signal, index) => (
                      <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Coping Strategies */}
              {activeSafetyPlan.copingStrategies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Coping Strategies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeSafetyPlan.copingStrategies.map((strategy) => {
                      const category = COPING_CATEGORIES[strategy.category];
                      return (
                        <div key={strategy.id} className={`p-4 ${category.bgColor} rounded-lg`}>
                          <div className="flex items-start gap-2">
                            <category.icon className={`w-5 h-5 ${category.color} mt-0.5`} />
                            <div>
                              <p className="font-medium">{strategy.title}</p>
                              {strategy.description && (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                  {strategy.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Reasons to Live */}
              {activeSafetyPlan.reasonsToLive.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Reasons to Live
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeSafetyPlan.reasonsToLive.map((reason, index) => (
                      <div key={index} className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Emergency Contacts */}
              {(activeSafetyPlan.emergencyContacts.length > 0 || activeSafetyPlan.professionalContacts.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-green-500" />
                    Support Contacts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSafetyPlan.emergencyContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => window.location.href = `tel:${contact.phone}`}
                        className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-left"
                      >
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {contact.relationship} • {contact.phone}
                        </p>
                      </button>
                    ))}
                    {activeSafetyPlan.professionalContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => window.location.href = `tel:${contact.phone}`}
                        className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-left"
                      >
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Professional • {contact.phone}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Safe Environment */}
              {activeSafetyPlan.safeEnvironment.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Safe Environment Steps
                  </h3>
                  <div className="space-y-2">
                    {activeSafetyPlan.safeEnvironment.map((item, index) => (
                      <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}