ALTER TABLE public.torneo_disciplinas
  ADD COLUMN IF NOT EXISTS tiempo_min integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS entretiempo_min integer NOT NULL DEFAULT 5;

-- inicializar en base a la duración actual (2 tiempos + entretiempo)
UPDATE public.torneo_disciplinas
SET tiempo_min = GREATEST(5, ((duracion_min - 5) / 2)),
    entretiempo_min = 5
WHERE duracion_min IS NOT NULL;

-- mantener duracion_min sincronizada
CREATE OR REPLACE FUNCTION public.torneo_sync_duracion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.duracion_min := COALESCE(NEW.tiempo_min,0) * 2 + COALESCE(NEW.entretiempo_min,0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_torneo_sync_duracion ON public.torneo_disciplinas;
CREATE TRIGGER trg_torneo_sync_duracion
BEFORE INSERT OR UPDATE OF tiempo_min, entretiempo_min ON public.torneo_disciplinas
FOR EACH ROW EXECUTE FUNCTION public.torneo_sync_duracion();

UPDATE public.torneo_disciplinas SET tiempo_min = tiempo_min;

-- Reprogramación por atrasos: corre el partido y todos los posteriores de la misma cancha
CREATE OR REPLACE FUNCTION public.torneo_correr_horarios(
  p_partido_id uuid,
  p_minutos integer,
  p_solo_cancha boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_disciplina uuid;
  v_cancha uuid;
  v_inicio timestamptz;
  v_afectados integer := 0;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_pueblo_admin(auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT disciplina_id, cancha_id, inicio INTO v_disciplina, v_cancha, v_inicio
  FROM public.torneo_partidos WHERE id = p_partido_id;

  IF v_inicio IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'El partido no tiene horario asignado');
  END IF;

  UPDATE public.torneo_partidos
  SET inicio = inicio + make_interval(mins => p_minutos),
      fin = CASE WHEN fin IS NULL THEN NULL ELSE fin + make_interval(mins => p_minutos) END
  WHERE inicio IS NOT NULL
    AND inicio >= v_inicio
    AND estado <> 'finalizado'
    AND (
      (p_solo_cancha AND cancha_id IS NOT DISTINCT FROM v_cancha)
      OR (NOT p_solo_cancha AND disciplina_id = v_disciplina)
    );

  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'afectados', v_afectados);
END;
$$;

GRANT EXECUTE ON FUNCTION public.torneo_correr_horarios(uuid, integer, boolean) TO authenticated;