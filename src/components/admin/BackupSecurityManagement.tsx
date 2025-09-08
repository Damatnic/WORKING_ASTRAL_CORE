'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentArrowDownIcon,
  ServerIcon,
  CircleStackIcon,
  CpuChipIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UserIcon,
  MapPinIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subHours, subMinutes, addDays } from 'date-fns';

interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential' | 'snapshot';
  source: string;
  destination: string;
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
    time?: string;
    days?: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  lastRun?: Date;
  nextRun?: Date;
  duration?: number; // in minutes
  dataSize: number; // in GB
  retention: number; // in days
  encryption: boolean;
  compression: boolean;
  verificationEnabled: boolean;
  lastVerification?: Date;
  createdBy: string;
  createdAt: Date;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'failed_login' | 'permission_change' | 'data_access' | 'security_scan' | 'malware_detection' | 'network_intrusion' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  source: {
    ip: string;
    location?: string;
    userAgent?: string;
    userId?: string;
    username?: string;
  };
  target?: {
    resource: string;
    action: string;
  };
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolution?: string;
  affectedUsers: number;
  riskScore: number;
}

interface SecurityPolicy {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'data_protection' | 'network_security' | 'audit' | 'compliance';
  description: string;
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rules: Array<{
    condition: string;
    action: 'allow' | 'deny' | 'alert' | 'log' | 'require_mfa';
    parameters?: Record<string, any>;
  }>;
  lastModified: Date;
  modifiedBy: string;
  appliedTo: string[];
  violations: number;
}

interface AccessLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  location?: string;
  success: boolean;
  riskScore: number;
  metadata?: Record<string, any>;
}

const mockBackupJobs: BackupJob[] = [
  {
    id: 'backup-1',
    name: 'Database Full Backup',
    type: 'full',
    source: 'postgresql://primary-db',
    destination: 's3://astral-backups/database/',
    schedule: {
      frequency: 'daily',
      time: '02:00',
      days: ['*']
    },
    status: 'completed',
    lastRun: subHours(new Date(), 6),
    nextRun: addDays(new Date(), 1),
    duration: 45,
    dataSize: 15.2,
    retention: 30,
    encryption: true,
    compression: true,
    verificationEnabled: true,
    lastVerification: subHours(new Date(), 5),
    createdBy: 'admin_chen',
    createdAt: subDays(new Date(), 30),
    logs: [
      {
        timestamp: subHours(new Date(), 6),
        level: 'info',
        message: 'Backup started successfully'
      },
      {
        timestamp: subHours(new Date(), 5.25),
        level: 'info',
        message: 'Data compression completed - 68% size reduction'
      },
      {
        timestamp: subHours(new Date(), 5),
        level: 'info',
        message: 'Backup completed successfully - 15.2GB transferred'
      }
    ]
  },
  {
    id: 'backup-2',
    name: 'User Files Incremental',
    type: 'incremental',
    source: '/var/data/uploads',
    destination: 's3://astral-backups/files/',
    schedule: {
      frequency: 'hourly'
    },
    status: 'running',
    lastRun: subMinutes(new Date(), 30),
    nextRun: addDays(new Date(), 1),
    duration: 12,
    dataSize: 2.8,
    retention: 7,
    encryption: true,
    compression: false,
    verificationEnabled: false,
    createdBy: 'admin_wilson',
    createdAt: subDays(new Date(), 15),
    logs: [
      {
        timestamp: subMinutes(new Date(), 30),
        level: 'info',
        message: 'Incremental backup started'
      },
      {
        timestamp: subMinutes(new Date(), 25),
        level: 'info',
        message: 'Processing 247 changed files'
      }
    ]
  },
  {
    id: 'backup-3',
    name: 'Application Config Snapshot',
    type: 'snapshot',
    source: '/etc/astral-core',
    destination: 's3://astral-backups/config/',
    schedule: {
      frequency: 'weekly',
      time: '01:00',
      days: ['Sunday']
    },
    status: 'failed',
    lastRun: subDays(new Date(), 3),
    nextRun: addDays(new Date(), 4),
    duration: 2,
    dataSize: 0.1,
    retention: 90,
    encryption: true,
    compression: true,
    verificationEnabled: true,
    createdBy: 'admin_chen',
    createdAt: subDays(new Date(), 60),
    logs: [
      {
        timestamp: subDays(new Date(), 3),
        level: 'info',
        message: 'Config snapshot started'
      },
      {
        timestamp: subDays(new Date(), 3),
        level: 'error',
        message: 'Failed to access configuration directory - permission denied'
      }
    ]
  }
];

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: 'event-1',
    type: 'failed_login',
    severity: 'high',
    title: 'Multiple Failed Login Attempts',
    description: 'User attempted to login 15 times with incorrect credentials within 5 minutes',
    timestamp: subMinutes(new Date(), 20),
    source: {
      ip: '192.168.1.100',
      location: 'San Francisco, CA',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      username: 'suspicious_user'
    },
    status: 'investigating',
    assignedTo: 'security_team',
    affectedUsers: 1,
    riskScore: 75
  },
  {
    id: 'event-2',
    type: 'malware_detection',
    severity: 'critical',
    title: 'Malware Detected in File Upload',
    description: 'Suspicious file detected during upload scan - quarantined automatically',
    timestamp: subHours(new Date(), 2),
    source: {
      ip: '203.45.67.89',
      location: 'Unknown',
      userId: 'user-456',
      username: 'compromised_user'
    },
    target: {
      resource: '/uploads/documents',
      action: 'file_upload'
    },
    status: 'resolved',
    resolution: 'File quarantined, user account temporarily suspended for security review',
    affectedUsers: 1,
    riskScore: 95
  },
  {
    id: 'event-3',
    type: 'permission_change',
    severity: 'medium',
    title: 'Admin Privilege Granted',
    description: 'User granted administrative privileges',
    timestamp: subHours(new Date(), 8),
    source: {
      ip: '10.0.0.5',
      location: 'Internal Network',
      userId: 'admin-001',
      username: 'admin_chen'
    },
    target: {
      resource: 'user_management',
      action: 'privilege_escalation'
    },
    status: 'resolved',
    resolution: 'Authorized privilege escalation for new team member',
    affectedUsers: 1,
    riskScore: 45
  }
];

const mockSecurityPolicies: SecurityPolicy[] = [
  {
    id: 'policy-1',
    name: 'Multi-Factor Authentication',
    category: 'authentication',
    description: 'Require MFA for all administrative accounts and high-privilege users',
    isActive: true,
    severity: 'high',
    rules: [
      {
        condition: 'user.role IN ["admin", "crisis_counselor", "therapist"]',
        action: 'require_mfa'
      }
    ],
    lastModified: subDays(new Date(), 5),
    modifiedBy: 'admin_chen',
    appliedTo: ['admin', 'crisis_counselor', 'therapist'],
    violations: 2
  },
  {
    id: 'policy-2',
    name: 'Failed Login Lockout',
    category: 'authentication',
    description: 'Lock account after 5 failed login attempts within 15 minutes',
    isActive: true,
    severity: 'medium',
    rules: [
      {
        condition: 'failed_logins >= 5 AND timeframe <= 15min',
        action: 'deny',
        parameters: { lockoutDuration: 30 }
      }
    ],
    lastModified: subDays(new Date(), 10),
    modifiedBy: 'admin_wilson',
    appliedTo: ['all_users'],
    violations: 8
  },
  {
    id: 'policy-3',
    name: 'Sensitive Data Access Logging',
    category: 'audit',
    description: 'Log all access to sensitive patient data and crisis information',
    isActive: true,
    severity: 'critical',
    rules: [
      {
        condition: 'resource.type IN ["patient_data", "crisis_records", "therapy_notes"]',
        action: 'log',
        parameters: { retention: 7 * 365 } // 7 years
      }
    ],
    lastModified: subDays(new Date(), 1),
    modifiedBy: 'compliance_officer',
    appliedTo: ['all_users'],
    violations: 0
  }
];

const mockAccessLogs: AccessLog[] = [
  {
    id: 'log-1',
    userId: 'user-123',
    username: 'dr_chen',
    action: 'view_patient_record',
    resource: '/api/patients/456/records',
    timestamp: subMinutes(new Date(), 5),
    ip: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'San Francisco, CA',
    success: true,
    riskScore: 10,
    metadata: {
      patientId: '456',
      recordType: 'therapy_notes'
    }
  },
  {
    id: 'log-2',
    userId: 'user-789',
    username: 'crisis_counselor_rodriguez',
    action: 'create_crisis_alert',
    resource: '/api/crisis/alerts',
    timestamp: subMinutes(new Date(), 15),
    ip: '10.0.0.25',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Denver, CO',
    success: true,
    riskScore: 25,
    metadata: {
      alertType: 'high_risk',
      clientId: '789'
    }
  },
  {
    id: 'log-3',
    userId: 'user-456',
    username: 'suspicious_user',
    action: 'failed_login',
    resource: '/auth/login',
    timestamp: subMinutes(new Date(), 20),
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Unknown',
    success: false,
    riskScore: 85,
    metadata: {
      reason: 'invalid_credentials',
      attemptNumber: 15
    }
  }
];

export default function BackupSecurityManagement() {
  const [activeView, setActiveView] = useState<'overview' | 'backups' | 'security' | 'policies' | 'logs'>('overview');
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>(mockBackupJobs);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>(mockSecurityPolicies);
  const [accessLogs] = useState<AccessLog[]>(mockAccessLogs);
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const handleRunBackup = useCallback((backupId: string) => {
    setBackupJobs(prev => prev.map(job =>
      job.id === backupId
        ? {
            ...job,
            status: 'running',
            lastRun: new Date(),
            logs: [
              ...job.logs,
              {
                timestamp: new Date(),
                level: 'info',
                message: 'Manual backup started'
              }
            ]
          }
        : job
    ));
  }, []);

  const handleTogglePolicy = useCallback((policyId: string) => {
    setSecurityPolicies(prev => prev.map(policy =>
      policy.id === policyId
        ? { ...policy, isActive: !policy.isActive, lastModified: new Date() }
        : policy
    ));
  }, []);

  const handleResolveSecurityEvent = useCallback((eventId: string, resolution: string) => {
    setSecurityEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, status: 'resolved', resolution }
        : event
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'running':
      case 'investigating': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
      case 'open': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
      case 'false_positive': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const runningBackups = backupJobs.filter(job => job.status === 'running').length;
  const failedBackups = backupJobs.filter(job => job.status === 'failed').length;
  const openSecurityEvents = securityEvents.filter(event => event.status === 'open').length;
  const criticalEvents = securityEvents.filter(event => event.severity === 'critical' && event.status !== 'resolved').length;

  if (activeView === 'backups') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Backup Management</h2>
            <p className="text-gray-600">Manage data backups and recovery operations</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('overview')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Overview
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              New Backup Job
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{backupJobs.length}</div>
            <div className="text-sm text-gray-600">Total Backup Jobs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {backupJobs.filter(job => job.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Successful</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">{runningBackups}</div>
            <div className="text-sm text-gray-600">Running</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-red-600">{failedBackups}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Backup Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backupJobs.map((job) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{job.name}</div>
                        <div className="text-sm text-gray-500">{job.source}</div>
                        <div className="flex items-center mt-1">
                          {job.encryption && <LockClosedIcon className="h-3 w-3 text-green-600 mr-1" />}
                          {job.compression && <CircleStackIcon className="h-3 w-3 text-blue-600 mr-1" />}
                          {job.verificationEnabled && <CheckCircleIcon className="h-3 w-3 text-purple-600 mr-1" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.lastRun ? format(job.lastRun, 'MMM d, HH:mm') : 'Never'}
                      {job.duration && (
                        <div className="text-xs text-gray-400">{job.duration}m duration</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.nextRun ? format(job.nextRun, 'MMM d, HH:mm') : 'Manual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.dataSize.toFixed(1)} GB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedBackup(job)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRunBackup(job.id)}
                        className="text-green-600 hover:text-green-900"
                        disabled={job.status === 'running'}
                      >
                        <ArrowPathIcon className="h-4 w-4" />
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

  if (activeView === 'security') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Events</h2>
            <p className="text-gray-600">Monitor and respond to security incidents</p>
          </div>
          <div className="flex space-x-2">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {criticalEvents} Critical
            </span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {openSecurityEvents} Open
            </span>
            <button
              onClick={() => setActiveView('overview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Overview
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {securityEvents.map(event => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg shadow-sm border-l-4 p-6 ${
                event.severity === 'critical' ? 'border-l-red-500' :
                event.severity === 'high' ? 'border-l-orange-500' :
                event.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              } ${event.status === 'resolved' ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{event.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(event.status)}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{event.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">Type:</span> {event.type.replace('_', ' ')}</p>
                        <p><span className="text-gray-600">Time:</span> {format(event.timestamp, 'PPp')}</p>
                        <p><span className="text-gray-600">Risk Score:</span> <span className={`font-medium ${
                          event.riskScore > 80 ? 'text-red-600' :
                          event.riskScore > 60 ? 'text-orange-600' :
                          event.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'
                        }`}>{event.riskScore}/100</span></p>
                        <p><span className="text-gray-600">Affected Users:</span> {event.affectedUsers}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Source Information</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">IP Address:</span> {event.source.ip}</p>
                        {event.source.location && (
                          <p><span className="text-gray-600">Location:</span> {event.source.location}</p>
                        )}
                        {event.source.username && (
                          <p><span className="text-gray-600">Username:</span> {event.source.username}</p>
                        )}
                        {event.target && (
                          <p><span className="text-gray-600">Target:</span> {event.target.resource}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {event.resolution && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-1">Resolution</h4>
                      <p className="text-sm text-green-700">{event.resolution}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {event.status === 'open' && (
                    <button
                      onClick={() => handleResolveSecurityEvent(event.id, 'Manually resolved by administrator')}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'policies') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Policies</h2>
            <p className="text-gray-600">Configure and manage security policies</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('overview')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Overview
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              New Policy
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {securityPolicies.map(policy => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{policy.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getSeverityColor(policy.severity)}`}>
                      {policy.severity}
                    </span>
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                      {policy.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{policy.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Policy Rules</h4>
                      <div className="space-y-2">
                        {policy.rules.map((rule, index) => (
                          <div key={index} className="text-sm">
                            <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                              IF {rule.condition} THEN {rule.action}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Policy Status</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">Applied to:</span> {policy.appliedTo.join(', ')}</p>
                        <p><span className="text-gray-600">Violations:</span> <span className={`font-medium ${
                          policy.violations > 10 ? 'text-red-600' :
                          policy.violations > 5 ? 'text-orange-600' :
                          policy.violations > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>{policy.violations}</span></p>
                        <p><span className="text-gray-600">Last Modified:</span> {format(policy.lastModified, 'PPp')}</p>
                        <p><span className="text-gray-600">Modified By:</span> {policy.modifiedBy}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleTogglePolicy(policy.id)}
                    className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                      policy.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'logs') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Access Logs</h2>
            <p className="text-gray-600">Monitor user access and system activity</p>
          </div>
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Overview
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accessLogs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.username}</div>
                      {log.location && (
                        <div className="text-sm text-gray-500">{log.location}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(log.timestamp, 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.riskScore > 80 ? 'text-red-600 bg-red-50 border-red-200' :
                        log.riskScore > 60 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                        log.riskScore > 40 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                        'text-green-600 bg-green-50 border-green-200'
                      } border`}>
                        {log.riskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      )}
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

  // Overview (default view)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Backup & Security Management</h2>
          <p className="text-gray-600">Comprehensive data protection and security monitoring</p>
        </div>
      </div>

      {/* Alert Summary */}
      {(criticalEvents > 0 || failedBackups > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="font-medium text-red-800">Security & Backup Issues Require Attention</h3>
              <p className="text-red-700 text-sm">
                {criticalEvents > 0 && `${criticalEvents} critical security event${criticalEvents > 1 ? 's' : ''}`}
                {criticalEvents > 0 && failedBackups > 0 && ' • '}
                {failedBackups > 0 && `${failedBackups} failed backup${failedBackups > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-green-600">
            {backupJobs.filter(job => job.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Successful Backups</div>
          <div className="text-xs text-gray-500 mt-1">
            Last 24h
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{runningBackups}</div>
          <div className="text-sm text-gray-600">Running Backups</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-red-600">{criticalEvents}</div>
          <div className="text-sm text-gray-600">Critical Security Events</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {securityPolicies.filter(policy => policy.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active Policies</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'backups', label: 'Backups', icon: CloudArrowUpIcon, badge: failedBackups },
            { id: 'security', label: 'Security Events', icon: ShieldCheckIcon, badge: openSecurityEvents },
            { id: 'policies', label: 'Policies', icon: LockClosedIcon },
            { id: 'logs', label: 'Access Logs', icon: ClipboardDocumentListIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Backup Jobs</h3>
            <button
              onClick={() => setActiveView('backups')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {backupJobs.slice(0, 3).map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CloudArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{job.name}</p>
                    <p className="text-sm text-gray-600">
                      {job.lastRun ? format(job.lastRun, 'MMM d, HH:mm') : 'Never'} • {job.dataSize.toFixed(1)} GB
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
            <button
              onClick={() => setActiveView('security')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {securityEvents.slice(0, 3).map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">
                      {event.source.ip} • {format(event.timestamp, 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
            {securityEvents.length === 0 && (
              <p className="text-gray-500 text-center py-4">No recent security events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}