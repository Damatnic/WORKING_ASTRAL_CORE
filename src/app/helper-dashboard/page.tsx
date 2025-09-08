import { Suspense } from 'react';
import HelperDashboard from '@/components/helper/HelperDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function HelperDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner />}>
          <HelperDashboard />
        </Suspense>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Helper Dashboard | Astral Core',
  description: 'Manage your peer support clients and sessions as a mental health helper.',
};