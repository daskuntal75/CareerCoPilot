-- Create a rate-limiting function for audit log inserts
CREATE OR REPLACE FUNCTION public.check_audit_log_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count BIGINT;
BEGIN
  -- Count audit log entries from this user in the last minute
  SELECT COUNT(*) INTO recent_count
  FROM public.audit_log
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Allow max 30 audit log entries per user per minute
  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Audit log rate limit exceeded. Max 30 entries per minute.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce rate limiting on audit_log inserts
CREATE TRIGGER enforce_audit_log_rate_limit
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.check_audit_log_rate_limit();
