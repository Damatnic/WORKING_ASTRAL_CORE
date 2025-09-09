'use client';

import React from 'react';

/**
 * Accessible Components - Full implementations
 */

interface AccessibleSkipLinkProps {
  targetId?: string;
  href?: string;
  children?: React.ReactNode;
}

export function AccessibleSkipLink({ targetId = "main-content", href, children }: AccessibleSkipLinkProps) {
  const linkHref = href || `#${targetId}`;
  
  return (
    <a
      href={linkHref}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
    >
      {children || 'Skip to main content'}
    </a>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AccessibleBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AccessibleBreadcrumb({ items }: AccessibleBreadcrumbProps) {
  if (!items || items.length === 0) return null;
  
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-neutral-600">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2" aria-hidden="true">/</span>}
            {item.href ? (
              <a href={item.href} className="hover:text-primary-600 transition-colors">
                {item.label}
              </a>
            ) : (
              <span className="text-neutral-900" aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface AccessibleLoadingProps {
  message?: string;
}

export function AccessibleLoading({ message = "Loading..." }: AccessibleLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-hidden="true"></div>
      <span className="mt-4 text-neutral-600">{message}</span>
      <span className="sr-only">{message}</span>
    </div>
  );
}

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export function AccessibleButton({ 
  variant = 'primary', 
  children, 
  className = '',
  disabled,
  ...props 
}: AccessibleButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300',
    secondary: 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-50 focus:ring-primary-500 disabled:bg-neutral-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

interface AccessibleAlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onClose?: () => void;
}

export function AccessibleAlert({ type = 'info', message, onClose }: AccessibleAlertProps) {
  const typeClasses = {
    info: 'bg-blue-50 border-blue-500 text-blue-700',
    success: 'bg-green-50 border-green-500 text-green-700',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-700',
    error: 'bg-red-50 border-red-500 text-red-700'
  };
  
  const roleMap = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert'
  };
  
  return (
    <div 
      className={`p-4 border-l-4 rounded-lg ${typeClasses[type]}`}
      role={roleMap[type]}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start justify-between">
        <p className="flex-1">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-current hover:opacity-70 transition-opacity"
            aria-label="Close alert"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
