CREATE OR REPLACE VIEW public.vw_ocupacion AS
SELECT p.id,
    p.nombre,
    p.cupo_max,
    p.activo,
    COALESCE(sum(CASE WHEN r.estado = 'confirmado'::estado_registro AND r.deleted_at IS NULL AND ocupa_cupo(r.rol, r.nacimiento, r."año") = true THEN 1 ELSE 0 END), 0)::integer AS usados,
    COALESCE(sum(CASE WHEN r.estado = 'confirmado'::estado_registro AND r.deleted_at IS NULL AND ocupa_cupo(r.rol, r.nacimiento, r."año") = false THEN 1 ELSE 0 END), 0)::integer AS menores,
    COALESCE(sum(CASE WHEN r.estado = 'confirmado'::estado_registro AND r.deleted_at IS NULL THEN 1 ELSE 0 END), 0)::integer AS total_personas,
    GREATEST(p.cupo_max - COALESCE(sum(CASE WHEN r.estado = 'confirmado'::estado_registro AND r.deleted_at IS NULL AND ocupa_cupo(r.rol, r.nacimiento, r."año") = true THEN 1 ELSE 0 END), 0)::integer, 0) AS libres,
    COALESCE(sum(CASE WHEN r.estado = 'lista_espera'::estado_registro AND r.deleted_at IS NULL THEN 1 ELSE 0 END), 0)::integer AS en_espera
FROM pueblos p
LEFT JOIN registros r ON r.pueblo_id = p.id AND r."año" = EXTRACT(year FROM CURRENT_DATE)::integer
GROUP BY p.id, p.nombre, p.cupo_max, p.activo;