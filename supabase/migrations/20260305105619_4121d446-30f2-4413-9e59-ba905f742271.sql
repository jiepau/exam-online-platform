-- Add point weight column to questions (default 1 for backward compat)
ALTER TABLE public.questions ADD COLUMN point_weight integer NOT NULL DEFAULT 1;

-- Update questions_student view to include point_weight
DROP VIEW IF EXISTS public.questions_student;
CREATE VIEW public.questions_student WITH (security_invoker = false) AS
  SELECT id, exam_id, question_text, options, sort_order, created_at, image_url, question_type, point_weight
  FROM public.questions;

GRANT SELECT ON public.questions_student TO authenticated;
GRANT SELECT ON public.questions_student TO anon;