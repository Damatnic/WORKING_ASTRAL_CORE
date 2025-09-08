'use client';

import { useState } from 'react';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Maximize2,
  Minimize2,
  Gauge,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  compact?: boolean;
  showRecommendations?: boolean;
}

export default function PerformanceMonitor({ 
  position = 'bottom-right', 
  compact = false,
  showRecommendations = true 
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'metrics' | 'resources' | 'recommendations'>('metrics');
  
  const { 
    metrics, 
    isMonitoring, 
    getMetricRating, 
    getPerformanceScore,
    getRecommendations 
  } = usePerformanceMonitor();

  if (!metrics || !isMonitoring) {
    return null;
  }

  const performanceScore = getPerformanceScore(metrics);
  const recommendations = getRecommendations(metrics);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
    }
  };

  const getRatingIcon = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good':
        return CheckCircle;
      case 'needs-improvement':
        return AlertTriangle;
      case 'poor':
        return XCircle;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${
            performanceScore >= 80 ? 'bg-green-500/90 border-green-600 text-white' :
            performanceScore >= 60 ? 'bg-yellow-500/90 border-yellow-600 text-white' :
            'bg-red-500/90 border-red-600 text-white'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span className="text-sm font-medium">{performanceScore}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full`}>
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Performance</h3>
            <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
              performanceScore >= 80 ? 'bg-green-100 text-green-800' :
              performanceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              <Gauge className="w-3 h-3 mr-1" />
              {performanceScore}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'metrics'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Metrics
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'resources'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Resources
              </button>
              {showRecommendations && recommendations.length > 0 && (
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'recommendations'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tips
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-3 max-h-64 overflow-y-auto">
              {activeTab === 'metrics' && (
                <div className="space-y-3">
                  {/* Core Web Vitals */}
                  {metrics.fcp > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${getRatingColor(getMetricRating('fcp', metrics.fcp))}`}>
                          {(() => {
                            const Icon = getRatingIcon(getMetricRating('fcp', metrics.fcp));
                            return <Icon className="w-3 h-3" />;
                          })()}
                        </div>
                        <span className="text-sm text-gray-700">FCP</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(metrics.fcp)}
                      </span>
                    </div>
                  )}

                  {metrics.lcp > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${getRatingColor(getMetricRating('lcp', metrics.lcp))}`}>
                          {(() => {
                            const Icon = getRatingIcon(getMetricRating('lcp', metrics.lcp));
                            return <Icon className="w-3 h-3" />;
                          })()}
                        </div>
                        <span className="text-sm text-gray-700">LCP</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(metrics.lcp)}
                      </span>
                    </div>
                  )}

                  {metrics.fid > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${getRatingColor(getMetricRating('fid', metrics.fid))}`}>
                          {(() => {
                            const Icon = getRatingIcon(getMetricRating('fid', metrics.fid));
                            return <Icon className="w-3 h-3" />;
                          })()}
                        </div>
                        <span className="text-sm text-gray-700">FID</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(metrics.fid)}
                      </span>
                    </div>
                  )}

                  {metrics.cls >= 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${getRatingColor(getMetricRating('cls', metrics.cls))}`}>
                          {(() => {
                            const Icon = getRatingIcon(getMetricRating('cls', metrics.cls));
                            return <Icon className="w-3 h-3" />;
                          })()}
                        </div>
                        <span className="text-sm text-gray-700">CLS</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.cls.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {/* Timing metrics */}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Load Complete</span>
                      <span className="text-xs font-medium text-gray-900">
                        {formatTime(metrics.loadComplete)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">DOM Ready</span>
                      <span className="text-xs font-medium text-gray-900">
                        {formatTime(metrics.domContentLoaded)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Resources</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.totalResources}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Total Size</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatBytes(metrics.totalSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Bundle Size</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatBytes(metrics.bundleSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Avg Load Time</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(metrics.averageLoadTime)}
                    </span>
                  </div>

                  {/* Memory usage */}
                  {metrics.usedJSHeapSize && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">JS Heap Used</span>
                        <span className="text-xs font-medium text-gray-900">
                          {formatBytes(metrics.usedJSHeapSize)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">JS Heap Total</span>
                        <span className="text-xs font-medium text-gray-900">
                          {formatBytes(metrics.totalJSHeapSize || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Connection info */}
                  {metrics.effectiveType && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Connection</span>
                        <span className="text-xs font-medium text-gray-900">
                          {metrics.effectiveType}
                        </span>
                      </div>
                      {metrics.rtt && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">RTT</span>
                          <span className="text-xs font-medium text-gray-900">
                            {metrics.rtt}ms
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recommendations' && recommendations.length > 0 && (
                <div className="space-y-2">
                  {recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded text-xs">
                      <Lightbulb className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-800">{recommendation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}