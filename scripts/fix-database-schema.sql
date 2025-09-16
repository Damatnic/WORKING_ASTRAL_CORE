-- Database Schema Fix Script for Astral Core V5
-- Run this script directly against your PostgreSQL database to fix schema mismatches
-- This should be run when migrations fail due to missing database connectivity

BEGIN;

-- Create SessionStatus enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionStatus') THEN
        CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'IDLE', 'EXPIRED', 'TERMINATED', 'LOCKED');
    END IF;
END
$$;

-- Fix Session table schema
DO $$ 
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check if Session table exists, if not create it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Session'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        CREATE TABLE "Session" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "userId" TEXT NOT NULL,
            "sessionToken" TEXT NOT NULL,
            "sessionTokenIV" TEXT,
            "sessionTokenAuthTag" TEXT,
            "refreshToken" TEXT,
            "refreshTokenIV" TEXT,
            "refreshTokenAuthTag" TEXT,
            "status" "SessionStatus" DEFAULT 'ACTIVE',
            "mfaVerified" BOOLEAN DEFAULT FALSE,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "deviceFingerprint" TEXT,
            "lastActivity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
            "idleExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
            "absoluteExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 hours'),
            "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
            "terminatedAt" TIMESTAMP(3),
            "terminationReason" TEXT,
            "metadata" JSONB,
            "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add foreign key constraint if User table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
            ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
        END IF;
    ELSE
        -- Table exists, add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'sessionTokenIV') THEN
            ALTER TABLE "Session" ADD COLUMN "sessionTokenIV" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'sessionTokenAuthTag') THEN
            ALTER TABLE "Session" ADD COLUMN "sessionTokenAuthTag" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'refreshTokenIV') THEN
            ALTER TABLE "Session" ADD COLUMN "refreshTokenIV" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'refreshTokenAuthTag') THEN
            ALTER TABLE "Session" ADD COLUMN "refreshTokenAuthTag" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'status') THEN
            ALTER TABLE "Session" ADD COLUMN "status" "SessionStatus" DEFAULT 'ACTIVE';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'mfaVerified') THEN
            ALTER TABLE "Session" ADD COLUMN "mfaVerified" BOOLEAN DEFAULT FALSE;
        END IF;
        
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
            -- Update existing records with default values
            UPDATE "Session" SET "idleExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE "idleExpiresAt" IS NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Session' AND column_name = 'absoluteExpiresAt') THEN
            ALTER TABLE "Session" ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3);
            -- Update existing records with default values
            UPDATE "Session" SET "absoluteExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '8 hours' WHERE "absoluteExpiresAt" IS NULL;
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
    END IF;
END
$$;

-- Create essential indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_idx" ON "Session"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_lastActivity_idx" ON "Session"("lastActivity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_deviceFingerprint_idx" ON "Session"("deviceFingerprint");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_userId_status_idx" ON "Session"("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");

-- Create other essential tables if missing (minimal versions)
DO $$
BEGIN
    -- Create SessionActivity table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SessionActivity') THEN
        CREATE TABLE "SessionActivity" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "sessionId" TEXT NOT NULL,
            "activityType" TEXT NOT NULL,
            "resource" TEXT,
            "ipAddress" TEXT,
            "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
            "metadata" JSONB
        );
        
        CREATE INDEX "SessionActivity_sessionId_idx" ON "SessionActivity"("sessionId");
        CREATE INDEX "SessionActivity_timestamp_idx" ON "SessionActivity"("timestamp");
        CREATE INDEX "SessionActivity_activityType_idx" ON "SessionActivity"("activityType");
        CREATE INDEX "SessionActivity_sessionId_timestamp_idx" ON "SessionActivity"("sessionId", "timestamp");
        
        -- Add foreign key constraint if Session table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session') THEN
            ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_sessionId_fkey" 
            FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Create SessionEventLog table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SessionEventLog') THEN
        CREATE TABLE "SessionEventLog" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "sessionId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "eventType" TEXT NOT NULL,
            "eventData" JSONB,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX "SessionEventLog_sessionId_idx" ON "SessionEventLog"("sessionId");
        CREATE INDEX "SessionEventLog_userId_idx" ON "SessionEventLog"("userId");
        CREATE INDEX "SessionEventLog_eventType_idx" ON "SessionEventLog"("eventType");
        CREATE INDEX "SessionEventLog_timestamp_idx" ON "SessionEventLog"("timestamp");
        
        -- Add foreign key constraints if tables exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session') THEN
            ALTER TABLE "SessionEventLog" ADD CONSTRAINT "SessionEventLog_sessionId_fkey" 
            FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
            ALTER TABLE "SessionEventLog" ADD CONSTRAINT "SessionEventLog_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
        END IF;
    END IF;
END
$$;

COMMIT;

-- Verification queries
\echo 'Database schema fix completed. Verification:'
\echo '1. Session table structure:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Session'
ORDER BY ordinal_position;

\echo '2. Session table indexes:'
SELECT indexname FROM pg_indexes WHERE tablename = 'Session';

\echo '3. Session-related tables:'
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%Session%' 
ORDER BY table_name;