-- Remove UNIQUE constraint from exam_sessions to allow multiple submissions
-- This fixes the issue where exam results don't appear after submitting

-- Drop the unique constraint on (exam_id, student_id)
ALTER TABLE public.exam_sessions 
DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_student_id_key;

-- Add a regular index instead for performance (optional)
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_exam 
ON public.exam_sessions(student_id, exam_id);
