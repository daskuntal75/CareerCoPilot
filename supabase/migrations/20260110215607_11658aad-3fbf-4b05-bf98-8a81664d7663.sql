-- =====================================================
-- SECURITY, PRIVACY & PERFORMANCE MIGRATION
-- =====================================================

-- 1. AUDIT LOG TABLE for Human-in-the-Loop tracking
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_target TEXT,
  action_data JSONB,
  approval_status TEXT DEFAULT 'pending',
  approval_hash TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own audit logs
CREATE POLICY "Users can create their own audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending audit logs (for approvals)
CREATE POLICY "Users can update their own audit logs"
  ON public.audit_log
  FOR UPDATE
  USING (auth.uid() = user_id AND approval_status = 'pending');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- 2. PII REDACTION FLAGS for resume chunks
ALTER TABLE public.resume_chunks 
ADD COLUMN IF NOT EXISTS pii_redacted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_pii_hash TEXT;

-- 3. Add keyword search vector for hybrid search (BM25-style)
ALTER TABLE public.resume_chunks
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_resume_chunks_search_vector 
ON public.resume_chunks USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION public.update_resume_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

-- Trigger to auto-update search vector
DROP TRIGGER IF EXISTS trigger_resume_chunks_search_vector ON public.resume_chunks;
CREATE TRIGGER trigger_resume_chunks_search_vector
BEFORE INSERT OR UPDATE ON public.resume_chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_resume_search_vector();

-- 4. CASCADING DELETION - Ensure vector data is deleted when user deletes account
-- Create function to cascade delete user data (for GDPR Right to Erasure)
CREATE OR REPLACE FUNCTION public.cascade_delete_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_user_id UUID := OLD.id;
BEGIN
  -- Delete all resume chunks (vector embeddings)
  DELETE FROM public.resume_chunks WHERE user_id = deleted_user_id;
  
  -- Delete all requirement matches through applications
  DELETE FROM public.requirement_matches 
  WHERE requirement_id IN (
    SELECT jr.id FROM public.job_requirements jr
    JOIN public.applications a ON jr.application_id = a.id
    WHERE a.user_id = deleted_user_id
  );
  
  -- Delete all job requirements
  DELETE FROM public.job_requirements 
  WHERE application_id IN (
    SELECT id FROM public.applications WHERE user_id = deleted_user_id
  );
  
  -- Delete all document versions
  DELETE FROM public.document_versions WHERE user_id = deleted_user_id;
  
  -- Delete all applications
  DELETE FROM public.applications WHERE user_id = deleted_user_id;
  
  -- Delete all analytics events
  DELETE FROM public.analytics_events WHERE user_id = deleted_user_id;
  
  -- Delete all email notifications
  DELETE FROM public.email_notifications WHERE user_id = deleted_user_id;
  
  -- Delete user resumes
  DELETE FROM public.user_resumes WHERE user_id = deleted_user_id;
  
  -- Delete cover letter templates
  DELETE FROM public.user_cover_letter_templates WHERE user_id = deleted_user_id;
  
  -- Delete audit logs
  DELETE FROM public.audit_log WHERE user_id = deleted_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = deleted_user_id;
  
  RETURN OLD;
END;
$$;

-- 5. DATA SANITIZATION LOG for tracking sanitized inputs
CREATE TABLE IF NOT EXISTS public.sanitization_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  input_type TEXT NOT NULL,
  original_hash TEXT NOT NULL,
  threats_detected JSONB DEFAULT '[]'::jsonb,
  sanitized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sanitization_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for security monitoring)
CREATE POLICY "Service role only for sanitization logs"
  ON public.sanitization_log
  FOR ALL
  USING (false);

-- Index for monitoring
CREATE INDEX IF NOT EXISTS idx_sanitization_log_created 
ON public.sanitization_log(sanitized_at DESC);

-- 6. Update existing resume_chunks with search vector
UPDATE public.resume_chunks 
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;