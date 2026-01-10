-- Move vector extension to extensions schema (if exists, drop and recreate)
DROP EXTENSION IF EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;