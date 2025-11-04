-- Actualizar la función register_if_capacity para incluir el parámetro ciudad
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid,
  p_nombres text,
  p_apellidos text,
  p_ci text,
  p_nacimiento date,
  p_email text,
  p_telefono text,
  p_direccion text,
  p_emergencia_nombre text,
  p_emergencia_telefono text,
  p_rol text,
  p_es_jefe boolean,
  p_tratamiento_especial boolean DEFAULT false,
  p_tratamiento_detalle text DEFAULT NULL,
  p_alimentacion_especial boolean DEFAULT false,
  p_alimentacion_detalle text DEFAULT NULL,
  p_padre_nombre text DEFAULT NULL,
  p_padre_telefono text DEFAULT NULL,
  p_madre_nombre text DEFAULT NULL,
  p_madre_telefono text DEFAULT NULL,
  p_acepta_terminos boolean DEFAULT false,
  p_ciudad text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max int;
  v_usados int;
  v_id uuid;
  v_año int;
BEGIN
  -- Obtener el año actual
  v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  
  SELECT cupo_max INTO v_max FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Pueblo inactivo o inexistente';
  END IF;

  -- Contar solo inscripciones del año actual
  SELECT COUNT(*) INTO v_usados FROM public.registros 
  WHERE pueblo_id = p_pueblo_id AND año = v_año;
  
  IF v_usados >= v_max THEN
    RAISE EXCEPTION 'Cupo completo';
  END IF;

  INSERT INTO public.registros (
    pueblo_id, nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, año
  ) VALUES (
    p_pueblo_id, p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe,
    COALESCE(p_tratamiento_especial, false), p_tratamiento_detalle,
    COALESCE(p_alimentacion_especial, false), p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    COALESCE(p_acepta_terminos, false),
    CASE WHEN COALESCE(p_acepta_terminos, false) THEN NOW() ELSE NULL END,
    v_año
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;