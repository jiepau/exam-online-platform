
-- Add teacher profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nip TEXT,
ADD COLUMN IF NOT EXISTS nuptk TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classes"
ON public.classes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can read classes"
ON public.classes FOR SELECT
USING (has_role(auth.uid(), 'student'::app_role));

-- Insert default classes
INSERT INTO public.classes (name, sort_order) VALUES
('Kelas 7', 1),
('Kelas 8-1', 2),
('Kelas 8-2', 3),
('Kelas 9-1', 4),
('Kelas 9-2', 5);

-- Add class_id to profiles for students
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id);
