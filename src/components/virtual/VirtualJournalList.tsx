/**
 * Virtual Journal List Component
 * Optimized for journal entries, mood logs, and therapeutic records
 * Supports privacy controls, mood visualization, and export functionality
 */

'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Calendar, Smile, Lock, Eye, Edit, Download, Search, Filter, Heart, Zap, Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';
import { useVirtualScroll, useScrollRestoration, useVirtualKeyboardNavigation } from '@/hooks/useVirtualScroll';
import { cn } from '@/lib/utils';

export interface JournalEntry {
  id: string;
  title?: string;
  content: string;
  excerpt?: string;
  date: Date;
  mood: {
    level: number; // 1-10 scale
    emotions: string[];
    energy: number; // 1-5 scale
    sleep?: number; // hours
    stress?: number; // 1-10 scale
  };
  tags: string[];
  isPrivate: boolean;
  isEncrypted?: boolean;
  wordCount: number;
  readTime: number; // minutes
  weather?: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
    temperature?: number;
  };
  location?: {
    name: string;
    coordinates?: [number, number];
  };
  attachments?: Array<{
    type: 'image' | 'audio' | 'document';
    url: string;
    name: string;
    size: number;
  }>;
  therapeuticNotes?: Array<{
    id: string;
    note: string;
    therapistId: string;
    timestamp: Date;
  }>;
  goals?: Array<{
    id: string;
    text: string;
    completed: boolean;
    progress: number; // 0-100
  }>;
  gratitude?: string[];
  challenges?: string[];
  achievements?: string[];
  insights?: string[];
}

interface VirtualJournalListProps {
  entries: JournalEntry[];
  height: number;
  onLoadMore?: () => Promise<void>;
  onEntrySelect?: (entry: JournalEntry) => void;
  onEntryEdit?: (entryId: string) => void;
  onEntryDelete?: (entryId: string) => void;
  onExport?: (entryIds: string[]) => void;
  onPrivacyToggle?: (entryId: string, isPrivate: boolean) => void;
  hasMore?: boolean;
  loading?: boolean;
  currentUserId?: string;
  showMoodChart?: boolean;
  showPrivacyIndicator?: boolean;
  showTherapeuticNotes?: boolean;
  enableSelection?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  moodFilter?: {
    min?: number;
    max?: number;
  };
  searchQuery?: string;
  selectedTags?: string[];
  className?: string;
  entryClassName?: string;
  compact?: boolean;
}

const moodEmojis = ['😢', '😞', '😐', '😊', '😄', '🤗', '😍', '🤩', '😇', '🌟'];
const energyIcons = [Zap, Zap, Zap, Zap, Zap];
const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
  stormy: Cloud,
};

export function VirtualJournalList({
  entries,
  height,
  onLoadMore,
  onEntrySelect,
  onEntryEdit,
  onEntryDelete,
  onExport,
  onPrivacyToggle,
  hasMore = false,
  loading = false,
  currentUserId,
  showMoodChart = true,
  showPrivacyIndicator = true,
  showTherapeuticNotes = false,
  enableSelection = false,
  dateRange,
  moodFilter,
  searchQuery,
  selectedTags,
  className,
  entryClassName,
  compact = false,
}: VirtualJournalListProps) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'timeline'>('list');

  // Scroll restoration
  const { handleScroll: handleScrollRestore } = useScrollRestoration({
    key: 'journal-list',
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

    // Date range filter
    if (dateRange) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.date;
        if (dateRange.start && entryDate < dateRange.start) return false;
        if (dateRange.end && entryDate > dateRange.end) return false;
        return true;
      });
    }

    // Mood filter
    if (moodFilter) {
      filtered = filtered.filter(entry => {
        if (moodFilter.min && entry.mood.level < moodFilter.min) return false;
        if (moodFilter.max && entry.mood.level > moodFilter.max) return false;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title?.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query)) ||
        entry.mood.emotions.some(emotion => emotion.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTags && selectedTags.length > 0) {
      filtered = filtered.filter(entry =>
        selectedTags.some(tag => entry.tags.includes(tag))
      );
    }

    return filtered;
  }, [entries, dateRange, moodFilter, searchQuery, selectedTags]);

  // Estimate item height
  const estimateItemHeight = useCallback((index: number) => {
    const entry = filteredEntries[index];
    if (!entry) return 120;

    if (compact) return 80;

    const baseHeight = 140;
    const contentHeight = expandedEntry === entry.id 
      ? Math.min(Math.ceil(entry.content.length / 80) * 20, 200)
      : 40;
    const attachmentHeight = entry.attachments?.length ? 40 : 0;
    const notesHeight = showTherapeuticNotes && entry.therapeuticNotes?.length ? 60 : 0;
    const goalsHeight = entry.goals?.length ? 40 : 0;

    return baseHeight + contentHeight + attachmentHeight + notesHeight + goalsHeight;
  }, [filteredEntries, compact, expandedEntry, showTherapeuticNotes]);

  // Virtual scrolling
  const {
    scrollElementRef,
    handleScroll,
    scrollToItem
  } = useVirtualScroll(filteredEntries, height, {
    itemHeight: estimateItemHeight,
    overscan: 3
  });

  // Handle entry selection
  const handleEntryToggle = useCallback((entryId: string) => {
    if (!enableSelection) return;
    
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }, [enableSelection]);

  // Handle entry expansion
  const toggleExpanded = useCallback((entryId: string) => {
    setExpandedEntry(prev => prev === entryId ? null : entryId);
  }, []);

  // Format mood level
  const formatMoodLevel = useCallback((level: number): string => {
    if (level <= 2) return 'Very Low';
    if (level <= 4) return 'Low';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'Good';
    return 'Excellent';
  }, []);

  // Render mood visualization
  const renderMoodVisualization = useCallback((entry: JournalEntry) => {
    const { mood } = entry;
    const moodEmoji = moodEmojis[Math.min(Math.floor(mood.level), 9)];
    const EnergyIcon = energyIcons[Math.min(Math.floor(mood.energy), 4)];
    
    return (
      <div className="flex items-center gap-3 py-2">
        {/* Mood */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{moodEmoji}</span>
          <div className="text-xs">
            <div className="font-medium">{formatMoodLevel(mood.level)}</div>
            <div className="text-gray-500">{mood.level}/10</div>
          </div>
        </div>

        {/* Energy */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <EnergyIcon
              key={i}
              className={cn(
                'w-3 h-3',
                i < mood.energy ? 'text-yellow-500' : 'text-gray-300'
              )}
            />
          ))}
        </div>

        {/* Emotions */}
        <div className="flex flex-wrap gap-1">
          {mood.emotions.slice(0, 3).map(emotion => (
            <span
              key={emotion}
              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {emotion}
            </span>
          ))}
          {mood.emotions.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{mood.emotions.length - 3}
            </span>
          )}
        </div>
      </div>
    );
  }, [formatMoodLevel]);

  // Render individual entry
  const renderEntry = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const entry = filteredEntries[index];
    if (!entry) return null;

    const isExpanded = expandedEntry === entry.id;
    const isFocused = index === focusedIndex;
    const isSelected = selectedEntries.has(entry.id);
    const WeatherIcon = entry.weather ? weatherIcons[entry.weather.condition] : null;

    return (
      <div
        style={style}
        className={cn(
          'px-4 py-4 border-b border-gray-100 transition-colors',
          isFocused && 'bg-blue-50 ring-2 ring-blue-200',
          isSelected && 'bg-green-50 border-green-200',
          entry.isPrivate && 'bg-yellow-50 border-l-4 border-l-yellow-400',
          entryClassName
        )}
        role="article"
        aria-label={`Journal entry from ${entry.date.toLocaleDateString()}`}
        tabIndex={isFocused ? 0 : -1}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Selection checkbox */}
              {enableSelection && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleEntryToggle(entry.id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}

              {/* Main content */}
              <div className="min-w-0 flex-1">
                {/* Title and date */}
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <time className="text-sm font-medium text-gray-900">
                    {entry.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: entry.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </time>
                  {entry.title && (
                    <>
                      <span className="text-gray-300">•</span>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {entry.title}
                      </h3>
                    </>
                  )}
                  {WeatherIcon && (
                    <WeatherIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Mood visualization */}
                {showMoodChart && renderMoodVisualization(entry)}

                {/* Content preview */}
                <div className="text-sm text-gray-700 leading-relaxed">
                  {isExpanded ? (
                    <div className="whitespace-pre-wrap">
                      {entry.content}
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium mt-2 block"
                      >
                        Show less
                      </button>
                    </div>
                  ) : (
                    <div>
                      {entry.excerpt || entry.content.slice(0, 150)}
                      {entry.content.length > 150 && (
                        <>
                          ...
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium ml-2"
                          >
                            Read more
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Goals progress */}
                {entry.goals && entry.goals.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Goals Progress
                    </h4>
                    <div className="space-y-1">
                      {entry.goals.slice(0, isExpanded ? undefined : 3).map(goal => (
                        <div key={goal.id} className="flex items-center gap-3">
                          <div className={cn(
                            'w-3 h-3 rounded-full',
                            goal.completed ? 'bg-green-500' : 'bg-gray-300'
                          )} />
                          <span className="text-sm text-gray-700 flex-1">{goal.text}</span>
                          <div className="text-xs text-gray-500">{goal.progress}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Therapeutic notes */}
                {showTherapeuticNotes && entry.therapeuticNotes && entry.therapeuticNotes.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Therapeutic Notes</h4>
                    <div className="space-y-2">
                      {entry.therapeuticNotes.slice(0, isExpanded ? undefined : 2).map(note => (
                        <div key={note.id} className="text-sm text-blue-700">
                          {note.note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {entry.attachments && entry.attachments.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{entry.attachments.length} attachment(s)</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-3">
              {/* Privacy indicator */}
              {showPrivacyIndicator && (
                <div className="flex items-center gap-1">
                  {entry.isPrivate ? (
                    <Lock className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                  {entry.isEncrypted && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Encrypted" />
                  )}
                </div>
              )}

              {/* Edit button */}
              {onEntryEdit && (
                <button
                  onClick={() => onEntryEdit(entry.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Edit entry"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}

              {/* Privacy toggle */}
              {onPrivacyToggle && (
                <button
                  onClick={() => onPrivacyToggle(entry.id, !entry.isPrivate)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label={`Make ${entry.isPrivate ? 'public' : 'private'}`}
                >
                  {entry.isPrivate ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Meta information */}
          {!compact && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{entry.wordCount} words</span>
              <span>{entry.readTime} min read</span>
              {entry.location && <span>{entry.location.name}</span>}
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
    enableSelection,
    showPrivacyIndicator,
    showTherapeuticNotes,
    showMoodChart,
    entryClassName,
    compact,
    handleEntryToggle,
    toggleExpanded,
    renderMoodVisualization,
    onEntryEdit,
    onPrivacyToggle
  ]);

  return (
    <div 
      className={cn('flex flex-col', className)}
      onKeyDown={handleKeyDown}
      role="feed"
      aria-label="Journal entries"
    >
      {/* Selection toolbar */}
      {enableSelection && selectedEntries.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            {selectedEntries.size} entries selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport?.(Array.from(selectedEntries))}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export
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
        style={{ height: enableSelection && selectedEntries.size > 0 ? height - 60 : height }}
        role="list"
      >
        {filteredEntries.map((_, index) => renderEntry({ 
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
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No journal entries found</p>
            {(searchQuery || selectedTags?.length || dateRange || moodFilter) && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
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
    </div>
  );
}

export default VirtualJournalList;