/**
 * Crisis Page Loading Component
 * High-priority loading for crisis intervention resources
 */

import { CrisisLoader } from '@/components/loading';

export default function CrisisLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-red-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Priority indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 border border-red-300 rounded-full">
              <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-red-700 uppercase">
                Critical Resources Loading
              </span>
            </div>
          </div>
          
          <CrisisLoader 
            message="Loading emergency support resources..."
            showProgress={true}
            progress={0}
          />
          
          <div className="text-center mt-8">
            <p className="text-red-700 font-medium mb-2">
              Crisis resources are loading with highest priority
            </p>
            <p className="text-red-600 text-sm">
              If you&apos;re in immediate danger, please call 988 or emergency services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}