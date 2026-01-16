-- Create prompt satisfaction alerts table
CREATE TABLE public.prompt_satisfaction_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_version_id UUID REFERENCES public.ai_prompt_versions(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    avg_rating NUMERIC(3,2) NOT NULL,
    total_ratings INTEGER NOT NULL,
    threshold NUMERIC(3,2) NOT NULL DEFAULT 3.5,
    alert_type TEXT NOT NULL DEFAULT 'low_satisfaction',
    status TEXT NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_satisfaction_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage alerts
CREATE POLICY "Admins can view prompt satisfaction alerts"
ON public.prompt_satisfaction_alerts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert prompt satisfaction alerts"
ON public.prompt_satisfaction_alerts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prompt satisfaction alerts"
ON public.prompt_satisfaction_alerts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_prompt_satisfaction_alerts_updated_at
BEFORE UPDATE ON public.prompt_satisfaction_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix audit_log security: Remove UPDATE and DELETE policies
DROP POLICY IF EXISTS "Users can update their own audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can delete their own audit logs" ON public.audit_log;