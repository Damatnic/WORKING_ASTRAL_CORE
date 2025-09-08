-- Add searchable hash columns for encrypted PHI fields
-- These hashes enable searching encrypted data without exposing plaintext

-- User table encrypted fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName_hash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber_hash" TEXT;

-- Create indexes for searchable hashes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_email_hash_idx" ON "User"("email_hash");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_fullName_hash_idx" ON "User"("fullName_hash");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_phoneNumber_hash_idx" ON "User"("phoneNumber_hash");

-- TherapySession table encrypted fields
ALTER TABLE "TherapySession" ADD COLUMN IF NOT EXISTS "sessionNotes_hash" TEXT;
ALTER TABLE "TherapySession" ADD COLUMN IF NOT EXISTS "progressNotes_hash" TEXT;

-- MoodEntry table encrypted fields
ALTER TABLE "MoodEntry" ADD COLUMN IF NOT EXISTS "notes_hash" TEXT;
ALTER TABLE "MoodEntry" ADD COLUMN IF NOT EXISTS "triggers_hash" TEXT;

-- JournalEntry table encrypted fields  
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "content_hash" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "title_hash" TEXT;

-- CrisisAssessment table encrypted fields
ALTER TABLE "CrisisAssessment" ADD COLUMN IF NOT EXISTS "riskFactors_hash" TEXT;
ALTER TABLE "CrisisAssessment" ADD COLUMN IF NOT EXISTS "safetyPlan_hash" TEXT;
ALTER TABLE "CrisisAssessment" ADD COLUMN IF NOT EXISTS "interventionNotes_hash" TEXT;

-- PrivateMessage table encrypted fields
ALTER TABLE "PrivateMessage" ADD COLUMN IF NOT EXISTS "content_hash" TEXT;
ALTER TABLE "PrivateMessage" ADD COLUMN IF NOT EXISTS "subject_hash" TEXT;

-- UserProfile table encrypted fields
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "medicalHistory_hash" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "medications_hash" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "allergies_hash" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "insuranceInfo_hash" TEXT;

-- Assessment table encrypted fields
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "results_hash" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "notes_hash" TEXT;

-- Add indexes for commonly searched fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "JournalEntry_title_hash_idx" ON "JournalEntry"("title_hash");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PrivateMessage_subject_hash_idx" ON "PrivateMessage"("subject_hash");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Assessment_results_hash_idx" ON "Assessment"("results_hash");