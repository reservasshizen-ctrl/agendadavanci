CREATE TABLE public.agenda_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  label text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_days TO authenticated;
GRANT ALL ON public.agenda_days TO service_role;
ALTER TABLE public.agenda_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all agenda_days" ON public.agenda_days FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));