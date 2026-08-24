-- 1. Campos nuevos
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS registration_source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

UPDATE public.patients SET registration_source =
  CASE origin WHEN 'portal' THEN 'patient_portal' WHEN 'recepcion' THEN 'reception' ELSE 'admin' END;

-- 2. Auditoría
CREATE TABLE IF NOT EXISTS public.patient_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.patient_audit_log TO authenticated;
GRANT ALL ON public.patient_audit_log TO service_role;
ALTER TABLE public.patient_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_staff_select ON public.patient_audit_log;
CREATE POLICY audit_staff_select ON public.patient_audit_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR patient_id = public.current_patient_id());
DROP POLICY IF EXISTS audit_insert ON public.patient_audit_log;
CREATE POLICY audit_insert ON public.patient_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR patient_id = public.current_patient_id());

CREATE INDEX IF NOT EXISTS patient_audit_log_patient_idx ON public.patient_audit_log(patient_id, created_at DESC);

-- 3. Trigger de auditoría
CREATE OR REPLACE FUNCTION public.log_patient_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_audit_log (patient_id, user_id, action, new_data)
    VALUES (NEW.id, auth.uid(), 'patient_created', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN _action := 'patient_deleted';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN _action := 'patient_restored';
  ELSIF OLD.archived = false AND NEW.archived = true THEN _action := 'patient_archived';
  ELSIF OLD.archived = true AND NEW.archived = false THEN _action := 'patient_restored';
  ELSIF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN _action := 'patient_updated';
  ELSE RETURN NEW;
  END IF;

  INSERT INTO public.patient_audit_log (patient_id, user_id, action, previous_data, new_data)
  VALUES (NEW.id, auth.uid(), _action, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_patient_changes() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS patients_audit_ins ON public.patients;
CREATE TRIGGER patients_audit_ins AFTER INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_changes();
DROP TRIGGER IF EXISTS patients_audit_upd ON public.patients;
CREATE TRIGGER patients_audit_upd AFTER UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_changes();

-- 4. Sólo admin puede marcar/desmarcar eliminado
CREATE OR REPLACE FUNCTION public.guard_patient_delete_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'SOLO_ADMIN';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_patient_delete_flag() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS patients_guard_delete ON public.patients;
CREATE TRIGGER patients_guard_delete BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.guard_patient_delete_flag();

-- 5. Borrado físico sólo admin
DROP POLICY IF EXISTS patients_staff_all ON public.patients;
CREATE POLICY patients_staff_select ON public.patients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY patients_staff_insert ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY patients_staff_update ON public.patients FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY patients_admin_delete ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- El paciente no ve su ficha si fue eliminada
DROP POLICY IF EXISTS patients_self_select ON public.patients;
CREATE POLICY patients_self_select ON public.patients FOR SELECT TO authenticated
  USING (id = public.current_patient_id() AND deleted_at IS NULL);

-- 6. Registro desde el portal: datos completos, sin duplicados
CREATE OR REPLACE FUNCTION public.register_patient_portal(
  _first_name text, _last_name text, _document_number text, _birth_date date,
  _phone text DEFAULT NULL, _email text DEFAULT NULL, _address text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _doc text := regexp_replace(COALESCE(_document_number,''), '\D', '', 'g');
  _tel text := NULLIF(btrim(COALESCE(_phone,'')), '');
  _other uuid;
  _del timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NO_AUTH'; END IF;
  IF _doc = '' THEN RAISE EXCEPTION 'SIN_CEDULA'; END IF;

  SELECT patient_id INTO _pid FROM public.patient_accounts WHERE user_id = _uid;
  IF _pid IS NOT NULL THEN RETURN _pid; END IF;

  SELECT p.id, p.deleted_at INTO _pid, _del FROM public.patients p
  WHERE regexp_replace(COALESCE(p.document_number,''), '\D', '', 'g') = _doc
  LIMIT 1;

  IF _pid IS NULL AND _tel IS NOT NULL THEN
    SELECT p.id, p.deleted_at INTO _pid, _del FROM public.patients p
    WHERE regexp_replace(COALESCE(p.whatsapp, p.phone, ''), '\D', '', 'g') = regexp_replace(_tel, '\D', '', 'g')
    LIMIT 1;
  END IF;

  IF _pid IS NOT NULL THEN
    IF _del IS NOT NULL THEN RAISE EXCEPTION 'PACIENTE_ELIMINADO'; END IF;
    SELECT user_id INTO _other FROM public.patient_accounts WHERE patient_id = _pid LIMIT 1;
    IF _other IS NOT NULL AND _other <> _uid THEN RAISE EXCEPTION 'YA_REGISTRADO'; END IF;
    UPDATE public.patients SET
      phone = COALESCE(_tel, phone),
      whatsapp = COALESCE(_tel, whatsapp),
      email = COALESCE(NULLIF(btrim(COALESCE(_email,'')), ''), email),
      address = COALESCE(NULLIF(btrim(COALESCE(_address,'')), ''), address),
      birth_date = COALESCE(_birth_date, birth_date)
    WHERE id = _pid;
  ELSE
    INSERT INTO public.patients (first_name, last_name, document_number, birth_date, phone, whatsapp,
      email, address, status, origin, registration_source)
    VALUES (_first_name, _last_name, _document_number, _birth_date, _tel, _tel,
      NULLIF(btrim(COALESCE(_email,'')), ''), NULLIF(btrim(COALESCE(_address,'')), ''),
      'activo', 'portal', 'patient_portal')
    RETURNING id INTO _pid;

    INSERT INTO public.notifications (patient_id, title, message, type)
    VALUES (_pid, '¡Bienvenido a Centro SNS! ❤️',
      'Tu cuenta fue creada correctamente. Acá vas a ver tus turnos, recordatorios y novedades de Centro SNS.', 'aviso');
  END IF;

  INSERT INTO public.patient_accounts (user_id, patient_id, email)
  VALUES (_uid, _pid, NULLIF(btrim(COALESCE(_email,'')), ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'paciente') ON CONFLICT DO NOTHING;

  RETURN _pid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_patient_portal(text,text,text,date,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_patient_portal(text,text,text,date,text,text,text) TO authenticated;
DROP FUNCTION IF EXISTS public.register_patient_portal(text,text,text,date,text);