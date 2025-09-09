/**
 * Virtual Scrolling Hooks
 * Comprehensive set of hooks for virtual scrolling functionality
 * Optimized for mental health platform's performance requirements
 */

'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { usePerformanceMonitor } from './usePerformanceMonitor';

// Types
export interface VirtualScrollItem {
  id: string;
  height?: number;
  data: any;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollLeft: number;
}

export interface VirtualScrollMetrics {
  totalHeight: number;
  visibleStart: number;
  visibleEnd: number;
  overscanStart: number;
  overscanEnd: number;
}

export interface UseVirtualScrollOptions {
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  estimatedItemSize?: number;
  getItemId?: (index: number) => string;
  onScroll?: (position: ScrollPosition) => void;
  threshold?: number;
  bufferSize?: number;
}

export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export interface UseVariableHeightsOptions {
  estimatedHeight: number;
  measurementCache?: Map<string, number>;
  recalculateOnResize?: boolean;
}

export interface UseScrollRestorationOptions {
  key: string;
  enabled?: boolean;
  debounce?: number;
}

export interface UseScrollSpyOptions {
  threshold?: number;
  rootMargin?: string;
  smooth?: boolean;
}

/**
 * Core virtual scrolling hook with performance optimizations
 */
export function useVirtualScroll<T>(
  items: T[],
  containerHeight: number,
  options: UseVirtualScrollOptions = {}
) {
  const {
    itemHeight = 50,
    overscan = 3,
    estimatedItemSize = 50,
    getItemId,
    onScroll,
    threshold = 0.1,
    bufferSize = 10
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemSizeMap = useRef<Map<number, number>>(new Map());
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollPosition = useRef(0);
  
  const { startMeasurement, endMeasurement } = usePerformanceMonitor();

  // Calculate item size
  const getItemSize = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index);
      }
      return itemSizeMap.current.get(index) || itemHeight;
    },
    [itemHeight]
  );

  // Update item size cache
  const setItemSize = useCallback((index: number, size: number) => {
    if (itemSizeMap.current.get(index) !== size) {
      itemSizeMap.current.set(index, size);
    }
  }, []);

  // Calculate virtual metrics
  const virtualMetrics = useMemo((): VirtualScrollMetrics => {
    startMeasurement('virtual-scroll-calculation');
    
    let totalHeight = 0;
    let currentOffset = 0;
    let visibleStart = -1;
    let visibleEnd = -1;

    for (let i = 0; i < items.length; i++) {
      const itemSize = getItemSize(i);
      
      if (visibleStart === -1 && currentOffset + itemSize > scrollTop) {
        visibleStart = i;
      }
      
      if (visibleEnd === -1 && currentOffset > scrollTop + containerHeight) {
        visibleEnd = i - 1;
        break;
      }
      
      currentOffset += itemSize;
      totalHeight += itemSize;
    }

    if (visibleEnd === -1) {
      visibleEnd = items.length - 1;
    }

    const overscanStart = Math.max(0, visibleStart - overscan);
    const overscanEnd = Math.min(items.length - 1, visibleEnd + overscan);

    endMeasurement('virtual-scroll-calculation');

    return {
      totalHeight,
      visibleStart: Math.max(0, visibleStart),
      visibleEnd: Math.max(0, visibleEnd),
      overscanStart,
      overscanEnd
    };
  }, [items.length, scrollTop, containerHeight, getItemSize, overscan, startMeasurement, endMeasurement]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;
    
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
    
    // Set scrolling to false after scroll ends
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    lastScrollPosition.current = newScrollTop;
    onScroll?.({ scrollTop: newScrollTop, scrollLeft: newScrollLeft });
  }, [onScroll]);

  // Scroll to item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return;
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSize(i);
    }
    
    const itemSize = getItemSize(index);
    
    let scrollTo = offset;
    if (align === 'center') {
      scrollTo = offset - (containerHeight - itemSize) / 2;
    } else if (align === 'end') {
      scrollTo = offset - containerHeight + itemSize;
    }
    
    scrollElementRef.current.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: 'smooth'
    });
  }, [getItemSize, containerHeight]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(virtualMetrics.overscanStart, virtualMetrics.overscanEnd + 1);
  }, [items, virtualMetrics.overscanStart, virtualMetrics.overscanEnd]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollElementRef,
    virtualMetrics,
    visibleItems,
    scrollTop,
    scrollLeft,
    isScrolling,
    handleScroll,
    scrollToItem,
    setItemSize,
    getItemSize
  };
}

/**
 * Infinite scroll hook for paginated data loading
 */
export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    enabled = true
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const targetRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !enabled) return;
    
    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  }, [onLoadMore, isLoading, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoading) {
          loadMore();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, enabled, isLoading, loadMore]);

  return {
    targetRef,
    isLoading,
    loadMore
  };
}

/**
 * Variable heights hook for dynamic content sizing
 */
export function useVariableHeights<T>(
  items: T[],
  options: UseVariableHeightsOptions
) {
  const {
    estimatedHeight,
    measurementCache = new Map(),
    recalculateOnResize = true
  } = options;

  const [heights, setHeights] = useState<Map<string, number>>(measurementCache);
  const measurementRefs = useRef<Map<string, HTMLElement>>(new Map());
  const resizeObserver = useRef<ResizeObserver>();

  // Measure item height
  const measureItem = useCallback((id: string, element: HTMLElement) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const height = rect.height;

    if (heights.get(id) !== height) {
      setHeights(prev => new Map(prev).set(id, height));
    }

    measurementRefs.current.set(id, element);
  }, [heights]);

  // Get height for item
  const getHeight = useCallback((id: string): number => {
    return heights.get(id) || estimatedHeight;
  }, [heights, estimatedHeight]);

  // Setup resize observer
  useEffect(() => {
    if (!recalculateOnResize) return;

    resizeObserver.current = new ResizeObserver((entries) => {
      const newHeights = new Map(heights);
      let hasChanges = false;

      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const id = element.dataset.itemId;
        
        if (id) {
          const newHeight = entry.contentRect.height;
          if (newHeights.get(id) !== newHeight) {
            newHeights.set(id, newHeight);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setHeights(newHeights);
      }
    });

    measurementRefs.current.forEach((element) => {
      resizeObserver.current?.observe(element);
    });

    return () => {
      resizeObserver.current?.disconnect();
    };
  }, [heights, recalculateOnResize]);

  return {
    heights,
    measureItem,
    getHeight
  };
}

/**
 * Scroll restoration hook for navigation
 */
export function useScrollRestoration(options: UseScrollRestorationOptions) {
  const { key, enabled = true, debounce = 100 } = options;
  
  const [position, setPosition] = useState<ScrollPosition>({ scrollTop: 0, scrollLeft: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const elementRef = useRef<HTMLElement>();

  // Save position to storage
  const savePosition = useCallback((pos: ScrollPosition) => {
    if (!enabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(`scroll-${key}`, JSON.stringify(pos));
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    }, debounce);
  }, [key, enabled, debounce]);

  // Restore position from storage
  const restorePosition = useCallback(() => {
    if (!enabled || !elementRef.current) return;
    
    try {
      const saved = sessionStorage.getItem(`scroll-${key}`);
      if (saved) {
        const pos = JSON.parse(saved) as ScrollPosition;
        elementRef.current.scrollTo(pos.scrollLeft, pos.scrollTop);
        setPosition(pos);
      }
    } catch (error) {
      console.warn('Failed to restore scroll position:', error);
    }
  }, [key, enabled]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const pos = { scrollTop: target.scrollTop, scrollLeft: target.scrollLeft };
    setPosition(pos);
    savePosition(pos);
  }, [savePosition]);

  // Set element ref
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element || undefined;
    if (element) {
      restorePosition();
    }
  }, [restorePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    position,
    handleScroll,
    setElementRef,
    restorePosition
  };
}

/**
 * Scroll spy hook for tracking active items
 */
export function useScrollSpy(
  itemIds: string[],
  options: UseScrollSpyOptions = {}
) {
  const {
    threshold = 0.5,
    rootMargin = '0px',
    smooth = true
  } = options;

  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const elements = itemIds
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let maxIntersectionRatio = 0;
        let newActiveId: string | null = null;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio;
            newActiveId = entry.target.id;
          }
        });

        if (newActiveId && maxIntersectionRatio >= threshold) {
          setActiveId(newActiveId);
        }
      },
      { threshold, rootMargin }
    );

    elements.forEach(el => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [itemIds, threshold, rootMargin]);

  // Scroll to item
  const scrollToItem = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start'
      });
    }
  }, [smooth]);

  return {
    activeId,
    scrollToItem
  };
}

/**
 * Keyboard navigation hook for virtual lists
 */
export function useVirtualKeyboardNavigation<T>(
  items: T[],
  onSelect?: (item: T, index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          setSelectedIndex(focusedIndex);
          onSelect?.(items[focusedIndex], focusedIndex);
        }
        break;
      
      case 'Escape':
        setSelectedIndex(null);
        break;
    }
  }, [items, focusedIndex, onSelect]);

  return {
    focusedIndex,
    selectedIndex,
    setFocusedIndex,
    setSelectedIndex,
    handleKeyDown
  };
}