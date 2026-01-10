-- Update get_admin_usage_stats to use has_role instead of profiles.is_admin
CREATE OR REPLACE FUNCTION public.get_admin_usage_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, active_users bigint, cover_letters_generated bigint, interview_preps_generated bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin using has_role function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$;

-- Update get_admin_application_stats to use has_role instead of profiles.is_admin
CREATE OR REPLACE FUNCTION public.get_admin_application_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, applications_created bigint, applications_submitted bigint, interviews_scheduled bigint, offers_received bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin using has_role function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$;

-- Update get_admin_user_summary to use has_role instead of profiles.is_admin
CREATE OR REPLACE FUNCTION public.get_admin_user_summary()
 RETURNS TABLE(total_users bigint, users_with_applications bigint, users_this_month bigint, total_applications bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin using has_role function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.applications)::BIGINT as users_with_applications,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('month', NOW()))::BIGINT as users_this_month,
    (SELECT COUNT(*) FROM public.applications)::BIGINT as total_applications;
END;
$function$;