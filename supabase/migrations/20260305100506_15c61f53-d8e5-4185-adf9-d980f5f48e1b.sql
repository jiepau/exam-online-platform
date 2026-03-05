
-- Add question_type column with default 'multiple_choice' for backward compat
ALTER TABLE public.questions ADD COLUMN question_type text NOT NULL DEFAULT 'multiple_choice';

-- Add flexible correct_answer_data for complex types (multiple_select, short_answer)
ALTER TABLE public.questions ADD COLUMN correct_answer_data jsonb DEFAULT NULL;

-- Recreate questions_student view to include question_type but hide correct_answer and correct_answer_data
DROP VIEW IF EXISTS public.questions_student;
CREATE VIEW public.questions_student WITH (security_invoker = false) AS
  SELECT id, exam_id, question_text, options, sort_order, created_at, image_url, question_type
  FROM public.questions;

-- Grant access to the view
GRANT SELECT ON public.questions_student TO authenticated;
GRANT SELECT ON public.questions_student TO anon;
