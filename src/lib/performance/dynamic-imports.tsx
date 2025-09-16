import dynamic from 'next/dynamic';
import React, { ComponentType, ReactNode } from 'react';

/**
 * Options for lazy loading components
 */
interface LazyComponentOptions {
  fallback?: ReactNode;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  preload?: boolean;
  delay?: number;
  timeout?: number;
  ssr?: boolean;
}

/**
 * Create a lazy-loaded component with performance optimizations
 */
export function createLazyComponent<P extends Record<string, any> = Record<string, any>>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: LazyComponentOptions = {}
): ComponentType<P> {
  const {
    fallback = <div>Loading...</div>,
    ssr = true,
    delay = 0,
  } = options;

  return dynamic(
    async () => {
      // Add artificial delay if specified (useful for avoiding flash of loading state)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const loadedModule = await loader();
      
      // Handle both default exports and named exports
      if ('default' in loadedModule) {
        return loadedModule;
      }
      
      return { default: loadedModule as ComponentType<P> };
    },
    {
      loading: () => <>{fallback}</>,
      ssr,
    }
  ) as ComponentType<P>;
}

/**
 * Critical path tracking for performance optimization
 */
export class CriticalPath {
  private static criticalComponents = new Set<string>();
  private static loadedComponents = new Set<string>();
  private static loadPromises = new Map<string, Promise<void>>();

  /**
   * Mark a component as critical for initial render
   */
  static markCritical(componentName: string) {
    this.criticalComponents.add(componentName);
  }

  /**
   * Check if a component is critical
   */
  static isCritical(componentName: string): boolean {
    return this.criticalComponents.has(componentName);
  }

  /**
   * Track when a component is loaded
   */
  static markLoaded(componentName: string) {
    this.loadedComponents.add(componentName);
  }

  /**
   * Check if a component is loaded
   */
  static isLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName);
  }

  /**
   * Preload a component
   */
  static async preload(
    componentName: string,
    loader: () => Promise<any>
  ): Promise<void> {
    if (this.loadPromises.has(componentName)) {
      return this.loadPromises.get(componentName)!;
    }

    const loadPromise = loader()
      .then(() => {
        this.markLoaded(componentName);
      })
      .catch((error) => {
        console.error(`Failed to preload component ${componentName}:`, error);
        this.loadPromises.delete(componentName);
        throw error;
      });

    this.loadPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Create a critical component with high-priority loading
   */
  static critical<P extends Record<string, any> = Record<string, any>>(
    loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
    options: {
      fallback?: ReactNode;
      timeout?: number;
      retries?: number;
      preload?: boolean;
    } = {}
  ): ComponentType<P> {
    const {
      fallback = <div>Loading...</div>,
      timeout = 5000,
      retries = 3,
      preload = false
    } = options;

    return createLazyComponent(loader, {
      fallback,
      priority: 'critical',
      timeout,
      ssr: true
    });
  }

  /**
   * Get loading statistics
   */
  static getStats() {
    return {
      critical: Array.from(this.criticalComponents),
      loaded: Array.from(this.loadedComponents),
      pending: Array.from(this.loadPromises.keys()),
    };
  }
}

/**
 * Component preloader for optimizing initial page load
 */
export class ComponentPreloader {
  private static preloadQueue: Array<() => Promise<void>> = [];
  private static isPreloading = false;

  /**
   * Add a component to the preload queue
   */
  static queue(loader: () => Promise<void>, priority: number = 0) {
    this.preloadQueue.push(loader);
    
    // Sort by priority (higher priority loads first)
    this.preloadQueue.sort((a, b) => {
      // In a real implementation, we'd track priority with the loader
      return 0; // Simplified for this example
    });

    // Start preloading if not already running
    if (!this.isPreloading) {
      this.startPreloading();
    }
  }

  /**
   * Start processing the preload queue
   */
  private static async startPreloading() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    // Use requestIdleCallback for non-critical preloading
    const preloadNext = () => {
      if (this.preloadQueue.length === 0) {
        this.isPreloading = false;
        return;
      }

      // Check if we should use requestIdleCallback
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(
          async () => {
            const loader = this.preloadQueue.shift();
            if (loader) {
              try {
                await loader();
              } catch (error) {
                console.error('Preload error:', error);
              }
              preloadNext();
            }
          },
          { timeout: 2000 }
        );
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          const loader = this.preloadQueue.shift();
          if (loader) {
            try {
              await loader();
            } catch (error) {
              console.error('Preload error:', error);
            }
            preloadNext();
          }
        }, 100);
      }
    };

    preloadNext();
  }

  /**
   * Clear the preload queue
   */
  static clear() {
    this.preloadQueue = [];
    this.isPreloading = false;
  }
}

/**
 * Resource hints for optimizing component loading
 */
export class ResourceHints {
  /**
   * Add a prefetch hint for a resource
   */
  static prefetch(url: string) {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  /**
   * Add a preconnect hint for a domain
   */
  static preconnect(origin: string) {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      document.head.appendChild(link);
    }
  }

  /**
   * Add a dns-prefetch hint for a domain
   */
  static dnsPrefetch(origin: string) {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = origin;
      document.head.appendChild(link);
    }
  }
}

/**
 * Performance monitoring for dynamic imports
 */
export class ImportMonitor {
  private static metrics = new Map<string, {
    loadTime: number;
    renderTime: number;
    errorCount: number;
  }>();

  /**
   * Start monitoring a component load
   */
  static startLoad(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      const existing = this.metrics.get(componentName) || {
        loadTime: 0,
        renderTime: 0,
        errorCount: 0,
      };
      
      this.metrics.set(componentName, {
        ...existing,
        loadTime,
      });
    };
  }

  /**
   * Record an error for a component
   */
  static recordError(componentName: string) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
    };
    
    this.metrics.set(componentName, {
      ...existing,
      errorCount: existing.errorCount + 1,
    });
  }

  /**
   * Get metrics for all components
   */
  static getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

const DynamicImports = {
  createLazyComponent,
  CriticalPath,
  ComponentPreloader,
  ResourceHints,
  ImportMonitor,
};

export default DynamicImports;