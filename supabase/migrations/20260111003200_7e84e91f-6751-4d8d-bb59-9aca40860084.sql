-- Add restrictive INSERT policy for revenue_events table
-- Only service role can insert (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can insert revenue events"
ON public.revenue_events
FOR INSERT
WITH CHECK (false);

-- Add restrictive UPDATE policy for revenue_events table
-- Only service role can update (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can update revenue events"
ON public.revenue_events
FOR UPDATE
USING (false);

-- Add restrictive DELETE policy for revenue_events table
-- Only service role can delete (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can delete revenue events"
ON public.revenue_events
FOR DELETE
USING (false);