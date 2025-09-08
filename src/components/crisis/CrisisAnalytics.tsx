"use client";

/**
 * Crisis Analytics Component
 * Advanced analytics dashboard for crisis pattern analysis and reporting
 * Provides insights for healthcare providers and system improvement
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Download,
  ChevronUp,
  ChevronDown,
  Info,
  CheckCircle
} from 'lucide-react';
import { useCrisisStore } from '@/stores/crisisStore';
import CrisisDetectionService from '@/services/crisis/CrisisDetectionService';

interface CrisisAnalyticsProps {
  userId?: string;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  className?: string;
}

// Metric card component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  color, 
  bgColor 
}: MetricCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 ${bgColor} rounded-lg`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {change > 0 ? (
            <ChevronUp className="w-4 h-4 text-red-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-500" />
          )}
          <span className={`text-sm font-medium ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {Math.abs(change)}%
          </span>
        </div>
      )}
    </div>
    <p className="text-2xl font-bold mb-1">{value}</p>
    <p className="text-sm text-neutral-600 dark:text-neutral-400">{title}</p>
    {changeLabel && (
      <p className="text-xs text-neutral-500 mt-1">{changeLabel}</p>
    )}
  </motion.div>
);

export default function CrisisAnalytics({
  userId,
  timeRange = 'month',
  className = ''
}: CrisisAnalyticsProps) {
  // Store hooks
  const {
    crisisHistory,
    assessmentHistory,
    chatHistory,
    statistics,
    activeSafetyPlan
  } = useCrisisStore();
  
  // Local state
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [showDetailed, setShowDetailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Get crisis statistics from service
  const crisisStats = useMemo(() => {
    const hoursMap = {
      'day': 24,
      'week': 168,
      'month': 720,
      'year': 8760,
      'all': 999999
    };
    
    return CrisisDetectionService.getCrisisStatistics(
      userId,
      hoursMap[selectedTimeRange]
    );
  }, [userId, selectedTimeRange]);
  
  // Calculate time-filtered data
  const filteredData = useMemo(() => {
    const now = Date.now();
    const timeRanges = {
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      'year': 365 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    
    const cutoff = now - timeRanges[selectedTimeRange];
    
    const filtered = {
      crisisEpisodes: crisisHistory.filter(c => 
        new Date(c.timestamp).getTime() > cutoff
      ),
      assessments: assessmentHistory.filter(a => 
        new Date(a.timestamp).getTime() > cutoff
      ),
      chatSessions: chatHistory.filter(c => 
        new Date(c.startedAt).getTime() > cutoff
      )
    };
    
    return filtered;
  }, [crisisHistory, assessmentHistory, chatHistory, selectedTimeRange]);
  
  // Calculate analytics metrics
  const metrics = useMemo(() => {
    const { crisisEpisodes, assessments, chatSessions } = filteredData;
    
    // Crisis severity distribution
    const severityDistribution = {
      immediate: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      none: 0
    };
    
    crisisEpisodes.forEach(episode => {
      const key = episode.severity === 5 ? 'immediate' :
                  episode.severity === 4 ? 'critical' :
                  episode.severity === 3 ? 'high' :
                  episode.severity === 2 ? 'moderate' :
                  episode.severity === 1 ? 'low' : 'none';
      severityDistribution[key]++;
    });
    
    // Intervention success rate
    const resolvedChats = chatSessions.filter(c => c.status === 'resolved').length;
    const successRate = chatSessions.length > 0 
      ? Math.round((resolvedChats / chatSessions.length) * 100)
      : 0;
    
    // Average response time
    const avgResponseTime = crisisStats.averageResponseTime;
    
    // Risk assessment trends
    const highRiskAssessments = assessments.filter(a => 
      a.risk === 'high' || a.risk === 'immediate'
    ).length;
    
    // Coping strategy usage
    const copingUsage = statistics.copingStrategiesUsed;
    
    // Peak crisis times (hour of day)
    const crisisTimeDistribution = new Array(24).fill(0);
    crisisEpisodes.forEach(episode => {
      const hour = new Date(episode.timestamp).getHours();
      crisisTimeDistribution[hour]++;
    });
    
    const peakHour = crisisTimeDistribution.indexOf(Math.max(...crisisTimeDistribution));
    
    return {
      totalEpisodes: crisisEpisodes.length,
      severityDistribution,
      successRate,
      avgResponseTime,
      highRiskAssessments,
      copingUsage,
      peakHour,
      escalationRate: Math.round(crisisStats.escalationRate * 100)
    };
  }, [filteredData, crisisStats, statistics]);
  
  // Calculate trends (compare to previous period)
  const trends = useMemo(() => {
    // This would compare current period to previous period
    // Simplified for demo
    return {
      episodesChange: -12, // 12% decrease
      severityChange: -5,  // 5% decrease in average severity
      responseTimeChange: -20, // 20% faster response
      successRateChange: 8 // 8% improvement
    };
  }, []);
  
  /**
   * Export analytics report
   */
  const exportReport = async () => {
    setIsExporting(true);
    
    // Generate report data
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange: selectedTimeRange,
      userId: userId || 'all-users',
      summary: {
        totalCrisisEpisodes: metrics.totalEpisodes,
        averageSeverity: crisisStats.averageSeverity.toFixed(2),
        successRate: `${metrics.successRate}%`,
        averageResponseTime: `${Math.round(metrics.avgResponseTime)}ms`,
        escalationRate: `${metrics.escalationRate}%`
      },
      severityBreakdown: metrics.severityDistribution,
      interventions: {
        totalChatSessions: filteredData.chatSessions.length,
        resolvedSessions: filteredData.chatSessions.filter(c => c.status === 'resolved').length,
        escalatedSessions: filteredData.chatSessions.filter(c => c.status === 'escalated').length
      },
      riskAssessments: {
        total: filteredData.assessments.length,
        highRisk: metrics.highRiskAssessments,
        averageScore: filteredData.assessments.reduce((sum, a) => sum + a.score, 0) / (filteredData.assessments.length || 1)
      },
      copingStrategies: {
        totalUsed: metrics.copingUsage,
        mostEffective: activeSafetyPlan?.copingStrategies
          .sort((a, b) => b.effectiveness - a.effectiveness)
          .slice(0, 5)
          .map(s => ({ title: s.title, effectiveness: s.effectiveness }))
      },
      patterns: {
        peakCrisisHour: `${metrics.peakHour}:00`,
        mostCommonTriggers: [] // Would be extracted from crisis indicators
      },
      recommendations: generateRecommendations(metrics as any, crisisStats as any)
    };
    
    // Convert to JSON and download
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crisis-analytics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    setIsExporting(false);
  };
  
  /**
   * Generate recommendations based on analytics
   */
  const generateRecommendations = (metrics: any, stats: any) => {
    const recommendations = [];
    
    if (stats.escalationRate && stats.escalationRate > 30) {
      recommendations.push('High escalation rate detected - consider increasing check-in frequency');
    }
    
    if (metrics.avgResponseTime && metrics.avgResponseTime > 20000) {
      recommendations.push('Response times could be improved - optimize crisis detection algorithms');
    }
    
    if (metrics.successRate && metrics.successRate < 70) {
      recommendations.push('Intervention success rate below target - review crisis response protocols');
    }
    
    if (metrics.highRiskAssessments && metrics.highRiskAssessments > filteredData.assessments.length * 0.3) {
      recommendations.push('High proportion of high-risk assessments - increase preventive interventions');
    }
    
    if (metrics.peakHour !== undefined && (metrics.peakHour >= 22 || metrics.peakHour <= 4)) {
      recommendations.push('Crisis episodes peak during night hours - ensure 24/7 support availability');
    }
    
    return recommendations;
  };
  
  const recommendations = generateRecommendations(metrics, crisisStats);
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold">Crisis Analytics</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Pattern analysis and intervention insights
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTimeRange(e.target.value as 'day' | 'week' | 'month' | 'year' | 'all')}
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          
          <button
            onClick={exportReport}
            disabled={isExporting}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Activity className="w-4 h-4" />
              </motion.div>
            ) : (
              <Download size={18} />
            )}
            Export Report
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Crisis Episodes"
          value={metrics.totalEpisodes}
          change={trends.episodesChange}
          changeLabel="vs previous period"
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/20"
        />
        
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate}%`}
          change={trends.successRateChange}
          changeLabel="intervention success"
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        
        <MetricCard
          title="Avg Response Time"
          value={`${Math.round(metrics.avgResponseTime / 1000)}s`}
          change={trends.responseTimeChange}
          changeLabel="faster response"
          icon={Clock}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        
        <MetricCard
          title="Escalation Rate"
          value={`${metrics.escalationRate}%`}
          change={trends.severityChange}
          changeLabel="severity trend"
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>
      
      {/* Severity Distribution */}
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold mb-4">Crisis Severity Distribution</h2>
        <div className="space-y-3">
          {Object.entries(metrics.severityDistribution).map(([severity, count]) => {
            const total = metrics.totalEpisodes || 1;
            const percentage = Math.round((count / total) * 100);
            const colors = {
              immediate: 'bg-red-500',
              critical: 'bg-orange-500',
              high: 'bg-yellow-500',
              moderate: 'bg-blue-500',
              low: 'bg-green-500',
              none: 'bg-neutral-400'
            };
            
            return (
              <div key={severity} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium capitalize">{severity}</span>
                <div className="flex-1 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${colors[severity as keyof typeof colors]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Intervention Outcomes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold mb-4">Intervention Outcomes</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Sessions</span>
              <span className="font-medium">{filteredData.chatSessions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Resolved</span>
              <span className="font-medium text-green-600">
                {filteredData.chatSessions.filter(c => c.status === 'resolved').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Escalated</span>
              <span className="font-medium text-orange-600">
                {filteredData.chatSessions.filter(c => c.status === 'escalated').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Active</span>
              <span className="font-medium text-blue-600">
                {filteredData.chatSessions.filter(c => c.status === 'active').length}
              </span>
            </div>
            
            {/* Success rate visualization */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm font-bold">{metrics.successRate}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.successRate}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Risk Assessment Summary */}
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold mb-4">Risk Assessments</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Assessments</span>
              <span className="font-medium">{filteredData.assessments.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">High Risk</span>
              <span className="font-medium text-red-600">{metrics.highRiskAssessments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Moderate Risk</span>
              <span className="font-medium text-yellow-600">
                {filteredData.assessments.filter(a => a.risk === 'moderate').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Low Risk</span>
              <span className="font-medium text-green-600">
                {filteredData.assessments.filter(a => a.risk === 'low').length}
              </span>
            </div>
            
            {/* Average score */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Score</span>
                <span className="text-lg font-bold">
                  {filteredData.assessments.length > 0
                    ? (filteredData.assessments.reduce((sum, a) => sum + a.score, 0) / filteredData.assessments.length).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pattern Insights */}
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold mb-4">Pattern Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Peak Crisis Time</p>
            <p className="text-2xl font-bold">{metrics.peakHour}:00</p>
            <p className="text-xs text-neutral-500 mt-1">Most crisis episodes occur at this hour</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Coping Strategies Used</p>
            <p className="text-2xl font-bold">{metrics.copingUsage}</p>
            <p className="text-xs text-neutral-500 mt-1">Total strategies activated</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Avg Severity</p>
            <p className="text-2xl font-bold">{crisisStats.averageSeverity.toFixed(1)}/5</p>
            <p className="text-xs text-neutral-500 mt-1">Average crisis severity level</p>
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Recommendations
            </h2>
          </div>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2"
              >
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800 dark:text-blue-200">{rec}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Detailed View Toggle */}
      <button
        onClick={() => setShowDetailed(!showDetailed)}
        className="w-full py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {showDetailed ? (
          <>
            <ChevronUp size={20} />
            Hide Detailed Analytics
          </>
        ) : (
          <>
            <ChevronDown size={20} />
            Show Detailed Analytics
          </>
        )}
      </button>
      
      {/* Detailed Analytics (expanded view) */}
      {showDetailed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          {/* Crisis Timeline */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold mb-4">Crisis Timeline</h2>
            <div className="space-y-3">
              {filteredData.crisisEpisodes.slice(0, 10).map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    episode.severity >= 4 ? 'bg-red-500' :
                    episode.severity >= 3 ? 'bg-orange-500' :
                    episode.severity >= 2 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Severity {episode.severity} Crisis
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(episode.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {episode.responseTimeMs}ms response
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Intervention Effectiveness */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold mb-4">Intervention Effectiveness</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {statistics.successfulInterventions}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Successful
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(crisisStats.averageResponseTime / 1000)}s
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Avg Response
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {crisisStats.escalationRate}%
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Escalation Rate
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {crisisStats.totalAssessments}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Assessments
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}