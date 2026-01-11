-- Add INSERT policy for email_notifications table
-- Allows authenticated users to create email notification records for themselves
CREATE POLICY "Users can insert their own email notifications"
ON public.email_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);