'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * ErrorBoundary - Comprehensive error handling component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */

interface ErrorBoundaryProps {
  /** Child components */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: React.ComponentType<ErrorFallbackProps>;
  /** Error callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details in development */
  showDetails?: boolean;
  /** Custom reset handler */
  onReset?: () => void;
  /** Custom message to display */
  message?: string;
  /** Whether to log errors to console */
  logErrors?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  errorCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, logErrors = true } = this.props;
    
    // Log error to console in development
    if (logErrors && process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call error callback if provided
    onError?.(error, errorInfo);

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  resetError = () => {
    const { onReset } = this.props;
    
    // Call custom reset handler if provided
    onReset?.();
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback: FallbackComponent, showDetails = process.env.NODE_ENV === 'development', message } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            errorCount={errorCount}
          />
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          errorCount={errorCount}
          showDetails={showDetails}
          message={message}
        />
      );
    }

    return children;
  }
}

// Default Error Fallback Component
const DefaultErrorFallback: React.FC<ErrorFallbackProps & { showDetails?: boolean; message?: string }> = ({
  error,
  errorInfo,
  resetError,
  errorCount,
  showDetails = false,
  message
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 px-6 py-8 sm:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {message || 'An unexpected error occurred. We apologize for the inconvenience.'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 sm:px-8">
            {/* Error message */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Error Details
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-mono">
                  {error?.message || 'Unknown error'}
                </p>
              </div>
            </div>

            {/* Show detailed error info in development */}
            {showDetails && errorInfo && (
              <div className="mb-6">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2"
                >
                  {showErrorDetails ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {showErrorDetails && (
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                      <div className="mb-2">
                        <strong>Component Stack:</strong>
                        {errorInfo.componentStack}
                      </div>
                      {error?.stack && (
                        <div>
                          <strong>Error Stack:</strong>
                          {'\n'}{error.stack}
                        </div>
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Error count indicator */}
            {errorCount > 1 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  This error has occurred {errorCount} times in this session.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetError}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <HomeIcon className="w-5 h-5 mr-2" />
                Go to Home
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error boundary hook for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
};

// HOC to wrap components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;