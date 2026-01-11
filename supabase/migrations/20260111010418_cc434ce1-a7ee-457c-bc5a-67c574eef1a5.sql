-- Fix RLS policy to be more restrictive - only allow authenticated users
DROP POLICY IF EXISTS "Users can submit feedback" ON public.demo_feedback;

CREATE POLICY "Authenticated users can submit feedback" 
ON public.demo_feedback 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);