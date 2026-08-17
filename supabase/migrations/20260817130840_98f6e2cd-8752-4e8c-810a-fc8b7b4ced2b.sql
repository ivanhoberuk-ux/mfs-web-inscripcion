CREATE OR REPLACE FUNCTION public.is_operador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'operador'
  );
$$;

DROP POLICY IF EXISTS torneo_partidos_operador_update ON public.torneo_partidos;
CREATE POLICY torneo_partidos_operador_update
ON public.torneo_partidos
FOR UPDATE
TO authenticated
USING (public.is_operador())
WITH CHECK (public.is_operador());

DROP POLICY IF EXISTS torneo_eventos_operador_write ON public.torneo_eventos;
CREATE POLICY torneo_eventos_operador_write
ON public.torneo_eventos
FOR ALL
TO authenticated
USING (public.is_operador())
WITH CHECK (public.is_operador());