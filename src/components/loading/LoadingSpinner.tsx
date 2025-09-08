/**
 * Accessible Loading Spinner Component
 * Provides various spinner styles with accessibility features and HIPAA compliance
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner size options
 */
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Loading spinner variants
 */
export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'crisis';

/**
 * Loading spinner props
 */
interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
  label?: string;
  showLabel?: boolean;
  overlay?: boolean;
  fullScreen?: boolean;
  delay?: number;
  timeout?: number;
  onTimeout?: () => void;
  'data-testid'?: string;
}

/**
 * Size mappings for spinner dimensions
 */
const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * Color mappings for spinner variants
 */
const variantClasses: Record<SpinnerVariant, string> = {
  default: 'text-gray-600 dark:text-gray-400',
  primary: 'text-blue-600 dark:text-blue-400',
  secondary: 'text-gray-500 dark:text-gray-300',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  crisis: 'text-red-700 dark:text-red-300',
};

/**
 * Label text mappings
 */
const labelText: Record<SpinnerVariant, string> = {
  default: 'Loading...',
  primary: 'Loading...',
  secondary: 'Loading...',
  success: 'Processing...',
  warning: 'Please wait...',
  error: 'Retrying...',
  crisis: 'Loading emergency resources...',
};

/**
 * Main LoadingSpinner component
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
  label,
  showLabel = false,
  overlay = false,
  fullScreen = false,
  delay = 0,
  timeout,
  onTimeout,
  'data-testid': testId = 'loading-spinner',
  ...props
}: LoadingSpinnerProps) {
  const [isVisible, setIsVisible] = React.useState(delay === 0);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  // Handle delayed appearance
  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // Handle timeout
  React.useEffect(() => {
    if (timeout && timeout > 0) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout?.();
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [timeout, onTimeout]);

  // Don't render if delayed or timed out
  if (!isVisible || hasTimedOut) {
    return null;
  }

  const displayLabel = label || labelText[variant];
  const spinnerClasses = cn(
    'animate-spin',
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  // SVG spinner element
  const spinnerElement = (
    <svg
      className={spinnerClasses}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={displayLabel}
      data-testid={testId}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Content wrapper with optional label
  const content = (
    <div className="flex flex-col items-center justify-center space-y-2">
      {spinnerElement}
      {showLabel && (
        <span 
          className={cn(
            'text-sm font-medium',
            variantClasses[variant]
          )}
          aria-live="polite"
        >
          {displayLabel}
        </span>
      )}
      {/* Hidden text for screen readers */}
      <span className="sr-only">{displayLabel}</span>
    </div>
  );

  // Full screen overlay
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
        role="dialog"
        aria-modal="true"
        aria-label="Loading"
      >
        {content}
      </div>
    );
  }

  // Overlay within container
  if (overlay) {
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 rounded-lg"
        role="status"
        aria-label="Loading"
      >
        {content}
      </div>
    );
  }

  // Regular spinner
  return content;
}

/**
 * Pulse loading animation for subtle loading states
 */
export function PulseLoader({
  size = 'md',
  variant = 'default',
  className,
  label = 'Loading...',
}: Omit<LoadingSpinnerProps, 'showLabel'>) {
  const pulseSize = {
    xs: 'h-2 w-2',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };

  return (
    <div 
      className="flex items-center space-x-1"
      role="status"
      aria-label={label}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            pulseSize[size],
            variantClasses[variant],
            'animate-pulse rounded-full bg-current',
            className
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Dots loading animation
 */
export function DotsLoader({
  size = 'md',
  variant = 'default',
  className,
  label = 'Loading...',
}: Omit<LoadingSpinnerProps, 'showLabel'>) {
  const dotSize = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
    xl: 'h-3 w-3',
  };

  return (
    <div 
      className="flex items-center space-x-1"
      role="status"
      aria-label={label}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            dotSize[size],
            variantClasses[variant],
            'animate-bounce rounded-full bg-current',
            className
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Progress bar loader for determinate loading
 */
interface ProgressLoaderProps {
  progress: number; // 0-100
  variant?: SpinnerVariant;
  className?: string;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressLoader({
  progress,
  variant = 'primary',
  className,
  label = 'Loading...',
  showPercentage = false,
  size = 'md',
}: ProgressLoaderProps) {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div 
      className="w-full space-y-2"
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {(showPercentage || label) && (
        <div className="flex items-center justify-between text-sm">
          <span className={variantClasses[variant]}>{label}</span>
          {showPercentage && (
            <span className={cn('font-medium', variantClasses[variant])}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700', heightClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variant === 'crisis' ? 'bg-red-600' : 'bg-blue-600'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress loader
 */
interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  variant?: SpinnerVariant;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 6,
  variant = 'primary',
  className,
  label = 'Loading...',
  showPercentage = true,
}: CircularProgressProps) {
  const normalizedRadius = (size - strokeWidth) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div 
      className={cn('flex flex-col items-center space-y-2', className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-300 dark:text-gray-600"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-300 ease-in-out',
              variantClasses[variant]
            )}
          />
        </svg>
        
        {/* Percentage display */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-sm font-semibold', variantClasses[variant])}>
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>
      
      {label && (
        <span className={cn('text-sm font-medium text-center', variantClasses[variant])}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Button loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  spinnerSize?: SpinnerSize;
  variant?: SpinnerVariant;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  spinnerSize = 'sm',
  variant = 'default',
  disabled,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center space-x-2 transition-all duration-200',
        loading && 'cursor-not-allowed opacity-70',
        className
      )}
    >
      {loading && (
        <LoadingSpinner
          size={spinnerSize}
          variant={variant}
          data-testid="button-spinner"
        />
      )}
      <span>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}

/**
 * Specialized crisis loading component
 */
export function CrisisLoader({
  message = "Loading emergency resources...",
  showProgress = false,
  progress = 0,
}: {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 p-8">
      <div className="flex items-center space-x-3">
        <LoadingSpinner
          size="lg"
          variant="crisis"
          data-testid="crisis-spinner"
        />
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-red-600 rounded-full animate-pulse" />
          <span className="text-red-700 font-semibold">PRIORITY</span>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-red-700">
          {message}
        </p>
        <p className="text-sm text-red-600">
          Critical resources are being loaded with highest priority
        </p>
      </div>
      
      {showProgress && (
        <div className="w-64">
          <ProgressLoader
            progress={progress}
            variant="crisis"
            label="Loading progress"
            showPercentage
          />
        </div>
      )}
      
      {/* Accessibility announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading emergency support resources. Please wait.
      </div>
    </div>
  );
}

/**
 * Wellness loading component with calming animation
 */
export function WellnessLoader({
  message = "Loading your wellness dashboard...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 p-8">
      <div className="relative">
        {/* Breathing animation circles */}
        <div className="absolute inset-0 animate-pulse">
          <div className="h-16 w-16 rounded-full bg-blue-200 dark:bg-blue-800 opacity-30" />
        </div>
        <div className="absolute inset-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <div className="h-12 w-12 rounded-full bg-purple-200 dark:bg-purple-800 opacity-40" />
        </div>
        <div className="absolute inset-4 animate-pulse" style={{ animationDelay: '1s' }}>
          <div className="h-8 w-8 rounded-full bg-green-200 dark:bg-green-800 opacity-50" />
        </div>
        
        <LoadingSpinner
          size="md"
          variant="primary"
          className="relative z-10"
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
          {message}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Preparing your personalized wellness experience
        </p>
      </div>
    </div>
  );
}