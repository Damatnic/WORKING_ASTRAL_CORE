-- Migration: Add comprehensive database indexes for performance optimization
-- This migration creates performance indexes for all frequently queried columns,
-- composite indexes for common query patterns, partial indexes for filtered queries,
-- full-text search indexes, and specialized indexes for JSONB columns.
-- All indexes are created CONCURRENTLY to avoid locking tables during creation.

-- =============================================================================
-- BASIC PERFORMANCE INDEXES
-- =============================================================================

-- User table indexes for authentication and profile queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_active 
ON "User"(email, "isActive") 
WHERE email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_anonymous_id 
ON "User"("anonymousId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_active 
ON "User"("lastActiveAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_active 
ON "User"(role, "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_failed_logins 
ON "User"("failedLoginAttempts", "lockedUntil") 
WHERE "failedLoginAttempts" > 0;

-- Session management indexes for fast authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token_expires 
ON "Session"("sessionToken", expires) 
WHERE expires > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_active 
ON "Session"("userId", status, "lastActivity") 
WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_device_fingerprint 
ON "Session"("deviceFingerprint", "userId") 
WHERE "deviceFingerprint" IS NOT NULL;

-- Mental health data indexes for tracking and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_user_date 
ON "MoodEntry"("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_score_date 
ON "MoodEntry"("moodScore", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_anxiety_date 
ON "MoodEntry"("anxietyLevel", "createdAt" DESC) 
WHERE "anxietyLevel" IS NOT NULL;

-- Journal entry indexes for user content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_user_date 
ON "JournalEntry"("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_user_private 
ON "JournalEntry"("userId", "isPrivate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_sentiment 
ON "JournalEntry"(sentiment, "createdAt" DESC) 
WHERE sentiment IS NOT NULL;

-- =============================================================================
-- COMMUNITY AND SOCIAL FEATURES INDEXES
-- =============================================================================

-- Community posts for feed generation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_category_date 
ON "CommunityPost"(category, "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_author_date 
ON "CommunityPost"("authorId", "createdAt" DESC) 
WHERE "authorId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_pinned 
ON "CommunityPost"("isPinned", "createdAt" DESC) 
WHERE "isPinned" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_moderated 
ON "CommunityPost"("isModerated", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_views_likes 
ON "CommunityPost"("viewCount" DESC, "likeCount" DESC);

-- Comment indexes for threaded discussions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_post_date 
ON "Comment"("postId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_parent 
ON "Comment"("parentId") 
WHERE "parentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_author_date 
ON "Comment"("authorId", "createdAt" DESC) 
WHERE "authorId" IS NOT NULL;

-- Chat and messaging indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_room_date 
ON "ChatMessage"("roomId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_author 
ON "ChatMessage"("authorId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversation_date 
ON "DirectMessage"("conversationId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_last_activity 
ON "Conversation"(type, "lastActivity" DESC);

-- =============================================================================
-- CRISIS RESPONSE AND SAFETY INDEXES
-- =============================================================================

-- Crisis reporting indexes for emergency response
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_severity_date 
ON "CrisisReport"("severityLevel", "createdAt" DESC) 
WHERE resolved = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_user_resolved 
ON "CrisisReport"("userId", resolved, "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_intervention_type 
ON "CrisisReport"("interventionType", "createdAt" DESC);

-- Safety alerts for real-time monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_safety_alert_severity 
ON "SafetyAlert"(severity, "detectedAt" DESC) 
WHERE handled = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_safety_alert_user 
ON "SafetyAlert"("userId", handled, "detectedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_safety_alert_type 
ON "SafetyAlert"(type, "detectedAt" DESC);

-- Safety plans for quick access
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_safety_plan_active 
ON "SafetyPlan"("userId", "isActive", "lastReviewedAt" DESC);

-- =============================================================================
-- THERAPY AND PROFESSIONAL SERVICES INDEXES
-- =============================================================================

-- Appointment scheduling indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_user_date 
ON "Appointment"("userId", "scheduledAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_prof_date 
ON "Appointment"("professionalId", "scheduledAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_status_date 
ON "Appointment"(status, "scheduledAt");

-- Therapist client management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_client_status 
ON "TherapistClient"("therapistId", status, "nextSessionDate") 
WHERE status IN ('ACTIVE', 'INTAKE');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_client_risk 
ON "TherapistClient"("therapistId", "riskLevel", "lastSessionDate") 
WHERE "riskLevel" IN ('HIGH', 'CRISIS');

-- Therapy session indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_session_scheduled 
ON "TherapistSession"("therapistId", "scheduledTime", status) 
WHERE status = 'SCHEDULED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapist_session_client 
ON "TherapistSession"("clientId", "scheduledTime" DESC);

-- Therapy notes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_note_client_date 
ON "TherapySessionNote"("clientId", "sessionDate" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_note_supervisor 
ON "TherapySessionNote"("supervisorReview", "therapistId") 
WHERE "supervisorReview" = false;

-- =============================================================================
-- HELPER AND SUPPORT INDEXES
-- =============================================================================

-- Helper profile indexes for matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_verified_rating 
ON "HelperProfile"("isVerified", rating DESC) 
WHERE "acceptingClients" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_availability 
ON "HelperProfile"("acceptingClients", "currentClients", "maxClients");

-- Support group indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_topic_active 
ON "SupportGroup"(topic, "isActive") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_privacy_type 
ON "SupportGroup"(privacy, type, "isActive");

-- Group membership tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_membership_active 
ON "GroupMembership"("groupId", "isActive", "joinedAt") 
WHERE "isActive" = true;

-- Support sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_session_helper 
ON "SupportSession"("helperId", status, "startedAt");

-- =============================================================================
-- NOTIFICATION AND COMMUNICATION INDEXES
-- =============================================================================

-- Notification indexes for real-time updates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_unread 
ON "Notification"("userId", "isRead", "createdAt" DESC) 
WHERE "isRead" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_priority 
ON "Notification"("userId", "isPriority", "createdAt" DESC) 
WHERE "isPriority" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_type 
ON "Notification"(type, "createdAt" DESC);

-- =============================================================================
-- AUDIT AND COMPLIANCE INDEXES
-- =============================================================================

-- Audit log indexes for compliance and monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_date 
ON "AuditLog"("userId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action_date 
ON "AuditLog"(action, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_resource 
ON "AuditLog"(resource, "resourceId", timestamp DESC) 
WHERE resource IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_outcome 
ON "AuditLog"(outcome, timestamp DESC);

-- Permission check audit indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permission_audit_user 
ON "PermissionCheckAudit"("userId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permission_audit_resource 
ON "PermissionCheckAudit"(resource, action, timestamp DESC);

-- Session activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_activity 
ON "SessionActivity"("sessionId", timestamp DESC);

-- =============================================================================
-- FILE MANAGEMENT INDEXES
-- =============================================================================

-- File storage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_user_date 
ON "FileStorage"("userId", "createdAt" DESC) 
WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_parent 
ON "FileStorage"("parentId") 
WHERE "parentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_shared 
ON "FileStorage"("isShared", "isPublic") 
WHERE "isShared" = true OR "isPublic" = true;

-- File sharing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_share_token 
ON "FileShare"("shareToken") 
WHERE "shareToken" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_share_expires 
ON "FileShare"("expiresAt") 
WHERE "expiresAt" IS NOT NULL;

-- =============================================================================
-- WELLNESS AND GAMIFICATION INDEXES
-- =============================================================================

-- Wellness challenge indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_active_dates 
ON "WellnessChallenge"("isActive", "startDate", "endDate") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_category 
ON "WellnessChallenge"(category, "startDate" DESC);

-- Challenge participation tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_participation 
ON "ChallengeParticipation"("challengeId", points DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participation_user 
ON "ChallengeParticipation"("userId", "lastActivityAt" DESC);

-- =============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- User profile composite index with included columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_composite 
ON "UserProfile"("userId") 
INCLUDE ("mentalHealthGoals", "interestedTopics", "wellnessScore");

-- Community feed composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_feed_composite 
ON "CommunityPost"(category, "isPinned", "isModerated", "createdAt" DESC) 
WHERE "isModerated" = false;

-- Crisis response composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_response_composite 
ON "CrisisReport"("severityLevel", resolved, "responseTime", "createdAt" DESC);

-- Therapy scheduling composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_schedule_composite 
ON "TherapistSession"("therapistId", status, "scheduledTime") 
WHERE status IN ('SCHEDULED', 'IN_PROGRESS');

-- =============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- =============================================================================

-- Active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active_only 
ON "User"(role, "lastActiveAt" DESC) 
WHERE "isActive" = true;

-- Unresolved crisis reports only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_unresolved_only 
ON "CrisisReport"("severityLevel" DESC, "createdAt" DESC) 
WHERE resolved = false;

-- Accepting helpers only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_accepting_only 
ON "HelperProfile"("isVerified", rating DESC, "responseTime") 
WHERE "acceptingClients" = true AND "isVerified" = true;

-- Active group sessions only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_session_active 
ON "GroupSession"("scheduledAt", "groupId") 
WHERE status = 'scheduled';

-- Upcoming appointments only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_upcoming 
ON "Appointment"("userId", "scheduledAt") 
WHERE "scheduledAt" > NOW() AND status = 'scheduled';

-- =============================================================================
-- JSONB INDEXES (GIN/BTREE) FOR STRUCTURED DATA
-- =============================================================================

-- GIN indexes for JSONB array operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_specializations_gin 
ON "HelperProfile" USING GIN(specializations);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_languages_gin 
ON "HelperProfile" USING GIN(languages);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_tags_gin 
ON "SupportGroup" USING GIN(tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_gin 
ON "User" USING GIN(permissions);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_departments_gin 
ON "AdminProfile" USING GIN(departments);

-- GIN indexes for JSONB content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_goals_gin 
ON "UserProfile" USING GIN("mentalHealthGoals");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_topics_gin 
ON "UserProfile" USING GIN("interestedTopics");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_metadata_gin 
ON "Notification" USING GIN(metadata) 
WHERE metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_details_gin 
ON "AuditLog" USING GIN(details) 
WHERE details IS NOT NULL;

-- =============================================================================
-- FULL-TEXT SEARCH INDEXES
-- =============================================================================

-- Community post full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_fulltext 
ON "CommunityPost" USING GIN(to_tsvector('english', title || ' ' || content));

-- Support group search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_fulltext 
ON "SupportGroup" USING GIN(to_tsvector('english', name || ' ' || description));

-- Comment content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_fulltext 
ON "Comment" USING GIN(to_tsvector('english', content));

-- User display name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_name_fulltext 
ON "User" USING GIN(to_tsvector('english', COALESCE("displayName", ''))) 
WHERE "displayName" IS NOT NULL;

-- =============================================================================
-- BRIN INDEXES FOR TIME-SERIES DATA
-- =============================================================================

-- BRIN indexes for large time-series tables (efficient for date range queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_entry_brin_date 
ON "MoodEntry" USING BRIN("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entry_brin_date 
ON "JournalEntry" USING BRIN("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_brin_date 
ON "AuditLog" USING BRIN(timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_message_brin_date 
ON "ChatMessage" USING BRIN("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_activity_brin_date 
ON "SessionActivity" USING BRIN(timestamp);

-- =============================================================================
-- COVERING INDEXES FOR READ-HEAVY QUERIES
-- =============================================================================

-- User dashboard covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_dashboard_covering 
ON "User"("id") 
INCLUDE ("displayName", "avatarUrl", role, "lastActiveAt", "isActive");

-- Helper profile covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helper_profile_covering 
ON "HelperProfile"("userId") 
INCLUDE ("isVerified", rating, "acceptingClients", specializations, languages);

-- Community post covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_list_covering 
ON "CommunityPost"("createdAt" DESC) 
INCLUDE (id, title, category, "authorId", "viewCount", "likeCount", "isPinned");

-- Notification covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_covering 
ON "Notification"("userId", "isRead") 
INCLUDE (type, title, message, "isPriority", "createdAt");

-- =============================================================================
-- SPECIALIZED WELLNESS PLATFORM INDEXES
-- =============================================================================

-- Mental health goal tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wellness_score_trend 
ON "UserProfile"("wellnessScore", "lastAssessmentAt") 
WHERE "wellnessScore" IS NOT NULL;

-- Crisis intervention patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_patterns 
ON "CrisisReport"("triggerType", "interventionType", "createdAt" DESC);

-- Therapy outcome tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_therapy_outcomes 
ON "TherapistClient"("therapistId", "progress", "totalSessions") 
WHERE status = 'ACTIVE';

-- Peer support matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_matching 
ON "UserProfile"("userId") 
INCLUDE ("mentalHealthGoals", "interestedTopics", "preferredCommunication");

-- Anonymous identity trust scoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anonymous_trust 
ON "AnonymousIdentity"("trustScore" DESC, "userId");

-- =============================================================================
-- STATISTICS UPDATE
-- =============================================================================

-- Update table statistics to help query planner
ANALYZE "User";
ANALYZE "UserProfile";
ANALYZE "MoodEntry";
ANALYZE "JournalEntry";
ANALYZE "CommunityPost";
ANALYZE "Comment";
ANALYZE "Appointment";
ANALYZE "Notification";
ANALYZE "HelperProfile";
ANALYZE "SupportGroup";
ANALYZE "ChatMessage";
ANALYZE "DirectMessage";
ANALYZE "CrisisReport";
ANALYZE "AuditLog";
ANALYZE "TherapistClient";
ANALYZE "TherapistSession";
ANALYZE "SafetyAlert";
ANALYZE "SafetyPlan";
ANALYZE "Session";
ANALYZE "FileStorage";
ANALYZE "WellnessChallenge";

-- Enable auto-vacuum for large tables
ALTER TABLE "AuditLog" SET (autovacuum_vacuum_scale_factor = 0.1, autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE "SessionActivity" SET (autovacuum_vacuum_scale_factor = 0.1, autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE "MoodEntry" SET (autovacuum_vacuum_scale_factor = 0.2, autovacuum_analyze_scale_factor = 0.1);
ALTER TABLE "ChatMessage" SET (autovacuum_vacuum_scale_factor = 0.2, autovacuum_analyze_scale_factor = 0.1);