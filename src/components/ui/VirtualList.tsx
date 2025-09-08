/**
 * Virtual List Component
 * High-performance virtual scrolling for large datasets
 * Optimized for mental health app's user lists, message histories, and data tables
 */

'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo, CSSProperties } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { useVirtualKeyboardNavigation } from '@/hooks/useVirtualScroll';
import { useVirtualScrollPerformance } from '@/lib/performance/virtual-scroll-utils';
import { cn } from '@/lib/utils';

/**
 * Virtual List Props
 */
interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight?: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: CSSProperties, isFocused?: boolean, isSelected?: boolean) => React.ReactNode;
  onLoadMore?: () => void | Promise<void>;
  onItemSelect?: (item: T, index: number) => void;
  onItemFocus?: (item: T, index: number) => void;
  hasMore?: boolean;
  loading?: boolean;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  estimatedItemSize?: number;
  threshold?: number;
  width?: number | string;
  // Accessibility props
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  role?: string;
  // Keyboard navigation
  enableKeyboardNavigation?: boolean;
  enableSelection?: boolean;
  multiSelect?: boolean;
  selectedItems?: Set<number>;
  focusedIndex?: number;
  onSelectionChange?: (selectedIndices: Set<number>) => void;
  onFocusChange?: (focusedIndex: number) => void;
  // Performance
  enablePerformanceOptimizations?: boolean;
  scrollRestorationKey?: string;
  // Mobile support
  enableTouchNavigation?: boolean;
  touchSensitivity?: number;
}

/**
 * High-performance Virtual List Component
 */
export function VirtualList<T>({
  items,
  height,
  itemHeight = 50,
  renderItem,
  onLoadMore,
  onItemSelect,
  onItemFocus,
  hasMore = false,
  loading = false,
  overscan = 3,
  className = '',
  emptyMessage = 'No items to display',
  loadingComponent,
  estimatedItemSize = 50,
  threshold = 5,
  width = '100%',
  // Accessibility props
  ariaLabel = 'Virtual list',
  ariaLabelledBy,
  ariaDescribedBy,
  role = 'list',
  // Keyboard navigation
  enableKeyboardNavigation = true,
  enableSelection = false,
  multiSelect = false,
  selectedItems,
  focusedIndex: externalFocusedIndex,
  onSelectionChange,
  onFocusChange,
  // Performance
  enablePerformanceOptimizations = true,
  scrollRestorationKey,
  // Mobile support
  enableTouchNavigation = true,
  touchSensitivity = 1,
}: VirtualListProps<T>) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemSizeMap = useRef<Map<number, number>>(new Map());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use external or internal selection state
  const currentSelectedItems = selectedItems || internalSelectedItems;
  
  // Performance optimizations
  const {
    cacheItemHeight,
    getItemHeight: getCachedItemHeight,
    saveScrollPosition,
    restoreScrollPosition,
    measureOperation,
    scheduleUpdate,
  } = useVirtualScrollPerformance({
    enableMeasurementCache: enablePerformanceOptimizations,
    enableRAF: enablePerformanceOptimizations,
    enableMemoryOptimization: enablePerformanceOptimizations,
  });
  
  // Keyboard navigation
  const {
    focusedIndex,
    selectedIndex,
    setFocusedIndex,
    setSelectedIndex,
    handleKeyDown,
  } = useVirtualKeyboardNavigation(items, useCallback((item: T, index: number) => {
    if (enableSelection) {
      handleItemSelect(index);
    }
    onItemSelect?.(item, index);
  }, [enableSelection, onItemSelect]));
  
  // Use external focused index if provided
  const currentFocusedIndex = externalFocusedIndex !== undefined ? externalFocusedIndex : focusedIndex;
  
  // Handle focus changes
  useEffect(() => {
    if (onFocusChange && currentFocusedIndex !== -1) {
      onFocusChange(currentFocusedIndex);
    }
    if (onItemFocus && items[currentFocusedIndex]) {
      onItemFocus(items[currentFocusedIndex], currentFocusedIndex);
    }
  }, [currentFocusedIndex, onFocusChange, onItemFocus, items]);
  
  // Calculate item sizes with performance optimization
  const getItemSize = useCallback(
    (index: number) => {
      if (enablePerformanceOptimizations) {
        const cached = getCachedItemHeight(index, estimatedItemSize);
        if (cached !== estimatedItemSize) return cached;
      }
      
      if (typeof itemHeight === 'function') {
        return itemHeight(index);
      }
      return itemSizeMap.current.get(index) || itemHeight;
    },
    [itemHeight, enablePerformanceOptimizations, getCachedItemHeight, estimatedItemSize]
  );
  
  // Set item size after measurement with performance caching
  const setItemSize = useCallback((index: number, size: number, element?: HTMLElement) => {
    if (itemSizeMap.current.get(index) !== size) {
      itemSizeMap.current.set(index, size);
      
      if (enablePerformanceOptimizations) {
        cacheItemHeight(index, size, element);
      }
      
      if (listRef.current) {
        scheduleUpdate(() => {
          listRef.current?.resetAfterIndex(index);
        });
      }
    }
  }, [enablePerformanceOptimizations, cacheItemHeight, scheduleUpdate]);
  
  // Handle item selection
  const handleItemSelect = useCallback((index: number) => {
    if (!enableSelection) return;
    
    const newSelection = new Set(currentSelectedItems);
    
    if (multiSelect) {
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
    } else {
      newSelection.clear();
      newSelection.add(index);
      setSelectedIndex(index);
    }
    
    if (selectedItems === undefined) {
      setInternalSelectedItems(newSelection);
    }
    
    onSelectionChange?.(newSelection);
  }, [enableSelection, multiSelect, currentSelectedItems, selectedItems, setSelectedIndex, onSelectionChange]);
  
  // Scroll to focused item
  const scrollToFocusedItem = useCallback((index: number, align: 'auto' | 'smart' | 'center' | 'end' | 'start' = 'smart') => {
    if (listRef.current && index >= 0 && index < items.length) {
      listRef.current.scrollToItem(index, align);
    }
  }, [items.length]);
  
  // Update focused index and scroll to it
  useEffect(() => {
    if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
      scrollToFocusedItem(currentFocusedIndex);
    }
  }, [currentFocusedIndex, items.length, scrollToFocusedItem]);
  
  // Load more trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });
  
  // Handle load more
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && onLoadMore) {
      const loadMore = async () => {
        setIsLoadingMore(true);
        try {
          await onLoadMore();
        } finally {
          setIsLoadingMore(false);
        }
      };
      loadMore();
    }
  }, [inView, hasMore, isLoadingMore, onLoadMore]);
  
  // Handle scroll events
  const handleScroll = useCallback(({ scrollTop, scrollLeft, scrollUpdateWasRequested }: any) => {
    if (!scrollUpdateWasRequested) {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set scrolling to false after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      // Save scroll position for restoration
      if (enablePerformanceOptimizations && scrollRestorationKey) {
        saveScrollPosition(scrollRestorationKey, scrollTop, scrollLeft);
      }
    }
  }, [enablePerformanceOptimizations, scrollRestorationKey, saveScrollPosition]);
  
  // Restore scroll position on mount
  useEffect(() => {
    if (enablePerformanceOptimizations && scrollRestorationKey && listRef.current) {
      const savedPosition = restoreScrollPosition(scrollRestorationKey);
      if (savedPosition) {
        listRef.current.scrollTo(savedPosition.scrollTop);
      }
    }
  }, [enablePerformanceOptimizations, scrollRestorationKey, restoreScrollPosition]);
  
  // Touch navigation support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableTouchNavigation) return;
    setTouchStartY(e.touches[0].clientY);
  }, [enableTouchNavigation]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableTouchNavigation || touchStartY === null) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = (touchStartY - touchY) * touchSensitivity;
    
    // Add some momentum for better touch experience
    if (Math.abs(deltaY) > 5) {
      // Touch navigation logic could be implemented here
      // For now, let the default scroll behavior handle it
    }
  }, [enableTouchNavigation, touchStartY, touchSensitivity]);
  
  const handleTouchEnd = useCallback(() => {
    if (!enableTouchNavigation) return;
    setTouchStartY(null);
  }, [enableTouchNavigation]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  // Enhanced row renderer with accessibility and selection support
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = items[index];
      const isLastItem = index === items.length - 1;
      const isFocused = currentFocusedIndex === index;
      const isSelected = currentSelectedItems.has(index);
      
      return (
        <div
          style={style}
          className={cn(
            'virtual-list-item',
            isFocused && 'virtual-list-item-focused',
            isSelected && 'virtual-list-item-selected',
            enableSelection && 'virtual-list-item-selectable'
          )}
          role={enableSelection ? "option" : "listitem"}
          aria-selected={enableSelection ? isSelected : undefined}
          aria-posinset={index + 1}
          aria-setsize={items.length}
          tabIndex={isFocused ? 0 : -1}
          onClick={() => {
            if (enableKeyboardNavigation) {
              setFocusedIndex(index);
            }
            if (enableSelection) {
              handleItemSelect(index);
            }
            onItemSelect?.(item, index);
          }}
          onFocus={() => {
            if (enableKeyboardNavigation && !isFocused) {
              setFocusedIndex(index);
            }
          }}
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.height > 0 && rect.height !== getItemSize(index)) {
                measureOperation('measure-item', () => {
                  setItemSize(index, rect.height, el);
                });
              }
            }
            if (isLastItem && hasMore) {
              loadMoreRef(el);
            }
          }}
        >
          {renderItem(item, index, style, isFocused, isSelected)}
          {isLastItem && hasMore && (
            <div className="flex justify-center py-4">
              {isLoadingMore ? (
                loadingComponent || (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>
      );
    },
    [
      items,
      renderItem,
      hasMore,
      isLoadingMore,
      loadingComponent,
      setItemSize,
      loadMoreRef,
      currentFocusedIndex,
      currentSelectedItems,
      enableSelection,
      enableKeyboardNavigation,
      setFocusedIndex,
      handleItemSelect,
      onItemSelect,
      getItemSize,
      measureOperation,
    ]
  );
  
  // Handle empty state
  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  // Handle loading state
  if (loading && items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        {loadingComponent || (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={cn('virtual-list-container', className)}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      tabIndex={enableKeyboardNavigation ? 0 : -1}
      onKeyDown={enableKeyboardNavigation ? handleKeyDown : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        outline: 'none', // Remove default focus outline since we handle focus visually
      }}
    >
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={getItemSize}
        width={width}
        overscanCount={overscan}
        estimatedItemSize={estimatedItemSize}
        onScroll={handleScroll}
        className="virtual-list-inner"
      >
        {Row}
      </List>
      
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isScrolling && `Scrolling list with ${items.length} items`}
        {isLoadingMore && 'Loading more items'}
        {currentFocusedIndex >= 0 && items[currentFocusedIndex] && (
          `Focused item ${currentFocusedIndex + 1} of ${items.length}`
        )}
        {enableSelection && currentSelectedItems.size > 0 && (
          `${currentSelectedItems.size} item${currentSelectedItems.size === 1 ? '' : 's'} selected`
        )}
      </div>
      
      {/* Add CSS for focus and selection states */}
      <style jsx>{`
        .virtual-list-container:focus-within .virtual-list-item-focused {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          background-color: rgba(59, 130, 246, 0.1);
        }
        
        .virtual-list-item-selected {
          background-color: rgba(59, 130, 246, 0.15);
          border-left: 3px solid #3b82f6;
        }
        
        .virtual-list-item-selectable {
          cursor: pointer;
        }
        
        .virtual-list-item-selectable:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Virtual Table Component
 * Optimized for large data tables with fixed headers
 */
interface VirtualTableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    render?: (item: T) => React.ReactNode;
  }>;
  data: T[];
  height: number;
  rowHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  selectedIndex?: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
}

export function VirtualTable<T extends Record<string, any>>({
  columns,
  data,
  height,
  rowHeight = 48,
  onRowClick,
  selectedIndex,
  className = '',
  headerClassName = '',
  rowClassName = '',
}: VirtualTableProps<T>) {
  const headerHeight = 48;
  const listHeight = height - headerHeight;
  
  // Calculate total width
  const totalWidth = useMemo(
    () => columns.reduce((sum, col) => sum + (col.width || 150), 0),
    [columns]
  );
  
  // Row renderer
  const renderRow = useCallback(
    (item: T, index: number, style: CSSProperties) => {
      const isSelected = index === selectedIndex;
      const customClassName = typeof rowClassName === 'function' 
        ? rowClassName(item, index) 
        : rowClassName;
      
      return (
        <div
          style={style}
          className={`
            flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer
            ${isSelected ? 'bg-blue-50' : ''}
            ${customClassName}
          `}
          onClick={() => onRowClick?.(item, index)}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-4 py-2 truncate"
              style={{ width: col.width || 150 }}
            >
              {col.render ? col.render(item) : item[col.key]}
            </div>
          ))}
        </div>
      );
    },
    [columns, selectedIndex, rowClassName, onRowClick]
  );
  
  return (
    <div className={`virtual-table ${className}`}>
      {/* Fixed Header */}
      <div
        className={`
          flex items-center border-b-2 border-gray-300 bg-gray-100 font-semibold
          ${headerClassName}
        `}
        style={{ height: headerHeight, width: totalWidth }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-4 py-2 truncate"
            style={{ width: col.width || 150 }}
          >
            {col.header}
          </div>
        ))}
      </div>
      
      {/* Virtual List Body */}
      <VirtualList
        items={data}
        height={listHeight}
        itemHeight={rowHeight}
        renderItem={renderRow}
        width={totalWidth}
      />
    </div>
  );
}

/**
 * Virtual Message List
 * Optimized for chat/message histories with variable heights
 */
interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isOwn?: boolean;
}

interface VirtualMessageListProps {
  messages: Message[];
  height: number;
  onLoadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  className?: string;
}

export function VirtualMessageList({
  messages,
  height,
  onLoadMore,
  hasMore = false,
  className = '',
}: VirtualMessageListProps) {
  const listRef = useRef<List>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Estimate item height based on content length
  const estimateItemHeight = useCallback((index: number) => {
    const message = messages[index];
    const baseHeight = 60;
    const charsPerLine = 50;
    const lines = Math.ceil(message.content.length / charsPerLine);
    return baseHeight + (lines - 1) * 20;
  }, [messages]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length, autoScroll]);
  
  // Handle scroll
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (!scrollUpdateWasRequested) {
      // User scrolled manually
      const isAtBottom = scrollOffset + height >= (messages.length * 60) - 100;
      setAutoScroll(isAtBottom);
    }
  }, [height, messages.length]);
  
  // Message renderer
  const renderMessage = useCallback(
    (message: Message, index: number, style: CSSProperties) => {
      return (
        <div
          style={style}
          className={`
            flex ${message.isOwn ? 'justify-end' : 'justify-start'}
            px-4 py-2
          `}
        >
          <div
            className={`
              max-w-[70%] rounded-lg px-4 py-2
              ${message.isOwn 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-800'}
            `}
          >
            <div className="text-sm font-semibold mb-1">
              {message.sender}
            </div>
            <div className="text-sm">{message.content}</div>
            <div className="text-xs opacity-70 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      );
    },
    []
  );
  
  return (
    <div className={`virtual-message-list ${className}`}>
      <List
        ref={listRef}
        height={height}
        itemCount={messages.length}
        itemSize={estimateItemHeight}
        width="100%"
        onScroll={handleScroll}
        estimatedItemSize={80}
        overscanCount={5}
      >
        {({ index, style }) => renderMessage(messages[index], index, style)}
      </List>
    </div>
  );
}

/**
 * Virtual Grid Component
 * For image galleries and card layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  height: number;
  columnCount: number;
  rowHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  height,
  columnCount,
  rowHeight,
  renderItem,
  gap = 16,
  className = '',
}: VirtualGridProps<T>) {
  // Calculate rows
  const rows = useMemo(() => {
    const rowItems: T[][] = [];
    for (let i = 0; i < items.length; i += columnCount) {
      rowItems.push(items.slice(i, i + columnCount));
    }
    return rowItems;
  }, [items, columnCount]);
  
  // Row renderer
  const renderRow = useCallback(
    (row: T[], rowIndex: number, style: CSSProperties) => {
      return (
        <div
          style={{
            ...style,
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: `${gap}px`,
            padding: `0 ${gap}px`,
          }}
        >
          {row.map((item, colIndex) => {
            const itemIndex = rowIndex * columnCount + colIndex;
            return (
              <div key={itemIndex}>
                {renderItem(item, itemIndex)}
              </div>
            );
          })}
        </div>
      );
    },
    [columnCount, gap, renderItem]
  );
  
  return (
    <VirtualList
      items={rows}
      height={height}
      itemHeight={rowHeight + gap}
      renderItem={renderRow}
      className={className}
      overscan={2}
    />
  );
}

/**
 * Hook for virtual scrolling with dynamic loading
 */
export function useVirtualScroll<T>(
  fetchData: (page: number) => Promise<T[]>,
  pageSize: number = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const data = await fetchData(1);
        setItems(data);
        setHasMore(data.length === pageSize);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [fetchData, pageSize]);
  
  // Load more handler
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const nextPage = page + 1;
      const data = await fetchData(nextPage);
      setItems((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === pageSize);
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, loading, hasMore]);
  
  return {
    items,
    hasMore,
    loading,
    loadMore,
    refresh: async () => {
      setPage(1);
      setLoading(true);
      try {
        const data = await fetchData(1);
        setItems(data);
        setHasMore(data.length === pageSize);
      } finally {
        setLoading(false);
      }
    },
  };
}