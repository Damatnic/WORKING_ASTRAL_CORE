-- Add comprehensive error handling and logging tables

-- Create error log table
CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "errorId" TEXT NOT NULL UNIQUE,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    "statusCode" INTEGER NOT NULL DEFAULT 500,
    "isOperational" BOOLEAN NOT NULL DEFAULT TRUE,
    "context" JSONB DEFAULT '{}',
    "userId" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "stackTrace" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    
    -- Foreign key
    CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create indexes for error log
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_errorId_idx" ON "ErrorLog"("errorId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_category_idx" ON "ErrorLog"("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_severity_idx" ON "ErrorLog"("severity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_userId_idx" ON "ErrorLog"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_sessionId_idx" ON "ErrorLog"("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_requestId_idx" ON "ErrorLog"("requestId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- Create system log table for general logging
CREATE TABLE IF NOT EXISTS "SystemLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "logId" TEXT NOT NULL UNIQUE,
    "level" TEXT NOT NULL, -- TRACE, DEBUG, INFO, WARN, ERROR, FATAL
    "message" TEXT NOT NULL,
    "category" TEXT,
    "context" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "userId" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "traceId" TEXT,
    "spanId" TEXT,
    "source" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create indexes for system log
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_logId_idx" ON "SystemLog"("logId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_category_idx" ON "SystemLog"("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_userId_idx" ON "SystemLog"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_sessionId_idx" ON "SystemLog"("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_requestId_idx" ON "SystemLog"("requestId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_timestamp_idx" ON "SystemLog"("timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_traceId_idx" ON "SystemLog"("traceId");

-- Create incident report table for critical errors
CREATE TABLE IF NOT EXISTS "IncidentReport" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "errorId" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    "priority" TEXT NOT NULL DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, CRITICAL
    "assignedTo" TEXT,
    "reportedBy" TEXT,
    "context" JSONB DEFAULT '{}',
    "rootCause" TEXT,
    "resolution" TEXT,
    "preventiveMeasures" TEXT,
    "affectedUsers" INTEGER,
    "downtime" INTEGER, -- in minutes
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    
    -- Foreign keys
    CONSTRAINT "IncidentReport_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "IncidentReport_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create indexes for incident report
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IncidentReport_errorId_idx" ON "IncidentReport"("errorId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IncidentReport_status_idx" ON "IncidentReport"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IncidentReport_priority_idx" ON "IncidentReport"("priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IncidentReport_assignedTo_idx" ON "IncidentReport"("assignedTo");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IncidentReport_createdAt_idx" ON "IncidentReport"("createdAt");

-- Create compliance task table for HIPAA violations
CREATE TABLE IF NOT EXISTS "ComplianceTask" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "type" TEXT NOT NULL, -- HIPAA_VIOLATION_REVIEW, DATA_BREACH_INVESTIGATION, etc.
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, OVERDUE
    "metadata" JSONB DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "ComplianceTask_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create indexes for compliance task
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceTask_type_idx" ON "ComplianceTask"("type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceTask_status_idx" ON "ComplianceTask"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceTask_priority_idx" ON "ComplianceTask"("priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceTask_assignedTo_idx" ON "ComplianceTask"("assignedTo");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ComplianceTask_dueDate_idx" ON "ComplianceTask"("dueDate");

-- Create error metrics table for monitoring
CREATE TABLE IF NOT EXISTS "ErrorMetrics" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "period" TIMESTAMP(3) NOT NULL, -- Hourly aggregation
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" FLOAT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for period-category-severity combination
    CONSTRAINT "ErrorMetrics_unique" UNIQUE ("period", "category", "severity")
);

-- Create indexes for error metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorMetrics_period_idx" ON "ErrorMetrics"("period");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorMetrics_category_idx" ON "ErrorMetrics"("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorMetrics_severity_idx" ON "ErrorMetrics"("severity");

-- Create function to aggregate error metrics
CREATE OR REPLACE FUNCTION aggregate_error_metrics()
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
BEGIN
    -- Get the last hour's time window
    v_end_time := date_trunc('hour', NOW());
    v_start_time := v_end_time - INTERVAL '1 hour';
    
    -- Insert or update metrics for the last hour
    INSERT INTO "ErrorMetrics" ("period", "category", "severity", "count", "uniqueUsers")
    SELECT 
        v_start_time as period,
        "category",
        "severity",
        COUNT(*) as count,
        COUNT(DISTINCT "userId") as unique_users
    FROM "ErrorLog"
    WHERE "timestamp" >= v_start_time AND "timestamp" < v_end_time
    GROUP BY "category", "severity"
    ON CONFLICT ("period", "category", "severity")
    DO UPDATE SET
        "count" = EXCLUDED."count",
        "uniqueUsers" = EXCLUDED."uniqueUsers";
END;
$$ LANGUAGE plpgsql;

-- Create function to clean old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(retention_days INTEGER DEFAULT 90)
RETURNS TABLE (
    deleted_error_logs INTEGER,
    deleted_system_logs INTEGER
) AS $$
DECLARE
    v_cutoff_date TIMESTAMP;
    v_deleted_errors INTEGER;
    v_deleted_system INTEGER;
BEGIN
    v_cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Delete old error logs (keep unresolved ones)
    DELETE FROM "ErrorLog"
    WHERE "timestamp" < v_cutoff_date AND "resolved" = TRUE;
    GET DIAGNOSTICS v_deleted_errors = ROW_COUNT;
    
    -- Delete old system logs
    DELETE FROM "SystemLog"
    WHERE "timestamp" < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_system = ROW_COUNT;
    
    -- Return counts
    RETURN QUERY SELECT v_deleted_errors, v_deleted_system;
END;
$$ LANGUAGE plpgsql;

-- Create function to escalate unresolved critical errors
CREATE OR REPLACE FUNCTION escalate_critical_errors()
RETURNS INTEGER AS $$
DECLARE
    v_escalated_count INTEGER := 0;
    v_error RECORD;
BEGIN
    -- Find unresolved critical errors older than 1 hour
    FOR v_error IN 
        SELECT * FROM "ErrorLog"
        WHERE "severity" = 'CRITICAL'
        AND "resolved" = FALSE
        AND "timestamp" < NOW() - INTERVAL '1 hour'
    LOOP
        -- Create incident report if not exists
        INSERT INTO "IncidentReport" (
            "errorId", "category", "severity", "title", "description",
            "status", "priority", "context"
        )
        SELECT 
            v_error."errorId",
            v_error."category",
            v_error."severity",
            'Critical Error: ' || v_error."message",
            v_error."message",
            'OPEN',
            'CRITICAL',
            v_error."context"
        WHERE NOT EXISTS (
            SELECT 1 FROM "IncidentReport"
            WHERE "errorId" = v_error."errorId"
        );
        
        v_escalated_count := v_escalated_count + 1;
    END LOOP;
    
    RETURN v_escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for error statistics
CREATE VIEW "ErrorStatisticsView" AS
SELECT 
    DATE_TRUNC('day', "timestamp") as day,
    "category",
    "severity",
    COUNT(*) as error_count,
    COUNT(DISTINCT "userId") as affected_users,
    COUNT(DISTINCT "sessionId") as affected_sessions,
    AVG(CASE WHEN "resolved" THEN 
        EXTRACT(EPOCH FROM ("resolvedAt" - "timestamp")) / 60 
        ELSE NULL 
    END) as avg_resolution_time_minutes,
    SUM(CASE WHEN "resolved" THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as resolution_rate
FROM "ErrorLog"
WHERE "timestamp" > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', "timestamp"), "category", "severity"
ORDER BY day DESC, error_count DESC;

-- Create view for system health dashboard
CREATE VIEW "SystemHealthView" AS
SELECT 
    'errors_last_hour' as metric,
    COUNT(*) as value
FROM "ErrorLog"
WHERE "timestamp" > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'critical_errors_24h' as metric,
    COUNT(*) as value
FROM "ErrorLog"
WHERE "timestamp" > NOW() - INTERVAL '24 hours' AND "severity" = 'CRITICAL'
UNION ALL
SELECT 
    'unresolved_errors' as metric,
    COUNT(*) as value
FROM "ErrorLog"
WHERE "resolved" = FALSE
UNION ALL
SELECT 
    'open_incidents' as metric,
    COUNT(*) as value
FROM "IncidentReport"
WHERE "status" IN ('OPEN', 'IN_PROGRESS')
UNION ALL
SELECT 
    'pending_compliance_tasks' as metric,
    COUNT(*) as value
FROM "ComplianceTask"
WHERE "status" = 'PENDING' AND "dueDate" < NOW() + INTERVAL '7 days';

-- Add row-level security
ALTER TABLE "ErrorLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncidentReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceTask" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "error_log_access" ON "ErrorLog"
    FOR SELECT
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
    );

CREATE POLICY "system_log_access" ON "SystemLog"
    FOR SELECT
    TO PUBLIC
    USING (
        current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "incident_report_access" ON "IncidentReport"
    FOR ALL
    TO PUBLIC
    USING (
        "assignedTo" = current_setting('app.user_id', true)
        OR "reportedBy" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "compliance_task_access" ON "ComplianceTask"
    FOR ALL
    TO PUBLIC
    USING (
        "assignedTo" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
    );

-- Grant permissions
GRANT SELECT, INSERT ON "ErrorLog" TO PUBLIC;
GRANT SELECT, UPDATE ON "ErrorLog" TO PUBLIC; -- For resolution
GRANT SELECT, INSERT ON "SystemLog" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON "IncidentReport" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON "ComplianceTask" TO PUBLIC;
GRANT SELECT ON "ErrorStatisticsView" TO PUBLIC;
GRANT SELECT ON "SystemHealthView" TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE "ErrorLog" IS 'Comprehensive error logging with tracking and resolution';
COMMENT ON TABLE "SystemLog" IS 'General system logging for debugging and monitoring';
COMMENT ON TABLE "IncidentReport" IS 'Incident reports for critical errors requiring investigation';
COMMENT ON TABLE "ComplianceTask" IS 'Compliance tasks for HIPAA violations and data breaches';
COMMENT ON TABLE "ErrorMetrics" IS 'Aggregated error metrics for monitoring and alerting';

-- Schedule cleanup and aggregation jobs (requires pg_cron)
-- SELECT cron.schedule('error-metrics', '0 * * * *', 'SELECT aggregate_error_metrics();');
-- SELECT cron.schedule('error-escalation', '*/15 * * * *', 'SELECT escalate_critical_errors();');
-- SELECT cron.schedule('log-cleanup', '0 2 * * *', 'SELECT cleanup_old_logs(90);');