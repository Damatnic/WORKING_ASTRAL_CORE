'use client';

import React, { forwardRef, ReactNode } from 'react';

// Simplified accessible components for fast compilation

// Simple Skip Link Component
export interface AccessibleSkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export function AccessibleSkipLink({ targetId, children }: AccessibleSkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-lg z-50"
    >
      {children || 'Skip to main content'}
    </a>
  );
}

// Accessible Button Component
export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    loadingText = 'Loading...',
    iconLeft,
    iconRight,
    disabled,
    className = '',
    ...props 
  }: AccessibleButtonProps, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses}
        aria-label={loading ? loadingText : undefined}
        {...props}
      >
        {iconLeft && <span className="mr-2" aria-hidden="true">{iconLeft}</span>}
        {loading ? loadingText : children}
        {iconRight && <span className="ml-2" aria-hidden="true">{iconRight}</span>}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';