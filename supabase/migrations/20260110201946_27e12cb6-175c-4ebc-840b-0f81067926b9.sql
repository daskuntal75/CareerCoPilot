-- Create analytics_events table for tracking user engagement
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path VARCHAR(255),
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_category ON public.analytics_events(event_category);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics events
CREATE POLICY "Users can insert their own analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own analytics events
CREATE POLICY "Users can view their own analytics events"
ON public.analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Create email_notifications table for tracking sent emails
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB DEFAULT '{}'
);

-- Create index for efficient querying
CREATE INDEX idx_email_notifications_user_id ON public.email_notifications(user_id);
CREATE INDEX idx_email_notifications_application_id ON public.email_notifications(application_id);
CREATE INDEX idx_email_notifications_type ON public.email_notifications(notification_type);

-- Enable RLS
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own email notifications
CREATE POLICY "Users can view their own email notifications"
ON public.email_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert email notifications (from edge functions)
CREATE POLICY "Service role can insert email notifications"
ON public.email_notifications
FOR INSERT
WITH CHECK (true);

-- Add email_notifications column to profiles for user preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS interview_reminder_days INTEGER DEFAULT 1;