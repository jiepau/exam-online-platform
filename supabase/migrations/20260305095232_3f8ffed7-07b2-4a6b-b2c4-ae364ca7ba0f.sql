
-- Table to store in-progress (draft) answers for auto-save
CREATE TABLE public.draft_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_indices jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_index integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, exam_id)
);

-- Enable RLS
ALTER TABLE public.draft_answers ENABLE ROW LEVEL SECURITY;

-- Students can manage their own drafts
CREATE POLICY "Students can manage own drafts"
  ON public.draft_answers
  FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Admins can read all drafts
CREATE POLICY "Admins can read drafts"
  ON public.draft_answers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
