/**
 * Shared Components Library
 * Central export for all reusable dashboard components
 */

// Layout Components
export { default as DashboardLayout } from './DashboardLayout';
export type { DashboardLayoutProps } from './DashboardLayout';

// Data Display Components
export { default as StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { default as DataTable } from './DataTable';
export type { DataTableProps, Column } from './DataTable';

export { default as EmptyState, NoDataEmptyState, NoResultsEmptyState, ErrorEmptyState, ComingSoonEmptyState, NoClientsEmptyState, NoSessionsEmptyState, NoMessagesEmptyState, NoNotesEmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Form & Input Components
export { default as FilterControls } from './FilterControls';
export type { FilterControlsProps, FilterConfig, FilterOption } from './FilterControls';

export { default as ActionButton, PrimaryButton, SecondaryButton, SuccessButton, DangerButton, WarningButton, GhostButton, OutlineButton, ButtonGroup } from './ActionButton';
export type { ActionButtonProps, ButtonGroupProps } from './ActionButton';

// Navigation Components
export { default as Pagination, SimplePagination } from './Pagination';
export type { PaginationProps } from './Pagination';

// Feedback Components
export { LoadingSpinner, Skeleton, ProgressBar, CardSkeleton, TableSkeleton, DashboardSkeleton } from './LoadingStates';
export type { LoadingSpinnerProps, SkeletonProps, ProgressBarProps } from './LoadingStates';

export { default as ErrorBoundary, useErrorHandler, withErrorBoundary } from './ErrorBoundary';
export type { ErrorFallbackProps } from './ErrorBoundary';

// Overlay Components
export { default as Modal, ConfirmationModal } from './Modal';
export type { ModalProps, ConfirmationModalProps } from './Modal';

// Type Definitions
export * from './types';

// Theme & Styling
export * from './theme';

// Utility Hooks (to be added)
// export * from './hooks';

// Utility Functions (to be added)
// export * from './utils';