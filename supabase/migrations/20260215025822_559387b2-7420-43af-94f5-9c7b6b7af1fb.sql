
-- 1. Require authentication to read active exams (prevents token enumeration)
DROP POLICY IF EXISTS "Anyone can read active exams by token" ON public.exams;

CREATE POLICY "Authenticated users can read active exams"
  ON public.exams
  FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- 2. Restrict question-images storage to authenticated users only
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;

CREATE POLICY "Authenticated users can view question images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');
