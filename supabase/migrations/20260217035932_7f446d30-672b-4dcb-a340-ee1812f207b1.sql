
-- Fix questions_student view: remove security_invoker so it uses owner (definer) permissions
-- This allows students to read questions through the view without exposing correct_answer
DROP VIEW IF EXISTS public.questions_student;

CREATE VIEW public.questions_student AS
  SELECT id, exam_id, question_text, options, sort_order, created_at, image_url
  FROM public.questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.questions_student TO authenticated;
GRANT SELECT ON public.questions_student TO anon;
