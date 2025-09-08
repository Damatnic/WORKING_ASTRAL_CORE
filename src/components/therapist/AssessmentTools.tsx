'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentCheckIcon,
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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeIcon,
  PrinterIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { format, differenceInDays } from 'date-fns';

interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'scale' | 'multiple_choice' | 'text' | 'boolean' | 'checklist';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
  required: boolean;
  category?: string;
}

interface AssessmentResponse {
  questionId: string;
  value: string | number | string[];
  notes?: string;
}

interface AssessmentResult {
  id: string;
  assessmentId: string;
  clientId: string;
  clientName: string;
  administeredBy: string;
  dateAdministered: Date;
  responses: AssessmentResponse[];
  totalScore?: number;
  subscoreBreakdown?: { [category: string]: number };
  interpretation: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  recommendations: string[];
  followUpDate?: Date;
  status: 'completed' | 'in_progress' | 'scheduled' | 'cancelled';
  notes: string;
  previousResultId?: string;
  comparisonNotes?: string;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'screening' | 'diagnostic' | 'progress' | 'outcome' | 'risk';
  category: 'anxiety' | 'depression' | 'trauma' | 'substance' | 'personality' | 'cognitive' | 'general';
  questions: AssessmentQuestion[];
  scoringMethod: 'sum' | 'average' | 'weighted' | 'categorical';
  interpretationGuide: { [range: string]: string };
  timeToComplete: number; // minutes
  validated: boolean;
  version: string;
  lastUpdated: Date;
  usageCount: number;
}

interface AssessmentToolsProps {
  className?: string;
}

const mockAssessmentTemplates: AssessmentTemplate[] = [
  {
    id: 'gad7',
    name: 'GAD-7 (Generalized Anxiety Disorder)',
    description: 'A 7-item screening tool for generalized anxiety disorder',
    type: 'screening',
    category: 'anxiety',
    questions: [
      {
        id: 'gad7_1',
        question: 'Feeling nervous, anxious, or on edge',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 3,
        scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        required: true,
        category: 'anxiety_symptoms'
      },
      {
        id: 'gad7_2',
        question: 'Not being able to stop or control worrying',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 3,
        scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        required: true,
        category: 'anxiety_symptoms'
      },
      {
        id: 'gad7_3',
        question: 'Worrying too much about different things',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 3,
        scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        required: true,
        category: 'anxiety_symptoms'
      }
    ],
    scoringMethod: 'sum',
    interpretationGuide: {
      '0-4': 'Minimal anxiety',
      '5-9': 'Mild anxiety',
      '10-14': 'Moderate anxiety',
      '15-21': 'Severe anxiety'
    },
    timeToComplete: 5,
    validated: true,
    version: '1.0',
    lastUpdated: new Date('2024-01-01'),
    usageCount: 145
  },
  {
    id: 'phq9',
    name: 'PHQ-9 (Patient Health Questionnaire)',
    description: 'A 9-item screening tool for depression severity',
    type: 'screening',
    category: 'depression',
    questions: [
      {
        id: 'phq9_1',
        question: 'Little interest or pleasure in doing things',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 3,
        scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        required: true,
        category: 'depression_symptoms'
      },
      {
        id: 'phq9_2',
        question: 'Feeling down, depressed, or hopeless',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 3,
        scaleLabels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        required: true,
        category: 'depression_symptoms'
      }
    ],
    scoringMethod: 'sum',
    interpretationGuide: {
      '0-4': 'Minimal depression',
      '5-9': 'Mild depression',
      '10-14': 'Moderate depression',
      '15-19': 'Moderately severe depression',
      '20-27': 'Severe depression'
    },
    timeToComplete: 8,
    validated: true,
    version: '1.0',
    lastUpdated: new Date('2024-01-01'),
    usageCount: 132
  },
  {
    id: 'pcl5',
    name: 'PCL-5 (PTSD Checklist)',
    description: '20-item self-report measure of PTSD symptoms',
    type: 'screening',
    category: 'trauma',
    questions: [
      {
        id: 'pcl5_1',
        question: 'Repeated, disturbing, and unwanted memories of the stressful experience',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 4,
        scaleLabels: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'],
        required: true,
        category: 'intrusion'
      },
      {
        id: 'pcl5_2',
        question: 'Repeated, disturbing dreams of the stressful experience',
        type: 'scale',
        scaleMin: 0,
        scaleMax: 4,
        scaleLabels: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'],
        required: true,
        category: 'intrusion'
      }
    ],
    scoringMethod: 'sum',
    interpretationGuide: {
      '0-32': 'Below clinical threshold',
      '33-80': 'Above clinical threshold - PTSD likely'
    },
    timeToComplete: 15,
    validated: true,
    version: '1.0',
    lastUpdated: new Date('2024-01-01'),
    usageCount: 78
  }
];

const mockAssessmentResults: AssessmentResult[] = [
  {
    id: 'result001',
    assessmentId: 'gad7',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    administeredBy: 'Dr. Emily Chen',
    dateAdministered: new Date('2024-01-15'),
    responses: [
      { questionId: 'gad7_1', value: 2 },
      { questionId: 'gad7_2', value: 3 },
      { questionId: 'gad7_3', value: 2 }
    ],
    totalScore: 15,
    interpretation: 'Severe anxiety symptoms present. Client reports anxiety nearly every day across multiple domains.',
    riskLevel: 'high',
    recommendations: [
      'Consider immediate intervention strategies',
      'Weekly therapy sessions recommended',
      'Psychiatric evaluation for medication consideration',
      'Crisis safety plan review'
    ],
    followUpDate: new Date('2024-02-15'),
    status: 'completed',
    notes: 'Client was cooperative during assessment. Expressed relief at having symptoms validated.',
    previousResultId: 'result000',
    comparisonNotes: 'Score increased from 12 to 15 over past month. Symptoms worsening.'
  },
  {
    id: 'result002',
    assessmentId: 'phq9',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    administeredBy: 'Dr. Emily Chen',
    dateAdministered: new Date('2024-01-15'),
    responses: [
      { questionId: 'phq9_1', value: 1 },
      { questionId: 'phq9_2', value: 2 }
    ],
    totalScore: 8,
    interpretation: 'Mild depression symptoms present. Client shows some functional impairment.',
    riskLevel: 'moderate',
    recommendations: [
      'Continue current therapy approach',
      'Monitor mood symptoms weekly',
      'Behavioral activation strategies',
      'Sleep hygiene assessment'
    ],
    followUpDate: new Date('2024-02-15'),
    status: 'completed',
    notes: 'Client reports some improvement in mood since starting therapy.',
    previousResultId: 'result001b',
    comparisonNotes: 'Score decreased from 12 to 8. Showing improvement in depression symptoms.'
  },
  {
    id: 'result003',
    assessmentId: 'pcl5',
    clientId: 'cl002',
    clientName: 'Michael Rodriguez',
    administeredBy: 'Dr. Emily Chen',
    dateAdministered: new Date('2024-01-14'),
    responses: [
      { questionId: 'pcl5_1', value: 4 },
      { questionId: 'pcl5_2', value: 3 }
    ],
    totalScore: 58,
    interpretation: 'Significant PTSD symptoms present. Score well above clinical threshold.',
    riskLevel: 'severe',
    recommendations: [
      'Trauma-focused therapy (EMDR/CPT)',
      'Psychiatric consultation urgently recommended',
      'Crisis safety planning essential',
      'Consider intensive outpatient program'
    ],
    followUpDate: new Date('2024-02-14'),
    status: 'completed',
    notes: 'Client became emotional during assessment. Provided additional support and resources.',
    comparisonNotes: 'Initial assessment - no previous scores for comparison.'
  }
];

const assessmentCategories = [
  { value: 'anxiety', label: 'Anxiety Disorders', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'depression', label: 'Depression', color: 'bg-blue-100 text-blue-800' },
  { value: 'trauma', label: 'Trauma & PTSD', color: 'bg-red-100 text-red-800' },
  { value: 'substance', label: 'Substance Use', color: 'bg-purple-100 text-purple-800' },
  { value: 'personality', label: 'Personality', color: 'bg-pink-100 text-pink-800' },
  { value: 'cognitive', label: 'Cognitive', color: 'bg-green-100 text-green-800' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' }
];

const assessmentTypes = [
  { value: 'screening', label: 'Screening' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'progress', label: 'Progress Monitoring' },
  { value: 'outcome', label: 'Outcome Measurement' },
  { value: 'risk', label: 'Risk Assessment' }
];

export default function AssessmentTools({ className = "" }: AssessmentToolsProps) {
  const [assessmentTemplates] = useState<AssessmentTemplate[]>(mockAssessmentTemplates);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>(mockAssessmentResults);
  const [filteredTemplates, setFilteredTemplates] = useState<AssessmentTemplate[]>(mockAssessmentTemplates);
  const [filteredResults, setFilteredResults] = useState<AssessmentResult[]>(mockAssessmentResults);
  const [activeTab, setActiveTab] = useState<'templates' | 'results' | 'analytics'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showAdministerModal, setShowAdministerModal] = useState(false);

  // Get unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(assessmentResults.map(result => result.clientName)))
    .map(name => ({ value: name, label: name }));

  // Filter templates
  useEffect(() => {
    let filtered = assessmentTemplates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedType) {
      filtered = filtered.filter(template => template.type === selectedType);
    }

    setFilteredTemplates(filtered);
  }, [searchTerm, selectedCategory, selectedType, assessmentTemplates]);

  // Filter results
  useEffect(() => {
    let filtered = assessmentResults;

    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.interpretation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedClient) {
      filtered = filtered.filter(result => result.clientName === selectedClient);
    }

    setFilteredResults(filtered);
  }, [searchTerm, selectedClient, assessmentResults]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedClient('');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'severe': return 'text-red-700 bg-red-100';
      case 'high': return 'text-red-600 bg-red-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = assessmentCategories.find(c => c.value === category);
    return cat?.color || 'bg-gray-100 text-gray-800';
  };

  const getScoreInterpretation = (template: AssessmentTemplate, score: number) => {
    for (const [range, interpretation] of Object.entries(template.interpretationGuide)) {
      const [min, max] = range.split('-').map(n => parseInt(n));
      if (score >= min && (max === undefined || score <= max)) {
        return interpretation;
      }
    }
    return 'Score outside normal range';
  };

  const calculateProgressTrend = (currentResult: AssessmentResult) => {
    if (!currentResult.previousResultId) return null;
    
    const previousResult = assessmentResults.find(r => r.id === currentResult.previousResultId);
    if (!previousResult || !currentResult.totalScore || !previousResult.totalScore) return null;

    const change = currentResult.totalScore - previousResult.totalScore;
    const percentChange = Math.round((change / previousResult.totalScore) * 100);
    
    return {
      change,
      percentChange,
      direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable',
      previousScore: previousResult.totalScore,
      daysBetween: differenceInDays(currentResult.dateAdministered, previousResult.dateAdministered)
    };
  };

  const handleAdministerAssessment = (template: AssessmentTemplate) => {
    setSelectedTemplate(template);
    setShowAdministerModal(true);
  };

  const handleViewTemplate = (template: AssessmentTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleViewResult = (result: AssessmentResult) => {
    setSelectedResult(result);
    setShowResultModal(true);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DocumentCheckIcon className="h-6 w-6 text-indigo-600" />
              Assessment Tools & Progress Tracking
            </h2>
            <p className="text-gray-600 mt-1">
              Administer standardized assessments and track client progress
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { id: 'templates', label: 'Assessment Templates', icon: DocumentCheckIcon },
              { id: 'results', label: 'Results & History', icon: ChartBarIcon },
              { id: 'analytics', label: 'Progress Analytics', icon: ArrowTrendingUpIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'templates' ? "Search assessment templates..." : "Search results, clients..."}
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
                className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
              >
                {activeTab === 'templates' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Categories</option>
                        {assessmentCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Types</option>
                        {assessmentTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
                {activeTab === 'results' && (
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
                )}

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

      {/* Content */}
      <div className="p-6">
        {/* Assessment Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredTemplates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                          {assessmentCategories.find(c => c.value === template.category)?.label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                          {template.type}
                        </span>
                        {template.validated && (
                          <StarIcon className="h-4 w-4 text-yellow-500" title="Validated Assessment" />
                        )}
                      </div>

                      <p className="text-gray-600 mb-4">{template.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {template.timeToComplete} minutes
                        </div>
                        <div>
                          {template.questions.length} questions
                        </div>
                        <div>
                          Version {template.version}
                        </div>
                        <div>
                          Used {template.usageCount} times
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Last updated: {format(template.lastUpdated, 'MMM d, yyyy')}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 ml-4">
                      <button
                        onClick={() => handleViewTemplate(template)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleAdministerAssessment(template)}
                        className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Administer
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <DocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessment templates found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedCategory || selectedType
                    ? "Try adjusting your search criteria or filters."
                    : "Assessment templates will appear here."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Assessment Results Tab */}
        {activeTab === 'results' && (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredResults.map(result => {
                const template = assessmentTemplates.find(t => t.id === result.assessmentId);
                const trend = calculateProgressTrend(result);
                
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewResult(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          <h3 className="font-medium text-gray-900">{result.clientName}</h3>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">{template?.name}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(result.riskLevel)}`}>
                            {result.riskLevel} risk
                          </span>
                          {result.status === 'completed' && (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(result.dateAdministered, 'MMM d, yyyy')}
                          </div>
                          <div>
                            Administered by: {result.administeredBy}
                          </div>
                          {result.totalScore && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Score: {result.totalScore}</span>
                              {trend && (
                                <div className="flex items-center gap-1">
                                  {trend.direction === 'increase' ? (
                                    <ArrowTrendingUpIcon className="h-3 w-3 text-red-500" />
                                  ) : trend.direction === 'decrease' ? (
                                    <ArrowTrendingDownIcon className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <MinusIcon className="h-3 w-3 text-gray-500" />
                                  )}
                                  <span className={`text-xs ${
                                    trend.direction === 'increase' ? 'text-red-600' : 
                                    trend.direction === 'decrease' ? 'text-green-600' : 'text-gray-600'
                                  }`}>
                                    {trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {result.followUpDate && (
                            <div>
                              Follow-up: {format(result.followUpDate, 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3 line-clamp-2">{result.interpretation}</p>

                        {result.recommendations.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Key Recommendations:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {result.recommendations.slice(0, 2).map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                                  {rec}
                                </li>
                              ))}
                              {result.recommendations.length > 2 && (
                                <li className="text-indigo-600 text-xs">
                                  +{result.recommendations.length - 2} more recommendations
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {trend && (trend as any).comparisonNotes && (
                          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <strong>Progress Note:</strong> {(trend as any).comparisonNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResult(result);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Result"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Print functionality would go here
                          }}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Print Result"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessment results found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedClient
                    ? "Try adjusting your search criteria or filters."
                    : "Assessment results will appear here after administering assessments."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <ArrowTrendingUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Progress Analytics</h3>
            <p className="text-gray-600">
              Visual analytics and progress tracking charts will be displayed here.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Client Progress Trends</h4>
                <p className="text-sm text-gray-600">Track symptom severity changes over time</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Assessment Usage Statistics</h4>
                <p className="text-sm text-gray-600">Most used assessments and completion rates</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      <AnimatePresence>
        {showTemplateModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate.name}
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-gray-700 mb-4">{selectedTemplate.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Category:</strong> {assessmentCategories.find(c => c.value === selectedTemplate.category)?.label}</div>
                    <div><strong>Type:</strong> {selectedTemplate.type}</div>
                    <div><strong>Questions:</strong> {selectedTemplate.questions.length}</div>
                    <div><strong>Time to Complete:</strong> {selectedTemplate.timeToComplete} minutes</div>
                    <div><strong>Validated:</strong> {selectedTemplate.validated ? 'Yes' : 'No'}</div>
                    <div><strong>Usage Count:</strong> {selectedTemplate.usageCount}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Questions</h3>
                  <div className="space-y-4">
                    {selectedTemplate.questions.slice(0, 3).map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="font-medium text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Type: {question.type} • {question.required ? 'Required' : 'Optional'}
                        </p>
                        {question.scaleLabels && (
                          <div className="text-sm text-gray-600">
                            Response options: {question.scaleLabels.join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedTemplate.questions.length > 3 && (
                      <p className="text-sm text-gray-600 text-center">
                        ...and {selectedTemplate.questions.length - 3} more questions
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Scoring & Interpretation</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Scoring Method:</strong> {selectedTemplate.scoringMethod}
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Interpretation Guide:</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(selectedTemplate.interpretationGuide).map(([range, interpretation]) => (
                          <div key={range} className="flex justify-between">
                            <span className="font-medium">{range}:</span>
                            <span>{interpretation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      handleAdministerAssessment(selectedTemplate);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Administer Assessment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Detail Modal */}
      <AnimatePresence>
        {showResultModal && selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Assessment Result - {selectedResult.clientName}
                </h2>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Result Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Assessment:</strong> {assessmentTemplates.find(t => t.id === selectedResult.assessmentId)?.name}</div>
                      <div><strong>Client:</strong> {selectedResult.clientName}</div>
                      <div><strong>Date Administered:</strong> {format(selectedResult.dateAdministered, 'PPP')}</div>
                      <div><strong>Administered by:</strong> {selectedResult.administeredBy}</div>
                      <div><strong>Status:</strong> {selectedResult.status}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Results Summary</h3>
                    <div className="space-y-2 text-sm">
                      {selectedResult.totalScore && (
                        <div><strong>Total Score:</strong> {selectedResult.totalScore}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <strong>Risk Level:</strong>
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(selectedResult.riskLevel)}`}>
                          {selectedResult.riskLevel}
                        </span>
                      </div>
                      {selectedResult.followUpDate && (
                        <div><strong>Follow-up Date:</strong> {format(selectedResult.followUpDate, 'PPP')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Clinical Interpretation</h3>
                  <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{selectedResult.interpretation}</p>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Clinical Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progress Comparison */}
                {selectedResult.comparisonNotes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Progress Comparison</h3>
                    <p className="text-gray-700 bg-green-50 p-4 rounded-lg">{selectedResult.comparisonNotes}</p>
                  </div>
                )}

                {/* Clinical Notes */}
                {selectedResult.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Clinical Notes</h3>
                    <p className="text-gray-700">{selectedResult.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}