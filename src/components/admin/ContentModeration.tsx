'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ClockIcon,
  BellIcon,
  CogIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subHours, subMinutes } from 'date-fns';

interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'ai_sentiment' | 'image_content' | 'link_verification' | 'spam_detection';
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'auto_remove' | 'require_approval' | 'quarantine' | 'shadow_ban';
  keywords?: string[];
  patterns?: string[];
  confidence: number;
  createdDate: Date;
  lastModified: Date;
  triggerCount: number;
}

interface ContentItem {
  id: string;
  type: 'message' | 'post' | 'comment' | 'profile' | 'image' | 'file';
  content: string;
  author: {
    id: string;
    username: string;
    role: string;
  };
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'quarantined' | 'auto_flagged' | 'under_review';
  moderationScore: number;
  flags: Array<{
    rule: string;
    severity: string;
    confidence: number;
  }>;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  reportCount: number;
  isEdited: boolean;
  originalContent?: string;
  attachments?: string[];
}

interface ModerationAction {
  id: string;
  contentId: string;
  contentType: string;
  moderator: string;
  action: 'approved' | 'rejected' | 'edited' | 'quarantined' | 'deleted' | 'warned_user' | 'suspended_user';
  reason: string;
  timestamp: Date;
  details?: string;
  affectedUser: string;
}

interface SafetyMetrics {
  totalContent: number;
  flaggedContent: number;
  approvedContent: number;
  rejectedContent: number;
  autoModerated: number;
  manualReviews: number;
  averageReviewTime: number;
  falsePositives: number;
  trueThreatsPrevented: number;
}

const mockModerationRules: ModerationRule[] = [
  {
    id: 'rule-1',
    name: 'Hate Speech Detection',
    description: 'Detects and flags hate speech and discriminatory language',
    type: 'keyword',
    isActive: true,
    severity: 'critical',
    action: 'auto_remove',
    keywords: ['hate', 'discrimination', 'offensive terms'],
    confidence: 85,
    createdDate: subDays(new Date(), 30),
    lastModified: subDays(new Date(), 5),
    triggerCount: 47
  },
  {
    id: 'rule-2',
    name: 'Self-Harm Content',
    description: 'Identifies content related to self-harm and suicide',
    type: 'ai_sentiment',
    isActive: true,
    severity: 'critical',
    action: 'quarantine',
    confidence: 92,
    createdDate: subDays(new Date(), 45),
    lastModified: subDays(new Date(), 10),
    triggerCount: 23
  },
  {
    id: 'rule-3',
    name: 'Spam Detection',
    description: 'Detects repetitive and spam content',
    type: 'spam_detection',
    isActive: true,
    severity: 'medium',
    action: 'require_approval',
    confidence: 78,
    createdDate: subDays(new Date(), 60),
    lastModified: subDays(new Date(), 2),
    triggerCount: 156
  },
  {
    id: 'rule-4',
    name: 'Inappropriate Images',
    description: 'Scans uploaded images for inappropriate content',
    type: 'image_content',
    isActive: true,
    severity: 'high',
    action: 'flag',
    confidence: 82,
    createdDate: subDays(new Date(), 20),
    lastModified: subDays(new Date(), 1),
    triggerCount: 34
  },
  {
    id: 'rule-5',
    name: 'Professional Boundary Violations',
    description: 'Detects potential boundary violations in therapeutic contexts',
    type: 'pattern',
    isActive: true,
    severity: 'high',
    action: 'flag',
    patterns: ['personal contact', 'outside meeting', 'payment outside platform'],
    confidence: 75,
    createdDate: subDays(new Date(), 15),
    lastModified: subDays(new Date(), 3),
    triggerCount: 12
  }
];

const mockContentItems: ContentItem[] = [
  {
    id: 'content-1',
    type: 'message',
    content: 'I\'ve been having really dark thoughts lately and I don\'t know if I can keep going...',
    author: {
      id: 'user-123',
      username: 'strugglinguser',
      role: 'regular_user'
    },
    timestamp: subMinutes(new Date(), 15),
    status: 'quarantined',
    moderationScore: 92,
    flags: [
      { rule: 'Self-Harm Content', severity: 'critical', confidence: 92 }
    ],
    reportCount: 0,
    isEdited: false
  },
  {
    id: 'content-2',
    type: 'post',
    content: 'AMAZING WEIGHT LOSS PILLS!!! Buy now and get 50% off! Click here: suspicious-link.com',
    author: {
      id: 'user-456',
      username: 'spammer_account',
      role: 'regular_user'
    },
    timestamp: subMinutes(new Date(), 45),
    status: 'under_review',
    moderationScore: 78,
    flags: [
      { rule: 'Spam Detection', severity: 'medium', confidence: 78 },
      { rule: 'Link Verification', severity: 'high', confidence: 85 }
    ],
    reportCount: 3,
    isEdited: false
  },
  {
    id: 'content-3',
    type: 'comment',
    content: 'Maybe we could meet outside the platform to continue our sessions privately? I can pay you directly.',
    author: {
      id: 'user-789',
      username: 'client_user',
      role: 'regular_user'
    },
    timestamp: subHours(new Date(), 2),
    status: 'pending',
    moderationScore: 75,
    flags: [
      { rule: 'Professional Boundary Violations', severity: 'high', confidence: 75 }
    ],
    reportCount: 1,
    isEdited: false
  },
  {
    id: 'content-4',
    type: 'message',
    content: 'Thank you for the session today. Your guidance really helped me understand my anxiety better.',
    author: {
      id: 'user-321',
      username: 'grateful_client',
      role: 'regular_user'
    },
    timestamp: subHours(new Date(), 4),
    status: 'approved',
    moderationScore: 15,
    flags: [],
    reportCount: 0,
    isEdited: false,
    reviewedBy: 'moderator_chen',
    reviewedAt: subHours(new Date(), 3),
    reviewNotes: 'Positive therapeutic feedback - approved'
  }
];

const mockModerationActions: ModerationAction[] = [
  {
    id: 'action-1',
    contentId: 'content-1',
    contentType: 'message',
    moderator: 'crisis_team',
    action: 'quarantined',
    reason: 'Potential self-harm content requires immediate attention',
    timestamp: subMinutes(new Date(), 10),
    details: 'Content flagged for crisis intervention team review',
    affectedUser: 'user-123'
  },
  {
    id: 'action-2',
    contentId: 'content-5',
    contentType: 'post',
    moderator: 'moderator_wilson',
    action: 'rejected',
    reason: 'Spam content violation',
    timestamp: subHours(new Date(), 1),
    details: 'Multiple spam indicators detected',
    affectedUser: 'user-456'
  }
];

const mockSafetyMetrics: SafetyMetrics = {
  totalContent: 45678,
  flaggedContent: 1234,
  approvedContent: 42891,
  rejectedContent: 567,
  autoModerated: 890,
  manualReviews: 344,
  averageReviewTime: 12.5,
  falsePositives: 23,
  trueThreatsPrevented: 45
};

export default function ContentModeration() {
  const [activeView, setActiveView] = useState<'queue' | 'rules' | 'actions' | 'analytics'>('queue');
  const [rules, setRules] = useState<ModerationRule[]>(mockModerationRules);
  const [contentItems, setContentItems] = useState<ContentItem[]>(mockContentItems);
  const [moderationActions] = useState<ModerationAction[]>(mockModerationActions);
  const [safetyMetrics] = useState<SafetyMetrics>(mockSafetyMetrics);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'quarantined' | 'under_review' | 'auto_flagged'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || 
                           item.flags.some(flag => flag.severity === severityFilter);
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const pendingReview = contentItems.filter(item => 
    ['pending', 'under_review', 'quarantined', 'auto_flagged'].includes(item.status)
  ).length;

  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  }, []);

  const handleApproveContent = useCallback((contentId: string) => {
    setContentItems(prev => prev.map(item => 
      item.id === contentId 
        ? { 
            ...item, 
            status: 'approved',
            reviewedBy: 'current_moderator',
            reviewedAt: new Date(),
            reviewNotes: 'Approved after manual review'
          }
        : item
    ));
  }, []);

  const handleRejectContent = useCallback((contentId: string, reason: string) => {
    setContentItems(prev => prev.map(item => 
      item.id === contentId 
        ? { 
            ...item, 
            status: 'rejected',
            reviewedBy: 'current_moderator',
            reviewedAt: new Date(),
            reviewNotes: reason
          }
        : item
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'quarantined': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'auto_flagged': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
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

  if (activeView === 'rules') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Moderation Rules</h2>
            <p className="text-gray-600">Configure automated content moderation rules</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('queue')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Queue
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Add Rule
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Triggers
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
                {rules.map((rule) => (
                  <motion.tr
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {rule.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {rule.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Confidence: {rule.confidence}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {rule.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                        {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {rule.action.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.triggerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                          rule.isActive 
                            ? 'text-green-600 bg-green-50 border-green-200' 
                            : 'text-gray-600 bg-gray-50 border-gray-200'
                        }`}
                      >
                        {rule.isActive ? (
                          <>
                            <PlayIcon className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <PauseIcon className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <CogIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <XCircleIcon className="h-4 w-4" />
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

  if (activeView === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Safety Analytics</h2>
            <p className="text-gray-600">Content moderation performance and safety metrics</p>
          </div>
          <button
            onClick={() => setActiveView('queue')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Queue
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{safetyMetrics.totalContent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Content</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{safetyMetrics.flaggedContent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Flagged Content</div>
            <div className="text-xs text-gray-500 mt-1">
              {((safetyMetrics.flaggedContent / safetyMetrics.totalContent) * 100).toFixed(1)}% of total
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{safetyMetrics.approvedContent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-xs text-gray-500 mt-1">
              {((safetyMetrics.approvedContent / safetyMetrics.totalContent) * 100).toFixed(1)}% approval rate
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{safetyMetrics.trueThreatsPrevented}</div>
            <div className="text-sm text-gray-600">Threats Prevented</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Moderation Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Auto-Moderation Rate</span>
                  <span className="font-medium">{((safetyMetrics.autoModerated / safetyMetrics.flaggedContent) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-blue-600 rounded-full"
                    style={{ width: `${(safetyMetrics.autoModerated / safetyMetrics.flaggedContent) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Average Review Time</span>
                  <span className="font-medium">{safetyMetrics.averageReviewTime} min</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      safetyMetrics.averageReviewTime < 15 ? 'bg-green-500' :
                      safetyMetrics.averageReviewTime < 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((safetyMetrics.averageReviewTime / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">False Positive Rate</span>
                  <span className="font-medium">{((safetyMetrics.falsePositives / safetyMetrics.flaggedContent) * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (safetyMetrics.falsePositives / safetyMetrics.flaggedContent) < 0.05 ? 'bg-green-500' :
                      (safetyMetrics.falsePositives / safetyMetrics.flaggedContent) < 0.1 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((safetyMetrics.falsePositives / safetyMetrics.flaggedContent) * 200, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rule Performance</h3>
            <div className="space-y-3">
              {rules.filter(rule => rule.isActive).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                    <div className="text-xs text-gray-500">
                      {rule.type.replace('_', ' ')} • {rule.confidence}% confidence
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 h-2 bg-gray-200 rounded-full mr-3">
                      <div 
                        className={`h-2 rounded-full ${getSeverityColor(rule.severity).includes('red') ? 'bg-red-500' :
                          getSeverityColor(rule.severity).includes('orange') ? 'bg-orange-500' :
                          getSeverityColor(rule.severity).includes('yellow') ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${(rule.triggerCount / Math.max(...rules.map(r => r.triggerCount))) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {rule.triggerCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600">Review and moderate platform content for safety</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('analytics')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveView('rules')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Rules
          </button>
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingReview} Pending Review
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-orange-600">{pendingReview}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-red-600">
            {contentItems.filter(item => item.flags.some(flag => flag.severity === 'critical')).length}
          </div>
          <div className="text-sm text-gray-600">Critical Flags</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {contentItems.filter(item => item.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">Approved Today</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {rules.filter(rule => rule.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active Rules</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="quarantined">Quarantined</option>
              <option value="auto_flagged">Auto Flagged</option>
            </select>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Content Queue */}
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                item.flags.some(flag => flag.severity === 'critical') 
                  ? 'border-red-200 bg-red-50' 
                  : item.flags.some(flag => flag.severity === 'high')
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {item.type === 'message' && <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 mr-2" />}
                    {item.type === 'post' && <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />}
                    {item.type === 'comment' && <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 mr-2" />}
                    {item.type === 'profile' && <UserCircleIcon className="h-4 w-4 text-gray-400 mr-2" />}
                    
                    <span className="text-sm font-medium text-gray-900">
                      {item.author.username}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      • {format(item.timestamp, 'MMM d, HH:mm')}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-gray-900 mb-3 bg-gray-50 p-3 rounded-lg">
                    {item.content}
                  </div>
                  
                  {item.flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.flags.map((flag, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${getSeverityColor(flag.severity)}`}
                        >
                          <FlagIcon className="h-3 w-3 mr-1" />
                          {flag.rule} ({flag.confidence}%)
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>Score: {item.moderationScore}</span>
                    {item.reportCount > 0 && (
                      <span className="text-red-600">
                        {item.reportCount} report{item.reportCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.reviewedBy && (
                      <span>Reviewed by {item.reviewedBy}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedContent(item)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  {['pending', 'under_review', 'auto_flagged', 'quarantined'].includes(item.status) && (
                    <>
                      <button
                        onClick={() => handleApproveContent(item.id)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRejectContent(item.id, 'Content violates community guidelines')}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {filteredContent.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No content matches the current filters
            </div>
          )}
        </div>
      </div>

      {/* Content Detail Modal */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedContent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Content Details</h3>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                    <p className="text-gray-900">{selectedContent.author.username} ({selectedContent.author.role})</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {selectedContent.content}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moderation Flags</label>
                    <div className="space-y-2">
                      {selectedContent.flags.map((flag, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-gray-900">{flag.rule}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(flag.severity)}`}>
                              {flag.severity}
                            </span>
                            <span className="text-sm text-gray-600">{flag.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedContent.reviewNotes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
                      <p className="text-gray-900">{selectedContent.reviewNotes}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2 pt-4">
                    {['pending', 'under_review', 'auto_flagged', 'quarantined'].includes(selectedContent.status) && (
                      <>
                        <button
                          onClick={() => {
                            handleApproveContent(selectedContent.id);
                            setSelectedContent(null);
                          }}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            handleRejectContent(selectedContent.id, 'Violates community guidelines');
                            setSelectedContent(null);
                          }}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}