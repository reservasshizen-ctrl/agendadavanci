REVOKE EXECUTE ON FUNCTION public.patient_exists(text, text) FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.register_patient_account(text,text,text,text,text,date,text,text,text,text);