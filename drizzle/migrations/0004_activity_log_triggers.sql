CREATE TABLE public.activity_viewers (user_id uuid PRIMARY KEY);
GRANT SELECT ON public.activity_viewers TO authenticated;
GRANT ALL ON public.activity_viewers TO service_role;
ALTER TABLE public.activity_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_viewer_row" ON public.activity_viewers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_view_activity(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.activity_viewers WHERE user_id = _uid)
$$;

DROP POLICY IF EXISTS "activity_staff" ON public.admin_activity_log;
CREATE POLICY "activity_viewers_read" ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.can_view_activity(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row jsonb := to_jsonb(COALESCE(NEW, OLD));
  _id uuid := (_row->>'id')::uuid;
  _pid uuid;
  _pname text;
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.admin_activity_log
    WHERE user_id = _uid AND entity = TG_TABLE_NAME AND entity_id = _id AND action = 'update'
      AND created_at > now() - interval '10 minutes'
  ) THEN RETURN NEW; END IF;
  _pid := CASE WHEN TG_TABLE_NAME = 'patients' THEN _id ELSE NULLIF(_row->>'patient_id','')::uuid END;
  IF _pid IS NOT NULL THEN SELECT full_name INTO _pname FROM public.patients WHERE id = _pid; END IF;
  INSERT INTO public.admin_activity_log (user_id, action, entity, entity_id, details)
  VALUES (_uid, lower(TG_OP), TG_TABLE_NAME, _id, jsonb_build_object(
    'user_name', (SELECT display_name FROM public.profiles WHERE id = _uid),
    'patient_id', _pid, 'patient_name', _pname,
    'status', _row->>'status'));
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_activity() FROM PUBLIC, anon;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['patients','appointments','fichas','reviews','attendance','sales','staff_notes','products','content','notifications'] LOOP
    EXECUTE format('CREATE TRIGGER trg_log_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity()', t);
  END LOOP;
END $$;