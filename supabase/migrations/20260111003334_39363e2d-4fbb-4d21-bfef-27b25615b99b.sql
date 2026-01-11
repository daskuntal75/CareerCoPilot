-- Add restrictive INSERT policy for subscriptions table
-- Only service role can insert (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (false);

-- Add restrictive UPDATE policy for subscriptions table
-- Only service role can update (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (false);

-- Add restrictive DELETE policy for subscriptions table
-- Only service role can delete (service role bypasses RLS, so this blocks all client access)
CREATE POLICY "Only service role can delete subscriptions"
ON public.subscriptions
FOR DELETE
USING (false);