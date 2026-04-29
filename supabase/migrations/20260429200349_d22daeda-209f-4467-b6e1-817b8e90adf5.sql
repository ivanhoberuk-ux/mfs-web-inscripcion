CREATE OR REPLACE FUNCTION public.puede_inscribirse(p_año integer, p_rol text, p_es_jefe boolean)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_estado text := public.estado_inscripcion(p_año);
BEGIN
  IF v_estado = 'sin_config' THEN
    RETURN jsonb_build_object('ok', false, 'estado', v_estado, 'mensaje', 'Aún no hay configuración para el año ' || p_año);
  END IF;
  IF v_estado = 'cerrado_antes' THEN
    RETURN jsonb_build_object('ok', false, 'estado', v_estado, 'mensaje', 'Las inscripciones aún no abrieron');
  END IF;
  IF v_estado = 'cerrado_despues' THEN
    RETURN jsonb_build_object('ok', false, 'estado', v_estado, 'mensaje', 'Las inscripciones del año ' || p_año || ' están cerradas');
  END IF;
  IF v_estado = 'fase_anticipada' THEN
    -- Tíos, Hijos, o Misioneros con es_jefe=true
    IF p_rol = 'Tio' OR p_rol = 'Hijo' OR (p_rol = 'Misionero' AND COALESCE(p_es_jefe, false) = true) THEN
      RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'mensaje', 'Inscripción anticipada habilitada');
    END IF;
    RETURN jsonb_build_object('ok', false, 'estado', v_estado, 'mensaje', 'En esta fase solo pueden inscribirse Tíos, Hijos de Tíos y Jefes Jóvenes');
  END IF;
  RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'mensaje', 'Inscripciones abiertas');
END;
$$;