import { Suspense } from 'react';
import { AccessibleSkipLink, AccessibleBreadcrumb, AccessibleLoading } from '@/components/accessibility/AccessibleComponents';
import { CriticalBoundary, CrisisSkeleton, CrisisLoader } from '@/components/loading';
import { CriticalPath } from '@/lib/performance/dynamic-imports';

// Critical crisis components loaded with highest priority
const SafetyPlan = CriticalPath.critical(
  () => import('@/components/crisis/SafetyPlan'),
  {
    fallback: <CrisisSkeleton />,
    timeout: 5000,
    retries: 5,
  }
);

const CopingStrategies = CriticalPath.critical(
  () => import('@/components/crisis/CopingStrategies'),
  {
    fallback: <CrisisSkeleton />,
    timeout: 5000, 
    retries: 5,
  }
);

export default function CrisisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-red-50 to-purple-50">
      <AccessibleSkipLink targetId="main-content" />
      
      <AccessibleBreadcrumb 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Crisis Resources', href: '/crisis', current: true }
        ]}
      />
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 
            id="page-title"
            className="text-3xl font-bold text-red-800 mb-4 text-center"
            tabIndex={-1}
          >
            Crisis Resources & Support
          </h1>
          <p className="text-neutral-700 text-center max-w-2xl mx-auto" aria-describedby="page-title">
            Immediate support tools and strategies for managing crisis situations. 
            If you&apos;re in immediate danger, please call 988 or emergency services.
          </p>
        </header>
        
        <main id="main-content" tabIndex={-1}>
          <div className="space-y-12" role="main">
            <CriticalBoundary componentName="SafetyPlan">
              <Suspense fallback={<CrisisLoader message="Loading safety plan..." />}>
                <SafetyPlan />
              </Suspense>
            </CriticalBoundary>
            
            <CriticalBoundary componentName="CopingStrategies">
              <Suspense fallback={<CrisisLoader message="Loading coping strategies..." />}>
                <CopingStrategies />
              </Suspense>
            </CriticalBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Crisis Resources | Astral Core',
  description: 'Crisis safety planning tools and coping strategies for managing difficult times. Immediate support for mental health emergencies.',
  keywords: 'crisis support, safety plan, coping strategies, mental health emergency, suicide prevention',
  robots: 'index, follow',
  openGraph: {
    title: 'Crisis Resources | Astral Core',
    description: 'Crisis safety planning tools and coping strategies for managing difficult times.',
    type: 'website'
  }
};
