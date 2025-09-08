'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

/**
 * ActionButton - Common action buttons with loading states
 * Provides consistent button styling and behavior across dashboards
 */

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether button is loading */
  isLoading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Icon to display before text */
  leftIcon?: React.ComponentType<any>;
  /** Icon to display after text */
  rightIcon?: React.ComponentType<any>;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Whether button is rounded */
  rounded?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const variantClasses = {
  primary: {
    base: 'bg-blue-600 text-white border-blue-600',
    hover: 'hover:bg-blue-700 hover:border-blue-700',
    focus: 'focus:ring-blue-500',
    disabled: 'disabled:bg-blue-300 disabled:border-blue-300'
  },
  secondary: {
    base: 'bg-gray-600 text-white border-gray-600',
    hover: 'hover:bg-gray-700 hover:border-gray-700',
    focus: 'focus:ring-gray-500',
    disabled: 'disabled:bg-gray-300 disabled:border-gray-300'
  },
  success: {
    base: 'bg-green-600 text-white border-green-600',
    hover: 'hover:bg-green-700 hover:border-green-700',
    focus: 'focus:ring-green-500',
    disabled: 'disabled:bg-green-300 disabled:border-green-300'
  },
  danger: {
    base: 'bg-red-600 text-white border-red-600',
    hover: 'hover:bg-red-700 hover:border-red-700',
    focus: 'focus:ring-red-500',
    disabled: 'disabled:bg-red-300 disabled:border-red-300'
  },
  warning: {
    base: 'bg-yellow-500 text-white border-yellow-500',
    hover: 'hover:bg-yellow-600 hover:border-yellow-600',
    focus: 'focus:ring-yellow-400',
    disabled: 'disabled:bg-yellow-300 disabled:border-yellow-300'
  },
  ghost: {
    base: 'bg-transparent text-gray-700 border-transparent',
    hover: 'hover:bg-gray-100',
    focus: 'focus:ring-gray-500',
    disabled: 'disabled:text-gray-400'
  },
  outline: {
    base: 'bg-transparent text-gray-700 border-gray-300',
    hover: 'hover:bg-gray-50 hover:border-gray-400',
    focus: 'focus:ring-gray-500',
    disabled: 'disabled:text-gray-400 disabled:border-gray-200'
  }
};

const sizeClasses = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl'
};

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = false,
      rounded = false,
      className = '',
      ariaLabel,
      children,
      disabled,
      onClick,
      ...rest
    },
    ref
  ) => {
    const variantStyle = variantClasses[variant];
    const sizeStyle = sizeClasses[size];
    const isDisabled = disabled || isLoading;

    const iconSize = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    }[size];

    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          inline-flex items-center justify-center font-medium
          border transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-60
          ${variantStyle.base}
          ${!isDisabled ? variantStyle.hover : ''}
          ${variantStyle.focus}
          ${variantStyle.disabled}
          ${sizeStyle}
          ${fullWidth ? 'w-full' : ''}
          ${rounded ? 'rounded-full' : 'rounded-lg'}
          ${className}
        `}
        disabled={isDisabled}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        {...rest}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <svg
            className={`animate-spin ${iconSize} ${children || loadingText ? 'mr-2' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}

        {/* Left Icon */}
        {!isLoading && LeftIcon && (
          <LeftIcon className={`${iconSize} ${children ? 'mr-2' : ''}`} aria-hidden="true" />
        )}

        {/* Button Text */}
        {isLoading && loadingText ? loadingText : children}

        {/* Right Icon */}
        {!isLoading && RightIcon && (
          <RightIcon className={`${iconSize} ${children ? 'ml-2' : ''}`} aria-hidden="true" />
        )}
      </motion.button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

// Preset button components for common actions
export const PrimaryButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="secondary" {...props} />
);

export const SuccessButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="success" {...props} />
);

export const DangerButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="danger" {...props} />
);

export const WarningButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="warning" {...props} />
);

export const GhostButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="ghost" {...props} />
);

export const OutlineButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="outline" {...props} />
);

// Button Group Component
export interface ButtonGroupProps {
  /** Buttons to display */
  children: React.ReactNode;
  /** Spacing between buttons */
  spacing?: 'tight' | 'normal' | 'loose';
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  spacing = 'normal',
  orientation = 'horizontal',
  className = ''
}) => {
  const spacingClasses = {
    tight: orientation === 'horizontal' ? 'space-x-1' : 'space-y-1',
    normal: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3',
    loose: orientation === 'horizontal' ? 'space-x-5' : 'space-y-5'
  };

  return (
    <div
      className={`
        flex
        ${orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col'}
        ${spacingClasses[spacing]}
        ${className}
      `}
      role="group"
    >
      {children}
    </div>
  );
};

export default ActionButton;