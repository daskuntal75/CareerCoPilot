-- Add RPC functions for PostgreSQL advisory locks
-- Used for race condition prevention in critical operations like admin setup

-- Function to try acquiring an advisory lock (non-blocking)
CREATE OR REPLACE FUNCTION pg_try_advisory_lock(key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(key);
$$;

-- Function to release an advisory lock
CREATE OR REPLACE FUNCTION pg_advisory_unlock(key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(key);
$$;

-- Grant execute permissions to authenticated and service role
GRANT EXECUTE ON FUNCTION pg_try_advisory_lock(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_try_advisory_lock(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION pg_advisory_unlock(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_advisory_unlock(bigint) TO service_role;
