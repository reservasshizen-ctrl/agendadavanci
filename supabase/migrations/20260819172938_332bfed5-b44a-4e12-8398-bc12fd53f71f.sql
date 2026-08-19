-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'recepcion', 'paciente');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','recepcion')
  );
$$;

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Todos los usuarios existentes son personal administrativo
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Asignación de rol al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'portal_role','staff') = 'paciente'
      THEN 'paciente'::public.app_role
      ELSE 'recepcion'::public.app_role END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============ PACIENTES: nuevos campos ============
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'recepcion';

-- ============ CUENTAS DE PACIENTE ============
CREATE TABLE public.patient_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  email text,
  account_status text NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.patient_accounts TO authenticated;
GRANT ALL ON public.patient_accounts TO service_role;
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patient_accounts_updated BEFORE UPDATE ON public.patient_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT patient_id FROM public.patient_accounts WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "accounts_own" ON public.patient_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "accounts_staff_manage" ON public.patient_accounts FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ PACIENTES: RLS por rol ============
DROP POLICY IF EXISTS patients_all_auth ON public.patients;
CREATE POLICY "patients_staff_all" ON public.patients FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "patients_self_select" ON public.patients FOR SELECT TO authenticated
  USING (id = public.current_patient_id());
CREATE POLICY "patients_self_update" ON public.patients FOR UPDATE TO authenticated
  USING (id = public.current_patient_id()) WITH CHECK (id = public.current_patient_id());

-- El paciente no puede tocar campos administrativos
CREATE OR REPLACE FUNCTION public.protect_patient_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  NEW.status := OLD.status;
  NEW.archived := OLD.archived;
  NEW.next_review_date := OLD.next_review_date;
  NEW.next_review_time := OLD.next_review_time;
  NEW.next_review_reason := OLD.next_review_reason;
  NEW.abandonment_date := OLD.abandonment_date;
  NEW.abandonment_reason := OLD.abandonment_reason;
  NEW.origin := OLD.origin;
  RETURN NEW;
END; $$;
CREATE TRIGGER patients_protect_admin BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.protect_patient_admin_fields();

-- ============ TURNOS / REVISIONES / RESTO: personal + lectura propia ============
DROP POLICY IF EXISTS appointments_all_auth ON public.appointments;
CREATE POLICY "appointments_staff_all" ON public.appointments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "appointments_self_select" ON public.appointments FOR SELECT TO authenticated
  USING (patient_id = public.current_patient_id());

DROP POLICY IF EXISTS reviews_all_auth ON public.reviews;
CREATE POLICY "reviews_staff_all" ON public.reviews FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "reviews_self_select" ON public.reviews FOR SELECT TO authenticated
  USING (patient_id = public.current_patient_id());

DROP POLICY IF EXISTS messages_all_auth ON public.appointment_messages;
CREATE POLICY "messages_staff_all" ON public.appointment_messages FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS attendance_all_auth ON public.attendance;
CREATE POLICY "attendance_staff_all" ON public.attendance FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS status_history_all_auth ON public.patient_status_history;
CREATE POLICY "status_history_staff_all" ON public.patient_status_history FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ NOTIFICACIONES ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'aviso',
  related_id uuid,
  link text,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_patient_idx ON public.notifications (patient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_staff_all" ON public.notifications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "notifications_self_select" ON public.notifications FOR SELECT TO authenticated
  USING (patient_id = public.current_patient_id());
CREATE POLICY "notifications_self_update" ON public.notifications FOR UPDATE TO authenticated
  USING (patient_id = public.current_patient_id()) WITH CHECK (patient_id = public.current_patient_id());

-- ============ DISPOSITIVOS PUSH ============
CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  device_token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, device_token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER push_devices_updated BEFORE UPDATE ON public.push_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "push_self_all" ON public.push_devices FOR ALL TO authenticated
  USING (patient_id = public.current_patient_id()) WITH CHECK (patient_id = public.current_patient_id());
CREATE POLICY "push_staff_select" ON public.push_devices FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- ============ CONTENIDO ============
CREATE TABLE public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  body text,
  image_url text,
  video_url text,
  category text NOT NULL DEFAULT 'novedades',
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  notify boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;
GRANT ALL ON public.content TO service_role;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER content_updated BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "content_staff_all" ON public.content FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "content_published_select" ON public.content FOR SELECT TO authenticated
  USING (published = true);

CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, patient_id)
);
GRANT SELECT, INSERT ON public.content_views TO authenticated;
GRANT ALL ON public.content_views TO service_role;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_self" ON public.content_views FOR ALL TO authenticated
  USING (patient_id = public.current_patient_id() OR public.is_staff(auth.uid()))
  WITH CHECK (patient_id = public.current_patient_id());

-- ============ CONFIGURACIÓN ============
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_staff_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
INSERT INTO public.app_settings (key, value) VALUES
  ('reminders', '{"days_before": [7,1], "same_day": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ ACTIVIDAD ADMINISTRATIVA ============
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_staff" ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "activity_insert" ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- ============ REGISTRO DESDE EL PORTAL ============
CREATE OR REPLACE FUNCTION public.patient_exists(_document text, _phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE (NULLIF(btrim(_document), '') IS NOT NULL
           AND regexp_replace(COALESCE(p.document_number,''), '\D', '', 'g') = regexp_replace(_document, '\D', '', 'g'))
       OR (NULLIF(btrim(_phone), '') IS NOT NULL
           AND regexp_replace(COALESCE(p.phone,''), '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
       OR (NULLIF(btrim(_phone), '') IS NOT NULL
           AND regexp_replace(COALESCE(p.whatsapp,''), '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
  );
$$;
REVOKE ALL ON FUNCTION public.patient_exists(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patient_exists(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_patient_account(
  _first_name text, _last_name text, _document_number text, _phone text,
  _whatsapp text, _birth_date date, _email text DEFAULT NULL,
  _address text DEFAULT NULL, _city text DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NO_AUTH'; END IF;

  SELECT patient_id INTO _pid FROM public.patient_accounts WHERE user_id = _uid;
  IF _pid IS NOT NULL THEN RETURN _pid; END IF;

  IF public.patient_exists(COALESCE(_document_number,''), COALESCE(_whatsapp, _phone, '')) THEN
    RAISE EXCEPTION 'DUPLICADO';
  END IF;

  INSERT INTO public.patients (
    first_name, last_name, full_name, document_number, birth_date,
    phone, whatsapp, email, address, city, notes, status, origin
  ) VALUES (
    _first_name, _last_name, btrim(_first_name || ' ' || _last_name), _document_number, _birth_date,
    _phone, _whatsapp, _email, _address, _city, _notes, 'activo', 'portal'
  ) RETURNING id INTO _pid;

  INSERT INTO public.patient_accounts (user_id, patient_id, email) VALUES (_uid, _pid, _email);

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'paciente')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (patient_id, title, message, type)
  VALUES (_pid, '¡Bienvenido a Centro SNS! ❤️',
    'Tu cuenta fue creada correctamente. Acá vas a ver tus turnos, recordatorios y novedades de Centro SNS.', 'aviso');

  RETURN _pid;
END; $$;
REVOKE ALL ON FUNCTION public.register_patient_account(text,text,text,text,text,date,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_patient_account(text,text,text,text,text,date,text,text,text,text) TO authenticated;

-- ============ NOTIFICACIONES AUTOMÁTICAS ============
CREATE OR REPLACE FUNCTION public.notify_appointment_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (patient_id, title, message, type, related_id, link)
    VALUES (NEW.patient_id, '📅 Nuevo turno agendado',
      'Tenés un turno en Centro SNS el ' || to_char(NEW.date, 'DD/MM/YYYY') || ' a las ' || to_char(NEW.time, 'HH24:MI') || '.',
      'turno_nuevo', NEW.id, '/portal/turnos');
  ELSIF TG_OP = 'UPDATE' AND (NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time) THEN
    INSERT INTO public.notifications (patient_id, title, message, type, related_id, link)
    VALUES (NEW.patient_id, '⚠️ Cambio de horario',
      'Tu turno en Centro SNS fue actualizado. Nueva fecha: ' || to_char(NEW.date, 'DD/MM/YYYY') || ' — Nueva hora: ' || to_char(NEW.time, 'HH24:MI') || '.',
      'cambio_horario', NEW.id, '/portal/turnos');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER appointments_notify AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_changes();

CREATE OR REPLACE FUNCTION public.notify_content_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published AND NEW.notify AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM true) THEN
    INSERT INTO public.notifications (patient_id, title, message, type, related_id, link, image_url)
    SELECT pa.patient_id, '📰 Nueva novedad de Centro SNS',
      NEW.title || ' — Ingresá para verla.', 'novedad', NEW.id, '/portal/novedades', NEW.image_url
    FROM public.patient_accounts pa;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER content_notify AFTER INSERT OR UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.notify_content_published();

-- ============ RECORDATORIOS AUTOMÁTICOS ============
CREATE OR REPLACE FUNCTION public.generate_appointment_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cfg jsonb;
  _days int;
  _count int := 0;
  _inserted int;
BEGIN
  SELECT value INTO _cfg FROM public.app_settings WHERE key = 'reminders';
  _cfg := COALESCE(_cfg, '{"days_before":[7,1],"same_day":true}'::jsonb);

  FOR _days IN SELECT (jsonb_array_elements_text(_cfg->'days_before'))::int LOOP
    INSERT INTO public.notifications (patient_id, title, message, type, related_id, link)
    SELECT a.patient_id,
      CASE WHEN _days = 1 THEN '🔔 Recordatorio de turno' ELSE '📅 Tenés un turno próximo en Centro SNS' END,
      CASE WHEN _days = 1
        THEN 'Mañana tenés un turno en Centro SNS. Hora: ' || to_char(a.time, 'HH24:MI') || '.'
        ELSE 'Tenés un turno en Centro SNS el ' || to_char(a.date, 'DD/MM/YYYY') || ' a las ' || to_char(a.time, 'HH24:MI') || '.' END,
      'recordatorio_turno', a.id, '/portal/turnos'
    FROM public.appointments a
    WHERE a.date = CURRENT_DATE + _days
      AND a.status IN ('pendiente','confirmado')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = a.id AND n.type = 'recordatorio_turno'
          AND n.created_at::date = CURRENT_DATE
      );
    GET DIAGNOSTICS _inserted = ROW_COUNT;
    _count := _count + _inserted;
  END LOOP;

  IF COALESCE((_cfg->>'same_day')::boolean, false) THEN
    INSERT INTO public.notifications (patient_id, title, message, type, related_id, link)
    SELECT a.patient_id, '❤️ Te esperamos hoy en Centro SNS',
      'Tu horario es a las ' || to_char(a.time, 'HH24:MI') || '.', 'recordatorio_turno', a.id, '/portal/turnos'
    FROM public.appointments a
    WHERE a.date = CURRENT_DATE
      AND a.status IN ('pendiente','confirmado')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = a.id AND n.type = 'recordatorio_turno' AND n.created_at::date = CURRENT_DATE
      );
    GET DIAGNOSTICS _inserted = ROW_COUNT;
    _count := _count + _inserted;
  END IF;

  RETURN _count;
END; $$;
REVOKE ALL ON FUNCTION public.generate_appointment_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_appointment_reminders() TO authenticated, service_role;