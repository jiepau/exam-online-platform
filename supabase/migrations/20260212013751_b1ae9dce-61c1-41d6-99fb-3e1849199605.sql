
-- Add NISN column to profiles
ALTER TABLE public.profiles ADD COLUMN nisn text;
CREATE UNIQUE INDEX idx_profiles_nisn ON public.profiles(nisn) WHERE nisn IS NOT NULL;
