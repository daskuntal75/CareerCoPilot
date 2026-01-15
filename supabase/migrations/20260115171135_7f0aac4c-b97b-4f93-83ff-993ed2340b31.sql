-- Fix demo_feedback table security

-- First, update any NULL user_id records to prevent migration failure
-- (These would be orphaned records that can't be attributed)
DELETE FROM demo_feedback WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent unattributed feedback
ALTER TABLE demo_feedback ALTER COLUMN user_id SET NOT NULL;

-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON demo_feedback;

-- Create a secure INSERT policy that requires user_id = auth.uid()
CREATE POLICY "Users can submit their own feedback" 
ON demo_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);