
-- Add new column to track previous mission experience
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS misiono_antes boolean NOT NULL DEFAULT false;

-- Drop older overload to avoid ambiguity
DROP FUNCTION IF EXISTS public.register_if_capacity(
  uuid, text, text, text, date, text, text, text, text, text, text, text, boolean,
  boolean, text, boolean, text, text, text, text, text, boolean, text
);

-- Recreate newer overload with extra parameter p_misiono_antes
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text, p_ciudad text,
  p_emergencia_nombre text, p_emergencia_telefono text, p_rol text, p_es_jefe boolean,
  p_tratamiento_especial boolean, p_tratamiento_detalle text,
  p_alimentacion_especial boolean, p_alimentacion_detalle text,
  p_padre_nombre text, p_padre_telefono text, p_madre_nombre text, p_madre_telefono text,
  p_acepta_terminos boolean, p_talle_remera text,
  p_pertenece_schoenstatt boolean DEFAULT false,
  p_rama_schoenstatt text DEFAULT NULL,
  p_misiono_antes boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_año integer;
  v_estado text;
  v_cupo int;
  v_usados int;
  v_id uuid;
  v_estado_registro text;
  v_mensaje text;
  v_ocupa_cupo boolean;
BEGIN
  SELECT año INTO v_año FROM public.configuracion_inscripcion WHERE activo = true LIMIT 1;
  IF v_año IS NULL THEN
    v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  END IF;

  SELECT public.estado_inscripcion(v_año) INTO v_estado;
  IF v_estado IN ('cerrado_antes','cerrado_despues','sin_config') THEN
    RAISE EXCEPTION 'Las inscripciones están cerradas en este momento';
  END IF;

  -- Restricción fase anticipada: solo Tío, Hijo, Misionero (jefe o que ya misionó antes)
  IF v_estado = 'fase_anticipada' THEN
    IF NOT (p_rol IN ('Tio','Hijo') OR (p_rol = 'Misionero' AND (p_es_jefe = true OR p_misiono_antes = true))) THEN
      RAISE EXCEPTION 'En la fase anticipada solo pueden inscribirse Tíos, Hijos, Jefes Jóvenes o Misioneros que ya misionaron antes';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.registros
    WHERE ci = p_ci AND año = v_año AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Ya existe una inscripción con este documento para este año';
  END IF;

  IF p_pertenece_schoenstatt = true AND (p_rama_schoenstatt IS NULL OR btrim(p_rama_schoenstatt) = '') THEN
    RAISE EXCEPTION 'Indicá a qué rama de Schoenstatt pertenecés';
  END IF;
  IF p_pertenece_schoenstatt = false THEN
    p_rama_schoenstatt := NULL;
  END IF;

  SELECT cupo_max INTO v_cupo FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_cupo IS NULL THEN
    RAISE EXCEPTION 'Pueblo no encontrado o inactivo';
  END IF;

  v_ocupa_cupo := public.ocupa_cupo(p_rol, p_nacimiento, v_año);

  IF v_ocupa_cupo THEN
    SELECT count(*) INTO v_usados
    FROM public.registros r
    WHERE r.pueblo_id = p_pueblo_id
      AND r.año = v_año
      AND r.deleted_at IS NULL
      AND r.estado = 'confirmado'
      AND public.ocupa_cupo(r.rol, r.nacimiento, v_año) = true;

    IF v_usados >= v_cupo THEN
      v_estado_registro := 'en_espera';
      v_mensaje := 'El pueblo está completo. Quedás en lista de espera.';
    ELSE
      v_estado_registro := 'confirmado';
      v_mensaje := 'Inscripción confirmada.';
    END IF;
  ELSE
    v_estado_registro := 'confirmado';
    v_mensaje := 'Inscripción confirmada (acompañante menor).';
  END IF;

  INSERT INTO public.registros (
    pueblo_id, nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, talle_remera, año, estado,
    pertenece_schoenstatt, rama_schoenstatt, misiono_antes
  ) VALUES (
    p_pueblo_id, p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe,
    p_tratamiento_especial, p_tratamiento_detalle,
    p_alimentacion_especial, p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    p_acepta_terminos, CASE WHEN p_acepta_terminos THEN now() ELSE NULL END, p_talle_remera, v_año, v_estado_registro::estado_registro,
    coalesce(p_pertenece_schoenstatt, false), p_rama_schoenstatt,
    coalesce(p_misiono_antes, false)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'estado', v_estado_registro, 'mensaje', v_mensaje);
END;
$function$;
