
-- Add column to store complex answers (for multiple_select arrays and short_answer text)
ALTER TABLE public.student_answers ADD COLUMN selected_answer_data jsonb DEFAULT NULL;
