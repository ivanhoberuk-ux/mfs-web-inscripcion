-- 1. Añadir columna año a registros para gestión año tras año
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS año integer NOT NULL DEFAULT 2025;

-- Índice para mejorar consultas por año
CREATE INDEX IF NOT EXISTS idx_registros_año ON public.registros(año);

-- 2. Recrear la vista vw_ocupacion como SECURITY DEFINER para que sea accesible públicamente
DROP VIEW IF EXISTS public.vw_ocupacion CASCADE;

CREATE VIEW public.vw_ocupacion
WITH (security_invoker=false)
AS
SELECT
  p.id,
  p.nombre,
  p.cupo_max,
  p.activo,
  COALESCE(COUNT(r.id) FILTER (WHERE r.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer), 0)::bigint AS usados,
  GREATEST(0, p.cupo_max - COALESCE(COUNT(r.id) FILTER (WHERE r.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer), 0))::bigint AS libres
FROM public.pueblos p
LEFT JOIN public.registros r ON r.pueblo_id = p.id AND r.deleted_at IS NULL
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;

-- Dar permisos de lectura a todos
GRANT SELECT ON public.vw_ocupacion TO anon, authenticated;

-- 3. Actualizar el nombre del pueblo de "Mbocajaty" a "Mbocayaty"
UPDATE public.pueblos SET nombre = 'Mbocayaty' WHERE nombre = 'Mbocajaty';