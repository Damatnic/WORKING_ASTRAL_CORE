/**
 * Dashboard-Specific Skeleton Loader
 * Optimized for dashboard loading states
 */

import React, { memo } from 'react';

interface DashboardSkeletonProps {
  variant?: 'stats' | 'overview' | 'activity' | 'goals' | 'full';
  className?: string;
}

const DashboardSkeleton = memo<DashboardSkeletonProps>(({ 
  variant = 'full', 
  className = '' 
}) => {
  const baseClasses = "animate-pulse bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg";
  
  switch (variant) {
    case 'stats':
      return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`} aria-label="Loading dashboard statistics">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 text-center space-y-2">
              <div className={`w-6 h-6 mx-auto ${baseClasses}`} />
              <div className={`h-8 w-12 mx-auto ${baseClasses}`} />
              <div className={`h-3 w-16 mx-auto ${baseClasses}`} />
            </div>
          ))}
        </div>
      );

    case 'overview':
      return (
        <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6 ${className}`} aria-label="Loading wellness overview">
          <div className="flex items-center justify-between">
            <div className={`h-6 w-32 ${baseClasses}`} />
            <div className={`h-8 w-20 ${baseClasses}`} />
          </div>
          
          {/* Chart area */}
          <div className={`h-64 w-full ${baseClasses}`} />
          
          {/* Chart legend */}
          <div className="flex justify-center gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${baseClasses}`} />
                <div className={`h-4 w-16 ${baseClasses}`} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'activity':
      return (
        <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6 ${className}`} aria-label="Loading recent activity">
          <div className={`h-6 w-32 ${baseClasses}`} />
          
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start p-3 rounded-lg bg-neutral-50">
                <div className={`w-3 h-3 rounded-full mt-2 mr-3 ${baseClasses}`} />
                <div className="flex-1 space-y-1">
                  <div className={`h-4 w-3/4 ${baseClasses}`} />
                  <div className={`h-3 w-full ${baseClasses}`} />
                  <div className={`h-3 w-16 ${baseClasses}`} />
                </div>
              </div>
            ))}
          </div>
          
          <div className={`h-8 w-full ${baseClasses}`} />
        </div>
      );

    case 'goals':
      return (
        <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6 ${className}`} aria-label="Loading goals progress">
          <div className="flex items-center justify-between">
            <div className={`h-6 w-28 ${baseClasses}`} />
            <div className={`h-8 w-16 ${baseClasses}`} />
          </div>
          
          {/* Progress bars */}
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className={`h-4 w-32 ${baseClasses}`} />
                  <div className={`h-4 w-12 ${baseClasses}`} />
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${baseClasses} w-${(i + 1) * 25}%`} />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3 pt-4">
            <div className={`h-10 w-24 ${baseClasses}`} />
            <div className={`h-10 w-20 ${baseClasses}`} />
          </div>
        </div>
      );

    case 'full':
      return (
        <div className={`space-y-8 ${className}`} aria-label="Loading dashboard">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-2">
              <div className={`h-8 w-64 ${baseClasses}`} />
              <div className={`h-4 w-48 ${baseClasses}`} />
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className={`h-10 w-32 ${baseClasses}`} />
              <div className={`h-10 w-24 ${baseClasses}`} />
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 text-center space-y-2">
                <div className={`w-6 h-6 mx-auto ${baseClasses}`} />
                <div className={`h-8 w-12 mx-auto ${baseClasses}`} />
                <div className={`h-3 w-16 mx-auto ${baseClasses}`} />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Quick actions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6">
                <div className={`h-6 w-32 ${baseClasses}`} />
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border-2 border-neutral-100 space-y-3">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg mr-3 ${baseClasses}`} />
                        <div className={`h-5 w-32 ${baseClasses}`} />
                      </div>
                      <div className={`h-4 w-full ${baseClasses}`} />
                      <div className="flex items-center">
                        <div className={`h-4 w-24 ${baseClasses}`} />
                        <div className={`w-4 h-4 ml-1 ${baseClasses}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6">
                <div className={`h-6 w-28 ${baseClasses}`} />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start p-3 rounded-lg bg-neutral-50">
                      <div className={`w-3 h-3 rounded-full mt-2 mr-3 ${baseClasses}`} />
                      <div className="flex-1 space-y-1">
                        <div className={`h-4 w-3/4 ${baseClasses}`} />
                        <div className={`h-3 w-full ${baseClasses}`} />
                        <div className={`h-3 w-16 ${baseClasses}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`h-8 w-full ${baseClasses}`} />
              </div>
            </div>
          </div>

          {/* Bottom widgets */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className={`h-6 w-32 ${baseClasses}`} />
                <div className={`h-4 w-20 ${baseClasses}`} />
              </div>
              <div className={`h-64 w-full ${baseClasses}`} />
            </div>
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className={`h-6 w-28 ${baseClasses}`} />
                <div className={`h-4 w-16 ${baseClasses}`} />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className={`h-4 w-32 ${baseClasses}`} />
                      <div className={`h-4 w-12 ${baseClasses}`} />
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${baseClasses} w-${(i + 1) * 20}%`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
});

DashboardSkeleton.displayName = 'DashboardSkeleton';

export { DashboardSkeleton };