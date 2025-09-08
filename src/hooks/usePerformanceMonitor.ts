'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint  
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  
  // Navigation timing
  navigationStart: number;
  loadComplete: number;
  domContentLoaded: number;
  
  // Resource timing
  totalResources: number;
  totalSize: number;
  averageLoadTime: number;
  
  // Memory usage (if available)
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  
  // Connection info
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  
  // Custom metrics
  timeToInteractive: number;
  bundleSize: number;
  renderTime: number;
}

interface PerformanceThresholds {
  fcp: { good: number; poor: number };
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  timeToInteractive: { good: number; poor: number };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  timeToInteractive: { good: 3800, poor: 7300 },
};

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const metricsRef = useRef<Partial<PerformanceMetrics>>({});

  /**
   * Get performance rating based on thresholds
   */
  const getMetricRating = useCallback((metricName: keyof PerformanceThresholds, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const threshold = DEFAULT_THRESHOLDS[metricName];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }, []);

  /**
   * Collect Core Web Vitals
   */
  const collectWebVitals = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    // FCP - First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry;
    if (fcpEntry) {
      metricsRef.current.fcp = fcpEntry.startTime;
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metricsRef.current.navigationStart = navigation.fetchStart;
      metricsRef.current.loadComplete = navigation.loadEventEnd - navigation.fetchStart;
      metricsRef.current.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    }

    // Memory information (Chrome only)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metricsRef.current.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      metricsRef.current.totalJSHeapSize = memory.totalJSHeapSize;
      metricsRef.current.usedJSHeapSize = memory.usedJSHeapSize;
    }

    // Connection information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metricsRef.current.effectiveType = connection.effectiveType;
      metricsRef.current.rtt = connection.rtt;
      metricsRef.current.downlink = connection.downlink;
    }

    // Resource timing
    const resources = performance.getEntriesByType('resource');
    if (resources.length > 0) {
      metricsRef.current.totalResources = resources.length;
      const totalSize = resources.reduce((sum, resource) => {
        return sum + ((resource as PerformanceResourceTiming).transferSize || 0);
      }, 0);
      metricsRef.current.totalSize = totalSize;
      const totalLoadTime = resources.reduce((sum, resource) => {
        return sum + resource.duration;
      }, 0);
      metricsRef.current.averageLoadTime = totalLoadTime / resources.length;
    }

    // Calculate Time to Interactive (simplified)
    if (navigation) {
      metricsRef.current.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
    }

    // Bundle size estimation (based on script resources)
    const scriptResources = resources.filter(resource => 
      resource.name.includes('.js') || resource.name.includes('/_next/static/')
    );
    const bundleSize = scriptResources.reduce((sum, resource) => {
      return sum + ((resource as PerformanceResourceTiming).transferSize || 0);
    }, 0);
    metricsRef.current.bundleSize = bundleSize;
  }, []);

  /**
   * Initialize Performance Observer for Core Web Vitals
   */
  const initializeObserver = useCallback(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      observerRef.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              metricsRef.current.lcp = entry.startTime;
              break;
            case 'first-input':
              const fidEntry = entry as PerformanceEventTiming;
              metricsRef.current.fid = fidEntry.processingStart - fidEntry.startTime;
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                metricsRef.current.cls = (metricsRef.current.cls || 0) + (entry as any).value;
              }
              break;
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                metricsRef.current.fcp = entry.startTime;
              }
              break;
          }
        }

        // Update metrics state
        setMetrics({ ...metricsRef.current } as PerformanceMetrics);
      });

      // Observe different entry types
      const entryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint'];
      entryTypes.forEach(type => {
        try {
          observerRef.current?.observe({ entryTypes: [type] });
        } catch (e) {
          console.warn(`Performance observer doesn't support ${type}:`, e);
        }
      });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }, []);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return undefined;
    
    setIsMonitoring(true);
    collectWebVitals();
    initializeObserver();

    // Collect initial metrics after a short delay
    setTimeout(() => {
      collectWebVitals();
      setMetrics({ ...metricsRef.current } as PerformanceMetrics);
    }, 1000);

    // Set up periodic collection
    const interval = setInterval(() => {
      collectWebVitals();
      setMetrics({ ...metricsRef.current } as PerformanceMetrics);
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isMonitoring, collectWebVitals, initializeObserver]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [isMonitoring]);

  /**
   * Get performance score (0-100)
   */
  const getPerformanceScore = useCallback((currentMetrics: PerformanceMetrics): number => {
    if (!currentMetrics) return 0;

    let totalScore = 0;
    let metricCount = 0;

    // Score each metric (0-100)
    const scoreMetric = (value: number, good: number, poor: number): number => {
      if (value <= good) return 100;
      if (value >= poor) return 0;
      return Math.round(((poor - value) / (poor - good)) * 100);
    };

    if (currentMetrics.fcp > 0) {
      totalScore += scoreMetric(currentMetrics.fcp, DEFAULT_THRESHOLDS.fcp.good, DEFAULT_THRESHOLDS.fcp.poor);
      metricCount++;
    }
    if (currentMetrics.lcp > 0) {
      totalScore += scoreMetric(currentMetrics.lcp, DEFAULT_THRESHOLDS.lcp.good, DEFAULT_THRESHOLDS.lcp.poor);
      metricCount++;
    }
    if (currentMetrics.fid > 0) {
      totalScore += scoreMetric(currentMetrics.fid, DEFAULT_THRESHOLDS.fid.good, DEFAULT_THRESHOLDS.fid.poor);
      metricCount++;
    }
    if (currentMetrics.cls >= 0) {
      totalScore += scoreMetric(currentMetrics.cls, DEFAULT_THRESHOLDS.cls.good, DEFAULT_THRESHOLDS.cls.poor);
      metricCount++;
    }

    return metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
  }, []);

  /**
   * Get recommendations based on metrics
   */
  const getRecommendations = useCallback((currentMetrics: PerformanceMetrics): string[] => {
    if (!currentMetrics) return [];

    const recommendations: string[] = [];

    if (currentMetrics.fcp > DEFAULT_THRESHOLDS.fcp.poor) {
      recommendations.push('Optimize First Contentful Paint by reducing server response time and eliminating render-blocking resources');
    }
    if (currentMetrics.lcp > DEFAULT_THRESHOLDS.lcp.poor) {
      recommendations.push('Improve Largest Contentful Paint by optimizing images and preloading key resources');
    }
    if (currentMetrics.fid > DEFAULT_THRESHOLDS.fid.poor) {
      recommendations.push('Reduce First Input Delay by breaking up long JavaScript tasks and using code splitting');
    }
    if (currentMetrics.cls > DEFAULT_THRESHOLDS.cls.poor) {
      recommendations.push('Minimize Cumulative Layout Shift by including size attributes on images and ads');
    }
    if (currentMetrics.bundleSize > 500000) { // 500KB
      recommendations.push('Consider reducing bundle size through code splitting and tree shaking');
    }
    if (currentMetrics.totalResources > 100) {
      recommendations.push('Reduce the number of HTTP requests by combining resources and using sprites');
    }

    return recommendations;
  }, []);

  // Initialize monitoring on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanup = startMonitoring();
      return cleanup;
    }
    return undefined;
  }, [startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getMetricRating,
    getPerformanceScore,
    getRecommendations,
    thresholds: DEFAULT_THRESHOLDS,
  };
}