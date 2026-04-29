-- Limpiar base de datos manteniendo solo pueblos y el super admin ivanhoberuk@gmail.com

DO $$
DECLARE
  v_keep_user_id uuid;
BEGIN
  SELECT id INTO v_keep_user_id FROM auth.users WHERE email = 'ivanhoberuk@gmail.com' LIMIT 1;

  IF v_keep_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario ivanhoberuk@gmail.com';
  END IF;

  -- Borrar datos transaccionales
  DELETE FROM public.asistencias;
  DELETE FROM public.reuniones;
  DELETE FROM public.email_reminder_logs;
  DELETE FROM public.registros;
  DELETE FROM public.misioneros_extra;
  DELETE FROM public.configuracion_puntajes;
  DELETE FROM public.configuracion_inscripcion;

  -- Limpieza de tablas auxiliares de RAG/docs si existen
  DELETE FROM public.documents;
  DELETE FROM public.document_rows;
  DELETE FROM public.document_metadata;
  DELETE FROM public.indexed_files;

  -- Borrar roles de otros usuarios (mantener solo el super admin)
  DELETE FROM public.user_roles WHERE user_id <> v_keep_user_id;
  -- Asegurar que el usuario principal tenga rol admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_keep_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Borrar admins legacy distintos
  DELETE FROM public.admins WHERE user_id <> v_keep_user_id;

  -- Borrar profiles de otros usuarios
  DELETE FROM public.profiles WHERE id <> v_keep_user_id;

  -- Borrar usuarios de auth distintos al principal
  DELETE FROM auth.users WHERE id <> v_keep_user_id;
END $$;