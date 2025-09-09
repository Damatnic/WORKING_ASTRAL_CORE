/**
 * Loading Exports - Working Components for Build Success
 */

import React from 'react';

// Re-export components from actual implementations  
export { LoadingSpinner } from './LoadingSpinner';
export { CrisisLoader } from './CrisisLoader';
export { CrisisSkeleton, MoodTrackerSkeleton } from './SkeletonLoaders';
export { DashboardSkeleton } from './DashboardSkeleton';
export { WellnessLoader } from './WellnessLoader';

// Additional loading components
export const ProgressBar = ({ progress = 0, className = '' }: { progress?: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
    />
  </div>
);

export const SkeletonLoader = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

export const ProgressiveLoader = ({ stages = [], currentStage = 0 }: { stages?: string[]; currentStage?: number }) => (
  <div className="flex flex-col items-center space-y-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    {stages.length > 0 && (
      <p className="text-sm text-gray-600">
        {stages[Math.min(currentStage, stages.length - 1)] || 'Loading...'}
      </p>
    )}
  </div>
);

export const LoadingOverlay = ({ show = true, message = 'Loading...' }: { show?: boolean; message?: string }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        <span className="text-gray-800">{message}</span>
      </div>
    </div>
  );
};

export const PulseLoader = ({ count = 3, size = 'md' }: { count?: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = { sm: 'h-2 w-2', md: 'h-3 w-3', lg: 'h-4 w-4' };
  return (
    <div className="flex space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
};

export const SpinnerDots = ({ color = 'blue', size = 'md' }: { color?: string; size?: 'sm' | 'md' | 'lg' }) => (
  <div className="flex space-x-1">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className={`w-${size === 'sm' ? '2' : size === 'lg' ? '4' : '3'} h-${size === 'sm' ? '2' : size === 'lg' ? '4' : '3'} bg-${color}-600 rounded-full animate-bounce`}
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
);

export const WaveLoader = ({ height = '40', width = '40' }: { height?: string; width?: string }) => (
  <svg width={width} height={height} viewBox="0 0 40 40" className="animate-pulse">
    <path d="M20 5 Q20 5 20 35 Q20 35 20 5" stroke="#3B82F6" strokeWidth="2" fill="none" className="animate-bounce" />
    <path d="M10 10 Q10 10 10 30 Q10 30 10 10" stroke="#3B82F6" strokeWidth="2" fill="none" className="animate-bounce" style={{ animationDelay: '0.1s' }} />
    <path d="M30 10 Q30 10 30 30 Q30 30 30 10" stroke="#3B82F6" strokeWidth="2" fill="none" className="animate-bounce" style={{ animationDelay: '0.2s' }} />
  </svg>
);


// Loading presets for different sections
export const LoadingPresets = {
  default: ({ message = 'Loading...' }: { message?: string } = {}) => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
      <span className="text-gray-600">{message}</span>
    </div>
  ),
  
  Minimal: ({ message = 'Loading...' }: { message?: string } = {}) => (
    <div className="flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3" />
      <span className="text-gray-700 text-sm">{message}</span>
    </div>
  ),
  
  dashboard: ({ message = 'Loading dashboard...' }: { message?: string } = {}) => (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="text-blue-700 font-medium">{message}</p>
    </div>
  ),
  
  wellness: ({ message = 'Loading wellness tools...' }: { message?: string } = {}) => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-green-200 rounded-full animate-spin border-t-green-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-green-100 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="text-green-700 font-medium">{message}</p>
    </div>
  ),
  
  crisis: ({ message = 'Loading crisis resources...' }: { message?: string } = {}) => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-red-200 rounded-full animate-spin border-t-red-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-red-100 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="text-red-700 font-medium">{message}</p>
      <p className="text-red-600 text-sm text-center max-w-xs">Critical resources loading with priority</p>
    </div>
  ),
};

// Types
export type LoadingSpinnerProps = any;
export type ProgressBarProps = any;
export type SkeletonLoaderProps = any;
export type ProgressiveLoaderProps = any;
export type LoadingOverlayProps = any;
export type PulseLoaderProps = any;
export type SpinnerDotsProps = any;
export type WaveLoaderProps = any;

// Named default export object
const LoadingExports = {
  LoadingSpinner,
  ProgressBar,
  SkeletonLoader,
  ProgressiveLoader,
  LoadingOverlay,
  PulseLoader,
  SpinnerDots,
  WaveLoader,
  LoadingPresets,
};

export default LoadingExports;