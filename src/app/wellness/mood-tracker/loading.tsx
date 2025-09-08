/**
 * Mood Tracker Loading Component
 * Calming loading state for wellness features
 */

import { WellnessLoader } from '@/components/loading';

export default function MoodTrackerLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-calm/10 via-white to-wellness-growth/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="h-5 w-20 bg-gray-200 rounded mr-4 animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          <WellnessLoader message="Preparing your wellness dashboard..." />
          
          <div className="text-center mt-8">
            <p className="text-blue-700 font-medium mb-2">
              Personalizing your mood tracking experience
            </p>
            <p className="text-blue-600 text-sm">
              Loading your wellness insights and mood history
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}