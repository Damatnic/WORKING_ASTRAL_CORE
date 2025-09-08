import React from 'react';
import { Brain } from 'lucide-react';

interface CBTToolsProps {
  toolId?: string;
}

const CBTTools: React.FC<CBTToolsProps> = ({ toolId }: CBTToolsProps) => {
  return (
    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-500" />
        CBT Tools
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Cognitive Behavioral Therapy tools - {toolId}
      </p>
    </div>
  );
};

export default CBTTools;