CREATE OR REPLACE FUNCTION public.torneo_suspender_desde(p_edicion_id uuid, p_desde timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  UPDATE torneo_partidos
     SET inicio = NULL, fin = NULL, cancha_id = NULL,
         estado = CASE WHEN estado = 'en_juego' THEN 'programado' ELSE estado END
   WHERE disciplina_id IN (SELECT id FROM torneo_disciplinas WHERE edicion_id = p_edicion_id)
     AND estado <> 'finalizado'
     AND inicio IS NOT NULL
     AND inicio >= p_desde;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'suspendidos', v_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.torneo_suspender_desde(uuid, timestamptz) TO authenticated;