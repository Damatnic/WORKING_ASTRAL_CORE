// Library Module Exports
// Central export point for all library modules

// Auth and middleware exports
export type {
  // Types
  AuthenticatedRequest,
} from './auth-middleware';

export {
  // Core middleware functions
  withAuth,
  withRoles,
  withPermission,
  withEmailVerification,
  withOnboarding,
  
  // Preset role middleware
  withAdmin,
  withHelper,
  withCrisisCounselor,
  
  // Rate limiting
  withRateLimit,
  
  // API key validation
  withApiKey,
  
  // Helper functions
  getUserFromRequest,
  getCurrentUser,
  canAccessResource
} from './auth-middleware';

// Re-export all from auth-middleware for backwards compatibility
export * from './auth-middleware';

// Export other lib modules
export * from './prisma';
export * from './encryption';
export * from './websocket-exports';
export * from './api-middleware';
export * from './auth';
export * from './validation/schemas';