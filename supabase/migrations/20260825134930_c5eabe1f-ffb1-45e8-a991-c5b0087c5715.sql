REVOKE EXECUTE ON FUNCTION public.set_modo_temporada(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.abrir_anio(integer, timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_modo_temporada(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.abrir_anio(integer, timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;