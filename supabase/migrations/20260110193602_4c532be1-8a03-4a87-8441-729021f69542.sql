-- Create table for storing cover letter and interview prep versions
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cover_letter', 'interview_prep')),
  version_number INTEGER NOT NULL DEFAULT 1,
  content TEXT,
  structured_content JSONB,
  version_name TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_action TEXT -- 'initial', 'regenerated', 'manual_edit'
);

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own document versions" 
ON public.document_versions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document versions" 
ON public.document_versions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document versions" 
ON public.document_versions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document versions" 
ON public.document_versions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_document_versions_application ON public.document_versions(application_id, document_type);
CREATE INDEX idx_document_versions_user ON public.document_versions(user_id);