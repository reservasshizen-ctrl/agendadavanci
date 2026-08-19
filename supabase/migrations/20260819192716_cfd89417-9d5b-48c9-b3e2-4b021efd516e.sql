CREATE OR REPLACE FUNCTION public.register_patient_portal(_first_name text, _last_name text, _document_number text, _birth_date date, _phone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _doc text := regexp_replace(COALESCE(_document_number,''), '\D', '', 'g');
  _other uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NO_AUTH'; END IF;
  IF _doc = '' THEN RAISE EXCEPTION 'SIN_CEDULA'; END IF;

  SELECT patient_id INTO _pid FROM public.patient_accounts WHERE user_id = _uid;
  IF _pid IS NOT NULL THEN RETURN _pid; END IF;

  SELECT p.id INTO _pid FROM public.patients p
  WHERE regexp_replace(COALESCE(p.document_number,''), '\D', '', 'g') = _doc
  LIMIT 1;

  IF _pid IS NOT NULL THEN
    SELECT user_id INTO _other FROM public.patient_accounts WHERE patient_id = _pid LIMIT 1;
    IF _other IS NOT NULL AND _other <> _uid THEN RAISE EXCEPTION 'YA_REGISTRADO'; END IF;
    UPDATE public.patients
      SET phone = COALESCE(NULLIF(btrim(_phone), ''), phone),
          whatsapp = COALESCE(NULLIF(btrim(_phone), ''), whatsapp)
      WHERE id = _pid;
  ELSE
    INSERT INTO public.patients (first_name, last_name, document_number, birth_date, phone, whatsapp, status, origin)
    VALUES (_first_name, _last_name, _document_number, _birth_date,
            NULLIF(btrim(_phone), ''), NULLIF(btrim(_phone), ''), 'activo', 'portal')
    RETURNING id INTO _pid;

    INSERT INTO public.notifications (patient_id, title, message, type)
    VALUES (_pid, '¡Bienvenido a Centro SNS! ❤️',
      'Tu cuenta fue creada correctamente. Acá vas a ver tus turnos, recordatorios y novedades de Centro SNS.', 'aviso');
  END IF;

  INSERT INTO public.patient_accounts (user_id, patient_id) VALUES (_uid, _pid);
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'paciente') ON CONFLICT DO NOTHING;

  RETURN _pid;
END; $function$;

DROP FUNCTION IF EXISTS public.register_patient_portal(text, text, text, date);
REVOKE EXECUTE ON FUNCTION public.register_patient_portal(text, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_patient_portal(text, text, text, date, text) TO authenticated;