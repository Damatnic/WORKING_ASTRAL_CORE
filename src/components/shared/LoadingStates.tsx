'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * LoadingStates - Comprehensive loading components for consistent loading UI
 * Provides spinners, skeletons, and progress indicators
 */

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  /** Loading text */
  text?: string;
  /** Whether to show as overlay */
  overlay?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface SkeletonProps {
  /** Type of skeleton */
  type?: 'text' | 'title' | 'avatar' | 'thumbnail' | 'card' | 'table';
  /** Number of lines for text skeleton */
  lines?: number;
  /** Width of skeleton */
  width?: string;
  /** Height of skeleton */
  height?: string;
  /** Whether to animate */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether to show percentage text */
  showPercent?: boolean;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional label */
  label?: string;
  /** Whether to animate */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const colorClasses = {
  primary: 'border-blue-600',
  secondary: 'border-gray-600',
  success: 'border-green-600',
  danger: 'border-red-600',
  warning: 'border-yellow-600'
};

const progressColorClasses = {
  primary: 'bg-blue-600',
  secondary: 'bg-gray-600',
  success: 'bg-green-600',
  danger: 'bg-red-600',
  warning: 'bg-yellow-600'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`
          animate-spin rounded-full border-b-2
          ${sizeClasses[size]}
          ${colorClasses[color]}
          ${className}
        `}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="mt-3 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50"
      >
        {spinner}
      </motion.div>
    );
  }

  return spinner;
};

export const Skeleton: React.FC<SkeletonProps> = ({
  type = 'text',
  lines = 1,
  width,
  height,
  animate = true,
  className = ''
}) => {
  const animationClass = animate ? 'animate-pulse' : '';

  switch (type) {
    case 'text':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-gray-200 rounded ${animationClass}`}
              style={{ width: width || (i === lines - 1 ? '80%' : '100%') }}
            />
          ))}
        </div>
      );

    case 'title':
      return (
        <div className={`h-8 bg-gray-200 rounded ${animationClass} ${className}`} 
             style={{ width: width || '50%' }} />
      );

    case 'avatar':
      return (
        <div className={`w-12 h-12 bg-gray-200 rounded-full ${animationClass} ${className}`} />
      );

    case 'thumbnail':
      return (
        <div 
          className={`bg-gray-200 rounded-lg ${animationClass} ${className}`}
          style={{ width: width || '100px', height: height || '100px' }}
        />
      );

    case 'card':
      return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
          <div className={`space-y-4 ${animationClass}`}>
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
            <div className="flex justify-between pt-4">
              <div className="h-8 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </div>
      );

    case 'table':
      return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
          <div className={`${animationClass}`}>
            {/* Header */}
            <div className="bg-gray-100 px-6 py-4 border-b">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            {/* Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div 
          className={`bg-gray-200 rounded ${animationClass} ${className}`}
          style={{ width: width || '100%', height: height || '20px' }}
        />
      );
  }
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showPercent = false,
  color = 'primary',
  size = 'md',
  label,
  animate = true,
  className = ''
}) => {
  const sizeHeights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercent && (
            <span className="text-sm font-medium text-gray-600">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeHeights[size]}`}>
        <motion.div
          initial={animate ? { width: 0 } : { width: `${clampedProgress}%` }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className={`h-full rounded-full transition-all ${progressColorClasses[color]}`}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// Composite loading states
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} type="card" />
    ))}
  </div>
);

export const TableSkeleton: React.FC = () => (
  <Skeleton type="table" />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} type="card" />
      ))}
    </div>
    {/* Table */}
    <Skeleton type="table" />
  </div>
);

const LoadingComponents = {
  LoadingSpinner,
  Skeleton,
  ProgressBar,
  CardSkeleton,
  TableSkeleton,
  DashboardSkeleton
};

export default LoadingComponents;