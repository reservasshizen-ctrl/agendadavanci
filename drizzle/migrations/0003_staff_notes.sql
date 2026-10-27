CREATE TABLE public.staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.staff_notes TO authenticated;
GRANT ALL ON public.staff_notes TO service_role;
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read notes" ON public.staff_notes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff add notes" ON public.staff_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Author or admin delete notes" ON public.staff_notes FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));