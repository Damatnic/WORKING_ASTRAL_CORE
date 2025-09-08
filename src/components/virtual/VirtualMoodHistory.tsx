/**
 * Virtual Mood History Component
 * Optimized for mood tracking data with timeline visualization
 * Supports trend analysis, pattern recognition, and therapeutic insights
 */

'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Activity, Sun, Moon, Cloud, Zap, Heart, Brain, Coffee } from 'lucide-react';
import { useVirtualScroll, useScrollRestoration } from '@/hooks/useVirtualScroll';
import { cn } from '@/lib/utils';

export interface MoodEntry {
  id: string;
  date: Date;
  timestamp: Date;
  mood: {
    overall: number; // 1-10 scale
    anxiety: number; // 1-10 scale
    depression: number; // 1-10 scale
    stress: number; // 1-10 scale
    energy: number; // 1-10 scale
    focus: number; // 1-10 scale
    social: number; // 1-10 scale
  };
  emotions: Array<{
    name: string;
    intensity: number; // 1-5 scale
    color: string;
  }>;
  triggers?: Array<{
    type: 'positive' | 'negative' | 'neutral';
    description: string;
    intensity: number;
  }>;
  activities?: Array<{
    name: string;
    duration?: number; // minutes
    enjoyment: number; // 1-5 scale
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    time: Date;
    sideEffects?: string[];
  }>;
  sleep?: {
    quality: number; // 1-5 scale
    duration: number; // hours
    bedtime?: Date;
    wakeTime?: Date;
  };
  weather?: {
    condition: string;
    temperature: number;
    humidity: number;
  };
  cycle?: {
    phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
    symptoms?: string[];
  };
  notes?: string;
  location?: string;
  socialInteractions?: number; // count
  physicalSymptoms?: string[];
  copingStrategies?: Array<{
    strategy: string;
    effectiveness: number; // 1-5 scale
  }>;
  therapeuticGoals?: Array<{
    goal: string;
    progress: number; // 0-100
  }>;
}

interface VirtualMoodHistoryProps {
  entries: MoodEntry[];
  height: number;
  onLoadMore?: () => Promise<void>;
  onEntrySelect?: (entry: MoodEntry) => void;
  onEntryEdit?: (entryId: string) => void;
  onAnalyzePattern?: (entries: MoodEntry[]) => void;
  onExportData?: (entries: MoodEntry[]) => void;
  hasMore?: boolean;
  loading?: boolean;
  showTrends?: boolean;
  showCorrelations?: boolean;
  showMedications?: boolean;
  showActivities?: boolean;
  showSleep?: boolean;
  compactMode?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  selectedMetrics?: Array<keyof MoodEntry['mood']>;
  className?: string;
  entryClassName?: string;
}

const moodColors = {
  1: 'bg-red-500',
  2: 'bg-red-400',
  3: 'bg-orange-400',
  4: 'bg-yellow-400',
  5: 'bg-yellow-300',
  6: 'bg-green-300',
  7: 'bg-green-400',
  8: 'bg-green-500',
  9: 'bg-blue-400',
  10: 'bg-blue-500',
};

const metricIcons = {
  overall: Heart,
  anxiety: Brain,
  depression: Cloud,
  stress: Zap,
  energy: Sun,
  focus: Activity,
  social: Coffee,
};

export function VirtualMoodHistory({
  entries,
  height,
  onLoadMore,
  onEntrySelect,
  onEntryEdit,
  onAnalyzePattern,
  onExportData,
  hasMore = false,
  loading = false,
  showTrends = true,
  showCorrelations = true,
  showMedications = true,
  showActivities = true,
  showSleep = true,
  compactMode = false,
  timeRange = 'week',
  selectedMetrics = ['overall', 'anxiety', 'energy'],
  className,
  entryClassName,
}: VirtualMoodHistoryProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'chart' | 'calendar'>('timeline');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

  // Scroll restoration
  const { handleScroll: handleScrollRestore } = useScrollRestoration({
    key: 'mood-history',
    enabled: true
  });

  // Calculate trends and patterns
  const analytics = useMemo(() => {
    if (entries.length < 2) return null;

    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    const trends: Record<string, 'up' | 'down' | 'stable'> = {};
    const averages: Record<string, number> = {};

    // Calculate averages and trends
    selectedMetrics.forEach(metric => {
      const values = sortedEntries.map(e => e.mood[metric]);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      averages[metric] = avg;

      // Calculate trend (last 7 days vs previous 7 days)
      if (values.length >= 14) {
        const recent = values.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
        const previous = values.slice(-14, -7).reduce((sum, val) => sum + val, 0) / 7;
        const diff = recent - previous;
        
        if (Math.abs(diff) < 0.5) trends[metric] = 'stable';
        else trends[metric] = diff > 0 ? 'up' : 'down';
      }
    });

    // Find correlations
    const correlations = showCorrelations ? {
      sleepMood: calculateCorrelation(
        entries.filter(e => e.sleep).map(e => e.sleep!.quality),
        entries.filter(e => e.sleep).map(e => e.mood.overall)
      ),
      weatherMood: entries.filter(e => e.weather).length > 10 ? 0.3 : null, // Placeholder
    } : {};

    return { trends, averages, correlations };
  }, [entries, selectedMetrics, showCorrelations]);

  // Calculate correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number | null => {
    if (x.length !== y.length || x.length < 3) return null;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? null : numerator / denominator;
  };

  // Group entries by time range
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, MoodEntry[]>();
    
    entries.forEach(entry => {
      let key: string;
      const date = entry.date;
      
      switch (timeRange) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });
    
    return Array.from(groups.entries()).map(([period, periodEntries]) => ({
      period,
      entries: periodEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      average: {
        overall: periodEntries.reduce((sum, e) => sum + e.mood.overall, 0) / periodEntries.length,
        anxiety: periodEntries.reduce((sum, e) => sum + e.mood.anxiety, 0) / periodEntries.length,
        energy: periodEntries.reduce((sum, e) => sum + e.mood.energy, 0) / periodEntries.length,
      }
    })).sort((a, b) => b.period.localeCompare(a.period));
  }, [entries, timeRange]);

  // Estimate item height
  const estimateItemHeight = useCallback((index: number) => {
    const group = groupedEntries[index];
    if (!group) return 100;
    
    if (compactMode) return 60;
    
    const baseHeight = 80;
    const entriesHeight = group.entries.length * 40;
    const detailsHeight = showDetails.has(group.period) ? 100 : 0;
    
    return baseHeight + Math.min(entriesHeight, 200) + detailsHeight;
  }, [groupedEntries, compactMode, showDetails]);

  // Virtual scrolling
  const { scrollElementRef, handleScroll } = useVirtualScroll(groupedEntries, height, {
    itemHeight: estimateItemHeight,
    overscan: 2
  });

  // Toggle details view
  const toggleDetails = useCallback((period: string) => {
    setShowDetails(prev => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  }, []);

  // Format period label
  const formatPeriodLabel = useCallback((period: string): string => {
    switch (timeRange) {
      case 'day':
        return new Date(period).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      case 'week':
        const weekStart = new Date(period);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        const [year, month] = period.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
      case 'year':
        return period;
      default:
        return period;
    }
  }, [timeRange]);

  // Render mood metric bar
  const renderMoodBar = useCallback((metric: keyof MoodEntry['mood'], value: number, label?: string) => {
    const percentage = (value / 10) * 100;
    const colorClass = moodColors[Math.round(value) as keyof typeof moodColors] || 'bg-gray-300';
    const Icon = metricIcons[metric];
    
    return (
      <div className="flex items-center gap-3" title={`${metric}: ${value.toFixed(1)}/10`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 capitalize truncate">
            {label || metric}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn('h-full transition-all duration-300', colorClass)}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 w-8 text-right">
            {value.toFixed(1)}
          </span>
        </div>
      </div>
    );
  }, []);

  // Render individual mood entry
  const renderMoodEntry = useCallback((entry: MoodEntry, isExpanded: boolean) => {
    return (
      <div 
        className={cn(
          'p-3 rounded-lg border transition-all duration-200',
          selectedEntry === entry.id 
            ? 'border-blue-300 bg-blue-50' 
            : 'border-gray-200 bg-white hover:bg-gray-50'
        )}
        onClick={() => {
          setSelectedEntry(selectedEntry === entry.id ? null : entry.id);
          onEntrySelect?.(entry);
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <time className="text-sm font-medium text-gray-900">
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
            {entry.location && (
              <span className="text-xs text-gray-500">• {entry.location}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              moodColors[Math.round(entry.mood.overall) as keyof typeof moodColors]
            )} />
            <span className="text-sm font-medium">
              {entry.mood.overall.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Mood metrics */}
        <div className="space-y-2 mb-3">
          {selectedMetrics.map(metric => 
            renderMoodBar(metric, entry.mood[metric])
          )}
        </div>

        {/* Emotions */}
        {entry.emotions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {entry.emotions.slice(0, isExpanded ? undefined : 5).map((emotion, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded-full border"
                style={{ 
                  backgroundColor: emotion.color + '20',
                  borderColor: emotion.color + '40',
                  color: emotion.color 
                }}
              >
                {emotion.name} {emotion.intensity}/5
              </span>
            ))}
          </div>
        )}

        {/* Activities */}
        {showActivities && entry.activities && entry.activities.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-600 mb-1">Activities</h5>
            <div className="space-y-1">
              {entry.activities.slice(0, isExpanded ? undefined : 3).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{activity.name}</span>
                  <div className="flex items-center gap-2">
                    {activity.duration && (
                      <span className="text-xs text-gray-500">{activity.duration}min</span>
                    )}
                    <span className={cn(
                      'text-xs px-1 py-0.5 rounded',
                      activity.impact === 'positive' && 'bg-green-100 text-green-700',
                      activity.impact === 'negative' && 'bg-red-100 text-red-700',
                      activity.impact === 'neutral' && 'bg-gray-100 text-gray-700'
                    )}>
                      {activity.enjoyment}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sleep */}
        {showSleep && entry.sleep && (
          <div className="mb-3 text-sm">
            <span className="text-gray-600">Sleep: </span>
            <span className="font-medium">
              {entry.sleep.duration}h, Quality: {entry.sleep.quality}/5
            </span>
          </div>
        )}

        {/* Medications */}
        {showMedications && entry.medications && entry.medications.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-600 mb-1">Medications</h5>
            <div className="text-sm text-gray-700">
              {entry.medications.map(med => `${med.name} (${med.dosage})`).join(', ')}
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="text-sm text-gray-700 italic">
            &ldquo;{entry.notes.length > 100 && !isExpanded 
              ? entry.notes.slice(0, 100) + '...' 
              : entry.notes}&rdquo;
          </div>
        )}
      </div>
    );
  }, [selectedEntry, selectedMetrics, showActivities, showSleep, showMedications, renderMoodBar, onEntrySelect]);

  // Render grouped entries
  const renderGroupedEntries = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const group = groupedEntries[index];
    if (!group) return null;

    const isExpanded = showDetails.has(group.period);
    const averageOverall = group.average.overall;
    
    return (
      <div
        style={style}
        className={cn('px-4 py-3 border-b border-gray-100', entryClassName)}
      >
        {/* Period header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {formatPeriodLabel(group.period)}
              </h3>
              <div className="text-sm text-gray-500">
                {group.entries.length} entries • Avg: {averageOverall.toFixed(1)}/10
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Trend indicator */}
            {showTrends && analytics?.trends.overall && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-sm',
                analytics.trends.overall === 'up' && 'bg-green-100 text-green-700',
                analytics.trends.overall === 'down' && 'bg-red-100 text-red-700',
                analytics.trends.overall === 'stable' && 'bg-gray-100 text-gray-700'
              )}>
                {analytics.trends.overall === 'up' && <TrendingUp className="w-4 h-4" />}
                {analytics.trends.overall === 'down' && <TrendingDown className="w-4 h-4" />}
                {analytics.trends.overall === 'stable' && <BarChart3 className="w-4 h-4" />}
                <span className="capitalize">{analytics.trends.overall}</span>
              </div>
            )}
            
            <button
              onClick={() => toggleDetails(group.period)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {/* Average mood bars */}
        {!compactMode && (
          <div className="mb-4 space-y-2">
            {selectedMetrics.map(metric => 
              renderMoodBar(metric, group.average[metric as keyof typeof group.average] || 0)
            )}
          </div>
        )}

        {/* Individual entries */}
        {isExpanded && (
          <div className="space-y-3 ml-6">
            {group.entries.map(entry => renderMoodEntry(entry, true))}
          </div>
        )}
        
        {/* Compact entries preview */}
        {!isExpanded && !compactMode && (
          <div className="grid grid-cols-1 gap-2 ml-6">
            {group.entries.slice(0, 3).map(entry => (
              <div key={entry.id} className="text-sm text-gray-600">
                {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                Overall: {entry.mood.overall}/10
                {entry.notes && ` • ${entry.notes.slice(0, 50)}...`}
              </div>
            ))}
            {group.entries.length > 3 && (
              <button
                onClick={() => toggleDetails(group.period)}
                className="text-sm text-blue-600 hover:text-blue-700 text-left"
              >
                +{group.entries.length - 3} more entries
              </button>
            )}
          </div>
        )}
      </div>
    );
  }, [
    groupedEntries, 
    showDetails, 
    entryClassName, 
    formatPeriodLabel, 
    showTrends, 
    analytics, 
    compactMode, 
    selectedMetrics, 
    renderMoodBar, 
    renderMoodEntry, 
    toggleDetails
  ]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Analytics header */}
      {analytics && !compactMode && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Averages */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Averages</h4>
              <div className="space-y-1">
                {selectedMetrics.map(metric => (
                  <div key={metric} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{metric}:</span>
                    <span className="font-medium">{analytics.averages[metric]?.toFixed(1)}/10</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trends */}
            {showTrends && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Trends</h4>
                <div className="space-y-1">
                  {selectedMetrics.map(metric => (
                    <div key={metric} className="flex justify-between items-center text-sm">
                      <span className="capitalize text-gray-600">{metric}:</span>
                      <div className={cn(
                        'flex items-center gap-1',
                        analytics.trends[metric] === 'up' && 'text-green-600',
                        analytics.trends[metric] === 'down' && 'text-red-600',
                        analytics.trends[metric] === 'stable' && 'text-gray-600'
                      )}>
                        {analytics.trends[metric] === 'up' && <TrendingUp className="w-3 h-3" />}
                        {analytics.trends[metric] === 'down' && <TrendingDown className="w-3 h-3" />}
                        <span className="capitalize">{analytics.trends[metric]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correlations */}
            {showCorrelations && analytics.correlations && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Correlations</h4>
                <div className="space-y-1">
                  {analytics.correlations.sleepMood && (
                    <div className="text-sm">
                      <span className="text-gray-600">Sleep ↔ Mood:</span>
                      <span className="ml-2 font-medium">
                        {(analytics.correlations.sleepMood * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Virtual list */}
      <div 
        ref={scrollElementRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          handleScroll(e as any);
          handleScrollRestore(e as any);
        }}
        style={{ height: analytics && !compactMode ? height - 120 : height }}
        role="list"
      >
        {groupedEntries.map((_, index) => renderGroupedEntries({ 
          index, 
          style: { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: estimateItemHeight(index) 
          } 
        }))}
      </div>

      {/* Empty state */}
      {groupedEntries.length === 0 && !loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No mood data found</p>
          </div>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="p-4 text-center border-t border-gray-100">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more data'}
          </button>
        </div>
      )}
    </div>
  );
}

export default VirtualMoodHistory;