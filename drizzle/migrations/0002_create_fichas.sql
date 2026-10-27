CREATE TABLE public.fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_number integer NOT NULL,
  kind text NOT NULL DEFAULT 'seguimiento',
  session_date date NOT NULL DEFAULT current_date,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, session_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas TO authenticated;
GRANT ALL ON public.fichas TO service_role;
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage fichas" ON public.fichas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER fichas_updated BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();