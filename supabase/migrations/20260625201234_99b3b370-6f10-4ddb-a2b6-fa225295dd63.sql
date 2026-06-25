
-- 1) Columnas nuevas en registros
ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS no_clasifico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_clasificado_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_clasificado_motivo text,
  ADD COLUMN IF NOT EXISTS no_clasificado_por uuid;

CREATE INDEX IF NOT EXISTS idx_registros_no_clasifico ON public.registros(no_clasifico) WHERE no_clasifico = true;

-- 2) Recrear vw_ocupacion para excluir no_clasifico
CREATE OR REPLACE VIEW public.vw_ocupacion AS
 SELECT p.id,
    p.nombre,
    p.cupo_max,
    p.activo,
    (COALESCE(sum(
        CASE
            WHEN ((r.estado = 'confirmado'::estado_registro) AND (r.deleted_at IS NULL) AND (r.no_clasifico = false) AND (public.ocupa_cupo(r.rol, r.nacimiento, r."año") = true)) THEN 1
            ELSE 0
        END), (0)::bigint))::integer AS usados,
    (COALESCE(sum(
        CASE
            WHEN ((r.estado = 'confirmado'::estado_registro) AND (r.deleted_at IS NULL) AND (r.no_clasifico = false) AND (public.ocupa_cupo(r.rol, r.nacimiento, r."año") = false)) THEN 1
            ELSE 0
        END), (0)::bigint))::integer AS menores,
    (COALESCE(sum(
        CASE
            WHEN ((r.estado = 'confirmado'::estado_registro) AND (r.deleted_at IS NULL) AND (r.no_clasifico = false)) THEN 1
            ELSE 0
        END), (0)::bigint))::integer AS total_personas,
    GREATEST((p.cupo_max - (COALESCE(sum(
        CASE
            WHEN ((r.estado = 'confirmado'::estado_registro) AND (r.deleted_at IS NULL) AND (r.no_clasifico = false) AND (public.ocupa_cupo(r.rol, r.nacimiento, r."año") = true)) THEN 1
            ELSE 0
        END), (0)::bigint))::integer), 0) AS libres,
    (COALESCE(sum(
        CASE
            WHEN ((r.estado = 'lista_espera'::estado_registro) AND (r.deleted_at IS NULL)) THEN 1
            ELSE 0
        END), (0)::bigint))::integer AS en_espera
   FROM (public.pueblos p
     LEFT JOIN public.registros r ON (((r.pueblo_id = p.id) AND (r."año" = (EXTRACT(year FROM CURRENT_DATE))::integer))))
  GROUP BY p.id, p.nombre, p.cupo_max, p.activo;

-- 3) Actualizar promover_siguiente_en_lista para excluir no_clasifico al contar
CREATE OR REPLACE FUNCTION public.promover_siguiente_en_lista(p_pueblo_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_registro_id uuid;
  v_email text;
  v_nombres text;
  v_apellidos text;
  v_año int;
  v_max int;
  v_usados int;
BEGIN
  v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;

  SELECT cupo_max INTO v_max FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_max IS NULL THEN
    RETURN jsonb_build_object('promovido', false, 'mensaje', 'Pueblo inactivo');
  END IF;

  SELECT COUNT(*) INTO v_usados
  FROM public.registros
  WHERE pueblo_id = p_pueblo_id
    AND año = v_año
    AND estado = 'confirmado'
    AND deleted_at IS NULL
    AND no_clasifico = false
    AND public.ocupa_cupo(rol, nacimiento, año) = true;

  IF v_usados >= v_max THEN
    RETURN jsonb_build_object('promovido', false, 'mensaje', 'Sin cupo disponible');
  END IF;

  SELECT id, email, nombres, apellidos
  INTO v_registro_id, v_email, v_nombres, v_apellidos
  FROM public.registros
  WHERE pueblo_id = p_pueblo_id
    AND año = v_año
    AND estado = 'lista_espera'
    AND deleted_at IS NULL
    AND no_clasifico = false
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_registro_id IS NULL THEN
    RETURN jsonb_build_object('promovido', false, 'mensaje', 'No hay personas en lista de espera');
  END IF;

  UPDATE public.registros
  SET estado = 'confirmado'
  WHERE id = v_registro_id;

  RETURN jsonb_build_object(
    'promovido', true,
    'registro_id', v_registro_id,
    'email', v_email,
    'nombres', v_nombres,
    'apellidos', v_apellidos,
    'mensaje', 'Usuario promovido de lista de espera a confirmado'
  );
END;
$function$;

-- 4) Trigger: también disparar promoción cuando se activa no_clasifico
CREATE OR REPLACE FUNCTION public.trg_promover_al_liberar_cupo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_libero_cupo boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'confirmado' AND OLD.deleted_at IS NULL AND OLD.no_clasifico = false
       AND public.ocupa_cupo(OLD.rol, OLD.nacimiento, OLD.año) THEN
      v_libero_cupo := true;
    END IF;
    IF v_libero_cupo THEN
      PERFORM public.promover_siguiente_en_lista(OLD.pueblo_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'confirmado' AND OLD.deleted_at IS NULL AND OLD.no_clasifico = false
       AND (NEW.estado = 'cancelado' OR NEW.deleted_at IS NOT NULL OR NEW.no_clasifico = true)
       AND public.ocupa_cupo(OLD.rol, OLD.nacimiento, OLD.año) THEN
      v_libero_cupo := true;
    END IF;
    IF v_libero_cupo THEN
      PERFORM public.promover_siguiente_en_lista(NEW.pueblo_id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) RPC marcar_no_clasificado
CREATE OR REPLACE FUNCTION public.marcar_no_clasificado(
  p_registro_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pueblo_id uuid;
  v_año int;
  v_vence timestamptz;
  v_user_pueblo uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;

  SELECT pueblo_id, año INTO v_pueblo_id, v_año
  FROM public.registros
  WHERE id = p_registro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado';
  END IF;

  -- Permisos: super_admin O pueblo_admin/co_admin del mismo pueblo
  IF NOT public.is_super_admin() THEN
    IF NOT public.is_pueblo_admin() THEN
      RAISE EXCEPTION 'Solo administradores pueden marcar como no clasificó';
    END IF;
    SELECT pueblo_id INTO v_user_pueblo FROM public.profiles WHERE id = auth.uid();
    IF v_user_pueblo IS NULL OR v_user_pueblo <> v_pueblo_id THEN
      RAISE EXCEPTION 'Solo podés marcar inscriptos de tu propio pueblo';
    END IF;
  END IF;

  -- Solo después de la fecha de vencimiento de lista de espera
  SELECT lista_espera_vence_at INTO v_vence
  FROM public.configuracion_inscripcion
  WHERE año = v_año
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_vence IS NULL OR v_vence > now() THEN
    RAISE EXCEPTION 'Esta acción solo está habilitada después de la fecha de vencimiento de lista de espera configurada (%).', COALESCE(v_vence::text, 'no configurada');
  END IF;

  UPDATE public.registros
  SET no_clasifico = true,
      no_clasificado_at = now(),
      no_clasificado_motivo = NULLIF(trim(coalesce(p_motivo,'')), ''),
      no_clasificado_por = auth.uid(),
      estado = 'cancelado'
  WHERE id = p_registro_id;

  RETURN jsonb_build_object('ok', true, 'registro_id', p_registro_id, 'pueblo_id', v_pueblo_id);
END;
$$;

-- 6) RPC revertir_no_clasificado
CREATE OR REPLACE FUNCTION public.revertir_no_clasificado(
  p_registro_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pueblo_id uuid;
  v_año int;
  v_rol text;
  v_nacimiento date;
  v_max int;
  v_usados int;
  v_nuevo_estado public.estado_registro;
  v_user_pueblo uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;

  SELECT pueblo_id, año, rol, nacimiento INTO v_pueblo_id, v_año, v_rol, v_nacimiento
  FROM public.registros
  WHERE id = p_registro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF NOT public.is_pueblo_admin() THEN
      RAISE EXCEPTION 'Solo administradores pueden revertir';
    END IF;
    SELECT pueblo_id INTO v_user_pueblo FROM public.profiles WHERE id = auth.uid();
    IF v_user_pueblo IS NULL OR v_user_pueblo <> v_pueblo_id THEN
      RAISE EXCEPTION 'Solo podés revertir inscriptos de tu propio pueblo';
    END IF;
  END IF;

  -- Decidir estado destino según cupo
  SELECT cupo_max INTO v_max FROM public.pueblos WHERE id = v_pueblo_id;

  SELECT COUNT(*) INTO v_usados
  FROM public.registros
  WHERE pueblo_id = v_pueblo_id
    AND año = v_año
    AND estado = 'confirmado'
    AND deleted_at IS NULL
    AND no_clasifico = false
    AND public.ocupa_cupo(rol, nacimiento, año) = true;

  IF NOT public.ocupa_cupo(v_rol, v_nacimiento, v_año) OR v_usados < v_max THEN
    v_nuevo_estado := 'confirmado';
  ELSE
    v_nuevo_estado := 'lista_espera';
  END IF;

  UPDATE public.registros
  SET no_clasifico = false,
      no_clasificado_at = NULL,
      no_clasificado_motivo = NULL,
      no_clasificado_por = NULL,
      estado = v_nuevo_estado,
      deleted_at = NULL
  WHERE id = p_registro_id;

  RETURN jsonb_build_object('ok', true, 'registro_id', p_registro_id, 'estado', v_nuevo_estado::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_no_clasificado(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revertir_no_clasificado(uuid) TO authenticated;
