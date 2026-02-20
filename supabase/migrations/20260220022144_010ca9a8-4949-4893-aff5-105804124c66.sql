
-- Create rooms table
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rooms"
ON public.rooms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can read rooms"
ON public.rooms FOR SELECT
USING (has_role(auth.uid(), 'student'::app_role));

-- Create student_room_assignments table
CREATE TABLE public.student_room_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments"
ON public.student_room_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default 5 rooms
INSERT INTO public.rooms (name, sort_order) VALUES
  ('Ruang 1', 1),
  ('Ruang 2', 2),
  ('Ruang 3', 3),
  ('Ruang 4', 4),
  ('Ruang 5', 5);
