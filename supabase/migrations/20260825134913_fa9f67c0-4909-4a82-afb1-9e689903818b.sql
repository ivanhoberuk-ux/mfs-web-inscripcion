-- 1) Columna modo
ALTER TABLE public.configuracion_inscripcion
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'mision';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracion_inscripcion_modo_check'
  ) THEN
    ALTER TABLE public.configuracion_inscripcion
      ADD CONSTRAINT configuracion_inscripcion_modo_check
      CHECK (modo IN ('mision','institucional'));
  END IF;
END $$;

-- 2) estado_inscripcion devuelve 'institucional' si la temporada fue cerrada
CREATE OR REPLACE FUNCTION public.estado_inscripcion("p_año" integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg public.configuracion_inscripcion%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_cfg FROM public.configuracion_inscripcion WHERE año = p_año;
  IF NOT FOUND THEN RETURN 'sin_config'; END IF;
  IF v_cfg.modo = 'institucional' THEN RETURN 'institucional'; END IF;
  IF v_now < v_cfg.apertura_anticipada THEN RETURN 'cerrado_antes'; END IF;
  IF v_now < v_cfg.apertura_general THEN RETURN 'fase_anticipada'; END IF;
  IF v_now < v_cfg.cierre THEN RETURN 'fase_general'; END IF;
  RETURN 'cerrado_despues';
END;
$function$;

-- 3) Año activo dinámico como default de registros.año
CREATE OR REPLACE FUNCTION public.anio_activo()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT año FROM public.configuracion_inscripcion WHERE activo = true ORDER BY año DESC LIMIT 1),
    EXTRACT(YEAR FROM now())::int
  );
$function$;

GRANT EXECUTE ON FUNCTION public.anio_activo() TO anon, authenticated, service_role;

ALTER TABLE public.registros ALTER COLUMN año SET DEFAULT public.anio_activo();

-- 4) Cerrar temporada (pasar a institucional) / reabrir
CREATE OR REPLACE FUNCTION public.set_modo_temporada("p_año" integer, p_modo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo un super administrador puede cambiar el modo de la temporada';
  END IF;
  IF p_modo NOT IN ('mision','institucional') THEN
    RAISE EXCEPTION 'Modo inválido';
  END IF;
  UPDATE public.configuracion_inscripcion SET modo = p_modo, updated_at = now() WHERE año = p_año;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe configuración para el año %', p_año;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_modo_temporada(integer, text) TO authenticated;

-- 5) Abrir un nuevo año de inscripciones
CREATE OR REPLACE FUNCTION public.abrir_anio(
  "p_año" integer,
  p_apertura_anticipada timestamptz,
  p_apertura_general timestamptz,
  p_cierre timestamptz,
  p_lista_espera_vence_at timestamptz DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo un super administrador puede abrir un nuevo año';
  END IF;
  IF p_apertura_general < p_apertura_anticipada OR p_cierre <= p_apertura_general THEN
    RAISE EXCEPTION 'Las fechas deben ser: anticipada <= general < cierre';
  END IF;

  INSERT INTO public.configuracion_inscripcion(
    año, apertura_anticipada, apertura_general, cierre, lista_espera_vence_at, activo, modo
  ) VALUES (
    p_año, p_apertura_anticipada, p_apertura_general, p_cierre, p_lista_espera_vence_at, true, 'mision'
  )
  ON CONFLICT (año) DO UPDATE SET
    apertura_anticipada = EXCLUDED.apertura_anticipada,
    apertura_general = EXCLUDED.apertura_general,
    cierre = EXCLUDED.cierre,
    lista_espera_vence_at = EXCLUDED.lista_espera_vence_at,
    activo = true,
    modo = 'mision',
    updated_at = now();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.abrir_anio(integer, timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated;