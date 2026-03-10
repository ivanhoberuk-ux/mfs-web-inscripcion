CREATE OR REPLACE VIEW public.vw_ocupacion AS
SELECT
  p.id,
  p.nombre,
  p.cupo_max,
  COALESCE(cnt.usados, 0)::int AS usados,
  GREATEST(p.cupo_max - COALESCE(cnt.usados, 0), 0)::int AS libres,
  p.activo
FROM public.pueblos p
LEFT JOIN (
  SELECT pueblo_id, COUNT(*)::int AS usados
  FROM public.registros
  WHERE deleted_at IS NULL
    AND estado = 'confirmado'
    AND año = EXTRACT(YEAR FROM CURRENT_DATE)::int
  GROUP BY pueblo_id
) cnt ON cnt.pueblo_id = p.id
ORDER BY p.nombre;