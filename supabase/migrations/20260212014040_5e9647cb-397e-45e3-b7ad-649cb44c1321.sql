
-- Store encryption key in vault
SELECT vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'app_encryption_key',
  'Symmetric encryption key for sensitive application fields'
);

-- Helper: encrypt text to base64 string (column type stays text)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  enc_key text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN RETURN plaintext; END IF;
  SELECT decrypted_secret INTO enc_key
    FROM vault.decrypted_secrets WHERE name = 'app_encryption_key' LIMIT 1;
  IF enc_key IS NULL THEN RETURN plaintext; END IF;
  RETURN encode(extensions.pgp_sym_encrypt(plaintext, enc_key), 'base64');
END;
$$;

-- Helper: decrypt base64 string back to text (graceful fallback for unencrypted data)
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  enc_key text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN RETURN encrypted_text; END IF;
  SELECT decrypted_secret INTO enc_key
    FROM vault.decrypted_secrets WHERE name = 'app_encryption_key' LIMIT 1;
  IF enc_key IS NULL THEN RETURN encrypted_text; END IF;
  RETURN extensions.pgp_sym_decrypt(decode(encrypted_text, 'base64'), enc_key);
EXCEPTION WHEN OTHERS THEN
  -- Data wasn't encrypted (legacy rows), return as-is
  RETURN encrypted_text;
END;
$$;

-- Trigger: auto-encrypt cover_letter and resume_content on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_application_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  enc_key text;
  test_decrypt text;
BEGIN
  SELECT decrypted_secret INTO enc_key
    FROM vault.decrypted_secrets WHERE name = 'app_encryption_key' LIMIT 1;
  IF enc_key IS NULL THEN RETURN NEW; END IF;

  -- Encrypt cover_letter if present and not already encrypted
  IF NEW.cover_letter IS NOT NULL AND NEW.cover_letter != '' THEN
    BEGIN
      test_decrypt := extensions.pgp_sym_decrypt(decode(NEW.cover_letter, 'base64'), enc_key);
      -- If succeeded, it's already encrypted; leave it
    EXCEPTION WHEN OTHERS THEN
      NEW.cover_letter := encode(extensions.pgp_sym_encrypt(NEW.cover_letter, enc_key), 'base64');
    END;
  END IF;

  -- Encrypt resume_content if present and not already encrypted
  IF NEW.resume_content IS NOT NULL AND NEW.resume_content != '' THEN
    BEGIN
      test_decrypt := extensions.pgp_sym_decrypt(decode(NEW.resume_content, 'base64'), enc_key);
    EXCEPTION WHEN OTHERS THEN
      NEW.resume_content := encode(extensions.pgp_sym_encrypt(NEW.resume_content, enc_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER encrypt_app_sensitive_fields
  BEFORE INSERT OR UPDATE OF cover_letter, resume_content
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_application_fields();

-- RPC: get decrypted applications for current user
CREATE OR REPLACE FUNCTION public.get_user_applications_decrypted()
RETURNS TABLE (
  id uuid, user_id uuid, company text, job_title text, job_description text,
  status text, fit_score numeric, fit_level text, applied_at timestamptz,
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
  SELECT
    a.id, a.user_id, a.company, a.job_title, a.job_description,
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

-- RPC: get single decrypted application
CREATE OR REPLACE FUNCTION public.get_application_decrypted(app_id uuid)
RETURNS TABLE (
  id uuid, user_id uuid, company text, job_title text, job_description text,
  status text, fit_score numeric, fit_level text, applied_at timestamptz,
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
  SELECT
    a.id, a.user_id, a.company, a.job_title, a.job_description,
    a.status, a.fit_score, a.fit_level, a.applied_at,
    a.created_at, a.updated_at, a.resume_file_path,
    public.decrypt_sensitive(a.resume_content) as resume_content,
    public.decrypt_sensitive(a.cover_letter) as cover_letter,
    a.requirements_analysis::jsonb, a.interview_prep::jsonb
  FROM public.applications a
  WHERE a.id = app_id AND a.user_id = auth.uid();
END;
$$;
