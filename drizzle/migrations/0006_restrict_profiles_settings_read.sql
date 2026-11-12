DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "settings_read" ON public.app_settings;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));