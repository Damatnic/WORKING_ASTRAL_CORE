import { Suspense } from 'react';
import PersonalJournal from '@/components/journal/PersonalJournal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner />}>
          <PersonalJournal />
        </Suspense>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Personal Journal | Astral Core',
  description: 'Your personal space for reflection, growth, and self-discovery through journaling.',
};