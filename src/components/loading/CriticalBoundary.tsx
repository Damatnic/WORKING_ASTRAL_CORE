/**
 * Critical Error Boundary for Performance-Sensitive Components
 * Provides fast error recovery and performance monitoring
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { AlertTriangle, RefreshCw } from '@/lib/performance/tree-shaking-optimization';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class CriticalBoundary extends Component<Props, State> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[CriticalBoundary] Error in ${this.props.componentName}:`, error, errorInfo);

    // Track error for performance monitoring
    if (performanceMonitor) {
      performanceMonitor.trackErrorBoundary(this.props.componentName, error.name);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Auto-retry for critical components
    if (this.props.enableRetry && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff
    
    this.retryTimer = setTimeout(() => {
      this.retry();
    }, delay);
  };

  private retry = () => {
    console.log(`[CriticalBoundary] Retrying ${this.props.componentName} (attempt ${this.state.retryCount + 1})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleManualRetry = () => {
    this.retry();
  };

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Component Error
          </h3>
          <p className="text-red-700 text-center mb-4 max-w-md">
            The {this.props.componentName} component encountered an error and couldn't load properly.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-4 bg-red-100 rounded border border-red-300 text-sm text-red-800 max-w-2xl">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={this.handleManualRetry}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              aria-label={`Retry loading ${this.props.componentName}`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {this.state.retryCount > 0 && (
            <p className="text-red-600 text-sm mt-3">
              Retry attempts: {this.state.retryCount} / {this.props.maxRetries || 3}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}