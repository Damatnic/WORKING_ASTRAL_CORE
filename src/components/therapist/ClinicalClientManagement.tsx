'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  HeartIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BellAlertIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format, differenceInYears, isAfter, isBefore, addDays, addWeeks } from 'date-fns';

interface ClinicalClient {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  intakeDate: Date;
  lastSessionDate?: Date;
  nextSessionDate?: Date;
  status: 'intake' | 'active' | 'on_hold' | 'completed' | 'terminated' | 'no_show';
  riskLevel: 'low' | 'moderate' | 'high' | 'crisis';
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  treatmentModality: 'CBT' | 'DBT' | 'EMDR' | 'psychodynamic' | 'humanistic' | 'integrated';
  sessionFrequency: 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  progress: number;
  treatmentGoals: string[];
  currentMedications: {
    name: string;
    dosage: string;
    prescriber: string;
  }[];
  allergies: string[];
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    copay: number;
    deductible: number;
    authorizationRequired: boolean;
    sessionsAuthorized?: number;
    authorizationExpires?: Date;
  };
  clinicalNotes: {
    id: string;
    date: Date;
    type: 'intake' | 'progress' | 'treatment_plan' | 'crisis' | 'discharge';
    content: string;
    riskAssessment?: 'low' | 'moderate' | 'high' | 'imminent';
  }[];
  assessments: {
    id: string;
    type: string;
    date: Date;
    score: number;
    interpretation: string;
  }[];
  flags: {
    type: 'medical' | 'safety' | 'legal' | 'insurance';
    message: string;
    priority: 'low' | 'medium' | 'high';
    created: Date;
  }[];
}

interface ClinicalClientManagementProps {
  className?: string;
}

// Mock data for clinical clients
const mockClinicalClients: ClinicalClient[] = [
  {
    id: '1',
    clientNumber: 'CL-2024-001',
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'j.martinez@example.com',
    phone: '(555) 123-4567',
    dateOfBirth: new Date('1985-04-15'),
    gender: 'female',
    address: {
      street: '123 Main Street, Apt 4B',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701'
    },
    emergencyContact: {
      name: 'Carlos Martinez',
      relationship: 'spouse',
      phone: '(555) 123-4568'
    },
    intakeDate: new Date('2024-01-10'),
    lastSessionDate: new Date('2024-03-01'),
    nextSessionDate: new Date('2024-03-08T14:00:00'),
    status: 'active',
    riskLevel: 'moderate',
    primaryDiagnosis: 'F41.1 - Generalized Anxiety Disorder',
    secondaryDiagnoses: ['F33.1 - Major Depressive Disorder, Recurrent, Moderate'],
    treatmentModality: 'CBT',
    sessionFrequency: 'weekly',
    totalSessions: 20,
    completedSessions: 18,
    missedSessions: 2,
    progress: 65,
    treatmentGoals: [
      'Reduce anxiety symptoms by 50%',
      'Improve sleep quality and duration',
      'Return to work full-time',
      'Develop healthy coping strategies'
    ],
    currentMedications: [
      { name: 'Sertraline', dosage: '50mg daily', prescriber: 'Dr. Smith' },
      { name: 'Lorazepam', dosage: '0.5mg PRN', prescriber: 'Dr. Smith' }
    ],
    allergies: ['Penicillin', 'Shellfish'],
    insuranceInfo: {
      provider: 'Blue Cross Blue Shield',
      policyNumber: 'BC123456789',
      groupNumber: 'GRP001',
      copay: 30,
      deductible: 500,
      authorizationRequired: true,
      sessionsAuthorized: 20,
      authorizationExpires: new Date('2024-06-30')
    },
    clinicalNotes: [
      {
        id: 'n1',
        date: new Date('2024-03-01'),
        type: 'progress',
        content: 'Client reports decreased anxiety levels. Sleep has improved significantly. Homework compliance good.',
        riskAssessment: 'low'
      },
      {
        id: 'n2',
        date: new Date('2024-01-10'),
        type: 'intake',
        content: 'Initial assessment completed. Client presents with anxiety and depressive symptoms lasting 6 months.',
        riskAssessment: 'moderate'
      }
    ],
    assessments: [
      {
        id: 'a1',
        type: 'GAD-7',
        date: new Date('2024-01-10'),
        score: 12,
        interpretation: 'Moderate anxiety'
      },
      {
        id: 'a2',
        type: 'PHQ-9',
        date: new Date('2024-01-10'),
        score: 8,
        interpretation: 'Mild depression'
      }
    ],
    flags: [
      {
        type: 'insurance',
        message: 'Authorization expires in 3 months',
        priority: 'medium',
        created: new Date('2024-03-01')
      }
    ]
  },
  {
    id: '2',
    clientNumber: 'CL-2024-002',
    firstName: 'David',
    lastName: 'Chen',
    email: 'd.chen@example.com',
    phone: '(555) 234-5678',
    dateOfBirth: new Date('1992-08-22'),
    gender: 'male',
    address: {
      street: '456 Oak Avenue',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702'
    },
    emergencyContact: {
      name: 'Lisa Chen',
      relationship: 'sister',
      phone: '(555) 234-5679'
    },
    intakeDate: new Date('2024-02-01'),
    lastSessionDate: new Date('2024-02-28'),
    nextSessionDate: new Date('2024-03-07T16:30:00'),
    status: 'active',
    riskLevel: 'high',
    primaryDiagnosis: 'F43.1 - Post-traumatic Stress Disorder',
    secondaryDiagnoses: [],
    treatmentModality: 'EMDR',
    sessionFrequency: 'weekly',
    totalSessions: 16,
    completedSessions: 12,
    missedSessions: 1,
    progress: 40,
    treatmentGoals: [
      'Process traumatic memories safely',
      'Reduce nightmares and flashbacks',
      'Improve emotional regulation',
      'Rebuild sense of safety'
    ],
    currentMedications: [
      { name: 'Prazosin', dosage: '2mg at bedtime', prescriber: 'Dr. Johnson' },
      { name: 'Trazodone', dosage: '50mg at bedtime', prescriber: 'Dr. Johnson' }
    ],
    allergies: [],
    insuranceInfo: {
      provider: 'Aetna',
      policyNumber: 'AE987654321',
      groupNumber: 'GRP002',
      copay: 25,
      deductible: 750,
      authorizationRequired: false,
      sessionsAuthorized: 0
    },
    clinicalNotes: [
      {
        id: 'n3',
        date: new Date('2024-02-28'),
        type: 'progress',
        content: 'EMDR processing session. Client tolerated well. Some abreaction noted but managed appropriately.',
        riskAssessment: 'moderate'
      }
    ],
    assessments: [
      {
        id: 'a3',
        type: 'PCL-5',
        date: new Date('2024-02-01'),
        score: 42,
        interpretation: 'Probable PTSD'
      }
    ],
    flags: [
      {
        type: 'safety',
        message: 'High risk - recent trauma processing',
        priority: 'high',
        created: new Date('2024-02-28')
      }
    ]
  },
  {
    id: '3',
    clientNumber: 'CL-2024-003',
    firstName: 'Sarah',
    lastName: 'Thompson',
    email: 's.thompson@example.com',
    phone: '(555) 345-6789',
    dateOfBirth: new Date('1978-12-03'),
    gender: 'female',
    address: {
      street: '789 Pine Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62703'
    },
    emergencyContact: {
      name: 'Michael Thompson',
      relationship: 'spouse',
      phone: '(555) 345-6790'
    },
    intakeDate: new Date('2023-11-15'),
    lastSessionDate: new Date('2024-03-02'),
    nextSessionDate: new Date('2024-03-09T10:00:00'),
    status: 'active',
    riskLevel: 'low',
    primaryDiagnosis: 'F32.1 - Major Depressive Disorder, Single Episode, Moderate',
    secondaryDiagnoses: [],
    treatmentModality: 'integrated',
    sessionFrequency: 'weekly',
    totalSessions: 30,
    completedSessions: 24,
    missedSessions: 3,
    progress: 80,
    treatmentGoals: [
      'Maintain mood stability',
      'Strengthen social connections',
      'Prevent relapse',
      'Develop long-term coping skills'
    ],
    currentMedications: [
      { name: 'Escitalopram', dosage: '10mg daily', prescriber: 'Dr. Williams' }
    ],
    allergies: ['Latex'],
    insuranceInfo: {
      provider: 'Cigna',
      policyNumber: 'CG456789123',
      groupNumber: 'GRP003',
      copay: 40,
      deductible: 1000,
      authorizationRequired: false,
      sessionsAuthorized: 0
    },
    clinicalNotes: [
      {
        id: 'n4',
        date: new Date('2024-03-02'),
        type: 'progress',
        content: 'Significant improvement noted. Client discussing termination planning. Mood stable for 6 weeks.',
        riskAssessment: 'low'
      }
    ],
    assessments: [
      {
        id: 'a4',
        type: 'PHQ-9',
        date: new Date('2024-03-01'),
        score: 4,
        interpretation: 'Minimal depression'
      }
    ],
    flags: []
  }
];

export default function ClinicalClientManagement({ className = "" }: ClinicalClientManagementProps) {
  const [clients, setClients] = useState<ClinicalClient[]>(mockClinicalClients);
  const [selectedClient, setSelectedClient] = useState<ClinicalClient | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'intake' | 'reports'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'intakeDate' | 'lastSession' | 'riskLevel'>('name');

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.primaryDiagnosis.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || client.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'intakeDate':
        return b.intakeDate.getTime() - a.intakeDate.getTime();
      case 'lastSession':
        if (!a.lastSessionDate && !b.lastSessionDate) return 0;
        if (!a.lastSessionDate) return 1;
        if (!b.lastSessionDate) return -1;
        return b.lastSessionDate.getTime() - a.lastSessionDate.getTime();
      case 'riskLevel':
        const riskOrder = { 'crisis': 4, 'high': 3, 'moderate': 2, 'low': 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      default:
        return 0;
    }
  });

  const getStatusColor = (status: ClinicalClient['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'intake': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'terminated': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'no_show': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: ClinicalClient['riskLevel']) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'crisis': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFlagPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low': return 'text-gray-600 bg-gray-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAge = (dateOfBirth: Date) => {
    return differenceInYears(new Date(), dateOfBirth);
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<any>;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const activeClients = clients.filter(c => c.status === 'active').length;
  const intakeClients = clients.filter(c => c.status === 'intake').length;
  const highRiskClients = clients.filter(c => c.riskLevel === 'high' || c.riskLevel === 'crisis').length;
  const flaggedClients = clients.filter(c => c.flags.length > 0).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-indigo-600" />
              Clinical Client Management
            </h2>
            <p className="text-gray-600 mt-1">Comprehensive clinical client records and case management</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <UserPlusIcon className="w-5 h-5" />
              <span>New Client Intake</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Clients"
            value={activeClients}
            subtitle="Currently in treatment"
            icon={UserGroupIcon}
            color="text-green-600"
          />
          <StatCard
            title="Intake Process"
            value={intakeClients}
            subtitle="Pending assessments"
            icon={ClipboardDocumentListIcon}
            color="text-blue-600"
          />
          <StatCard
            title="High Risk"
            value={highRiskClients}
            subtitle="Require close monitoring"
            icon={ExclamationTriangleIcon}
            color="text-red-600"
          />
          <StatCard
            title="Flagged Cases"
            value={flaggedClients}
            subtitle="Need attention"
            icon={BellAlertIcon}
            color="text-orange-600"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'list', label: 'Client List', icon: UserGroupIcon },
              { id: 'intake', label: 'Intake & Assessment', icon: ClipboardDocumentListIcon },
              { id: 'reports', label: 'Clinical Reports', icon: ChartBarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, client number, or diagnosis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="intake">Intake</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                    </select>

                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">All Risk Levels</option>
                      <option value="low">Low Risk</option>
                      <option value="moderate">Moderate Risk</option>
                      <option value="high">High Risk</option>
                      <option value="crisis">Crisis</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="intakeDate">Sort by Intake Date</option>
                      <option value="lastSession">Sort by Last Session</option>
                      <option value="riskLevel">Sort by Risk Level</option>
                    </select>
                  </div>
                </div>

                {/* Client List */}
                <div className="space-y-4">
                  {filteredClients.map((client) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-indigo-600" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {client.firstName} {client.lastName}
                              </h3>
                              <span className="text-sm text-gray-500">({client.clientNumber})</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(client.status)}`}>
                                {client.status.replace('_', ' ').charAt(0).toUpperCase() + client.status.replace('_', ' ').slice(1)}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(client.riskLevel)}`}>
                                {client.riskLevel} risk
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">Age:</span> {getAge(client.dateOfBirth)}
                              </div>
                              <div>
                                <span className="font-medium">Primary Dx:</span> {client.primaryDiagnosis}
                              </div>
                              <div>
                                <span className="font-medium">Treatment:</span> {client.treatmentModality}
                              </div>
                              <div>
                                <span className="font-medium">Sessions:</span> {client.completedSessions}/{client.totalSessions}
                              </div>
                              <div>
                                <span className="font-medium">Progress:</span> {client.progress}%
                              </div>
                              <div>
                                <span className="font-medium">Last Session:</span> {client.lastSessionDate ? format(client.lastSessionDate, 'MMM dd') : 'N/A'}
                              </div>
                            </div>

                            {/* Flags */}
                            {client.flags.length > 0 && (
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                  {client.flags.map((flag, index) => (
                                    <span
                                      key={index}
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${getFlagPriorityColor(flag.priority)}`}
                                    >
                                      {flag.type}: {flag.message}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Treatment Progress</span>
                                <span>{client.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${client.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 rounded-lg transition-colors">
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                            <DocumentTextIcon className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-purple-600 rounded-lg transition-colors">
                            <CalendarDaysIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'intake' && (
              <motion.div
                key="intake"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center py-12"
              >
                <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Intake & Assessment Tools</h3>
                <p className="text-gray-600">Clinical intake forms, assessments, and screening tools will be available here.</p>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Start New Intake
                </button>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center py-12"
              >
                <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Clinical Reports</h3>
                <p className="text-gray-600">Treatment summaries, progress reports, and clinical analytics.</p>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Generate Report
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedClient(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h2>
                      <p className="text-gray-600">{selectedClient.clientNumber} • Age {getAge(selectedClient.dateOfBirth)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedClient.status)}`}>
                      {selectedClient.status.replace('_', ' ').charAt(0).toUpperCase() + selectedClient.status.replace('_', ' ').slice(1)}
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRiskColor(selectedClient.riskLevel)}`}>
                      {selectedClient.riskLevel} risk
                    </span>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Demographics & Contact */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics & Contact</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span>{selectedClient.email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span>{selectedClient.phone}</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div>{selectedClient.address.street}</div>
                          <div>{selectedClient.address.city}, {selectedClient.address.state} {selectedClient.address.zipCode}</div>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Emergency Contact:</span>
                        <div className="ml-4 mt-1">
                          <div>{selectedClient.emergencyContact.name} ({selectedClient.emergencyContact.relationship})</div>
                          <div>{selectedClient.emergencyContact.phone}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Information</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Diagnosis</h4>
                        <p className="text-sm text-gray-600 bg-blue-50 rounded p-2">{selectedClient.primaryDiagnosis}</p>
                      </div>
                      
                      {selectedClient.secondaryDiagnoses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Diagnoses</h4>
                          <div className="space-y-1">
                            {selectedClient.secondaryDiagnoses.map((diagnosis, index) => (
                              <p key={index} className="text-sm text-gray-600 bg-gray-50 rounded p-2">{diagnosis}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Treatment:</span>
                          <div>{selectedClient.treatmentModality}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Frequency:</span>
                          <div>{selectedClient.sessionFrequency}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment Goals */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Goals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedClient.treatmentGoals.map((goal, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{goal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Medications */}
                {selectedClient.currentMedications.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Medications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedClient.currentMedications.map((med, index) => (
                        <div key={index} className="bg-yellow-50 rounded-lg p-3">
                          <div className="font-medium text-gray-900">{med.name}</div>
                          <div className="text-sm text-gray-600">{med.dosage}</div>
                          <div className="text-xs text-gray-500">Prescribed by {med.prescriber}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance Information */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Provider:</span>
                        <div>{selectedClient.insuranceInfo.provider}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Policy Number:</span>
                        <div>{selectedClient.insuranceInfo.policyNumber}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Copay:</span>
                        <div>${selectedClient.insuranceInfo.copay}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Deductible:</span>
                        <div>${selectedClient.insuranceInfo.deductible}</div>
                      </div>
                      {selectedClient.insuranceInfo.authorizationRequired && (
                        <>
                          <div>
                            <span className="font-medium text-gray-700">Sessions Authorized:</span>
                            <div>{selectedClient.insuranceInfo.sessionsAuthorized}</div>
                          </div>
                          {selectedClient.insuranceInfo.authorizationExpires && (
                            <div>
                              <span className="font-medium text-gray-700">Authorization Expires:</span>
                              <div>{format(selectedClient.insuranceInfo.authorizationExpires, 'MMM dd, yyyy')}</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Clinical Notes */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Clinical Notes</h3>
                  <div className="space-y-3">
                    {selectedClient.clinicalNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {note.type.replace('_', ' ').charAt(0).toUpperCase() + note.type.replace('_', ' ').slice(1)} Note
                            </span>
                            {note.riskAssessment && (
                              <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(note.riskAssessment)}`}>
                                {note.riskAssessment} risk
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{format(note.date, 'MMM dd, yyyy')}</span>
                        </div>
                        <p className="text-sm text-gray-700">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 flex flex-wrap gap-3">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>Schedule Session</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Add Progress Note</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <ClipboardDocumentListIcon className="w-4 h-4" />
                    <span>Update Treatment Plan</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                    <DocumentCheckIcon className="w-4 h-4" />
                    <span>Complete Assessment</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}