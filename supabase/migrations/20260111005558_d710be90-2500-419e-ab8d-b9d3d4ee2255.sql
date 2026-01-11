-- Add new fields to profiles table for early adopter signup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now();