/**
 * Wellness-specific loading component
 * Provides calming, wellness-themed loading states
 */

import React, { memo } from 'react';

interface WellnessLoaderProps {
  message?: string;
  variant?: 'default' | 'mindful' | 'balanced' | 'growth';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const WellnessLoader = memo<WellnessLoaderProps>(({ 
  message = "Loading wellness tools...",
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'mindful':
        return {
          primary: 'border-purple-600',
          secondary: 'border-purple-200',
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          accent: 'bg-purple-50'
        };
      case 'balanced':
        return {
          primary: 'border-blue-600',
          secondary: 'border-blue-200',
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          accent: 'bg-blue-50'
        };
      case 'growth':
        return {
          primary: 'border-emerald-600',
          secondary: 'border-emerald-200',
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          accent: 'bg-emerald-50'
        };
      case 'default':
      default:
        return {
          primary: 'border-green-600',
          secondary: 'border-green-200',
          bg: 'bg-green-100',
          text: 'text-green-700',
          accent: 'bg-green-50'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-4 space-y-2',
          spinner: 'w-8 h-8 border-2',
          inner: 'w-4 h-4',
          text: 'text-sm'
        };
      case 'lg':
        return {
          container: 'p-12 space-y-6',
          spinner: 'w-16 h-16 border-4',
          inner: 'w-8 h-8',
          text: 'text-lg'
        };
      case 'md':
      default:
        return {
          container: 'p-8 space-y-4',
          spinner: 'w-12 h-12 border-4',
          inner: 'w-6 h-6',
          text: 'text-base'
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <div 
      className={`flex flex-col items-center justify-center ${sizeStyles.container} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Animated wellness spinner with breathing effect */}
      <div className="relative">
        <div 
          className={`${sizeStyles.spinner} ${variantStyles.secondary} rounded-full animate-spin ${variantStyles.primary} border-t-4`}
          style={{
            animation: 'spin 2s linear infinite, breathe 4s ease-in-out infinite'
          }}
        />
        
        {/* Inner pulsing circle for depth */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`${sizeStyles.inner} ${variantStyles.bg} rounded-full animate-pulse`}
            style={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        </div>

        {/* Gentle glow effect */}
        <div 
          className={`absolute inset-0 ${sizeStyles.spinner} ${variantStyles.accent} rounded-full opacity-20 animate-ping`}
          style={{
            animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        />
      </div>

      {/* Loading message with gentle fade-in */}
      <p 
        className={`${variantStyles.text} font-medium ${sizeStyles.text} text-center animate-fade-in`}
        style={{
          animation: 'fadeIn 1s ease-in-out'
        }}
      >
        {message}
      </p>

      {/* Accessibility enhancement */}
      <div className="sr-only">
        Loading wellness content. Please wait while we prepare your mental health tools and resources.
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.8; 
          }
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
});

WellnessLoader.displayName = 'WellnessLoader';

export { WellnessLoader };