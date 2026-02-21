
-- Actualizar default de año a 2026
ALTER TABLE public.registros ALTER COLUMN año SET DEFAULT 2026;

-- Recrear vw_ocupacion para incluir filtro de estado confirmado
CREATE OR REPLACE VIEW public.vw_ocupacion AS
SELECT 
  p.id,
  p.nombre,
  p.cupo_max,
  p.activo,
  COALESCE(count(r.id) FILTER (WHERE r.año = (EXTRACT(year FROM CURRENT_DATE))::integer AND r.estado = 'confirmado'), 0::bigint) AS usados,
  GREATEST(0::bigint, p.cupo_max - COALESCE(count(r.id) FILTER (WHERE r.año = (EXTRACT(year FROM CURRENT_DATE))::integer AND r.estado = 'confirmado'), 0::bigint)) AS libres
FROM pueblos p
LEFT JOIN registros r ON r.pueblo_id = p.id AND r.deleted_at IS NULL
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;

-- Recrear vw_ocupacion_completa igual
CREATE OR REPLACE VIEW public.vw_ocupacion_completa AS
SELECT 
  p.id,
  p.nombre,
  p.cupo_max,
  p.activo,
  COALESCE(count(*) FILTER (WHERE r.estado = 'confirmado' AND r.deleted_at IS NULL), 0::bigint)::integer AS confirmados,
  COALESCE(count(*) FILTER (WHERE r.estado = 'lista_espera' AND r.deleted_at IS NULL), 0::bigint)::integer AS en_espera,
  (p.cupo_max - COALESCE(count(*) FILTER (WHERE r.estado = 'confirmado' AND r.deleted_at IS NULL), 0::bigint))::integer AS libres
FROM pueblos p
LEFT JOIN registros r ON r.pueblo_id = p.id AND r.año = (EXTRACT(year FROM CURRENT_DATE))::integer
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;
