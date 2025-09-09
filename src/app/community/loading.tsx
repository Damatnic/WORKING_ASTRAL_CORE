/**
 * Community Loading Component
 * Social loading state for community features
 */

import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Community Support
            </h2>
            <p className="text-gray-600">
              Connecting you with peer support
            </p>
          </div>
          
          <div className="flex items-center justify-center p-6">
            <LoadingSpinner size="md" variant="primary" showLabel label="Loading community features..." />
          </div>
          
          <div className="text-center mt-8">
            <p className="text-green-600 text-sm">
              Building connections for mutual support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}