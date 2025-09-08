'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * DashboardLayout - Shared layout component for all dashboard types
 * Provides consistent structure, spacing, and animations across all dashboards
 */
export interface DashboardLayoutProps {
  /** Dashboard title - displayed at the top */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Main content area */
  children: ReactNode;
  /** Optional header actions (buttons, dropdowns, etc.) */
  headerActions?: ReactNode;
  /** Optional navigation tabs */
  navigationTabs?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Background color variant */
  variant?: 'default' | 'light' | 'dark';
  /** Whether to show loading overlay */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  children,
  headerActions,
  navigationTabs,
  className = '',
  variant = 'default',
  isLoading = false,
  error = null,
  ariaLabel
}) => {
  const backgroundClasses = {
    default: 'bg-gray-50',
    light: 'bg-white',
    dark: 'bg-gray-900'
  };

  const textClasses = {
    default: {
      title: 'text-gray-900',
      subtitle: 'text-gray-600'
    },
    light: {
      title: 'text-gray-900',
      subtitle: 'text-gray-600'
    },
    dark: {
      title: 'text-white',
      subtitle: 'text-gray-300'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen ${backgroundClasses[variant]} ${className}`}
      role="main"
      aria-label={ariaLabel || `${title} Dashboard`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${textClasses[variant].title}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`mt-1 text-sm ${textClasses[variant].subtitle}`}>
                  {subtitle}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                {headerActions}
              </div>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        {navigationTabs && (
          <nav className="mb-6 border-b border-gray-200" role="navigation">
            {navigationTabs}
          </nav>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
          >
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </motion.div>
        )}

        {/* Main Content Area */}
        <main className="relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            </div>
          )}

          {/* Dashboard Content */}
          <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
            {children}
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default DashboardLayout;