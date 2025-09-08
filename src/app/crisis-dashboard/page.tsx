import { Suspense } from 'react';
import CrisisCounselorDashboard from '@/components/crisis/CrisisCounselorDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CrisisDashboardPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingSpinner />}>
        <CrisisCounselorDashboard />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: 'Crisis Counselor Dashboard | Astral Core',
  description: 'Crisis intervention dashboard for 24/7 mental health emergency response and counseling services.',
};