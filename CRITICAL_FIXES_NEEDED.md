# Critical Files Requiring Immediate Fixes

## Files with 50+ TypeScript Errors (Build Blockers)

### 1. `src/app/api/therapy/appointments/route.ts` (73 errors)
**Critical Issues:**
- Multiple Prisma model mismatches
- Type definition conflicts
- Missing required fields in database operations
- Response handler type errors

### 2. `src/app/api/therapy/assessments/route.ts` (75 errors)
**Critical Issues:**
- Assessment schema type mismatches
- Database query parameter errors
- Missing enum values
- API response format inconsistencies

### 3. `src/app/api/therapy/billing/route.ts` (72 errors)
**Critical Issues:**
- Billing calculation type errors
- Payment processing interface mismatches
- Currency handling type issues
- Database field mapping errors

### 4. `src/app/api/therapy/sessions/route.ts` (69 errors)
**Critical Issues:**
- Session management type conflicts
- WebSocket integration errors
- Time/date handling type mismatches
- HIPAA compliance field access issues

### 5. `src/app/api/therapy/notes/route.ts` (51 errors)
**Critical Issues:**
- Encrypted note handling type errors
- Validation middleware integration failures
- Audit logging type mismatches
- Permission check parameter errors

### 6. `src/app/api/therapy/treatment-plans/route.ts` (47 errors)
**Critical Issues:**
- Treatment plan schema mismatches
- Goal tracking type conflicts
- Progress calculation errors
- Client relationship mapping issues

### 7. `src/app/api/therapy/clients/route.ts` (39 errors)
**Critical Issues:**
- Client management type mismatches
- Encryption field handling errors
- Search functionality type conflicts
- Pagination parameter issues

## Core Infrastructure Files (20+ errors each)

### 8. `src/services/analytics/analyticsService.ts` (24 errors)
**Critical Issues:**
- Database aggregation query type mismatches
- Metrics calculation errors
- Event logging schema conflicts
- Privacy level handling type errors

### 9. `src/lib/monitoring/health/route.ts` (18 errors)
**Critical Issues:**
- Health check response type errors
- System metrics type mismatches
- Database connection check failures
- Performance monitoring integration issues

### 10. `src/lib\websocket/server.ts` (16 errors)
**Critical Issues:**
- WebSocket connection type conflicts
- Event handler parameter type errors
- Notification system integration failures
- User role validation type mismatches

## Files Requiring Schema Updates

These files have errors directly related to Prisma schema mismatches:

1. **Analytics Service** - References non-existent `moodScoreEntry` table
2. **Audit Services** - Missing `eventType` and `eventName` fields
3. **Safety Alert System** - Missing `metadata` field
4. **Crisis Management** - Missing `notes` field in CrisisAlert
5. **WebSocket Services** - Type conflicts with user roles and message reactions

## Immediate Action Required

**Priority 1 (Today):**
1. Update Prisma schema to match code expectations
2. Fix validation middleware constructor calls
3. Resolve NextAuth type conflicts
4. Fix WebSocket server initialization

**Priority 2 (Tomorrow):**
1. Fix all therapy API routes (6 files with 300+ combined errors)
2. Resolve analytics service database queries
3. Fix monitoring system health checks
4. Update authentication middleware

**Build Status:** 🔴 **COMPLETELY BROKEN** - Project cannot compile or run

**Estimated Fix Time:** 2-3 days of focused development work
