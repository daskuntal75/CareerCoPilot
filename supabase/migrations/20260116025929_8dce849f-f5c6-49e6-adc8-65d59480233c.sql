-- Create table for AI prompt version history
CREATE TABLE public.ai_prompt_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage prompt versions (using user_roles table)
CREATE POLICY "Admins can view AI prompt versions"
ON public.ai_prompt_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert AI prompt versions"
ON public.ai_prompt_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update AI prompt versions"
ON public.ai_prompt_versions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete AI prompt versions"
ON public.ai_prompt_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_ai_prompt_versions_setting_key ON public.ai_prompt_versions(setting_key);
CREATE INDEX idx_ai_prompt_versions_created_at ON public.ai_prompt_versions(created_at DESC);