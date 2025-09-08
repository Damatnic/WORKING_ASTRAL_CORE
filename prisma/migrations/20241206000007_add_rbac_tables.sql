-- Add Role-Based Access Control (RBAC) tables for fine-grained permissions

-- Create temporary permissions table for delegated access
CREATE TABLE IF NOT EXISTS "TemporaryPermission" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "TemporaryPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "TemporaryPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes for temporary permissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TemporaryPermission_userId_idx" ON "TemporaryPermission"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TemporaryPermission_grantedBy_idx" ON "TemporaryPermission"("grantedBy");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TemporaryPermission_isActive_idx" ON "TemporaryPermission"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TemporaryPermission_expiresAt_idx" ON "TemporaryPermission"("expiresAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TemporaryPermission_resource_action_idx" ON "TemporaryPermission"("resource", "action");

-- Create role permissions override table (for custom permissions)
CREATE TABLE IF NOT EXISTS "RolePermissionOverride" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "conditions" JSONB,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key for creator
    CONSTRAINT "RolePermissionOverride_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE,
    
    -- Unique constraint for role-resource-action combination
    CONSTRAINT "RolePermissionOverride_unique" UNIQUE ("role", "resource", "action")
);

-- Create indexes for role permission overrides
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RolePermissionOverride_role_idx" ON "RolePermissionOverride"("role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RolePermissionOverride_resource_idx" ON "RolePermissionOverride"("resource");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RolePermissionOverride_role_resource_idx" ON "RolePermissionOverride"("role", "resource");

-- Create resource ownership table for tracking resource owners
CREATE TABLE IF NOT EXISTS "ResourceOwnership" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredFrom" TEXT,
    "transferredAt" TIMESTAMP(3),
    
    -- Foreign keys
    CONSTRAINT "ResourceOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "ResourceOwnership_transferredFrom_fkey" FOREIGN KEY ("transferredFrom") REFERENCES "User"("id") ON DELETE SET NULL,
    
    -- Unique constraint for resource
    CONSTRAINT "ResourceOwnership_unique" UNIQUE ("resourceType", "resourceId")
);

-- Create indexes for resource ownership
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ResourceOwnership_ownerId_idx" ON "ResourceOwnership"("ownerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ResourceOwnership_resourceType_idx" ON "ResourceOwnership"("resourceType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ResourceOwnership_resourceType_resourceId_idx" ON "ResourceOwnership"("resourceType", "resourceId");

-- Create permission check audit table for tracking all permission checks
CREATE TABLE IF NOT EXISTS "PermissionCheckAudit" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "checkType" TEXT, -- 'role', 'ownership', 'temporary', 'override'
    "context" JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT "PermissionCheckAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes for permission check audit
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PermissionCheckAudit_userId_idx" ON "PermissionCheckAudit"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PermissionCheckAudit_userRole_idx" ON "PermissionCheckAudit"("userRole");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PermissionCheckAudit_resource_idx" ON "PermissionCheckAudit"("resource");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PermissionCheckAudit_allowed_idx" ON "PermissionCheckAudit"("allowed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PermissionCheckAudit_timestamp_idx" ON "PermissionCheckAudit"("timestamp");

-- Create role hierarchy table for inheritance
CREATE TABLE IF NOT EXISTS "RoleHierarchy" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "parentRole" TEXT NOT NULL,
    "childRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT "RoleHierarchy_unique" UNIQUE ("parentRole", "childRole")
);

-- Create indexes for role hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RoleHierarchy_parentRole_idx" ON "RoleHierarchy"("parentRole");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RoleHierarchy_childRole_idx" ON "RoleHierarchy"("childRole");

-- Insert default role hierarchy
INSERT INTO "RoleHierarchy" ("parentRole", "childRole") VALUES
    ('SUPER_ADMIN', 'ADMIN'),
    ('ADMIN', 'COMPLIANCE_OFFICER'),
    ('ADMIN', 'THERAPIST'),
    ('ADMIN', 'CRISIS_COUNSELOR'),
    ('THERAPIST', 'HELPER'),
    ('CRISIS_COUNSELOR', 'HELPER'),
    ('HELPER', 'USER')
ON CONFLICT DO NOTHING;

-- Create function to check permission with all factors
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id TEXT,
    p_resource TEXT,
    p_action TEXT,
    p_resource_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_has_permission BOOLEAN := FALSE;
    v_is_owner BOOLEAN := FALSE;
    v_has_temp_permission BOOLEAN := FALSE;
    v_has_override BOOLEAN := FALSE;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM "User" WHERE id = p_user_id AND "isActive" = TRUE;
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for super admin
    IF v_user_role = 'SUPER_ADMIN' THEN
        RETURN TRUE;
    END IF;
    
    -- Check temporary permissions
    SELECT EXISTS(
        SELECT 1 FROM "TemporaryPermission"
        WHERE "userId" = p_user_id
        AND "resource" = p_resource
        AND "action" = p_action
        AND "isActive" = TRUE
        AND "expiresAt" > NOW()
    ) INTO v_has_temp_permission;
    
    IF v_has_temp_permission THEN
        RETURN TRUE;
    END IF;
    
    -- Check role permission overrides
    SELECT "allowed" INTO v_has_override
    FROM "RolePermissionOverride"
    WHERE "role" = v_user_role
    AND "resource" = p_resource
    AND "action" = p_action
    LIMIT 1;
    
    IF v_has_override IS NOT NULL THEN
        RETURN v_has_override;
    END IF;
    
    -- Check ownership if resource_id provided
    IF p_resource_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM "ResourceOwnership"
            WHERE "resourceType" = p_resource
            AND "resourceId" = p_resource_id
            AND "ownerId" = p_user_id
        ) INTO v_is_owner;
        
        -- Owner typically has full permissions on their resources
        IF v_is_owner AND p_action IN ('read', 'update', 'delete') THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Default to role-based check (would be implemented in application layer)
    -- This is a simplified check - real implementation is in the application
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id TEXT)
RETURNS TABLE (
    resource TEXT,
    action TEXT,
    source TEXT -- 'role', 'temporary', 'override'
) AS $$
BEGIN
    -- Get role-based permissions (simplified - actual logic in app)
    -- This would need to be implemented based on your role definitions
    
    -- Get temporary permissions
    RETURN QUERY
    SELECT 
        tp."resource",
        tp."action",
        'temporary'::TEXT as source
    FROM "TemporaryPermission" tp
    WHERE tp."userId" = p_user_id
    AND tp."isActive" = TRUE
    AND tp."expiresAt" > NOW();
    
    -- Get role overrides
    RETURN QUERY
    SELECT 
        rpo."resource",
        rpo."action",
        'override'::TEXT as source
    FROM "RolePermissionOverride" rpo
    JOIN "User" u ON u.id = p_user_id
    WHERE rpo."role" = u.role
    AND rpo."allowed" = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to transfer resource ownership
CREATE OR REPLACE FUNCTION transfer_resource_ownership(
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_new_owner_id TEXT,
    p_transferred_by TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_owner_id TEXT;
BEGIN
    -- Get current owner
    SELECT "ownerId" INTO v_current_owner_id
    FROM "ResourceOwnership"
    WHERE "resourceType" = p_resource_type
    AND "resourceId" = p_resource_id;
    
    IF v_current_owner_id IS NULL THEN
        -- Create new ownership record
        INSERT INTO "ResourceOwnership" (
            "resourceType", "resourceId", "ownerId"
        ) VALUES (
            p_resource_type, p_resource_id, p_new_owner_id
        );
    ELSE
        -- Update existing ownership
        UPDATE "ResourceOwnership"
        SET 
            "ownerId" = p_new_owner_id,
            "transferredFrom" = v_current_owner_id,
            "transferredAt" = NOW()
        WHERE "resourceType" = p_resource_type
        AND "resourceId" = p_resource_id;
    END IF;
    
    -- Log the transfer in audit
    INSERT INTO "AuditEvent" (
        "eventId", "category", "riskLevel", "outcome",
        "encryptedData", "authTag", "checksum"
    ) VALUES (
        gen_random_uuid()::text,
        'PERMISSION_CHANGE',
        'MEDIUM',
        'SUCCESS',
        encode(convert_to(json_build_object(
            'action', 'RESOURCE_OWNERSHIP_TRANSFER',
            'resourceType', p_resource_type,
            'resourceId', p_resource_id,
            'fromUserId', v_current_owner_id,
            'toUserId', p_new_owner_id,
            'transferredBy', p_transferred_by
        )::text, 'utf8'), 'base64'),
        'placeholder_auth_tag',
        'placeholder_checksum'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired temporary permissions
CREATE OR REPLACE FUNCTION cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Deactivate expired temporary permissions
    UPDATE "TemporaryPermission"
    SET "isActive" = FALSE
    WHERE "isActive" = TRUE
    AND "expiresAt" < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log cleanup if any permissions were deactivated
    IF v_deleted_count > 0 THEN
        INSERT INTO "AuditEvent" (
            "eventId", "category", "riskLevel", "outcome",
            "encryptedData", "authTag", "checksum"
        ) VALUES (
            gen_random_uuid()::text,
            'SYSTEM_MAINTENANCE',
            'LOW',
            'SUCCESS',
            encode(convert_to(json_build_object(
                'action', 'EXPIRED_PERMISSIONS_CLEANUP',
                'deactivatedCount', v_deleted_count
            )::text, 'utf8'), 'base64'),
            'placeholder_auth_tag',
            'placeholder_checksum'
        );
    END IF;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to audit permission checks (sampling for performance)
CREATE OR REPLACE FUNCTION audit_permission_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Sample 10% of permission checks for audit
    IF random() < 0.1 THEN
        INSERT INTO "PermissionCheckAudit" (
            "userId", "userRole", "resource", "action",
            "resourceId", "allowed", "reason", "checkType",
            "context", "timestamp"
        ) VALUES (
            NEW."userId", NEW."userRole", NEW."resource", NEW."action",
            NEW."resourceId", NEW."allowed", NEW."reason", NEW."checkType",
            NEW."context", NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create view for active permissions
CREATE VIEW "ActivePermissionsView" AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    tp."resource",
    tp."action",
    'temporary' as permission_type,
    tp."expiresAt",
    tp."reason"
FROM "User" u
JOIN "TemporaryPermission" tp ON u.id = tp."userId"
WHERE tp."isActive" = TRUE
AND tp."expiresAt" > NOW()

UNION ALL

SELECT 
    u.id as user_id,
    u.email,
    u.role,
    rpo."resource",
    rpo."action",
    'override' as permission_type,
    NULL as "expiresAt",
    rpo."reason"
FROM "User" u
JOIN "RolePermissionOverride" rpo ON u.role = rpo.role
WHERE rpo."allowed" = TRUE;

-- Create view for permission statistics
CREATE VIEW "PermissionStatisticsView" AS
SELECT 
    "userRole",
    "resource",
    "action",
    COUNT(*) as check_count,
    SUM(CASE WHEN "allowed" THEN 1 ELSE 0 END) as allowed_count,
    SUM(CASE WHEN NOT "allowed" THEN 1 ELSE 0 END) as denied_count,
    AVG(CASE WHEN "allowed" THEN 1 ELSE 0 END)::DECIMAL(5,2) as success_rate,
    MAX("timestamp") as last_check
FROM "PermissionCheckAudit"
WHERE "timestamp" > NOW() - INTERVAL '30 days'
GROUP BY "userRole", "resource", "action";

-- Add row-level security
ALTER TABLE "TemporaryPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermissionOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResourceOwnership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionCheckAudit" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "temp_permission_access" ON "TemporaryPermission"
    FOR ALL
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR "grantedBy" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "role_override_access" ON "RolePermissionOverride"
    FOR ALL
    TO PUBLIC
    USING (
        current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "resource_ownership_access" ON "ResourceOwnership"
    FOR ALL
    TO PUBLIC
    USING (
        "ownerId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    );

CREATE POLICY "permission_audit_access" ON "PermissionCheckAudit"
    FOR SELECT
    TO PUBLIC
    USING (
        "userId" = current_setting('app.user_id', true)
        OR current_setting('app.user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON "TemporaryPermission" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON "RolePermissionOverride" TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON "ResourceOwnership" TO PUBLIC;
GRANT SELECT, INSERT ON "PermissionCheckAudit" TO PUBLIC;
GRANT SELECT ON "ActivePermissionsView" TO PUBLIC;
GRANT SELECT ON "PermissionStatisticsView" TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE "TemporaryPermission" IS 'Temporary permissions granted to users for delegated access';
COMMENT ON TABLE "RolePermissionOverride" IS 'Custom permission overrides for specific roles';
COMMENT ON TABLE "ResourceOwnership" IS 'Tracks ownership of resources for ownership-based permissions';
COMMENT ON TABLE "PermissionCheckAudit" IS 'Audit trail of all permission checks (sampled)';
COMMENT ON VIEW "ActivePermissionsView" IS 'Current active permissions for all users';
COMMENT ON VIEW "PermissionStatisticsView" IS 'Permission check statistics for monitoring';

-- Schedule cleanup job (requires pg_cron)
-- SELECT cron.schedule('permission-cleanup', '0 * * * *', 'SELECT cleanup_expired_permissions();');