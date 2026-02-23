
-- 1) Agregar talle_remera a registros
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS talle_remera text;

-- 2) Actualizar register_if_capacity para incluir talle_remera
CREATE OR REPLACE FUNCTION public.register_if_capacity(
  p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text,
  p_emergencia_nombre text, p_emergencia_telefono text,
  p_rol text, p_es_jefe boolean,
  p_tratamiento_especial boolean DEFAULT false, p_tratamiento_detalle text DEFAULT NULL,
  p_alimentacion_especial boolean DEFAULT false, p_alimentacion_detalle text DEFAULT NULL,
  p_padre_nombre text DEFAULT NULL, p_padre_telefono text DEFAULT NULL,
  p_madre_nombre text DEFAULT NULL, p_madre_telefono text DEFAULT NULL,
  p_acepta_terminos boolean DEFAULT false, p_ciudad text DEFAULT NULL,
  p_talle_remera text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    'mensaje', CASE 
      WHEN v_estado = 'confirmado' THEN 'Inscripción confirmada'
      WHEN v_estado = 'lista_espera' THEN 'Inscripción en lista de espera'
      ELSE 'Inscripción procesada'
    END
  );
END;
$$;

-- 3) Actualizar is_pueblo_admin para reconocer co_admin_pueblo
CREATE OR REPLACE FUNCTION public.is_pueblo_admin(_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = COALESCE(_user_id, auth.uid())
      AND role IN ('pueblo_admin', 'co_admin_pueblo')
  )
$$;

-- 4) Actualizar can_manage_pueblo para co_admin_pueblo
CREATE OR REPLACE FUNCTION public.can_manage_pueblo(_pueblo_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    public.is_super_admin() OR 
    (public.is_pueblo_admin() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND pueblo_id = _pueblo_id
    ))
$$;

-- 5) Función para que pueblo_admin asigne co_admin a su pueblo
CREATE OR REPLACE FUNCTION public.assign_co_admin_pueblo(p_user_id uuid, p_pueblo_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar que quien ejecuta es super admin O pueblo_admin del mismo pueblo
  IF NOT public.is_super_admin() THEN
    IF NOT public.is_pueblo_admin() THEN
      RAISE EXCEPTION 'No tienes permisos para asignar co-admins';
    END IF;
    -- Verificar que el pueblo_admin pertenece al mismo pueblo
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND pueblo_id = p_pueblo_id
    ) THEN
      RAISE EXCEPTION 'Solo podés asignar co-admins a tu propio pueblo';
    END IF;
  END IF;
  
  -- Verificar que el pueblo existe
  IF NOT EXISTS (SELECT 1 FROM public.pueblos WHERE id = p_pueblo_id) THEN
    RAISE EXCEPTION 'El pueblo especificado no existe';
  END IF;
  
  -- Actualizar el pueblo_id del usuario
  UPDATE public.profiles
  SET pueblo_id = p_pueblo_id
  WHERE id = p_user_id;
  
  -- Asignar rol de co_admin_pueblo
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'co_admin_pueblo')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6) Función para remover co_admin
CREATE OR REPLACE FUNCTION public.remove_co_admin_pueblo(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar permisos: super_admin o pueblo_admin del mismo pueblo
  IF NOT public.is_super_admin() THEN
    IF NOT public.is_pueblo_admin() THEN
      RAISE EXCEPTION 'No tienes permisos para remover co-admins';
    END IF;
    -- Verificar mismo pueblo
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.pueblo_id = p2.pueblo_id
      WHERE p1.id = auth.uid() AND p2.id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Solo podés remover co-admins de tu propio pueblo';
    END IF;
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND role = 'co_admin_pueblo';
END;
$$;

-- 7) Tabla de logs de emails de recordatorio
CREATE TABLE IF NOT EXISTS public.email_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  pueblo_id uuid NOT NULL REFERENCES public.pueblos(id),
  tipo text NOT NULL CHECK (tipo IN ('inscripto', 'resumen_admin')),
  email_destino text NOT NULL,
  fecha_envio date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para email_reminder_logs
ALTER TABLE public.email_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_email_logs" ON public.email_reminder_logs
FOR ALL USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "pueblo_admin_read_own_logs" ON public.email_reminder_logs
FOR SELECT USING (public.is_pueblo_admin() AND pueblo_id = public.get_user_pueblo_id());

-- Índice para evitar duplicados diarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_unique_daily 
ON public.email_reminder_logs (registro_id, tipo, fecha_envio);

-- 8) Actualizar has_role para reconocer co_admin_pueblo como pueblo_admin equivalent
-- (ya cubierto por is_pueblo_admin actualizado)

-- 9) Actualizar RLS de user_roles para que pueblo_admin pueda gestionar co_admins de su pueblo
CREATE POLICY "pueblo_admin_manage_co_admins" ON public.user_roles
FOR ALL USING (
  public.is_pueblo_admin() AND role = 'co_admin_pueblo'
  AND EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.pueblo_id = p2.pueblo_id
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
  )
)
WITH CHECK (
  public.is_pueblo_admin() AND role = 'co_admin_pueblo'
  AND EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.pueblo_id = p2.pueblo_id
    WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
  )
);
