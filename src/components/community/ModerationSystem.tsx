'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Flag,
  User,
  MessageSquareOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronRight,
  Trash,
  RefreshCw,
  Activity,
  FileText,
  BarChart3,
  Lock,
  Timer,
  Sparkles,
  X
} from 'lucide-react';
import {
  ModerationReport,
  ModeratorAction,
  ReportReason,
  AnonymousUser
} from '@/types/community';

interface ModerationSystemProps {
  currentUser?: AnonymousUser;
  isModerator?: boolean;
  onActionTaken?: (report: ModerationReport, action: ModeratorAction) => void;
}

const ModerationSystem: React.FC<ModerationSystemProps> = ({
  isModerator = false,
  onActionTaken
}: ModerationSystemProps) => {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'escalated'>('pending');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, string>>(new Map());
  const [moderationStats, setModerationStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedToday: 0,
    averageResponseTime: 0,
    crisisInterventions: 0,
    falsePositiveRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [autoModEnabled, setAutoModEnabled] = useState(true);

  // Report reason details
  const reportReasonInfo: Record<ReportReason, { color: string; icon: React.ReactNode; description: string }> = {
    'harmful-content': {
      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      icon: <AlertTriangle className="w-4 h-4" />,
      description: 'Content that may cause harm'
    },
    'crisis-risk': {
      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      icon: <AlertCircle className="w-4 h-4" />,
      description: 'User may be in crisis'
    },
    'harassment': {
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      icon: <User className="w-4 h-4" />,
      description: 'Bullying or harassment'
    },
    'spam': {
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      icon: <MessageSquareOff className="w-4 h-4" />,
      description: 'Spam or promotional content'
    },
    'misinformation': {
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      icon: <XCircle className="w-4 h-4" />,
      description: 'False or misleading information'
    },
    'triggering-content': {
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      icon: <AlertTriangle className="w-4 h-4" />,
      description: 'Content that may trigger others'
    },
    'privacy-violation': {
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      icon: <Lock className="w-4 h-4" />,
      description: 'Sharing private information'
    },
    'other': {
      color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      icon: <Flag className="w-4 h-4" />,
      description: 'Other violation'
    }
  };

  // Moderation action descriptions
  const actionDescriptions: Record<ModeratorAction, string> = {
    'content-removed': 'Remove the reported content',
    'user-warned': 'Send a warning to the user',
    'user-suspended': 'Temporarily suspend the user',
    'user-banned': 'Permanently ban the user',
    'crisis-escalation': 'Escalate to crisis intervention',
    'no-action': 'No action needed',
    'content-edited': 'Edit the content to remove violations'
  };

  useEffect(() => {
    loadReports();
    loadModerationStats();
    if (autoModEnabled) {
      startAutoModeration();
    }

    return () => {
      stopAutoModeration();
    };
  }, [filterStatus, filterSeverity]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);
      if (filterSeverity !== 'all') queryParams.append('severity', filterSeverity);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      
      const response = await fetch(`/api/community/moderation/reports?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch moderation reports');
      }
      
      const data = await response.json();
      setReports(data.reports || []);

      // Generate AI suggestions for pending reports
      (data.reports || []).filter((r: ModerationReport) => r.status === 'pending').forEach((report: ModerationReport) => {
        generateAISuggestion(report);
      });
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStats = async () => {
    try {
      const response = await fetch('/api/community/moderation/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch moderation statistics');
      }
      
      const data = await response.json();
      setModerationStats(data.stats || {
        totalReports: 0,
        pendingReports: 0,
        resolvedToday: 0,
        averageResponseTime: 0,
        crisisInterventions: 0,
        falsePositiveRate: 0
      });
    } catch (error) {
      console.error('Failed to load moderation stats:', error);
      // Keep default values on error
    }
  };

  const generateAISuggestion = (report: ModerationReport) => {
    // Simulate AI analysis
    let suggestion = '';
    
    switch (report.reason) {
      case 'crisis-risk':
        suggestion = 'Immediate crisis intervention recommended. Contact crisis team and provide resources.';
        break;
      case 'harassment':
        suggestion = 'Review conversation history. Consider warning for first offense, suspension for repeat.';
        break;
      case 'spam':
        suggestion = 'Remove content and warn user. Check for other spam posts from same user.';
        break;
      case 'triggering-content':
        suggestion = 'Add trigger warning or move to appropriate support group with content warnings.';
        break;
      default:
        suggestion = 'Review content carefully and take appropriate action based on community guidelines.';
    }
    
    setAiSuggestions(prev => new Map(prev).set(report.id, suggestion));
  };

  const startAutoModeration = () => {
    // Simulate auto-moderation scanning
    console.log('Auto-moderation started');
  };

  const stopAutoModeration = () => {
    console.log('Auto-moderation stopped');
  };

  const handleTakeAction = async (report: ModerationReport, action: ModeratorAction) => {
    try {
      const response = await fetch('/api/community/moderation/take-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportId: report.id,
          action,
          notes: `Action taken: ${actionDescriptions[action]}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to take moderation action');
      }

      // Update local state with the resolved report
      setReports(prev => prev.map(r => {
        if (r.id === report.id) {
          return {
            ...r,
            status: 'resolved',
            actionTaken: action,
            resolvedAt: new Date(),
            moderatorNotes: `Action taken: ${actionDescriptions[action]}`
          };
        }
        return r;
      }));
      
      onActionTaken?.(report, action);
      setSelectedReport(null);
      
      // Reload stats to reflect changes
      loadModerationStats();
    } catch (error) {
      console.error('Failed to take action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'reviewed': return 'text-blue-600 dark:text-blue-400';
      case 'resolved': return 'text-green-600 dark:text-green-400';
      case 'escalated': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // If not a moderator, show report creation interface
  if (!isModerator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Report Content
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Help keep our community safe by reporting content that violates our guidelines
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(reportReasonInfo).map(([reason, info]) => (
                <button
                  key={reason}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 
                           hover:border-purple-500 dark:hover:border-purple-400 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {reason.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Moderator Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                Moderation Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Keep the community safe and supportive
              </p>
            </div>
            
            {/* Auto-Moderation Toggle */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-Moderation
              </span>
              <button
                onClick={() => setAutoModEnabled(!autoModEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoModEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoModEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {autoModEnabled && (
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {moderationStats.totalReports}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Reports</p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs text-yellow-600 dark:text-yellow-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {moderationStats.pendingReports}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Need Review</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">Today</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {moderationStats.resolvedToday}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">Resolved</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-600 dark:text-blue-400">Avg</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {moderationStats.averageResponseTime}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Min Response</p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-600 dark:text-red-400">Crisis</span>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
              {moderationStats.crisisInterventions}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">Interventions</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-purple-600 dark:text-purple-400">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {100 - moderationStats.falsePositiveRate}%
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300">True Positives</p>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
            
            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            {/* Refresh Button */}
            <button
              onClick={loadReports}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                       font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Reports List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-l-4 ${
                  report.severity === 'critical' ? 'border-red-500' :
                  report.severity === 'high' ? 'border-orange-500' :
                  report.severity === 'medium' ? 'border-yellow-500' :
                  'border-blue-500'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${reportReasonInfo[report.reason].color}`}>
                        {reportReasonInfo[report.reason].icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {report.reason.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(report.severity)}`}>
                            {report.severity.toUpperCase()}
                          </span>
                          <span className={`text-sm font-medium ${getStatusColor(report.status)}`}>
                            • {report.status}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                          {report.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Target: {report.targetType} #{report.targetId}</span>
                          <span>Reported {formatTimeAgo(report.createdAt)}</span>
                          {report.resolvedAt && (
                            <span>Resolved {formatTimeAgo(report.resolvedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  
                  {/* AI Suggestion */}
                  {report.status === 'pending' && aiSuggestions.has(report.id) && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            AI Suggestion
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                            {aiSuggestions.get(report.id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Previous Actions */}
                  {report.actionTaken && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Action Taken:</span> {actionDescriptions[report.actionTaken]}
                      </p>
                      {report.moderatorNotes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Notes:</span> {report.moderatorNotes}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  {report.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleTakeAction(report, 'content-removed')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg
                                 font-medium transition-colors flex items-center gap-1"
                      >
                        <Trash className="w-3 h-3" />
                        Remove
                      </button>
                      <button
                        onClick={() => handleTakeAction(report, 'user-warned')}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg
                                 font-medium transition-colors flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Warn
                      </button>
                      {report.severity === 'critical' && (
                        <button
                          onClick={() => handleTakeAction(report, 'crisis-escalation')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg
                                   font-medium transition-colors flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Escalate Crisis
                        </button>
                      )}
                      <button
                        onClick={() => handleTakeAction(report, 'no-action')}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm rounded-lg font-medium transition-colors"
                      >
                        No Action
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {reports.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              All Clear!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No reports matching your filters. The community is doing great!
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Report Detail Modal */}
        <AnimatePresence>
          {selectedReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedReport(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Report Details
                    </h2>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Report Information */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reason
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {selectedReport.reason.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {selectedReport.description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Severity
                        </label>
                        <p className="mt-1">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(selectedReport.severity)}`}>
                            {selectedReport.severity.toUpperCase()}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </label>
                        <p className={`mt-1 font-medium ${getStatusColor(selectedReport.status)}`}>
                          {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Target Type
                        </label>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {selectedReport.targetType}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Target ID
                        </label>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {selectedReport.targetId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {aiSuggestions.has(selectedReport.id) && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Analysis
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        {aiSuggestions.get(selectedReport.id)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedReport.status === 'pending' && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        Take Action
                      </h3>
                      
                      {Object.entries(actionDescriptions).map(([action, description]) => (
                        <button
                          key={action}
                          onClick={() => handleTakeAction(selectedReport, action as ModeratorAction)}
                          className="w-full p-3 text-left rounded-lg border-2 border-gray-200 dark:border-gray-600 
                                   hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {description}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModerationSystem;