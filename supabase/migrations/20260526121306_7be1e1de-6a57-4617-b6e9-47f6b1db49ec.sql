
-- Función security definer para chequear si el email del usuario está confirmado
CREATE OR REPLACE FUNCTION public.current_user_email_confirmed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email::text) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
$$;

-- Reemplazar política rota que referenciaba auth.users directamente
DROP POLICY IF EXISTS registros_read_own_by_email ON public.registros;

CREATE POLICY registros_read_own_by_email
ON public.registros
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  AND public.current_user_email_confirmed()
);
