/**
 * Skeleton Loaders for Different UI Patterns
 * Provides accessible loading states that match the actual content structure
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base skeleton component with animation
 */
interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export function Skeleton({ className, children, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200 dark:bg-slate-700',
        className
      )}
      role="status"
      aria-label="Loading content"
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Dashboard skeleton for main dashboard page
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6" role="status" aria-label="Loading dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-[300px] w-full" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Crisis page skeleton with priority loading indication
 */
export function CrisisSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" role="status" aria-label="Loading crisis support">
      {/* Emergency Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border-2 border-red-200 p-6 space-y-3">
            <Skeleton className="h-6 w-6 rounded-full bg-red-200" />
            <Skeleton className="h-5 w-32 bg-red-200" />
            <Skeleton className="h-4 w-full bg-red-200" />
            <Skeleton className="h-10 w-full bg-red-200" />
          </div>
        ))}
      </div>

      {/* Assessment Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-3">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Resources */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mood tracker skeleton with chart placeholders
 */
export function MoodTrackerSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" role="status" aria-label="Loading mood tracker">
      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      {/* Current Mood Selector */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-32 mx-auto" />
        <div className="flex justify-center space-x-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-full" />
          ))}
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-10 w-32 mx-auto" />
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>

      {/* Recent Entries */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * List skeleton for various list views
 */
export function ListSkeleton({ items = 5, showAvatar = true }: { items?: number; showAvatar?: boolean }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-4 border rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card grid skeleton for dashboard cards
 */
export function CardGridSkeleton({ columns = 3, cards = 6 }: { columns?: number; cards?: number }) {
  return (
    <div 
      className={`grid gap-4 md:grid-cols-${Math.min(columns, 3)} lg:grid-cols-${columns}`}
      role="status" 
      aria-label="Loading cards"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
          <Skeleton className="h-[100px] w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table skeleton for data tables
 */
export function TableSkeleton({ 
  columns = 4, 
  rows = 5,
  showHeader = true 
}: { 
  columns?: number; 
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="rounded-lg border" role="status" aria-label="Loading table">
      {showHeader && (
        <div className="border-b p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Chat skeleton for messaging interfaces
 */
export function ChatSkeleton({ messages = 8 }: { messages?: number }) {
  return (
    <div className="space-y-4 p-4" role="status" aria-label="Loading conversation">
      {Array.from({ length: messages }).map((_, i) => {
        const isOwn = i % 3 === 0;
        return (
          <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {!isOwn && <Skeleton className="h-8 w-8 rounded-full" />}
              <div className={`rounded-lg p-3 space-y-1 ${isOwn ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <Skeleton className="h-4 w-32" />
                {Math.random() > 0.5 && <Skeleton className="h-4 w-24" />}
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Profile skeleton for user profiles
 */
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8" role="status" aria-label="Loading profile">
      {/* Profile Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <div className="flex justify-center space-x-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Settings skeleton for settings pages
 */
export function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" role="status" aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings Sections */}
      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="rounded-lg border p-6 space-y-6">
          <div className="border-b pb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Generic content skeleton with customizable sections
 */
export function ContentSkeleton({ 
  sections = 3,
  paragraphs = [3, 2, 4],
  showImage = false 
}: { 
  sections?: number;
  paragraphs?: number[];
  showImage?: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" role="status" aria-label="Loading content">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        {showImage && <Skeleton className="h-48 w-full" />}
      </div>

      {/* Content Sections */}
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <div className="space-y-2">
            {Array.from({ length: paragraphs[sectionIndex] || 3 }).map((_, paraIndex) => (
              <Skeleton 
                key={paraIndex} 
                className={`h-4 ${paraIndex % 2 === 0 ? 'w-full' : 'w-5/6'}`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}