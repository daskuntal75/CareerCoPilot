
-- Fix error-level security: restrict all sensitive table policies to authenticated users only
-- This blocks anonymous access even though auth.uid() checks exist

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- APPLICATIONS
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;

CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER_RESUMES
DROP POLICY IF EXISTS "Users can view own resumes" ON public.user_resumes;
DROP POLICY IF EXISTS "Users can insert own resumes" ON public.user_resumes;
DROP POLICY IF EXISTS "Users can update own resumes" ON public.user_resumes;
DROP POLICY IF EXISTS "Users can delete own resumes" ON public.user_resumes;

CREATE POLICY "Users can view own resumes" ON public.user_resumes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON public.user_resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resumes" ON public.user_resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON public.user_resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RESUME_CHUNKS
DROP POLICY IF EXISTS "Users can view their own resume chunks" ON public.resume_chunks;
DROP POLICY IF EXISTS "Users can create their own resume chunks" ON public.resume_chunks;
DROP POLICY IF EXISTS "Users can update their own resume chunks" ON public.resume_chunks;
DROP POLICY IF EXISTS "Users can delete their own resume chunks" ON public.resume_chunks;

CREATE POLICY "Users can view their own resume chunks" ON public.resume_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own resume chunks" ON public.resume_chunks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resume chunks" ON public.resume_chunks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resume chunks" ON public.resume_chunks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USER_COVER_LETTER_TEMPLATES
DROP POLICY IF EXISTS "Users can view own templates" ON public.user_cover_letter_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.user_cover_letter_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.user_cover_letter_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.user_cover_letter_templates;

CREATE POLICY "Users can view own templates" ON public.user_cover_letter_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.user_cover_letter_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.user_cover_letter_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.user_cover_letter_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DOCUMENT_VERSIONS
DROP POLICY IF EXISTS "Users can view their own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can create their own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can update their own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can delete their own document versions" ON public.document_versions;

CREATE POLICY "Users can view their own document versions" ON public.document_versions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own document versions" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own document versions" ON public.document_versions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own document versions" ON public.document_versions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AUDIT_LOG
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can create their own audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_log;

CREATE POLICY "Users can view their own audit logs" ON public.audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own audit logs" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "No one can update audit logs" ON public.audit_log FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No one can delete audit logs" ON public.audit_log FOR DELETE TO authenticated USING (false);

-- SUBSCRIPTIONS - keep service role patterns but restrict user SELECT to authenticated
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- DEMO_WHITELIST
DROP POLICY IF EXISTS "Users can check own whitelist status" ON public.demo_whitelist;
DROP POLICY IF EXISTS "Admins can view whitelist" ON public.demo_whitelist;
DROP POLICY IF EXISTS "Admins can add to whitelist" ON public.demo_whitelist;
DROP POLICY IF EXISTS "Admins can update whitelist" ON public.demo_whitelist;
DROP POLICY IF EXISTS "Admins can delete from whitelist" ON public.demo_whitelist;

CREATE POLICY "Users can check own whitelist status" ON public.demo_whitelist FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view whitelist" ON public.demo_whitelist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add to whitelist" ON public.demo_whitelist FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update whitelist" ON public.demo_whitelist FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete from whitelist" ON public.demo_whitelist FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
