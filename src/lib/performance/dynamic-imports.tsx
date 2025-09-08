/**
 * Dynamic Import Utilities for Performance Optimization
 * Provides lazy loading, progressive enhancement, and route-based code splitting
 */

import React, { ComponentType, ReactElement, Suspense } from 'react';
import { performanceMonitor } from './monitoring';

/**
 * Device capability detection for conditional loading
 */
interface DeviceCapabilities {
  isLowEnd: boolean;
  isSlowNetwork: boolean;
  supportsWebP: boolean;
  supportsAVIF: boolean;
  memoryLimitMB: number;
}

/**
 * Dynamic import options
 */
interface DynamicImportOptions {
  fallback?: ReactElement;
  loadingComponent?: ComponentType;
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  condition?: () => boolean;
  delay?: number;
  retries?: number;
  timeout?: number;
  ssr?: boolean;
}

/**
 * Route-based preloading strategy
 */
interface PreloadStrategy {
  route: string;
  components: string[];
  probability: number;
  conditions?: string[];
}

/**
 * Component chunk metadata
 */
interface ChunkMetadata {
  name: string;
  size: number;
  dependencies: string[];
  critical: boolean;
  loadTime?: number;
}

/**
 * Detect device capabilities for optimization decisions
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    return {
      isLowEnd: false,
      isSlowNetwork: false,
      supportsWebP: false,
      supportsAVIF: false,
      memoryLimitMB: Infinity,
    };
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const memory = (performance as any).memory;

  // Detect low-end devices
  const isLowEnd = (
    navigator.hardwareConcurrency <= 2 ||
    (memory && memory.jsHeapSizeLimit < 1073741824) || // < 1GB
    (connection && connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType))
  );

  // Detect slow network
  const isSlowNetwork = (
    connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.downlink < 1.5 ||
      connection.saveData === true
    )
  );

  // Feature detection
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const supportsWebP = canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  const supportsAVIF = canvas.toDataURL('image/avif').indexOf('avif') !== -1;

  return {
    isLowEnd,
    isSlowNetwork,
    supportsWebP,
    supportsAVIF,
    memoryLimitMB: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : Infinity,
  };
}

/**
 * Enhanced lazy loading with device-aware optimizations
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: DynamicImportOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    fallback,
    loadingComponent: LoadingComponent,
    errorBoundary: ErrorBoundary,
    preload = false,
    priority = 'medium',
    condition,
    delay = 0,
    retries = 3,
    timeout = 10000,
    ssr = false,
  } = options;

  // Create lazy component with error handling and retries
  const LazyComponent = React.lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const capabilities = detectDeviceCapabilities();
      
      // Check loading condition
      if (condition && !condition()) {
        reject(new Error('Loading condition not met'));
        return;
      }

      // Apply delay for low-priority components on slow networks
      const loadDelay = capabilities.isSlowNetwork && priority === 'low' 
        ? Math.max(delay, 1000) 
        : delay;

      const attemptLoad = (attempt: number) => {
        const startTime = performance.now();
        
        // Set timeout for loading
        const timeoutId = setTimeout(() => {
          reject(new Error(`Component loading timeout after ${timeout}ms`));
        }, timeout);

        const loadPromise = delay > 0 
          ? new Promise(resolve => setTimeout(resolve, loadDelay)).then(() => importFn())
          : importFn();

        loadPromise
          .then((module) => {
            clearTimeout(timeoutId);
            const loadTime = performance.now() - startTime;
            
            // Track loading performance
            if (performanceMonitor) {
              performanceMonitor.trackApiCall('component-load', loadTime);
            }
            
            resolve(module);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            
            if (attempt < retries) {
              console.warn(`Component load failed (attempt ${attempt}), retrying...`, error);
              setTimeout(() => attemptLoad(attempt + 1), 1000 * attempt);
            } else {
              reject(error);
            }
          });
      };

      attemptLoad(1);
    });
  });

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Use requestIdleCallback for low-priority preloading
    const preloadFn = priority === 'low' && 'requestIdleCallback' in window
      ? (cb: () => void) => (window as any).requestIdleCallback(cb)
      : (cb: () => void) => setTimeout(cb, 0);

    preloadFn(() => {
      importFn().catch(() => {
        // Silent fail for preloading
      });
    });
  }

  // Return wrapped component
  return React.forwardRef<any, React.ComponentPropsWithRef<T>>((props, ref) => {
    if (!ssr && typeof window === 'undefined') {
      return fallback || null;
    }

    const content = (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : fallback}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    );

    if (ErrorBoundary) {
      return (
        <ErrorBoundary error={new Error('Component failed to load')} retry={() => window.location.reload()}>
          {content}
        </ErrorBoundary>
      );
    }

    return content;
  });
}

/**
 * Progressive enhancement wrapper for components
 */
export function withProgressiveEnhancement<T extends ComponentType<any>>(
  baseComponent: T,
  enhancedImportFn: () => Promise<{ default: T }>,
  options: {
    enhancementCondition?: () => boolean;
    fallbackProps?: Partial<React.ComponentProps<T>>;
  } = {}
): React.ComponentType<React.ComponentProps<T>> {
  const { enhancementCondition, fallbackProps = {} } = options;

  return React.forwardRef<any, React.ComponentPropsWithRef<T>>((props, ref) => {
    const [shouldEnhance, setShouldEnhance] = React.useState(false);
    const [EnhancedComponent, setEnhancedComponent] = React.useState<T | null>(null);

    React.useEffect(() => {
      if (typeof window === 'undefined') return;

      const capabilities = detectDeviceCapabilities();
      
      // Default enhancement condition: not low-end device and not slow network
      const defaultCondition = () => !capabilities.isLowEnd && !capabilities.isSlowNetwork;
      const condition = enhancementCondition || defaultCondition;

      if (condition()) {
        setShouldEnhance(true);
        
        // Load enhanced component
        enhancedImportFn()
          .then((module) => {
            setEnhancedComponent(() => module.default);
          })
          .catch((error) => {
            console.warn('Failed to load enhanced component, falling back to base:', error);
            setShouldEnhance(false);
          });
      }
    }, []);

    if (shouldEnhance && EnhancedComponent) {
      return <EnhancedComponent {...props} ref={ref} />;
    }

    const BaseComponent = baseComponent;
    return <BaseComponent {...{ ...fallbackProps, ...props }} ref={ref} />;
  });
}

/**
 * Route-based code splitting helper
 */
export class RouteSplitter {
  private static preloadCache = new Map<string, Promise<any>>();
  private static chunkMetadata = new Map<string, ChunkMetadata>();
  
  /**
   * Create a route-split component
   */
  static createRouteComponent<T extends ComponentType<any>>(
    route: string,
    importFn: () => Promise<{ default: T }>,
    options: DynamicImportOptions & {
      criticalRoute?: boolean;
      preloadRoutes?: string[];
    } = {}
  ): React.ComponentType<React.ComponentProps<T>> {
    const { criticalRoute = false, preloadRoutes = [], ...dynamicOptions } = options;

    // Register chunk metadata
    this.chunkMetadata.set(route, {
      name: route,
      size: 0, // Will be updated when loaded
      dependencies: preloadRoutes,
      critical: criticalRoute,
    });

    const LazyComponent = createLazyComponent(importFn, {
      ...dynamicOptions,
      priority: criticalRoute ? 'high' : dynamicOptions.priority,
    });

    // Preload dependent routes
    if (preloadRoutes.length > 0) {
      this.preloadRoutes(preloadRoutes);
    }

    return LazyComponent;
  }

  /**
   * Preload routes based on navigation patterns
   */
  static preloadRoutes(routes: string[], delay = 2000): void {
    if (typeof window === 'undefined') return;

    const capabilities = detectDeviceCapabilities();
    
    // Skip preloading on low-end devices or slow networks
    if (capabilities.isLowEnd || capabilities.isSlowNetwork) {
      return;
    }

    setTimeout(() => {
      routes.forEach((route) => {
        if (!this.preloadCache.has(route)) {
          // This would be populated by the app's route configuration
          console.log(`Preloading route: ${route}`);
        }
      });
    }, delay);
  }

  /**
   * Get chunk loading statistics
   */
  static getStats(): Record<string, ChunkMetadata> {
    return Object.fromEntries(this.chunkMetadata);
  }
}

/**
 * Intelligent preloading based on user behavior
 */
export class IntelligentPreloader {
  private static strategies: PreloadStrategy[] = [
    // Crisis-related routes (highest priority)
    {
      route: '/crisis',
      components: ['CrisisAssessment', 'EmergencyContacts', 'SafetyPlan'],
      probability: 0.8,
      conditions: ['user_in_crisis', 'high_risk_user'],
    },
    // Dashboard to wellness flow
    {
      route: '/wellness',
      components: ['MoodTracker', 'WellnessMetrics'],
      probability: 0.6,
      conditions: ['from_dashboard'],
    },
    // Authentication flow
    {
      route: '/auth',
      components: ['SignIn', 'SignUp', 'PasswordReset'],
      probability: 0.4,
      conditions: ['unauthenticated'],
    },
  ];

  /**
   * Initialize intelligent preloading
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Listen for route changes and user interactions
    this.setupRouteTracking();
    this.setupInteractionTracking();
    this.setupVisibilityTracking();
  }

  /**
   * Track route changes for pattern recognition
   */
  private static setupRouteTracking(): void {
    // Monitor URL changes
    let currentPath = window.location.pathname;
    
    const checkRouteChange = () => {
      if (window.location.pathname !== currentPath) {
        const previousPath = currentPath;
        currentPath = window.location.pathname;
        
        this.onRouteChange(previousPath, currentPath);
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', checkRouteChange);
    
    // Monitor for programmatic navigation (Next.js Router)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkRouteChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkRouteChange, 0);
    };
  }

  /**
   * Track user interactions for predictive loading
   */
  private static setupInteractionTracking(): void {
    document.addEventListener('mouseenter', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.isInternalLink(link.href)) {
        this.preloadForRoute(link.pathname);
      }
    });

    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.isInternalLink(link.href)) {
        this.preloadForRoute(link.pathname);
      }
    });
  }

  /**
   * Track page visibility for resource management
   */
  private static setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause non-critical preloading
        this.pausePreloading();
      } else {
        // Page is visible, resume preloading
        this.resumePreloading();
      }
    });
  }

  /**
   * Handle route changes and trigger predictive loading
   */
  private static onRouteChange(from: string, to: string): void {
    console.log(`Route change: ${from} -> ${to}`);
    
    // Find relevant preload strategies
    const relevantStrategies = this.strategies.filter(strategy => 
      to.includes(strategy.route) || from.includes(strategy.route)
    );

    relevantStrategies.forEach(strategy => {
      if (Math.random() < strategy.probability) {
        this.preloadComponents(strategy.components);
      }
    });
  }

  /**
   * Preload components for a route
   */
  private static preloadForRoute(pathname: string): void {
    const strategy = this.strategies.find(s => pathname.includes(s.route));
    
    if (strategy && Math.random() < strategy.probability) {
      this.preloadComponents(strategy.components, 500); // Delay for hover intent
    }
  }

  /**
   * Preload specified components
   */
  private static preloadComponents(components: string[], delay = 0): void {
    const capabilities = detectDeviceCapabilities();
    
    // Skip on resource-constrained devices
    if (capabilities.isLowEnd || capabilities.isSlowNetwork) {
      return;
    }

    setTimeout(() => {
      components.forEach(componentName => {
        // This would integrate with your component registry
        console.log(`Preloading component: ${componentName}`);
      });
    }, delay);
  }

  /**
   * Check if link is internal
   */
  private static isInternalLink(href: string): boolean {
    try {
      const url = new URL(href);
      return url.origin === window.location.origin;
    } catch {
      return href.startsWith('/');
    }
  }

  /**
   * Pause preloading during background state
   */
  private static pausePreloading(): void {
    // Implementation would pause ongoing preload requests
    console.log('Preloading paused');
  }

  /**
   * Resume preloading when page becomes visible
   */
  private static resumePreloading(): void {
    // Implementation would resume preload requests
    console.log('Preloading resumed');
  }
}

/**
 * Critical path optimization utilities
 */
export const CriticalPath = {
  /**
   * Mark components as critical for immediate loading
   */
  critical<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: Omit<DynamicImportOptions, 'priority'> = {}
  ): React.ComponentType<React.ComponentProps<T>> {
    return createLazyComponent(importFn, {
      ...options,
      priority: 'high',
      preload: true,
      delay: 0,
    });
  },

  /**
   * Defer non-critical components
   */
  deferred<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: Omit<DynamicImportOptions, 'priority'> = {}
  ): React.ComponentType<React.ComponentProps<T>> {
    return createLazyComponent(importFn, {
      ...options,
      priority: 'low',
      delay: 1000,
    });
  },

  /**
   * Load components based on viewport intersection
   */
  onVisible<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: DynamicImportOptions & { rootMargin?: string } = {}
  ): React.ComponentType<React.ComponentProps<T>> {
    const { rootMargin = '100px', ...dynamicOptions } = options;

    return React.forwardRef<any, React.ComponentPropsWithRef<T>>((props, ref) => {
      const [isVisible, setIsVisible] = React.useState(false);
      const elementRef = React.useRef<HTMLDivElement>(null);

      React.useEffect(() => {
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
          setIsVisible(true);
          return;
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          },
          { rootMargin }
        );

        if (elementRef.current) {
          observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
      }, [rootMargin]);

      if (!isVisible) {
        return <div ref={elementRef} style={{ minHeight: '100px' }} />;
      }

      const LazyComponent = createLazyComponent(importFn, dynamicOptions);
      return <LazyComponent {...props} ref={ref} />;
    });
  },
};

/**
 * Initialize dynamic import system
 */
export function initializeDynamicImports(): void {
  if (typeof window === 'undefined') return;

  // Initialize intelligent preloader
  IntelligentPreloader.initialize();

  // Log initialization
  console.log('Dynamic import system initialized');
}

/**
 * Hook for accessing device capabilities
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = React.useState<DeviceCapabilities>(() => 
    detectDeviceCapabilities()
  );

  React.useEffect(() => {
    // Update capabilities when network or device state changes
    const updateCapabilities = () => {
      setCapabilities(detectDeviceCapabilities());
    };

    // Listen for network changes
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', updateCapabilities);
    }

    // Listen for memory pressure (if supported)
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
          updateCapabilities();
        }
      };

      const interval = setInterval(checkMemoryPressure, 30000);
      return () => clearInterval(interval);
    }

    return () => {
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateCapabilities);
      }
    };
  }, []);

  return capabilities;
}