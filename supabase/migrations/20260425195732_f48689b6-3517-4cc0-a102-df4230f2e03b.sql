-- Tabla de configuración de inscripciones por año
CREATE TABLE IF NOT EXISTS public.configuracion_inscripcion (
  año integer PRIMARY KEY,
  apertura_anticipada timestamptz NOT NULL,
  apertura_general timestamptz NOT NULL,
  cierre timestamptz NOT NULL,
  activo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion_inscripcion ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la UI necesita saber estado)
CREATE POLICY "configuracion_inscripcion_read_public"
ON public.configuracion_inscripcion FOR SELECT
USING (true);

-- Solo super_admin puede escribir
CREATE POLICY "configuracion_inscripcion_super_admin_write"
ON public.configuracion_inscripcion FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_configuracion_inscripcion_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracion_inscripcion_updated ON public.configuracion_inscripcion;
CREATE TRIGGER trg_configuracion_inscripcion_updated
BEFORE UPDATE ON public.configuracion_inscripcion
FOR EACH ROW EXECUTE FUNCTION public.tg_configuracion_inscripcion_updated();

-- Asegurar un solo año activo a la vez
CREATE OR REPLACE FUNCTION public.tg_configuracion_inscripcion_unico_activo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.activo = true THEN
    UPDATE public.configuracion_inscripcion
       SET activo = false
     WHERE año <> NEW.año AND activo = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracion_inscripcion_unico_activo ON public.configuracion_inscripcion;
CREATE TRIGGER trg_configuracion_inscripcion_unico_activo
AFTER INSERT OR UPDATE OF activo ON public.configuracion_inscripcion
FOR EACH ROW EXECUTE FUNCTION public.tg_configuracion_inscripcion_unico_activo();

-- Función para evaluar el estado actual de inscripciones
-- Devuelve: 'cerrado_antes' | 'fase_anticipada' | 'fase_general' | 'cerrado_despues' | 'sin_config'
CREATE OR REPLACE FUNCTION public.estado_inscripcion(p_año integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cfg public.configuracion_inscripcion%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_cfg FROM public.configuracion_inscripcion WHERE año = p_año;
  IF NOT FOUND THEN RETURN 'sin_config'; END IF;
  IF v_now < v_cfg.apertura_anticipada THEN RETURN 'cerrado_antes'; END IF;
  IF v_now < v_cfg.apertura_general THEN RETURN 'fase_anticipada'; END IF;
  IF v_now < v_cfg.cierre THEN RETURN 'fase_general'; END IF;
  RETURN 'cerrado_despues';
END;
$$;

-- Función helper: ¿puede inscribirse este rol/jefe en este momento?
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
    -- Solo Tíos o Misioneros con es_jefe=true
    IF p_rol = 'Tio' OR (p_rol = 'Misionero' AND COALESCE(p_es_jefe, false) = true) THEN
      RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'mensaje', 'Inscripción anticipada habilitada');
    END IF;
    RETURN jsonb_build_object('ok', false, 'estado', v_estado, 'mensaje', 'En esta fase solo pueden inscribirse Tíos y Jefes Jóvenes');
  END IF;
  -- fase_general
  RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'mensaje', 'Inscripciones abiertas');
END;
$$;

-- Actualizar register_if_capacity para validar fase de inscripción
-- Tomamos la firma con p_talle_remera y p_acepta_terminos (la "completa")
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid,
  p_nombres text,
  p_apellidos text,
  p_ci text,
  p_nacimiento date,
  p_email text,
  p_telefono text,
  p_direccion text,
  p_emergencia_nombre text DEFAULT NULL,
  p_emergencia_telefono text DEFAULT NULL,
  p_rol text DEFAULT 'Misionero',
  p_es_jefe boolean DEFAULT false,
  p_ciudad text DEFAULT NULL,
  p_tratamiento_especial boolean DEFAULT false,
  p_tratamiento_detalle text DEFAULT NULL,
  p_alimentacion_especial boolean DEFAULT false,
  p_alimentacion_detalle text DEFAULT NULL,
  p_padre_nombre text DEFAULT NULL,
  p_padre_telefono text DEFAULT NULL,
  p_madre_nombre text DEFAULT NULL,
  p_madre_telefono text DEFAULT NULL,
  p_acepta_terminos boolean DEFAULT false,
  p_talle_remera text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_año integer;
  v_cfg public.configuracion_inscripcion%ROWTYPE;
  v_permiso jsonb;
  v_cupo integer;
  v_usados integer;
  v_ocupa boolean;
  v_estado_reg public.estado_registro;
  v_id uuid;
BEGIN
  -- Año activo (configurado como activo = true), sino el año actual
  SELECT * INTO v_cfg FROM public.configuracion_inscripcion WHERE activo = true LIMIT 1;
  IF FOUND THEN
    v_año := v_cfg.año;
  ELSE
    v_año := EXTRACT(year FROM now())::int;
  END IF;

  -- Validar fase de inscripción y rol permitido
  v_permiso := public.puede_inscribirse(v_año, p_rol, p_es_jefe);
  IF (v_permiso->>'ok')::boolean = false THEN
    RAISE EXCEPTION '%', v_permiso->>'mensaje';
  END IF;

  -- Verificar pueblo
  SELECT cupo_max INTO v_cupo FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_cupo IS NULL THEN
    RAISE EXCEPTION 'Pueblo no encontrado o inactivo';
  END IF;

  -- ¿Este registro ocupa cupo?
  v_ocupa := public.ocupa_cupo(p_rol, p_nacimiento, v_año);

  -- Contar misioneros que ocupan cupo en ese pueblo y año
  SELECT count(*) INTO v_usados
    FROM public.registros
   WHERE pueblo_id = p_pueblo_id
     AND año = v_año
     AND estado = 'confirmado'
     AND public.ocupa_cupo(rol, nacimiento, año) = true;

  IF v_ocupa AND v_usados >= v_cupo THEN
    v_estado_reg := 'lista_espera';
  ELSE
    v_estado_reg := 'confirmado';
  END IF;

  INSERT INTO public.registros(
    nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe, pueblo_id,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, talle_remera, año, estado
  ) VALUES (
    p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe, p_pueblo_id,
    p_tratamiento_especial, p_tratamiento_detalle,
    p_alimentacion_especial, p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    p_acepta_terminos, CASE WHEN p_acepta_terminos THEN now() ELSE NULL END,
    p_talle_remera, v_año, v_estado_reg
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'estado', v_estado_reg,
    'mensaje', CASE WHEN v_estado_reg = 'confirmado'
                    THEN 'Inscripción confirmada'
                    ELSE 'Cupo completo: quedaste en lista de espera' END
  );
END;
$$;

-- Seed inicial: configuración 2026 activa con fechas razonables (ajustables desde UI)
INSERT INTO public.configuracion_inscripcion (año, apertura_anticipada, apertura_general, cierre, activo)
VALUES (
  2026,
  '2025-01-01 00:00:00-03'::timestamptz,
  '2025-01-01 00:00:00-03'::timestamptz,
  '2026-12-31 23:59:59-03'::timestamptz,
  true
)
ON CONFLICT (año) DO NOTHING;