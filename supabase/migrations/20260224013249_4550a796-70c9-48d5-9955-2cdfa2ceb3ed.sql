-- Allow students to read their own room assignment
CREATE POLICY "Students can view own room assignment"
ON public.student_room_assignments
FOR SELECT
USING (auth.uid() = student_id);

-- Allow students to read rooms table
CREATE POLICY "Students can view rooms"
ON public.rooms
FOR SELECT
USING (true);