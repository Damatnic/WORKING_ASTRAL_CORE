/**
 * Virtual Scroll Performance Utilities
 * Comprehensive utilities for optimizing virtual scrolling performance
 * Includes caching, measurements, buffer management, and memory optimization
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

// Types
export interface ItemMeasurement {
  height: number;
  width?: number;
  timestamp: number;
  element?: HTMLElement;
}

export interface ScrollMetrics {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
  velocity: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
  timestamp: number;
}

export interface BufferZone {
  start: number;
  end: number;
  overscanStart: number;
  overscanEnd: number;
  totalItems: number;
}

export interface VirtualScrollState {
  visibleRange: [number, number];
  renderRange: [number, number];
  totalHeight: number;
  totalWidth: number;
  averageItemHeight: number;
  isScrolling: boolean;
  scrollMetrics: ScrollMetrics;
}

export interface PerformanceConfig {
  enableMeasurementCache: boolean;
  cacheSize: number;
  enableRAF: boolean;
  enableDebouncing: boolean;
  debounceDelay: number;
  enableMemoryOptimization: boolean;
  memoryThreshold: number; // MB
  enableProfiling: boolean;
  maxConcurrentMeasurements: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableMeasurementCache: true,
  cacheSize: 1000,
  enableRAF: true,
  enableDebouncing: true,
  debounceDelay: 16, // ~60fps
  enableMemoryOptimization: true,
  memoryThreshold: 50,
  enableProfiling: false,
  maxConcurrentMeasurements: 10,
};

/**
 * Item Height Cache Manager
 * Efficiently caches and retrieves item height measurements
 */
export class ItemHeightCache {
  private cache = new Map<string | number, ItemMeasurement>();
  private maxSize: number;
  private accessOrder = new Map<string | number, number>();
  private accessCounter = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string | number, measurement: ItemMeasurement): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldestItems(Math.floor(this.maxSize * 0.1)); // Remove 10% of oldest
    }

    this.cache.set(key, measurement);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: string | number): ItemMeasurement | undefined {
    const measurement = this.cache.get(key);
    if (measurement) {
      this.accessOrder.set(key, ++this.accessCounter);
    }
    return measurement;
  }

  has(key: string | number): boolean {
    return this.cache.has(key);
  }

  delete(key: string | number): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  getSize(): number {
    return this.cache.size;
  }

  getMemoryUsage(): number {
    // Rough estimate in bytes
    return this.cache.size * 200; // ~200 bytes per measurement
  }

  private evictOldestItems(count: number): void {
    const sortedByAccess = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);

    for (const [key] of sortedByAccess) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  // Batch operations for better performance
  setBatch(items: Array<{ key: string | number; measurement: ItemMeasurement }>): void {
    for (const { key, measurement } of items) {
      this.set(key, measurement);
    }
  }

  // Get statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRatio: this.accessCounter > 0 ? this.cache.size / this.accessCounter : 0,
      memoryUsage: this.getMemoryUsage(),
    };
  }
}

/**
 * Scroll Position Manager
 * Manages scroll position persistence and restoration
 */
export class ScrollPositionManager {
  private positions = new Map<string, { scrollTop: number; scrollLeft: number; timestamp: number }>();
  private maxAge = 5 * 60 * 1000; // 5 minutes

  save(key: string, scrollTop: number, scrollLeft: number = 0): void {
    this.positions.set(key, {
      scrollTop,
      scrollLeft,
      timestamp: Date.now(),
    });

    // Clean up old positions
    this.cleanup();
  }

  restore(key: string): { scrollTop: number; scrollLeft: number } | null {
    const position = this.positions.get(key);
    if (!position) return null;

    // Check if position is still valid
    if (Date.now() - position.timestamp > this.maxAge) {
      this.positions.delete(key);
      return null;
    }

    return {
      scrollTop: position.scrollTop,
      scrollLeft: position.scrollLeft,
    };
  }

  clear(key?: string): void {
    if (key) {
      this.positions.delete(key);
    } else {
      this.positions.clear();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, position] of this.positions.entries()) {
      if (now - position.timestamp > this.maxAge) {
        this.positions.delete(key);
      }
    }
  }
}

/**
 * Buffer Zone Calculator
 * Calculates optimal buffer zones for smooth scrolling
 */
export function calculateBufferZone(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number | ((index: number) => number),
  totalItems: number,
  overscan: number = 5
): BufferZone {
  let currentOffset = 0;
  let startIndex = -1;
  let endIndex = -1;

  // Calculate visible range
  for (let i = 0; i < totalItems; i++) {
    const height = typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;
    
    if (startIndex === -1 && currentOffset + height > scrollTop) {
      startIndex = i;
    }
    
    if (endIndex === -1 && currentOffset > scrollTop + containerHeight) {
      endIndex = i - 1;
      break;
    }
    
    currentOffset += height;
  }

  if (startIndex === -1) startIndex = 0;
  if (endIndex === -1) endIndex = totalItems - 1;

  // Apply overscan
  const overscanStart = Math.max(0, startIndex - overscan);
  const overscanEnd = Math.min(totalItems - 1, endIndex + overscan);

  return {
    start: startIndex,
    end: endIndex,
    overscanStart,
    overscanEnd,
    totalItems,
  };
}

/**
 * Dynamic Item Height Estimator
 * Estimates item heights based on content and past measurements
 */
export class ItemHeightEstimator {
  private measurements = new ItemHeightCache();
  private averageHeight: number;
  private minHeight: number;
  private maxHeight: number;
  private sampleSize: number = 0;

  constructor(initialEstimate: number = 50) {
    this.averageHeight = initialEstimate;
    this.minHeight = initialEstimate;
    this.maxHeight = initialEstimate;
  }

  estimate(index: number, content?: string): number {
    // Check cache first
    const cached = this.measurements.get(index);
    if (cached) {
      return cached.height;
    }

    // Content-based estimation
    if (content) {
      return this.estimateFromContent(content);
    }

    return this.averageHeight;
  }

  record(index: number, height: number): void {
    this.measurements.set(index, {
      height,
      timestamp: Date.now(),
    });

    // Update statistics
    this.updateStatistics(height);
  }

  private estimateFromContent(content: string): number {
    // Basic heuristic: estimate based on content length
    const charactersPerLine = 50; // Rough estimate
    const lineHeight = 20; // Pixels per line
    const baseHeight = 40; // Minimum height for padding, etc.
    
    const estimatedLines = Math.ceil(content.length / charactersPerLine);
    const estimatedHeight = baseHeight + (estimatedLines * lineHeight);
    
    // Clamp to reasonable bounds
    return Math.max(this.minHeight, Math.min(this.maxHeight * 2, estimatedHeight));
  }

  private updateStatistics(height: number): void {
    this.sampleSize++;
    
    // Update running average
    this.averageHeight = (this.averageHeight * (this.sampleSize - 1) + height) / this.sampleSize;
    
    // Update bounds
    this.minHeight = Math.min(this.minHeight, height);
    this.maxHeight = Math.max(this.maxHeight, height);
  }

  getStats() {
    return {
      averageHeight: this.averageHeight,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      sampleSize: this.sampleSize,
      cacheStats: this.measurements.getStats(),
    };
  }

  reset(): void {
    this.measurements.clear();
    this.sampleSize = 0;
  }
}

/**
 * Memory Monitor
 * Monitors and manages memory usage for virtual scrolling
 */
export class MemoryMonitor {
  private observations = new Map<string, { size: number; timestamp: number }>();
  private thresholdMB: number;
  private cleanupCallbacks = new Set<() => void>();

  constructor(thresholdMB: number = 50) {
    this.thresholdMB = thresholdMB;
    this.startMonitoring();
  }

  addCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  removeCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  recordUsage(key: string, estimatedSizeBytes: number): void {
    this.observations.set(key, {
      size: estimatedSizeBytes,
      timestamp: Date.now(),
    });
  }

  getCurrentUsage(): number {
    let totalBytes = 0;
    for (const observation of this.observations.values()) {
      totalBytes += observation.size;
    }
    return totalBytes / (1024 * 1024); // Convert to MB
  }

  isOverThreshold(): boolean {
    return this.getCurrentUsage() > this.thresholdMB;
  }

  private startMonitoring(): void {
    // Check memory usage periodically
    const checkInterval = 10000; // 10 seconds
    
    const check = () => {
      if (this.isOverThreshold()) {
        this.triggerCleanup();
      }
      setTimeout(check, checkInterval);
    };

    setTimeout(check, checkInterval);
  }

  private triggerCleanup(): void {
    console.warn(`Virtual scroll memory usage (${this.getCurrentUsage().toFixed(1)}MB) exceeds threshold (${this.thresholdMB}MB). Triggering cleanup.`);
    
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in memory cleanup callback:', error);
      }
    }
  }
}

/**
 * Performance Profiler
 * Profiles virtual scrolling performance and provides optimization recommendations
 */
export class VirtualScrollProfiler {
  private measurements: Array<{
    operation: string;
    duration: number;
    timestamp: number;
    metadata?: any;
  }> = [];
  private enabled: boolean = false;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  time(operation: string): () => void {
    if (!this.enabled) return () => {};

    const startTime = performance.now();
    
    return (metadata?: any) => {
      const duration = performance.now() - startTime;
      this.measurements.push({
        operation,
        duration,
        timestamp: Date.now(),
        metadata,
      });

      // Keep only recent measurements
      if (this.measurements.length > 1000) {
        this.measurements = this.measurements.slice(-500);
      }
    };
  }

  getReport(): {
    averages: Record<string, number>;
    totals: Record<string, number>;
    recommendations: string[];
  } {
    const operationStats = new Map<string, { totalDuration: number; count: number }>();

    for (const measurement of this.measurements) {
      const stats = operationStats.get(measurement.operation) || { totalDuration: 0, count: 0 };
      stats.totalDuration += measurement.duration;
      stats.count++;
      operationStats.set(measurement.operation, stats);
    }

    const averages: Record<string, number> = {};
    const totals: Record<string, number> = {};
    const recommendations: string[] = [];

    for (const [operation, stats] of operationStats.entries()) {
      averages[operation] = stats.totalDuration / stats.count;
      totals[operation] = stats.totalDuration;

      // Generate recommendations
      if (averages[operation] > 16) { // Slower than 60fps
        recommendations.push(`${operation} is taking ${averages[operation].toFixed(1)}ms on average. Consider optimization.`);
      }
    }

    return { averages, totals, recommendations };
  }

  clear(): void {
    this.measurements = [];
  }
}

/**
 * Virtual Scroll Performance Manager
 * Main class that orchestrates all performance optimizations
 */
export class VirtualScrollPerformanceManager {
  private config: PerformanceConfig;
  private heightCache: ItemHeightCache;
  private positionManager: ScrollPositionManager;
  private heightEstimator: ItemHeightEstimator;
  private memoryMonitor: MemoryMonitor;
  private profiler: VirtualScrollProfiler;
  private rafCallbacks = new Set<() => void>();
  private rafId: number | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.heightCache = new ItemHeightCache(this.config.cacheSize);
    this.positionManager = new ScrollPositionManager();
    this.heightEstimator = new ItemHeightEstimator();
    this.memoryMonitor = new MemoryMonitor(this.config.memoryThreshold);
    this.profiler = new VirtualScrollProfiler();

    if (this.config.enableProfiling) {
      this.profiler.enable();
    }

    // Setup memory cleanup
    if (this.config.enableMemoryOptimization) {
      this.memoryMonitor.addCleanupCallback(() => this.cleanup());
    }

    // Setup RAF loop
    if (this.config.enableRAF) {
      this.startRAFLoop();
    }
  }

  // Height management
  cacheItemHeight(key: string | number, height: number, element?: HTMLElement): void {
    const measurement: ItemMeasurement = {
      height,
      timestamp: Date.now(),
      element,
    };

    this.heightCache.set(key, measurement);
    if (typeof key === 'number') {
      this.heightEstimator.record(key, height);
    }
  }

  getItemHeight(key: string | number, fallback?: number): number {
    const cached = this.heightCache.get(key);
    if (cached) return cached.height;

    if (typeof key === 'number') {
      return this.heightEstimator.estimate(key);
    }

    return fallback || 50;
  }

  // Position management
  saveScrollPosition(key: string, scrollTop: number, scrollLeft?: number): void {
    this.positionManager.save(key, scrollTop, scrollLeft);
  }

  restoreScrollPosition(key: string): { scrollTop: number; scrollLeft: number } | null {
    return this.positionManager.restore(key);
  }

  // RAF management
  scheduleUpdate(callback: () => void): void {
    if (!this.config.enableRAF) {
      callback();
      return;
    }

    this.rafCallbacks.add(callback);
  }

  // Profiling
  measureOperation<T>(operation: string, fn: () => T): T {
    const endTiming = this.profiler.time(operation);
    try {
      return fn();
    } finally {
      endTiming();
    }
  }

  // Cleanup and optimization
  cleanup(): void {
    // Clear old cache entries
    const maxAge = 10 * 60 * 1000; // 10 minutes
    // Implementation would clear old entries from caches
    
    // Force garbage collection if possible
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Statistics and monitoring
  getStats() {
    return {
      heightCache: this.heightCache.getStats(),
      heightEstimator: this.heightEstimator.getStats(),
      memoryUsage: this.memoryMonitor.getCurrentUsage(),
      performance: this.profiler.getReport(),
    };
  }

  private startRAFLoop(): void {
    const loop = () => {
      if (this.rafCallbacks.size > 0) {
        const callbacks = Array.from(this.rafCallbacks);
        this.rafCallbacks.clear();
        
        for (const callback of callbacks) {
          try {
            callback();
          } catch (error) {
            console.error('Error in RAF callback:', error);
          }
        }
      }
      
      this.rafId = requestAnimationFrame(loop);
    };
    
    this.rafId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.heightCache.clear();
    this.positionManager.clear();
    this.heightEstimator.reset();
    this.profiler.clear();
    this.rafCallbacks.clear();
  }
}

// React Hooks for easy integration

/**
 * Hook for managing virtual scroll performance
 */
export function useVirtualScrollPerformance(config?: Partial<PerformanceConfig>) {
  const managerRef = useRef<VirtualScrollPerformanceManager>();
  
  if (!managerRef.current) {
    managerRef.current = new VirtualScrollPerformanceManager(config);
  }

  useEffect(() => {
    return () => {
      managerRef.current?.dispose();
    };
  }, []);

  const cacheItemHeight = useCallback((key: string | number, height: number, element?: HTMLElement) => {
    managerRef.current?.cacheItemHeight(key, height, element);
  }, []);

  const getItemHeight = useCallback((key: string | number, fallback?: number) => {
    return managerRef.current?.getItemHeight(key, fallback) || fallback || 50;
  }, []);

  const saveScrollPosition = useCallback((key: string, scrollTop: number, scrollLeft?: number) => {
    managerRef.current?.saveScrollPosition(key, scrollTop, scrollLeft);
  }, []);

  const restoreScrollPosition = useCallback((key: string) => {
    return managerRef.current?.restoreScrollPosition(key);
  }, []);

  const measureOperation = useCallback(<T>(operation: string, fn: () => T): T => {
    return managerRef.current?.measureOperation(operation, fn) || fn();
  }, []);

  const scheduleUpdate = useCallback((callback: () => void) => {
    managerRef.current?.scheduleUpdate(callback);
  }, []);

  const getStats = useCallback(() => {
    return managerRef.current?.getStats();
  }, []);

  return {
    cacheItemHeight,
    getItemHeight,
    saveScrollPosition,
    restoreScrollPosition,
    measureOperation,
    scheduleUpdate,
    getStats,
  };
}

/**
 * Hook for measuring element heights
 */
export function useElementMeasurement<T extends HTMLElement>() {
  const observerRef = useRef<ResizeObserver>();
  const callbacksRef = useRef<Map<T, (entry: ResizeObserverEntry) => void>>(new Map());

  const observeElement = useCallback((element: T, callback: (entry: ResizeObserverEntry) => void) => {
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const callback = callbacksRef.current.get(entry.target as T);
          if (callback) {
            callback(entry);
          }
        }
      });
    }

    callbacksRef.current.set(element, callback);
    observerRef.current.observe(element);
  }, []);

  const unobserveElement = useCallback((element: T) => {
    observerRef.current?.unobserve(element);
    callbacksRef.current.delete(element);
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      callbacksRef.current.clear();
    };
  }, []);

  return { observeElement, unobserveElement };
}

// Utility functions for common calculations

/**
 * Calculate total height for variable-height items
 */
export function calculateTotalHeight(
  itemCount: number,
  getItemHeight: (index: number) => number
): number {
  let totalHeight = 0;
  for (let i = 0; i < itemCount; i++) {
    totalHeight += getItemHeight(i);
  }
  return totalHeight;
}

/**
 * Find item index at given scroll position
 */
export function findItemIndexAtScrollPosition(
  scrollTop: number,
  itemCount: number,
  getItemHeight: (index: number) => number
): number {
  let currentOffset = 0;
  
  for (let i = 0; i < itemCount; i++) {
    const height = getItemHeight(i);
    if (currentOffset + height > scrollTop) {
      return i;
    }
    currentOffset += height;
  }
  
  return itemCount - 1;
}

/**
 * Calculate scroll offset for item index
 */
export function calculateScrollOffsetForIndex(
  index: number,
  getItemHeight: (index: number) => number
): number {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += getItemHeight(i);
  }
  return offset;
}

/**
 * Debounce function optimized for scroll events
 */
export function debounceScrollEvent<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 16
): T {
  let timeoutId: number | null = null;
  let lastCallTime = 0;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallTime < delay) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        lastCallTime = now;
        func(...args);
      }, delay);
    } else {
      lastCallTime = now;
      func(...args);
    }
  }) as T;
}