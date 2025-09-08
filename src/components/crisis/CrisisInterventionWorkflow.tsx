'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardDocumentCheckIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  HeartIcon,
  MapPinIcon,
  PhoneArrowUpRightIcon,
  BuildingOffice2Icon,
  TruckIcon,
  UserGroupIcon,
  CalendarIcon,
  PencilIcon,
  EyeIcon,
  PrinterIcon,
  XMarkIcon,
  BellAlertIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { format, differenceInMinutes, addMinutes } from 'date-fns';

interface CrisisWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  required: boolean;
  notes?: string;
  outcome?: string;
  nextSteps?: string[];
}

interface CrisisIntervention {
  id: string;
  clientInfo: {
    name: string;
    age?: number;
    phone: string;
    location?: string;
    isMinor: boolean;
    guardianInfo?: {
      name: string;
      phone: string;
      notified: boolean;
    };
  };
  initiatedBy: 'client' | 'third_party' | 'professional' | 'emergency_services';
  contactMethod: 'phone' | 'chat' | 'text' | 'video' | 'in_person' | 'email';
  priority: 'low' | 'moderate' | 'high' | 'critical';
  category: 'suicidal_ideation' | 'self_harm' | 'substance_abuse' | 'domestic_violence' | 'panic_attack' | 'psychosis' | 'other';
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'transferred' | 'escalated' | 'follow_up_scheduled';
  assignedCounselor: string;
  workflow: CrisisWorkflowStep[];
  riskAssessment?: RiskAssessment;
  safetyPlan?: SafetyPlan;
  referrals: Referral[];
  followUpActions: FollowUpAction[];
  documentation: InterventionNote[];
  escalations: Escalation[];
  summary?: string;
  outcome: 'resolved' | 'ongoing' | 'transferred' | 'emergency_services' | 'hospitalization' | 'no_response';
}

interface RiskAssessment {
  suicidalIdeation: boolean;
  suicidalPlan: boolean;
  suicidalMeans: boolean;
  previousAttempts: boolean;
  substanceUse: boolean;
  mentalHealthHistory: boolean;
  socialSupport: boolean;
  protectiveFactors: string[];
  riskFactors: string[];
  overallRisk: 'low' | 'moderate' | 'high' | 'imminent';
  assessmentNotes: string;
  assessedBy: string;
  assessmentTime: Date;
}

interface SafetyPlan {
  warningSigns: string[];
  copingStrategies: string[];
  socialSupports: string[];
  professionalSupports: string[];
  environmentalSafety: string[];
  crisisContacts: string[];
  createdBy: string;
  createdTime: Date;
  clientAgreement: boolean;
}

interface Referral {
  id: string;
  type: 'emergency_services' | 'hospital' | 'mental_health' | 'substance_abuse' | 'social_services' | 'legal' | 'other';
  organization: string;
  agency?: string; // Alias for organization
  contactInfo: string;
  urgency: 'immediate' | 'within_24h' | 'within_week' | 'routine';
  status: 'pending' | 'contacted' | 'accepted' | 'declined';
  notes?: string;
  followUpDate?: Date;
}

interface FollowUpAction {
  id: string;
  action: string;
  assignedTo: string;
  dueDate: Date;
  scheduledDate?: Date; // Alias for dueDate
  priority: 'low' | 'moderate' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface InterventionNote {
  id: string;
  timestamp: Date;
  author: string;
  type: 'assessment' | 'intervention' | 'safety_planning' | 'referral' | 'follow_up' | 'general';
  content: string;
  confidential: boolean;
}

interface Escalation {
  id: string;
  reason: string;
  escalatedTo: string;
  escalationTime: Date;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'acknowledged' | 'resolved';
  response?: string;
  responseTime?: Date;
}

interface CrisisInterventionWorkflowProps {
  interventionId?: string;
  className?: string;
}

const defaultWorkflowSteps: Omit<CrisisWorkflowStep, 'id' | 'status' | 'startTime' | 'endTime'>[] = [
  {
    name: 'Initial Contact & Rapport',
    description: 'Establish connection, gather basic information, and build trust',
    required: true
  },
  {
    name: 'Risk Assessment',
    description: 'Evaluate immediate safety risks and suicidal ideation',
    required: true
  },
  {
    name: 'Crisis Intervention',
    description: 'Provide immediate support and de-escalation techniques',
    required: true
  },
  {
    name: 'Safety Planning',
    description: 'Develop collaborative safety plan with client',
    required: false
  },
  {
    name: 'Resource Connection',
    description: 'Connect client with appropriate resources and referrals',
    required: false
  },
  {
    name: 'Follow-up Planning',
    description: 'Schedule follow-up contact and establish ongoing support',
    required: true
  },
  {
    name: 'Documentation',
    description: 'Complete intervention notes and required documentation',
    required: true
  },
  {
    name: 'Case Review',
    description: 'Review intervention with supervisor if required',
    required: false
  }
];

// API helper function
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

// Create empty intervention template
const createEmptyIntervention = (): CrisisIntervention => ({
  id: '',
  clientInfo: {
    name: '',
    phone: '',
    isMinor: false
  },
  initiatedBy: 'client',
  contactMethod: 'phone',
  priority: 'moderate',
  category: 'other',
  riskLevel: 'low',
  startTime: new Date(),
  status: 'active',
  assignedCounselor: '',
  workflow: defaultWorkflowSteps.map((step, index) => ({
    ...step,
    id: `step_${index + 1}`,
    status: 'pending'
  })),
  referrals: [],
  followUpActions: [],
  documentation: [],
  escalations: [],
  outcome: 'ongoing'
});

export default function CrisisInterventionWorkflow({ interventionId, className = "" }: CrisisInterventionWorkflowProps) {
  const [intervention, setIntervention] = useState<CrisisIntervention>(createEmptyIntervention());
  const [activeStep, setActiveStep] = useState<string>('step_1');
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [showSafetyPlan, setShowSafetyPlan] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [interventionTimer, setInterventionTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch intervention data if ID provided
  useEffect(() => {
    if (interventionId) {
      const fetchIntervention = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const data = await fetchWithAuth(`/api/crisis/interventions?id=${interventionId}`);
          
          if (data.interventions && data.interventions.length > 0) {
            const interventionData = data.interventions[0];
            
            // Transform API data to match component interface
            setIntervention({
              ...createEmptyIntervention(),
              id: interventionData.id,
              clientInfo: {
                name: interventionData.clientName || 'Anonymous Client',
                phone: interventionData.clientPhone || 'Not provided',
                isMinor: interventionData.isMinor || false
              },
              category: interventionData.primaryConcern || 'other',
              riskLevel: interventionData.riskAssessment || 'moderate',
              startTime: new Date(interventionData.startTime),
              endTime: interventionData.endTime ? new Date(interventionData.endTime) : undefined,
              status: interventionData.outcome === 'ongoing' ? 'active' : 'completed',
              assignedCounselor: interventionData.counselor || 'Unassigned',
              outcome: interventionData.outcome || 'ongoing',
              documentation: interventionData.notes ? [{
                id: 'note_' + Date.now(),
                timestamp: new Date(),
                author: interventionData.counselor || 'System',
                type: 'general' as const,
                content: interventionData.notes,
                confidential: true
              }] : []
            });
          }
        } catch (err) {
          console.error('Error fetching intervention:', err);
          setError('Failed to load intervention data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchIntervention();
    }
  }, [interventionId]);

  // Timer for intervention duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused && intervention.status === 'active') {
        setInterventionTimer(differenceInMinutes(new Date(), intervention.startTime));
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [intervention.startTime, intervention.status, isPaused]);

  const handleStepStart = (stepId: string) => {
    setIntervention(prev => ({
      ...prev,
      workflow: prev.workflow.map(step =>
        step.id === stepId
          ? { ...step, status: 'in_progress', startTime: new Date() }
          : step
      )
    }));
    setActiveStep(stepId);
  };

  const handleStepComplete = (stepId: string, notes?: string, outcome?: string) => {
    setIntervention(prev => ({
      ...prev,
      workflow: prev.workflow.map(step =>
        step.id === stepId
          ? { ...step, status: 'completed', endTime: new Date(), notes, outcome }
          : step
      )
    }));

    // Auto-advance to next step
    const currentIndex = intervention.workflow.findIndex(s => s.id === stepId);
    const nextStep = intervention.workflow[currentIndex + 1];
    if (nextStep) {
      setActiveStep(nextStep.id);
    }
  };

  const handleStepSkip = (stepId: string, reason: string) => {
    setIntervention(prev => ({
      ...prev,
      workflow: prev.workflow.map(step =>
        step.id === stepId
          ? { ...step, status: 'skipped', notes: `Skipped: ${reason}`, endTime: new Date() }
          : step
      )
    }));
  };

  const handleAddNote = (type: InterventionNote['type']) => {
    if (newNote.trim()) {
      const note: InterventionNote = {
        id: `note_${Date.now()}`,
        timestamp: new Date(),
        author: intervention.assignedCounselor,
        type,
        content: newNote.trim(),
        confidential: true
      };

      setIntervention(prev => ({
        ...prev,
        documentation: [...prev.documentation, note]
      }));
      setNewNote('');
    }
  };

  const handleEscalate = (reason: string, escalateTo: string, urgency: Escalation['urgency']) => {
    const escalation: Escalation = {
      id: `esc_${Date.now()}`,
      reason,
      escalatedTo: escalateTo,
      escalationTime: new Date(),
      urgency,
      status: 'pending'
    };

    setIntervention(prev => ({
      ...prev,
      escalations: [...prev.escalations, escalation]
    }));
  };

  const handleCompleteIntervention = async (outcome: CrisisIntervention['outcome'], summary: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Save intervention to database
      await fetchWithAuth('/api/crisis/interventions', {
        method: 'POST',
        body: JSON.stringify({
          clientId: intervention.clientInfo.phone, // Using phone as identifier
          type: intervention.contactMethod,
          riskAssessment: intervention.riskLevel,
          interventionsUsed: intervention.workflow
            .filter(step => step.status === 'completed')
            .map(step => step.name),
          outcome,
          referrals: intervention.referrals.map(r => r.agency),
          followUpScheduled: intervention.followUpActions[0]?.scheduledDate,
          notes: summary,
          duration: interventionTimer
        })
      });

      setIntervention(prev => ({
        ...prev,
        status: 'completed',
        endTime: new Date(),
        outcome,
        summary
      }));
    } catch (err) {
      console.error('Error completing intervention:', err);
      setError('Failed to save intervention');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'moderate': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'imminent': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'moderate': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'skipped': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const currentStep = intervention.workflow.find(step => step.id === activeStep);
  const completedSteps = intervention.workflow.filter(step => step.status === 'completed').length;
  const totalSteps = intervention.workflow.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-red-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-red-600" />
              Crisis Intervention Workflow
            </h2>
            <p className="text-gray-600 mt-1">
              Case #{intervention.id} • {intervention.assignedCounselor}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{interventionTimer}</div>
              <div className="text-sm text-gray-600">minutes</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-2 rounded-lg transition-colors ${
                  isPaused ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                }`}
              >
                {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to end this intervention?')) {
                    // Show completion modal
                  }
                }}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Client Info & Status */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Client Information</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Name:</strong> {intervention.clientInfo.name}</div>
              <div><strong>Age:</strong> {intervention.clientInfo.age || 'Unknown'}</div>
              <div><strong>Phone:</strong> {intervention.clientInfo.phone}</div>
              <div><strong>Location:</strong> {intervention.clientInfo.location || 'Unknown'}</div>
              {intervention.clientInfo.isMinor && (
                <div className="text-orange-600"><strong>Minor:</strong> Guardian notification required</div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Crisis Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span><strong>Priority:</strong></span>
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(intervention.priority)}`}>
                  {intervention.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span><strong>Risk:</strong></span>
                <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(intervention.riskLevel)}`}>
                  {intervention.riskLevel.toUpperCase()}
                </span>
              </div>
              <div><strong>Category:</strong> {intervention.category.replace('_', ' ')}</div>
              <div><strong>Contact:</strong> {intervention.contactMethod}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Steps Complete</span>
                <span>{completedSteps}/{totalSteps}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                Started: {format(intervention.startTime, 'MMM d, h:mm a')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Workflow Steps */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Intervention Steps</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRiskAssessment(true)}
                className="text-sm px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
              >
                Risk Assessment
              </button>
              <button
                onClick={() => setShowSafetyPlan(true)}
                className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                Safety Plan
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {intervention.workflow.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border-2 rounded-lg p-4 transition-all ${getStepStatusColor(step.status)} ${
                  step.id === activeStep ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.status === 'completed' ? 'bg-green-500 text-white' :
                        step.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        step.status === 'skipped' ? 'bg-yellow-500 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : step.status === 'skipped' ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{step.name}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      {step.required && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                      )}
                    </div>

                    {step.startTime && (
                      <div className="text-xs text-gray-500 mb-2">
                        Started: {format(step.startTime, 'h:mm a')}
                        {step.endTime && ` • Completed: ${format(step.endTime, 'h:mm a')} (${differenceInMinutes(step.endTime, step.startTime)} min)`}
                      </div>
                    )}

                    {step.notes && (
                      <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded mt-2">
                        <strong>Notes:</strong> {step.notes}
                      </div>
                    )}

                    {step.outcome && (
                      <div className="text-sm text-green-700 bg-green-100 p-2 rounded mt-2">
                        <strong>Outcome:</strong> {step.outcome}
                      </div>
                    )}
                  </div>

                  {/* Step Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {step.status === 'pending' && (
                      <button
                        onClick={() => handleStepStart(step.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Start
                      </button>
                    )}
                    
                    {step.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => {
                            const notes = prompt('Add completion notes (optional):');
                            const outcome = prompt('Describe the outcome:');
                            if (outcome) {
                              handleStepComplete(step.id, notes || undefined, outcome);
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Complete
                        </button>
                        
                        {!step.required && (
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for skipping this step:');
                              if (reason) {
                                handleStepSkip(step.id, reason);
                              }
                            }}
                            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                          >
                            Skip
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Current Step Details */}
          {currentStep && currentStep.status === 'in_progress' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Current Step: {currentStep.name}</h4>
              <p className="text-blue-800 text-sm mb-3">{currentStep.description}</p>
              
              {/* Step-specific guidance */}
              {currentStep.name === 'Risk Assessment' && (
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Key areas to assess:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Suicidal ideation, plan, and means</li>
                    <li>Previous suicide attempts</li>
                    <li>Current substance use</li>
                    <li>Mental health history</li>
                    <li>Social support systems</li>
                    <li>Protective factors</li>
                  </ul>
                </div>
              )}
              
              {currentStep.name === 'Crisis Intervention' && (
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Intervention techniques:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Active listening and validation</li>
                    <li>De-escalation techniques</li>
                    <li>Problem-solving approach</li>
                    <li>Coping skills reinforcement</li>
                    <li>Hope instillation</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const reason = prompt('Reason for escalation:');
                  const escalateTo = prompt('Escalate to (supervisor/emergency services):');
                  if (reason && escalateTo) {
                    handleEscalate(reason, escalateTo, 'urgent');
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <BellAlertIcon className="h-4 w-4" />
                Escalate
              </button>
              
              <button
                onClick={() => {
                  // Emergency services contact logic
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
              >
                <TruckIcon className="h-4 w-4" />
                Contact Emergency Services
              </button>
              
              <button
                onClick={() => setShowDocumentation(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Add Documentation
              </button>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Recent Documentation</h4>
            <div className="space-y-3">
              {intervention.documentation.slice(-3).map(note => (
                <div key={note.id} className="text-sm p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{note.type}</span>
                    <span className="text-xs text-gray-500">{format(note.timestamp, 'h:mm a')}</span>
                  </div>
                  <p className="text-gray-700">{note.content}</p>
                </div>
              ))}
              {intervention.documentation.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No documentation yet</p>
              )}
            </div>
            
            <div className="mt-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a quick note..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
                rows={2}
              />
              <button
                onClick={() => handleAddNote('general')}
                disabled={!newNote.trim()}
                className="mt-2 w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Alerts & Warnings */}
          {intervention.clientInfo.isMinor && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Minor Client Alert</h4>
              </div>
              <p className="text-sm text-yellow-700">
                Client is under 18. Guardian notification and consent may be required.
              </p>
            </div>
          )}

          {intervention.riskLevel === 'imminent' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-800">Imminent Risk</h4>
              </div>
              <p className="text-sm text-red-700">
                Client presents imminent risk. Consider immediate emergency intervention.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}