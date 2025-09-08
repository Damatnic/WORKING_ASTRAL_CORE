"use client";

import React, { useRef, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  ArrowLeft,
  HelpCircle,
  Lightbulb,
  BookOpen,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { AccessibleSkipLink, AccessibleBreadcrumb } from '@/components/accessibility/AccessibleComponents';
import { AccessibilityService } from '@/lib/accessibility';
import { CriticalBoundary, MoodTrackerSkeleton, WellnessLoader } from '@/components/loading';
import { createLazyComponent } from '@/lib/performance/dynamic-imports';

// Dynamic imports for wellness components
const MoodTracker = createLazyComponent(
  () => import('@/components/dashboard/MoodTracker'),
  {
    fallback: <MoodTrackerSkeleton />,
    priority: 'high',
    preload: true,
    timeout: 6000,
  }
);

const WellnessInsights = createLazyComponent(
  () => import('@/components/dashboard/WellnessInsights'),
  {
    fallback: <MoodTrackerSkeleton />,
    priority: 'medium',
    delay: 300,
    timeout: 8000,
  }
);

export default function MoodTrackerPage() {
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    AccessibilityService.announce('Mood tracker page loaded', 'polite');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-calm/10 via-white to-wellness-growth/10">
      <AccessibleSkipLink targetId="main-content" />
      
      <AccessibleBreadcrumb 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wellness', href: '/wellness' },
          { label: 'Mood Tracker', href: '/wellness/mood-tracker', current: true }
        ]}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center text-neutral-600 hover:text-neutral-800 transition-colors mr-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 mr-1" aria-hidden="true" />
                Dashboard
              </Link>
              <div>
                <h1 
                  id="page-title"
                  className="text-3xl font-bold text-neutral-800"
                  tabIndex={-1}
                >
                  Mood Tracker
                </h1>
                <p className="text-neutral-600 mt-1" aria-describedby="page-title">
                  Track your daily mood, energy, and wellness patterns
                </p>
              </div>
            </div>
          </motion.header>

          <main id="main-content" ref={mainContentRef} tabIndex={-1}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Mood Tracker */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
                aria-labelledby="mood-tracker-heading"
              >
                <h2 id="mood-tracker-heading" className="sr-only">Mood Tracker Interface</h2>
                <CriticalBoundary componentName="MoodTracker">
                  <Suspense fallback={<WellnessLoader message="Loading mood tracker..." />}>
                    <MoodTracker />
                  </Suspense>
                </CriticalBoundary>
              </motion.section>

              {/* AI Insights Sidebar */}
              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                aria-labelledby="insights-heading"
              >
                <h2 id="insights-heading" className="sr-only">Wellness Insights</h2>
                <CriticalBoundary componentName="WellnessInsights">
                  <Suspense fallback={<WellnessLoader message="Loading wellness insights..." />}>
                    <WellnessInsights />
                  </Suspense>
                </CriticalBoundary>
              </motion.aside>
            </div>

            {/* Help & Guidance Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 bg-gradient-to-r from-wellness-mindful/10 to-wellness-calm/10 rounded-2xl p-8"
              aria-labelledby="guidance-heading"
            >
              <div className="flex items-center mb-6">
                <HelpCircle className="w-6 h-6 text-wellness-mindful mr-3" aria-hidden="true" />
                <h3 id="guidance-heading" className="text-2xl font-bold text-neutral-800">Mood Tracking Guidance</h3>
              </div>
            
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 id="tips-heading" className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 text-wellness-balanced mr-2" aria-hidden="true" />
                    Tips for Effective Mood Tracking
                  </h4>
                  <div className="space-y-3" role="list" aria-labelledby="tips-heading">
                    <div className="flex items-start" role="listitem">
                      <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <strong className="text-neutral-800">Be consistent:</strong>
                        <span className="text-neutral-600"> Track your mood at the same time each day for better patterns</span>
                      </div>
                    </div>
                    <div className="flex items-start" role="listitem">
                      <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <strong className="text-neutral-800">Be honest:</strong>
                        <span className="text-neutral-600"> Record how you actually feel, not how you think you should feel</span>
                      </div>
                    </div>
                    <div className="flex items-start" role="listitem">
                      <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <strong className="text-neutral-800">Include context:</strong>
                        <span className="text-neutral-600"> Note specific events, thoughts, or situations that influenced your mood</span>
                      </div>
                    </div>
                    <div className="flex items-start" role="listitem">
                      <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <strong className="text-neutral-800">Look for patterns:</strong>
                        <span className="text-neutral-600"> Review your weekly insights to identify trends and triggers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 id="emotions-heading" className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 text-primary-500 mr-2" aria-hidden="true" />
                    Understanding Your Emotions
                  </h4>
                  <div className="space-y-4" role="list" aria-labelledby="emotions-heading">
                    <div className="p-4 bg-white rounded-lg border border-neutral-200" role="listitem">
                      <h5 className="font-medium text-neutral-800 mb-2">Primary Emotions</h5>
                      <p className="text-neutral-600 text-sm">
                        Focus on core feelings like joy, sadness, anger, fear, surprise, and disgust. These are your emotional foundation.
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-neutral-200" role="listitem">
                      <h5 className="font-medium text-neutral-800 mb-2">Complex Emotions</h5>
                      <p className="text-neutral-600 text-sm">
                        Notice mixed feelings like feeling grateful but anxious, or excited but worried. It&apos;s normal to experience multiple emotions.
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-neutral-200" role="listitem">
                      <h5 className="font-medium text-neutral-800 mb-2">Emotional Intensity</h5>
                      <p className="text-neutral-600 text-sm">
                        Pay attention to how strong your emotions feel. A 3/5 sadness is different from 5/5 sadness and may need different responses.
                      </p>
                    </div>
                  </div>
                </div>
            </div>

              {/* Quick Help Links */}
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <h4 id="support-heading" className="text-lg font-semibold text-neutral-800 mb-4">Need More Support?</h4>
                <div className="flex flex-wrap gap-4" role="list" aria-labelledby="support-heading">
                  <Link
                    href="/therapy"
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                    role="listitem"
                  >
                    <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                    Talk to AI Therapist
                  </Link>
                  <Link
                    href="/resources"
                    className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    role="listitem"
                  >
                    <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                    Mood Resources
                  </Link>
                  <Link
                    href="/community"
                    className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    role="listitem"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    Community Support
                  </Link>
                  <Link
                    href="/crisis"
                    className="flex items-center px-4 py-2 bg-crisis-primary text-white rounded-lg hover:bg-crisis-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-crisis-primary focus:ring-offset-2"
                    role="listitem"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    Crisis Support
                  </Link>
                </div>
              </div>
            </motion.section>

            {/* Navigation */}
            <nav className="flex justify-center mt-8" aria-label="Page navigation">
              <Link 
                href="/dashboard"
                className="text-primary-600 hover:text-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                ← Back to Dashboard
              </Link>
            </nav>
          </main>
        </div>
      </div>
    </div>
  );
}
