-- Create user_resumes table for profile-level resume storage
CREATE TABLE public.user_resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resume_type TEXT NOT NULL CHECK (resume_type IN ('detailed', 'abridged')),
  file_name TEXT NOT NULL,
  file_path TEXT,
  content TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, resume_type)
);

-- Create user_cover_letter_templates table
CREATE TABLE public.user_cover_letter_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  file_name TEXT,
  file_path TEXT,
  content TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add resume_type to resume_chunks and make application_id nullable
ALTER TABLE public.resume_chunks 
  ADD COLUMN resume_type TEXT DEFAULT 'detailed' CHECK (resume_type IN ('detailed', 'abridged')),
  ALTER COLUMN application_id DROP NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cover_letter_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_resumes
CREATE POLICY "Users can view their own resumes"
  ON public.user_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resumes"
  ON public.user_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
  ON public.user_resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON public.user_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for user_cover_letter_templates
CREATE POLICY "Users can view their own cover letter template"
  ON public.user_cover_letter_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cover letter template"
  ON public.user_cover_letter_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cover letter template"
  ON public.user_cover_letter_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cover letter template"
  ON public.user_cover_letter_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_user_resumes_updated_at
  BEFORE UPDATE ON public.user_resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_cover_letter_templates_updated_at
  BEFORE UPDATE ON public.user_cover_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();