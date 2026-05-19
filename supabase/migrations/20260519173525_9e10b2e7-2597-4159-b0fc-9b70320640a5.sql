-- 1. Add expiry timestamp for waitlist per year
ALTER TABLE public.configuracion_inscripcion
  ADD COLUMN IF NOT EXISTS lista_espera_vence_at timestamptz;

-- 2. Function: marks all expired waitlist registros as cancelled.
--    Returns the affected rows so the edge function can notify them.
CREATE OR REPLACE FUNCTION public.vencer_listas_espera()
RETURNS TABLE(
  id uuid,
  email text,
  nombres text,
  apellidos text,
  pueblo_id uuid,
  pueblo_nombre text,
  año integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg record;
BEGIN
  -- Only super_admin can trigger this manually; edge function uses service role.
  -- Process every año with a deadline that has passed.
  FOR v_cfg IN
    SELECT ci.año, ci.lista_espera_vence_at
    FROM public.configuracion_inscripcion ci
    WHERE ci.lista_espera_vence_at IS NOT NULL
      AND ci.lista_espera_vence_at < now()
  LOOP
    RETURN QUERY
    WITH cancelados AS (
      UPDATE public.registros r
      SET estado = 'cancelado',
          deleted_at = now()
      WHERE r.año = v_cfg.año
        AND r.estado = 'lista_espera'
        AND r.deleted_at IS NULL
      RETURNING r.id, r.email, r.nombres, r.apellidos, r.pueblo_id, r.año
    )
    SELECT c.id, c.email, c.nombres, c.apellidos, c.pueblo_id,
           p.nombre AS pueblo_nombre, c.año
    FROM cancelados c
    JOIN public.pueblos p ON p.id = c.pueblo_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vencer_listas_espera() TO service_role;