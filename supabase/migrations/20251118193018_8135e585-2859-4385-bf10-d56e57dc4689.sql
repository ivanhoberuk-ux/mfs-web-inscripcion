-- 1. Agregar enum para el estado de registro
CREATE TYPE public.estado_registro AS ENUM ('confirmado', 'lista_espera', 'cancelado');

-- 2. Agregar columna estado a registros (por defecto confirmado para registros existentes)
ALTER TABLE public.registros 
ADD COLUMN estado public.estado_registro NOT NULL DEFAULT 'confirmado';

-- 3. Agregar índice para búsquedas por estado
CREATE INDEX idx_registros_estado ON public.registros(estado);
CREATE INDEX idx_registros_pueblo_estado_created ON public.registros(pueblo_id, estado, created_at);

-- 4. Eliminar todas las versiones antiguas de register_if_capacity
DROP FUNCTION IF EXISTS public.register_if_capacity(uuid,text,text,text,date,text,text,text,text,text,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.register_if_capacity(uuid,text,text,text,date,text,text,text,text,text,text,boolean,boolean,text,boolean,text,text,text,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.register_if_capacity(uuid,text,text,text,date,text,text,text,text,text,text,boolean,boolean,text,boolean,text,text,text,text,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.register_if_capacity(uuid,text,text,text,date,text,text,text,text,text,text,boolean,boolean,text,boolean,text,text,text,text,text,boolean,text) CASCADE;

-- 5. Crear nueva función register_if_capacity que retorna jsonb
CREATE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid,
  p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text,
  p_emergencia_nombre text, p_emergencia_telefono text,
  p_rol text, p_es_jefe boolean,
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
BEGIN
  v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  
  SELECT cupo_max INTO v_max FROM public.pueblos WHERE id = p_pueblo_id AND activo = true;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Pueblo inactivo o inexistente';
  END IF;

  SELECT COUNT(*) INTO v_usados 
  FROM public.registros 
  WHERE pueblo_id = p_pueblo_id 
    AND año = v_año
    AND estado = 'confirmado'
    AND deleted_at IS NULL;
  
  IF v_usados >= v_max THEN
    v_estado := 'lista_espera';
  ELSE
    v_estado := 'confirmado';
  END IF;

  INSERT INTO public.registros (
    pueblo_id, nombres, apellidos, ci, nacimiento, email, telefono, direccion, ciudad,
    emergencia_nombre, emergencia_telefono, rol, es_jefe,
    tratamiento_especial, tratamiento_detalle,
    alimentacion_especial, alimentacion_detalle,
    padre_nombre, padre_telefono, madre_nombre, madre_telefono,
    acepta_terminos, acepta_terminos_at, año, estado
  ) VALUES (
    p_pueblo_id, p_nombres, p_apellidos, p_ci, p_nacimiento, p_email, p_telefono, p_direccion, p_ciudad,
    p_emergencia_nombre, p_emergencia_telefono, p_rol, p_es_jefe,
    COALESCE(p_tratamiento_especial, false), p_tratamiento_detalle,
    COALESCE(p_alimentacion_especial, false), p_alimentacion_detalle,
    p_padre_nombre, p_padre_telefono, p_madre_nombre, p_madre_telefono,
    COALESCE(p_acepta_terminos, false),
    CASE WHEN COALESCE(p_acepta_terminos, false) THEN NOW() ELSE NULL END,
    v_año, v_estado
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'estado', v_estado::text,
    'mensaje', CASE 
      WHEN v_estado = 'confirmado' THEN 'Inscripción confirmada'
      WHEN v_estado = 'lista_espera' THEN 'Inscripción en lista de espera'
      ELSE 'Inscripción procesada'
    END
  );
END;
$$;

-- 6. Función para dar de baja un registro (soft delete)
CREATE FUNCTION public.cancelar_inscripcion(
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
  v_estado public.estado_registro;
  v_email text;
BEGIN
  SELECT pueblo_id, estado, email 
  INTO v_pueblo_id, v_estado, v_email
  FROM public.registros 
  WHERE id = p_registro_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado o ya cancelado';
  END IF;

  UPDATE public.registros 
  SET estado = 'cancelado',
      deleted_at = NOW()
  WHERE id = p_registro_id;

  RETURN jsonb_build_object(
    'registro_id', p_registro_id,
    'pueblo_id', v_pueblo_id,
    'estado_anterior', v_estado::text,
    'email', v_email,
    'debe_promover', v_estado = 'confirmado'
  );
END;
$$;

-- 7. Función para promover al siguiente en lista de espera
CREATE FUNCTION public.promover_siguiente_en_lista(
  p_pueblo_id uuid
)
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
BEGIN
  v_año := EXTRACT(YEAR FROM CURRENT_DATE)::int;

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
    RETURN jsonb_build_object(
      'promovido', false,
      'mensaje', 'No hay personas en lista de espera'
    );
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

-- 8. Vista para ver ocupación incluyendo lista de espera
CREATE OR REPLACE VIEW public.vw_ocupacion_completa AS
SELECT 
  p.id,
  p.nombre,
  p.cupo_max,
  p.activo,
  COALESCE(COUNT(*) FILTER (WHERE r.estado = 'confirmado' AND r.deleted_at IS NULL), 0)::int as confirmados,
  COALESCE(COUNT(*) FILTER (WHERE r.estado = 'lista_espera' AND r.deleted_at IS NULL), 0)::int as en_espera,
  (p.cupo_max - COALESCE(COUNT(*) FILTER (WHERE r.estado = 'confirmado' AND r.deleted_at IS NULL), 0))::int as libres
FROM public.pueblos p
LEFT JOIN public.registros r ON r.pueblo_id = p.id AND r.año = EXTRACT(YEAR FROM CURRENT_DATE)::int
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;