-- Fix 1: Add DELETE policy for profiles table
-- This restricts users to only delete their own profiles
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix 2: The demo_feedback table already has admin-only SELECT policy,
-- but we should add explicit policy for users to view ONLY their own feedback
-- This ensures no user can read other users' feedback
CREATE POLICY "Users can view their own feedback" 
ON public.demo_feedback 
FOR SELECT 
USING (auth.uid() = user_id);