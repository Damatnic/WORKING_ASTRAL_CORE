/**
 * Dashboard Loading Component
 * Provides progressive loading states optimized for dashboard content
 */

import { LoadingSpinner } from '@/components/loading/LoadingSpinner';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';

const stages = [
  { name: 'auth', message: 'Verifying authentication...', progress: 20 },
  { name: 'stats', message: 'Loading dashboard statistics...', progress: 40 },
  { name: 'activities', message: 'Fetching recent activities...', progress: 60 },
  { name: 'widgets', message: 'Loading wellness widgets...', progress: 80 },
  { name: 'complete', message: 'Dashboard ready', progress: 100 },
];

export default function DashboardLoading() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(prev => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto py-16">
          <div className="text-center mb-8">
            <LoadingSpinner size="lg" variant="primary" showLabel label={stages[currentStage]?.message || 'Loading dashboard...'} />
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{stages[currentStage]?.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stages[currentStage]?.progress || 0}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div key={stage.name} className="flex items-center space-x-3">
                    {index < currentStage ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : index === currentStage ? (
                      <Clock className="w-4 h-4 text-primary-600 animate-pulse" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={`text-sm ${
                      index <= currentStage ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {stage.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}