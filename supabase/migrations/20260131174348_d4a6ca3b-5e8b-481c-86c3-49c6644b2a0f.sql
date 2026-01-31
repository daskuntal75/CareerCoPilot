-- Add RLS policy for admins to view all applications
CREATE POLICY "Admins can view all applications" 
ON public.applications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));