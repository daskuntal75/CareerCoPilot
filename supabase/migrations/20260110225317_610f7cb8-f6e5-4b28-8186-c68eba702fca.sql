-- Add is_admin flag to profiles for admin access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Create a view for admin analytics (aggregated usage data)
CREATE OR REPLACE VIEW public.admin_usage_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) FILTER (WHERE feature_type = 'cover_letter') as cover_letters_generated,
  COUNT(*) FILTER (WHERE feature_type = 'interview_prep') as interview_preps_generated
FROM public.usage_tracking
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create a view for subscription stats (requires check-subscription to populate)
CREATE OR REPLACE VIEW public.admin_application_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as applications_created,
  COUNT(*) FILTER (WHERE status = 'applied') as applications_submitted,
  COUNT(*) FILTER (WHERE status = 'interviewing') as interviews_scheduled,
  COUNT(*) FILTER (WHERE status = 'offer') as offers_received
FROM public.applications
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- RLS policy for admin views (admin only)
-- Note: Views inherit RLS from base tables, so we need functions for admin access

-- Create function to get usage stats for admins
CREATE OR REPLACE FUNCTION public.get_admin_usage_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  active_users BIGINT,
  cover_letters_generated BIGINT,
  interview_preps_generated BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', ut.created_at)::DATE as date,
    COUNT(DISTINCT ut.user_id) as active_users,
    SUM(ut.usage_count) FILTER (WHERE ut.feature_type = 'cover_letter') as cover_letters_generated,
    SUM(ut.usage_count) FILTER (WHERE ut.feature_type = 'interview_prep') as interview_preps_generated
  FROM public.usage_tracking ut
  WHERE ut.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', ut.created_at)
  ORDER BY date DESC;
END;
$$;

-- Create function to get application stats for admins
CREATE OR REPLACE FUNCTION public.get_admin_application_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  applications_created BIGINT,
  applications_submitted BIGINT,
  interviews_scheduled BIGINT,
  offers_received BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', a.created_at)::DATE as date,
    COUNT(*) as applications_created,
    COUNT(*) FILTER (WHERE a.status = 'applied') as applications_submitted,
    COUNT(*) FILTER (WHERE a.status = 'interviewing') as interviews_scheduled,
    COUNT(*) FILTER (WHERE a.status = 'offer') as offers_received
  FROM public.applications a
  WHERE a.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', a.created_at)
  ORDER BY date DESC;
END;
$$;

-- Create function to get user summary for admins
CREATE OR REPLACE FUNCTION public.get_admin_user_summary()
RETURNS TABLE (
  total_users BIGINT,
  users_with_applications BIGINT,
  users_this_month BIGINT,
  total_applications BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.applications)::BIGINT as users_with_applications,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('month', NOW()))::BIGINT as users_this_month,
    (SELECT COUNT(*) FROM public.applications)::BIGINT as total_applications;
END;
$$;