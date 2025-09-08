/**
 * Enhanced Performance Monitoring Module
 * Tracks Core Web Vitals, bundle sizes, dynamic imports, and performance metrics
 * Implements automated performance testing and budget enforcement with code splitting optimization
 */

import React from 'react';
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB, Metric } from 'web-vitals';
import { cacheManager } from '@/lib/cache/redis';

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
  // Core Web Vitals
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  inp?: number; // Interaction to Next Paint
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom Metrics
  pageLoadTime?: number;
  domContentLoaded?: number;
  resourceLoadTime?: number;
  apiResponseTime?: Record<string, number[]>;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  bundleSize?: Record<string, number>;
  
  // Dynamic Import Metrics
  chunkLoadTime?: Record<string, number[]>;
  chunkLoadFailures?: Record<string, number>;
  componentRenderTime?: Record<string, number[]>;
  suspenseFallbackTime?: Record<string, number>;
  errorBoundaryTriggers?: Record<string, number>;
}

/**
 * Performance Budgets
 * Define acceptable thresholds for various metrics
 */
const PERFORMANCE_BUDGETS = {
  // Core Web Vitals (Good thresholds)
  cls: 0.1,
  fcp: 1800,
  fid: 100,
  inp: 200,
  lcp: 2500,
  ttfb: 800,
  
  // Custom budgets
  pageLoadTime: 3000,
  domContentLoaded: 1500,
  apiResponseTime: 500,
  bundleSize: {
    main: 200 * 1024, // 200KB
    vendor: 300 * 1024, // 300KB
    total: 600 * 1024, // 600KB
    crisis: 50 * 1024, // 50KB (critical path)
    auth: 100 * 1024, // 100KB
    ui: 150 * 1024, // 150KB
    charts: 200 * 1024, // 200KB
  },
  memoryUsage: 50 * 1024 * 1024, // 50MB
  
  // Dynamic Import Budgets
  chunkLoadTime: {
    crisis: 1000, // 1s for critical
    dashboard: 2000, // 2s for dashboard
    wellness: 1500, // 1.5s for wellness
    default: 3000, // 3s for others
  },
  componentRenderTime: 100, // 100ms
  suspenseFallbackTime: 200, // 200ms before showing fallback
};

/**
 * Performance Monitor Class
 * Singleton for tracking and reporting performance metrics
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private reportQueue: Metric[] = [];
  private reportTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }
  
  /**
   * Initialize performance monitoring
   */
  private initialize() {
    // Track Core Web Vitals
    this.trackCoreWebVitals();
    
    // Track page load metrics
    this.trackPageLoadMetrics();
    
    // Track resource loading
    this.trackResourceLoading();
    
    // Track memory usage
    this.trackMemoryUsage();
    
    // Set up navigation timing
    this.trackNavigationTiming();
    
    // Monitor long tasks
    this.monitorLongTasks();
  }
  
  /**
   * Track Core Web Vitals
   */
  private trackCoreWebVitals() {
    // Cumulative Layout Shift
    onCLS((metric) => {
      this.metrics.cls = metric.value;
      this.checkBudget('cls', metric.value);
      this.queueReport(metric);
    });
    
    // First Contentful Paint
    onFCP((metric) => {
      this.metrics.fcp = metric.value;
      this.checkBudget('fcp', metric.value);
      this.queueReport(metric);
    });
    
    // First Input Delay
    onFID((metric) => {
      this.metrics.fid = metric.value;
      this.checkBudget('fid', metric.value);
      this.queueReport(metric);
    });
    
    // Interaction to Next Paint
    onINP((metric) => {
      this.metrics.inp = metric.value;
      this.checkBudget('inp', metric.value);
      this.queueReport(metric);
    });
    
    // Largest Contentful Paint
    onLCP((metric) => {
      this.metrics.lcp = metric.value;
      this.checkBudget('lcp', metric.value);
      this.queueReport(metric);
    });
    
    // Time to First Byte
    onTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      this.checkBudget('ttfb', metric.value);
      this.queueReport(metric);
    });
  }
  
  /**
   * Track page load metrics
   */
  private trackPageLoadMetrics() {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          
          this.checkBudget('pageLoadTime', this.metrics.pageLoadTime);
          this.checkBudget('domContentLoaded', this.metrics.domContentLoaded);
        }
      });
    }
  }
  
  /**
   * Track resource loading performance
   */
  private trackResourceLoading() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            const loadTime = resource.responseEnd - resource.startTime;
            
            // Track slow resources
            if (loadTime > 1000) {
              console.warn(`[Performance] Slow resource: ${resource.name} took ${loadTime.toFixed(2)}ms`);
            }
            
            // Update metrics
            if (!this.metrics.resourceLoadTime || loadTime > this.metrics.resourceLoadTime) {
              this.metrics.resourceLoadTime = loadTime;
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }
  
  /**
   * Track memory usage
   */
  private trackMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        
        this.metrics.memoryUsage = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
        
        // Check memory budget
        if (memory.usedJSHeapSize > PERFORMANCE_BUDGETS.memoryUsage) {
          console.warn(`[Performance] Memory usage exceeded budget: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 10000); // Check every 10 seconds
    }
  }
  
  /**
   * Track navigation timing
   */
  private trackNavigationTiming() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            
            // Track various navigation metrics
            const metrics = {
              dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
              tcpConnection: nav.connectEnd - nav.connectStart,
              request: nav.responseStart - nav.requestStart,
              response: nav.responseEnd - nav.responseStart,
              domProcessing: nav.domComplete - nav.domInteractive,
              domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              loadComplete: nav.loadEventEnd - nav.loadEventStart,
            };
            
            console.log('[Performance] Navigation timing:', metrics);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', observer);
      } catch (e) {
        // Navigation timing may not be available
      }
    }
  }
  
  /**
   * Monitor long tasks
   */
  private monitorLongTasks() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (entry.duration > 50) {
              console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
              
              // Report long task
              this.reportLongTask({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', observer);
      } catch (e) {
        // Long task observer may not be supported
      }
    }
  }
  
  /**
   * Check performance budget
   */
  private checkBudget(metric: string, value: number) {
    const budget = (PERFORMANCE_BUDGETS as any)[metric];
    
    if (budget && value > budget) {
      console.warn(`[Performance] ${metric} exceeded budget: ${value.toFixed(2)} > ${budget}`);
      
      // Report budget violation
      this.reportBudgetViolation(metric, value, budget);
    }
  }
  
  /**
   * Queue metric for batch reporting
   */
  private queueReport(metric: Metric) {
    this.reportQueue.push(metric);
    
    // Batch reports every 5 seconds
    if (!this.reportTimer) {
      this.reportTimer = setTimeout(() => {
        this.flushReports();
      }, 5000);
    }
  }
  
  /**
   * Flush queued reports
   */
  private async flushReports() {
    if (this.reportQueue.length === 0) return;
    
    const reports = [...this.reportQueue];
    this.reportQueue = [];
    this.reportTimer = null;
    
    try {
      // Send to analytics endpoint
      await this.sendToAnalytics(reports);
      
      // Cache metrics for dashboard
      await this.cacheMetrics();
    } catch (error) {
      console.error('[Performance] Failed to send reports:', error);
    }
  }
  
  /**
   * Send metrics to analytics
   */
  private async sendToAnalytics(metrics: Metric[]) {
    // Only send in production
    if (process.env.NODE_ENV !== 'production') return;
    
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      // Silently fail analytics
    }
  }
  
  /**
   * Cache metrics for dashboard
   */
  private async cacheMetrics() {
    try {
      await cacheManager.set('DASHBOARD_METRICS', 'performance', this.metrics, 300);
    } catch (error) {
      // Silently fail caching
    }
  }
  
  /**
   * Report long task
   */
  private reportLongTask(task: { name: string; duration: number; startTime: number }) {
    // Track long tasks for analysis
    if (!this.metrics.apiResponseTime) {
      this.metrics.apiResponseTime = {};
    }
    
    const taskKey = 'longTasks';
    if (!this.metrics.apiResponseTime[taskKey]) {
      this.metrics.apiResponseTime[taskKey] = [];
    }
    
    this.metrics.apiResponseTime[taskKey].push(task.duration);
    
    // Keep only last 100 long tasks
    if (this.metrics.apiResponseTime[taskKey].length > 100) {
      this.metrics.apiResponseTime[taskKey].shift();
    }
  }
  
  /**
   * Report budget violation
   */
  private reportBudgetViolation(metric: string, value: number, budget: number) {
    console.error(`[Performance Budget] ${metric} violation: ${value} > ${budget}`);
    
    // Send alert in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/alerts/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'budget_violation',
          metric,
          value,
          budget,
          url: window.location.href,
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // Silently fail alerts
      });
    }
  }
  
  /**
   * Track API response time
   */
  trackApiCall(endpoint: string, duration: number) {
    if (!this.metrics.apiResponseTime) {
      this.metrics.apiResponseTime = {};
    }
    
    if (!this.metrics.apiResponseTime[endpoint]) {
      this.metrics.apiResponseTime[endpoint] = [];
    }
    
    this.metrics.apiResponseTime[endpoint].push(duration);
    
    // Keep only last 100 calls per endpoint
    if (this.metrics.apiResponseTime[endpoint].length > 100) {
      this.metrics.apiResponseTime[endpoint].shift();
    }
    
    // Check API response time budget
    if (duration > PERFORMANCE_BUDGETS.apiResponseTime) {
      console.warn(`[Performance] Slow API call: ${endpoint} took ${duration}ms`);
    }
  }

  /**
   * Track dynamic chunk loading performance
   */
  trackChunkLoad(chunkName: string, duration: number, failed = false) {
    // Track load time
    if (!this.metrics.chunkLoadTime) {
      this.metrics.chunkLoadTime = {};
    }
    
    if (!this.metrics.chunkLoadTime[chunkName]) {
      this.metrics.chunkLoadTime[chunkName] = [];
    }
    
    this.metrics.chunkLoadTime[chunkName].push(duration);
    
    // Keep only last 50 loads per chunk
    if (this.metrics.chunkLoadTime[chunkName].length > 50) {
      this.metrics.chunkLoadTime[chunkName].shift();
    }
    
    // Track failures
    if (failed) {
      if (!this.metrics.chunkLoadFailures) {
        this.metrics.chunkLoadFailures = {};
      }
      this.metrics.chunkLoadFailures[chunkName] = (this.metrics.chunkLoadFailures[chunkName] || 0) + 1;
    }
    
    // Check chunk load time budget
    const chunkType = this.getChunkType(chunkName);
    const budget = PERFORMANCE_BUDGETS.chunkLoadTime[chunkType] || PERFORMANCE_BUDGETS.chunkLoadTime.default;
    
    if (duration > budget) {
      console.warn(`[Performance] Slow chunk load: ${chunkName} took ${duration}ms (budget: ${budget}ms)`);
    }
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.metrics.componentRenderTime) {
      this.metrics.componentRenderTime = {};
    }
    
    if (!this.metrics.componentRenderTime[componentName]) {
      this.metrics.componentRenderTime[componentName] = [];
    }
    
    this.metrics.componentRenderTime[componentName].push(renderTime);
    
    // Keep only last 50 renders per component
    if (this.metrics.componentRenderTime[componentName].length > 50) {
      this.metrics.componentRenderTime[componentName].shift();
    }
    
    // Check render time budget
    if (renderTime > PERFORMANCE_BUDGETS.componentRenderTime) {
      console.warn(`[Performance] Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }

  /**
   * Track Suspense fallback duration
   */
  trackSuspenseFallback(componentName: string, fallbackTime: number) {
    if (!this.metrics.suspenseFallbackTime) {
      this.metrics.suspenseFallbackTime = {};
    }
    
    this.metrics.suspenseFallbackTime[componentName] = fallbackTime;
    
    // Check fallback time budget
    if (fallbackTime > PERFORMANCE_BUDGETS.suspenseFallbackTime) {
      console.warn(`[Performance] Long Suspense fallback: ${componentName} showed fallback for ${fallbackTime}ms`);
    }
  }

  /**
   * Track error boundary triggers
   */
  trackErrorBoundary(componentName: string, errorType: string) {
    if (!this.metrics.errorBoundaryTriggers) {
      this.metrics.errorBoundaryTriggers = {};
    }
    
    const key = `${componentName}:${errorType}`;
    this.metrics.errorBoundaryTriggers[key] = (this.metrics.errorBoundaryTriggers[key] || 0) + 1;
    
    console.warn(`[Performance] Error boundary triggered: ${componentName} (${errorType})`);
  }

  /**
   * Get chunk type from chunk name
   */
  private getChunkType(chunkName: string): string {
    if (chunkName.includes('crisis') || chunkName.includes('emergency')) {
      return 'crisis';
    }
    if (chunkName.includes('dashboard')) {
      return 'dashboard';
    }
    if (chunkName.includes('wellness') || chunkName.includes('mood')) {
      return 'wellness';
    }
    return 'default';
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const metrics = this.getMetrics();
    
    return {
      coreWebVitals: {
        cls: metrics.cls,
        fcp: metrics.fcp,
        fid: metrics.fid,
        inp: metrics.inp,
        lcp: metrics.lcp,
        ttfb: metrics.ttfb,
      },
      loading: {
        pageLoadTime: metrics.pageLoadTime,
        domContentLoaded: metrics.domContentLoaded,
        resourceLoadTime: metrics.resourceLoadTime,
      },
      memory: metrics.memoryUsage,
      apiResponseTimes: metrics.apiResponseTime 
        ? Object.entries(metrics.apiResponseTime).reduce((acc, [endpoint, times]) => {
            const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
            acc[endpoint] = {
              average: avg,
              min: Math.min(...times),
              max: Math.max(...times),
              count: times.length,
            };
            return acc;
          }, {} as Record<string, any>)
        : {},
    };
  }
  
  /**
   * Clean up observers
   */
  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    
    if (this.reportTimer) {
      clearTimeout(this.reportTimer);
      this.flushReports();
    }
  }
}

// Export singleton instance
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  /**
   * Run performance test suite
   */
  static async runTests(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Test render performance
    results.renderPerformance = await this.testRenderPerformance();
    
    // Test API response times
    results.apiPerformance = await this.testApiPerformance();
    
    // Test memory leaks
    results.memoryLeaks = await this.testMemoryLeaks();
    
    // Test bundle sizes
    results.bundleSizes = await this.testBundleSizes();
    
    return results;
  }
  
  /**
   * Test render performance
   */
  private static async testRenderPerformance() {
    const startTime = performance.now();
    const results: any = {};
    
    // Measure React render cycles
    // This would integrate with React DevTools Profiler API
    
    results.totalTime = performance.now() - startTime;
    return results;
  }
  
  /**
   * Test API performance
   */
  private static async testApiPerformance() {
    const endpoints = [
      '/api/auth/session',
      '/api/user/profile',
      '/api/dashboard/metrics',
    ];
    
    const results: Record<string, number> = {};
    
    for (const endpoint of endpoints) {
      const startTime = performance.now();
      
      try {
        await fetch(endpoint);
        results[endpoint] = performance.now() - startTime;
      } catch (error) {
        results[endpoint] = -1;
      }
    }
    
    return results;
  }
  
  /**
   * Test for memory leaks
   */
  private static async testMemoryLeaks() {
    if (!('memory' in performance)) {
      return { supported: false };
    }
    
    const memory = (performance as any).memory;
    const initialMemory = memory.usedJSHeapSize;
    
    // Simulate user interactions
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      // Create and destroy objects
      const data = new Array(1000).fill({}).map(() => ({
        id: Math.random(),
        data: new Array(100).fill(Math.random()),
      }));
      
      // Force garbage collection if available
      if (typeof (global as any).gc === 'function') {
        (global as any).gc();
      }
    }
    
    const finalMemory = memory.usedJSHeapSize;
    const leak = finalMemory > initialMemory * 1.5;
    
    return {
      initialMemory,
      finalMemory,
      increase: finalMemory - initialMemory,
      possibleLeak: leak,
    };
  }
  
  /**
   * Test bundle sizes
   */
  private static async testBundleSizes() {
    try {
      const response = await fetch('/_next/static/chunks/webpack.js');
      const text = await response.text();
      
      return {
        webpackChunk: text.length,
        exceedsBudget: text.length > PERFORMANCE_BUDGETS.bundleSize.vendor,
      };
    } catch (error) {
      return { error: 'Could not measure bundle size' };
    }
  }
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({});
  
  React.useEffect(() => {
    if (!performanceMonitor) return;
    
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
    };
    
    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    
    // Initial update
    updateMetrics();
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
}

/**
 * API interceptor for performance tracking
 */
export function trackApiPerformance(
  request: Request,
  response: Response,
  duration: number
) {
  if (performanceMonitor) {
    const endpoint = new URL(request.url).pathname;
    performanceMonitor.trackApiCall(endpoint, duration);
  }
}