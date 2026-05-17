DROP POLICY IF EXISTS registros_delete_admin_tbl ON public.registros;

CREATE POLICY registros_delete_admin_tbl ON public.registros
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR (is_pueblo_admin() AND pueblo_id = get_user_pueblo_id())
  );