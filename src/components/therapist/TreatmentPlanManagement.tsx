'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';

interface TreatmentGoal {
  id: string;
  description: string;
  targetBehavior: string;
  measurableOutcome: string;
  timeline: string;
  interventions: string[];
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'modified' | 'discontinued';
  lastUpdated: Date;
  notes: string;
}

interface TreatmentPlan {
  id: string;
  clientId: string;
  clientName: string;
  clientAge: number;
  planType: 'initial' | 'updated' | 'continuing' | 'discharge';
  primaryDiagnosis: string;
  secondaryDiagnoses?: string[];
  treatmentModality: 'CBT' | 'DBT' | 'EMDR' | 'psychodynamic' | 'humanistic' | 'integrated';
  frequencyPerWeek: number;
  sessionDuration: number;
  estimatedTreatmentLength: string;
  treatmentGoals: TreatmentGoal[];
  riskFactors: string[];
  strengths: string[];
  supportSystem: string[];
  medications: { name: string; dosage: string; prescriber: string; }[];
  previousTreatment?: string;
  culturalConsiderations: string;
  barriers: string[];
  crisisProtocol: string;
  reviewDate: Date;
  createdDate: Date;
  lastModified: Date;
  createdBy: string;
  supervisorApproval: boolean;
  supervisorName?: string;
  clientConsent: boolean;
  insuranceAuthorized: boolean;
  authorizationExpiry?: Date;
  status: 'draft' | 'active' | 'under_review' | 'expired' | 'completed';
  tags: string[];
}

interface TreatmentPlanManagementProps {
  className?: string;
}

const mockTreatmentPlans: TreatmentPlan[] = [
  {
    id: 'tp001',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    clientAge: 28,
    planType: 'initial',
    primaryDiagnosis: 'F41.1 - Generalized Anxiety Disorder',
    secondaryDiagnoses: ['F32.1 - Major Depressive Episode, Moderate'],
    treatmentModality: 'CBT',
    frequencyPerWeek: 1,
    sessionDuration: 50,
    estimatedTreatmentLength: '12-16 sessions',
    treatmentGoals: [
      {
        id: 'goal001',
        description: 'Reduce anxiety symptoms and improve daily functioning',
        targetBehavior: 'Manage worry and physical symptoms of anxiety',
        measurableOutcome: 'Reduce GAD-7 score from 15 to 7 or below',
        timeline: '8-12 weeks',
        interventions: ['Cognitive restructuring', 'Relaxation training', 'Exposure exercises'],
        progress: 65,
        status: 'in_progress',
        lastUpdated: new Date('2024-01-10'),
        notes: 'Client showing good progress with thought challenging techniques'
      },
      {
        id: 'goal002',
        description: 'Improve sleep quality and establish healthy sleep routine',
        targetBehavior: 'Maintain consistent sleep schedule and reduce sleep anxiety',
        measurableOutcome: 'Sleep 7-8 hours nightly with sleep efficiency >85%',
        timeline: '4-6 weeks',
        interventions: ['Sleep hygiene education', 'Progressive muscle relaxation', 'Stimulus control'],
        progress: 80,
        status: 'in_progress',
        lastUpdated: new Date('2024-01-12'),
        notes: 'Significant improvement in sleep onset and maintenance'
      }
    ],
    riskFactors: ['History of panic attacks', 'Work-related stress', 'Perfectionist tendencies'],
    strengths: ['High motivation', 'Strong support system', 'Good insight', 'College educated'],
    supportSystem: ['Spouse', 'Close friends', 'Supportive work environment'],
    medications: [
      { name: 'Sertraline', dosage: '50mg daily', prescriber: 'Dr. Smith, MD' }
    ],
    previousTreatment: 'Brief counseling in college (2018-2019)',
    culturalConsiderations: 'Values work-life balance, prefers evidence-based approaches',
    barriers: ['Limited time due to work schedule', 'Tendency to intellectualize emotions'],
    crisisProtocol: 'Client to contact therapist or emergency services if experiencing suicidal ideation',
    reviewDate: new Date('2024-03-15'),
    createdDate: new Date('2024-01-02'),
    lastModified: new Date('2024-01-15'),
    createdBy: 'Dr. Emily Chen',
    supervisorApproval: true,
    supervisorName: 'Dr. Michael Roberts',
    clientConsent: true,
    insuranceAuthorized: true,
    authorizationExpiry: new Date('2024-06-01'),
    status: 'active',
    tags: ['anxiety', 'depression', 'CBT', 'working-adult']
  },
  {
    id: 'tp002',
    clientId: 'cl002',
    clientName: 'Michael Rodriguez',
    clientAge: 35,
    planType: 'updated',
    primaryDiagnosis: 'F43.10 - Post-traumatic Stress Disorder',
    treatmentModality: 'EMDR',
    frequencyPerWeek: 1,
    sessionDuration: 60,
    estimatedTreatmentLength: '15-20 sessions',
    treatmentGoals: [
      {
        id: 'goal003',
        description: 'Process traumatic memories and reduce PTSD symptoms',
        targetBehavior: 'Decrease avoidance behaviors and intrusive thoughts',
        measurableOutcome: 'Reduce PCL-5 score from 58 to below 33',
        timeline: '12-16 weeks',
        interventions: ['EMDR protocol', 'Resource installation', 'Somatic awareness'],
        progress: 45,
        status: 'in_progress',
        lastUpdated: new Date('2024-01-14'),
        notes: 'Client responding well to EMDR processing'
      },
      {
        id: 'goal004',
        description: 'Improve emotional regulation and coping skills',
        targetBehavior: 'Use healthy coping strategies when triggered',
        measurableOutcome: 'Demonstrate 3 effective coping strategies consistently',
        timeline: '6-8 weeks',
        interventions: ['Grounding techniques', 'Breathing exercises', 'Progressive muscle relaxation'],
        progress: 70,
        status: 'in_progress',
        lastUpdated: new Date('2024-01-10'),
        notes: 'Good progress with grounding techniques'
      }
    ],
    riskFactors: ['Hypervigilance', 'Sleep disturbances', 'Alcohol use for coping'],
    strengths: ['Military training resilience', 'Motivated for change', 'Supportive family'],
    supportSystem: ['Wife', 'Veteran support group', 'Brother'],
    medications: [
      { name: 'Prazosin', dosage: '2mg at bedtime', prescriber: 'Dr. Johnson, MD' }
    ],
    culturalConsiderations: 'Military background, values structure and direct communication',
    barriers: ['Stigma around mental health', 'Difficulty trusting others'],
    crisisProtocol: 'Veterans crisis line available 24/7, emergency contact: spouse',
    reviewDate: new Date('2024-02-20'),
    createdDate: new Date('2024-01-02'),
    lastModified: new Date('2024-01-14'),
    createdBy: 'Dr. Emily Chen',
    supervisorApproval: true,
    supervisorName: 'Dr. Michael Roberts',
    clientConsent: true,
    insuranceAuthorized: true,
    authorizationExpiry: new Date('2024-07-01'),
    status: 'active',
    tags: ['PTSD', 'EMDR', 'veteran', 'trauma']
  }
];

const treatmentModalityOptions = [
  { value: 'CBT', label: 'Cognitive Behavioral Therapy' },
  { value: 'DBT', label: 'Dialectical Behavior Therapy' },
  { value: 'EMDR', label: 'Eye Movement Desensitization' },
  { value: 'psychodynamic', label: 'Psychodynamic' },
  { value: 'humanistic', label: 'Humanistic' },
  { value: 'integrated', label: 'Integrated Approach' }
];

const planTypeOptions = [
  { value: 'initial', label: 'Initial Treatment Plan' },
  { value: 'updated', label: 'Updated Plan' },
  { value: 'continuing', label: 'Continuing Care' },
  { value: 'discharge', label: 'Discharge Plan' }
];

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' }
];

export default function TreatmentPlanManagement({ className = "" }: TreatmentPlanManagementProps) {
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>(mockTreatmentPlans);
  const [filteredPlans, setFilteredPlans] = useState<TreatmentPlan[]>(mockTreatmentPlans);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedModality, setSelectedModality] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);

  // Get unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(treatmentPlans.map(plan => plan.clientName)))
    .map(name => ({ value: name, label: name }));

  // Filter plans based on search criteria
  useEffect(() => {
    let filtered = treatmentPlans;

    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedClient) {
      filtered = filtered.filter(plan => plan.clientName === selectedClient);
    }

    if (selectedModality) {
      filtered = filtered.filter(plan => plan.treatmentModality === selectedModality);
    }

    if (selectedStatus) {
      filtered = filtered.filter(plan => plan.status === selectedStatus);
    }

    setFilteredPlans(filtered);
  }, [searchTerm, selectedClient, selectedModality, selectedStatus, treatmentPlans]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setSelectedModality('');
    setSelectedStatus('');
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  const handleEditPlan = (plan: TreatmentPlan) => {
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleViewPlan = (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleDeletePlan = (planId: string) => {
    setTreatmentPlans(prev => prev.filter(plan => plan.id !== planId));
  };

  const handleDuplicatePlan = (plan: TreatmentPlan) => {
    const duplicatedPlan: TreatmentPlan = {
      ...plan,
      id: `tp${Date.now()}`,
      planType: 'updated',
      status: 'draft',
      createdDate: new Date(),
      lastModified: new Date(),
      supervisorApproval: false,
      supervisorName: undefined
    };
    setTreatmentPlans(prev => [duplicatedPlan, ...prev]);
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'modified': return 'text-yellow-600 bg-yellow-50';
      case 'discontinued': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const calculateOverallProgress = (goals: TreatmentGoal[]) => {
    if (goals.length === 0) return 0;
    return Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length);
  };

  const isAuthorizationExpiring = (expiry?: Date) => {
    if (!expiry) return false;
    const daysUntilExpiry = differenceInDays(expiry, new Date());
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isAuthorizationExpired = (expiry?: Date) => {
    if (!expiry) return false;
    return isBefore(expiry, new Date());
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
              Treatment Plan Management
            </h2>
            <p className="text-gray-600 mt-1">
              Create and manage comprehensive treatment plans for clients
            </p>
          </div>
          <button
            onClick={handleCreatePlan}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Treatment Plan
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search plans, clients, or diagnoses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Clients</option>
                    {uniqueClients.map(client => (
                      <option key={client.value} value={client.value}>{client.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Modality</label>
                  <select
                    value={selectedModality}
                    onChange={(e) => setSelectedModality(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Modalities</option>
                    {treatmentModalityOptions.map(modality => (
                      <option key={modality.value} value={modality.value}>{modality.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Statuses</option>
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Treatment Plans List */}
      <div className="p-6">
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredPlans.map(plan => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewPlan(plan)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                      <h3 className="font-medium text-gray-900">{plan.clientName}</h3>
                      <span className="text-sm text-gray-500">
                        Age {plan.clientAge} • {plan.planType}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plan.status)}`}>
                        {statusOptions.find(s => s.value === plan.status)?.label}
                      </span>
                      {plan.supervisorApproval && (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" title="Supervisor Approved" />
                      )}
                      {isAuthorizationExpiring(plan.authorizationExpiry) && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" title="Authorization expiring soon" />
                      )}
                      {isAuthorizationExpired(plan.authorizationExpiry) && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="Authorization expired" />
                      )}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {plan.primaryDiagnosis}
                    </p>
                    {plan.secondaryDiagnoses && plan.secondaryDiagnoses.length > 0 && (
                      <p className="text-sm text-gray-600 mb-3">
                        Secondary: {plan.secondaryDiagnoses.join(', ')}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {plan.frequencyPerWeek}x/week • {plan.sessionDuration}min
                      </div>
                      <div>
                        Modality: {plan.treatmentModality}
                      </div>
                      <div>
                        Duration: {plan.estimatedTreatmentLength}
                      </div>
                      <div>
                        Review: {format(plan.reviewDate, 'MMM d, yyyy')}
                      </div>
                    </div>

                    {/* Goals Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Treatment Goals ({plan.treatmentGoals.length})
                        </span>
                        <span className="text-sm text-gray-600">
                          {calculateOverallProgress(plan.treatmentGoals)}% Complete
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${calculateOverallProgress(plan.treatmentGoals)}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {plan.treatmentGoals.map(goal => (
                          <span
                            key={goal.id}
                            className={`px-2 py-1 text-xs rounded-full ${getGoalStatusColor(goal.status)}`}
                          >
                            {goal.progress}% - {goal.description.substring(0, 30)}...
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {plan.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {plan.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Authorization Status */}
                    {plan.insuranceAuthorized && (
                      <div className="text-sm text-gray-500">
                        Insurance authorized until {plan.authorizationExpiry && format(plan.authorizationExpiry, 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPlan(plan);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Plan"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPlan(plan);
                      }}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Edit Plan"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePlan(plan);
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Duplicate Plan"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Print functionality would go here
                      }}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Print Plan"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this treatment plan?')) {
                          handleDeletePlan(plan.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Plan"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPlans.length === 0 && (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No treatment plans found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedClient || selectedModality || selectedStatus
                  ? "Try adjusting your search criteria or filters."
                  : "Create your first treatment plan to get started."}
              </p>
              <button
                onClick={handleCreatePlan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4" />
                Create Treatment Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Detail Modal */}
      <AnimatePresence>
        {showPlanModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Treatment Plan - {selectedPlan.clientName}
                </h2>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Plan Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Information</h3>
                    <div className="space-y-3 text-sm">
                      <div><strong>Client:</strong> {selectedPlan.clientName} (Age {selectedPlan.clientAge})</div>
                      <div><strong>Plan Type:</strong> {selectedPlan.planType}</div>
                      <div><strong>Primary Diagnosis:</strong> {selectedPlan.primaryDiagnosis}</div>
                      {selectedPlan.secondaryDiagnoses && (
                        <div><strong>Secondary Diagnoses:</strong> {selectedPlan.secondaryDiagnoses.join(', ')}</div>
                      )}
                      <div><strong>Treatment Modality:</strong> {selectedPlan.treatmentModality}</div>
                      <div><strong>Frequency:</strong> {selectedPlan.frequencyPerWeek}x/week, {selectedPlan.sessionDuration} minutes</div>
                      <div><strong>Estimated Length:</strong> {selectedPlan.estimatedTreatmentLength}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Approval</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <strong>Status:</strong>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPlan.status)}`}>
                          {statusOptions.find(s => s.value === selectedPlan.status)?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong>Supervisor Approval:</strong>
                        {selectedPlan.supervisorApproval ? (
                          <span className="text-green-600">✓ Approved by {selectedPlan.supervisorName}</span>
                        ) : (
                          <span className="text-red-600">Pending</span>
                        )}
                      </div>
                      <div><strong>Client Consent:</strong> {selectedPlan.clientConsent ? '✓ Obtained' : 'Pending'}</div>
                      <div><strong>Insurance:</strong> {selectedPlan.insuranceAuthorized ? 
                        `✓ Authorized until ${selectedPlan.authorizationExpiry && format(selectedPlan.authorizationExpiry, 'MMM d, yyyy')}` : 
                        'Not authorized'
                      }</div>
                      <div><strong>Created:</strong> {format(selectedPlan.createdDate, 'PPP')} by {selectedPlan.createdBy}</div>
                      <div><strong>Next Review:</strong> {format(selectedPlan.reviewDate, 'PPP')}</div>
                    </div>
                  </div>
                </div>

                {/* Treatment Goals */}
                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-4">Treatment Goals</h3>
                  <div className="space-y-4">
                    {selectedPlan.treatmentGoals.map((goal, index) => (
                      <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Goal {index + 1}: {goal.description}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getGoalStatusColor(goal.status)}`}>
                            {goal.status} ({goal.progress}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Target Behavior:</strong> {goal.targetBehavior}
                          </div>
                          <div>
                            <strong>Timeline:</strong> {goal.timeline}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Measurable Outcome:</strong> {goal.measurableOutcome}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Interventions:</strong> {goal.interventions.join(', ')}
                          </div>
                          {goal.notes && (
                            <div className="md:col-span-2">
                              <strong>Progress Notes:</strong> {goal.notes}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Last updated: {format(goal.lastUpdated, 'PPP')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Factors</h3>
                    <ul className="space-y-1">
                      {selectedPlan.riskFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Client Strengths</h3>
                    <ul className="space-y-1">
                      {selectedPlan.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Support System & Medications */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Support System</h3>
                    <ul className="space-y-1">
                      {selectedPlan.supportSystem.map((support, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                          {support}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Current Medications</h3>
                    <div className="space-y-2">
                      {selectedPlan.medications.map((med, index) => (
                        <div key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                          <strong>{med.name}</strong> - {med.dosage}
                          <br />
                          <span className="text-gray-500">Prescribed by: {med.prescriber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  {selectedPlan.previousTreatment && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Previous Treatment</h3>
                      <p className="text-gray-700 text-sm">{selectedPlan.previousTreatment}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Cultural Considerations</h3>
                    <p className="text-gray-700 text-sm">{selectedPlan.culturalConsiderations}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Treatment Barriers</h3>
                    <ul className="space-y-1">
                      {selectedPlan.barriers.map((barrier, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                          {barrier}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Crisis Protocol</h3>
                    <p className="text-gray-700 text-sm p-3 bg-red-50 border border-red-200 rounded-lg">
                      {selectedPlan.crisisProtocol}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}