'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  InboxIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  FolderOpenIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

/**
 * EmptyState - Consistent empty state messaging component
 * Provides helpful messaging and actions when no data is available
 */

export interface EmptyStateProps {
  /** Type of empty state */
  type?: 'no-data' | 'no-results' | 'error' | 'coming-soon' | 'custom';
  /** Main title */
  title?: string;
  /** Description text */
  description?: string;
  /** Icon to display */
  icon?: React.ComponentType<any>;
  /** Icon color class */
  iconColor?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
  };
  /** Whether to show border */
  bordered?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Custom content to display below description */
  children?: React.ReactNode;
}

const defaultConfigs = {
  'no-data': {
    icon: InboxIcon,
    iconColor: 'text-gray-400',
    title: 'No data available',
    description: 'Get started by creating your first item.'
  },
  'no-results': {
    icon: MagnifyingGlassIcon,
    iconColor: 'text-gray-400',
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.'
  },
  'error': {
    icon: ExclamationCircleIcon,
    iconColor: 'text-red-400',
    title: 'Unable to load data',
    description: 'There was an error loading the data. Please try again.'
  },
  'coming-soon': {
    icon: CalendarIcon,
    iconColor: 'text-blue-400',
    title: 'Coming soon',
    description: 'This feature is under development and will be available soon.'
  },
  'custom': {
    icon: FolderOpenIcon,
    iconColor: 'text-gray-400',
    title: '',
    description: ''
  }
};

const sizeClasses = {
  sm: {
    container: 'py-8 px-6',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
    button: 'text-sm px-3 py-1.5'
  },
  md: {
    container: 'py-12 px-8',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
    button: 'text-base px-4 py-2'
  },
  lg: {
    container: 'py-16 px-10',
    icon: 'w-20 h-20',
    title: 'text-2xl',
    description: 'text-lg',
    button: 'text-lg px-6 py-3'
  }
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  icon,
  iconColor,
  primaryAction,
  secondaryAction,
  bordered = true,
  size = 'md',
  className = '',
  children
}) => {
  const config = defaultConfigs[type];
  const sizes = sizeClasses[size];
  
  const Icon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIconColor = iconColor || config.iconColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-white rounded-lg text-center
        ${bordered ? 'border border-gray-200 shadow-sm' : ''}
        ${sizes.container}
        ${className}
      `}
      role="status"
      aria-label={finalTitle}
    >
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className={`${finalIconColor} ${sizes.icon}`}>
          <Icon className="w-full h-full" aria-hidden="true" />
        </div>
      </div>

      {/* Title */}
      {finalTitle && (
        <h3 className={`font-semibold text-gray-900 mb-2 ${sizes.title}`}>
          {finalTitle}
        </h3>
      )}

      {/* Description */}
      {finalDescription && (
        <p className={`text-gray-600 mb-6 max-w-md mx-auto ${sizes.description}`}>
          {finalDescription}
        </p>
      )}

      {/* Custom Content */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={`
                flex items-center gap-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors ${sizes.button}
              `}
            >
              {primaryAction.icon && (
                <primaryAction.icon className="w-5 h-5" />
              )}
              {primaryAction.label}
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`
                flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg
                hover:bg-gray-200 transition-colors ${sizes.button}
              `}
            >
              {secondaryAction.icon && (
                <secondaryAction.icon className="w-5 h-5" />
              )}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Preset empty state components for common scenarios
export const NoDataEmptyState: React.FC<Omit<EmptyStateProps, 'type'>> = (props) => (
  <EmptyState type="no-data" {...props} />
);

export const NoResultsEmptyState: React.FC<Omit<EmptyStateProps, 'type'>> = (props) => (
  <EmptyState type="no-results" {...props} />
);

export const ErrorEmptyState: React.FC<Omit<EmptyStateProps, 'type'>> = (props) => (
  <EmptyState type="error" {...props} />
);

export const ComingSoonEmptyState: React.FC<Omit<EmptyStateProps, 'type'>> = (props) => (
  <EmptyState type="coming-soon" {...props} />
);

// Specific empty states for different dashboard contexts
export const NoClientsEmptyState: React.FC<Pick<EmptyStateProps, 'primaryAction' | 'className'>> = (props) => (
  <EmptyState
    type="custom"
    icon={UserGroupIcon}
    iconColor="text-blue-400"
    title="No clients yet"
    description="Start helping people by accepting new client requests."
    {...props}
  />
);

export const NoSessionsEmptyState: React.FC<Pick<EmptyStateProps, 'primaryAction' | 'className'>> = (props) => (
  <EmptyState
    type="custom"
    icon={CalendarIcon}
    iconColor="text-green-400"
    title="No sessions scheduled"
    description="You don't have any upcoming sessions at the moment."
    {...props}
  />
);

export const NoMessagesEmptyState: React.FC<Pick<EmptyStateProps, 'primaryAction' | 'className'>> = (props) => (
  <EmptyState
    type="custom"
    icon={ChatBubbleLeftRightIcon}
    iconColor="text-purple-400"
    title="No messages"
    description="You don't have any messages to display."
    {...props}
  />
);

export const NoNotesEmptyState: React.FC<Pick<EmptyStateProps, 'primaryAction' | 'className'>> = (props) => (
  <EmptyState
    type="custom"
    icon={DocumentTextIcon}
    iconColor="text-yellow-400"
    title="No notes available"
    description="Start documenting your sessions by creating your first note."
    {...props}
  />
);

export default EmptyState;