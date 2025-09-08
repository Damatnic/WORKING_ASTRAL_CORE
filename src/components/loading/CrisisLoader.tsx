/**
 * Crisis-Priority Loader Component
 * Provides immediate visual feedback for critical loading states
 */

import React, { memo } from 'react';
import { Shield } from '@/lib/performance/tree-shaking-optimization';

interface CrisisLoaderProps {
  message?: string;
  priority?: 'emergency' | 'high' | 'medium';
  showProgress?: boolean;
  className?: string;
}

const CrisisLoader = memo<CrisisLoaderProps>(({ 
  message = "Loading crisis resources...",
  priority = 'high',
  showProgress = false,
  className = ''
}) => {
  const getPriorityColors = () => {
    switch (priority) {
      case 'emergency':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          spinner: 'border-red-600'
        };
      case 'high':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: 'text-amber-600',
          spinner: 'border-amber-600'
        };
      case 'medium':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          spinner: 'border-blue-600'
        };
    }
  };

  const colors = getPriorityColors();

  return (
    <div 
      className={`min-h-[200px] flex flex-col items-center justify-center p-8 ${colors.bg} border ${colors.border} rounded-lg ${className}`}
      role="status"
      aria-live={priority === 'emergency' ? 'assertive' : 'polite'}
      aria-label={message}
    >
      {/* Priority indicator */}
      <div className="relative mb-4">
        <Shield className={`w-12 h-12 ${colors.icon}`} />
        
        {/* Animated spinner overlay */}
        <div className={`absolute inset-0 w-12 h-12 border-2 border-transparent ${colors.spinner} border-t-current rounded-full animate-spin`} />
      </div>

      {/* Loading message */}
      <h3 className={`text-lg font-semibold ${colors.text} mb-2 text-center`}>
        {message}
      </h3>

      {/* Priority-specific subtext */}
      {priority === 'emergency' && (
        <p className="text-red-700 text-sm text-center mb-4">
          Emergency resources are loading with highest priority
        </p>
      )}

      {priority === 'high' && (
        <p className="text-amber-700 text-sm text-center mb-4">
          Critical resources are being prepared
        </p>
      )}

      {/* Progress indicator */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="bg-white bg-opacity-50 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${colors.spinner.replace('border-', 'bg-')} animate-pulse`}
              style={{
                width: '60%',
                animation: 'progress 2s ease-in-out infinite'
              }}
            />
          </div>
        </div>
      )}

      {/* Accessibility enhancements */}
      <div className="sr-only">
        Loading critical mental health resources. Please wait while we prepare your support tools.
      </div>

      <style jsx>{`
        @keyframes progress {
          0%, 100% { width: 30%; opacity: 0.6; }
          50% { width: 80%; opacity: 1; }
        }
      `}</style>
    </div>
  );
});

CrisisLoader.displayName = 'CrisisLoader';

export { CrisisLoader };