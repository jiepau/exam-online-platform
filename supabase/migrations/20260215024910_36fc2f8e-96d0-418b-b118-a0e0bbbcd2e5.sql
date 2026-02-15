
-- Remove the policy that allows students to read questions table directly
DROP POLICY IF EXISTS "Students can read questions without answers via view" ON public.questions;

-- Ensure only admins can read from the questions table directly
-- Students must use the questions_student view (which excludes correct_answer)
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

CREATE POLICY "Admins can manage questions"
  ON public.questions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
