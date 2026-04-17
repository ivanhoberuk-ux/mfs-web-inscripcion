-- 1. Función auxiliar: determina si un registro ocupa cupo
-- Regla: Hijo menor de 15 años (calculado al 1 de enero del año del registro) NO ocupa cupo
CREATE OR REPLACE FUNCTION public.ocupa_cupo(p_rol text, p_nacimiento date, p_año int)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_rol = 'Hijo' AND p_nacimiento IS NOT NULL
         AND (p_año - EXTRACT(YEAR FROM p_nacimiento)::int) < 15
      THEN false
    ELSE true
  END
$$;

-- 2. Actualizar register_if_capacity para usar la nueva regla
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text, p_emergencia_nombre text,
  p_emergencia_telefono text, p_rol text, p_es_jefe boolean,
  p_tratamiento_especial boolean DEFAULT false, p_tratamiento_detalle text DEFAULT NULL,
  p_alimentacion_especial boolean DEFAULT false, p_alimentacion_detalle text DEFAULT NULL,
  p_padre_nombre text DEFAULT NULL, p_padre_telefono text DEFAULT NULL,
  p_madre_nombre text DEFAULT NULL, p_madre_telefono text DEFAULT NULL,
  p_acepta_terminos boolean DEFAULT false, p_ciudad text DEFAULT NULL,
  p_talle_remera text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max int;
  v_usados int;
  v_id uuid;
  v_estado public.estado_registro;
  v_año int;
  v_ocupa boolean;
BEGIN
  v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;

  SELECT cupo_max INTO v_max FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Pueblo inactivo o inexistente';
  END IF;

  -- Determinar si este registro ocupa cupo
  v_ocupa := public.ocupa_cupo(p_rol, p_nacimiento, v_año);

  IF v_ocupa THEN
    -- Solo contar registros que SÍ ocupan cupo
    SELECT COUNT(*) INTO v_usados
    FROM public.registros
    WHERE pueblo_id = p_pueblo_id
      AND año = v_año
      AND estado = 'confirmado'
      AND deleted_at IS NULL
      AND public.ocupa_cupo(rol, nacimiento, año) = true;

    IF v_usados >= v_max THEN
      v_estado := 'lista_espera';
    ELSE
      v_estado := 'confirmado';
    END IF;
  ELSE
    -- Hijo menor: siempre confirmado, no ocupa cupo
    v_estado := 'confirmado';
  END IF;

  INSERT INTO public.registros (
    pueblo_id, nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, año, estado, talle_remera
  ) VALUES (
    p_pueblo_id, p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe,
    COALESCE(p_tratamiento_especial, false), p_tratamiento_detalle,
    COALESCE(p_alimentacion_especial, false), p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    COALESCE(p_acepta_terminos, false),
    CASE WHEN COALESCE(p_acepta_terminos, false) THEN NOW() ELSE NULL END,
    v_año, v_estado, p_talle_remera
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'estado', v_estado::text,
    'ocupa_cupo', v_ocupa,
    'mensaje', CASE
      WHEN NOT v_ocupa THEN 'Inscripción confirmada (menor, no ocupa cupo)'
      WHEN v_estado = 'confirmado' THEN 'Inscripción confirmada'
      WHEN v_estado = 'lista_espera' THEN 'Inscripción en lista de espera'
      ELSE 'Inscripción procesada'
    END
  );
END;
$$;

-- 3. Recrear vw_ocupacion con columnas separadas para menores
DROP VIEW IF EXISTS public.vw_ocupacion CASCADE;

CREATE VIEW public.vw_ocupacion AS
SELECT
  p.id,
  p.nombre,
  p.cupo_max,
  p.activo,
  COALESCE(SUM(CASE
    WHEN r.estado = 'confirmado'
     AND r.deleted_at IS NULL
     AND public.ocupa_cupo(r.rol, r.nacimiento, r.año) = true
    THEN 1 ELSE 0
  END), 0)::int AS usados,
  COALESCE(SUM(CASE
    WHEN r.estado = 'confirmado'
     AND r.deleted_at IS NULL
     AND public.ocupa_cupo(r.rol, r.nacimiento, r.año) = false
    THEN 1 ELSE 0
  END), 0)::int AS menores,
  COALESCE(SUM(CASE
    WHEN r.estado = 'confirmado'
     AND r.deleted_at IS NULL
    THEN 1 ELSE 0
  END), 0)::int AS total_personas,
  GREATEST(p.cupo_max - COALESCE(SUM(CASE
    WHEN r.estado = 'confirmado'
     AND r.deleted_at IS NULL
     AND public.ocupa_cupo(r.rol, r.nacimiento, r.año) = true
    THEN 1 ELSE 0
  END), 0)::int, 0) AS libres
FROM public.pueblos p
LEFT JOIN public.registros r
  ON r.pueblo_id = p.id
 AND r.año = EXTRACT(YEAR FROM CURRENT_DATE)::int
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;

-- 4. Actualizar promover_siguiente_en_lista: solo promover si hay cupo libre
CREATE OR REPLACE FUNCTION public.promover_siguiente_en_lista(p_pueblo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Contar solo los que ocupan cupo
  SELECT COUNT(*) INTO v_usados
  FROM public.registros
  WHERE pueblo_id = p_pueblo_id
    AND año = v_año
    AND estado = 'confirmado'
    AND deleted_at IS NULL
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
$$;