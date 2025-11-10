-- Fix Critical Security Issues: Storage Exposure and Input Validation

-- 1. STORAGE EXPOSURE FIX: Set documentos bucket back to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documentos';

-- Note: The app will now use signed URLs for time-limited access to documents
-- RLS policies already in place will control who can generate these signed URLs

-- 2. INPUT VALIDATION FIX: Add CHECK constraints to registros table

-- Nombres and Apellidos: max 100 characters
ALTER TABLE public.registros 
ADD CONSTRAINT check_nombres_length CHECK (length(nombres) > 0 AND length(nombres) <= 100);

ALTER TABLE public.registros 
ADD CONSTRAINT check_apellidos_length CHECK (length(apellidos) > 0 AND length(apellidos) <= 100);

-- Email: max 255 characters with basic format validation
ALTER TABLE public.registros 
ADD CONSTRAINT check_email_length CHECK (length(email) > 0 AND length(email) <= 255);

ALTER TABLE public.registros 
ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- CI: max 20 characters
ALTER TABLE public.registros 
ADD CONSTRAINT check_ci_length CHECK (length(ci) > 0 AND length(ci) <= 20);

-- Telefono: max 30 characters
ALTER TABLE public.registros 
ADD CONSTRAINT check_telefono_length CHECK (length(telefono) > 0 AND length(telefono) <= 30);

-- Optional fields with reasonable limits
ALTER TABLE public.registros 
ADD CONSTRAINT check_direccion_length CHECK (direccion IS NULL OR length(direccion) <= 500);

ALTER TABLE public.registros 
ADD CONSTRAINT check_ciudad_length CHECK (ciudad IS NULL OR length(ciudad) <= 100);

ALTER TABLE public.registros 
ADD CONSTRAINT check_emergencia_nombre_length CHECK (emergencia_nombre IS NULL OR length(emergencia_nombre) <= 100);

ALTER TABLE public.registros 
ADD CONSTRAINT check_emergencia_telefono_length CHECK (emergencia_telefono IS NULL OR length(emergencia_telefono) <= 30);

ALTER TABLE public.registros 
ADD CONSTRAINT check_padre_nombre_length CHECK (padre_nombre IS NULL OR length(padre_nombre) <= 100);

ALTER TABLE public.registros 
ADD CONSTRAINT check_padre_telefono_length CHECK (padre_telefono IS NULL OR length(padre_telefono) <= 30);

ALTER TABLE public.registros 
ADD CONSTRAINT check_madre_nombre_length CHECK (madre_nombre IS NULL OR length(madre_nombre) <= 100);

ALTER TABLE public.registros 
ADD CONSTRAINT check_madre_telefono_length CHECK (madre_telefono IS NULL OR length(madre_telefono) <= 30);

-- Detalle fields for special conditions
ALTER TABLE public.registros 
ADD CONSTRAINT check_tratamiento_detalle_length CHECK (tratamiento_detalle IS NULL OR length(tratamiento_detalle) <= 500);

ALTER TABLE public.registros 
ADD CONSTRAINT check_alimentacion_detalle_length CHECK (alimentacion_detalle IS NULL OR length(alimentacion_detalle) <= 500);

-- Rol: should be one of the valid values
ALTER TABLE public.registros 
ADD CONSTRAINT check_rol_valid CHECK (rol IN ('Tio', 'Misionero'));