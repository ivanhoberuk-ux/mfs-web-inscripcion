REVOKE EXECUTE ON FUNCTION public.vencer_listas_espera() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vencer_listas_espera() TO service_role;