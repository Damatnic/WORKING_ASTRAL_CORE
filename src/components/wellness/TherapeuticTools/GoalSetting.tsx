import React from 'react';
import { Target } from 'lucide-react';

interface GoalSettingProps {
  toolId?: string;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ toolId }: GoalSettingProps) => {
  return (
    <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Target className="w-6 h-6 text-orange-500" />
        Goal Setting
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        SMART goals and action planning - {toolId}
      </p>
    </div>
  );
};

export default GoalSetting;
