
-- Allow newly registered users to insert their own role (only once)
CREATE POLICY "Users can insert own role on signup" ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
