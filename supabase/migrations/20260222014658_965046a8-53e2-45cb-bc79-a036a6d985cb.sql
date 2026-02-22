
-- Create app_settings table (singleton row for app-wide settings)
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name text NOT NULL DEFAULT 'MTS Al Wathoniyah 43',
  app_name text NOT NULL DEFAULT 'Sistem Ujian Online',
  school_logo_url text DEFAULT NULL,
  theme text NOT NULL DEFAULT 'green',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
ON public.app_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.app_settings (school_name, app_name, theme)
VALUES ('MTS Al Wathoniyah 43', 'Sistem Ujian Online', 'green');

-- Create storage bucket for school assets (logo etc)
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true);

-- Storage policies for school-assets
CREATE POLICY "School assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

CREATE POLICY "Admins can upload school assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update school assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete school assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-assets' AND has_role(auth.uid(), 'admin'::app_role));
