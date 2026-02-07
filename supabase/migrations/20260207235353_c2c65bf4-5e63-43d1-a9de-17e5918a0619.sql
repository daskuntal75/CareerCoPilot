-- Add explicit DENY policies for UPDATE and DELETE on audit_log table
-- This ensures audit logs cannot be modified or deleted even if RLS is somehow bypassed

-- Drop existing policies if they exist (they don't, but this is safe)
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_log;

-- Create explicit DENY policies for UPDATE and DELETE
CREATE POLICY "No one can update audit logs"
ON public.audit_log
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete audit logs"
ON public.audit_log
FOR DELETE
USING (false);

-- Add a comment explaining why these policies exist
COMMENT ON TABLE public.audit_log IS 'Immutable audit log table. UPDATE and DELETE operations are explicitly denied to maintain audit trail integrity.';