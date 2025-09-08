import { Suspense } from 'react';
import TherapistDashboard from '@/components/therapist/TherapistDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function TherapistDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner />}>
          <TherapistDashboard />
        </Suspense>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Therapist Dashboard | Astral Core',
  description: 'Manage your clinical practice, clients, and therapy sessions as a licensed therapist.',
};