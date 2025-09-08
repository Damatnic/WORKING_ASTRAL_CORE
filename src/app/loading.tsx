/**
 * Global Loading Component
 * Enhanced loading state with performance optimization features
 */

import { LoadingPresets } from '@/components/loading';
import { Brain, Heart } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Logo and branding */}
          <div className="text-center mb-12">
            <div className="relative mb-6">
              <Brain className="w-20 h-20 text-primary-600 mx-auto" />
              <Heart className="w-8 h-8 text-wellness-mindful absolute -top-2 -right-2 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-3">
              Astral Core
            </h1>
            <p className="text-xl text-neutral-600 mb-2">
              Your mental wellness companion
            </p>
            <p className="text-neutral-500">
              Preparing your personalized wellness experience
            </p>
          </div>

          {/* Enhanced loading component */}
          <LoadingPresets.Minimal message="Loading your safe space..." />
          
          {/* Loading tips */}
          <div className="mt-12 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200 max-w-2xl mx-auto">
            <h3 className="font-semibold text-neutral-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              While you wait...
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Take a moment to breathe deeply and set an intention for your wellness journey today. 
              Remember that seeking support is a sign of strength, and you&apos;re taking an important step 
              toward your mental health.
            </p>
          </div>
          
          {/* Performance hint */}
          <div className="text-center mt-8">
            <p className="text-xs text-neutral-500">
              Optimizing content for your device and connection...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}