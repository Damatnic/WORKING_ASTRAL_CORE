-- Create audit events table for HIPAA compliance
-- This table stores encrypted audit logs with proper indexing and partitioning

-- Create audit events table
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" SERIAL PRIMARY KEY,
    "eventId" TEXT UNIQUE NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    
    -- Encrypted event data
    "encryptedData" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    
    -- Searchable fields (not encrypted for query performance)
    "userId" TEXT,
    "userEmail" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "sourceIp" INET,
    
    -- Retention and compliance
    "retentionPeriod" INTEGER NOT NULL DEFAULT 2555, -- 7 years in days
    "requiresNotification" BOOLEAN NOT NULL DEFAULT false,
    
    -- Integrity and versioning
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_eventId_idx" ON "AuditEvent"("eventId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_category_idx" ON "AuditEvent"("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_riskLevel_idx" ON "AuditEvent"("riskLevel");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_outcome_idx" ON "AuditEvent"("outcome");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_userId_idx" ON "AuditEvent"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_userEmail_idx" ON "AuditEvent"("userEmail");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_resourceType_idx" ON "AuditEvent"("resourceType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_resourceId_idx" ON "AuditEvent"("resourceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_sourceIp_idx" ON "AuditEvent"("sourceIp");

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_user_timestamp_idx" ON "AuditEvent"("userId", "timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_resource_timestamp_idx" ON "AuditEvent"("resourceType", "resourceId", "timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_category_timestamp_idx" ON "AuditEvent"("category", "timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_risk_timestamp_idx" ON "AuditEvent"("riskLevel", "timestamp");

-- Full-text search index for descriptions and actions (when needed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditEvent_search_idx" ON "AuditEvent" USING gin(to_tsvector('english', "encryptedData"));

-- Table partitioning by month for better performance (PostgreSQL 10+)
-- This helps with large audit datasets and supports efficient data retention policies

-- Create partitioned table structure
CREATE TABLE IF NOT EXISTS "AuditEvent_Partitioned" (
    LIKE "AuditEvent" INCLUDING ALL
) PARTITION BY RANGE ("timestamp");

-- Create partitions for the next 12 months
-- In production, these should be created automatically by a scheduled job

-- Example partition for current month (would be dynamic in production)
-- CREATE TABLE IF NOT EXISTS "AuditEvent_2024_12" PARTITION OF "AuditEvent_Partitioned"
-- FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- Create compliance summary table for quick reporting
CREATE TABLE IF NOT EXISTS "ComplianceReport" (
    "id" SERIAL PRIMARY KEY,
    "reportId" TEXT UNIQUE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    
    -- Report metadata
    "generatedByUserId" TEXT NOT NULL,
    "generatedByEmail" TEXT NOT NULL,
    "generatedByRole" TEXT NOT NULL,
    
    -- Report content (encrypted)
    "encryptedReport" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    
    -- Quick access statistics (for dashboard display)
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "phiAccessEvents" INTEGER NOT NULL DEFAULT 0,
    "securityIncidents" INTEGER NOT NULL DEFAULT 0,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "complianceScore" DECIMAL(5,2), -- 0-100 compliance score
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for compliance reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceReport_reportId_idx" ON "ComplianceReport"("reportId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceReport_generatedAt_idx" ON "ComplianceReport"("generatedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceReport_period_idx" ON "ComplianceReport"("periodStart", "periodEnd");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceReport_generatedBy_idx" ON "ComplianceReport"("generatedByUserId");

-- Create function to automatically clean up old audit records based on retention policy
CREATE OR REPLACE FUNCTION cleanup_expired_audit_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete events older than their retention period
    DELETE FROM "AuditEvent" 
    WHERE "timestamp" < NOW() - INTERVAL '1 day' * "retentionPeriod"
    AND "requiresNotification" = false; -- Keep notification-required events longer
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
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
            'action', 'AUDIT_CLEANUP',
            'description', 'Cleaned up expired audit events',
            'deletedCount', deleted_count
        )::text, 'utf8'), 'base64'),
        'placeholder_auth_tag',
        'placeholder_checksum'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to run cleanup weekly (requires pg_cron extension)
-- SELECT cron.schedule('audit-cleanup', '0 2 * * 0', 'SELECT cleanup_expired_audit_events();');

-- Create function to validate audit event integrity
CREATE OR REPLACE FUNCTION validate_audit_event_integrity(event_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    event_record RECORD;
    calculated_checksum TEXT;
BEGIN
    -- Get the event
    SELECT * INTO event_record FROM "AuditEvent" WHERE "eventId" = event_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- In a real implementation, this would decrypt and recalculate the checksum
    -- For now, just verify the checksum exists and is not empty
    IF event_record."checksum" IS NULL OR event_record."checksum" = '' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add row-level security (RLS) for audit events
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceReport" ENABLE ROW LEVEL SECURITY;

-- Create policies for audit event access
-- Only system administrators and compliance officers can access audit logs
CREATE POLICY "audit_event_access" ON "AuditEvent"
    FOR ALL
    TO PUBLIC
    USING (
        -- This would check user role from session context
        current_setting('app.user_role', true) IN ('ADMIN', 'COMPLIANCE_OFFICER')
        OR current_setting('app.user_id', true) = "userId" -- Users can see their own events
    );

CREATE POLICY "compliance_report_access" ON "ComplianceReport"
    FOR ALL
    TO PUBLIC
    USING (
        current_setting('app.user_role', true) IN ('ADMIN', 'COMPLIANCE_OFFICER')
        OR current_setting('app.user_id', true) = "generatedByUserId"
    );

-- Add comments for documentation
COMMENT ON TABLE "AuditEvent" IS 'HIPAA compliant audit trail for all system activities';
COMMENT ON COLUMN "AuditEvent"."eventId" IS 'Unique identifier for the audit event';
COMMENT ON COLUMN "AuditEvent"."encryptedData" IS 'AES-256-GCM encrypted event data';
COMMENT ON COLUMN "AuditEvent"."authTag" IS 'Authentication tag for encrypted data integrity';
COMMENT ON COLUMN "AuditEvent"."checksum" IS 'SHA-256 checksum for event integrity verification';
COMMENT ON COLUMN "AuditEvent"."retentionPeriod" IS 'Days to retain this audit record (HIPAA: minimum 7 years)';
COMMENT ON COLUMN "AuditEvent"."requiresNotification" IS 'Whether this event requires regulatory notification';

COMMENT ON TABLE "ComplianceReport" IS 'Generated HIPAA compliance reports';
COMMENT ON COLUMN "ComplianceReport"."signature" IS 'Digital signature for report integrity';
COMMENT ON COLUMN "ComplianceReport"."complianceScore" IS 'Calculated compliance score (0-100)';

-- Grant appropriate permissions
-- In production, these would be more restricted
GRANT SELECT, INSERT ON "AuditEvent" TO PUBLIC;
GRANT SELECT, INSERT ON "ComplianceReport" TO PUBLIC;
GRANT USAGE ON SEQUENCE "AuditEvent_id_seq" TO PUBLIC;
GRANT USAGE ON SEQUENCE "ComplianceReport_id_seq" TO PUBLIC;