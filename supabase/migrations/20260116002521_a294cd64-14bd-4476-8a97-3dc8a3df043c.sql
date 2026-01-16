-- 1. Remove legacy is_admin column from profiles table (privilege escalation risk)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- 2. Enable RLS on storage.objects (if not already enabled)
-- Add policies for coverlettertemplate bucket

-- Users can upload their own cover letter templates
CREATE POLICY "Users can upload cover letter templates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'coverlettertemplate' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own cover letter templates
CREATE POLICY "Users can view their cover letter templates"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'coverlettertemplate' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own cover letter templates
CREATE POLICY "Users can update their cover letter templates"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'coverlettertemplate' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own cover letter templates
CREATE POLICY "Users can delete their cover letter templates"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'coverlettertemplate' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);