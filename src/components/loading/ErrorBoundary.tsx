/**
 * Enhanced Error Boundary for Failed Chunks and Component Errors
 * Provides comprehensive error handling with retry logic, reporting, and accessibility
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { performanceMonitor } from '@/lib/performance/monitoring';

/**
 * Error types for different failure scenarios
 */
export type ErrorType = 
  | 'chunk_load_error' 
  | 'component_error' 
  | 'network_error' 
  | 'timeout_error'
  | 'critical_error'
  | 'unknown_error';

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  retryCount: number;
  lastRetryTime: number;
  errorId: string;
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorType: ErrorType) => void;
  onRetry?: () => void;
  isolate?: boolean;
  critical?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  showReportButton?: boolean;
  reportToService?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  errorId: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  critical?: boolean;
  showReportButton?: boolean;
}

/**
 * Component type for error fallback
 */
type ComponentType<P = Record<string, unknown>> = React.ComponentType<P>;

/**
 * Detect error type from error message and context
 */
function detectErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('loading chunk') || message.includes('failed to import')) {
    return 'chunk_load_error';
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network_error';
  }
  
  if (message.includes('timeout')) {
    return 'timeout_error';
  }
  
  if (message.includes('critical') || error.name === 'CriticalError') {
    return 'critical_error';
  }
  
  return 'component_error';
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default Error Fallback Component
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  errorType,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onReport,
  onDismiss,
  critical = false,
  showReportButton = false,
}: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries;
  const isChunkError = errorType === 'chunk_load_error';
  
  // Error type specific messages
  const getErrorMessage = () => {
    switch (errorType) {
      case 'chunk_load_error':
        return {
          title: 'Failed to Load Component',
          description: 'A part of the application failed to load. This is usually due to a network issue or an updated version being deployed.',
          suggestion: 'Try refreshing the page or check your internet connection.',
        };
      case 'network_error':
        return {
          title: 'Network Error',
          description: 'Unable to connect to our servers. Please check your internet connection.',
          suggestion: 'Verify your connection and try again.',
        };
      case 'timeout_error':
        return {
          title: 'Request Timeout',
          description: 'The request took too long to complete.',
          suggestion: 'Try again or refresh the page.',
        };
      case 'critical_error':
        return {
          title: 'Critical System Error',
          description: 'A critical component has failed. This may affect the functionality of the application.',
          suggestion: 'Please refresh the page. If the problem persists, contact support.',
        };
      default:
        return {
          title: 'Something went wrong',
          description: 'An unexpected error occurred in the application.',
          suggestion: 'Try refreshing the page or contact support if the problem persists.',
        };
    }
  };

  const { title, description, suggestion } = getErrorMessage();
  
  return (
    <div 
      className={cn(
        'rounded-lg border p-6 space-y-4 max-w-2xl mx-auto',
        critical || errorType === 'critical_error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : isChunkError
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Error Icon and Title */}
      <div className="flex items-start space-x-3">
        <div className={cn(
          'flex-shrink-0 p-2 rounded-full',
          critical || errorType === 'critical_error'
            ? 'bg-red-100 dark:bg-red-900/50'
            : isChunkError
              ? 'bg-blue-100 dark:bg-blue-900/50'
              : 'bg-gray-100 dark:bg-gray-700'
        )}>
          <svg 
            className={cn(
              'h-6 w-6',
              critical || errorType === 'critical_error'
                ? 'text-red-600 dark:text-red-400'
                : isChunkError
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
            )} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isChunkError ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        
        <div className="flex-1 space-y-2">
          <h3 className={cn(
            'text-lg font-semibold',
            critical || errorType === 'critical_error'
              ? 'text-red-900 dark:text-red-100'
              : isChunkError
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-900 dark:text-gray-100'
          )}>
            {title}
          </h3>
          
          <div className="space-y-2">
            <p className={cn(
              'text-sm',
              critical || errorType === 'critical_error'
                ? 'text-red-700 dark:text-red-200'
                : isChunkError
                  ? 'text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300'
            )}>
              {description}
            </p>
            
            <p className={cn(
              'text-xs',
              critical || errorType === 'critical_error'
                ? 'text-red-600 dark:text-red-300'
                : isChunkError
                  ? 'text-blue-600 dark:text-blue-300'
                  : 'text-gray-500 dark:text-gray-400'
            )}>
              {suggestion}
            </p>
          </div>
        </div>
      </div>

      {/* Error Details (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Error Details (Development)
          </summary>
          <div className="mt-2 space-y-2">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs space-y-1">
              <div><strong>Error ID:</strong> {errorId}</div>
              <div><strong>Error Type:</strong> {errorType}</div>
              <div><strong>Message:</strong> {error.message}</div>
              {retryCount > 0 && <div><strong>Retry Count:</strong> {retryCount}</div>}
            </div>
            
            {error.stack && (
              <details>
                <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">Stack Trace</summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
            
            {errorInfo?.componentStack && (
              <details>
                <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">Component Stack</summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </details>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {canRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'px-4 py-2 rounded-md font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
              critical || errorType === 'critical_error'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : isChunkError
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
            )}
          >
            Try Again {retryCount > 0 && `(${maxRetries - retryCount} attempts left)`}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Refresh Page
        </button>
        
        {showReportButton && onReport && (
          <button
            onClick={onReport}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Report Issue
          </button>
        )}
        
        {onDismiss && !critical && errorType !== 'critical_error' && (
          <button
            onClick={onDismiss}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
      
      {/* Retry exhausted message */}
      {retryCount >= maxRetries && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Maximum retry attempts reached. Please refresh the page or contact support if the problem continues.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Error Boundary Class Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown_error',
      retryCount: 0,
      lastRetryTime: 0,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: detectErrorType(error),
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorType = detectErrorType(error);
    
    // Update state with error info
    this.setState({ errorInfo, errorType });
    
    // Log to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track error in performance monitor
    if (performanceMonitor) {
      performanceMonitor.trackApiCall('error-boundary', Date.now());
    }
    
    // Call onError callback
    this.props.onError?.(error, errorInfo, errorType);
    
    // Report to service if enabled
    if (this.props.reportToService && process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorType);
    }
    
    // Auto-retry for certain error types
    if (this.props.autoRetry && this.shouldAutoRetry(errorType) && this.state.retryCount === 0) {
      setTimeout(() => this.handleRetry(), this.props.retryDelay || 1000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  shouldAutoRetry = (errorType: ErrorType): boolean => {
    return ['chunk_load_error', 'network_error', 'timeout_error'].includes(errorType);
  };

  reportError = async (error: Error, errorInfo: ErrorInfo, errorType: ErrorType) => {
    try {
      const reportData = {
        errorId: this.state.errorId,
        type: errorType,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: Date.now(),
        critical: this.props.critical,
        retryCount: this.state.retryCount,
      };

      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  handleRetry = () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.props.onRetry?.();

    // Clear existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Calculate exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount);
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        lastRetryTime: Date.now(),
      });
    }, delay);
  };

  handleReport = () => {
    if (this.state.error && this.state.errorInfo) {
      this.reportError(this.state.error, this.state.errorInfo, this.state.errorType);
    }
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { 
      children, 
      fallback: FallbackComponent = DefaultErrorFallback, 
      className,
      'data-testid': testId = 'error-boundary',
      maxRetries = 3,
      showReportButton = false,
      critical = false,
    } = this.props;
    
    const { hasError, error, errorInfo, errorType, retryCount, errorId } = this.state;

    if (hasError && error) {
      const fallbackProps: ErrorFallbackProps = {
        error,
        errorInfo,
        errorType,
        errorId,
        retryCount,
        maxRetries,
        onRetry: this.handleRetry,
        onReport: showReportButton ? this.handleReport : undefined,
        onDismiss: !critical ? this.handleDismiss : undefined,
        critical,
        showReportButton,
      };

      return (
        <div className={cn('error-boundary-container', className)} data-testid={testId}>
          <FallbackComponent {...fallbackProps} />
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook for programmatic error boundary usage
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const captureError = React.useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
  }, []);

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  return { captureError, reset };
}

/**
 * Higher-order component wrapper
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Specialized error boundaries for different contexts
 */

// Critical error boundary for essential features
export function CriticalErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'critical'>) {
  return (
    <ErrorBoundary
      {...props}
      critical
      maxRetries={5}
      autoRetry
      reportToService
      showReportButton
    >
      {children}
    </ErrorBoundary>
  );
}

// Chunk error boundary for dynamic imports
export function ChunkErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  const handleChunkError = React.useCallback((error: Error, errorInfo: ErrorInfo, errorType: ErrorType) => {
    if (errorType === 'chunk_load_error') {
      console.warn('Chunk loading failed, will retry:', error.message);
    }
    props.onError?.(error, errorInfo, errorType);
  }, [props]);

  return (
    <ErrorBoundary
      {...props}
      onError={handleChunkError}
      maxRetries={3}
      autoRetry
      retryDelay={500}
    >
      {children}
    </ErrorBoundary>
  );
}

// Development error boundary with detailed information
export function DevErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  if (process.env.NODE_ENV !== 'development') {
    return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary
      {...props}
      maxRetries={1}
      showReportButton={false}
      className="dev-error-boundary"
    >
      {children}
    </ErrorBoundary>
  );
}