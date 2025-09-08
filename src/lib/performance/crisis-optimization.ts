/**
 * Crisis Feature Critical Path Optimization
 * Ensures crisis intervention features load with maximum priority and performance
 */

import React from 'react';
import { performanceMonitor } from './monitoring';
import { createLazyComponent, CriticalPath } from './dynamic-imports';

/**
 * Crisis Priority Levels
 */
export enum CrisisPriority {
  EMERGENCY = 'emergency',     // Life-threatening situations
  CRITICAL = 'critical',       // High-risk situations
  URGENT = 'urgent',          // Moderate risk
  STANDARD = 'standard'       // General crisis support
}

/**
 * Crisis component preload configuration
 */
interface CrisisPreloadConfig {
  component: string;
  priority: CrisisPriority;
  estimatedLoadTime: number;
  dependencies: string[];
  fallbackStrategy: 'skeleton' | 'minimal' | 'offline';
}

/**
 * Crisis optimization manager
 */
export class CrisisOptimizationManager {
  private static instance: CrisisOptimizationManager;
  private preloadedComponents = new Set<string>();
  private emergencyComponentsLoaded = false;
  private criticalPathInitialized = false;

  // Crisis component configurations
  private static crisisComponents: Record<string, CrisisPreloadConfig> = {
    'SafetyPlan': {
      component: 'SafetyPlan',
      priority: CrisisPriority.EMERGENCY,
      estimatedLoadTime: 800,
      dependencies: ['CrisisAssessment'],
      fallbackStrategy: 'minimal'
    },
    'EmergencyContacts': {
      component: 'EmergencyContacts',
      priority: CrisisPriority.EMERGENCY,
      estimatedLoadTime: 500,
      dependencies: [],
      fallbackStrategy: 'offline'
    },
    'CrisisAssessment': {
      component: 'CrisisAssessment',
      priority: CrisisPriority.CRITICAL,
      estimatedLoadTime: 1200,
      dependencies: ['SafetyPlan'],
      fallbackStrategy: 'skeleton'
    },
    'CopingStrategies': {
      component: 'CopingStrategies',
      priority: CrisisPriority.URGENT,
      estimatedLoadTime: 1500,
      dependencies: [],
      fallbackStrategy: 'skeleton'
    },
    'CrisisChat': {
      component: 'CrisisChat',
      priority: CrisisPriority.CRITICAL,
      estimatedLoadTime: 2000,
      dependencies: ['EmergencyContacts'],
      fallbackStrategy: 'minimal'
    },
    'CrisisReporting': {
      component: 'CrisisReporting',
      priority: CrisisPriority.STANDARD,
      estimatedLoadTime: 1800,
      dependencies: [],
      fallbackStrategy: 'skeleton'
    }
  };

  static getInstance(): CrisisOptimizationManager {
    if (!CrisisOptimizationManager.instance) {
      CrisisOptimizationManager.instance = new CrisisOptimizationManager();
    }
    return CrisisOptimizationManager.instance;
  }

  /**
   * Initialize crisis critical path optimization
   */
  async initializeCriticalPath(): Promise<void> {
    if (this.criticalPathInitialized) return;

    console.log('[Crisis Optimization] Initializing critical path...');
    const startTime = performance.now();

    try {
      // Preload emergency components first
      await this.preloadEmergencyComponents();
      
      // Preload critical components in parallel
      await this.preloadCriticalComponents();
      
      // Schedule urgent components for background loading
      this.scheduleUrgentComponentsPreload();
      
      this.criticalPathInitialized = true;
      
      const duration = performance.now() - startTime;
      console.log(`[Crisis Optimization] Critical path initialized in ${duration.toFixed(2)}ms`);
      
      // Track performance
      if (performanceMonitor) {
        performanceMonitor.trackApiCall('crisis-critical-path-init', duration);
      }
      
    } catch (error) {
      console.error('[Crisis Optimization] Failed to initialize critical path:', error);
      
      // Fallback to basic initialization
      await this.initializeFallbackCriticalPath();
    }
  }

  /**
   * Preload emergency components immediately
   */
  private async preloadEmergencyComponents(): Promise<void> {
    const emergencyComponents = Object.entries(CrisisOptimizationManager.crisisComponents)
      .filter(([, config]) => config.priority === CrisisPriority.EMERGENCY)
      .sort((a, b) => a[1].estimatedLoadTime - b[1].estimatedLoadTime);

    const preloadPromises = emergencyComponents.map(async ([componentName, config]) => {
      try {
        const startTime = performance.now();
        
        // Dynamic import based on component name
        const componentModule = await this.loadCrisisComponent(componentName);
        
        const loadTime = performance.now() - startTime;
        console.log(`[Crisis Optimization] Preloaded ${componentName} in ${loadTime.toFixed(2)}ms`);
        
        this.preloadedComponents.add(componentName);
        
        // Track loading performance
        if (performanceMonitor) {
          performanceMonitor.trackChunkLoad(`crisis-${componentName}`, loadTime);
        }
        
        return componentModule;
      } catch (error) {
        console.error(`[Crisis Optimization] Failed to preload ${componentName}:`, error);
        throw error;
      }
    });

    await Promise.all(preloadPromises);
    this.emergencyComponentsLoaded = true;
  }

  /**
   * Preload critical components in parallel
   */
  private async preloadCriticalComponents(): Promise<void> {
    const criticalComponents = Object.entries(CrisisOptimizationManager.crisisComponents)
      .filter(([, config]) => config.priority === CrisisPriority.CRITICAL)
      .filter(([componentName]) => !this.preloadedComponents.has(componentName));

    // Load critical components in parallel with a timeout
    const preloadPromises = criticalComponents.map(([componentName]) => 
      Promise.race([
        this.loadCrisisComponent(componentName).then(() => {
          this.preloadedComponents.add(componentName);
          console.log(`[Crisis Optimization] Critical component ${componentName} preloaded`);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${componentName} preload timeout`)), 3000)
        )
      ]).catch(error => {
        console.warn(`[Crisis Optimization] Failed to preload critical component ${componentName}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Schedule urgent components for background loading
   */
  private scheduleUrgentComponentsPreload(): void {
    const urgentComponents = Object.entries(CrisisOptimizationManager.crisisComponents)
      .filter(([, config]) => config.priority === CrisisPriority.URGENT)
      .filter(([componentName]) => !this.preloadedComponents.has(componentName));

    // Use requestIdleCallback for background loading
    if ('requestIdleCallback' in window) {
      urgentComponents.forEach(([componentName], index) => {
        (window as any).requestIdleCallback(() => {
          this.loadCrisisComponent(componentName)
            .then(() => {
              this.preloadedComponents.add(componentName);
              console.log(`[Crisis Optimization] Urgent component ${componentName} loaded in background`);
            })
            .catch(error => {
              console.warn(`[Crisis Optimization] Background load failed for ${componentName}:`, error);
            });
        }, { timeout: 1000 * (index + 1) });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        urgentComponents.forEach(([componentName]) => {
          this.loadCrisisComponent(componentName).catch(() => {});
        });
      }, 2000);
    }
  }

  /**
   * Load crisis component with error handling
   */
  private async loadCrisisComponent(componentName: string): Promise<any> {
    switch (componentName) {
      case 'SafetyPlan':
        return import('@/components/crisis/SafetyPlan');
      case 'EmergencyContacts':
        return import('@/components/crisis/EmergencyContacts');
      case 'CrisisAssessment':
        return import('@/components/crisis/CrisisAssessmentTools');
      case 'CopingStrategies':
        return import('@/components/crisis/CopingStrategies');
      case 'CrisisChat':
        return import('@/components/crisis/CrisisChat');
      case 'CrisisReporting':
        return import('@/components/crisis/CrisisReporting');
      default:
        throw new Error(`Unknown crisis component: ${componentName}`);
    }
  }

  /**
   * Fallback critical path initialization
   */
  private async initializeFallbackCriticalPath(): Promise<void> {
    console.log('[Crisis Optimization] Initializing fallback critical path...');
    
    // Load only the most essential components
    try {
      await this.loadCrisisComponent('SafetyPlan');
      await this.loadCrisisComponent('EmergencyContacts');
      this.preloadedComponents.add('SafetyPlan');
      this.preloadedComponents.add('EmergencyContacts');
    } catch (error) {
      console.error('[Crisis Optimization] Fallback initialization failed:', error);
    }
  }

  /**
   * Check if component is preloaded
   */
  isComponentPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }

  /**
   * Get optimized crisis component
   */
  getOptimizedComponent<T>(
    componentName: keyof typeof CrisisOptimizationManager.crisisComponents,
    fallbackComponent?: React.ComponentType<T>
  ) {
    const config = CrisisOptimizationManager.crisisComponents[componentName];
    
    if (!config) {
      console.warn(`[Crisis Optimization] Unknown component: ${componentName}`);
      return fallbackComponent;
    }

    // If already preloaded, return immediately
    if (this.isComponentPreloaded(componentName)) {
      return CriticalPath.critical(() => this.loadCrisisComponent(componentName), {
        preload: false, // Already preloaded
        timeout: 1000,  // Short timeout since it should be cached
        retries: 1
      });
    }

    // Create optimized lazy component based on priority
    const importFn = () => this.loadCrisisComponent(componentName);
    
    switch (config.priority) {
      case CrisisPriority.EMERGENCY:
        return CriticalPath.critical(importFn, {
          preload: true,
          timeout: 2000,
          retries: 5
        });
      
      case CrisisPriority.CRITICAL:
        return CriticalPath.critical(importFn, {
          preload: true,
          timeout: 3000,
          retries: 3
        });
      
      case CrisisPriority.URGENT:
        return createLazyComponent(importFn, {
          priority: 'high',
          preload: false,
          timeout: 5000,
          retries: 2
        });
      
      case CrisisPriority.STANDARD:
      default:
        return createLazyComponent(importFn, {
          priority: 'medium',
          preload: false,
          timeout: 8000,
          retries: 1
        });
    }
  }

  /**
   * Get crisis optimization statistics
   */
  getOptimizationStats(): {
    criticalPathInitialized: boolean;
    emergencyComponentsLoaded: boolean;
    preloadedComponents: string[];
    componentConfigs: typeof CrisisOptimizationManager.crisisComponents;
  } {
    return {
      criticalPathInitialized: this.criticalPathInitialized,
      emergencyComponentsLoaded: this.emergencyComponentsLoaded,
      preloadedComponents: Array.from(this.preloadedComponents),
      componentConfigs: CrisisOptimizationManager.crisisComponents
    };
  }

  /**
   * Force reload of crisis components (for development)
   */
  async reloadCrisisComponents(): Promise<void> {
    this.preloadedComponents.clear();
    this.emergencyComponentsLoaded = false;
    this.criticalPathInitialized = false;
    
    await this.initializeCriticalPath();
  }
}

/**
 * Hook for crisis optimization context
 */
export function useCrisisOptimization() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [stats, setStats] = React.useState<any>(null);
  
  React.useEffect(() => {
    const manager = CrisisOptimizationManager.getInstance();
    
    // Initialize if not already done
    if (!manager.getOptimizationStats().criticalPathInitialized) {
      manager.initializeCriticalPath()
        .then(() => {
          setIsInitialized(true);
          setStats(manager.getOptimizationStats());
        })
        .catch(error => {
          console.error('[useCrisisOptimization] Initialization failed:', error);
        });
    } else {
      setIsInitialized(true);
      setStats(manager.getOptimizationStats());
    }
  }, []);
  
  return {
    isInitialized,
    stats,
    manager: CrisisOptimizationManager.getInstance()
  };
}

/**
 * Crisis component factory with optimization
 */
export function createOptimizedCrisisComponent<T>(
  componentName: keyof typeof CrisisOptimizationManager.crisisComponents,
  fallbackComponent?: React.ComponentType<T>
) {
  const manager = CrisisOptimizationManager.getInstance();
  return manager.getOptimizedComponent(componentName, fallbackComponent);
}

// Initialize crisis optimization on app start
if (typeof window !== 'undefined') {
  // Initialize after a short delay to not block initial render
  setTimeout(() => {
    CrisisOptimizationManager.getInstance().initializeCriticalPath();
  }, 100);
}