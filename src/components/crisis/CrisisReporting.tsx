'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

interface CrisisIncident {
  id: string;
  incidentNumber: string;
  clientId: string;
  clientInfo: {
    name: string;
    age: number;
    phone: string;
    mrn?: string;
  };
  incidentDate: Date;
  reportedDate: Date;
  reportedBy: {
    id: string;
    name: string;
    role: string;
    credentials?: string;
  };
  incidentType: 'suicidal_ideation' | 'suicide_attempt' | 'self_harm' | 'violence_threat' | 'domestic_violence' | 'substance_abuse' | 'psychotic_episode' | 'medical_emergency' | 'other';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  location: string;
  description: string;
  precipitatingFactors: string[];
  warningSignsPresent: string[];
  interventionsProvided: {
    type: 'crisis_counseling' | 'safety_planning' | 'medication_adjustment' | 'hospitalization' | 'family_notification' | 'emergency_services' | 'follow_up_scheduling' | 'other';
    description: string;
    providedBy: string;
    timestamp: Date;
  }[];
  outcome: 'stabilized' | 'referred_inpatient' | 'referred_outpatient' | 'transferred_emergency' | 'deceased' | 'left_ama' | 'ongoing';
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpCompleted?: boolean;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'archived';
  reviewedBy?: {
    id: string;
    name: string;
    role: string;
    reviewDate: Date;
    comments?: string;
  };
  attachments: string[];
  confidentialityLevel: 'standard' | 'restricted' | 'highly_confidential';
  legalNotificationRequired: boolean;
  legalNotificationCompleted?: boolean;
  qualityAssuranceReview?: {
    reviewerId: string;
    reviewerName: string;
    reviewDate: Date;
    findings: string;
    recommendations: string[];
    followUpActions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ReportingMetrics {
  totalIncidents: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  incidentsByOutcome: Record<string, number>;
  averageResponseTime: number;
  followUpCompliance: number;
  monthlyTrends: Array<{
    month: string;
    count: number;
    severity: Record<string, number>;
  }>;
  topPrecipitatingFactors: Array<{
    factor: string;
    count: number;
    percentage: number;
  }>;
  interventionEffectiveness: Array<{
    intervention: string;
    successRate: number;
    totalUses: number;
  }>;
}

const mockIncidents: CrisisIncident[] = [
  {
    id: 'incident-1',
    incidentNumber: 'CI-2024-001',
    clientId: 'client-001',
    clientInfo: {
      name: 'Sarah Johnson',
      age: 28,
      phone: '+1 (555) 123-4567',
      mrn: 'MRN-001234'
    },
    incidentDate: new Date('2024-01-15T14:30:00'),
    reportedDate: new Date('2024-01-15T15:00:00'),
    reportedBy: {
      id: 'counselor-001',
      name: 'Dr. Emily Chen',
      role: 'Crisis Counselor',
      credentials: 'PhD, LCSW'
    },
    incidentType: 'suicidal_ideation',
    severity: 'high',
    location: 'Crisis Center - Room 102',
    description: 'Client presented with active suicidal ideation with specific plan involving medication overdose. Expressed feelings of hopelessness and worthlessness following recent job loss and relationship ending. Client was cooperative during assessment but expressed intent to harm self within 24-48 hours.',
    precipitatingFactors: ['Job loss', 'Relationship breakup', 'Financial stress', 'Social isolation'],
    warningSignsPresent: ['Specific suicide plan', 'Access to means', 'Recent losses', 'Social withdrawal', 'Hopelessness'],
    interventionsProvided: [
      {
        type: 'crisis_counseling',
        description: 'Conducted comprehensive crisis assessment and safety planning',
        providedBy: 'Dr. Emily Chen',
        timestamp: new Date('2024-01-15T14:45:00')
      },
      {
        type: 'safety_planning',
        description: 'Developed detailed safety plan with client including coping strategies and support contacts',
        providedBy: 'Dr. Emily Chen',
        timestamp: new Date('2024-01-15T15:30:00')
      },
      {
        type: 'family_notification',
        description: 'Contacted emergency contact (spouse) with client consent for support',
        providedBy: 'Dr. Emily Chen',
        timestamp: new Date('2024-01-15T16:00:00')
      }
    ],
    outcome: 'stabilized',
    followUpRequired: true,
    followUpDate: new Date('2024-01-16T10:00:00'),
    followUpCompleted: true,
    status: 'approved',
    reviewedBy: {
      id: 'supervisor-001',
      name: 'Dr. Michael Rodriguez',
      role: 'Clinical Supervisor',
      reviewDate: new Date('2024-01-16T09:00:00'),
      comments: 'Appropriate interventions implemented. Good documentation of risk factors and safety planning.'
    },
    attachments: ['safety-plan-001.pdf', 'risk-assessment-001.pdf', 'crisis-notes-001.pdf'],
    confidentialityLevel: 'standard',
    legalNotificationRequired: false,
    qualityAssuranceReview: {
      reviewerId: 'qa-001',
      reviewerName: 'Jane Smith, RN',
      reviewDate: new Date('2024-01-17T14:00:00'),
      findings: 'Comprehensive assessment and intervention provided. Documentation complete and thorough.',
      recommendations: ['Continue current safety planning approach', 'Consider additional family involvement'],
      followUpActions: ['Schedule QA follow-up in 30 days', 'Monitor client progress']
    },
    createdAt: new Date('2024-01-15T15:00:00'),
    updatedAt: new Date('2024-01-17T14:00:00')
  },
  {
    id: 'incident-2',
    incidentNumber: 'CI-2024-002',
    clientId: 'client-002',
    clientInfo: {
      name: 'Marcus Williams',
      age: 34,
      phone: '+1 (555) 234-5678',
      mrn: 'MRN-005678'
    },
    incidentDate: new Date('2024-01-14T20:15:00'),
    reportedDate: new Date('2024-01-14T21:00:00'),
    reportedBy: {
      id: 'counselor-002',
      name: 'James Rodriguez',
      role: 'Crisis Counselor',
      credentials: 'MS, LPC'
    },
    incidentType: 'violence_threat',
    severity: 'critical',
    location: 'Emergency Department',
    description: 'Client brought to ED by police following threats made toward ex-partner. Client exhibited agitated behavior, paranoid ideation, and made specific threats of violence. Appeared to be under influence of substances.',
    precipitatingFactors: ['Substance use', 'Relationship conflict', 'Legal issues', 'Paranoid thoughts'],
    warningSignsPresent: ['Specific threats', 'Agitation', 'Substance use', 'Access to weapons', 'History of violence'],
    interventionsProvided: [
      {
        type: 'crisis_counseling',
        description: 'De-escalation techniques and crisis intervention',
        providedBy: 'James Rodriguez',
        timestamp: new Date('2024-01-14T20:30:00')
      },
      {
        type: 'medication_adjustment',
        description: 'Administered emergency medication for agitation',
        providedBy: 'Dr. Sarah Johnson, MD',
        timestamp: new Date('2024-01-14T21:15:00')
      },
      {
        type: 'emergency_services',
        description: 'Law enforcement notified of threats, safety plan initiated',
        providedBy: 'James Rodriguez',
        timestamp: new Date('2024-01-14T21:30:00')
      }
    ],
    outcome: 'referred_inpatient',
    followUpRequired: true,
    followUpDate: new Date('2024-01-21T10:00:00'),
    followUpCompleted: false,
    status: 'approved',
    reviewedBy: {
      id: 'supervisor-001',
      name: 'Dr. Michael Rodriguez',
      role: 'Clinical Supervisor',
      reviewDate: new Date('2024-01-15T08:00:00'),
      comments: 'Appropriate safety measures taken. Legal notification requirements met.'
    },
    attachments: ['police-report-002.pdf', 'medical-assessment-002.pdf', 'crisis-notes-002.pdf'],
    confidentialityLevel: 'restricted',
    legalNotificationRequired: true,
    legalNotificationCompleted: true,
    createdAt: new Date('2024-01-14T21:00:00'),
    updatedAt: new Date('2024-01-15T08:00:00')
  }
];

export default function CrisisReporting() {
  const [incidents, setIncidents] = useState<CrisisIncident[]>(mockIncidents);
  const [activeView, setActiveView] = useState<'dashboard' | 'incidents' | 'reports' | 'new' | 'view' | 'edit'>('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<CrisisIncident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'suicidal_ideation' | 'violence_threat' | 'self_harm' | 'other'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'moderate' | 'high' | 'critical'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'archived'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const calculateMetrics = useCallback((): ReportingMetrics => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 11));
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const filteredIncidents = incidents.filter(incident => 
      isWithinInterval(incident.incidentDate, { start: startDate, end: endDate })
    );

    const incidentsByType = filteredIncidents.reduce((acc, incident) => {
      acc[incident.incidentType] = (acc[incident.incidentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const incidentsBySeverity = filteredIncidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const incidentsByOutcome = filteredIncidents.reduce((acc, incident) => {
      acc[incident.outcome] = (acc[incident.outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const responseTimeTotal = filteredIncidents.reduce((total, incident) => {
      const responseTime = incident.reportedDate.getTime() - incident.incidentDate.getTime();
      return total + responseTime;
    }, 0);

    const averageResponseTime = filteredIncidents.length > 0 
      ? responseTimeTotal / filteredIncidents.length / (1000 * 60) // Convert to minutes
      : 0;

    const followUpRequired = filteredIncidents.filter(i => i.followUpRequired).length;
    const followUpCompleted = filteredIncidents.filter(i => i.followUpRequired && i.followUpCompleted).length;
    const followUpCompliance = followUpRequired > 0 ? (followUpCompleted / followUpRequired) * 100 : 0;

    // Calculate monthly trends
    const monthlyTrends: Array<{ month: string; count: number; severity: Record<string, number> }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthIncidents = incidents.filter(incident => 
        isWithinInterval(incident.incidentDate, { start: monthStart, end: monthEnd })
      );
      const severityBreakdown = monthIncidents.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      monthlyTrends.push({
        month: format(monthStart, 'MMM yyyy'),
        count: monthIncidents.length,
        severity: severityBreakdown
      });
    }

    // Calculate top precipitating factors
    const factorCounts = filteredIncidents.reduce((acc, incident) => {
      incident.precipitatingFactors.forEach(factor => {
        acc[factor] = (acc[factor] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topPrecipitatingFactors = Object.entries(factorCounts)
      .map(([factor, count]) => ({
        factor,
        count,
        percentage: (count / filteredIncidents.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate intervention effectiveness
    const interventionOutcomes = filteredIncidents.reduce((acc, incident) => {
      incident.interventionsProvided.forEach(intervention => {
        if (!acc[intervention.type]) {
          acc[intervention.type] = { total: 0, successful: 0 };
        }
        acc[intervention.type].total++;
        if (incident.outcome === 'stabilized' || incident.outcome === 'referred_outpatient') {
          acc[intervention.type].successful++;
        }
      });
      return acc;
    }, {} as Record<string, { total: number; successful: number }>);

    const interventionEffectiveness = Object.entries(interventionOutcomes)
      .map(([intervention, stats]) => ({
        intervention,
        successRate: (stats.successful / stats.total) * 100,
        totalUses: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate);

    return {
      totalIncidents: filteredIncidents.length,
      incidentsByType,
      incidentsBySeverity,
      incidentsByOutcome,
      averageResponseTime: Math.round(averageResponseTime),
      followUpCompliance: Math.round(followUpCompliance),
      monthlyTrends,
      topPrecipitatingFactors,
      interventionEffectiveness
    };
  }, [incidents, dateRange]);

  const metrics = calculateMetrics();

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.clientInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || incident.incidentType === filterType;
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'archived': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (activeView === 'view' && selectedIncident) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Incident Report</h2>
            <p className="text-gray-600">{selectedIncident.incidentNumber} - {selectedIncident.clientInfo.name}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={() => setActiveView('incidents')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Incident Details</h3>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity.charAt(0).toUpperCase() + selectedIncident.severity.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedIncident.status)}`}>
                    {selectedIncident.status.charAt(0).toUpperCase() + selectedIncident.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Incident Type</p>
                  <p className="text-gray-900 capitalize">{selectedIncident.incidentType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-gray-900">{selectedIncident.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Incident Date</p>
                  <p className="text-gray-900">{format(selectedIncident.incidentDate, 'PPp')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Reported Date</p>
                  <p className="text-gray-900">{format(selectedIncident.reportedDate, 'PPp')}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Description</h4>
                <p className="text-gray-900">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Precipitating Factors</h4>
                  <ul className="space-y-1">
                    {selectedIncident.precipitatingFactors.map((factor, index) => (
                      <li key={index} className="flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mr-2" />
                        <span className="text-gray-700">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Warning Signs Present</h4>
                  <ul className="space-y-1">
                    {selectedIncident.warningSignsPresent.map((sign, index) => (
                      <li key={index} className="flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-gray-700">{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interventions Provided</h3>
              <div className="space-y-4">
                {selectedIncident.interventionsProvided.map((intervention, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {intervention.type.replace('_', ' ')}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {format(intervention.timestamp, 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-1">{intervention.description}</p>
                    <p className="text-sm text-gray-600">Provided by: {intervention.providedBy}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedIncident.qualityAssuranceReview && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Assurance Review</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reviewer</p>
                    <p className="text-gray-900">{selectedIncident.qualityAssuranceReview.reviewerName}</p>
                    <p className="text-sm text-gray-600">
                      Reviewed on {format(selectedIncident.qualityAssuranceReview.reviewDate, 'PPp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Findings</p>
                    <p className="text-gray-900">{selectedIncident.qualityAssuranceReview.findings}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recommendations</p>
                    <ul className="space-y-1">
                      {selectedIncident.qualityAssuranceReview.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Follow-up Actions</p>
                    <ul className="space-y-1">
                      {selectedIncident.qualityAssuranceReview.followUpActions.map((action, index) => (
                        <li key={index} className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedIncident.clientInfo.name}</p>
                    <p className="text-sm text-gray-600">Age: {selectedIncident.clientInfo.age}</p>
                    {selectedIncident.clientInfo.mrn && (
                      <p className="text-sm text-gray-600">MRN: {selectedIncident.clientInfo.mrn}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reported By</p>
                  <p className="text-gray-900">{selectedIncident.reportedBy.name}</p>
                  <p className="text-sm text-gray-600">{selectedIncident.reportedBy.role}</p>
                  {selectedIncident.reportedBy.credentials && (
                    <p className="text-sm text-gray-600">{selectedIncident.reportedBy.credentials}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Outcome</p>
                  <p className="text-gray-900 capitalize">{selectedIncident.outcome.replace('_', ' ')}</p>
                </div>
                
                {selectedIncident.followUpRequired && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Follow-up Status</p>
                    <div className="flex items-center">
                      {selectedIncident.followUpCompleted ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-yellow-500 mr-2" />
                      )}
                      <span className="text-gray-700">
                        {selectedIncident.followUpCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    {selectedIncident.followUpDate && (
                      <p className="text-sm text-gray-600">
                        Due: {format(selectedIncident.followUpDate, 'PPp')}
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Confidentiality Level</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    selectedIncident.confidentialityLevel === 'highly_confidential' ? 'bg-red-100 text-red-800' :
                    selectedIncident.confidentialityLevel === 'restricted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedIncident.confidentialityLevel.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                {selectedIncident.legalNotificationRequired && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Legal Notification</p>
                    <div className="flex items-center">
                      {selectedIncident.legalNotificationCompleted ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span className="text-gray-700">
                        {selectedIncident.legalNotificationCompleted ? 'Completed' : 'Required'}
                      </span>
                    </div>
                  </div>
                )}
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
                  Share Report
                </button>
              </div>
            </div>

            {selectedIncident.attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
                <div className="space-y-2">
                  {selectedIncident.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">{attachment}</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'reports') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
            <p className="text-gray-600">Crisis incident analytics and performance metrics</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => setActiveView('incidents')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Incidents
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{metrics.totalIncidents}</div>
            <div className="text-sm text-gray-600">Total Incidents</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{metrics.averageResponseTime}</div>
            <div className="text-sm text-gray-600">Avg Response Time (min)</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{metrics.followUpCompliance}%</div>
            <div className="text-sm text-gray-600">Follow-up Compliance</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {Object.values(metrics.incidentsBySeverity).reduce((a, b) => Math.max(a, b), 0)}
            </div>
            <div className="text-sm text-gray-600">Peak Monthly Incidents</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Type</h3>
            <div className="space-y-3">
              {Object.entries(metrics.incidentsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                      <div 
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${(count / metrics.totalIncidents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-6">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Severity</h3>
            <div className="space-y-3">
              {Object.entries(metrics.incidentsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{severity}</span>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                      <div 
                        className={`h-2 rounded-full ${
                          severity === 'critical' ? 'bg-red-600' :
                          severity === 'high' ? 'bg-orange-500' :
                          severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(count / metrics.totalIncidents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-6">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Precipitating Factors</h3>
            <div className="space-y-3">
              {metrics.topPrecipitatingFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700">{factor.factor}</span>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                      <div 
                        className="h-2 bg-purple-600 rounded-full"
                        style={{ width: `${factor.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{factor.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Intervention Effectiveness</h3>
            <div className="space-y-3">
              {metrics.interventionEffectiveness.slice(0, 5).map((intervention, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{intervention.intervention.replace('_', ' ')}</span>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                      <div 
                        className="h-2 bg-green-600 rounded-full"
                        style={{ width: `${intervention.successRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-10">{Math.round(intervention.successRate)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          <div className="grid grid-cols-6 gap-4">
            {metrics.monthlyTrends.map((month, index) => (
              <div key={index} className="text-center">
                <div className="text-sm text-gray-600 mb-2">{month.month}</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{month.count}</div>
                <div className="space-y-1">
                  {Object.entries(month.severity).map(([severity, count]) => (
                    <div key={severity} className="text-xs text-gray-500">
                      {severity}: {count}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'incidents') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Incident Reports</h2>
            <p className="text-gray-600">Comprehensive crisis incident documentation</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('reports')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveView('new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="suicidal_ideation">Suicidal Ideation</option>
                <option value="violence_threat">Violence Threat</option>
                <option value="self_harm">Self Harm</option>
                <option value="other">Other</option>
              </select>
              
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
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
                {filteredIncidents.map((incident) => (
                  <motion.tr
                    key={incident.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {incident.incidentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {incident.clientInfo.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Age {incident.clientInfo.age}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {incident.incidentType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(incident.incidentDate, 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                        {incident.status.charAt(0).toUpperCase() + incident.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setActiveView('view');
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setActiveView('edit');
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        <PencilIcon className="h-4 w-4" />
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

  // Dashboard view (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Crisis Documentation & Reporting</h2>
          <p className="text-gray-600">Comprehensive incident reporting and analytics system</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('reports')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            View Analytics
          </button>
          <button
            onClick={() => setActiveView('incidents')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            View Incidents
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-gray-900">{incidents.length}</div>
          <div className="text-sm text-gray-600">Total Reports</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-red-600">
            {incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {incidents.filter(i => i.status === 'under_review').length}
          </div>
          <div className="text-sm text-gray-600">Under Review</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-green-600">
            {incidents.filter(i => i.followUpRequired && i.followUpCompleted).length}
          </div>
          <div className="text-sm text-gray-600">Follow-ups Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
          <div className="space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{incident.incidentNumber}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{incident.clientInfo.name}</div>
                  <div className="text-xs text-gray-500">{format(incident.incidentDate, 'MMM d, yyyy')}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedIncident(incident);
                    setActiveView('view');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Actions</h3>
          <div className="space-y-3">
            {incidents.filter(i => 
              i.status === 'under_review' || 
              (i.followUpRequired && !i.followUpCompleted) ||
              (i.legalNotificationRequired && !i.legalNotificationCompleted)
            ).slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{incident.incidentNumber}</div>
                  <div className="text-sm text-gray-600">{incident.clientInfo.name}</div>
                  <div className="text-xs text-yellow-700">
                    {incident.status === 'under_review' && 'Requires review'}
                    {incident.followUpRequired && !incident.followUpCompleted && 'Follow-up pending'}
                    {incident.legalNotificationRequired && !incident.legalNotificationCompleted && 'Legal notification required'}
                  </div>
                </div>
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}