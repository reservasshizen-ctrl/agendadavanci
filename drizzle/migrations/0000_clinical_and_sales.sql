CREATE TABLE public.clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  background text, reason text, pathologies text, observations text, indications text,
  professional text, marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.body_legend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, meaning text NOT NULL, sort integer NOT NULL DEFAULT 0
);
INSERT INTO public.body_legend(code, meaning, sort) VALUES
 ('AR','Artrosis',1),('H','Hernia',2),('E','Escoliosis',3),('CX','Coxis',4),('AT','Atlas',5),('INF','Inflamación',6);
CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL, planned_sessions integer NOT NULL DEFAULT 1 CHECK (planned_sessions > 0),
  status text NOT NULL DEFAULT 'en_curso', notes text, professional text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.treatment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT current_date, professional text,
  evolution text, procedures text, indications text,
  marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.session_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.treatment_sessions(id) ON DELETE CASCADE,
  previous_data jsonb NOT NULL, changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  yield_units integer NOT NULL DEFAULT 1 CHECK (yield_units > 0),
  packaging_cost bigint NOT NULL DEFAULT 0, other_cost bigint NOT NULL DEFAULT 0,
  sale_price bigint NOT NULL DEFAULT 0, stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL, quantity numeric NOT NULL DEFAULT 0, unit text NOT NULL DEFAULT 'g',
  cost bigint NOT NULL DEFAULT 0
);
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL, reason text NOT NULL DEFAULT 'ajuste', sale_id uuid,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL DEFAULT current_date, patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  total bigint NOT NULL DEFAULT 0, cost_total bigint NOT NULL DEFAULT 0, notes text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL, quantity integer NOT NULL CHECK (quantity > 0),
  unit_price bigint NOT NULL, unit_cost bigint NOT NULL
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['clinical_records','body_legend','treatments','treatment_sessions','session_revisions','products','product_ingredients','stock_movements','sales','sale_items'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t || '_staff_all', t);
  END LOOP;
END $$;
DROP POLICY session_revisions_staff_all ON public.session_revisions;
CREATE POLICY session_revisions_staff_select ON public.session_revisions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_clinical_updated BEFORE UPDATE ON public.clinical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_treatments_updated BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.treatment_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_session_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.session_revisions(session_id, previous_data, changed_by) VALUES (OLD.id, to_jsonb(OLD), auth.uid());
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_session_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_session_revision BEFORE UPDATE ON public.treatment_sessions FOR EACH ROW EXECUTE FUNCTION public.log_session_revision();

-- Venta atómica: guarda precio y costo del momento y descuenta existencias
CREATE OR REPLACE FUNCTION public.register_sale(_items jsonb, _sale_date date, _patient_id uuid, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sale uuid; _it jsonb; _p public.products%ROWTYPE; _cost bigint; _qty int; _total bigint := 0; _ctotal bigint := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'La venta no tiene artículos'; END IF;
  INSERT INTO public.sales(sale_date, patient_id, notes, created_by) VALUES (coalesce(_sale_date, current_date), _patient_id, _notes, auth.uid()) RETURNING id INTO _sale;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_it->>'quantity')::int;
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO _p FROM public.products WHERE id = (_it->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Artículo inexistente'; END IF;
    IF _p.stock < _qty THEN RAISE EXCEPTION 'Existencias insuficientes de %', _p.name; END IF;
    SELECT round((coalesce(sum(cost),0) + _p.packaging_cost * _p.yield_units + _p.other_cost)::numeric / _p.yield_units)::bigint
      INTO _cost FROM public.product_ingredients WHERE product_id = _p.id;
    INSERT INTO public.sale_items(sale_id, product_id, product_name, quantity, unit_price, unit_cost)
      VALUES (_sale, _p.id, _p.name, _qty, _p.sale_price, _cost);
    UPDATE public.products SET stock = stock - _qty WHERE id = _p.id;
    INSERT INTO public.stock_movements(product_id, quantity, reason, sale_id, created_by) VALUES (_p.id, -_qty, 'venta', _sale, auth.uid());
    _total := _total + _p.sale_price * _qty; _ctotal := _ctotal + _cost * _qty;
  END LOOP;
  UPDATE public.sales SET total = _total, cost_total = _ctotal WHERE id = _sale;
  RETURN _sale;
END $$;
REVOKE EXECUTE ON FUNCTION public.register_sale(jsonb, date, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_sale(jsonb, date, uuid, text) TO authenticated;