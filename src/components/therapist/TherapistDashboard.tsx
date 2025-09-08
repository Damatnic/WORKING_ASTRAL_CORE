'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isThisWeek, isPast, isFuture, addDays } from 'date-fns';
import ClinicalClientManagement from './ClinicalClientManagement';
import TherapySessionNotes from './TherapySessionNotes';

interface TherapistClient {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  name?: string; // Full name for display
  email: string;
  phone: string;
  dateOfBirth: Date | string;
  gender: string;
  address?: any;
  emergencyContact?: any;
  intakeDate: Date | string;
  lastSessionDate?: Date | string | null;
  lastSession?: Date | string | null; // Alias for lastSessionDate
  nextSessionDate?: Date | string | null;
  status: 'INTAKE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'TERMINATED' | 'NO_SHOW';
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS';
  primaryDiagnosis?: string;
  secondaryDiagnoses: string[];
  treatmentModality?: string;
  treatmentPlan?: string; // Treatment plan description
  sessionFrequency?: string;
  sessionCount?: number; // Alias for totalSessions
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  progress: number;
  treatmentGoals?: string[];
  medications?: any[];
  allergies: string[];
  insuranceInfo?: any;
  nextSession?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface TherapistSession {
  id: string;
  therapistId: string;
  clientId: string;
  clientName?: string; // Client's full name for display
  scheduledTime: Date | string;
  duration: number;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  sessionType: 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  billingCode?: string;
  fee?: number;
  copay?: number;
  insuranceClaim?: string;
  notes?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    clientNumber: string;
    email: string;
    phone: string;
    riskLevel: string;
    status: string;
  };
  sessionNotes?: any[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface TherapistStats {
  totalClients: number;
  activeClients: number;
  completedSessions: number;
  upcomingSessions: number;
  weeklyRevenue: number;
  averageSessionLength: number;
  clientRetentionRate: number;
  weeklyHours: number;
  pendingNotes: number;
  insuranceClaims: number;
}

interface TherapistDashboardProps {
  className?: string;
}

// Remove mock data - now using real API
/* const mockClients: TherapistClient[] = [
  {
    id: '1',
    name: 'Jennifer Martinez',
    email: 'j.martinez@example.com',
    dateOfBirth: new Date('1985-04-15'),
    joinedDate: new Date('2024-01-10'),
    lastSession: new Date('2024-03-01'),
    nextSession: new Date('2024-03-08T14:00:00'),
    status: 'active',
    diagnosisCode: ['F41.1', 'F33.1'],
    treatmentPlan: 'CBT for anxiety and depression',
    sessionCount: 18,
    progress: 65,
    riskLevel: 'moderate',
    insuranceProvider: 'Blue Cross Blue Shield',
    copay: 30,
    notes: 'Making steady progress with anxiety management. Homework compliance good.',
    goals: ['Reduce panic attacks', 'Improve sleep quality', 'Return to work full-time'],
    medications: ['Sertraline 50mg', 'Lorazepam 0.5mg PRN']
  },
  {
    id: '2',
    name: 'David Chen',
    email: 'd.chen@example.com',
    dateOfBirth: new Date('1992-08-22'),
    joinedDate: new Date('2024-02-01'),
    lastSession: new Date('2024-02-28'),
    nextSession: new Date('2024-03-07T16:30:00'),
    status: 'active',
    diagnosisCode: ['F43.1'],
    treatmentPlan: 'EMDR for PTSD',
    sessionCount: 12,
    progress: 40,
    riskLevel: 'high',
    insuranceProvider: 'Aetna',
    copay: 25,
    notes: 'Complex trauma history. Building safety and stabilization phase.',
    goals: ['Process traumatic memories', 'Reduce nightmares', 'Improve emotional regulation'],
    medications: ['Prazosin 2mg', 'Trazodone 50mg']
  },
  {
    id: '3',
    name: 'Sarah Thompson',
    email: 's.thompson@example.com',
    dateOfBirth: new Date('1978-12-03'),
    joinedDate: new Date('2023-11-15'),
    lastSession: new Date('2024-03-02'),
    nextSession: new Date('2024-03-09T10:00:00'),
    status: 'active',
    diagnosisCode: ['F32.1'],
    treatmentPlan: 'IPT for depression',
    sessionCount: 24,
    progress: 80,
    riskLevel: 'low',
    insuranceProvider: 'Cigna',
    copay: 40,
    notes: 'Significant improvement in mood and functioning. Discussing termination planning.',
    goals: ['Maintain mood stability', 'Strengthen social connections', 'Prevent relapse'],
    medications: ['Escitalopram 10mg']
  },
  {
    id: '4',
    name: 'Michael Rodriguez',
    email: 'm.rodriguez@example.com',
    dateOfBirth: new Date('1990-06-18'),
    joinedDate: new Date('2024-02-20'),
    status: 'assessment',
    diagnosisCode: [],
    sessionCount: 2,
    progress: 10,
    riskLevel: 'moderate',
    notes: 'Initial assessment in progress. Presenting concerns: work stress, relationship issues.',
    goals: ['Complete comprehensive assessment', 'Develop treatment plan']
  }
];
*/

/* const mockSessions: TherapistSession[] = [
  {
    id: '1',
    clientId: '2',
    clientName: 'David Chen',
    scheduledTime: new Date('2024-03-07T16:30:00'),
    duration: 50,
    type: 'video',
    sessionType: 'individual',
    status: 'scheduled',
    billingCode: '90834',
    fee: 150,
    copay: 25
  },
  {
    id: '2',
    clientId: '1',
    clientName: 'Jennifer Martinez',
    scheduledTime: new Date('2024-03-08T14:00:00'),
    duration: 50,
    type: 'in_person',
    sessionType: 'individual',
    status: 'scheduled',
    billingCode: '90834',
    fee: 150,
    copay: 30
  },
  {
    id: '3',
    clientId: '3',
    clientName: 'Sarah Thompson',
    scheduledTime: new Date('2024-03-09T10:00:00'),
    duration: 50,
    type: 'in_person',
    sessionType: 'individual',
    status: 'scheduled',
    billingCode: '90834',
    fee: 150,
    copay: 40
  }
];
*/

/* const mockStats: TherapistStats = {
  totalClients: 28,
  activeClients: 22,
  completedSessions: 156,
  upcomingSessions: 12,
  weeklyRevenue: 2400,
  averageSessionLength: 52,
  clientRetentionRate: 87,
  weeklyHours: 35,
  pendingNotes: 3,
  insuranceClaims: 8
}; */

export default function TherapistDashboard({ className = "" }: TherapistDashboardProps) {
  const [clients, setClients] = useState<TherapistClient[]>([]);
  const [sessions, setSessions] = useState<TherapistSession[]>([]);
  const [stats, setStats] = useState<TherapistStats>({
    totalClients: 0,
    activeClients: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    weeklyRevenue: 0,
    averageSessionLength: 0,
    clientRetentionRate: 0,
    weeklyHours: 0,
    pendingNotes: 0,
    insuranceClaims: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'sessions' | 'notes' | 'billing'>('overview');
  const [selectedClient, setSelectedClient] = useState<TherapistClient | null>(null);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch clients
        const clientsResponse = await fetch('/api/therapist/clients?limit=100');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.clients || []);

          // Calculate stats from clients
          const activeCount = clientsData.clients?.filter((c: TherapistClient) => c.status === 'ACTIVE').length || 0;
          const totalCount = clientsData.clients?.length || 0;
          
          setStats(prev => ({
            ...prev,
            totalClients: totalCount,
            activeClients: activeCount
          }));
        }

        // Fetch sessions
        const sessionsResponse = await fetch('/api/therapist/sessions?upcoming=true&limit=50');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData.sessions || []);
          
          // Update stats with session data
          const statistics = sessionsData.statistics || {};
          setStats(prev => ({
            ...prev,
            upcomingSessions: statistics.scheduled || 0,
            completedSessions: statistics.completed || 0
          }));
        }

        // Fetch today's sessions separately for better performance
        const todayResponse = await fetch('/api/therapist/sessions?today=true');
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          // Merge today's sessions if needed
          const todaySessions = todayData.sessions || [];
          setSessions(prev => {
            const sessionIds = new Set(prev.map(s => s.id));
            const newSessions = todaySessions.filter((s: TherapistSession) => !sessionIds.has(s.id));
            return [...newSessions, ...prev];
          });
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesFilter = clientFilter === 'all' || 
      client.status.toLowerCase() === clientFilter.toLowerCase();
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.clientNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcomingSessions = sessions
    .filter(session => {
      const sessionTime = new Date(session.scheduledTime);
      return session.status === 'SCHEDULED' && isFuture(sessionTime);
    })
    .sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });

  const todaySessions = upcomingSessions.filter(session => {
    const sessionTime = new Date(session.scheduledTime);
    return isToday(sessionTime);
  });

  const getRiskLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'LOW': return 'text-green-600 bg-green-100 border-green-200';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'CRISIS': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'text-green-600 bg-green-100 border-green-200';
      case 'INACTIVE': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'ON_HOLD': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'COMPLETED': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'INTAKE': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'TERMINATED': return 'text-red-600 bg-red-100 border-red-200';
      case 'NO_SHOW': return 'text-orange-600 bg-orange-100 border-orange-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "text-blue-600", prefix = "", suffix = "" }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<any>;
    trend?: number;
    color?: string;
    prefix?: string;
    suffix?: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {prefix}{value}{suffix}
          </p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          {trend !== undefined && (
            <div className="mt-3 flex items-center">
              <ArrowTrendingUpIcon className={`w-4 h-4 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ml-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-sm text-gray-500 ml-2">from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-50`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  // Handle loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Therapist Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your clinical practice and clients</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <PlusIcon className="w-5 h-5" />
            <span>New Appointment</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <DocumentTextIcon className="w-5 h-5" />
            <span>Session Notes</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'clients', label: 'Clients', icon: UserGroupIcon },
            { id: 'sessions', label: 'Sessions', icon: CalendarIcon },
            { id: 'notes', label: 'Clinical Notes', icon: DocumentTextIcon },
            { id: 'billing', label: 'Billing', icon: CurrencyDollarIcon }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Clients"
              value={stats.activeClients}
              subtitle="Currently in treatment"
              icon={UserGroupIcon}
              trend={8}
              color="text-blue-600"
            />
            <StatCard
              title="Weekly Revenue"
              value={stats.weeklyRevenue}
              subtitle="This week"
              icon={CurrencyDollarIcon}
              trend={15}
              color="text-green-600"
              prefix="$"
            />
            <StatCard
              title="Pending Notes"
              value={stats.pendingNotes}
              subtitle="Need completion"
              icon={DocumentTextIcon}
              color="text-orange-600"
            />
            <StatCard
              title="Client Retention"
              value={stats.clientRetentionRate}
              subtitle="6-month average"
              icon={HeartIcon}
              trend={3}
              color="text-purple-600"
              suffix="%"
            />
          </div>

          {/* Today's Schedule */}
          {todaySessions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {todaySessions.map(session => (
                  <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{session.clientName}</h4>
                          <p className="text-sm text-gray-500">
                            {format(session.scheduledTime, 'h:mm a')} • {session.duration} min • {session.sessionType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.type === 'video' ? 'bg-blue-100 text-blue-800' :
                          session.type === 'in_person' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {session.type === 'in_person' ? 'In-Person' : session.type}
                        </span>
                        <span className="text-sm text-gray-600">${session.fee}</span>
                        <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors">
                          {session.type === 'video' ? <VideoCameraIcon className="w-4 h-4" /> :
                           session.type === 'in_person' ? <UserIcon className="w-4 h-4" /> :
                           <PhoneIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">High Priority Clients</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {clients.filter(client => client.riskLevel === 'high' || client.riskLevel === 'crisis').map(client => (
                  <div key={client.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{client.name}</h4>
                        <p className="text-sm text-gray-500">
                          Last session: {client.lastSession ? format(client.lastSession, 'MMM dd') : 'None'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(client.riskLevel)}`}>
                          {client.riskLevel}
                        </span>
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Treatment Progress</h3>
              </div>
              <div className="p-6 space-y-4">
                {clients.filter(c => c.status === 'active').slice(0, 4).map(client => (
                  <div key={client.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{client.name}</span>
                      <span className="text-sm text-gray-500">{client.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{client.treatmentPlan}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Clients</option>
                <option value="active">Active</option>
                <option value="assessment">Assessment</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <PlusIcon className="w-5 h-5" />
                <span>New Client</span>
              </button>
            </div>
          </div>

          {/* Client List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredClients.map(client => (
                <div key={client.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{client.name}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">{client.email}</p>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(client.status)}`}>
                            {client.status === 'on_hold' ? 'On Hold' : client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(client.riskLevel)}`}>
                            {client.riskLevel} risk
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <p className="text-sm text-gray-500">
                            Sessions: {client.sessionCount}
                          </p>
                          {client.treatmentPlan && (
                            <p className="text-sm text-gray-500">
                              Treatment: {client.treatmentPlan}
                            </p>
                          )}
                          {client.nextSession && (
                            <p className="text-sm text-gray-500">
                              Next: {format(client.nextSession, 'MMM dd, h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Progress: {client.progress}%</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingSessions.map(session => (
              <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{session.clientName}</h4>
                      <p className="text-sm text-gray-500">
                        {format(session.scheduledTime, 'MMM dd, yyyy')} at {format(session.scheduledTime, 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.duration} min • {session.sessionType} • {session.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">${session.fee}</p>
                      {session.copay && (
                        <p className="text-xs text-gray-500">Copay: ${session.copay}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      session.type === 'video' ? 'bg-blue-100 text-blue-800' :
                      session.type === 'in_person' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {session.type === 'in_person' ? 'In-Person' : session.type}
                    </span>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors">
                      <DocumentTextIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <TherapySessionNotes />
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing & Insurance</h3>
          <p className="text-gray-600">Insurance claims and billing management will be available here.</p>
          <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            View Claims
          </button>
        </div>
      )}

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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</h2>
                      <p className="text-gray-600">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(selectedClient.riskLevel)}`}>
                      {selectedClient.riskLevel} risk
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedClient.status)}`}>
                      {selectedClient.status.replace('_', ' ').toLowerCase()}
                    </span>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date of Birth:</span>
                        <span className="text-gray-900">{format(new Date(selectedClient.dateOfBirth), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Joined:</span>
                        <span className="text-gray-900">{format(new Date(selectedClient.intakeDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Sessions:</span>
                        <span className="text-gray-900">{selectedClient.completedSessions}/{selectedClient.totalSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Progress:</span>
                        <span className="text-gray-900">{selectedClient.progress}%</span>
                      </div>
                      {selectedClient.insuranceInfo?.provider && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Insurance:</span>
                          <span className="text-gray-900">{selectedClient.insuranceInfo.provider}</span>
                        </div>
                      )}
                      {selectedClient.insuranceInfo?.copay && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Copay:</span>
                          <span className="text-gray-900">${selectedClient.insuranceInfo.copay}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Information</h3>
                    <div className="space-y-4">
                      {selectedClient.primaryDiagnosis && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Diagnosis</h4>
                          <p className="text-sm text-gray-600">{selectedClient.primaryDiagnosis}</p>
                        </div>
                      )}
                      
                      {selectedClient.secondaryDiagnoses && selectedClient.secondaryDiagnoses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Diagnoses</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedClient.secondaryDiagnoses.map((diagnosis, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {diagnosis}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedClient.treatmentModality && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Treatment Modality</h4>
                          <p className="text-sm text-gray-600">{selectedClient.treatmentModality}</p>
                        </div>
                      )}

                      {selectedClient.medications && selectedClient.medications.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Medications</h4>
                          <ul className="space-y-1">
                            {selectedClient.medications.map((med, index) => (
                              <li key={index} className="text-sm text-gray-600">• {med}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedClient.treatmentGoals && selectedClient.treatmentGoals.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Treatment Goals</h3>
                    <ul className="space-y-2">
                      {selectedClient.treatmentGoals.map((goal, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{goal}</span>
                      </li>
                    ))}
                    </ul>
                  </div>
                )}

                {selectedClient.allergies && selectedClient.allergies.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.allergies.map((allergy, index) => (
                        <span key={index} className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Schedule Session</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Add Note</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <ClipboardDocumentListIcon className="w-4 h-4" />
                    <span>Treatment Plan</span>
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