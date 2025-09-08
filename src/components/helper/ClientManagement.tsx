'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UsersIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  HeartIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  ChartBarIcon,
  BellIcon,
  TagIcon,
  FlagIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

interface Client {
  id: string;
  userId: string;
  anonymousId: string;
  firstName?: string;
  displayName: string;
  email?: string;
  assignedDate: Date;
  lastContact?: Date;
  nextScheduledContact?: Date;
  status: 'active' | 'inactive' | 'on_hold' | 'completed' | 'transferred';
  riskLevel: 'low' | 'medium' | 'high' | 'crisis';
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  preferredContactMethod: 'chat' | 'video' | 'phone' | 'email';
  availableHours: string[];
  timezone: string;
  mentalHealthGoals: string[];
  interestedTopics: string[];
  crisisPlan?: string;
  notes: ClientNote[];
  tags: string[];
  progress: {
    overallScore: number; // 0-100
    moodTrend: 'improving' | 'stable' | 'declining';
    engagementLevel: 'high' | 'medium' | 'low';
    goalsProgress: { goal: string; progress: number }[];
  };
}

interface ClientNote {
  id: string;
  content: string;
  type: 'general' | 'session' | 'crisis' | 'progress' | 'admin';
  isPrivate: boolean;
  timestamp: Date;
  helperId: string;
}

interface ClientManagementProps {
  className?: string;
}

// Data will be fetched from API

export default function ClientManagement({ className = "" }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'riskLevel' | 'progress'>('lastContact');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState<ClientNote['type']>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch clients from API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/helper/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        
        const data = await response.json();
        setClients(data.clients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.anonymousId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || client.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.displayName.localeCompare(b.displayName);
      case 'lastContact':
        if (!a.lastContact && !b.lastContact) return 0;
        if (!a.lastContact) return 1;
        if (!b.lastContact) return -1;
        return b.lastContact.getTime() - a.lastContact.getTime();
      case 'riskLevel':
        const riskOrder = { crisis: 4, high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      case 'progress':
        return b.progress.overallScore - a.progress.overallScore;
      default:
        return 0;
    }
  });

  const getRiskLevelColor = (level: Client['riskLevel']) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'crisis': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'on_hold': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'transferred': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: Client['progress']['moodTrend']) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
    }
  };

  const addNote = async () => {
    if (!selectedClient || !newNote.trim()) return;

    try {
      const response = await fetch(`/api/helper/clients/${selectedClient.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newNote.trim(),
          type: newNoteType,
          isPrivate: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const data = await response.json();
      const note = data.note;

      // Update local state
      const updatedClients = clients.map(client =>
        client.id === selectedClient.id
          ? { ...client, notes: [note, ...client.notes] }
          : client
      );

      setClients(updatedClients);
      setSelectedClient({ ...selectedClient, notes: [note, ...selectedClient.notes] });
      setNewNote('');
      setNewNoteType('general');
    } catch (err) {
      console.error('Failed to add note:', err);
      // Could add toast notification here
    }
  };

  const getContactMethodIcon = (method: Client['preferredContactMethod']) => {
    switch (method) {
      case 'chat': return ChatBubbleLeftRightIcon;
      case 'video': return VideoCameraIcon;
      case 'phone': return PhoneIcon;
      case 'email': return EnvelopeIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your peer support relationships</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="transferred">Transferred</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="crisis">Crisis</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="lastContact">Sort by Last Contact</option>
          <option value="name">Sort by Name</option>
          <option value="riskLevel">Sort by Risk Level</option>
          <option value="progress">Sort by Progress</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <HeartIcon className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter(c => c.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active Clients</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter(c => c.riskLevel === 'high' || c.riskLevel === 'crisis').length}
              </p>
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(clients.reduce((sum, c) => sum + c.progress.overallScore, 0) / clients.length)}%
              </p>
              <p className="text-sm text-gray-600">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sortedClients.map(client => {
              const ContactIcon = getContactMethodIcon(client.preferredContactMethod);
              const daysSinceContact = client.lastContact 
                ? differenceInDays(new Date(), client.lastContact)
                : null;
              
              return (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{client.displayName}</h3>
                          <p className="text-sm text-gray-500">{client.anonymousId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(client.riskLevel)}`}>
                          {client.riskLevel}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                          {client.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progress</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{client.progress.overallScore}%</span>
                          <span className="text-sm">{getTrendIcon(client.progress.moodTrend)}</span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${client.progress.overallScore}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Sessions</span>
                        <span className="font-medium text-gray-900">{client.completedSessions}/{client.totalSessions}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Last Contact</span>
                        <span className="font-medium text-gray-900">
                          {client.lastContact 
                            ? `${daysSinceContact} days ago`
                            : 'Never'
                          }
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <ContactIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 capitalize">
                          {client.preferredContactMethod}
                        </span>
                      </div>

                      {client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {client.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {client.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{client.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Client</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Risk Level</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Progress</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Sessions</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Last Contact</th>
                  <th className="text-center py-3 px-6 text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedClients.map(client => {
                  const daysSinceContact = client.lastContact 
                    ? differenceInDays(new Date(), client.lastContact)
                    : null;
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.displayName}</p>
                            <p className="text-sm text-gray-500">{client.anonymousId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                          {client.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(client.riskLevel)}`}>
                          {client.riskLevel}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{client.progress.overallScore}%</span>
                          <span className="text-xs">{getTrendIcon(client.progress.moodTrend)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900">
                          {client.completedSessions}/{client.totalSessions}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900">
                          {client.lastContact 
                            ? `${daysSinceContact} days ago`
                            : 'Never'
                          }
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => setSelectedClient(client)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors">
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedClients.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== 'all' || riskFilter !== 'all'
              ? 'Try adjusting your search and filters'
              : 'Start by adding your first client'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && riskFilter === 'all' && (
            <button
              onClick={() => setShowAddClient(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Client
            </button>
          )}
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
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedClient.displayName}</h2>
                      <p className="text-gray-600">{selectedClient.anonymousId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(selectedClient.riskLevel)}`}>
                      {selectedClient.riskLevel} risk
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedClient.status)}`}>
                      {selectedClient.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex h-96">
                {/* Left Column - Client Info */}
                <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assigned Date:</span>
                          <span className="text-gray-900">{format(selectedClient.assignedDate, 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Sessions:</span>
                          <span className="text-gray-900">{selectedClient.totalSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Completed:</span>
                          <span className="text-gray-900">{selectedClient.completedSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Progress:</span>
                          <span className="text-gray-900">{selectedClient.progress.overallScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Engagement:</span>
                          <span className="text-gray-900 capitalize">{selectedClient.progress.engagementLevel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Preferred Contact:</span>
                          <span className="text-gray-900 capitalize">{selectedClient.preferredContactMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Goals & Progress</h3>
                      <div className="space-y-3">
                        {selectedClient.progress.goalsProgress.map((goal, index) => (
                          <div key={index}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700">{goal.goal}</span>
                              <span className="text-sm text-gray-500">{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedClient.crisisPlan && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
                          <ShieldCheckIcon className="w-5 h-5 mr-2" />
                          Crisis Plan
                        </h3>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">{selectedClient.crisisPlan}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Notes */}
                <div className="w-1/2 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notes & Updates</h3>
                      <button
                        onClick={() => {}} 
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View All
                      </button>
                    </div>

                    {/* Add Note */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <select
                          value={newNoteType}
                          onChange={(e) => setNewNoteType(e.target.value as ClientNote['type'])}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="general">General</option>
                          <option value="session">Session</option>
                          <option value="progress">Progress</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      />
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Note
                      </button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {selectedClient.notes.map(note => (
                        <div key={note.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                note.type === 'crisis' ? 'bg-red-100 text-red-800' :
                                note.type === 'progress' ? 'bg-green-100 text-green-800' :
                                note.type === 'session' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {note.type}
                              </span>
                              {note.isPrivate && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                  private
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(note.timestamp, 'MMM dd, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between">
                  <div className="flex space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      <span>Start Session</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Schedule</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
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