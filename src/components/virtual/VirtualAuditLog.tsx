/**
 * Virtual Audit Log Component
 * Optimized for security audit trails and compliance logging
 * Supports filtering, search, export, and real-time updates
 */

'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Shield, User, Database, Settings, AlertTriangle, CheckCircle, XCircle, Clock, Download, Search, Filter, Eye, Lock } from 'lucide-react';
import { useVirtualScroll, useScrollRestoration, useVirtualKeyboardNavigation } from '@/hooks/useVirtualScroll';
import { cn } from '@/lib/utils';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' | 'privacy' | 'therapy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'pending' | 'warning';
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  details?: Record<string, any>;
  metadata?: {
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    duration?: number; // milliseconds
    errorCode?: string;
    errorMessage?: string;
  };
  changes?: Array<{
    field: string;
    oldValue?: any;
    newValue?: any;
    action: 'create' | 'update' | 'delete';
  }>;
  complianceFlags?: Array<{
    regulation: 'HIPAA' | 'GDPR' | 'CCPA' | 'SOX';
    requirement: string;
    status: 'compliant' | 'violation' | 'warning';
  }>;
  riskScore?: number; // 0-100
  isAnomaly?: boolean;
  relatedEntries?: string[]; // IDs of related log entries
  reviewStatus?: 'pending' | 'reviewed' | 'flagged' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: Date;
  tags?: string[];
}

interface VirtualAuditLogProps {
  entries: AuditLogEntry[];
  height: number;
  onLoadMore?: () => Promise<void>;
  onEntrySelect?: (entry: AuditLogEntry) => void;
  onReview?: (entryId: string, status: AuditLogEntry['reviewStatus'], notes?: string) => void;
  onExport?: (entries: AuditLogEntry[], format: 'csv' | 'json' | 'pdf') => void;
  onFlag?: (entryId: string, reason: string) => void;
  hasMore?: boolean;
  loading?: boolean;
  realTimeUpdates?: boolean;
  showDetails?: boolean;
  showUserInfo?: boolean;
  showLocation?: boolean;
  showCompliance?: boolean;
  enableReview?: boolean;
  enableExport?: boolean;
  filters?: {
    categories?: AuditLogEntry['category'][];
    severities?: AuditLogEntry['severity'][];
    statuses?: AuditLogEntry['status'][];
    users?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    riskScoreRange?: {
      min?: number;
      max?: number;
    };
  };
  searchQuery?: string;
  className?: string;
  entryClassName?: string;
  compactMode?: boolean;
}

const categoryIcons = {
  authentication: User,
  authorization: Shield,
  data_access: Eye,
  data_modification: Database,
  system: Settings,
  security: Shield,
  privacy: Lock,
  therapy: User,
};

const severityColors = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

const statusIcons = {
  success: CheckCircle,
  failure: XCircle,
  pending: Clock,
  warning: AlertTriangle,
};

const statusColors = {
  success: 'text-green-600',
  failure: 'text-red-600',
  pending: 'text-yellow-600',
  warning: 'text-orange-600',
};

export function VirtualAuditLog({
  entries,
  height,
  onLoadMore,
  onEntrySelect,
  onReview,
  onExport,
  onFlag,
  hasMore = false,
  loading = false,
  realTimeUpdates = false,
  showDetails = true,
  showUserInfo = true,
  showLocation = false,
  showCompliance = true,
  enableReview = false,
  enableExport = true,
  filters,
  searchQuery,
  className,
  entryClassName,
  compactMode = false,
}: VirtualAuditLogProps) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [reviewingEntry, setReviewingEntry] = useState<string | null>(null);

  // Scroll restoration
  const { handleScroll: handleScrollRestore } = useScrollRestoration({
    key: 'audit-log',
    enabled: true
  });

  // Keyboard navigation
  const { focusedIndex, handleKeyDown } = useVirtualKeyboardNavigation(
    entries,
    useCallback((entry: any) => {
      onEntrySelect?.(entry);
    }, [onEntrySelect])
  );

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Apply filters
    if (filters) {
      if (filters.categories?.length) {
        filtered = filtered.filter(entry => filters.categories!.includes(entry.category));
      }

      if (filters.severities?.length) {
        filtered = filtered.filter(entry => filters.severities!.includes(entry.severity));
      }

      if (filters.statuses?.length) {
        filtered = filtered.filter(entry => filters.statuses!.includes(entry.status));
      }

      if (filters.users?.length) {
        filtered = filtered.filter(entry => 
          entry.userId && filters.users!.includes(entry.userId)
        );
      }

      if (filters.dateRange) {
        filtered = filtered.filter(entry => {
          const entryDate = entry.timestamp;
          if (filters.dateRange!.start && entryDate < filters.dateRange!.start) return false;
          if (filters.dateRange!.end && entryDate > filters.dateRange!.end) return false;
          return true;
        });
      }

      if (filters.riskScoreRange) {
        filtered = filtered.filter(entry => {
          if (!entry.riskScore) return true;
          if (filters.riskScoreRange!.min && entry.riskScore < filters.riskScoreRange!.min) return false;
          if (filters.riskScoreRange!.max && entry.riskScore > filters.riskScoreRange!.max) return false;
          return true;
        });
      }
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.action.toLowerCase().includes(query) ||
        entry.resource.toLowerCase().includes(query) ||
        entry.userEmail?.toLowerCase().includes(query) ||
        entry.userName?.toLowerCase().includes(query) ||
        entry.ipAddress?.toLowerCase().includes(query) ||
        entry.details && JSON.stringify(entry.details).toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [entries, filters, searchQuery]);

  // Estimate item height
  const estimateItemHeight = useCallback((index: number) => {
    const entry = filteredEntries[index];
    if (!entry) return 80;

    if (compactMode) return 60;

    const baseHeight = 120;
    const detailsHeight = expandedEntry === entry.id && showDetails ? 200 : 0;
    const complianceHeight = showCompliance && entry.complianceFlags?.length ? 40 : 0;
    const changesHeight = expandedEntry === entry.id && entry.changes?.length ? entry.changes.length * 30 : 0;

    return baseHeight + detailsHeight + complianceHeight + changesHeight;
  }, [filteredEntries, compactMode, expandedEntry, showDetails, showCompliance]);

  // Virtual scrolling
  const { scrollElementRef, handleScroll } = useVirtualScroll(filteredEntries, height, {
    itemHeight: estimateItemHeight,
    overscan: 3
  });

  // Handle entry selection
  const handleEntryToggle = useCallback((entryId: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }, []);

  // Handle entry expansion
  const toggleExpanded = useCallback((entryId: string) => {
    setExpandedEntry(prev => prev === entryId ? null : entryId);
  }, []);

  // Format duration
  const formatDuration = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }, []);

  // Format risk score
  const formatRiskScore = useCallback((score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Critical', color: 'text-red-600 bg-red-50' };
    if (score >= 60) return { label: 'High', color: 'text-orange-600 bg-orange-50' };
    if (score >= 40) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'Low', color: 'text-green-600 bg-green-50' };
  }, []);

  // Render compliance flags
  const renderComplianceFlags = useCallback((flags: AuditLogEntry['complianceFlags']) => {
    if (!flags || flags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {flags.map((flag, idx) => (
          <span
            key={idx}
            className={cn(
              'px-2 py-1 text-xs rounded-full font-medium',
              flag.status === 'compliant' && 'bg-green-100 text-green-700',
              flag.status === 'violation' && 'bg-red-100 text-red-700',
              flag.status === 'warning' && 'bg-yellow-100 text-yellow-700'
            )}
          >
            {flag.regulation} {flag.status === 'violation' ? '⚠️' : '✓'}
          </span>
        ))}
      </div>
    );
  }, []);

  // Render changes
  const renderChanges = useCallback((changes: AuditLogEntry['changes']) => {
    if (!changes || changes.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Changes</h5>
        <div className="space-y-2">
          {changes.map((change, idx) => (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className={cn(
                'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                change.action === 'create' && 'bg-green-400',
                change.action === 'update' && 'bg-yellow-400',
                change.action === 'delete' && 'bg-red-400'
              )} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900">{change.field}</div>
                <div className="space-y-1 text-gray-600">
                  {change.oldValue !== undefined && (
                    <div>
                      <span className="text-red-600">−</span> {JSON.stringify(change.oldValue)}
                    </div>
                  )}
                  {change.newValue !== undefined && (
                    <div>
                      <span className="text-green-600">+</span> {JSON.stringify(change.newValue)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  // Render individual audit entry
  const renderAuditEntry = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const entry = filteredEntries[index];
    if (!entry) return null;

    const isExpanded = expandedEntry === entry.id;
    const isFocused = index === focusedIndex;
    const isSelected = selectedEntries.has(entry.id);
    const CategoryIcon = categoryIcons[entry.category];
    const StatusIcon = statusIcons[entry.status];
    const riskInfo = entry.riskScore ? formatRiskScore(entry.riskScore) : null;

    return (
      <div
        style={style}
        className={cn(
          'px-4 py-4 border-b border-gray-100 transition-colors',
          isFocused && 'bg-blue-50 ring-2 ring-blue-200',
          isSelected && 'bg-green-50 border-green-200',
          entry.isAnomaly && 'bg-red-50 border-l-4 border-l-red-400',
          entry.severity === 'critical' && 'border-l-4 border-l-red-500',
          entryClassName
        )}
        role="listitem"
        aria-label={`Audit entry: ${entry.action} on ${entry.resource}`}
        tabIndex={isFocused ? 0 : -1}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Selection checkbox */}
              {enableExport && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleEntryToggle(entry.id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}

              {/* Icon and main content */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 mt-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    severityColors[entry.severity]
                  )}>
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {/* Action and resource */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {entry.action}
                    </h4>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600 truncate">
                      {entry.resource}
                    </span>
                    {entry.resourceId && (
                      <span className="text-xs text-gray-500 font-mono">
                        #{entry.resourceId.slice(-8)}
                      </span>
                    )}
                  </div>

                  {/* User info */}
                  {showUserInfo && (entry.userName || entry.userEmail) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <User className="w-3 h-3" />
                      <span>{entry.userName || entry.userEmail}</span>
                      {entry.userRole && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {entry.userRole}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Timestamp and location */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <time>
                      {entry.timestamp.toLocaleString()}
                    </time>
                    {entry.ipAddress && (
                      <span className="font-mono">{entry.ipAddress}</span>
                    )}
                    {showLocation && entry.location?.city && (
                      <span>{entry.location.city}, {entry.location.country}</span>
                    )}
                    {entry.metadata?.duration && (
                      <span>{formatDuration(entry.metadata.duration)}</span>
                    )}
                  </div>

                  {/* Compliance flags */}
                  {showCompliance && renderComplianceFlags(entry.complianceFlags)}
                </div>
              </div>
            </div>

            {/* Status and actions */}
            <div className="flex items-center gap-3 ml-3">
              {/* Risk score */}
              {riskInfo && (
                <span className={cn('px-2 py-1 text-xs rounded-full font-medium', riskInfo.color)}>
                  {riskInfo.label}
                </span>
              )}

              {/* Anomaly indicator */}
              {entry.isAnomaly && (
                <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Anomaly detected" />
              )}

              {/* Status */}
              <div className="flex items-center gap-1">
                <StatusIcon className={cn('w-4 h-4', statusColors[entry.status])} />
                <span className={cn('text-sm font-medium', statusColors[entry.status])}>
                  {entry.status}
                </span>
              </div>

              {/* Review status */}
              {enableReview && (
                <div className="flex items-center gap-1">
                  {entry.reviewStatus === 'pending' && (
                    <button
                      onClick={() => setReviewingEntry(entry.id)}
                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Review
                    </button>
                  )}
                  {entry.reviewStatus === 'reviewed' && (
                    <CheckCircle className="w-4 h-4 text-green-500" aria-label="Reviewed" />
                  )}
                  {entry.reviewStatus === 'flagged' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Flagged" />
                  )}
                </div>
              )}

              {/* Expand button */}
              <button
                onClick={() => toggleExpanded(entry.id)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '−' : '+'}
              </button>
            </div>
          </div>

          {/* Expanded details */}
          {isExpanded && showDetails && (
            <div className="ml-11 space-y-3">
              {/* Metadata */}
              {entry.metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {entry.metadata.requestId && (
                    <div>
                      <span className="text-gray-600">Request ID:</span>
                      <span className="ml-2 font-mono text-gray-900">{entry.metadata.requestId}</span>
                    </div>
                  )}
                  {entry.metadata.errorCode && (
                    <div>
                      <span className="text-gray-600">Error Code:</span>
                      <span className="ml-2 font-mono text-red-600">{entry.metadata.errorCode}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {entry.metadata?.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h5 className="text-sm font-medium text-red-900 mb-1">Error Message</h5>
                  <p className="text-sm text-red-700">{entry.metadata.errorMessage}</p>
                </div>
              )}

              {/* Details */}
              {entry.details && Object.keys(entry.details).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Details</h5>
                  <pre className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Changes */}
              {renderChanges(entry.changes)}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Related entries */}
              {entry.relatedEntries && entry.relatedEntries.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Related Entries</h5>
                  <div className="flex flex-wrap gap-1">
                    {entry.relatedEntries.map(relatedId => (
                      <button
                        key={relatedId}
                        onClick={() => {
                          const relatedEntry = entries.find(e => e.id === relatedId);
                          if (relatedEntry) onEntrySelect?.(relatedEntry);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-mono"
                      >
                        {relatedId.slice(-8)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [
    filteredEntries,
    expandedEntry,
    focusedIndex,
    selectedEntries,
    enableExport,
    enableReview,
    showUserInfo,
    showLocation,
    showCompliance,
    showDetails,
    entryClassName,
    handleEntryToggle,
    toggleExpanded,
    formatDuration,
    formatRiskScore,
    renderComplianceFlags,
    renderChanges,
    entries,
    onEntrySelect
  ]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Selection toolbar */}
      {enableExport && selectedEntries.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            {selectedEntries.size} entries selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport?.(Array.from(selectedEntries).map(id => entries.find(e => e.id === id)!).filter(Boolean), 'csv')}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => onExport?.(Array.from(selectedEntries).map(id => entries.find(e => e.id === id)!).filter(Boolean), 'json')}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={() => setSelectedEntries(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700 px-2"
            >
              Clear
            </button>
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
        style={{ height: enableExport && selectedEntries.size > 0 ? height - 60 : height }}
        role="list"
      >
        {filteredEntries.map((_, index) => renderAuditEntry({ 
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
      {filteredEntries.length === 0 && !loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No audit entries found</p>
            {(searchQuery || filters) && (
              <p className="text-sm mt-1">Try adjusting your filters or search query</p>
            )}
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
            {loading ? 'Loading...' : 'Load more entries'}
          </button>
        </div>
      )}

      {/* Review modal */}
      {reviewingEntry && onReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Review Audit Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Status
                </label>
                <div className="space-y-2">
                  {['reviewed', 'flagged', 'resolved'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        onReview(reviewingEntry, status as AuditLogEntry['reviewStatus']);
                        setReviewingEntry(null);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <span className="capitalize">{status}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setReviewingEntry(null)}
                className="w-full p-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VirtualAuditLog;