
-- 1) Drop redundant/over-broad RLS on registros (anon-role policy + duplicates)
DROP POLICY IF EXISTS "pueblo_users_can_view_own_registros" ON public.registros;
DROP POLICY IF EXISTS "registros_admin_read" ON public.registros;
DROP POLICY IF EXISTS "registros_admin_update" ON public.registros;

-- 2) Drop redundant policies on pueblos (multiple "true" SELECT policies; redundant admin update)
DROP POLICY IF EXISTS "pueblos_select" ON public.pueblos;
DROP POLICY IF EXISTS "Public read pueblos" ON public.pueblos;
DROP POLICY IF EXISTS "select pueblos" ON public.pueblos;
DROP POLICY IF EXISTS "admin update cupos" ON public.pueblos;
-- Keep: pueblos_read_public (SELECT true), admin select pueblos, admin update pueblos, pueblos_admin_write

-- 3) Drop redundant storage policies that exclude co_admin_pueblo
DROP POLICY IF EXISTS "pueblo_admin_select_documents" ON storage.objects;
DROP POLICY IF EXISTS "pueblo_admin_insert_documents" ON storage.objects;
DROP POLICY IF EXISTS "pueblo_admin_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "pueblo_admin_delete_documents" ON storage.objects;

-- 4) Fix function search_path
ALTER FUNCTION public.match_documents(extensions.vector, integer, jsonb)
  SET search_path = public, extensions;

-- 5) Add explicit duplicate-CI check to register_if_capacity for friendlier error UX
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text,
  p_ciudad text DEFAULT NULL::text,
  p_emergencia_nombre text DEFAULT NULL::text, p_emergencia_telefono text DEFAULT NULL::text,
  p_rol text DEFAULT 'Misionero'::text, p_es_jefe boolean DEFAULT false,
  p_tratamiento_especial boolean DEFAULT false, p_tratamiento_detalle text DEFAULT NULL::text,
  p_alimentacion_especial boolean DEFAULT false, p_alimentacion_detalle text DEFAULT NULL::text,
  p_padre_nombre text DEFAULT NULL::text, p_padre_telefono text DEFAULT NULL::text,
  p_madre_nombre text DEFAULT NULL::text, p_madre_telefono text DEFAULT NULL::text,
  p_acepta_terminos boolean DEFAULT false, p_talle_remera text DEFAULT NULL::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_cupo int; v_usados int; v_id uuid; v_estado estado_registro; v_mensaje text;
begin
  IF p_rol NOT IN ('Tio', 'Misionero', 'Hijo') THEN
    RAISE EXCEPTION 'Rol inválido: %', p_rol;
  END IF;

  -- Friendly duplicate-CI check (final safeguard remains the unique index)
  IF EXISTS (
    SELECT 1 FROM public.registros
     WHERE ci = p_ci
       AND deleted_at IS NULL
       AND año = extract(year from now())
  ) THEN
    RAISE EXCEPTION 'Ya existe una inscripción con este documento para este año';
  END IF;

  select cupo_max into v_cupo from public.pueblos where id = p_pueblo_id and activo = true;
  if v_cupo is null then
    raise exception 'Pueblo no encontrado o inactivo';
  end if;
  select count(*) into v_usados from public.registros
    where pueblo_id = p_pueblo_id and estado = 'confirmado'::estado_registro
      and deleted_at is null and año = extract(year from now());

  if v_usados >= v_cupo then
    v_estado := 'lista_espera'::estado_registro;
    v_mensaje := 'Cupo completo. Quedás en lista de espera.';
  else
    v_estado := 'confirmado'::estado_registro;
    v_mensaje := 'Inscripción confirmada.';
  end if;

  insert into public.registros(
    nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe, pueblo_id,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, estado, talle_remera
  ) values (
    p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe, p_pueblo_id,
    p_tratamiento_especial, p_tratamiento_detalle,
    p_alimentacion_especial, p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    p_acepta_terminos, case when p_acepta_terminos then now() else null end,
    v_estado, p_talle_remera
  ) returning id into v_id;

  return json_build_object('id', v_id, 'estado', v_estado::text, 'mensaje', v_mensaje);
end;
$function$;
