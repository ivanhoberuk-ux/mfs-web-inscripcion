REVOKE EXECUTE ON FUNCTION public.can_access_documento(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_documento(text) TO authenticated;