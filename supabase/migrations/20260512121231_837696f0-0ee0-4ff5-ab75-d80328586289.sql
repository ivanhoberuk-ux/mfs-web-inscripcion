CREATE OR REPLACE FUNCTION public.can_access_documento(path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_registro_id uuid;
  v_registro_pueblo_id uuid;
  v_registro_email text;
  v_user_pueblo_id uuid;
  v_user_email text;
BEGIN
  IF path LIKE 'plantillas/%' THEN
    RETURN true;
  END IF;

  IF is_super_admin() THEN
    RETURN true;
  END IF;

  v_registro_id := public.get_registro_id_from_path(path);
  IF v_registro_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT pueblo_id, lower(email)
  INTO v_registro_pueblo_id, v_registro_email
  FROM public.registros
  WHERE id = v_registro_id
    AND deleted_at IS NULL;

  IF v_registro_pueblo_id IS NULL THEN
    RETURN false;
  END IF;

  IF is_pueblo_admin() THEN
    v_user_pueblo_id := get_user_pueblo_id();
    RETURN v_user_pueblo_id = v_registro_pueblo_id;
  END IF;

  v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  RETURN v_user_email <> '' AND v_registro_email = v_user_email;
END;
$$;