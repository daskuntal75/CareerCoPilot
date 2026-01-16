-- Create a table to track AI prompt telemetry for monitoring and product analytics
CREATE TABLE public.prompt_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cover_letter', 'interview_prep')),
  action_type TEXT NOT NULL CHECK (action_type IN ('generate', 'regenerate', 'quick_improvement')),
  section TEXT,
  user_feedback TEXT,
  selected_tips TEXT[],
  injected_prompt TEXT,
  prompt_metadata JSONB DEFAULT '{}',
  response_quality_rating INTEGER CHECK (response_quality_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_telemetry ENABLE ROW LEVEL SECURITY;

-- Users can insert their own prompt telemetry
CREATE POLICY "Users can insert their own prompt telemetry"
ON public.prompt_telemetry
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own prompt telemetry
CREATE POLICY "Users can view their own prompt telemetry"
ON public.prompt_telemetry
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all prompt telemetry for monitoring
CREATE POLICY "Admins can view all prompt telemetry"
ON public.prompt_telemetry
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient queries
CREATE INDEX idx_prompt_telemetry_user_id ON public.prompt_telemetry(user_id);
CREATE INDEX idx_prompt_telemetry_application_id ON public.prompt_telemetry(application_id);
CREATE INDEX idx_prompt_telemetry_created_at ON public.prompt_telemetry(created_at DESC);
CREATE INDEX idx_prompt_telemetry_document_type ON public.prompt_telemetry(document_type);
CREATE INDEX idx_prompt_telemetry_action_type ON public.prompt_telemetry(action_type);