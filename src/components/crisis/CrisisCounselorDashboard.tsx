'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BellAlertIcon,
  ShieldExclamationIcon,
  HeartIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  UserIcon,
  AcademicCapIcon,
  FireIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format, differenceInMinutes, isToday, isThisWeek, addHours } from 'date-fns';

interface CrisisClient {
  id: string;
  name: string;
  age: number;
  phone: string;
  email?: string;
  location?: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  primaryConcern: 'suicidal_ideation' | 'self_harm' | 'substance_abuse' | 'domestic_violence' | 'panic_attack' | 'psychosis' | 'other';
  lastContact: Date;
  nextFollowUp?: Date;
  status: 'active' | 'stable' | 'referred' | 'closed';
  assignedCounselor: string;
  emergencyContacts: EmergencyContact[];
  safetyPlan?: SafetyPlan;
  interventionHistory: CrisisIntervention[];
  notes: string;
  isMinor: boolean;
  guardianInfo?: GuardianInfo;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  canContact: boolean;
}

interface SafetyPlan {
  id: string;
  createdDate: Date;
  warningSigns: string[];
  copingStrategies: string[];
  socialSupports: string[];
  professionalSupports: string[];
  environmentalSafety: string[];
  crisisContacts: string[];
  lastUpdated: Date;
}

interface CrisisIntervention {
  id: string;
  startTime: Date;
  endTime?: Date;
  type: 'phone' | 'chat' | 'video' | 'in_person' | 'follow_up';
  riskAssessment: 'low' | 'moderate' | 'high' | 'imminent';
  interventionsUsed: string[];
  outcome: 'de_escalated' | 'referred' | 'hospitalized' | 'law_enforcement' | 'ongoing';
  referrals: string[];
  followUpScheduled?: Date;
  counselor: string;
  notes: string;
  duration: number; // minutes
}

interface GuardianInfo {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  notified: boolean;
  consentGiven: boolean;
}

interface CrisisAlert {
  id: string;
  clientId?: string;
  clientName?: string;
  type: 'high_risk_client' | 'repeated_contact' | 'no_contact' | 'escalation' | 'system_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  actions: string[];
}

interface CrisisStats {
  totalInterventions: number;
  activeClients: number;
  highRiskClients: number;
  avgResponseTime: number; // minutes
  successfulDeEscalations: number;
  referralsMade: number;
  hospitalizationsThisWeek: number;
  followUpsDue: number;
}

interface CrisisCounselorDashboardProps {
  className?: string;
}

// API helper functions
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

const riskLevelColors = {
  low: 'text-green-600 bg-green-50',
  moderate: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  imminent: 'text-red-600 bg-red-50'
};

const concernTypes = {
  suicidal_ideation: 'Suicidal Ideation',
  self_harm: 'Self Harm',
  substance_abuse: 'Substance Abuse',
  domestic_violence: 'Domestic Violence',
  panic_attack: 'Panic Attack',
  psychosis: 'Psychosis',
  other: 'Other'
};

const interventionTypes = {
  phone: 'Phone',
  chat: 'Chat',
  video: 'Video',
  in_person: 'In Person',
  follow_up: 'Follow Up'
};

export default function CrisisCounselorDashboard({ className = "" }: CrisisCounselorDashboardProps) {
  const [crisisClients, setCrisisClients] = useState<CrisisClient[]>([]);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);
  const [stats, setStats] = useState<CrisisStats>({
    totalInterventions: 0,
    activeClients: 0,
    highRiskClients: 0,
    avgResponseTime: 0,
    successfulDeEscalations: 0,
    referralsMade: 0,
    hospitalizationsThisWeek: 0,
    followUpsDue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'interventions' | 'alerts' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CrisisClient | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  // Fetch crisis data on component mount
  useEffect(() => {
    const fetchCrisisData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all data in parallel
        const [clientsData, alertsData, statsData] = await Promise.all([
          fetchWithAuth('/api/crisis/clients'),
          fetchWithAuth('/api/crisis/alerts'),
          fetchWithAuth('/api/crisis/stats')
        ]);

        // Transform clients data
        if (clientsData.clients) {
          const transformedClients = clientsData.clients.map((client: any) => ({
            ...client,
            lastContact: new Date(client.lastContact),
            nextFollowUp: client.nextFollowUp ? new Date(client.nextFollowUp) : undefined,
            safetyPlan: client.safetyPlan ? {
              ...client.safetyPlan,
              createdDate: new Date(client.safetyPlan.createdDate || Date.now()),
              lastUpdated: new Date(client.safetyPlan.lastUpdated || Date.now())
            } : undefined,
            interventionHistory: (client.interventionHistory || []).map((intervention: any) => ({
              ...intervention,
              startTime: new Date(intervention.startTime),
              endTime: intervention.endTime ? new Date(intervention.endTime) : undefined,
              followUpScheduled: intervention.followUpScheduled ? new Date(intervention.followUpScheduled) : undefined
            }))
          }));
          setCrisisClients(transformedClients);
        }

        // Transform alerts data
        if (alertsData.alerts) {
          const transformedAlerts = alertsData.alerts.map((alert: any) => ({
            ...alert,
            timestamp: new Date(alert.timestamp),
            acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
            resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
          }));
          setCrisisAlerts(transformedAlerts);
        }

        // Set stats
        if (statsData.stats) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error('Error fetching crisis data:', err);
        setError('Failed to load crisis data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCrisisData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchCrisisData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter clients based on search and filters
  const filteredClients = crisisClients.filter(client => {
    if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !client.phone.includes(searchTerm) &&
        !concernTypes[client.primaryConcern].toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedRiskLevel && client.riskLevel !== selectedRiskLevel) return false;
    if (selectedStatus && client.status !== selectedStatus) return false;
    return true;
  });

  // Get unacknowledged alerts
  const unacknowledgedAlerts = crisisAlerts.filter(alert => !alert.acknowledged);

  // Get high priority clients needing follow-up
  const urgentFollowUps = crisisClients.filter(client => 
    client.nextFollowUp && 
    client.nextFollowUp <= addHours(new Date(), 2) &&
    client.status === 'active'
  );

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetchWithAuth('/api/crisis/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ id: alertId, action: 'acknowledge' })
      });

      // Update local state
      setCrisisAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedBy: 'Current User', acknowledgedAt: new Date() }
          : alert
      ));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetchWithAuth('/api/crisis/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ id: alertId, action: 'resolve' })
      });

      // Update local state
      setCrisisAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true, resolvedBy: 'Current User', resolvedAt: new Date() }
          : alert
      ));
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError('Failed to resolve alert');
    }
  };

  const handleViewClient = (client: CrisisClient) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'imminent':
        return <FireIcon className="h-4 w-4" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'moderate':
        return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'low':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center">
          <ArrowTrendingUpIcon className={`h-4 w-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </span>
        </div>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6 ${className} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading crisis data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !crisisClients.length && !isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6 ${className} flex items-center justify-center`}>
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6 ${className}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-300 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </motion.div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              Crisis Counselor Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              24/7 crisis intervention and mental health emergency response
            </p>
          </div>
          
          {/* Emergency Actions */}
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Crisis Line Active</span>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <PhoneIcon className="h-4 w-4" />
              Emergency Protocols
            </button>
          </div>
        </div>

        {/* Urgent Alerts Banner */}
        {unacknowledgedAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-300 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <BellAlertIcon className="h-6 w-6 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">
                  {unacknowledgedAlerts.length} Urgent Alert{unacknowledgedAlerts.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-red-700">
                  {unacknowledgedAlerts[0].message}
                  {unacknowledgedAlerts.length > 1 && ` and ${unacknowledgedAlerts.length - 1} more`}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('alerts')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                View All
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'clients', label: 'Active Clients', icon: UserGroupIcon, count: stats.activeClients },
                { id: 'interventions', label: 'Interventions', icon: HeartIcon },
                { id: 'alerts', label: 'Alerts', icon: BellAlertIcon, count: unacknowledgedAlerts.length },
                { id: 'reports', label: 'Reports', icon: DocumentTextIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab.id 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Active Clients"
                    value={stats.activeClients}
                    subtitle="Currently in crisis care"
                    icon={UserGroupIcon}
                    color="text-blue-600"
                    trend={-8}
                  />
                  <StatCard
                    title="High Risk Clients"
                    value={stats.highRiskClients}
                    subtitle="Immediate attention needed"
                    icon={ExclamationTriangleIcon}
                    color="text-red-600"
                    trend={12}
                  />
                  <StatCard
                    title="Avg Response Time"
                    value={`${stats.avgResponseTime} min`}
                    subtitle="Crisis call response"
                    icon={ClockIcon}
                    color="text-green-600"
                    trend={-15}
                  />
                  <StatCard
                    title="De-escalations"
                    value={stats.successfulDeEscalations}
                    subtitle="This week"
                    icon={HeartIcon}
                    color="text-purple-600"
                    trend={5}
                  />
                </div>

                {/* Quick Actions and Urgent Items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Urgent Follow-ups */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Urgent Follow-ups</h3>
                    </div>
                    <div className="p-4">
                      {urgentFollowUps.length > 0 ? (
                        <div className="space-y-3">
                          {urgentFollowUps.slice(0, 3).map(client => (
                            <div key={client.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {getRiskIcon(client.riskLevel)}
                                <div>
                                  <p className="font-medium text-gray-900">{client.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Due: {client.nextFollowUp && format(client.nextFollowUp, 'h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewClient(client)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                              >
                                Contact
                              </button>
                            </div>
                          ))}
                          {urgentFollowUps.length > 3 && (
                            <p className="text-sm text-gray-600 text-center">
                              +{urgentFollowUps.length - 3} more follow-ups due
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-center py-4">No urgent follow-ups</p>
                      )}
                    </div>
                  </div>

                  {/* Recent High-Risk Interventions */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Recent High-Risk Cases</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {crisisClients
                          .filter(client => client.riskLevel === 'high' || client.riskLevel === 'imminent')
                          .slice(0, 3)
                          .map(client => {
                            const lastIntervention = client.interventionHistory[0];
                            return (
                              <div key={client.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {getRiskIcon(client.riskLevel)}
                                  <div>
                                    <p className="font-medium text-gray-900">{client.name}</p>
                                    <p className="text-sm text-gray-600">
                                      {concernTypes[client.primaryConcern]} • {format(client.lastContact, 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskLevelColors[client.riskLevel]}`}>
                                  {client.riskLevel}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crisis Line Activity */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Crisis Line Activity</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.totalInterventions}</div>
                        <div className="text-sm text-gray-600">Total Interventions</div>
                        <div className="text-xs text-gray-500 mt-1">This week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.referralsMade}</div>
                        <div className="text-sm text-gray-600">Referrals Made</div>
                        <div className="text-xs text-gray-500 mt-1">Ongoing care</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.hospitalizationsThisWeek}</div>
                        <div className="text-sm text-gray-600">Hospitalizations</div>
                        <div className="text-xs text-gray-500 mt-1">Emergency referrals</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients by name, phone, or concern..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                        <select
                          value={selectedRiskLevel}
                          onChange={(e) => setSelectedRiskLevel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">All Risk Levels</option>
                          <option value="imminent">Imminent</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="stable">Stable</option>
                          <option value="referred">Referred</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedRiskLevel('');
                            setSelectedStatus('');
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Client List */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredClients.map(client => (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewClient(client)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {getRiskIcon(client.riskLevel)}
                              <h3 className="font-medium text-gray-900">{client.name}</h3>
                              <span className="text-sm text-gray-600">Age {client.age}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskLevelColors[client.riskLevel]}`}>
                                {client.riskLevel}
                              </span>
                              {client.isMinor && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Minor
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">Concern:</span> {concernTypes[client.primaryConcern]}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span> {client.status}
                              </div>
                              <div>
                                <span className="font-medium">Last Contact:</span> {format(client.lastContact, 'MMM d, h:mm a')}
                              </div>
                              <div>
                                <span className="font-medium">Counselor:</span> {client.assignedCounselor}
                              </div>
                            </div>

                            {client.nextFollowUp && (
                              <div className={`text-sm p-2 rounded ${
                                client.nextFollowUp <= new Date() 
                                  ? 'bg-red-100 text-red-800' 
                                  : client.nextFollowUp <= addHours(new Date(), 2)
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                <CalendarIcon className="h-4 w-4 inline mr-1" />
                                Follow-up: {format(client.nextFollowUp, 'MMM d, h:mm a')}
                                {client.nextFollowUp <= new Date() && ' (Overdue)'}
                                {client.nextFollowUp > new Date() && client.nextFollowUp <= addHours(new Date(), 2) && ' (Due Soon)'}
                              </div>
                            )}

                            {client.safetyPlan && (
                              <div className="mt-2 text-sm text-green-600">
                                <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                                Safety plan in place
                              </div>
                            )}
                          </div>

                          <div className="flex items-start gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Call client logic
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Call Client"
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Chat with client logic
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Chat with Client"
                            >
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredClients.length === 0 && (
                    <div className="text-center py-12">
                      <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                      <p className="text-gray-600">
                        {searchTerm || selectedRiskLevel || selectedStatus
                          ? "Try adjusting your search criteria or filters."
                          : "Crisis clients will appear here when they contact the crisis line."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interventions Tab */}
            {activeTab === 'interventions' && (
              <div className="text-center py-12">
                <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Crisis Interventions</h3>
                <p className="text-gray-600">
                  Crisis intervention logs and documentation will be managed here.
                </p>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {crisisAlerts.length > 0 ? (
                  <AnimatePresence>
                    {crisisAlerts.map(alert => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`border rounded-lg p-4 ${
                          alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                          alert.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                          alert.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                          'border-blue-300 bg-blue-50'
                        } ${alert.resolved ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BellAlertIcon className={`h-5 w-5 ${
                                alert.severity === 'critical' ? 'text-red-600' :
                                alert.severity === 'high' ? 'text-orange-600' :
                                alert.severity === 'medium' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`} />
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {alert.severity}
                              </span>
                              <span className="text-sm text-gray-600">
                                {format(alert.timestamp, 'MMM d, h:mm a')}
                              </span>
                            </div>
                            
                            <h3 className="font-medium text-gray-900 mb-1">
                              {alert.clientName && `${alert.clientName} - `}{alert.message}
                            </h3>
                            
                            {alert.actions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {alert.actions.map((action, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {alert.acknowledged && (
                              <div className="mt-2 text-sm text-gray-600">
                                Acknowledged by {alert.acknowledgedBy} at {alert.acknowledgedAt && format(alert.acknowledgedAt, 'h:mm a')}
                              </div>
                            )}
                            
                            {alert.resolved && (
                              <div className="mt-1 text-sm text-green-600">
                                Resolved by {alert.resolvedBy} at {alert.resolvedAt && format(alert.resolvedAt, 'h:mm a')}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {!alert.acknowledged && (
                              <button
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Acknowledge
                              </button>
                            )}
                            {alert.acknowledged && !alert.resolved && (
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Resolve
                              </button>
                            )}
                            {alert.resolved && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-12">
                    <BellAlertIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active alerts</h3>
                    <p className="text-gray-600">System alerts and notifications will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Crisis Reports & Analytics</h3>
                <p className="text-gray-600">
                  Crisis intervention reports and statistical analysis will be available here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}