-- 1. Fix is_admin() to use user_roles table instead of JWT app_metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- 2. Restrict registros admin policies to authenticated role only
DROP POLICY IF EXISTS registros_admin_read ON public.registros;
DROP POLICY IF EXISTS registros_admin_update ON public.registros;

CREATE POLICY registros_admin_read ON public.registros
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY registros_admin_update ON public.registros
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. Restrict email_reminder_logs policies to authenticated role only
DROP POLICY IF EXISTS admin_all_email_logs ON public.email_reminder_logs;
DROP POLICY IF EXISTS pueblo_admin_read_own_logs ON public.email_reminder_logs;

CREATE POLICY admin_all_email_logs ON public.email_reminder_logs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY pueblo_admin_read_own_logs ON public.email_reminder_logs
  FOR SELECT
  TO authenticated
  USING (is_pueblo_admin() AND (pueblo_id = get_user_pueblo_id()));

-- 4. Fix privilege escalation in user_roles - prevent pueblo_admin from
-- assigning roles to themselves and restrict to INSERT/DELETE only (not UPDATE
-- to change their own role)
DROP POLICY IF EXISTS pueblo_admin_manage_co_admins ON public.user_roles;

CREATE POLICY pueblo_admin_insert_co_admins ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_pueblo_admin()
    AND role = 'co_admin_pueblo'
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles p1
      JOIN profiles p2 ON p1.pueblo_id = p2.pueblo_id
      WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
    )
  );

CREATE POLICY pueblo_admin_delete_co_admins ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    is_pueblo_admin()
    AND role = 'co_admin_pueblo'
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles p1
      JOIN profiles p2 ON p1.pueblo_id = p2.pueblo_id
      WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
    )
  );

CREATE POLICY pueblo_admin_select_co_admins ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    is_pueblo_admin()
    AND role = 'co_admin_pueblo'
    AND EXISTS (
      SELECT 1
      FROM profiles p1
      JOIN profiles p2 ON p1.pueblo_id = p2.pueblo_id
      WHERE p1.id = auth.uid() AND p2.id = user_roles.user_id
    )
  );

-- 5. Restrict storage policies on documentos bucket to authenticated only
-- Drop any existing policies on storage.objects for documentos bucket that
-- target public role and recreate them for authenticated role
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'Usuarios pueden subir documentos según permisos',
        'Usuarios pueden actualizar documentos según permisos',
        'Usuarios pueden eliminar documentos según permisos',
        'Usuarios pueden ver documentos según permisos'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Usuarios pueden ver documentos según permisos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos' AND can_access_documento(name));

CREATE POLICY "Usuarios pueden subir documentos según permisos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND can_access_documento(name));

CREATE POLICY "Usuarios pueden actualizar documentos según permisos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos' AND can_access_documento(name))
  WITH CHECK (bucket_id = 'documentos' AND can_access_documento(name));

CREATE POLICY "Usuarios pueden eliminar documentos según permisos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos' AND can_access_documento(name));