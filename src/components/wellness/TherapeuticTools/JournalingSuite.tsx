import React from 'react';
import { BookOpen } from 'lucide-react';

interface JournalingSuiteProps {
  toolId?: string;
}

const JournalingSuite: React.FC<JournalingSuiteProps> = ({ toolId }: JournalingSuiteProps) => {
  return (
    <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-green-500" />
        Journaling Suite
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Structured journaling tools - {toolId}
      </p>
    </div>
  );
};

export default JournalingSuite;
