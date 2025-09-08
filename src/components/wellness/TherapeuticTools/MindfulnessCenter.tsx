import React from 'react';
import { Wind } from 'lucide-react';

interface MindfulnessCenterProps {
  toolId?: string;
}

const MindfulnessCenter: React.FC<MindfulnessCenterProps> = ({ toolId }: MindfulnessCenterProps) => {
  return (
    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Wind className="w-6 h-6 text-blue-500" />
        Mindfulness Center
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Mindfulness and meditation exercises - {toolId}
      </p>
    </div>
  );
};

export default MindfulnessCenter;
