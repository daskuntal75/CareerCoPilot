-- Subscriptions Table for Stripe Integration
-- Stores subscription data synced from Stripe webhooks

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Stripe identifiers
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  -- Subscription details
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on user_id (one subscription per user)
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
ON public.subscriptions(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
ON public.subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tier
ON public.subscriptions(tier);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can modify (via webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (false);

-- Grant permissions
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Usage logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for usage logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id
ON public.usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
ON public.usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
ON public.usage_logs(user_id, created_at DESC);

-- Partial index for recent usage (rate limiting)
CREATE INDEX IF NOT EXISTS idx_usage_logs_recent
ON public.usage_logs(user_id, created_at DESC)
WHERE created_at > now() - INTERVAL '1 hour';

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert
CREATE POLICY "Service role can insert usage" ON public.usage_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.usage_logs TO authenticated;
GRANT INSERT, SELECT ON public.usage_logs TO service_role;

-- Function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now());

  RETURN COALESCE(v_tier, 'free');
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_tier TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tier TO service_role;

COMMENT ON TABLE public.subscriptions IS 'User subscription data synced from Stripe';
COMMENT ON TABLE public.usage_logs IS 'API usage logs for rate limiting';
COMMENT ON FUNCTION get_user_tier IS 'Get current subscription tier for a user';
