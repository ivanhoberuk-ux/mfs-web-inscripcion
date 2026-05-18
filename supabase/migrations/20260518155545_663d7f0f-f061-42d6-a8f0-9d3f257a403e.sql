-- Actualizar ocupa_cupo: Asesor no ocupa cupo
CREATE OR REPLACE FUNCTION public.ocupa_cupo(p_rol text, p_nacimiento date, "p_año" integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_date date;
  v_edad int;
BEGIN
  IF p_rol = 'Asesor' THEN
    RETURN false;
  END IF;
  IF p_rol IS DISTINCT FROM 'Hijo' THEN
    RETURN true;
  END IF;
  v_ref_date := make_date(p_año, 1, 1);
  v_edad := date_part('year', age(v_ref_date, p_nacimiento))::int;
  IF v_edad < 12 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$function$;

-- Reemplazar register_if_capacity con soporte Tío >=30 y Asesor
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text, p_ciudad text,
  p_emergencia_nombre text, p_emergencia_telefono text, p_rol text, p_es_jefe boolean,
  p_tratamiento_especial boolean, p_tratamiento_detalle text,
  p_alimentacion_especial boolean, p_alimentacion_detalle text,
  p_padre_nombre text, p_padre_telefono text, p_madre_nombre text, p_madre_telefono text,
  p_acepta_terminos boolean, p_talle_remera text,
  p_pertenece_schoenstatt boolean DEFAULT false,
  p_rama_schoenstatt text DEFAULT NULL::text,
  p_misiono_antes boolean DEFAULT false,
  p_tipo_asesor text DEFAULT NULL,
  p_pueblos_acompana uuid[] DEFAULT NULL
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
  v_edad_mision int;
BEGIN
  SELECT año INTO v_año FROM public.configuracion_inscripcion WHERE activo = true LIMIT 1;
  IF v_año IS NULL THEN
    v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  END IF;

  SELECT public.estado_inscripcion(v_año) INTO v_estado;
  IF v_estado IN ('cerrado_antes','cerrado_despues','sin_config') THEN
    RAISE EXCEPTION 'Las inscripciones están cerradas en este momento';
  END IF;

  IF v_estado = 'fase_anticipada' THEN
    IF NOT (p_rol IN ('Tio','Hijo','Asesor') OR (p_rol = 'Misionero' AND (p_es_jefe = true OR p_misiono_antes = true))) THEN
      RAISE EXCEPTION 'En la fase anticipada solo pueden inscribirse Tíos, Hijos, Asesores, Jefes Jóvenes o Misioneros que ya misionaron antes';
    END IF;
  END IF;

  -- Edad al 1 de enero del año de misión
  v_edad_mision := date_part('year', age(make_date(v_año, 1, 1), p_nacimiento))::int;

  IF p_rol = 'Misionero' AND v_edad_mision > 25 THEN
    RAISE EXCEPTION '¡Qué lindo que quieras seguir misionando! 💛 Lastimosamente ya pasó el límite de edad (25 años) para ser Misionero en las Misiones Familiares.';
  END IF;

  IF p_rol = 'Hijo' AND v_edad_mision > 14 THEN
    RAISE EXCEPTION '¡Tu hijo/a ya es grande! 🌟 Inscribilo/a como Misionero (hasta 25 años).';
  END IF;

  IF p_rol = 'Tio' AND v_edad_mision < 30 THEN
    RAISE EXCEPTION 'Para inscribirte como Tío debés tener al menos 30 años cumplidos al 1 de enero del año de misión.';
  END IF;

  IF p_rol = 'Asesor' AND (p_tipo_asesor IS NULL OR p_tipo_asesor NOT IN ('padre_schoenstatt','diocesano','hermana_maria')) THEN
    RAISE EXCEPTION 'Como Asesor debés indicar si sos Padre de Schoenstatt, Diocesano o Hermana de María.';
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

  -- Validar que el pueblo exista (Asesor también requiere uno principal por NOT NULL en pueblo_id)
  SELECT cupo_max INTO v_cupo FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_cupo IS NULL THEN
    RAISE EXCEPTION 'Pueblo no encontrado o inactivo';
  END IF;

  v_ocupa_cupo := public.ocupa_cupo(p_rol, p_nacimiento, v_año);

  IF p_rol = 'Asesor' THEN
    v_estado_registro := 'pendiente_validacion';
    v_mensaje := 'Tu inscripción como Asesor quedó pendiente de validación por un administrador. Te avisaremos por email cuando sea confirmada.';
  ELSIF v_ocupa_cupo THEN
    SELECT count(*) INTO v_usados
    FROM public.registros r
    WHERE r.pueblo_id = p_pueblo_id
      AND r.año = v_año
      AND r.deleted_at IS NULL
      AND r.estado = 'confirmado'
      AND public.ocupa_cupo(r.rol, r.nacimiento, v_año) = true;

    IF v_usados >= v_cupo THEN
      v_estado_registro := 'lista_espera';
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
    tratamiento_especial, tratamiento_detalle, alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, talle_remera,
    pertenece_schoenstatt, rama_schoenstatt, misiono_antes,
    tipo_asesor, pueblos_acompana,
    año, estado
  ) VALUES (
    p_pueblo_id, p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, COALESCE(p_es_jefe, false),
    COALESCE(p_tratamiento_especial, false), p_tratamiento_detalle, COALESCE(p_alimentacion_especial, false), p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    COALESCE(p_acepta_terminos, false), CASE WHEN p_acepta_terminos THEN now() ELSE NULL END, p_talle_remera,
    COALESCE(p_pertenece_schoenstatt, false), p_rama_schoenstatt, COALESCE(p_misiono_antes, false),
    CASE WHEN p_rol = 'Asesor' THEN p_tipo_asesor ELSE NULL END,
    CASE WHEN p_rol = 'Asesor' THEN p_pueblos_acompana ELSE NULL END,
    v_año, v_estado_registro::estado_registro
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'estado', v_estado_registro, 'mensaje', v_mensaje);
END;
$function$;

-- Nueva función: validar asesor (solo super_admin)
CREATE OR REPLACE FUNCTION public.validar_asesor(p_registro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text;
  v_estado public.estado_registro;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo super administradores pueden validar asesores';
  END IF;

  SELECT rol, estado INTO v_rol, v_estado
  FROM public.registros
  WHERE id = p_registro_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado';
  END IF;

  IF v_rol <> 'Asesor' THEN
    RAISE EXCEPTION 'El registro no es de un asesor';
  END IF;

  IF v_estado <> 'pendiente_validacion' THEN
    RAISE EXCEPTION 'El asesor ya fue procesado (estado: %)', v_estado;
  END IF;

  UPDATE public.registros
  SET estado = 'confirmado'
  WHERE id = p_registro_id;

  RETURN jsonb_build_object('ok', true, 'registro_id', p_registro_id);
END;
$function$;