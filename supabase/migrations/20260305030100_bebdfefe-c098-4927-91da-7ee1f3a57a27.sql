
CREATE TABLE public.violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  violation_type TEXT NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 1,
  student_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;

-- Students can insert their own violations
CREATE POLICY "Students can insert own violations"
ON public.violation_logs FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

-- Admins can read all violations
CREATE POLICY "Admins can read all violations"
ON public.violation_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Students can read own violations
CREATE POLICY "Students can read own violations"
ON public.violation_logs FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.violation_logs;
