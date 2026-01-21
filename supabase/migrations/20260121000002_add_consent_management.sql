-- Add consent management table for GDPR compliance
-- Tracks user consent for analytics, marketing, and other data processing

CREATE TABLE IF NOT EXISTS public.user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- For anonymous users, we use a fingerprint/session identifier
  anonymous_id TEXT,
  -- Consent categories
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  functional_consent BOOLEAN NOT NULL DEFAULT true, -- Required for app to function
  -- Metadata
  consent_given_at TIMESTAMPTZ,
  consent_updated_at TIMESTAMPTZ DEFAULT now(),
  consent_method TEXT DEFAULT 'banner', -- 'banner', 'settings', 'signup'
  ip_address TEXT,
  user_agent TEXT,
  -- Version tracking for consent policy changes
  consent_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Either user_id or anonymous_id must be set
  CONSTRAINT consent_identity_check CHECK (
    user_id IS NOT NULL OR anonymous_id IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON public.user_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consent_anonymous_id ON public.user_consent(anonymous_id);

-- Enable RLS
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consent
CREATE POLICY "Users can view own consent" ON public.user_consent
  FOR SELECT USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE POLICY "Users can update own consent" ON public.user_consent
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON public.user_consent
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- Allow anonymous inserts for cookie consent before login
CREATE POLICY "Allow anonymous consent" ON public.user_consent
  FOR INSERT WITH CHECK (
    user_id IS NULL AND anonymous_id IS NOT NULL
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_consent TO authenticated;
GRANT INSERT ON public.user_consent TO anon;

-- Add consent columns to profiles for quick access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ;

-- Function to migrate anonymous consent to user account on signup/login
CREATE OR REPLACE FUNCTION migrate_anonymous_consent()
RETURNS TRIGGER AS $$
BEGIN
  -- Find any anonymous consent records with matching anonymous_id
  -- and update them to be associated with the new user
  UPDATE public.user_consent
  SET user_id = NEW.id,
      consent_updated_at = now()
  WHERE anonymous_id IN (
    SELECT anonymous_id
    FROM public.user_consent
    WHERE anonymous_id IS NOT NULL
    AND user_id IS NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger would be created on auth.users but we can't do that directly
-- This would need to be handled in application code during login

COMMENT ON TABLE public.user_consent IS 'Stores GDPR-compliant consent records for analytics and marketing';
