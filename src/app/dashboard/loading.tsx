/**
 * Dashboard Loading Component
 * Provides progressive loading states optimized for dashboard content
 */

import { LoadingPresets } from '@/components/loading';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <LoadingPresets.Dashboard 
            stages={[
              { name: 'auth', message: 'Verifying authentication...', progress: 20, critical: true },
              { name: 'stats', message: 'Loading dashboard statistics...', progress: 40 },
              { name: 'activities', message: 'Fetching recent activities...', progress: 60 },
              { name: 'widgets', message: 'Loading wellness widgets...', progress: 80 },
              { name: 'complete', message: 'Dashboard ready', progress: 100 },
            ]}
            showProgress={true}
            showStages={true}
            className="py-16"
          />
        </div>
      </div>
    </div>
  );
}