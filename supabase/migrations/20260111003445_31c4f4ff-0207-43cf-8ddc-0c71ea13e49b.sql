-- Add UPDATE policy for job_requirements table
CREATE POLICY "Users can update their own job requirements"
ON public.job_requirements
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM applications a
  WHERE a.id = job_requirements.application_id AND a.user_id = auth.uid()
));

-- Add DELETE policy for requirement_matches table
CREATE POLICY "Users can delete their own requirement matches"
ON public.requirement_matches
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM job_requirements jr
  JOIN applications a ON a.id = jr.application_id
  WHERE jr.id = requirement_matches.requirement_id AND a.user_id = auth.uid()
));

-- Add UPDATE policy for resume_chunks table
CREATE POLICY "Users can update their own resume chunks"
ON public.resume_chunks
FOR UPDATE
USING (auth.uid() = user_id);

-- Add UPDATE policy for analytics_events table
CREATE POLICY "Users can update their own analytics events"
ON public.analytics_events
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for analytics_events table
CREATE POLICY "Users can delete their own analytics events"
ON public.analytics_events
FOR DELETE
USING (auth.uid() = user_id);