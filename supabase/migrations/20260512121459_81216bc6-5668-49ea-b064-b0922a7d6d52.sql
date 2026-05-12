REVOKE ALL ON FUNCTION public.can_access_documento(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_documento(text) TO authenticated;