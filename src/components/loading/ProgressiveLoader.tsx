/**
 * Progressive Loader Component
 * Handles large component loading with progressive enhancement and fallback states
 */

import React, { Suspense, ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ProgressLoader } from './LoadingSpinner';
import { detectDeviceCapabilities } from '@/lib/performance/dynamic-imports.tsx';

/**
 * Progressive loading stage
 */
export interface LoadingStage {
  name: string;
  message: string;
  progress: number;
  duration?: number;
  critical?: boolean;
}

/**
 * Progressive loader props
 */
interface ProgressiveLoaderProps {
  stages?: LoadingStage[];
  fallback?: React.ReactNode;
  showProgress?: boolean;
  showStages?: boolean;
  onStageComplete?: (stage: LoadingStage) => void;
  onComplete?: () => void;
  errorBoundary?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Default loading stages for different component types
 */
export const DEFAULT_STAGES: Record<string, LoadingStage[]> = {
  dashboard: [
    { name: 'auth', message: 'Verifying authentication...', progress: 20, critical: true },
    { name: 'data', message: 'Loading dashboard data...', progress: 50 },
    { name: 'charts', message: 'Rendering charts...', progress: 80 },
    { name: 'complete', message: 'Dashboard ready', progress: 100 },
  ],
  crisis: [
    { name: 'emergency', message: 'Loading emergency resources...', progress: 30, critical: true },
    { name: 'assessment', message: 'Preparing crisis assessment...', progress: 60, critical: true },
    { name: 'contacts', message: 'Loading support contacts...', progress: 90, critical: true },
    { name: 'complete', message: 'Crisis support ready', progress: 100 },
  ],
  wellness: [
    { name: 'profile', message: 'Loading your profile...', progress: 25 },
    { name: 'metrics', message: 'Calculating wellness metrics...', progress: 60 },
    { name: 'recommendations', message: 'Personalizing recommendations...', progress: 90 },
    { name: 'complete', message: 'Wellness dashboard ready', progress: 100 },
  ],
  chat: [
    { name: 'connection', message: 'Establishing secure connection...', progress: 40 },
    { name: 'history', message: 'Loading conversation history...', progress: 75 },
    { name: 'complete', message: 'Chat ready', progress: 100 },
  ],
};

/**
 * Progressive Loader Component
 */
export function ProgressiveLoader({
  stages = DEFAULT_STAGES.dashboard,
  fallback,
  showProgress = true,
  showStages = true,
  onStageComplete,
  onComplete,
  errorBoundary = true,
  className,
  'data-testid': testId = 'progressive-loader',
}: ProgressiveLoaderProps) {
  const [currentStageIndex, setCurrentStageIndex] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [capabilities] = React.useState(() => detectDeviceCapabilities());

  const currentStage = stages[currentStageIndex];
  const isLastStage = currentStageIndex === stages.length - 1;

  // Auto-progress through stages
  React.useEffect(() => {
    if (isComplete || error) return;

    const stageDuration = currentStage?.duration || (capabilities.isSlowNetwork ? 2000 : 1000);
    const timer = setTimeout(() => {
      if (isLastStage) {
        setIsComplete(true);
        onComplete?.();
      } else {
        onStageComplete?.(currentStage);
        setCurrentStageIndex(prev => prev + 1);
      }
    }, stageDuration);

    return () => clearTimeout(timer);
  }, [currentStageIndex, currentStage, isLastStage, isComplete, error, capabilities.isSlowNetwork, onStageComplete, onComplete]);

  // Error handling
  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.error('Progressive loader error:', error);
  }, []);

  // Custom fallback content
  if (fallback && !showProgress && !showStages) {
    return <>{fallback}</>;
  }

  // Error state
  if (error) {
    return (
      <div 
        className={cn('flex flex-col items-center justify-center p-8 space-y-4', className)}
        data-testid={`${testId}-error`}
      >
        <div className="text-red-600 dark:text-red-400">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading Failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading content.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading complete
  if (isComplete) {
    return null;
  }

  return (
    <div 
      className={cn('flex flex-col items-center justify-center p-8 space-y-6', className)}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* Main loading indicator */}
      <div className="flex flex-col items-center space-y-4">
        {/* Crisis priority indicator */}
        {currentStage?.critical && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 border border-red-300 rounded-full">
            <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-700 uppercase">Priority</span>
          </div>
        )}

        {/* Spinner */}
        <LoadingSpinner
          size="lg"
          variant={currentStage?.critical ? 'crisis' : 'primary'}
          showLabel={false}
        />

        {/* Current stage message */}
        {showStages && currentStage && (
          <div className="text-center space-y-2">
            <h3 className={cn(
              'text-lg font-medium',
              currentStage.critical 
                ? 'text-red-700 dark:text-red-300' 
                : 'text-gray-900 dark:text-gray-100'
            )}>
              {currentStage.message}
            </h3>
            
            {/* Stage indicator */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStageIndex + 1} of {stages.length}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && currentStage && (
        <div className="w-full max-w-md">
          <ProgressLoader
            progress={currentStage.progress}
            variant={currentStage.critical ? 'crisis' : 'primary'}
            showPercentage={!capabilities.isLowEnd}
            size="md"
          />
        </div>
      )}

      {/* Stage timeline (desktop only) */}
      {showStages && !capabilities.isLowEnd && (
        <div className="hidden md:flex items-center justify-center space-x-2">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex items-center">
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors duration-300',
                  index <= currentStageIndex
                    ? stage.critical 
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
                aria-label={`${stage.name} ${index <= currentStageIndex ? 'completed' : 'pending'}`}
              />
              {index < stages.length - 1 && (
                <div 
                  className={cn(
                    'h-0.5 w-8 transition-colors duration-300',
                    index < currentStageIndex
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Low bandwidth message */}
      {capabilities.isSlowNetwork && (
        <div className="text-center">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Slow connection detected. Loading optimized content...
          </p>
        </div>
      )}

      {/* Accessibility announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {currentStage?.message}
        {currentStage?.critical && ' This is a priority loading step.'}
      </div>
    </div>
  );
}

/**
 * Progressive Enhancement Container
 */
interface ProgressiveContainerProps {
  children: React.ReactNode;
  enhancedChildren?: React.ReactNode;
  condition?: () => boolean;
  fallback?: React.ReactNode;
  stages?: LoadingStage[];
  className?: string;
}

export function ProgressiveContainer({
  children,
  enhancedChildren,
  condition,
  fallback,
  stages,
  className,
}: ProgressiveContainerProps) {
  const [shouldEnhance, setShouldEnhance] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const capabilities = React.useMemo(() => detectDeviceCapabilities(), []);

  React.useEffect(() => {
    const checkCondition = condition || (() => !capabilities.isLowEnd && !capabilities.isSlowNetwork);
    
    if (checkCondition()) {
      setShouldEnhance(true);
    }
    
    // Simulate loading time
    const loadingTime = capabilities.isSlowNetwork ? 2000 : 500;
    const timer = setTimeout(() => setIsLoading(false), loadingTime);
    
    return () => clearTimeout(timer);
  }, [condition, capabilities]);

  if (isLoading) {
    return fallback || <ProgressiveLoader stages={stages} className={className} />;
  }

  if (shouldEnhance && enhancedChildren) {
    return <div className={className}>{enhancedChildren}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Large Component Loader with chunking
 */
interface LargeComponentLoaderProps {
  componentName: string;
  chunks?: string[];
  onChunkLoad?: (chunk: string) => void;
  fallback?: React.ReactNode;
  className?: string;
}

export function LargeComponentLoader({
  componentName,
  chunks = ['core', 'features', 'ui'],
  onChunkLoad,
  fallback,
  className,
}: LargeComponentLoaderProps) {
  const [loadedChunks, setLoadedChunks] = React.useState<Set<string>>(new Set());
  const [currentChunk, setCurrentChunk] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const capabilities = React.useMemo(() => detectDeviceCapabilities(), []);

  // Simulate chunk loading
  React.useEffect(() => {
    if (currentChunk >= chunks.length) {
      setIsComplete(true);
      return;
    }

    const chunkName = chunks[currentChunk];
    const loadTime = capabilities.isSlowNetwork ? 1500 : 800;

    const timer = setTimeout(() => {
      setLoadedChunks(prev => new Set([...prev, chunkName]));
      onChunkLoad?.(chunkName);
      setCurrentChunk(prev => prev + 1);
    }, loadTime);

    return () => clearTimeout(timer);
  }, [currentChunk, chunks, capabilities.isSlowNetwork, onChunkLoad]);

  if (isComplete) {
    return null;
  }

  const progress = (loadedChunks.size / chunks.length) * 100;
  const currentChunkName = chunks[currentChunk];

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 space-y-4', className)}>
      <LoadingSpinner size="lg" variant="primary" />
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Loading {componentName}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading {currentChunkName} components...
        </p>
      </div>

      <div className="w-full max-w-md">
        <ProgressLoader
          progress={progress}
          label={`${loadedChunks.size}/${chunks.length} chunks loaded`}
          showPercentage
        />
      </div>

      {/* Chunk status */}
      <div className="flex flex-wrap justify-center gap-2">
        {chunks.map((chunk, index) => (
          <div
            key={chunk}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              loadedChunks.has(chunk)
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : index === currentChunk
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {chunk}
          </div>
        ))}
      </div>

      {fallback}
    </div>
  );
}

/**
 * Presets for common loading scenarios
 */
export const LoadingPresets = {
  /**
   * Quick loading for small components
   */
  Quick: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={cn('flex items-center justify-center p-4', className)}>
      <LoadingSpinner size="md" showLabel />
      {children}
    </div>
  ),

  /**
   * Dashboard loading with comprehensive stages
   */
  Dashboard: (props: Partial<ProgressiveLoaderProps>) => (
    <ProgressiveLoader
      stages={DEFAULT_STAGES.dashboard}
      showProgress
      showStages
      {...props}
    />
  ),

  /**
   * Crisis loading with priority indicators
   */
  Crisis: (props: Partial<ProgressiveLoaderProps>) => (
    <ProgressiveLoader
      stages={DEFAULT_STAGES.crisis}
      showProgress
      showStages
      {...props}
    />
  ),

  /**
   * Wellness loading with calming progression
   */
  Wellness: (props: Partial<ProgressiveLoaderProps>) => (
    <ProgressiveLoader
      stages={DEFAULT_STAGES.wellness}
      showProgress
      showStages
      {...props}
    />
  ),

  /**
   * Chat loading for messaging interfaces
   */
  Chat: (props: Partial<ProgressiveLoaderProps>) => (
    <ProgressiveLoader
      stages={DEFAULT_STAGES.chat}
      showProgress
      showStages
      {...props}
    />
  ),

  /**
   * Minimal loading for low-end devices
   */
  Minimal: ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" variant="default" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
      </div>
    </div>
  ),
};