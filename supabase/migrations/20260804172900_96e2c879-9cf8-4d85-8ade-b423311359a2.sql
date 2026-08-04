-- 1. Ownership columns
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.questions q
SET created_by = e.created_by
FROM public.exams e
WHERE q.exam_id = e.id AND q.created_by IS NULL;

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.exam_sessions SET created_by = student_id WHERE created_by IS NULL;
UPDATE public.exam_sessions SET created_at = started_at WHERE started_at IS NOT NULL;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.owns_exam(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exams
    WHERE id = _exam_id AND created_by = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_student(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'student'::app_role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.owns_exam(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_student(uuid) FROM anon;

-- 3. Auto owner / updated_at triggers
CREATE OR REPLACE FUNCTION public.set_question_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    SELECT created_by INTO NEW.created_by FROM public.exams WHERE id = NEW.exam_id;
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_question_owner_trg ON public.questions;
CREATE TRIGGER set_question_owner_trg
  BEFORE INSERT ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_question_owner();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_sessions_updated_at ON public.exam_sessions;
CREATE TRIGGER update_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Bank soal (future ready)
CREATE TABLE IF NOT EXISTS public.bank_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  subject text NOT NULL,
  grade_level text,
  topic text,
  difficulty text NOT NULL DEFAULT 'medium',
  question_type text NOT NULL DEFAULT 'multiple_choice',
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer,
  correct_answer_data jsonb,
  point_weight integer NOT NULL DEFAULT 1,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_questions TO authenticated;
GRANT ALL ON public.bank_questions TO service_role;
ALTER TABLE public.bank_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own bank questions" ON public.bank_questions;
CREATE POLICY "Owners manage own bank questions" ON public.bank_questions
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins manage all bank questions" ON public.bank_questions;
CREATE POLICY "Admins manage all bank questions" ON public.bank_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_bank_questions_updated_at ON public.bank_questions;
CREATE TRIGGER update_bank_questions_updated_at
  BEFORE UPDATE ON public.bank_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Teacher policies: exams
DROP POLICY IF EXISTS "Teachers can read own exams" ON public.exams;
CREATE POLICY "Teachers can read own exams" ON public.exams
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can create own exams" ON public.exams;
CREATE POLICY "Teachers can create own exams" ON public.exams
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own exams" ON public.exams;
CREATE POLICY "Teachers can update own exams" ON public.exams
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own exams" ON public.exams;
CREATE POLICY "Teachers can delete own exams" ON public.exams
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

-- 6. Teacher policies: questions
DROP POLICY IF EXISTS "Teachers manage questions of own exams" ON public.questions;
CREATE POLICY "Teachers manage questions of own exams" ON public.questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

-- 7. Teacher policies: exam sessions / answers / violations / drafts
DROP POLICY IF EXISTS "Teachers read sessions of own exams" ON public.exam_sessions;
CREATE POLICY "Teachers read sessions of own exams" ON public.exam_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

DROP POLICY IF EXISTS "Teachers update sessions of own exams" ON public.exam_sessions;
CREATE POLICY "Teachers update sessions of own exams" ON public.exam_sessions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id))
  WITH CHECK (public.owns_exam(exam_id));

DROP POLICY IF EXISTS "Teachers delete sessions of own exams" ON public.exam_sessions;
CREATE POLICY "Teachers delete sessions of own exams" ON public.exam_sessions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

DROP POLICY IF EXISTS "Teachers read answers of own exams" ON public.student_answers;
CREATE POLICY "Teachers read answers of own exams" ON public.student_answers
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.exam_sessions s
      WHERE s.id = student_answers.session_id AND public.owns_exam(s.exam_id)
    )
  );

DROP POLICY IF EXISTS "Teachers delete answers of own exams" ON public.student_answers;
CREATE POLICY "Teachers delete answers of own exams" ON public.student_answers
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.exam_sessions s
      WHERE s.id = student_answers.session_id AND public.owns_exam(s.exam_id)
    )
  );

DROP POLICY IF EXISTS "Teachers read violations of own exams" ON public.violation_logs;
CREATE POLICY "Teachers read violations of own exams" ON public.violation_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

DROP POLICY IF EXISTS "Teachers read drafts of own exams" ON public.draft_answers;
CREATE POLICY "Teachers read drafts of own exams" ON public.draft_answers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.owns_exam(exam_id));

-- 8. Teacher read access to reference data + student profiles
DROP POLICY IF EXISTS "Teachers can read classes" ON public.classes;
CREATE POLICY "Teachers can read classes" ON public.classes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers can read rooms" ON public.rooms;
CREATE POLICY "Teachers can read rooms" ON public.rooms
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers can read room assignments" ON public.student_room_assignments;
CREATE POLICY "Teachers can read room assignments" ON public.student_room_assignments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers can read student profiles" ON public.profiles;
CREATE POLICY "Teachers can read student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND public.is_student(profiles.user_id));