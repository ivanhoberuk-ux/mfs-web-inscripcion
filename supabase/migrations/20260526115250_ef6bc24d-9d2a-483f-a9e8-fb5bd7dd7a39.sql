
-- 1) Restrict misioneros_extra SELECT to authenticated users only (avoid anon exposure when pueblo_id is NULL)
DROP POLICY IF EXISTS "pueblo_users_can_view_own_misioneros" ON public.misioneros_extra;
CREATE POLICY "pueblo_users_can_view_own_misioneros"
ON public.misioneros_extra
FOR SELECT
TO authenticated
USING (pueblo_id IS NOT NULL AND pueblo_id = get_user_pueblo_id());

-- 2) Harden registros_read_own_by_email to require a confirmed email on the auth.users record
DROP POLICY IF EXISTS "registros_read_own_by_email" ON public.registros;
CREATE POLICY "registros_read_own_by_email"
ON public.registros
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
  )
);

-- 3) Add storage write policies for the public 'logos' bucket: only super_admin can write
DROP POLICY IF EXISTS "logos_super_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "logos_super_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_super_admin_delete" ON storage.objects;

CREATE POLICY "logos_super_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.is_super_admin());

CREATE POLICY "logos_super_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos' AND public.is_super_admin())
WITH CHECK (bucket_id = 'logos' AND public.is_super_admin());

CREATE POLICY "logos_super_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND public.is_super_admin());
