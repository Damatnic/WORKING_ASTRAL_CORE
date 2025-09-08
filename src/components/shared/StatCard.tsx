'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

/**
 * StatCard - Reusable statistics card component for displaying metrics
 * Used across all dashboards to show key performance indicators
 */
export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon component to display */
  icon?: React.ComponentType<any>;
  /** Trend percentage (positive or negative) */
  trend?: number;
  /** Trend label (e.g., "from last week") */
  trendLabel?: string;
  /** Icon color class */
  iconColor?: string;
  /** Icon background color class */
  iconBgColor?: string;
  /** Card variant style */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Custom footer content */
  footer?: ReactNode;
}

const variantStyles = {
  default: {
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600'
  },
  success: {
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600'
  },
  warning: {
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    trendUp: 'text-green-600',
    trendDown: 'text-orange-600'
  },
  danger: {
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600'
  },
  info: {
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    trendUp: 'text-green-600',
    trendDown: 'text-red-600'
  }
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel = 'from last period',
  iconColor,
  iconBgColor,
  variant = 'default',
  isLoading = false,
  onClick,
  className = '',
  ariaLabel,
  footer
}) => {
  const styles = variantStyles[variant];
  const finalIconColor = iconColor || styles.iconColor;
  const finalIconBg = iconBgColor || styles.iconBg;
  const isClickable = !!onClick;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={isClickable ? { scale: 1.02 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      className={`
        bg-white rounded-xl shadow-md border border-gray-200 p-6 
        ${isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : 'article'}
      aria-label={ariaLabel || `${title}: ${value}`}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600" id={`stat-${title}-label`}>
            {title}
          </p>
          <p 
            className="text-2xl font-bold text-gray-900 mt-2" 
            aria-labelledby={`stat-${title}-label`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${finalIconBg}`} aria-hidden="true">
            <Icon className={`w-6 h-6 ${finalIconColor}`} />
          </div>
        )}
      </div>

      {/* Trend Indicator */}
      {trend !== undefined && (
        <div className="mt-4 flex items-center" role="status">
          {trend >= 0 ? (
            <ArrowTrendingUpIcon 
              className={`w-4 h-4 ${styles.trendUp}`} 
              aria-label="Trending up"
            />
          ) : (
            <ArrowTrendingDownIcon 
              className={`w-4 h-4 ${styles.trendDown}`}
              aria-label="Trending down"
            />
          )}
          <span className={`text-sm font-medium ml-1 ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-sm text-gray-500 ml-2">
            {trendLabel}
          </span>
        </div>
      )}

      {/* Custom Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;