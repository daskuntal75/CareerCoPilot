-- Add UPDATE policy for email_notifications table
-- Allows authenticated users to update their own email notification records
CREATE POLICY "Users can update their own email notifications"
ON public.email_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for email_notifications table
-- Allows authenticated users to delete their own email notification records
CREATE POLICY "Users can delete their own email notifications"
ON public.email_notifications
FOR DELETE
USING (auth.uid() = user_id);