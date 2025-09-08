/**
 * Performance-Aware Loader Component
 * Adapts loading behavior based on device capabilities and network conditions
 */

import React, { memo, useEffect, useState } from 'react';
import { useDeviceCapabilities } from '@/lib/performance/dynamic-imports.tsx';
import { Activity, Zap } from '@/lib/performance/tree-shaking-optimization';

interface PerformanceLoaderProps {
  message?: string;
  estimatedLoadTime?: number;
  showOptimizations?: boolean;
  className?: string;
}

const PerformanceLoader = memo<PerformanceLoaderProps>(({ 
  message = "Optimizing experience for your device...",
  estimatedLoadTime = 3000,
  showOptimizations = true,
  className = ''
}) => {
  const capabilities = useDeviceCapabilities();
  const [loadingPhase, setLoadingPhase] = useState<'analyzing' | 'optimizing' | 'loading'>('analyzing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading phases
    const phases = [
      { phase: 'analyzing', duration: 500, message: 'Analyzing device capabilities...' },
      { phase: 'optimizing', duration: 800, message: 'Optimizing for your device...' },
      { phase: 'loading', duration: estimatedLoadTime - 1300, message: message }
    ];

    let currentTime = 0;
    let phaseIndex = 0;

    const timer = setInterval(() => {
      currentTime += 100;
      
      // Update progress
      setProgress((currentTime / estimatedLoadTime) * 100);
      
      // Update phase
      let accumulatedTime = 0;
      for (let i = 0; i < phases.length; i++) {
        accumulatedTime += phases[i].duration;
        if (currentTime < accumulatedTime && phaseIndex !== i) {
          setLoadingPhase(phases[i].phase as any);
          phaseIndex = i;
          break;
        }
      }
      
      if (currentTime >= estimatedLoadTime) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [estimatedLoadTime, message]);

  const getPhaseMessage = () => {
    switch (loadingPhase) {
      case 'analyzing':
        return 'Analyzing device capabilities...';
      case 'optimizing':
        if (capabilities.isLowEnd) {
          return 'Optimizing for low-end device...';
        }
        if (capabilities.isSlowNetwork) {
          return 'Optimizing for slow network...';
        }
        return 'Optimizing experience...';
      case 'loading':
      default:
        return message;
    }
  };

  const getOptimizationMessages = () => {
    const optimizations = [];
    
    if (capabilities.isLowEnd) {
      optimizations.push('Reducing animations');
      optimizations.push('Lightweight components loaded');
    }
    
    if (capabilities.isSlowNetwork) {
      optimizations.push('Compressing resources');
      optimizations.push('Prioritizing critical content');
    }
    
    if (capabilities.memoryLimitMB < 2048) {
      optimizations.push('Memory-efficient rendering');
    }
    
    if (optimizations.length === 0) {
      optimizations.push('Full experience enabled');
    }
    
    return optimizations;
  };

  return (
    <div 
      className={`min-h-[300px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg ${className}`}
      role="status"
      aria-live="polite"
      aria-label={getPhaseMessage()}
    >
      {/* Animated icon */}
      <div className="relative mb-6">
        {loadingPhase === 'analyzing' ? (
          <Activity className="w-16 h-16 text-blue-600 animate-pulse" />
        ) : (
          <Zap className="w-16 h-16 text-purple-600 animate-bounce" />
        )}
        
        {/* Progress ring */}
        <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-blue-600 transition-all duration-300"
            strokeDasharray={`${progress * 1.76} 176`}
          />
        </svg>
      </div>

      {/* Loading message */}
      <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
        {getPhaseMessage()}
      </h3>

      {/* Progress percentage */}
      <p className="text-blue-600 font-medium mb-4">
        {Math.round(progress)}%
      </p>

      {/* Device info */}
      <div className="text-sm text-gray-600 text-center space-y-1 mb-4">
        <p>
          Device: {capabilities.isLowEnd ? 'Low-end' : 'High-performance'}
          {' • '}
          Network: {capabilities.isSlowNetwork ? 'Slow' : 'Fast'}
        </p>
        <p>
          Memory: {capabilities.memoryLimitMB === Infinity ? 'Unlimited' : `${Math.round(capabilities.memoryLimitMB / 1024)}GB`}
        </p>
      </div>

      {/* Optimization details */}
      {showOptimizations && (
        <div className="max-w-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-2 text-center">
            Performance Optimizations:
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {getOptimizationMessages().map((optimization, index) => (
              <li key={index} className="flex items-center justify-center">
                <span className="w-1 h-1 bg-green-500 rounded-full mr-2" />
                {optimization}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accessibility enhancements */}
      <div className="sr-only">
        Performance loader active. Current phase: {loadingPhase}. 
        Progress: {Math.round(progress)} percent complete.
        {capabilities.isLowEnd && " Optimizing for low-end device."}
        {capabilities.isSlowNetwork && " Optimizing for slow network."}
      </div>
    </div>
  );
});

PerformanceLoader.displayName = 'PerformanceLoader';

export { PerformanceLoader };