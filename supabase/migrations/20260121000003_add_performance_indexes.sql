-- Performance Optimization: Add indexes for frequently queried columns
-- These indexes significantly improve query performance for common operations

-- ============================================================================
-- APPLICATIONS TABLE INDEXES
-- ============================================================================

-- Index for fetching user's applications (most common query)
CREATE INDEX IF NOT EXISTS idx_applications_user_id
ON public.applications(user_id);

-- Composite index for user + status filtering
CREATE INDEX IF NOT EXISTS idx_applications_user_status
ON public.applications(user_id, status);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_applications_created_at
ON public.applications(created_at DESC);

-- Composite index for user + date ordering (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_applications_user_created
ON public.applications(user_id, created_at DESC);

-- ============================================================================
-- AUDIT_LOG TABLE INDEXES
-- ============================================================================

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
ON public.audit_log(user_id);

-- Index for time-based queries and retention cleanup
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
ON public.audit_log(created_at DESC);

-- Composite index for user + time filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
ON public.audit_log(user_id, created_at DESC);

-- Index for action type filtering (security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
ON public.audit_log(action_type);

-- Index for IP-based rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_ip_address
ON public.audit_log(ip_address)
WHERE ip_address IS NOT NULL;

-- Composite index for rate limiting queries (IP + action + time)
CREATE INDEX IF NOT EXISTS idx_audit_log_rate_limit
ON public.audit_log(ip_address, action_type, created_at DESC)
WHERE ip_address IS NOT NULL;

-- ============================================================================
-- ANALYTICS_EVENTS TABLE INDEXES
-- ============================================================================

-- Index for user analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
ON public.analytics_events(user_id);

-- Index for time-based analytics and cleanup
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON public.analytics_events(created_at DESC);

-- Composite index for user + time analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
ON public.analytics_events(user_id, created_at DESC);

-- Index for event category filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_category
ON public.analytics_events(event_category);

-- Index for session-based analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
ON public.analytics_events(session_id);

-- ============================================================================
-- USER_RESUMES TABLE INDEXES
-- ============================================================================

-- Index for user resume lookups
CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id
ON public.user_resumes(user_id);

-- Composite index for user + resume type
CREATE INDEX IF NOT EXISTS idx_user_resumes_user_type
ON public.user_resumes(user_id, resume_type);

-- ============================================================================
-- DOCUMENT_VERSIONS TABLE INDEXES
-- ============================================================================

-- Index for user's document versions
CREATE INDEX IF NOT EXISTS idx_document_versions_user_id
ON public.document_versions(user_id);

-- Composite index for application + document type lookup
CREATE INDEX IF NOT EXISTS idx_document_versions_app_type
ON public.document_versions(application_id, document_type);

-- Index for current version lookup
CREATE INDEX IF NOT EXISTS idx_document_versions_current
ON public.document_versions(application_id, document_type, is_current)
WHERE is_current = true;

-- ============================================================================
-- RESUME_CHUNKS TABLE INDEXES (Vector Search Performance)
-- ============================================================================

-- Index for user's resume chunks
CREATE INDEX IF NOT EXISTS idx_resume_chunks_user_id
ON public.resume_chunks(user_id);

-- Composite index for user + resume type
CREATE INDEX IF NOT EXISTS idx_resume_chunks_user_type
ON public.resume_chunks(user_id, resume_type);

-- Index for application-specific chunks
CREATE INDEX IF NOT EXISTS idx_resume_chunks_application
ON public.resume_chunks(application_id)
WHERE application_id IS NOT NULL;

-- ============================================================================
-- USER_DEVICES TABLE INDEXES
-- ============================================================================

-- Index for user device lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id
ON public.user_devices(user_id);

-- Index for device fingerprint lookups (login verification)
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint
ON public.user_devices(device_fingerprint);

-- Composite index for user + fingerprint
CREATE INDEX IF NOT EXISTS idx_user_devices_user_fingerprint
ON public.user_devices(user_id, device_fingerprint);

-- ============================================================================
-- SESSION_LOGS TABLE INDEXES
-- ============================================================================

-- Index for user session history
CREATE INDEX IF NOT EXISTS idx_session_logs_user_id
ON public.session_logs(user_id);

-- Index for time-based cleanup
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at
ON public.session_logs(created_at DESC);

-- Index for session ID lookups
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id
ON public.session_logs(session_id);

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Primary lookup is by user_id which should already have an index
-- Add index for updated_at for retention queries
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at
ON public.profiles(updated_at DESC);

-- ============================================================================
-- EMAIL_NOTIFICATIONS TABLE INDEXES
-- ============================================================================

-- Index for user notification preferences
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id
ON public.email_notifications(user_id);

-- Composite for user + notification type
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_type
ON public.email_notifications(user_id, notification_type);

-- ============================================================================
-- USER_CONSENT TABLE INDEXES
-- ============================================================================

-- Index for anonymous consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consent_anonymous
ON public.user_consent(anonymous_id)
WHERE anonymous_id IS NOT NULL;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTER CONDITIONS
-- ============================================================================

-- Partial index for active/pending applications
CREATE INDEX IF NOT EXISTS idx_applications_active
ON public.applications(user_id, updated_at DESC)
WHERE status IN ('pending', 'applied', 'interviewing');

-- Partial index for failed login attempts (rate limiting)
CREATE INDEX IF NOT EXISTS idx_audit_log_failed_logins
ON public.audit_log(ip_address, created_at DESC)
WHERE action_type = 'login_failed';

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Analyze tables to update statistics for query planner
ANALYZE public.applications;
ANALYZE public.audit_log;
ANALYZE public.analytics_events;
ANALYZE public.user_resumes;
ANALYZE public.document_versions;
ANALYZE public.resume_chunks;
ANALYZE public.user_devices;
ANALYZE public.session_logs;
ANALYZE public.profiles;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_applications_user_id IS 'Primary index for user application lookups';
COMMENT ON INDEX idx_audit_log_rate_limit IS 'Composite index for rate limiting queries';
COMMENT ON INDEX idx_analytics_events_user_created IS 'Index for user analytics dashboards';
COMMENT ON INDEX idx_document_versions_current IS 'Partial index for current document version lookups';
COMMENT ON INDEX idx_audit_log_failed_logins IS 'Partial index for failed login rate limiting';
