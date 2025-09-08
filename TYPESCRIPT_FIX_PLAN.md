# TypeScript Error Fix Plan - Astral Core V5

## Current Status
- **Total Errors**: 200+ TypeScript errors across multiple files
- **Main Categories**: Prisma types, Zod validation, WebSocket events, missing properties, type mismatches

## Error Categories & Solutions

### 1. Prisma Model Reference Errors
**Files Affected**: Multiple API routes and services
**Issues**:
- Missing `id` field in create operations
- Non-existent models (treatmentPlan, careTeamMember, patientAssignment)
- Incorrect field references

**Solution**: Add missing `id` fields using `crypto.randomUUID()` or `cuid()` for all Prisma create operations

### 2. Zod Validation Errors
**Files Affected**: Community routes, validation middleware
**Issues**:
- `.errors` property doesn't exist (should be `.issues`)
- Default value type mismatches

**Solution**: Replace all `.errors` with `.issues` throughout the codebase

### 3. WebSocket Event Type Errors
**Files Affected**: lib/websocket/*, crisis-manager.ts
**Issues**:
- Missing or incorrect event names
- Property mismatches on crisis alerts
- Non-existent notification types

**Solution**: Update event definitions to match actual implementation

### 4. Validation Service Duplicate Exports
**Files Affected**: lib/validation/schemas.ts
**Issues**:
- Multiple declarations of the same export names
- Type/value confusion with ValidationService

**Solution**: Remove duplicate exports and fix ValidationService references

### 5. Session & Encryption Type Errors
**Files Affected**: lib/session/*, lib/encryption/*
**Issues**:
- EncryptedField property mismatches
- Missing encryption type imports

**Solution**: Fix EncryptedField interface to match actual usage

### 6. Test Utilities Type Errors
**Files Affected**: lib/test-utils/*
**Issues**:
- Jest matcher type conflicts
- Faker.js API changes

**Solution**: Update test utilities to match current library versions

## Implementation Order

### Phase 1: Critical Infrastructure (Blocking other fixes)
1. Fix Prisma create operations - add missing `id` fields
2. Fix ValidationService class/instance issues
3. Fix EncryptedField type definition
4. Fix WebSocket event constants

### Phase 2: API Routes
1. Fix all Zod .errors to .issues
2. Fix Prisma model references
3. Add proper type guards and null checks

### Phase 3: Services & Libraries
1. Fix crisis management types
2. Fix session management types
3. Fix test utilities

### Phase 4: Cleanup
1. Remove duplicate exports
2. Fix remaining type assertions
3. Add missing type imports

## Files to Fix (Priority Order)

### High Priority (Core functionality)
1. `src/lib/validation/schemas.ts` - Remove duplicate exports
2. `src/app/api/community/chat-rooms/route.ts` - Fix Prisma operations
3. `src/lib/websocket/events.ts` - Fix event definitions
4. `src/lib/session/session-manager.ts` - Fix encryption types

### Medium Priority (Features)
5. `src/lib/websocket/crisis-manager.ts` - Fix crisis types
6. `src/lib/socket-server.ts` - Fix Prisma operations
7. `src/services/crisis-intervention.ts` - Fix Prisma queries
8. `src/lib/security/rbac.ts` - Remove non-existent models

### Low Priority (Tests & Utils)
9. `src/lib/test-utils/*.ts` - Update test utilities
10. `src/lib/utils.ts` - Add null checks

## Estimated Fix Count by Category
- Prisma `id` field additions: ~50 fixes
- Zod `.errors` to `.issues`: ~30 fixes  
- WebSocket event constants: ~25 fixes
- Duplicate exports: ~10 fixes
- Type assertions/checks: ~40 fixes
- Missing imports: ~15 fixes
- Property mismatches: ~30 fixes

**Total Estimated Fixes**: ~200

## Next Steps
1. Start with Phase 1 fixes to unblock other corrections
2. Run `npm run typecheck` after each phase to verify progress
3. Document any breaking changes that might affect runtime
4. Create unit tests for critical type fixes