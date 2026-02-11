
-- Allow anonymous users to read active exams (for token validation on homepage)
CREATE POLICY "Anyone can read active exams by token" ON public.exams
  FOR SELECT USING (is_active = true);

-- Allow anonymous users to read questions of active exams
CREATE POLICY "Anyone can read questions of active exams" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = questions.exam_id AND exams.is_active = true
    )
  );
