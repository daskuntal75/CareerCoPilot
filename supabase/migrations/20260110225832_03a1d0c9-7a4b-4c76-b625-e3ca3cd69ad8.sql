-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (secure role storage - separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy: Only admins can manage roles (via security definer function)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create subscriptions table to track Stripe subscription data
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'inactive',
    tier TEXT NOT NULL DEFAULT 'free',
    price_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create revenue_events table for tracking payments
CREATE TABLE public.revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    event_type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on revenue_events
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view revenue events
CREATE POLICY "Admins can view revenue events"
ON public.revenue_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_revenue_events_created_at ON public.revenue_events(created_at);
CREATE INDEX idx_revenue_events_user_id ON public.revenue_events(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Add trigger for updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin function to get user management data
CREATE OR REPLACE FUNCTION public.get_admin_users_with_subscriptions(
    search_term TEXT DEFAULT NULL,
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    subscription_status TEXT,
    subscription_tier TEXT,
    subscription_end TIMESTAMP WITH TIME ZONE,
    total_applications BIGINT,
    cover_letters_used BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        u.email::TEXT,
        p.full_name,
        p.created_at,
        COALESCE(s.status, 'free')::TEXT as subscription_status,
        COALESCE(s.tier, 'free')::TEXT as subscription_tier,
        s.current_period_end as subscription_end,
        COALESCE((SELECT COUNT(*) FROM public.applications a WHERE a.user_id = p.user_id), 0) as total_applications,
        COALESCE((
            SELECT SUM(ut.usage_count) 
            FROM public.usage_tracking ut 
            WHERE ut.user_id = p.user_id 
            AND ut.feature_type = 'cover_letter'
            AND ut.usage_month = to_char(NOW(), 'YYYY-MM')
        ), 0) as cover_letters_used
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN public.subscriptions s ON p.user_id = s.user_id
    WHERE (search_term IS NULL OR search_term = '' OR 
           p.full_name ILIKE '%' || search_term || '%' OR 
           u.email ILIKE '%' || search_term || '%')
    ORDER BY p.created_at DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
END;
$$;

-- Create admin function to get revenue stats
CREATE OR REPLACE FUNCTION public.get_admin_revenue_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    total_revenue_cents BIGINT,
    subscription_revenue_cents BIGINT,
    new_subscriptions BIGINT,
    cancellations BIGINT,
    mrr_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        DATE_TRUNC('day', re.created_at)::DATE as date,
        COALESCE(SUM(re.amount_cents) FILTER (WHERE re.event_type IN ('payment_succeeded', 'invoice.paid')), 0)::BIGINT as total_revenue_cents,
        COALESCE(SUM(re.amount_cents) FILTER (WHERE re.event_type = 'invoice.paid' AND re.stripe_subscription_id IS NOT NULL), 0)::BIGINT as subscription_revenue_cents,
        COUNT(*) FILTER (WHERE re.event_type = 'customer.subscription.created')::BIGINT as new_subscriptions,
        COUNT(*) FILTER (WHERE re.event_type = 'customer.subscription.deleted')::BIGINT as cancellations,
        0::BIGINT as mrr_cents
    FROM public.revenue_events re
    WHERE re.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE_TRUNC('day', re.created_at)
    ORDER BY date DESC;
END;
$$;

-- Create function to get revenue summary
CREATE OR REPLACE FUNCTION public.get_admin_revenue_summary()
RETURNS TABLE(
    total_revenue_cents BIGINT,
    revenue_this_month_cents BIGINT,
    active_subscriptions BIGINT,
    mrr_cents BIGINT,
    churn_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_subs BIGINT;
    canceled_this_month BIGINT;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT COUNT(*) INTO active_subs 
    FROM public.subscriptions 
    WHERE status = 'active';
    
    SELECT COUNT(*) INTO canceled_this_month 
    FROM public.subscriptions 
    WHERE canceled_at >= DATE_TRUNC('month', NOW());

    RETURN QUERY
    SELECT 
        COALESCE((SELECT SUM(amount_cents) FROM public.revenue_events WHERE event_type IN ('payment_succeeded', 'invoice.paid')), 0)::BIGINT as total_revenue_cents,
        COALESCE((SELECT SUM(amount_cents) FROM public.revenue_events WHERE event_type IN ('payment_succeeded', 'invoice.paid') AND created_at >= DATE_TRUNC('month', NOW())), 0)::BIGINT as revenue_this_month_cents,
        active_subs as active_subscriptions,
        COALESCE((SELECT SUM(amount_cents) FROM public.revenue_events WHERE event_type = 'invoice.paid' AND created_at >= NOW() - INTERVAL '30 days') / NULLIF(EXTRACT(DAY FROM NOW() - DATE_TRUNC('month', NOW())), 0) * 30, 0)::BIGINT as mrr_cents,
        CASE WHEN active_subs + canceled_this_month > 0 
             THEN ROUND(canceled_this_month::NUMERIC / (active_subs + canceled_this_month) * 100, 2)
             ELSE 0 
        END as churn_rate;
END;
$$;