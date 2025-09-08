'use client';

import { useState, useEffect } from 'react';
import { 
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  HeartIcon,
  WrenchScrewdriverIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Import shared components
import {
  DashboardLayout,
  StatCard,
  DataTable,
  FilterControls,
  Modal,
  ActionButton,
  EmptyState,
  LoadingSpinner,
  ErrorBoundary,
  type Column,
  type FilterConfig,
  type BaseClient,
  type BaseSession,
  type DashboardStats,
  riskLevelColors,
  statusColors
} from '../shared';

// Import feature components
import ClientManagement from './ClientManagement';
import SessionTools from './SessionTools';
import ScheduleManager from './ScheduleManager';
import TrainingCertification from './TrainingCertification';
import PerformanceMetrics from './PerformanceMetrics';

interface HelperClient extends BaseClient {
  sessionCount: number;
  goals: string[];
  progress: number;
}

interface HelperStats extends DashboardStats {
  totalClients: number;
  activeClients: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
  responseTime: number;
  hoursThisWeek: number;
  clientSatisfaction: number;
}

interface HelperDashboardProps {
  className?: string;
}

export default function HelperDashboard({ className = "" }: HelperDashboardProps) {
  const [clients, setClients] = useState<HelperClient[]>([]);
  const [sessions, setSessions] = useState<BaseSession[]>([]);
  const [stats, setStats] = useState<HelperStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedClient, setSelectedClient] = useState<HelperClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    riskLevel: 'all'
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch helper data from API
        const [clientsRes, sessionsRes, statsRes] = await Promise.all([
          fetch('/api/helper/clients'),
          fetch('/api/helper/sessions'),
          fetch('/api/helper/stats')
        ]);

        if (!clientsRes.ok || !sessionsRes.ok || !statsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [clientsData, sessionsData, statsData] = await Promise.all([
          clientsRes.json(),
          sessionsRes.json(),
          statsRes.json()
        ]);

        setClients(clientsData.clients || []);
        setSessions(sessionsData.sessions || []);
        setStats(statsData.stats || {
          totalClients: 0,
          activeClients: 0,
          completedSessions: 0,
          upcomingSessions: 0,
          averageRating: 0,
          responseTime: 0,
          hoursThisWeek: 0,
          clientSatisfaction: 0
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         client.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || client.status === filters.status;
    const matchesRisk = filters.riskLevel === 'all' || client.riskLevel === filters.riskLevel;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Table columns for clients
  const clientColumns: Column<HelperClient>[] = [
    {
      id: 'name',
      label: 'Client Name',
      accessor: 'name',
      sortable: true
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[row.status].bg} ${statusColors[row.status].text}`}>
          {row.status}
        </span>
      )
    },
    {
      id: 'riskLevel',
      label: 'Risk Level',
      accessor: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskLevelColors[row.riskLevel].bg} ${riskLevelColors[row.riskLevel].text}`}>
          {row.riskLevel}
        </span>
      )
    },
    {
      id: 'sessions',
      label: 'Sessions',
      accessor: 'sessionCount',
      align: 'center'
    },
    {
      id: 'progress',
      label: 'Progress',
      accessor: (row) => (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${row.progress}%` }}
          />
        </div>
      )
    },
    {
      id: 'nextAppointment',
      label: 'Next Session',
      accessor: (row) => row.nextAppointment ? format(new Date(row.nextAppointment), 'MMM dd, h:mm a') : 'Not scheduled'
    }
  ];

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'on_hold', label: 'On Hold' }
      ]
    },
    {
      id: 'riskLevel',
      label: 'Risk Level',
      options: [
        { value: 'all', label: 'All Levels' },
        { value: 'low', label: 'Low' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'high', label: 'High' },
        { value: 'crisis', label: 'Crisis' }
      ]
    }
  ];

  // Navigation tabs
  const navigationTabs = (
    <div className="-mb-px flex space-x-8">
      {[
        { id: 'overview', label: 'Overview', icon: ChartBarIcon },
        { id: 'clients', label: 'My Clients', icon: UsersIcon },
        { id: 'sessions', label: 'Sessions', icon: ChatBubbleLeftRightIcon },
        { id: 'session-tools', label: 'Session Tools', icon: WrenchScrewdriverIcon },
        { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
        { id: 'training', label: 'Training', icon: AcademicCapIcon },
        { id: 'performance', label: 'Performance', icon: ArrowTrendingUpIcon }
      ].map(tab => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <IconComponent className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Header actions
  const headerActions = (
    <>
      <ActionButton
        variant="success"
        leftIcon={PlusIcon}
        onClick={() => console.log('New Session')}
      >
        New Session
      </ActionButton>
      <ActionButton
        variant="primary"
        leftIcon={ChatBubbleLeftRightIcon}
        onClick={() => console.log('Quick Message')}
      >
        Quick Message
      </ActionButton>
    </>
  );

  return (
    <ErrorBoundary>
      <DashboardLayout
        title="Helper Dashboard"
        subtitle="Manage your clients and sessions"
        navigationTabs={navigationTabs}
        headerActions={headerActions}
        isLoading={isLoading}
        error={error}
        className={className}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Clients"
                value={stats.totalClients}
                subtitle="All time"
                icon={UsersIcon}
                trend={8}
                variant="info"
              />
              <StatCard
                title="Active Clients"
                value={stats.activeClients}
                subtitle="Currently in care"
                icon={HeartIcon}
                trend={5}
                variant="success"
              />
              <StatCard
                title="Sessions This Week"
                value={stats.hoursThisWeek}
                subtitle="Hours completed"
                icon={ClockIcon}
                trend={12}
                variant="default"
              />
              <StatCard
                title="Avg Response Time"
                value={`${stats.responseTime}min`}
                subtitle="To client messages"
                icon={ChatBubbleLeftRightIcon}
                trend={-15}
                variant="warning"
              />
            </div>

            {/* Clients Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Clients</h3>
              {filteredClients.length > 0 ? (
                <DataTable
                  data={filteredClients.slice(0, 5)}
                  columns={clientColumns}
                  keyAccessor="id"
                  onRowClick={setSelectedClient}
                  showPagination={false}
                />
              ) : (
                <EmptyState
                  type="no-data"
                  title="No clients yet"
                  description="Start helping people by accepting new client requests."
                  primaryAction={{
                    label: 'Find Clients',
                    onClick: () => console.log('Find clients')
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <FilterControls
              searchPlaceholder="Search clients..."
              searchValue={filters.search}
              onSearchChange={(value) => setFilters({ ...filters, search: value })}
              filters={filterConfig}
              filterValues={{
                status: filters.status,
                riskLevel: filters.riskLevel
              }}
              onFilterChange={(id, value) => setFilters({ ...filters, [id]: value as string })}
              onClearFilters={() => setFilters({ search: '', status: 'all', riskLevel: 'all' })}
            />
            <ClientManagement />
          </div>
        )}

        {/* Session Tools Tab */}
        {activeTab === 'session-tools' && (
          <div className="h-[600px]">
            <SessionTools />
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && <ScheduleManager />}

        {/* Training Tab */}
        {activeTab === 'training' && <TrainingCertification />}

        {/* Performance Tab */}
        {activeTab === 'performance' && <PerformanceMetrics />}

        {/* Client Detail Modal */}
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={selectedClient?.name}
          size="lg"
        >
          {selectedClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedClient.status].bg} ${statusColors[selectedClient.status].text}`}>
                    {selectedClient.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Risk Level</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${riskLevelColors[selectedClient.riskLevel].bg} ${riskLevelColors[selectedClient.riskLevel].text}`}>
                    {selectedClient.riskLevel}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sessions</p>
                  <p className="text-gray-900">{selectedClient.sessionCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${selectedClient.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{selectedClient.progress}%</span>
                  </div>
                </div>
              </div>
              
              {selectedClient.goals && selectedClient.goals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Goals</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedClient.goals.map((goal, index) => (
                      <li key={index} className="text-sm text-gray-600">{goal}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedClient.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </DashboardLayout>
    </ErrorBoundary>
  );
}