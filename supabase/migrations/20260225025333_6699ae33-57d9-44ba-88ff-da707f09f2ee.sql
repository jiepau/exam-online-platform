-- Add exam_number column to profiles
ALTER TABLE public.profiles ADD COLUMN exam_number text DEFAULT NULL;