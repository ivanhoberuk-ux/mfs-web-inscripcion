CREATE OR REPLACE FUNCTION public.torneo_limpiar_horarios(p_edicion_id uuid, p_incluir_finalizados boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count integer;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  UPDATE torneo_partidos SET inicio = NULL, fin = NULL, cancha_id = NULL
  WHERE disciplina_id IN (SELECT id FROM torneo_disciplinas WHERE edicion_id = p_edicion_id)
    AND (p_incluir_finalizados OR estado <> 'finalizado')
    AND (inicio IS NOT NULL OR fin IS NOT NULL OR cancha_id IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'limpiados', v_count);
END;
$fn$;

REVOKE ALL ON FUNCTION public.torneo_limpiar_horarios(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.torneo_limpiar_horarios(uuid, boolean) TO authenticated;