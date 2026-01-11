-- Add DELETE policy for audit_log table
-- Allows users to delete their own audit logs for privacy compliance (GDPR)
CREATE POLICY "Users can delete their own audit logs"
ON public.audit_log
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for admin_settings table
-- Allows admins to delete settings when needed
CREATE POLICY "Admins can delete settings"
ON public.admin_settings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for usage_tracking table
-- Allows users to delete their own usage records for privacy compliance
CREATE POLICY "Users can delete their own usage tracking"
ON public.usage_tracking
FOR DELETE
USING (auth.uid() = user_id);