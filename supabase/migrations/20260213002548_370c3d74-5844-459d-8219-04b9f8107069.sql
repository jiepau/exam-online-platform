
-- Fix: Change RESTRICTIVE policies to PERMISSIVE on exam_sessions
-- Currently both are RESTRICTIVE which means they are ANDed, preventing admins from reading sessions

DROP POLICY IF EXISTS "Admins can read all sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Students can manage own sessions" ON public.exam_sessions;

CREATE POLICY "Admins can read all sessions"
ON public.exam_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can manage own sessions"
ON public.exam_sessions
FOR ALL
USING (auth.uid() = student_id);

-- Also fix student_answers so admin can see answers
DROP POLICY IF EXISTS "Admins can read all answers" ON public.student_answers;
DROP POLICY IF EXISTS "Students can manage own answers" ON public.student_answers;

CREATE POLICY "Admins can read all answers"
ON public.student_answers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can manage own answers"
ON public.student_answers
FOR ALL
USING (EXISTS (
  SELECT 1 FROM exam_sessions
  WHERE exam_sessions.id = student_answers.session_id
  AND exam_sessions.student_id = auth.uid()
));
