/**
 * Wellness Section Loading Component
 * Calming loading state for all wellness features
 */

import { WellnessLoader } from '@/components/loading';

export default function WellnessLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-calm/10 via-white to-wellness-growth/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <WellnessLoader message="Loading wellness features..." />
          
          <div className="text-center mt-8">
            <p className="text-blue-600 text-sm">
              Preparing your personalized wellness journey
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}