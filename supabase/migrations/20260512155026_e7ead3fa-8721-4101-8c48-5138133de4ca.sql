
-- Tabla para que super admins gestionen plantillas/documentos comunes
CREATE TABLE IF NOT EXISTS public.plantillas_documentos (
  key text PRIMARY KEY,
  titulo text NOT NULL,
  descripcion text,
  emoji text DEFAULT '📄',
  bucket text NOT NULL DEFAULT 'plantillas',
  path text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.plantillas_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantillas_documentos_read_public ON public.plantillas_documentos;
CREATE POLICY plantillas_documentos_read_public
  ON public.plantillas_documentos FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS plantillas_documentos_super_admin_write ON public.plantillas_documentos;
CREATE POLICY plantillas_documentos_super_admin_write
  ON public.plantillas_documentos FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.plantillas_documentos_touch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plantillas_documentos_touch_trg ON public.plantillas_documentos;
CREATE TRIGGER plantillas_documentos_touch_trg
  BEFORE INSERT OR UPDATE ON public.plantillas_documentos
  FOR EACH ROW EXECUTE FUNCTION public.plantillas_documentos_touch();

-- Permitir a super_admins subir/actualizar/borrar archivos en bucket 'plantillas'
DROP POLICY IF EXISTS plantillas_super_admin_all ON storage.objects;
CREATE POLICY plantillas_super_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'plantillas' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'plantillas' AND public.is_super_admin());

-- Seed con los documentos actuales
INSERT INTO public.plantillas_documentos (key, titulo, descripcion, emoji, path, orden) VALUES
  ('permiso_menor', 'Permiso del Menor', 'PDF para imprimir, completar y firmar por padre/madre/tutor del menor.', '📝', 'Permiso de menor MFS 2026.pdf', 10),
  ('protocolo', 'Protocolo de Prevención', 'Protocolo de prevención del MFS para leer.', '🛡️', 'protocolo_prevencion.pdf', 20),
  ('aceptacion_protocolo', 'Aceptación de Protocolo', 'PDF de aceptación del protocolo de prevención (adultos).', '✅', 'aceptacion_protocolo_prevencion.pdf', 30),
  ('estatutos', 'Estatutos de las MFS', 'Estatutos del Movimiento Familiar de Schoenstatt.', '📜', 'estatutos_mfs.pdf', 40)
ON CONFLICT (key) DO NOTHING;
