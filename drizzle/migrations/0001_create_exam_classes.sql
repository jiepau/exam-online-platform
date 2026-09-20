CREATE TABLE public.exam_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (exam_id, class_id)
);

CREATE INDEX exam_classes_exam_id_idx ON public.exam_classes (exam_id);
CREATE INDEX exam_classes_class_id_idx ON public.exam_classes (class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_classes TO authenticated;
GRANT ALL ON public.exam_classes TO service_role;

ALTER TABLE public.exam_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exam classes"
ON public.exam_classes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage exam classes of own exams"
ON public.exam_classes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id))
WITH CHECK (public.has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

CREATE POLICY "Students can read exam classes"
ON public.exam_classes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'student'::app_role));
