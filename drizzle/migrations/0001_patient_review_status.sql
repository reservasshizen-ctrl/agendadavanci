ALTER TABLE public.patients ADD COLUMN review_status text NOT NULL DEFAULT 'aprobado';
CREATE OR REPLACE FUNCTION public.set_portal_review_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.registration_source = 'patient_portal' THEN NEW.review_status := 'pendiente'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_portal_review_status BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_portal_review_status();