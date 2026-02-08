-- Create a trigger function to audit security preference changes
CREATE OR REPLACE FUNCTION public.audit_security_preference_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes JSONB := '{}';
  has_security_changes BOOLEAN := FALSE;
BEGIN
  -- Check each security-critical field for changes
  IF OLD.two_factor_enabled IS DISTINCT FROM NEW.two_factor_enabled THEN
    changes := changes || jsonb_build_object(
      'two_factor_enabled', jsonb_build_object(
        'from', OLD.two_factor_enabled,
        'to', NEW.two_factor_enabled
      )
    );
    has_security_changes := TRUE;
  END IF;

  IF OLD.login_alerts IS DISTINCT FROM NEW.login_alerts THEN
    changes := changes || jsonb_build_object(
      'login_alerts', jsonb_build_object(
        'from', OLD.login_alerts,
        'to', NEW.login_alerts
      )
    );
    has_security_changes := TRUE;
  END IF;

  IF OLD.session_timeout_minutes IS DISTINCT FROM NEW.session_timeout_minutes THEN
    changes := changes || jsonb_build_object(
      'session_timeout_minutes', jsonb_build_object(
        'from', OLD.session_timeout_minutes,
        'to', NEW.session_timeout_minutes
      )
    );
    has_security_changes := TRUE;
  END IF;

  -- Only log if security-related settings were changed
  IF has_security_changes THEN
    INSERT INTO public.audit_log (
      user_id,
      action_type,
      action_target,
      action_data,
      approval_status
    ) VALUES (
      NEW.user_id,
      'security_settings_changed',
      'user_preferences',
      changes,
      'approved'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on user_preferences table
DROP TRIGGER IF EXISTS trigger_audit_security_preferences ON public.user_preferences;

CREATE TRIGGER trigger_audit_security_preferences
AFTER UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.audit_security_preference_changes();

-- Add comment explaining the security audit trigger
COMMENT ON FUNCTION public.audit_security_preference_changes() IS 'Automatically logs changes to security-critical user preferences (two_factor_enabled, login_alerts, session_timeout_minutes) to the audit_log table for security monitoring.';