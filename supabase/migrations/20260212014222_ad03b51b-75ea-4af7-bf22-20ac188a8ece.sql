
DROP FUNCTION IF EXISTS public.get_user_applications_decrypted();
DROP FUNCTION IF EXISTS public.get_application_decrypted(uuid);

CREATE OR REPLACE FUNCTION public.get_user_applications_decrypted()
RETURNS TABLE (
  id uuid, user_id uuid, company text, job_title text, job_description text,
  status text, fit_score integer, fit_level text, applied_at timestamptz,
  created_at timestamptz, updated_at timestamptz, resume_file_path text,
  resume_content text, cover_letter text, requirements_analysis jsonb,
  interview_prep jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.user_id, a.company, a.job_title, a.job_description,
    a.status, a.fit_score, a.fit_level, a.applied_at,
    a.created_at, a.updated_at, a.resume_file_path,
    public.decrypt_sensitive(a.resume_content) as resume_content,
    public.decrypt_sensitive(a.cover_letter) as cover_letter,
    a.requirements_analysis::jsonb, a.interview_prep::jsonb
  FROM public.applications a
  WHERE a.user_id = auth.uid()
  ORDER BY a.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_application_decrypted(app_id uuid)
RETURNS TABLE (
  id uuid, user_id uuid, company text, job_title text, job_description text,
  status text, fit_score integer, fit_level text, applied_at timestamptz,
  created_at timestamptz, updated_at timestamptz, resume_file_path text,
  resume_content text, cover_letter text, requirements_analysis jsonb,
  interview_prep jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.user_id, a.company, a.job_title, a.job_description,
    a.status, a.fit_score, a.fit_level, a.applied_at,
    a.created_at, a.updated_at, a.resume_file_path,
    public.decrypt_sensitive(a.resume_content) as resume_content,
    public.decrypt_sensitive(a.cover_letter) as cover_letter,
    a.requirements_analysis::jsonb, a.interview_prep::jsonb
  FROM public.applications a
  WHERE a.id = app_id AND a.user_id = auth.uid();
END;
$$;
