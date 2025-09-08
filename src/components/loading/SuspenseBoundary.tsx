/**
 * Enhanced Suspense Boundary Component
 * Provides sophisticated error handling, retry logic, and accessibility features for code splitting
 */

import React, { Suspense, ComponentType, ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner, CrisisLoader, WellnessLoader } from './LoadingSpinner';
import { ProgressiveLoader, LoadingPresets } from './ProgressiveLoader';
import { performanceMonitor } from '@/lib/performance/monitoring';

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * Suspense boundary props
 */
interface SuspenseBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  isolate?: boolean;
  critical?: boolean;
  loadingType?: 'default' | 'crisis' | 'wellness' | 'progressive' | 'minimal';
  loadingMessage?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Error fallback component props
 */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retryCount: number;
  maxRetries: number;
  critical?: boolean;
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ 
  error, 
  resetError, 
  retryCount, 
  maxRetries,
  critical = false 
}: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries;
  
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center p-8 space-y-4 rounded-lg border',
        critical 
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className={cn('p-3 rounded-full', critical ? 'bg-red-100' : 'bg-gray-100')}>
        <svg 
          className={cn('h-8 w-8', critical ? 'text-red-600' : 'text-gray-600')} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className={cn(
          'text-lg font-semibold',
          critical ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-gray-100'
        )}>
          {critical ? 'Critical Component Failed' : 'Component Failed to Load'}
        </h3>
        
        <p className={cn(
          'text-sm max-w-md',
          critical ? 'text-red-700 dark:text-red-200' : 'text-gray-600 dark:text-gray-300'
        )}>
          {critical 
            ? 'A critical component failed to load. This may affect essential functionality.'
            : 'This component could not be loaded. You can try refreshing the page.'
          }
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mt-4">
            <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
      
      <div className="flex space-x-3">
        {canRetry && (
          <button
            onClick={resetError}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
              critical
                ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            )}
          >
            Try Again {retryCount > 0 && `(${maxRetries - retryCount} left)`}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Refresh Page
        </button>
      </div>
      
      {retryCount >= maxRetries && (
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Maximum retry attempts reached. Please refresh the page or contact support.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Error Boundary Component
 */
class ErrorBoundaryClass extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ComponentType<ErrorFallbackProps>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onRetry?: () => void;
    maxRetries: number;
    retryDelay: number;
    critical?: boolean;
  },
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to performance monitor
    if (performanceMonitor) {
      console.error('Component error caught by boundary:', error, errorInfo);
    }

    // Call onError callback
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          critical: this.props.critical,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  resetError = () => {
    const { retryDelay, maxRetries } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.props.onRetry?.();

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Set new retry timeout with exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount);
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }, delay);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries}
          critical={this.props.critical}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Get loading component based on type
 */
function getLoadingComponent(
  type: SuspenseBoundaryProps['loadingType'],
  message?: string,
  className?: string
): React.ReactNode {
  switch (type) {
    case 'crisis':
      return <CrisisLoader message={message} />;
    case 'wellness':
      return <WellnessLoader message={message} />;
    case 'progressive':
      return <LoadingPresets.Dashboard className={className} />;
    case 'minimal':
      return <LoadingPresets.Minimal message={message} />;
    default:
      return (
        <div className={cn('flex items-center justify-center p-8', className)}>
          <LoadingSpinner size="lg" showLabel label={message} />
        </div>
      );
  }
}

/**
 * Main Suspense Boundary Component
 */
export function SuspenseBoundary({
  children,
  fallback,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  onError,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  isolate = true,
  critical = false,
  loadingType = 'default',
  loadingMessage = 'Loading...',
  className,
  'data-testid': testId = 'suspense-boundary',
}: SuspenseBoundaryProps) {
  // Create loading fallback
  const loadingFallback = React.useMemo(() => {
    if (fallback) return fallback;
    return getLoadingComponent(loadingType, loadingMessage, className);
  }, [fallback, loadingType, loadingMessage, className]);

  // Wrap in error boundary if isolation is enabled
  const content = (
    <Suspense fallback={loadingFallback}>
      {children}
    </Suspense>
  );

  if (isolate) {
    return (
      <div data-testid={testId} className={className}>
        <ErrorBoundaryClass
          fallback={ErrorFallback}
          onError={onError}
          onRetry={onRetry}
          maxRetries={maxRetries}
          retryDelay={retryDelay}
          critical={critical}
        >
          {content}
        </ErrorBoundaryClass>
      </div>
    );
  }

  return (
    <div data-testid={testId} className={className}>
      {content}
    </div>
  );
}

/**
 * Higher-order component for wrapping components with Suspense boundary
 */
export function withSuspenseBoundary<P extends object>(
  Component: ComponentType<P>,
  options: Omit<SuspenseBoundaryProps, 'children'> = {}
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <SuspenseBoundary {...options}>
      <Component {...props} ref={ref} />
    </SuspenseBoundary>
  ));

  WrappedComponent.displayName = `withSuspenseBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Critical component boundary for essential features
 */
export function CriticalBoundary({
  children,
  componentName,
  ...props
}: Omit<SuspenseBoundaryProps, 'critical'> & {
  componentName?: string;
}) {
  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    console.error(`Critical component failure: ${componentName}`, error, errorInfo);
    
    // Report critical errors immediately
    if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
      const errorData = JSON.stringify({
        type: 'critical_component_error',
        component: componentName,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
      
      navigator.sendBeacon('/api/errors/critical', errorData);
    }
    
    props.onError?.(error, errorInfo);
  }, [componentName, props]);

  return (
    <SuspenseBoundary
      {...props}
      critical
      loadingType="crisis"
      loadingMessage={`Loading ${componentName || 'critical component'}...`}
      maxRetries={5}
      onError={handleError}
    >
      {children}
    </SuspenseBoundary>
  );
}

/**
 * Lazy component boundary for non-critical features
 */
export function LazyBoundary({
  children,
  ...props
}: Omit<SuspenseBoundaryProps, 'critical'>) {
  return (
    <SuspenseBoundary
      {...props}
      critical={false}
      loadingType="minimal"
      maxRetries={2}
      retryDelay={2000}
    >
      {children}
    </SuspenseBoundary>
  );
}

/**
 * Route-level boundary for page components
 */
export function RouteBoundary({
  children,
  routeName,
  ...props
}: Omit<SuspenseBoundaryProps, 'isolate'> & {
  routeName?: string;
}) {
  const loadingType = React.useMemo(() => {
    if (routeName?.includes('crisis')) return 'crisis';
    if (routeName?.includes('wellness') || routeName?.includes('mood')) return 'wellness';
    if (routeName?.includes('dashboard')) return 'progressive';
    return 'default';
  }, [routeName]);

  return (
    <SuspenseBoundary
      {...props}
      isolate
      loadingType={loadingType}
      loadingMessage={`Loading ${routeName || 'page'}...`}
      className="min-h-[400px]"
    >
      {children}
    </SuspenseBoundary>
  );
}

/**
 * Development boundary with enhanced error information
 */
export function DevBoundary({ children, ...props }: SuspenseBoundaryProps) {
  if (process.env.NODE_ENV !== 'development') {
    return <SuspenseBoundary {...props}>{children}</SuspenseBoundary>;
  }

  const DevErrorFallback: React.ComponentType<ErrorFallbackProps> = ({ 
    error, 
    resetError, 
    retryCount, 
    maxRetries 
  }) => (
    <div className="p-6 border-2 border-red-400 rounded-lg bg-red-50 dark:bg-red-900/20 space-y-4">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-red-100 rounded-full">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-900">Development Error</h3>
      </div>
      
      <div className="space-y-2">
        <p className="text-red-800 font-medium">{error.message}</p>
        <details className="text-sm">
          <summary className="cursor-pointer text-red-700 hover:text-red-800">Stack Trace</summary>
          <pre className="mt-2 p-3 bg-red-100 rounded overflow-auto text-xs">
            {error.stack}
          </pre>
        </details>
      </div>
      
      <div className="flex space-x-2">
        {retryCount < maxRetries && (
          <button
            onClick={resetError}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry ({maxRetries - retryCount} left)
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 border border-red-600 text-red-600 rounded text-sm hover:bg-red-50"
        >
          Reload
        </button>
      </div>
    </div>
  );

  return (
    <SuspenseBoundary
      {...props}
      errorFallback={DevErrorFallback}
      maxRetries={1}
    >
      {children}
    </SuspenseBoundary>
  );
}

/**
 * Hook for handling component loading states
 */
export function useLoadingBoundary() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    setIsLoading(false);
  }, []);

  const reset = React.useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    handleError,
    reset,
  };
}