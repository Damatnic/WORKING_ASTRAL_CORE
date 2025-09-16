'use client';

import React from 'react';
import { LoadingSpinner } from './loading/LoadingSpinner';

// Export LoadingPresets from the proper location
export { LoadingPresets } from './loading/exports';

// Export loading components
export { LoadingSpinner, CrisisLoader, WellnessLoader } from './loading/LoadingSpinner';
export { CrisisSkeleton } from './loading/CrisisSkeleton';
export { MoodTrackerSkeleton } from './loading/SkeletonLoaders';

/**
 * Error boundary for critical components
 */
interface CriticalBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface CriticalBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class CriticalBoundary extends React.Component<CriticalBoundaryProps, CriticalBoundaryState> {
  constructor(props: CriticalBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CriticalBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Critical boundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 text-sm">
            We encountered an error loading this component. Please refresh the page or try again later.
          </p>
          {this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-700 text-sm font-medium">
                Error details
              </summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Dashboard skeleton loader
 */
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generic page skeleton
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card skeleton
 */
export function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * List skeleton
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading state component
 */
export function LoadingState({ 
  message = "Loading...", 
  fullScreen = false 
}: { 
  message?: string; 
  fullScreen?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen' : 'min-h-[400px]'}`}>
      <LoadingSpinner size="lg" showLabel label={message} />
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({ 
  message = "An error occurred", 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="text-red-600 mb-4">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
      <p className="text-gray-600 text-center mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({ 
  message = "No data available", 
  action 
}: { 
  message?: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="text-gray-400 mb-4">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-600 text-center mb-4">{message}</p>
      {action}
    </div>
  );
}