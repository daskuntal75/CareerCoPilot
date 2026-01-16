-- Create usage_logs table for hourly AI generation rate limiting
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'generate_cover_letter', 'generate_interview_prep', 'analyze_job_fit'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT
);

-- Create index for efficient hourly queries
CREATE INDEX idx_usage_logs_user_action_time ON public.usage_logs (user_id, action, created_at DESC);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own usage logs"
ON public.usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own logs (via edge functions with service role, but allow direct insert too)
CREATE POLICY "Users can insert their own usage logs"
ON public.usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all usage logs"
ON public.usage_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check hourly rate limit
CREATE OR REPLACE FUNCTION public.check_hourly_rate_limit(
  p_user_id UUID,
  p_action TEXT DEFAULT NULL,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_count BIGINT,
  remaining INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := NOW() - INTERVAL '1 hour';
  
  -- Count requests in the last hour
  SELECT COUNT(*) INTO v_count
  FROM public.usage_logs
  WHERE user_id = p_user_id
    AND created_at > v_window_start
    AND (p_action IS NULL OR action = p_action);
  
  RETURN QUERY SELECT 
    v_count < p_max_requests,
    v_count,
    GREATEST(0, p_max_requests - v_count)::INTEGER,
    v_window_start + INTERVAL '1 hour';
END;
$$;

-- Create function to log usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_user_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.usage_logs (user_id, action, metadata, ip_address)
  VALUES (p_user_id, p_action, p_metadata, p_ip_address)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;