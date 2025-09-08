// Explicit exports for auth-middleware to resolve TypeScript module resolution issues
// This file provides a clear export manifest for all auth-middleware functions and types

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

// Re-export everything for backwards compatibility
export * from './auth-middleware';