-- Create table to store demo feedback for analytics
CREATE TABLE public.demo_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_recommend TEXT CHECK (would_recommend IN ('yes', 'maybe', 'no')),
  feedback TEXT,
  feedback_type TEXT DEFAULT 'demo_completion',
  application_count INTEGER,
  company TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.demo_feedback 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role and authenticated users to insert
CREATE POLICY "Users can submit feedback" 
ON public.demo_feedback 
FOR INSERT 
WITH CHECK (true);

-- Create index for analytics queries
CREATE INDEX idx_demo_feedback_created_at ON public.demo_feedback(created_at DESC);
CREATE INDEX idx_demo_feedback_rating ON public.demo_feedback(rating);