
-- Fix warn-level security issues: block anonymous SELECT access on all affected tables
-- by adding policies that require authentication

-- user_preferences: block anonymous SELECT
CREATE POLICY "Block anonymous access to user_preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- usage_tracking: block anonymous SELECT  
CREATE POLICY "Block anonymous access to usage_tracking"
ON public.usage_tracking
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- analytics_events: block anonymous SELECT
CREATE POLICY "Block anonymous access to analytics_events"
ON public.analytics_events
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- usage_logs: block anonymous SELECT
CREATE POLICY "Block anonymous access to usage_logs"
ON public.usage_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- prompt_telemetry: block anonymous SELECT
CREATE POLICY "Block anonymous access to prompt_telemetry"
ON public.prompt_telemetry
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- job_requirements: block anonymous SELECT
CREATE POLICY "Block anonymous access to job_requirements"
ON public.job_requirements
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- requirement_matches: block anonymous SELECT
CREATE POLICY "Block anonymous access to requirement_matches"
ON public.requirement_matches
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- email_notifications: block anonymous SELECT
CREATE POLICY "Block anonymous access to email_notifications"
ON public.email_notifications
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- user_roles: block anonymous SELECT
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- admin_settings: block anonymous SELECT
CREATE POLICY "Block anonymous access to admin_settings"
ON public.admin_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ai_prompt_versions: block anonymous SELECT
CREATE POLICY "Block anonymous access to ai_prompt_versions"
ON public.ai_prompt_versions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- prompt_satisfaction_alerts: block anonymous SELECT
CREATE POLICY "Block anonymous access to prompt_satisfaction_alerts"
ON public.prompt_satisfaction_alerts
FOR SELECT
USING (auth.uid() IS NOT NULL);
