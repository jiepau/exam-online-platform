
-- Fix 1: Restrict user_roles INSERT to student role only
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;
CREATE POLICY "Users can insert student role only on signup"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'student');

-- Fix 2: Create a view for questions without correct_answer for students
CREATE VIEW public.questions_student
WITH (security_invoker = on) AS
  SELECT id, exam_id, question_text, options, sort_order, created_at, image_url
  FROM public.questions;

-- Replace the anon/student SELECT policy to deny direct access for non-admins
DROP POLICY IF EXISTS "Anyone can read questions of active exams" ON public.questions;
DROP POLICY IF EXISTS "Students can read questions of active exams" ON public.questions;

-- Only admins can directly read questions (which includes correct_answer)
-- Students must use the questions_student view
CREATE POLICY "Students can read questions without answers via view"
  ON public.questions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'student'::app_role)
      AND EXISTS (SELECT 1 FROM exams WHERE exams.id = questions.exam_id AND exams.is_active = true)
    )
  );
