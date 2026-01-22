-- Scalable Rate Limiting Table
-- Replaces in-memory rate limiting with database-backed solution
-- Works across distributed edge function instances

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identifier: can be user_id, IP address, or composite key
  bucket_key TEXT NOT NULL,
  -- The resource/endpoint being rate limited
  resource TEXT NOT NULL,
  -- Token bucket algorithm fields
  tokens INTEGER NOT NULL DEFAULT 0,
  max_tokens INTEGER NOT NULL DEFAULT 100,
  refill_rate INTEGER NOT NULL DEFAULT 10, -- tokens per interval
  refill_interval_ms INTEGER NOT NULL DEFAULT 1000, -- milliseconds
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Sliding window fields (alternative algorithm)
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_duration_ms INTEGER NOT NULL DEFAULT 60000, -- 1 minute default
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on bucket_key + resource
  CONSTRAINT unique_bucket UNIQUE (bucket_key, resource)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_key
ON public.rate_limit_buckets(bucket_key, resource);

-- Index for cleanup of old buckets
CREATE INDEX IF NOT EXISTS idx_rate_limit_updated_at
ON public.rate_limit_buckets(updated_at);

-- Enable RLS (service role will bypass)
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role only" ON public.rate_limit_buckets
  FOR ALL USING (false);

-- Grant to service role
GRANT ALL ON public.rate_limit_buckets TO service_role;

-- ============================================================================
-- RATE LIMITING FUNCTIONS
-- ============================================================================

-- Function to check and consume a rate limit token (sliding window algorithm)
-- Returns: { allowed: boolean, remaining: integer, reset_at: timestamptz }
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket_key TEXT,
  p_resource TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket RECORD;
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Calculate window start time
  v_window_start := v_now - (p_window_ms || ' milliseconds')::INTERVAL;

  -- Try to get or create the bucket with atomic upsert
  INSERT INTO rate_limit_buckets (
    bucket_key,
    resource,
    request_count,
    window_start_at,
    window_duration_ms,
    max_tokens,
    updated_at
  )
  VALUES (
    p_bucket_key,
    p_resource,
    1,
    v_now,
    p_window_ms,
    p_max_requests,
    v_now
  )
  ON CONFLICT (bucket_key, resource) DO UPDATE SET
    -- Reset window if it has expired
    request_count = CASE
      WHEN rate_limit_buckets.window_start_at < v_window_start THEN 1
      ELSE rate_limit_buckets.request_count + 1
    END,
    window_start_at = CASE
      WHEN rate_limit_buckets.window_start_at < v_window_start THEN v_now
      ELSE rate_limit_buckets.window_start_at
    END,
    max_tokens = p_max_requests,
    window_duration_ms = p_window_ms,
    updated_at = v_now
  RETURNING * INTO v_bucket;

  -- Build result
  v_result := json_build_object(
    'allowed', v_bucket.request_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_bucket.request_count),
    'total', p_max_requests,
    'reset_at', v_bucket.window_start_at + (p_window_ms || ' milliseconds')::INTERVAL
  );

  RETURN v_result;
END;
$$;

-- Function to check rate limit without consuming (peek)
CREATE OR REPLACE FUNCTION peek_rate_limit(
  p_bucket_key TEXT,
  p_resource TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket RECORD;
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := v_now - (p_window_ms || ' milliseconds')::INTERVAL;

  SELECT * INTO v_bucket
  FROM rate_limit_buckets
  WHERE bucket_key = p_bucket_key AND resource = p_resource;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'allowed', true,
      'remaining', p_max_requests,
      'total', p_max_requests,
      'reset_at', v_now + (p_window_ms || ' milliseconds')::INTERVAL
    );
  END IF;

  -- Check if window has expired
  IF v_bucket.window_start_at < v_window_start THEN
    v_current_count := 0;
  ELSE
    v_current_count := v_bucket.request_count;
  END IF;

  RETURN json_build_object(
    'allowed', v_current_count < p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count),
    'total', p_max_requests,
    'reset_at', v_bucket.window_start_at + (p_window_ms || ' milliseconds')::INTERVAL
  );
END;
$$;

-- Function to clean up old rate limit buckets
CREATE OR REPLACE FUNCTION cleanup_rate_limit_buckets(
  p_older_than_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE updated_at < now() - (p_older_than_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION peek_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_buckets TO service_role;

COMMENT ON TABLE public.rate_limit_buckets IS 'Distributed rate limiting storage for edge functions';
COMMENT ON FUNCTION check_rate_limit IS 'Check and consume a rate limit token using sliding window algorithm';
COMMENT ON FUNCTION peek_rate_limit IS 'Check rate limit status without consuming a token';
