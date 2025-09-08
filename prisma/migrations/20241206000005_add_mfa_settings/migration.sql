-- Add MFA (Multi-Factor Authentication) settings table for HIPAA compliance
-- Clinical roles require MFA for PHI access

-- Create MFA methods enum type
CREATE TYPE "MFAMethod" AS ENUM ('TOTP', 'SMS', 'EMAIL', 'BACKUP_CODE');
CREATE TYPE "MFAStatus" AS ENUM ('DISABLED', 'PENDING_SETUP', 'ENABLED', 'TEMPORARILY_DISABLED');

-- Create MFA settings table
CREATE TABLE IF NOT EXISTS "MFASettings" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "method" "MFAMethod" NOT NULL,
    "status" "MFAStatus" NOT NULL DEFAULT 'DISABLED',
    
    -- Encrypted secrets and settings
    "secret" TEXT, -- Encrypted TOTP secret
    "phoneNumber" TEXT, -- Encrypted phone number for SMS
    "backupCodes" TEXT[], -- Encrypted backup recovery codes
    
    -- Security tracking
    "lastUsed" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to User table
    CONSTRAINT "MFASettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    
    -- Ensure one record per user per method
    CONSTRAINT "MFASettings_userId_method_key" UNIQUE ("userId", "method")
);

-- Create indexes for efficient querying
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_userId_idx" ON "MFASettings"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_method_idx" ON "MFASettings"("method");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_status_idx" ON "MFASettings"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_lastUsed_idx" ON "MFASettings"("lastUsed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_lockedUntil_idx" ON "MFASettings"("lockedUntil");

-- Composite index for user MFA lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFASettings_userId_status_idx" ON "MFASettings"("userId", "status");

-- Create trusted devices table for "remember this device" functionality
CREATE TABLE IF NOT EXISTS "TrustedDevice" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL, -- Hashed device characteristics
    "trustToken" TEXT NOT NULL, -- Encrypted trust token
    "deviceName" TEXT, -- User-friendly device name
    "ipAddress" INET,
    "userAgent" TEXT,
    "location" JSONB, -- Geographic location data
    
    -- Trust management
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "expiresAt" TIMESTAMP(3) NOT NULL, -- Trust expiration (e.g., 30 days)
    "lastUsed" TIMESTAMP(3),
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to User table
    CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Indexes for trusted devices
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrustedDevice_trustToken_idx" ON "TrustedDevice"("trustToken");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrustedDevice_deviceFingerprint_idx" ON "TrustedDevice"("deviceFingerprint");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrustedDevice_expiresAt_idx" ON "TrustedDevice"("expiresAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrustedDevice_isActive_idx" ON "TrustedDevice"("isActive");

-- Create temporary MFA codes table for SMS/Email verification
CREATE TABLE IF NOT EXISTS "MFATemporaryCode" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "method" "MFAMethod" NOT NULL,
    "codeHash" TEXT NOT NULL, -- Hashed verification code
    "purpose" TEXT NOT NULL, -- 'SETUP' or 'LOGIN'
    
    -- Expiration and rate limiting
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    
    -- Request context
    "ipAddress" INET,
    "userAgent" TEXT,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to User table
    CONSTRAINT "MFATemporaryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Indexes for temporary codes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFATemporaryCode_userId_idx" ON "MFATemporaryCode"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFATemporaryCode_expiresAt_idx" ON "MFATemporaryCode"("expiresAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MFATemporaryCode_codeHash_idx" ON "MFATemporaryCode"("codeHash");

-- Add MFA requirement fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnforced" BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for MFA requirements
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_mfaRequired_idx" ON "User"("mfaRequired");

-- Update existing users to require MFA for clinical roles
UPDATE "User" SET 
    "mfaRequired" = TRUE,
    "mfaEnforced" = TRUE
WHERE "role" IN ('THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER');

-- Create function to automatically set MFA requirements based on role
CREATE OR REPLACE FUNCTION update_mfa_requirements()
RETURNS TRIGGER AS $$
BEGIN
    -- Set MFA requirements for clinical roles
    IF NEW.role IN ('THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER') THEN
        NEW.mfaRequired := TRUE;
        NEW.mfaEnforced := TRUE;
    ELSE
        NEW.mfaRequired := FALSE;
        NEW.mfaEnforced := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update MFA requirements on role changes
CREATE TRIGGER update_user_mfa_requirements
    BEFORE INSERT OR UPDATE OF role ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_mfa_requirements();

-- Create function to clean up expired temporary codes and trusted devices
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_codes INTEGER := 0;
    deleted_devices INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    -- Delete expired temporary codes
    DELETE FROM "MFATemporaryCode" WHERE "expiresAt" < NOW();
    GET DIAGNOSTICS deleted_codes = ROW_COUNT;
    
    -- Delete expired trusted devices
    DELETE FROM "TrustedDevice" WHERE "expiresAt" < NOW() OR ("isActive" = FALSE AND "lastUsed" < NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS deleted_devices = ROW_COUNT;
    
    total_deleted := deleted_codes + deleted_devices;
    
    -- Log cleanup if any records were deleted
    IF total_deleted > 0 THEN
        INSERT INTO "AuditEvent" (
            "eventId", "category", "riskLevel", "outcome", 
            "encryptedData", "authTag", "checksum"
        ) VALUES (
            gen_random_uuid()::text,
            'SYSTEM_CONFIGURATION_CHANGE',
            'LOW',
            'SUCCESS',
            -- This would be properly encrypted in the application
            encode(convert_to(json_build_object(
                'action', 'MFA_CLEANUP',
                'description', 'Cleaned up expired MFA data',
                'deletedCodes', deleted_codes,
                'deletedDevices', deleted_devices
            )::text, 'utf8'), 'base64'),
            'placeholder_auth_tag',
            'placeholder_checksum'
        );
    END IF;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create function to check MFA status for user
CREATE OR REPLACE FUNCTION check_user_mfa_status(user_id TEXT)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    mfa_methods JSON;
    result JSON;
BEGIN
    -- Get user information
    SELECT * INTO user_record FROM "User" WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Get enabled MFA methods
    SELECT json_agg(
        json_build_object(
            'method', method,
            'status', status,
            'lastUsed', "lastUsed",
            'failedAttempts', "failedAttempts"
        )
    ) INTO mfa_methods
    FROM "MFASettings" 
    WHERE "userId" = user_id AND status = 'ENABLED';
    
    -- Build result
    result := json_build_object(
        'userId', user_id,
        'mfaRequired', user_record."mfaRequired",
        'mfaEnforced', user_record."mfaEnforced",
        'enabledMethods', COALESCE(mfa_methods, '[]'::json),
        'hasEnabledMFA', (SELECT COUNT(*) > 0 FROM "MFASettings" WHERE "userId" = user_id AND status = 'ENABLED')
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate MFA compliance
CREATE OR REPLACE FUNCTION validate_mfa_compliance()
RETURNS TABLE (
    user_id TEXT,
    email TEXT,
    role TEXT,
    mfa_required BOOLEAN,
    has_mfa BOOLEAN,
    compliance_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.role,
        u."mfaRequired",
        (SELECT COUNT(*) > 0 FROM "MFASettings" mfa WHERE mfa."userId" = u.id AND mfa.status = 'ENABLED') as has_mfa,
        CASE 
            WHEN u."mfaRequired" = TRUE AND (SELECT COUNT(*) = 0 FROM "MFASettings" mfa WHERE mfa."userId" = u.id AND mfa.status = 'ENABLED') 
            THEN 'NON_COMPLIANT'
            WHEN u."mfaRequired" = TRUE AND (SELECT COUNT(*) > 0 FROM "MFASettings" mfa WHERE mfa."userId" = u.id AND mfa.status = 'ENABLED') 
            THEN 'COMPLIANT'
            ELSE 'NOT_REQUIRED'
        END as compliance_status
    FROM "User" u
    WHERE u."isActive" = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add row-level security for MFA settings
ALTER TABLE "MFASettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrustedDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MFATemporaryCode" ENABLE ROW LEVEL SECURITY;

-- Create policies for MFA settings access
CREATE POLICY "mfa_settings_access" ON "MFASettings"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "trusted_device_access" ON "TrustedDevice"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "mfa_temp_code_access" ON "MFATemporaryCode"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

-- Create scheduled job to clean up expired MFA data daily (requires pg_cron extension)
-- SELECT cron.schedule('mfa-cleanup', '0 1 * * *', 'SELECT cleanup_expired_mfa_data();');

-- Add comments for documentation
COMMENT ON TABLE "MFASettings" IS 'Multi-factor authentication settings for users (HIPAA compliance for clinical roles)';
COMMENT ON COLUMN "MFASettings"."secret" IS 'Encrypted TOTP secret key';
COMMENT ON COLUMN "MFASettings"."phoneNumber" IS 'Encrypted phone number for SMS authentication';
COMMENT ON COLUMN "MFASettings"."backupCodes" IS 'Array of encrypted backup recovery codes';
COMMENT ON COLUMN "MFASettings"."failedAttempts" IS 'Number of consecutive failed verification attempts';
COMMENT ON COLUMN "MFASettings"."lockedUntil" IS 'Timestamp when account lock expires after failed attempts';

COMMENT ON TABLE "TrustedDevice" IS 'Trusted devices for MFA bypass (remember this device functionality)';
COMMENT ON COLUMN "TrustedDevice"."deviceFingerprint" IS 'Hashed unique device characteristics';
COMMENT ON COLUMN "TrustedDevice"."trustToken" IS 'Encrypted token for device verification';
COMMENT ON COLUMN "TrustedDevice"."expiresAt" IS 'When device trust expires (typically 30 days)';

COMMENT ON TABLE "MFATemporaryCode" IS 'Temporary verification codes for SMS/Email MFA';
COMMENT ON COLUMN "MFATemporaryCode"."codeHash" IS 'SHA-256 hash of verification code';
COMMENT ON COLUMN "MFATemporaryCode"."purpose" IS 'Whether code is for setup or login verification';

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "MFASettings" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON "TrustedDevice" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON "MFATemporaryCode" TO PUBLIC;

-- Create view for MFA compliance reporting
CREATE VIEW "MFAComplianceView" AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    u."mfaRequired",
    u."mfaEnforced",
    u."isActive",
    COUNT(mfa.id) as mfa_methods_count,
    array_agg(mfa.method) FILTER (WHERE mfa.status = 'ENABLED') as enabled_methods,
    MAX(mfa."lastUsed") as last_mfa_used,
    CASE 
        WHEN u."mfaRequired" = TRUE AND COUNT(mfa.id) FILTER (WHERE mfa.status = 'ENABLED') = 0 
        THEN 'NON_COMPLIANT'
        WHEN u."mfaRequired" = TRUE AND COUNT(mfa.id) FILTER (WHERE mfa.status = 'ENABLED') > 0 
        THEN 'COMPLIANT'
        ELSE 'NOT_REQUIRED'
    END as compliance_status
FROM "User" u
LEFT JOIN "MFASettings" mfa ON u.id = mfa."userId"
WHERE u."isActive" = TRUE
GROUP BY u.id, u.email, u.role, u."mfaRequired", u."mfaEnforced", u."isActive";

-- Grant access to compliance view
GRANT SELECT ON "MFAComplianceView" TO PUBLIC;