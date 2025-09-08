/**
 * Crisis-Specific Skeleton Loader
 * Optimized for critical loading states
 */

import React, { memo } from 'react';

interface CrisisSkeletonProps {
  variant?: 'safety-plan' | 'coping' | 'emergency' | 'default';
  className?: string;
}

const CrisisSkeleton = memo<CrisisSkeletonProps>(({ 
  variant = 'default', 
  className = '' 
}) => {
  const baseClasses = "animate-pulse bg-gradient-to-r from-red-100 to-red-200 rounded-lg";
  
  switch (variant) {
    case 'safety-plan':
      return (
        <div className={`space-y-6 ${className}`} aria-label="Loading safety plan">
          {/* Header */}
          <div className="space-y-3">
            <div className={`h-8 w-3/4 ${baseClasses}`} />
            <div className={`h-4 w-full ${baseClasses}`} />
            <div className={`h-4 w-5/6 ${baseClasses}`} />
          </div>
          
          {/* Safety steps */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full ${baseClasses} shrink-0`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-5 w-4/5 ${baseClasses}`} />
                  <div className={`h-4 w-full ${baseClasses}`} />
                  <div className={`h-4 w-3/4 ${baseClasses}`} />
                </div>
              </div>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <div className={`h-12 w-32 ${baseClasses}`} />
            <div className={`h-12 w-24 ${baseClasses}`} />
          </div>
        </div>
      );

    case 'coping':
      return (
        <div className={`space-y-4 ${className}`} aria-label="Loading coping strategies">
          <div className={`h-7 w-1/2 ${baseClasses}`} />
          
          {/* Strategy cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border border-red-200 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${baseClasses}`} />
                  <div className={`h-5 w-32 ${baseClasses}`} />
                </div>
                <div className={`h-4 w-full ${baseClasses}`} />
                <div className={`h-4 w-4/5 ${baseClasses}`} />
                <div className={`h-9 w-20 ${baseClasses}`} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'emergency':
      return (
        <div className={`space-y-6 ${className}`} aria-label="Loading emergency resources">
          {/* Critical alert */}
          <div className="p-4 border-2 border-red-300 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 ${baseClasses}`} />
              <div className={`h-6 w-48 ${baseClasses}`} />
            </div>
            <div className={`h-4 w-full ${baseClasses}`} />
            <div className={`h-10 w-40 ${baseClasses}`} />
          </div>
          
          {/* Emergency contacts */}
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${baseClasses}`} />
                  <div className="space-y-2">
                    <div className={`h-5 w-32 ${baseClasses}`} />
                    <div className={`h-4 w-24 ${baseClasses}`} />
                  </div>
                </div>
                <div className={`h-10 w-20 ${baseClasses}`} />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className={`space-y-4 ${className}`} aria-label="Loading content">
          <div className={`h-8 w-3/4 ${baseClasses}`} />
          <div className={`h-4 w-full ${baseClasses}`} />
          <div className={`h-4 w-5/6 ${baseClasses}`} />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`h-16 w-full ${baseClasses}`} />
            ))}
          </div>
        </div>
      );
  }
});

CrisisSkeleton.displayName = 'CrisisSkeleton';

export { CrisisSkeleton };