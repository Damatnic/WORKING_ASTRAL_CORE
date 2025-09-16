# Database Schema Fixes for Astral Core V5

## Issues Found

### 1. Missing Session Table Columns
The Prisma schema defines session management fields that don't exist in the database:
- `sessionTokenIV` - IV for encrypted session tokens
- `sessionTokenAuthTag` - Authentication tag for session tokens  
- `refreshTokenIV` - IV for refresh tokens
- `refreshTokenAuthTag` - Authentication tag for refresh tokens
- `status` - Session status enum (ACTIVE, IDLE, EXPIRED, TERMINATED, LOCKED)
- `mfaVerified` - MFA verification status
- Various session management fields (ipAddress, userAgent, deviceFingerprint, etc.)

### 2. Missing Related Tables
- `SessionActivity` - Session activity tracking
- `SessionEventLog` - Session event logging
- `AuditEvent` - HIPAA compliance audit events
- `MFASettings` - Multi-factor authentication settings

### 3. Component Export Issues (FIXED)
- `LoadingPresets` was not exported from the main loading component file

## Solutions Implemented

### 1. Migration Files Created
- `prisma/migrations/20241206000010_fix_session_schema/migration.sql` - Adds missing Session table columns
- `scripts/fix-database-schema.sql` - Manual database fix script for production environments

### 2. LoadingPresets Export Fixed
- Added proper export in `src/components/loading.tsx`:
```typescript
export { LoadingPresets } from './loading/exports';
```

## Database Migration Status

The following migrations need to be applied:
1. `20241206000003_add_encrypted_field_hashes` - Adds searchable hash columns for encrypted PHI fields
2. `20241206000004_add_audit_events_table` - Creates HIPAA compliance audit event tables
3. `20241206000005_add_mfa_settings` - Adds multi-factor authentication tables
4. `20241206000010_fix_session_schema` - Fixes missing session management columns

## Manual Database Fix

If automatic migrations fail due to database connectivity issues, run the manual fix script:

```sql
psql -U postgres -d your_database -f scripts/fix-database-schema.sql
```

Or apply the SQL content directly to your database.

## Key Features Added

### Session Management
- Encrypted session tokens with IV and authentication tags
- Session status tracking (ACTIVE, IDLE, EXPIRED, TERMINATED, LOCKED)
- MFA verification tracking
- Device fingerprinting for security
- Idle and absolute timeout management
- Session activity logging

### Security Enhancements
- HIPAA-compliant audit event logging
- MFA settings management
- Trusted device management
- Encrypted field hashing for searchability

### Mental Health App Features
- All session management respects HIPAA compliance requirements
- Crisis intervention tracking through session events
- User activity monitoring for therapy engagement
- Privacy-first session handling

## Environment Variables Required

Ensure these environment variables are set:
```env
DATABASE_URL="your_postgres_connection_string"
AUDIT_LOG_KEY="32-character-audit-log-encryption-key"
ENCRYPTION_KEY="32-character-field-encryption-key"
MASTER_ENCRYPTION_KEY="master-key-for-key-derivation"
ENCRYPTION_SALT="salt-for-key-derivation"
```

## Verification

After applying fixes, verify with:
```sql
-- Check Session table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Session'
ORDER BY ordinal_position;

-- Check for missing migrations
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;
```

## Next Steps

1. Start database services (PostgreSQL)
2. Apply pending migrations: `npx prisma migrate dev`
3. Generate Prisma client: `npx prisma generate`
4. Restart application servers
5. Verify all functionality works correctly

## Development Notes

- The application now uses modern crypto APIs (createCipherGCM instead of deprecated createCipher)
- All session-related operations are HIPAA compliant
- Session management includes proper cleanup and monitoring
- Mental health app specific features are preserved and enhanced