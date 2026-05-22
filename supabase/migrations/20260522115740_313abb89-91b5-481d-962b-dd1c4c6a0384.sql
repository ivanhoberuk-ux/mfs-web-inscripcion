CREATE OR REPLACE FUNCTION public.get_pueblo_contacts(p_pueblo_id uuid)
 RETURNS TABLE(nombres text, apellidos text, telefono text, email text, rol text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (p.id)
    COALESCE(r.nombres, '') AS nombres,
    COALESCE(r.apellidos, '') AS apellidos,
    COALESCE(r.telefono, '') AS telefono,
    p.email,
    ur.role::text AS rol
  FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  LEFT JOIN registros r
    ON lower(r.email) = lower(p.email)
    AND r.deleted_at IS NULL
    AND r.pueblo_id = p_pueblo_id
    AND r.rol <> 'Hijo'
  WHERE ur.role IN ('pueblo_admin', 'co_admin_pueblo')
    AND p.pueblo_id = p_pueblo_id
  ORDER BY p.id, r.created_at DESC NULLS LAST;
$function$;