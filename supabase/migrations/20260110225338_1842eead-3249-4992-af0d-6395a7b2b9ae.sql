-- Drop the views that have security definer issues (we'll use the functions instead)
DROP VIEW IF EXISTS public.admin_usage_stats;
DROP VIEW IF EXISTS public.admin_application_stats;