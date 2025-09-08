import { Suspense } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingSpinner />}>
        <AdminDashboard />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: 'Admin Dashboard | Astral Core',
  description: 'Administrative dashboard for platform oversight, user management, system monitoring, and administrative tools.',
};