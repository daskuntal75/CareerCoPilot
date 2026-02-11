
-- Add CHECK constraints to validate subscription tier and status values
-- This prevents invalid data even from service role operations

ALTER TABLE public.subscriptions
ADD CONSTRAINT valid_subscription_tier 
CHECK (tier IN ('free', 'pro', 'enterprise', 'starter', 'premium'));

ALTER TABLE public.subscriptions
ADD CONSTRAINT valid_subscription_status
CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'));

-- Add validation constraint for revenue_events (same pattern)
ALTER TABLE public.revenue_events
ADD CONSTRAINT valid_event_type
CHECK (event_type IN ('payment', 'refund', 'subscription_created', 'subscription_updated', 'subscription_canceled', 'invoice_paid', 'invoice_payment_failed', 'charge_succeeded', 'charge_failed', 'checkout_completed'));

ALTER TABLE public.revenue_events
ADD CONSTRAINT valid_currency_code
CHECK (length(currency) = 3);

-- Add trigger to audit all subscription modifications
CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action_type, action_target, action_data)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'subscription_created'
      WHEN 'UPDATE' THEN 'subscription_updated'
      WHEN 'DELETE' THEN 'subscription_deleted'
    END,
    'subscriptions',
    jsonb_build_object(
      'operation', TG_OP,
      'subscription_id', COALESCE(NEW.id, OLD.id),
      'tier', COALESCE(NEW.tier, OLD.tier),
      'status', COALESCE(NEW.status, OLD.status),
      'stripe_subscription_id', COALESCE(NEW.stripe_subscription_id, OLD.stripe_subscription_id)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_subscription_changes
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_changes();
