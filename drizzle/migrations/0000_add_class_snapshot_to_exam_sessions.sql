ALTER TABLE public.exam_sessions
ADD COLUMN IF NOT EXISTS class_id uuid NULL REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exam_sessions_class_id_idx ON public.exam_sessions (class_id);