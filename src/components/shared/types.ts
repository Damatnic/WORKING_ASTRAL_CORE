/**
 * Shared TypeScript interfaces and types for dashboard components
 * Provides consistent typing across all dashboard implementations
 */

// User and Role Types
export type UserRole = 'user' | 'helper' | 'therapist' | 'crisis_counselor' | 'admin';

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Client/Patient Types
export interface BaseClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  riskLevel: RiskLevel;
  joinedDate: Date | string;
  lastContact?: Date | string;
  nextAppointment?: Date | string;
  notes?: string;
}

export type ClientStatus = 
  | 'active' 
  | 'inactive' 
  | 'on_hold' 
  | 'completed' 
  | 'terminated'
  | 'assessment'
  | 'intake';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'crisis' | 'imminent';

// Session Types
export interface BaseSession {
  id: string;
  clientId: string;
  clientName: string;
  scheduledTime: Date | string;
  duration: number; // in minutes
  type: SessionType;
  status: SessionStatus;
  notes?: string;
}

export type SessionType = 'video' | 'phone' | 'chat' | 'in_person' | 'group';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

// Statistics Types
export interface DashboardStats {
  [key: string]: number | string;
}

// Alert Types
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date | string;
  resolved: boolean;
  actionRequired?: boolean;
}

export type AlertType = 
  | 'security' 
  | 'performance' 
  | 'system' 
  | 'user_activity' 
  | 'crisis' 
  | 'maintenance'
  | 'high_risk_client'
  | 'repeated_contact'
  | 'no_contact'
  | 'escalation';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Filter Types
export interface FilterState {
  search: string;
  status?: string;
  riskLevel?: string;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  [key: string]: any;
}

// Pagination Types
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// Sort Types
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationState;
}

// Dashboard Context Types
export interface DashboardContextType {
  user: BaseUser | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  sortConfig: SortConfig | null;
  setSortConfig: (config: SortConfig | null) => void;
}

// Common Props Types
export interface DashboardComponentProps {
  className?: string;
  isLoading?: boolean;
  error?: string | null;
}

// Accessibility Types
export interface AccessibilityProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  role?: string;
  tabIndex?: number;
}

// Theme Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  light: string;
  dark: string;
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: Date | string;
  value: number;
  label?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date | string;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
}

// Activity Types
export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Permission Types
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  allowed: boolean;
}

export interface UserPermissions {
  [resource: string]: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
}