// Explicit exports for crisis types to resolve TypeScript module resolution issues
// This file provides a clear export manifest for all crisis-related types

export type {
  // Response interfaces
  CounselorDashboardResponse,
  CounselorStats,
  AlertResponse,
  ReportResponse,
  InterventionResponse,
  EscalationResponse,
  
  // Request interfaces
  CreateReportRequest,
  UpdateReportRequest,
  
  // Utility interfaces
  ReportFilters,
  PaginatedResponse,
  CrisisResponse,
  ValidationError,
  
  // Crisis core interfaces
  CrisisAlert,
  CrisisAlertPayload,
} from './crisis';

export {
  // Enums (these are values, not types)
  CrisisSeverity,
  TriggerType,
  InterventionType,
  ReportStatus
} from './crisis';

// Re-export everything for backwards compatibility
export * from './crisis';