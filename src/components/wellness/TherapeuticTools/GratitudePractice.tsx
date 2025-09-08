import React from 'react';
import { Heart } from 'lucide-react';

interface GratitudePracticeProps {
  toolId?: string;
}

const GratitudePractice: React.FC<GratitudePracticeProps> = ({ toolId }: GratitudePracticeProps) => {
  return (
    <div className="p-6 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Heart className="w-6 h-6 text-pink-500" />
        Gratitude Practice
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Daily gratitude exercises - {toolId}
      </p>
    </div>
  );
};

export default GratitudePractice;
