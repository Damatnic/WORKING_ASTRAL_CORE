/**
 * Lazy Component Boundary with Performance Tracking
 * Provides error handling and performance monitoring for dynamically loaded components
 */

import React, { Component, ReactNode, Suspense } from 'react';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { PerformanceLoader } from './PerformanceLoader';
import { CriticalBoundary } from './CriticalBoundary';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  loadingMessage?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  estimatedLoadTime?: number;
  onLoadStart?: () => void;
  onLoadComplete?: (duration: number) => void;
  onLoadError?: (error: Error) => void;
}

interface State {
  isLoading: boolean;
  loadStartTime: number | null;
  hasInteracted: boolean;
}

export class LazyComponentBoundary extends Component<Props, State> {
  private intersectionObserver: IntersectionObserver | null = null;
  private elementRef = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this.state = {
      isLoading: false,
      loadStartTime: null,
      hasInteracted: false
    };
  }

  componentDidMount() {
    // Set up intersection observer for viewport-based loading
    if (this.props.priority === 'low' && 'IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.state.hasInteracted) {
              this.startLoading();
            }
          });
        },
        { rootMargin: '50px' }
      );

      if (this.elementRef.current) {
        this.intersectionObserver.observe(this.elementRef.current);
      }
    } else {
      // Start loading immediately for critical/high priority components
      this.startLoading();
    }
  }

  componentWillUnmount() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private startLoading = () => {
    if (this.state.isLoading) return;

    this.setState({
      isLoading: true,
      loadStartTime: performance.now(),
      hasInteracted: true
    });

    this.props.onLoadStart?.();

    // Track component load start
    if (performanceMonitor) {
      performanceMonitor.trackSuspenseFallback(this.props.componentName, 0);
    }
  };

  private handleLoadComplete = () => {
    if (this.state.loadStartTime) {
      const duration = performance.now() - this.state.loadStartTime;
      
      // Track component load completion
      if (performanceMonitor) {
        performanceMonitor.trackComponentRender(this.props.componentName, duration);
      }
      
      this.props.onLoadComplete?.(duration);
    }

    this.setState({
      isLoading: false,
      loadStartTime: null
    });
  };

  private handleLoadError = (error: Error) => {
    this.setState({
      isLoading: false,
      loadStartTime: null
    });

    this.props.onLoadError?.(error);
  };

  render() {
    const {
      children,
      componentName,
      fallback,
      loadingMessage = `Loading ${componentName}...`,
      priority = 'medium',
      estimatedLoadTime = 2000
    } = this.props;

    // If not yet interacted with for low priority, show placeholder
    if (priority === 'low' && !this.state.hasInteracted) {
      return (
        <div
          ref={this.elementRef}
          className="min-h-[100px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
          role="button"
          tabIndex={0}
          onClick={this.startLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.startLoading();
            }
          }}
          aria-label={`Load ${componentName} component`}
        >
          <div className="text-center text-gray-600">
            <p className="text-sm font-medium">Load {componentName}</p>
            <p className="text-xs mt-1">Click or scroll to load</p>
          </div>
        </div>
      );
    }

    const defaultFallback = fallback || (
      <PerformanceLoader
        message={loadingMessage}
        estimatedLoadTime={estimatedLoadTime}
        showOptimizations={priority === 'critical'}
      />
    );

    return (
      <CriticalBoundary
        componentName={componentName}
        enableRetry={priority === 'critical'}
        maxRetries={priority === 'critical' ? 5 : 3}
        onError={this.handleLoadError}
      >
        <Suspense fallback={defaultFallback}>
          <LoadCompleteWrapper
            onLoadComplete={this.handleLoadComplete}
            componentName={componentName}
          >
            {children}
          </LoadCompleteWrapper>
        </Suspense>
      </CriticalBoundary>
    );
  }
}

/**
 * Wrapper component to detect when lazy component has loaded
 */
interface LoadCompleteWrapperProps {
  children: ReactNode;
  componentName: string;
  onLoadComplete: () => void;
}

class LoadCompleteWrapper extends Component<LoadCompleteWrapperProps> {
  componentDidMount() {
    // Component has successfully loaded
    this.props.onLoadComplete();
  }

  render() {
    return this.props.children;
  }
}