CREATE OR REPLACE FUNCTION public.torneo_programar(p_edicion_id uuid, p_reprogramar_todo boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_p record;
  v_bloque record;
  v_dur interval;
  v_cand timestamptz;
  v_end timestamptz;
  v_min_start timestamptz;
  v_cancha uuid;
  v_pa uuid; v_pb uuid;
  v_ok boolean;
  v_prog integer := 0;
  v_sin integer := 0;
  v_step interval := interval '5 minutes';
  v_pendientes jsonb := '[]'::jsonb;
  v_resumen jsonb;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  -- Las disciplinas desactivadas no deben ocupar canchas ni bloquear pueblos
  UPDATE torneo_partidos SET inicio = NULL, fin = NULL, cancha_id = NULL
  WHERE disciplina_id IN (SELECT id FROM torneo_disciplinas WHERE edicion_id = p_edicion_id AND NOT activa)
    AND estado <> 'finalizado';

  IF p_reprogramar_todo THEN
    UPDATE torneo_partidos SET inicio = NULL, fin = NULL, cancha_id = NULL
    WHERE disciplina_id IN (SELECT id FROM torneo_disciplinas WHERE edicion_id = p_edicion_id AND activa)
      AND estado <> 'finalizado';
  END IF;

  FOR v_p IN
    SELECT tp.*, td.duracion_min, td.buffer_min, td.orden AS d_orden, td.nombre AS d_nombre, td.emoji AS d_emoji
    FROM torneo_partidos tp
    JOIN torneo_disciplinas td ON td.id = tp.disciplina_id
    WHERE td.edicion_id = p_edicion_id AND td.activa AND tp.inicio IS NULL
    ORDER BY tp.fase_orden, tp.ronda, td.orden, tp.created_at
  LOOP
    v_dur := make_interval(mins => v_p.duracion_min + v_p.buffer_min);

    SELECT max(fin) INTO v_min_start FROM torneo_partidos
      WHERE disciplina_id = v_p.disciplina_id AND fase_orden < v_p.fase_orden AND fin IS NOT NULL;

    SELECT pueblo_id INTO v_pa FROM torneo_equipos WHERE id = v_p.equipo_a_id;
    SELECT pueblo_id INTO v_pb FROM torneo_equipos WHERE id = v_p.equipo_b_id;

    v_ok := false;

    FOR v_bloque IN SELECT * FROM torneo_bloques WHERE edicion_id = p_edicion_id ORDER BY fecha, hora_inicio LOOP
      v_cand := (v_bloque.fecha + v_bloque.hora_inicio) AT TIME ZONE 'America/Asuncion';
      WHILE (v_cand + v_dur) <= ((v_bloque.fecha + v_bloque.hora_fin) AT TIME ZONE 'America/Asuncion') LOOP
        v_end := v_cand + v_dur;

        IF v_min_start IS NOT NULL AND v_cand < v_min_start THEN
          v_cand := v_cand + v_step; CONTINUE;
        END IF;

        SELECT c.id INTO v_cancha FROM torneo_canchas c
        WHERE c.disciplina_id = v_p.disciplina_id
          AND NOT EXISTS (
            SELECT 1 FROM torneo_partidos o
            JOIN torneo_disciplinas od ON od.id = o.disciplina_id AND od.activa
            WHERE o.cancha_id = c.id AND o.inicio IS NOT NULL
              AND o.inicio < v_end AND o.fin > v_cand
          )
        ORDER BY c.orden, c.nombre LIMIT 1;

        IF v_cancha IS NULL THEN v_cand := v_cand + v_step; CONTINUE; END IF;

        IF EXISTS (
          SELECT 1 FROM torneo_partidos o
          JOIN torneo_disciplinas od ON od.id = o.disciplina_id AND od.activa
          LEFT JOIN torneo_equipos ea ON ea.id = o.equipo_a_id
          LEFT JOIN torneo_equipos eb ON eb.id = o.equipo_b_id
          WHERE o.inicio IS NOT NULL AND o.inicio < v_end AND o.fin > v_cand
            AND (
              (v_pa IS NOT NULL AND (ea.pueblo_id = v_pa OR eb.pueblo_id = v_pa)) OR
              (v_pb IS NOT NULL AND (ea.pueblo_id = v_pb OR eb.pueblo_id = v_pb))
            )
        ) THEN v_cand := v_cand + v_step; CONTINUE; END IF;

        UPDATE torneo_partidos SET inicio = v_cand, fin = v_end, cancha_id = v_cancha WHERE id = v_p.id;
        v_ok := true;
        v_prog := v_prog + 1;
        EXIT;
      END LOOP;
      EXIT WHEN v_ok;
    END LOOP;

    IF NOT v_ok THEN
      v_sin := v_sin + 1;
      v_pendientes := v_pendientes || jsonb_build_object(
        'partido_id', v_p.id,
        'disciplina', coalesce(v_p.d_emoji,'') || ' ' || v_p.d_nombre,
        'fase', v_p.fase,
        'zona', v_p.zona,
        'ronda', v_p.ronda,
        'equipo_a', coalesce((SELECT coalesce(e.nombre, pu.nombre) FROM torneo_equipos e LEFT JOIN pueblos pu ON pu.id = e.pueblo_id WHERE e.id = v_p.equipo_a_id), v_p.etiqueta_a, 'Por definir'),
        'equipo_b', coalesce((SELECT coalesce(e.nombre, pu.nombre) FROM torneo_equipos e LEFT JOIN pueblos pu ON pu.id = e.pueblo_id WHERE e.id = v_p.equipo_b_id), v_p.etiqueta_b, 'Por definir'),
        'minutos_necesarios', v_p.duracion_min + v_p.buffer_min
      );
    END IF;
  END LOOP;

  SELECT jsonb_agg(x) INTO v_resumen FROM (
    SELECT jsonb_build_object(
      'disciplina', coalesce(td.emoji,'') || ' ' || td.nombre,
      'sin_horario', count(*) FILTER (WHERE tp.inicio IS NULL),
      'programados', count(*) FILTER (WHERE tp.inicio IS NOT NULL),
      'minutos_por_partido', td.duracion_min + td.buffer_min,
      'canchas', (SELECT count(*) FROM torneo_canchas c WHERE c.disciplina_id = td.id),
      'minutos_disponibles', (SELECT count(*) FROM torneo_canchas c WHERE c.disciplina_id = td.id) *
        coalesce((SELECT sum(extract(epoch FROM (b.hora_fin - b.hora_inicio))/60) FROM torneo_bloques b WHERE b.edicion_id = p_edicion_id), 0)
    ) AS x
    FROM torneo_disciplinas td
    JOIN torneo_partidos tp ON tp.disciplina_id = td.id
    WHERE td.edicion_id = p_edicion_id AND td.activa
    GROUP BY td.id, td.emoji, td.nombre, td.duracion_min, td.buffer_min
    ORDER BY td.orden
  ) s;

  RETURN jsonb_build_object(
    'ok', true,
    'programados', v_prog,
    'sin_horario', v_sin,
    'pendientes', v_pendientes,
    'resumen', coalesce(v_resumen, '[]'::jsonb)
  );
END;
$fn$;