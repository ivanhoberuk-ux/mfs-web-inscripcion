-- Drop old/duplicate versions, keep the canonical one used by the app
-- Canonical signature (the one we keep):
-- (p_pueblo_id uuid, p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
--  p_email text, p_telefono text, p_direccion text, p_ciudad text,
--  p_emergencia_nombre text, p_emergencia_telefono text, p_rol text, p_es_jefe boolean,
--  p_tratamiento_especial boolean, p_tratamiento_detalle text,
--  p_alimentacion_especial boolean, p_alimentacion_detalle text,
--  p_padre_nombre text, p_padre_telefono text, p_madre_nombre text, p_madre_telefono text,
--  p_acepta_terminos boolean, p_talle_remera text)

-- 1) Versión sin p_talle_remera y con p_ciudad al final (22 args)
DROP FUNCTION IF EXISTS public.register_if_capacity(
  uuid, text, text, text, date, text, text, text, text, text, text, boolean,
  boolean, text, boolean, text, text, text, text, text, boolean, text
);

-- 2) Versión con p_ciudad al final + p_talle_remera (23 args, orden viejo A)
DROP FUNCTION IF EXISTS public.register_if_capacity(
  uuid, text, text, text, date, text, text, text,
  text, text, text, boolean,
  boolean, text, boolean, text,
  text, text, text, text,
  boolean, text, text
);

-- 3) Versión con p_ciudad después de es_jefe (23 args, orden viejo B)
DROP FUNCTION IF EXISTS public.register_if_capacity(
  uuid, text, text, text, date, text, text, text,
  text, text, text, boolean, text,
  boolean, text, boolean, text,
  text, text, text, text,
  boolean, text
);
