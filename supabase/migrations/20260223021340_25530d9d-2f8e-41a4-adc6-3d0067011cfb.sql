
-- Allow admins to DELETE exam_sessions
CREATE POLICY "Admins can delete sessions"
ON public.exam_sessions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to DELETE student_answers
CREATE POLICY "Admins can delete answers"
ON public.student_answers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
