'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  PrinterIcon,
  ShareIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format, differenceInYears } from 'date-fns';

interface AssessmentQuestion {
  id: string;
  category: 'demographic' | 'current_crisis' | 'risk_factors' | 'protective_factors' | 'mental_state' | 'safety_planning';
  question: string;
  type: 'multiple_choice' | 'yes_no' | 'scale' | 'text' | 'date' | 'number';
  options?: string[];
  weight: number;
  required: boolean;
}

interface AssessmentResponse {
  questionId: string;
  value: string | number | boolean;
  notes?: string;
}

interface RiskFactor {
  id: string;
  category: 'high_risk' | 'moderate_risk' | 'protective';
  factor: string;
  description: string;
  present: boolean;
  severity?: 'low' | 'moderate' | 'high';
}

interface CrisisAssessment {
  id: string;
  clientId: string;
  clientInfo: {
    name: string;
    age: number;
    phone: string;
    email?: string;
    address?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  assessmentType: 'initial' | 'follow_up' | 'discharge' | 'emergency';
  startTime: Date;
  completedTime?: Date;
  assessor: {
    id: string;
    name: string;
    credentials: string;
  };
  responses: AssessmentResponse[];
  riskFactors: RiskFactor[];
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  recommendations: string[];
  interventions: string[];
  safetyPlanRequired: boolean;
  followUpRequired: boolean;
  followUpDate?: Date;
  status: 'in_progress' | 'completed' | 'reviewed' | 'archived';
  notes: string;
  attachments?: string[];
}

const mockAssessments: CrisisAssessment[] = [
  {
    id: 'assessment-1',
    clientId: 'client-001',
    clientInfo: {
      name: 'Sarah Johnson',
      age: 28,
      phone: '+1 (555) 123-4567',
      email: 'sarah.j@email.com',
      address: '123 Main St, City, State 12345',
      emergencyContact: {
        name: 'Michael Johnson',
        relationship: 'Spouse',
        phone: '+1 (555) 987-6543'
      }
    },
    assessmentType: 'initial',
    startTime: new Date('2024-01-15T14:30:00'),
    completedTime: new Date('2024-01-15T15:45:00'),
    assessor: {
      id: 'counselor-001',
      name: 'Dr. Emily Chen',
      credentials: 'PhD, LCSW'
    },
    responses: [],
    riskFactors: [
      {
        id: 'rf-1',
        category: 'high_risk',
        factor: 'Suicidal Ideation',
        description: 'Active thoughts of self-harm with plan',
        present: true,
        severity: 'high'
      },
      {
        id: 'rf-2',
        category: 'high_risk',
        factor: 'Previous Attempt',
        description: 'History of suicide attempt within last 6 months',
        present: true,
        severity: 'high'
      },
      {
        id: 'rf-3',
        category: 'protective',
        factor: 'Strong Support System',
        description: 'Active family and friend support network',
        present: true
      }
    ],
    riskScore: 85,
    riskLevel: 'high',
    recommendations: [
      'Immediate safety planning required',
      'Consider inpatient psychiatric evaluation',
      'Remove means of self-harm from environment',
      'Arrange 24/7 supervision until stabilized'
    ],
    interventions: [
      'Crisis intervention counseling',
      'Safety plan development',
      'Family notification and support',
      'Psychiatric consultation scheduled'
    ],
    safetyPlanRequired: true,
    followUpRequired: true,
    followUpDate: new Date('2024-01-16T10:00:00'),
    status: 'completed',
    notes: 'Client expressing active suicidal ideation with specific plan. Cooperative with assessment. Strong family support present. Immediate intervention implemented.',
    attachments: ['safety-plan-001.pdf', 'risk-assessment-001.pdf']
  },
  {
    id: 'assessment-2',
    clientId: 'client-002',
    clientInfo: {
      name: 'Marcus Williams',
      age: 34,
      phone: '+1 (555) 234-5678',
      emergencyContact: {
        name: 'Lisa Williams',
        relationship: 'Sister',
        phone: '+1 (555) 876-5432'
      }
    },
    assessmentType: 'follow_up',
    startTime: new Date('2024-01-15T16:00:00'),
    completedTime: new Date('2024-01-15T16:30:00'),
    assessor: {
      id: 'counselor-002',
      name: 'James Rodriguez',
      credentials: 'MS, LPC'
    },
    responses: [],
    riskFactors: [
      {
        id: 'rf-4',
        category: 'moderate_risk',
        factor: 'Depression',
        description: 'Moderate depressive symptoms',
        present: true,
        severity: 'moderate'
      },
      {
        id: 'rf-5',
        category: 'protective',
        factor: 'Treatment Engagement',
        description: 'Actively participating in therapy',
        present: true
      }
    ],
    riskScore: 45,
    riskLevel: 'moderate',
    recommendations: [
      'Continue current therapy',
      'Monitor mood stability',
      'Medication compliance review'
    ],
    interventions: [
      'Supportive counseling',
      'Coping skills reinforcement',
      'Medication adherence support'
    ],
    safetyPlanRequired: false,
    followUpRequired: true,
    followUpDate: new Date('2024-01-22T16:00:00'),
    status: 'completed',
    notes: 'Significant improvement since last assessment. Client reports better mood stability and engagement with treatment.',
    attachments: ['progress-notes-002.pdf']
  }
];

const assessmentQuestions: AssessmentQuestion[] = [
  // Demographic Information
  {
    id: 'demo-1',
    category: 'demographic',
    question: 'What is your current age?',
    type: 'number',
    weight: 0,
    required: true
  },
  {
    id: 'demo-2',
    category: 'demographic',
    question: 'What is your gender identity?',
    type: 'multiple_choice',
    options: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'],
    weight: 0,
    required: false
  },
  
  // Current Crisis
  {
    id: 'crisis-1',
    category: 'current_crisis',
    question: 'Are you currently having thoughts of hurting yourself?',
    type: 'yes_no',
    weight: 25,
    required: true
  },
  {
    id: 'crisis-2',
    category: 'current_crisis',
    question: 'Do you have a specific plan for how you would hurt yourself?',
    type: 'yes_no',
    weight: 20,
    required: true
  },
  {
    id: 'crisis-3',
    category: 'current_crisis',
    question: 'How intense are your thoughts of self-harm right now? (1-10)',
    type: 'scale',
    weight: 15,
    required: true
  },
  {
    id: 'crisis-4',
    category: 'current_crisis',
    question: 'Are you currently having thoughts of hurting others?',
    type: 'yes_no',
    weight: 25,
    required: true
  },
  
  // Risk Factors
  {
    id: 'risk-1',
    category: 'risk_factors',
    question: 'Have you ever attempted suicide before?',
    type: 'yes_no',
    weight: 20,
    required: true
  },
  {
    id: 'risk-2',
    category: 'risk_factors',
    question: 'Do you have access to means of self-harm (weapons, medications, etc.)?',
    type: 'yes_no',
    weight: 15,
    required: true
  },
  {
    id: 'risk-3',
    category: 'risk_factors',
    question: 'Have you been using alcohol or drugs today?',
    type: 'yes_no',
    weight: 10,
    required: true
  },
  {
    id: 'risk-4',
    category: 'risk_factors',
    question: 'Have you experienced a significant loss recently (job, relationship, death)?',
    type: 'yes_no',
    weight: 10,
    required: true
  },
  
  // Protective Factors
  {
    id: 'protect-1',
    category: 'protective_factors',
    question: 'Do you have people you can talk to for support?',
    type: 'yes_no',
    weight: -10,
    required: true
  },
  {
    id: 'protect-2',
    category: 'protective_factors',
    question: 'Are you currently receiving mental health treatment?',
    type: 'yes_no',
    weight: -10,
    required: true
  },
  {
    id: 'protect-3',
    category: 'protective_factors',
    question: 'Do you have children or others who depend on you?',
    type: 'yes_no',
    weight: -15,
    required: true
  },
  
  // Mental State
  {
    id: 'mental-1',
    category: 'mental_state',
    question: 'How would you rate your current mood? (1-10, 1=very poor, 10=excellent)',
    type: 'scale',
    weight: 5,
    required: true
  },
  {
    id: 'mental-2',
    category: 'mental_state',
    question: 'How well are you sleeping?',
    type: 'multiple_choice',
    options: ['Very well', 'Well', 'Poorly', 'Very poorly', 'Not at all'],
    weight: 3,
    required: true
  },
  {
    id: 'mental-3',
    category: 'mental_state',
    question: 'Are you hearing voices or seeing things others cannot?',
    type: 'yes_no',
    weight: 15,
    required: true
  }
];

export default function CrisisAssessmentTools() {
  const [assessments, setAssessments] = useState<CrisisAssessment[]>(mockAssessments);
  const [activeView, setActiveView] = useState<'list' | 'new' | 'view' | 'results'>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<CrisisAssessment | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'initial' | 'follow_up' | 'emergency'>('all');

  const handleStartNewAssessment = useCallback(() => {
    setActiveView('new');
    setCurrentQuestion(0);
    setResponses([]);
  }, []);

  const handleQuestionResponse = useCallback((questionId: string, value: string | number | boolean) => {
    setResponses(prev => {
      const existing = prev.find(r => r.questionId === questionId);
      if (existing) {
        return prev.map(r => r.questionId === questionId ? { ...r, value } : r);
      }
      return [...prev, { questionId, value }];
    });
  }, []);

  const calculateRiskScore = useCallback((responses: AssessmentResponse[]): number => {
    let score = 0;
    responses.forEach(response => {
      const question = assessmentQuestions.find(q => q.id === response.questionId);
      if (question) {
        let questionScore = 0;
        if (question.type === 'yes_no' && response.value === true) {
          questionScore = question.weight;
        } else if (question.type === 'scale' && typeof response.value === 'number') {
          questionScore = (response.value / 10) * question.weight;
        } else if (question.type === 'multiple_choice') {
          // Score based on option position (higher index = higher risk for most questions)
          const optionIndex = question.options?.indexOf(response.value as string) ?? 0;
          questionScore = (optionIndex / ((question.options?.length ?? 1) - 1)) * question.weight;
        }
        score += questionScore;
      }
    });
    return Math.max(0, Math.min(100, score));
  }, []);

  const getRiskLevel = useCallback((score: number): 'low' | 'moderate' | 'high' | 'imminent' => {
    if (score >= 80) return 'imminent';
    if (score >= 60) return 'high';
    if (score >= 30) return 'moderate';
    return 'low';
  }, []);

  const handleCompleteAssessment = useCallback(() => {
    const riskScore = calculateRiskScore(responses);
    const riskLevel = getRiskLevel(riskScore);
    
    const newAssessment: CrisisAssessment = {
      id: `assessment-${Date.now()}`,
      clientId: `client-${Date.now()}`,
      clientInfo: {
        name: 'New Client',
        age: 30,
        phone: '+1 (555) 000-0000'
      },
      assessmentType: 'initial',
      startTime: new Date(),
      completedTime: new Date(),
      assessor: {
        id: 'current-user',
        name: 'Current Counselor',
        credentials: 'LCSW'
      },
      responses,
      riskFactors: [],
      riskScore,
      riskLevel,
      recommendations: [],
      interventions: [],
      safetyPlanRequired: riskLevel === 'high' || riskLevel === 'imminent',
      followUpRequired: riskLevel !== 'low',
      status: 'completed',
      notes: ''
    };

    setAssessments(prev => [newAssessment, ...prev]);
    setSelectedAssessment(newAssessment);
    setActiveView('results');
  }, [responses, calculateRiskScore, getRiskLevel]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'imminent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredAssessments = filterType === 'all' 
    ? assessments 
    : assessments.filter(a => a.assessmentType === filterType);

  if (activeView === 'new') {
    const currentQ = assessmentQuestions[currentQuestion];
    const currentResponse = responses.find(r => r.questionId === currentQ?.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crisis Risk Assessment</h2>
            <p className="text-gray-600">Question {currentQuestion + 1} of {assessmentQuestions.length}</p>
          </div>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel Assessment
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / assessmentQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {currentQ && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentQ.question}
                </h3>
                {currentQ.required && (
                  <p className="text-sm text-red-600">* Required</p>
                )}
              </div>

              <div className="space-y-3">
                {currentQ.type === 'yes_no' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleQuestionResponse(currentQ.id, true)}
                      className={`px-6 py-3 rounded-lg border ${
                        currentResponse?.value === true
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleQuestionResponse(currentQ.id, false)}
                      className={`px-6 py-3 rounded-lg border ${
                        currentResponse?.value === false
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}

                {currentQ.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {currentQ.options?.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleQuestionResponse(currentQ.id, option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border ${
                          currentResponse?.value === option
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {currentQ.type === 'scale' && (
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={currentResponse?.value as number || 5}
                      onChange={(e) => handleQuestionResponse(currentQ.id, parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>1</span>
                      <span className="font-medium">Current: {currentResponse?.value || 5}</span>
                      <span>10</span>
                    </div>
                  </div>
                )}

                {currentQ.type === 'number' && (
                  <input
                    type="number"
                    value={currentResponse?.value as number || ''}
                    onChange={(e) => handleQuestionResponse(currentQ.id, parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter number"
                  />
                )}

                {currentQ.type === 'text' && (
                  <textarea
                    value={currentResponse?.value as string || ''}
                    onChange={(e) => handleQuestionResponse(currentQ.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter your response"
                  />
                )}
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {currentQuestion === assessmentQuestions.length - 1 ? (
                  <button
                    onClick={handleCompleteAssessment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Complete Assessment
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                    disabled={currentQ.required && !currentResponse}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeView === 'results' && selectedAssessment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assessment Results</h2>
            <p className="text-gray-600">Risk evaluation completed</p>
          </div>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Return to List
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risk Assessment Summary</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(selectedAssessment.riskLevel)}`}>
                  {selectedAssessment.riskLevel.charAt(0).toUpperCase() + selectedAssessment.riskLevel.slice(1)} Risk
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Risk Score</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedAssessment.riskScore}/100</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Assessment Type</p>
                  <p className="text-lg font-medium text-gray-900 capitalize">
                    {selectedAssessment.assessmentType.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      selectedAssessment.riskLevel === 'imminent' ? 'bg-red-600' :
                      selectedAssessment.riskLevel === 'high' ? 'bg-orange-500' :
                      selectedAssessment.riskLevel === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${selectedAssessment.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Imminent</span>
                </div>
              </div>

              {selectedAssessment.safetyPlanRequired && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Safety Plan Required</h4>
                      <p className="text-sm text-red-700">
                        This assessment indicates immediate safety planning is necessary.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {selectedAssessment.recommendations.length > 0 ? (
                  selectedAssessment.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 italic">No specific recommendations generated</li>
                )}
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interventions</h3>
              <ul className="space-y-2">
                {selectedAssessment.interventions.length > 0 ? (
                  selectedAssessment.interventions.map((intervention, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{intervention}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 italic">No interventions recorded</li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedAssessment.clientInfo.name}</p>
                    <p className="text-sm text-gray-600">Age: {selectedAssessment.clientInfo.age}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-700">{selectedAssessment.clientInfo.phone}</span>
                </div>
                
                {selectedAssessment.clientInfo.email && (
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">{selectedAssessment.clientInfo.email}</span>
                  </div>
                )}
                
                {selectedAssessment.clientInfo.emergencyContact && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-2">Emergency Contact</p>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">
                        {selectedAssessment.clientInfo.emergencyContact.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedAssessment.clientInfo.emergencyContact.relationship}
                      </p>
                      <p className="text-sm text-gray-700">
                        {selectedAssessment.clientInfo.emergencyContact.phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Details</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Start Time</p>
                    <p className="text-gray-900">{format(selectedAssessment.startTime, 'PPp')}</p>
                  </div>
                </div>
                
                {selectedAssessment.completedTime && (
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Duration</p>
                      <p className="text-gray-900">
                        {Math.round((selectedAssessment.completedTime.getTime() - selectedAssessment.startTime.getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assessor</p>
                    <p className="text-gray-900">{selectedAssessment.assessor.name}</p>
                    <p className="text-sm text-gray-600">{selectedAssessment.assessor.credentials}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Report
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Share Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'view' && selectedAssessment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assessment Details</h2>
            <p className="text-gray-600">{selectedAssessment.clientInfo.name} - {format(selectedAssessment.startTime, 'PPp')}</p>
          </div>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{selectedAssessment.riskScore}</p>
              <p className="text-sm text-gray-600">Risk Score</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-medium ${getRiskLevelColor(selectedAssessment.riskLevel).split(' ')[0]}`}>
                {selectedAssessment.riskLevel.charAt(0).toUpperCase() + selectedAssessment.riskLevel.slice(1)}
              </p>
              <p className="text-sm text-gray-600">Risk Level</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 capitalize">
                {selectedAssessment.assessmentType.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600">Type</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-medium ${
                selectedAssessment.status === 'completed' ? 'text-green-600' :
                selectedAssessment.status === 'in_progress' ? 'text-yellow-600' :
                selectedAssessment.status === 'reviewed' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1).replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600">Status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factors</h3>
              <div className="space-y-3">
                {selectedAssessment.riskFactors.map((factor) => (
                  <div key={factor.id} className="flex items-start">
                    {factor.category === 'protective' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                    ) : (
                      <XCircleIcon className={`h-5 w-5 mt-0.5 mr-2 ${
                        factor.category === 'high_risk' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{factor.factor}</p>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                      {factor.severity && (
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          factor.severity === 'high' ? 'bg-red-100 text-red-800' :
                          factor.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {factor.severity} severity
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{selectedAssessment.notes || 'No notes recorded.'}</p>
              </div>

              {selectedAssessment.followUpRequired && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Follow-up Required</h4>
                      {selectedAssessment.followUpDate && (
                        <p className="text-sm text-yellow-700">
                          Scheduled for {format(selectedAssessment.followUpDate, 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Crisis Assessment Tools</h2>
          <p className="text-gray-600">Comprehensive risk evaluation and assessment management</p>
        </div>
        <button
          onClick={handleStartNewAssessment}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
          New Assessment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-gray-900">{assessments.length}</div>
          <div className="text-sm text-gray-600">Total Assessments</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-red-600">
            {assessments.filter(a => a.riskLevel === 'imminent' || a.riskLevel === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Risk</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {assessments.filter(a => a.riskLevel === 'moderate').length}
          </div>
          <div className="text-sm text-gray-600">Moderate Risk</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {assessments.filter(a => a.safetyPlanRequired).length}
          </div>
          <div className="text-sm text-gray-600">Safety Plans Required</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Assessment History</h3>
            <div className="flex space-x-2">
              {(['all', 'initial', 'follow_up', 'emergency'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    filterType === type
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssessments.map((assessment) => (
                <motion.tr
                  key={assessment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assessment.clientInfo.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Age {assessment.clientInfo.age}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {assessment.assessmentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.riskLevel)}`}>
                      {assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assessment.riskScore}/100
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(assessment.startTime, 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      assessment.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedAssessment(assessment);
                        setActiveView('view');
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAssessment(assessment);
                        setActiveView('results');
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      View Results
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}