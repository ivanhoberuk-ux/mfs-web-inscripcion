-- Crear bucket de documentos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Función helper para obtener el registro_id de una ruta de storage
CREATE OR REPLACE FUNCTION public.get_registro_id_from_path(path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Formato esperado: registros/{registro_id}/...
  IF path LIKE 'registros/%' THEN
    RETURN (regexp_match(path, 'registros/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid;
  END IF;
  RETURN NULL;
END;
$$;

-- Función para verificar si el usuario puede acceder a un documento
CREATE OR REPLACE FUNCTION public.can_access_documento(path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_registro_id uuid;
  v_registro_pueblo_id uuid;
  v_user_pueblo_id uuid;
BEGIN
  -- Permitir acceso a plantillas (público)
  IF path LIKE 'plantillas/%' THEN
    RETURN true;
  END IF;

  -- Si es super admin, acceso total
  IF is_super_admin() THEN
    RETURN true;
  END IF;

  -- Obtener el registro_id de la ruta
  v_registro_id := public.get_registro_id_from_path(path);
  IF v_registro_id IS NULL THEN
    RETURN false;
  END IF;

  -- Obtener el pueblo_id del registro
  SELECT pueblo_id INTO v_registro_pueblo_id
  FROM public.registros
  WHERE id = v_registro_id;

  IF v_registro_pueblo_id IS NULL THEN
    RETURN false;
  END IF;

  -- Si es admin de pueblo, verificar que sea de su pueblo
  IF is_pueblo_admin() THEN
    v_user_pueblo_id := get_user_pueblo_id();
    RETURN v_user_pueblo_id = v_registro_pueblo_id;
  END IF;

  -- Usuario regular: verificar que el registro sea suyo (por email)
  RETURN EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = v_registro_id
      AND r.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
END;
$$;

-- Políticas de storage para documentos

-- Permitir SELECT (ver/descargar) según permisos
DROP POLICY IF EXISTS "Usuarios pueden ver documentos según permisos" ON storage.objects;
CREATE POLICY "Usuarios pueden ver documentos según permisos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos' 
  AND (
    public.can_access_documento(name)
    OR name LIKE 'plantillas/%'
  )
);

-- Permitir INSERT (subir) según permisos
DROP POLICY IF EXISTS "Usuarios pueden subir documentos según permisos" ON storage.objects;
CREATE POLICY "Usuarios pueden subir documentos según permisos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documentos' 
  AND public.can_access_documento(name)
);

-- Permitir UPDATE según permisos
DROP POLICY IF EXISTS "Usuarios pueden actualizar documentos según permisos" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar documentos según permisos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documentos' 
  AND public.can_access_documento(name)
)
WITH CHECK (
  bucket_id = 'documentos' 
  AND public.can_access_documento(name)
);

-- Permitir DELETE según permisos
DROP POLICY IF EXISTS "Usuarios pueden eliminar documentos según permisos" ON storage.objects;
CREATE POLICY "Usuarios pueden eliminar documentos según permisos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documentos' 
  AND public.can_access_documento(name)
);