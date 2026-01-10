-- Fix the overly permissive RLS policy for email_notifications
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Service role can insert email notifications" ON public.email_notifications;

-- Email notifications are inserted only via edge functions using service role
-- No additional INSERT policy needed for regular users
-- The service role bypasses RLS entirely