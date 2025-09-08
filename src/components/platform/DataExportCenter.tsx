'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  ChartBarIcon,
  DocumentTextIcon,
  DocumentIcon,
  PhotoIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ShareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CloudArrowDownIcon,
  ServerIcon,
  DocumentDuplicateIcon,
  PresentationChartBarIcon,
  CogIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  EnvelopeIcon,
  LinkIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import {
  ArrowDownTrayIcon as ArrowDownTrayIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format, addDays, addWeeks, addMonths } from 'date-fns';

interface ExportJob {
  id: string;
  name: string;
  type: 'manual' | 'scheduled' | 'api';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  config: ExportConfig;
  result?: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    recordCount: number;
    expiresAt: Date;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    webhook?: string;
  };
  metadata?: {
    estimatedDuration?: number;
    actualDuration?: number;
    compressionRatio?: number;
    securityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

interface ExportConfig {
  dataSource: string;
  format: 'csv' | 'xlsx' | 'json' | 'pdf' | 'xml' | 'zip';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    userRoles?: string[];
    categories?: string[];
    tags?: string[];
    statuses?: string[];
    customFilters?: Record<string, any>;
  };
  fields: string[];
  options: {
    includeMetadata: boolean;
    includeAttachments: boolean;
    anonymize: boolean;
    compress: boolean;
    encrypt: boolean;
    passwordProtect: boolean;
    watermark: boolean;
  };
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
  limits: {
    maxRecords?: number;
    maxFileSize?: number; // in MB
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'clinical' | 'operational' | 'compliance' | 'analytics' | 'custom';
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
  config: ExportConfig;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
    nextRun?: Date;
  };
  recipients: Array<{
    email: string;
    name: string;
    role: string;
  }>;
}

interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'table' | 'view' | 'api' | 'file';
  category: string;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'object';
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
  recordCount: number;
  lastUpdated: Date;
  accessLevel: 'public' | 'internal' | 'restricted';
  compliance: {
    hipaa: boolean;
    gdpr: boolean;
    retention: string;
  };
}

const DataExportCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exports' | 'templates' | 'reports' | 'schedule'>('exports');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [showNewExport, setShowNewExport] = useState<boolean>(false);
  const [showNewTemplate, setShowNewTemplate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentExportConfig, setCurrentExportConfig] = useState<Partial<ExportConfig>>({
    format: 'csv',
    dateRange: {
      start: addDays(new Date(), -30),
      end: new Date()
    },
    filters: {},
    fields: [],
    options: {
      includeMetadata: true,
      includeAttachments: false,
      anonymize: false,
      compress: true,
      encrypt: true,
      passwordProtect: false,
      watermark: true
    },
    sorting: {
      field: 'created_at',
      order: 'desc'
    },
    limits: {}
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch data sources
        const [sourcesRes, jobsRes, templatesRes] = await Promise.all([
          fetch('/api/platform/export/data-sources'),
          fetch('/api/platform/export/jobs'),
          fetch('/api/platform/export/templates')
        ]);

        if (!sourcesRes.ok || !jobsRes.ok || !templatesRes.ok) {
          throw new Error('Failed to fetch export data');
        }

        const sourcesData = await sourcesRes.json();
        const jobsData = await jobsRes.json();
        const templatesData = await templatesRes.json();

        setDataSources(sourcesData.sources || []);
        setExportJobs(jobsData.jobs || []);
        setReportTemplates(templatesData.templates || []);
      } catch (err) {
        console.error('Error fetching export data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load export data');
        // Set empty arrays as fallback
        setDataSources([]);
        setExportJobs([]);
        setReportTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isLoading) {
        try {
          const res = await fetch('/api/platform/export/jobs');
          if (res.ok) {
            const data = await res.json();
            setExportJobs(data.jobs || []);
          }
        } catch (err) {
          console.error('Error refreshing jobs:', err);
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-600" />;
      case 'running':
        return <PlayIcon className="w-5 h-5 text-blue-600" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <StopIcon className="w-5 h-5 text-gray-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <TableCellsIcon className="w-5 h-5 text-green-600" />;
      case 'xlsx':
        return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
      case 'json':
        return <DocumentDuplicateIcon className="w-5 h-5 text-purple-600" />;
      case 'pdf':
        return <DocumentTextIconSolid className="w-5 h-5 text-red-600" />;
      case 'xml':
        return <DocumentIcon className="w-5 h-5 text-orange-600" />;
      case 'zip':
        return <ArchiveBoxIcon className="w-5 h-5 text-gray-600" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredJobs = exportJobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (typeFilter !== 'all' && job.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return job.name.toLowerCase().includes(query) ||
             job.config.dataSource.toLowerCase().includes(query) ||
             job.createdBy.toLowerCase().includes(query);
    }
    return true;
  });

  const startExport = async () => {
    if (!currentExportConfig.dataSource) {
      alert('Please select a data source');
      return;
    }
    try {
      const response = await fetch('/api/platform/export/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: currentExportConfig,
          name: `Export - ${new Date().toLocaleString()}`,
          priority: 'medium'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const newJob = await response.json();
      setExportJobs(prev => [newJob, ...prev]);
      setShowNewExport(false);

      // Poll for job status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/platform/export/jobs/${newJob.id}`);
          if (statusRes.ok) {
            const updatedJob = await statusRes.json();
            setExportJobs(prev => prev.map(job => 
              job.id === newJob.id ? updatedJob : job
            ));

            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error('Error polling job status:', err);
        }
      }, 2000);

      // Clear interval after 5 minutes to prevent memory leaks
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (err) {
      console.error('Error starting export:', err);
      alert('Failed to start export. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Export Data</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ArrowDownTrayIconSolid className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Export & Reporting</h1>
              <p className="text-gray-600">Export data and generate reports with advanced options</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewTemplate(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <ClipboardDocumentListIcon className="w-5 h-5" />
              <span>New Template</span>
            </button>
            
            <button
              onClick={() => setShowNewExport(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>New Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'exports', label: 'Export Jobs', icon: ArrowDownTrayIcon },
              { id: 'templates', label: 'Templates', icon: ClipboardDocumentListIcon },
              { id: 'reports', label: 'Reports', icon: ChartBarIcon },
              { id: 'schedule', label: 'Scheduling', icon: CalendarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Export Jobs Tab */}
      {activeTab === 'exports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search exports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>

          {/* Export Jobs List */}
          <div className="bg-white rounded-lg shadow-md">
            {selectedJobs.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 font-medium">
                    {selectedJobs.length} job(s) selected
                  </span>
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-2 py-1 rounded">
                      <PlayIcon className="w-4 h-4" />
                      <span>Restart</span>
                    </button>
                    <button className="flex items-center space-x-1 text-red-600 hover:text-red-700 px-2 py-1 rounded">
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-200">
              {filteredJobs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <ArrowDownTrayIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No export jobs found</h3>
                  <p>Create a new export job to get started</p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedJobs(prev => [...prev, job.id]);
                            } else {
                              setSelectedJobs(prev => prev.filter(id => id !== job.id));
                            }
                          }}
                          className="mt-1 rounded border-gray-300"
                        />

                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(job.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              getPriorityColor(job.priority)
                            }`}>
                              {job.priority}
                            </span>
                            <div className="flex items-center space-x-1">
                              {getFormatIcon(job.config.format)}
                              <span className="text-sm text-gray-500 uppercase">{job.config.format}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <ServerIcon className="w-4 h-4" />
                              <span>{job.config.dataSource}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <UserIcon className="w-4 h-4" />
                              <span>{job.createdBy}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>{formatDistance(job.createdAt, new Date(), { addSuffix: true })}</span>
                            </div>
                            {job.metadata?.securityLevel && (
                              <div className="flex items-center space-x-1">
                                <ShieldCheckIcon className="w-4 h-4" />
                                <span className="capitalize">{job.metadata.securityLevel}</span>
                              </div>
                            )}
                          </div>

                          {job.status === 'running' && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{Math.round(job.progress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {job.error && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-800">{job.error.message}</p>
                                  {job.error.details && (
                                    <p className="text-sm text-red-600 mt-1">{job.error.details}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {job.result && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-800">{job.result.fileName}</p>
                                  <div className="flex items-center space-x-4 text-sm text-green-600 mt-1">
                                    <span>{formatFileSize(job.result.fileSize)}</span>
                                    <span>{job.result.recordCount.toLocaleString()} records</span>
                                    <span>Expires {formatDistance(job.result.expiresAt, new Date(), { addSuffix: true })}</span>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button className="flex items-center space-x-1 text-green-600 hover:text-green-700 px-2 py-1 rounded">
                                    <CloudArrowDownIcon className="w-4 h-4" />
                                    <span>Download</span>
                                  </button>
                                  <button className="flex items-center space-x-1 text-green-600 hover:text-green-700 px-2 py-1 rounded">
                                    <ShareIcon className="w-4 h-4" />
                                    <span>Share</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {job.status === 'running' && (
                          <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                            <StopIcon className="w-4 h-4" />
                          </button>
                        )}
                        {(job.status === 'failed' || job.status === 'cancelled') && (
                          <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                            <PlayIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
              <button
                onClick={() => setShowNewTemplate(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Template
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {reportTemplates.map((template) => (
              <div key={template.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        template.category === 'clinical' ? 'bg-red-100 text-red-800' :
                        template.category === 'operational' ? 'bg-blue-100 text-blue-800' :
                        template.category === 'compliance' ? 'bg-yellow-100 text-yellow-800' :
                        template.category === 'analytics' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.category}
                      </span>
                      {template.isPublic && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{template.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="w-4 h-4" />
                        <span>{template.createdBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>Used {template.useCount} times</span>
                      </div>
                      {template.lastUsed && (
                        <span>Last used {formatDistance(template.lastUsed, new Date(), { addSuffix: true })}</span>
                      )}
                      {template.schedule?.enabled && (
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span className="capitalize">{template.schedule.frequency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button className="text-blue-600 hover:text-blue-700 px-3 py-1 text-sm font-medium">
                      Use Template
                    </button>
                    <button className="text-gray-600 hover:text-gray-700 px-3 py-1 text-sm">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-700 px-3 py-1 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <PresentationChartBarIcon className="w-8 h-8 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Usage Analytics</h3>
              </div>
              <p className="text-gray-600 mb-4">Comprehensive platform usage statistics and user behavior analysis</p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                Generate Report
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Clinical Summary</h3>
              </div>
              <p className="text-gray-600 mb-4">Monthly clinical activities, outcomes, and quality metrics</p>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                Generate Report
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Crisis Response</h3>
              </div>
              <p className="text-gray-600 mb-4">Crisis intervention analytics and response time metrics</p>
              <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Scheduled Reports</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {reportTemplates.filter(t => t.schedule?.enabled).map((template) => (
              <div key={template.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{template.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="capitalize">{template.schedule?.frequency}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{template.schedule?.time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BellIcon className="w-4 h-4" />
                        <span>{template.recipients.length} recipient(s)</span>
                      </div>
                      {template.schedule?.nextRun && (
                        <span>Next run: {format(template.schedule.nextRun, 'MMM d, yyyy HH:mm')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-700 px-3 py-1 text-sm">
                      Edit Schedule
                    </button>
                    <button className="text-gray-600 hover:text-gray-700 px-3 py-1 text-sm">
                      Pause
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Export Modal */}
      <AnimatePresence>
        {showNewExport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-90vh overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create New Export</h3>
                <button
                  onClick={() => setShowNewExport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
                  <select
                    value={currentExportConfig.dataSource || ''}
                    onChange={(e) => setCurrentExportConfig(prev => ({ ...prev, dataSource: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select data source...</option>
                    {dataSources.map((source) => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select
                    value={currentExportConfig.format}
                    onChange={(e) => setCurrentExportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                    <option value="xml">XML</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={currentExportConfig.dateRange?.start ? format(currentExportConfig.dateRange.start, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setCurrentExportConfig(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange!,
                          start: new Date(e.target.value)
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={currentExportConfig.dateRange?.end ? format(currentExportConfig.dateRange.end, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setCurrentExportConfig(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange!,
                          end: new Date(e.target.value)
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentExportConfig.options?.compress}
                        onChange={(e) => setCurrentExportConfig(prev => ({
                          ...prev,
                          options: { ...prev.options!, compress: e.target.checked }
                        }))}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm text-gray-700">Compress file</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentExportConfig.options?.encrypt}
                        onChange={(e) => setCurrentExportConfig(prev => ({
                          ...prev,
                          options: { ...prev.options!, encrypt: e.target.checked }
                        }))}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm text-gray-700">Encrypt file</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentExportConfig.options?.anonymize}
                        onChange={(e) => setCurrentExportConfig(prev => ({
                          ...prev,
                          options: { ...prev.options!, anonymize: e.target.checked }
                        }))}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm text-gray-700">Anonymize data</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewExport(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startExport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Export
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataExportCenter;