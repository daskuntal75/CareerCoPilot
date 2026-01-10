-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing resume chunks with embeddings
CREATE TABLE public.resume_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  chunk_type TEXT DEFAULT 'general', -- 'experience', 'education', 'skills', 'general'
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing extracted job requirements with embeddings
CREATE TABLE public.job_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  requirement_index INTEGER NOT NULL,
  requirement_text TEXT NOT NULL,
  category TEXT, -- 'technical', 'experience', 'leadership', 'domain', 'soft_skills'
  is_critical BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing semantic matches between requirements and resume chunks
CREATE TABLE public.requirement_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES public.job_requirements(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.resume_chunks(id) ON DELETE CASCADE,
  similarity_score NUMERIC(4,3) NOT NULL, -- 0.000 to 1.000
  match_evidence TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, chunk_id)
);

-- Enable RLS
ALTER TABLE public.resume_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resume_chunks
CREATE POLICY "Users can view their own resume chunks"
ON public.resume_chunks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resume chunks"
ON public.resume_chunks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume chunks"
ON public.resume_chunks FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for job_requirements (via application ownership)
CREATE POLICY "Users can view their own job requirements"
ON public.job_requirements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = job_requirements.application_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create job requirements for their applications"
ON public.job_requirements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = job_requirements.application_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own job requirements"
ON public.job_requirements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = job_requirements.application_id
    AND a.user_id = auth.uid()
  )
);

-- RLS Policies for requirement_matches (via application ownership)
CREATE POLICY "Users can view their own requirement matches"
ON public.requirement_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.job_requirements jr
    JOIN public.applications a ON a.id = jr.application_id
    WHERE jr.id = requirement_matches.requirement_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create requirement matches for their applications"
ON public.requirement_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.job_requirements jr
    JOIN public.applications a ON a.id = jr.application_id
    WHERE jr.id = requirement_matches.requirement_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own requirement matches"
ON public.requirement_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.job_requirements jr
    JOIN public.applications a ON a.id = jr.application_id
    WHERE jr.id = requirement_matches.requirement_id
    AND a.user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_resume_chunks_user_id ON public.resume_chunks(user_id);
CREATE INDEX idx_resume_chunks_application_id ON public.resume_chunks(application_id);
CREATE INDEX idx_job_requirements_application_id ON public.job_requirements(application_id);
CREATE INDEX idx_requirement_matches_requirement_id ON public.requirement_matches(requirement_id);
CREATE INDEX idx_requirement_matches_chunk_id ON public.requirement_matches(chunk_id);
CREATE INDEX idx_requirement_matches_score ON public.requirement_matches(similarity_score DESC);