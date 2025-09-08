-- Add session management tables for HIPAA-compliant session handling
-- Includes session tracking, activity monitoring, and concurrent session limits

-- Create session status enum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'IDLE', 'EXPIRED', 'TERMINATED', 'LOCKED');

-- Create sessions table
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    
    -- Encrypted session tokens
    "sessionToken" TEXT NOT NULL,
    "sessionTokenIV" TEXT,
    "sessionTokenAuthTag" TEXT,
    "refreshToken" TEXT,
    "refreshTokenIV" TEXT,
    "refreshTokenAuthTag" TEXT,
    
    -- Session state
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Client information
    "ipAddress" INET,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT, -- Hashed device characteristics
    
    -- Timing
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idleExpiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    
    -- Termination tracking
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to User table
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_idx" ON "Session"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_lastActivity_idx" ON "Session"("lastActivity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_deviceFingerprint_idx" ON "Session"("deviceFingerprint");

-- Composite indexes for session lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_userId_status_idx" ON "Session"("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");

-- Create session activity tracking table
CREATE TABLE IF NOT EXISTS "SessionActivity" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    
    -- Activity details
    "activityType" TEXT NOT NULL, -- PAGE_VIEW, API_CALL, DATA_ACCESS, PHI_ACCESS
    "resource" TEXT, -- Path or resource accessed
    "ipAddress" INET,
    
    -- Timing
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional metadata
    "metadata" JSONB DEFAULT '{}',
    
    -- Foreign key to Session table
    CONSTRAINT "SessionActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

-- Create indexes for activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionActivity_sessionId_idx" ON "SessionActivity"("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionActivity_timestamp_idx" ON "SessionActivity"("timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionActivity_activityType_idx" ON "SessionActivity"("activityType");

-- Composite index for activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionActivity_sessionId_timestamp_idx" ON "SessionActivity"("sessionId", "timestamp");

-- Create concurrent session tracking table
CREATE TABLE IF NOT EXISTS "ConcurrentSessionLimit" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "role" TEXT NOT NULL UNIQUE,
    "maxSessions" INTEGER NOT NULL DEFAULT 3,
    "enforced" BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default concurrent session limits
INSERT INTO "ConcurrentSessionLimit" ("role", "maxSessions", "enforced") VALUES
    ('USER', 3, TRUE),
    ('THERAPIST', 2, TRUE),
    ('CRISIS_COUNSELOR', 2, TRUE),
    ('ADMIN', 1, TRUE),
    ('SUPER_ADMIN', 1, TRUE),
    ('HELPER', 3, TRUE),
    ('COMPLIANCE_OFFICER', 1, TRUE)
ON CONFLICT ("role") DO NOTHING;

-- Create session event log table
CREATE TABLE IF NOT EXISTS "SessionEventLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Event details
    "eventType" TEXT NOT NULL, -- LOGIN, LOGOUT, TIMEOUT, FORCE_LOGOUT, IP_CHANGE, etc.
    "eventData" JSONB DEFAULT '{}',
    
    -- Context
    "ipAddress" INET,
    "userAgent" TEXT,
    
    -- Timing
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "SessionEventLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE,
    CONSTRAINT "SessionEventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes for event log
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionEventLog_sessionId_idx" ON "SessionEventLog"("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionEventLog_userId_idx" ON "SessionEventLog"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionEventLog_eventType_idx" ON "SessionEventLog"("eventType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionEventLog_timestamp_idx" ON "SessionEventLog"("timestamp");

-- Create function to check concurrent sessions
CREATE OR REPLACE FUNCTION check_concurrent_sessions(p_user_id TEXT, p_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    active_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get max allowed sessions for role
    SELECT "maxSessions" INTO max_allowed
    FROM "ConcurrentSessionLimit"
    WHERE "role" = p_role AND "enforced" = TRUE;
    
    IF max_allowed IS NULL THEN
        max_allowed := 3; -- Default limit
    END IF;
    
    -- Count active sessions
    SELECT COUNT(*) INTO active_count
    FROM "Session"
    WHERE "userId" = p_user_id 
    AND "status" = 'ACTIVE'
    AND "expiresAt" > NOW();
    
    RETURN active_count < max_allowed;
END;
$$ LANGUAGE plpgsql;

-- Create function to terminate idle sessions
CREATE OR REPLACE FUNCTION terminate_idle_sessions()
RETURNS INTEGER AS $$
DECLARE
    terminated_count INTEGER := 0;
BEGIN
    -- Update idle sessions
    UPDATE "Session"
    SET 
        "status" = 'EXPIRED',
        "terminatedAt" = NOW(),
        "terminationReason" = 'IDLE_TIMEOUT'
    WHERE 
        "status" = 'ACTIVE'
        AND "idleExpiresAt" < NOW();
    
    GET DIAGNOSTICS terminated_count = ROW_COUNT;
    
    -- Log termination if any sessions were terminated
    IF terminated_count > 0 THEN
        INSERT INTO "AuditEvent" (
            "eventId", "category", "riskLevel", "outcome",
            "encryptedData", "authTag", "checksum"
        ) VALUES (
            gen_random_uuid()::text,
            'SESSION_TERMINATED',
            'LOW',
            'SUCCESS',
            -- This would be properly encrypted in the application
            encode(convert_to(json_build_object(
                'action', 'IDLE_SESSION_CLEANUP',
                'description', 'Terminated idle sessions',
                'sessionCount', terminated_count
            )::text, 'utf8'), 'base64'),
            'placeholder_auth_tag',
            'placeholder_checksum'
        );
    END IF;
    
    RETURN terminated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to terminate expired sessions
CREATE OR REPLACE FUNCTION terminate_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    terminated_count INTEGER := 0;
BEGIN
    -- Update expired sessions
    UPDATE "Session"
    SET 
        "status" = 'EXPIRED',
        "terminatedAt" = NOW(),
        "terminationReason" = 'ABSOLUTE_TIMEOUT'
    WHERE 
        "status" = 'ACTIVE'
        AND "absoluteExpiresAt" < NOW();
    
    GET DIAGNOSTICS terminated_count = ROW_COUNT;
    
    -- Log termination if any sessions were terminated
    IF terminated_count > 0 THEN
        INSERT INTO "AuditEvent" (
            "eventId", "category", "riskLevel", "outcome",
            "encryptedData", "authTag", "checksum"
        ) VALUES (
            gen_random_uuid()::text,
            'SESSION_TERMINATED',
            'LOW',
            'SUCCESS',
            -- This would be properly encrypted in the application
            encode(convert_to(json_build_object(
                'action', 'EXPIRED_SESSION_CLEANUP',
                'description', 'Terminated expired sessions',
                'sessionCount', terminated_count
            )::text, 'utf8'), 'base64'),
            'placeholder_auth_tag',
            'placeholder_checksum'
        );
    END IF;
    
    RETURN terminated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get session statistics
CREATE OR REPLACE FUNCTION get_session_statistics(p_user_id TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'totalActive', COUNT(*) FILTER (WHERE "status" = 'ACTIVE'),
        'totalIdle', COUNT(*) FILTER (WHERE "status" = 'IDLE'),
        'totalExpired', COUNT(*) FILTER (WHERE "status" = 'EXPIRED'),
        'totalTerminated', COUNT(*) FILTER (WHERE "status" = 'TERMINATED'),
        'averageSessionDuration', AVG(
            EXTRACT(EPOCH FROM (COALESCE("terminatedAt", NOW()) - "createdAt"))
        ),
        'uniqueUsers', COUNT(DISTINCT "userId"),
        'uniqueIPs', COUNT(DISTINCT "ipAddress")
    ) INTO stats
    FROM "Session"
    WHERE (p_user_id IS NULL OR "userId" = p_user_id);
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session last activity
    UPDATE "Session"
    SET "lastActivity" = NOW()
    WHERE "id" = NEW."sessionId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_activity_trigger
    AFTER INSERT ON "SessionActivity"
    FOR EACH ROW
    EXECUTE FUNCTION update_session_activity();

-- Create trigger to log session events
CREATE OR REPLACE FUNCTION log_session_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD."status" != NEW."status" THEN
        INSERT INTO "SessionEventLog" (
            "sessionId", "userId", "eventType", "eventData",
            "ipAddress", "userAgent"
        ) VALUES (
            NEW."id",
            NEW."userId",
            CASE 
                WHEN NEW."status" = 'ACTIVE' THEN 'SESSION_ACTIVATED'
                WHEN NEW."status" = 'IDLE' THEN 'SESSION_IDLE'
                WHEN NEW."status" = 'EXPIRED' THEN 'SESSION_EXPIRED'
                WHEN NEW."status" = 'TERMINATED' THEN 'SESSION_TERMINATED'
                WHEN NEW."status" = 'LOCKED' THEN 'SESSION_LOCKED'
                ELSE 'SESSION_STATUS_CHANGE'
            END,
            json_build_object(
                'oldStatus', OLD."status",
                'newStatus', NEW."status",
                'reason', NEW."terminationReason"
            ),
            NEW."ipAddress",
            NEW."userAgent"
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_session_event_trigger
    AFTER UPDATE ON "Session"
    FOR EACH ROW
    EXECUTE FUNCTION log_session_event();

-- Create partitioned table for session activity (for performance at scale)
CREATE TABLE IF NOT EXISTS "SessionActivityPartitioned" (
    LIKE "SessionActivity" INCLUDING ALL
) PARTITION BY RANGE ("timestamp");

-- Create initial partitions (monthly)
CREATE TABLE IF NOT EXISTS "SessionActivity_2024_12" PARTITION OF "SessionActivityPartitioned"
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS "SessionActivity_2025_01" PARTITION OF "SessionActivityPartitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Create view for active sessions
CREATE VIEW "ActiveSessionsView" AS
SELECT 
    s."id",
    s."userId",
    u."email" as userEmail,
    u."role" as userRole,
    s."status",
    s."mfaVerified",
    s."ipAddress",
    s."userAgent",
    s."lastActivity",
    s."idleExpiresAt",
    s."absoluteExpiresAt",
    s."createdAt",
    EXTRACT(EPOCH FROM (NOW() - s."createdAt")) as sessionDurationSeconds,
    EXTRACT(EPOCH FROM (s."idleExpiresAt" - NOW())) as idleTimeoutInSeconds,
    EXTRACT(EPOCH FROM (s."absoluteExpiresAt" - NOW())) as absoluteTimeoutInSeconds
FROM "Session" s
JOIN "User" u ON s."userId" = u."id"
WHERE s."status" = 'ACTIVE'
AND s."expiresAt" > NOW();

-- Create view for session analytics
CREATE VIEW "SessionAnalyticsView" AS
SELECT 
    DATE_TRUNC('hour', s."createdAt") as hour,
    u."role",
    COUNT(DISTINCT s."id") as sessionCount,
    COUNT(DISTINCT s."userId") as uniqueUsers,
    AVG(EXTRACT(EPOCH FROM (COALESCE(s."terminatedAt", NOW()) - s."createdAt"))) as avgDurationSeconds,
    COUNT(*) FILTER (WHERE s."status" = 'EXPIRED') as expiredCount,
    COUNT(*) FILTER (WHERE s."status" = 'TERMINATED') as terminatedCount,
    COUNT(*) FILTER (WHERE s."terminationReason" = 'IDLE_TIMEOUT') as idleTimeoutCount,
    COUNT(*) FILTER (WHERE s."terminationReason" = 'ABSOLUTE_TIMEOUT') as absoluteTimeoutCount
FROM "Session" s
JOIN "User" u ON s."userId" = u."id"
GROUP BY DATE_TRUNC('hour', s."createdAt"), u."role";

-- Add row-level security for session tables
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionEventLog" ENABLE ROW LEVEL SECURITY;

-- Create policies for session access
CREATE POLICY "session_access" ON "Session"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
    );

CREATE POLICY "session_activity_access" ON "SessionActivity"
    FOR ALL
    TO PUBLIC
    USING (
        EXISTS (
            SELECT 1 FROM "Session" s 
            WHERE s."id" = "SessionActivity"."sessionId"
            AND (
                s."userId" = current_setting('app.user_id', true)
                OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
            )
        )
    );

CREATE POLICY "session_event_log_access" ON "SessionEventLog"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
    );

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "Session" TO PUBLIC;
GRANT SELECT, INSERT ON "SessionActivity" TO PUBLIC;
GRANT SELECT, INSERT ON "SessionEventLog" TO PUBLIC;
GRANT SELECT ON "ConcurrentSessionLimit" TO PUBLIC;
GRANT UPDATE ON "ConcurrentSessionLimit" TO PUBLIC; -- Only for admins, enforced by RLS
GRANT SELECT ON "ActiveSessionsView" TO PUBLIC;
GRANT SELECT ON "SessionAnalyticsView" TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE "Session" IS 'User session management with HIPAA-compliant timeout and tracking';
COMMENT ON COLUMN "Session"."sessionToken" IS 'Encrypted session token for authentication';
COMMENT ON COLUMN "Session"."refreshToken" IS 'Encrypted refresh token for session renewal';
COMMENT ON COLUMN "Session"."idleExpiresAt" IS 'When session expires due to inactivity (15 min for clinical users)';
COMMENT ON COLUMN "Session"."absoluteExpiresAt" IS 'Maximum session lifetime regardless of activity (8 hours)';
COMMENT ON COLUMN "Session"."mfaVerified" IS 'Whether MFA was verified for this session';

COMMENT ON TABLE "SessionActivity" IS 'Detailed activity tracking for user sessions';
COMMENT ON COLUMN "SessionActivity"."activityType" IS 'Type of activity: PAGE_VIEW, API_CALL, DATA_ACCESS, PHI_ACCESS';

COMMENT ON TABLE "ConcurrentSessionLimit" IS 'Role-based concurrent session limits for security';
COMMENT ON TABLE "SessionEventLog" IS 'Audit log of all session-related events';

-- Create scheduled job to clean up expired sessions (requires pg_cron extension)
-- SELECT cron.schedule('session-cleanup', '*/5 * * * *', 'SELECT terminate_idle_sessions() + terminate_expired_sessions();');