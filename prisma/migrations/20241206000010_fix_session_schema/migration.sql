-- Emergency fix for missing Session table columns
-- This migration adds the missing columns that exist in the schema but not in the database

-- Add missing columns to Session table if they don't exist
DO $$ 
BEGIN
    -- Add sessionTokenIV column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'sessionTokenIV') THEN
        ALTER TABLE "Session" ADD COLUMN "sessionTokenIV" TEXT;
    END IF;
    
    -- Add sessionTokenAuthTag column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'sessionTokenAuthTag') THEN
        ALTER TABLE "Session" ADD COLUMN "sessionTokenAuthTag" TEXT;
    END IF;
    
    -- Add refreshTokenIV column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'refreshTokenIV') THEN
        ALTER TABLE "Session" ADD COLUMN "refreshTokenIV" TEXT;
    END IF;
    
    -- Add refreshTokenAuthTag column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'refreshTokenAuthTag') THEN
        ALTER TABLE "Session" ADD COLUMN "refreshTokenAuthTag" TEXT;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'status') THEN
        -- First create the enum if it doesn't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionStatus') THEN
                CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'IDLE', 'EXPIRED', 'TERMINATED', 'LOCKED');
            END IF;
        END
        $$;
        
        ALTER TABLE "Session" ADD COLUMN "status" "SessionStatus" DEFAULT 'ACTIVE';
    END IF;
    
    -- Add mfaVerified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'mfaVerified') THEN
        ALTER TABLE "Session" ADD COLUMN "mfaVerified" BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add other missing session management columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'ipAddress') THEN
        ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'userAgent') THEN
        ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'deviceFingerprint') THEN
        ALTER TABLE "Session" ADD COLUMN "deviceFingerprint" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'lastActivity') THEN
        ALTER TABLE "Session" ADD COLUMN "lastActivity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'idleExpiresAt') THEN
        ALTER TABLE "Session" ADD COLUMN "idleExpiresAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'absoluteExpiresAt') THEN
        ALTER TABLE "Session" ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'terminatedAt') THEN
        ALTER TABLE "Session" ADD COLUMN "terminatedAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'terminationReason') THEN
        ALTER TABLE "Session" ADD COLUMN "terminationReason" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'metadata') THEN
        ALTER TABLE "Session" ADD COLUMN "metadata" JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Session' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Session" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    END IF;

END
$$;

-- Create indexes if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_idx" ON "Session"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_lastActivity_idx" ON "Session"("lastActivity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_deviceFingerprint_idx" ON "Session"("deviceFingerprint");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_userId_status_idx" ON "Session"("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");