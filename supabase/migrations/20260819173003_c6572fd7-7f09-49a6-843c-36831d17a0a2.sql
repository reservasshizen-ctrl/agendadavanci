REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_patient_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_appointment_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_content_published() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_appointment_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_appointment_reminders() TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_patient_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;