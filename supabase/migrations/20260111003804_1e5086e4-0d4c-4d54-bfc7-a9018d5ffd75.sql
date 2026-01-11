-- Create demo_whitelist table for users who bypass demo limits
CREATE TABLE public.demo_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  reason TEXT,
  whitelisted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can view whitelist
CREATE POLICY "Admins can view whitelist"
ON public.demo_whitelist
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can add to whitelist
CREATE POLICY "Admins can add to whitelist"
ON public.demo_whitelist
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update whitelist
CREATE POLICY "Admins can update whitelist"
ON public.demo_whitelist
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can remove from whitelist
CREATE POLICY "Admins can delete from whitelist"
ON public.demo_whitelist
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can check if they are whitelisted (for the demo limit check)
CREATE POLICY "Users can check own whitelist status"
ON public.demo_whitelist
FOR SELECT
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_demo_whitelist_updated_at
BEFORE UPDATE ON public.demo_whitelist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();