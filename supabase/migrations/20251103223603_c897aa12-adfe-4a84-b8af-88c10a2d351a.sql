-- Remove duplicate INSERT policy on registros table
-- The registros_write_admin_tbl policy is redundant with registros_insert_restricted
DROP POLICY IF EXISTS registros_write_admin_tbl ON public.registros;

-- For the registros_publicos view, drop and recreate with security_barrier
-- This ensures RLS policies on the underlying registros table are respected
DROP VIEW IF EXISTS public.registros_publicos;

CREATE VIEW public.registros_publicos 
WITH (security_barrier = true)
AS
SELECT 
  id,
  nombres,
  apellidos,
  ci,
  pueblo_id,
  created_at
FROM public.registros
WHERE 
  -- Only admins and pueblo admins can see this data
  public.is_super_admin() 
  OR 
  (public.is_pueblo_admin() AND pueblo_id = public.get_user_pueblo_id());

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.registros_publicos IS 'Limited view of registration data for administrative purposes. Contains only basic info: names, CI, pueblo_id. Access restricted via security_barrier and WHERE clause.';
