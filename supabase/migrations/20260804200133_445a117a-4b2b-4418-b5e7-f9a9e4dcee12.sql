-- ============ TORNEO INTERPUEBLOS ============

CREATE TABLE public.torneo_ediciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  anio integer NOT NULL DEFAULT 2026,
  activo boolean NOT NULL DEFAULT true,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.torneo_ediciones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_ediciones TO authenticated;
GRANT ALL ON public.torneo_ediciones TO service_role;
ALTER TABLE public.torneo_ediciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_ediciones_read ON public.torneo_ediciones FOR SELECT USING (true);
CREATE POLICY torneo_ediciones_write ON public.torneo_ediciones FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_disciplinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicion_id uuid NOT NULL REFERENCES public.torneo_ediciones(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL,
  emoji text NOT NULL DEFAULT '🏆',
  activa boolean NOT NULL DEFAULT false,
  cantidad_canchas integer NOT NULL DEFAULT 1,
  duracion_min integer NOT NULL DEFAULT 35,
  buffer_min integer NOT NULL DEFAULT 10,
  num_zonas integer NOT NULL DEFAULT 2,
  clasifican_por_zona integer NOT NULL DEFAULT 2,
  usa_sets boolean NOT NULL DEFAULT false,
  permite_empate boolean NOT NULL DEFAULT true,
  puntos_victoria integer NOT NULL DEFAULT 3,
  puntos_empate integer NOT NULL DEFAULT 1,
  puntos_derrota integer NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicion_id, codigo)
);
GRANT SELECT ON public.torneo_disciplinas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_disciplinas TO authenticated;
GRANT ALL ON public.torneo_disciplinas TO service_role;
ALTER TABLE public.torneo_disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_disciplinas_read ON public.torneo_disciplinas FOR SELECT USING (true);
CREATE POLICY torneo_disciplinas_write ON public.torneo_disciplinas FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_canchas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id uuid NOT NULL REFERENCES public.torneo_disciplinas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.torneo_canchas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_canchas TO authenticated;
GRANT ALL ON public.torneo_canchas TO service_role;
ALTER TABLE public.torneo_canchas ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_canchas_read ON public.torneo_canchas FOR SELECT USING (true);
CREATE POLICY torneo_canchas_write ON public.torneo_canchas FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_bloques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicion_id uuid NOT NULL REFERENCES public.torneo_ediciones(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  etiqueta text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.torneo_bloques TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_bloques TO authenticated;
GRANT ALL ON public.torneo_bloques TO service_role;
ALTER TABLE public.torneo_bloques ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_bloques_read ON public.torneo_bloques FOR SELECT USING (true);
CREATE POLICY torneo_bloques_write ON public.torneo_bloques FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id uuid NOT NULL REFERENCES public.torneo_disciplinas(id) ON DELETE CASCADE,
  pueblo_id uuid NOT NULL REFERENCES public.pueblos(id) ON DELETE CASCADE,
  nombre text,
  zona text,
  delegado_nombre text,
  delegado_telefono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disciplina_id, pueblo_id)
);
GRANT SELECT ON public.torneo_equipos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_equipos TO authenticated;
GRANT ALL ON public.torneo_equipos TO service_role;
ALTER TABLE public.torneo_equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_equipos_read ON public.torneo_equipos FOR SELECT USING (true);
CREATE POLICY torneo_equipos_write ON public.torneo_equipos FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_partidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id uuid NOT NULL REFERENCES public.torneo_disciplinas(id) ON DELETE CASCADE,
  fase text NOT NULL DEFAULT 'grupos',
  fase_orden integer NOT NULL DEFAULT 1,
  zona text,
  ronda integer NOT NULL DEFAULT 1,
  equipo_a_id uuid REFERENCES public.torneo_equipos(id) ON DELETE SET NULL,
  equipo_b_id uuid REFERENCES public.torneo_equipos(id) ON DELETE SET NULL,
  etiqueta_a text,
  etiqueta_b text,
  cancha_id uuid REFERENCES public.torneo_canchas(id) ON DELETE SET NULL,
  inicio timestamptz,
  fin timestamptz,
  estado text NOT NULL DEFAULT 'programado',
  marcador_a integer,
  marcador_b integer,
  detalle_sets text,
  mvp_nombre text,
  mvp_equipo_id uuid REFERENCES public.torneo_equipos(id) ON DELETE SET NULL,
  observaciones text,
  avanza_ganador_partido_id uuid REFERENCES public.torneo_partidos(id) ON DELETE SET NULL,
  avanza_ganador_slot text,
  avanza_perdedor_partido_id uuid REFERENCES public.torneo_partidos(id) ON DELETE SET NULL,
  avanza_perdedor_slot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX torneo_partidos_disciplina_idx ON public.torneo_partidos(disciplina_id);
CREATE INDEX torneo_partidos_inicio_idx ON public.torneo_partidos(inicio);
GRANT SELECT ON public.torneo_partidos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_partidos TO authenticated;
GRANT ALL ON public.torneo_partidos TO service_role;
ALTER TABLE public.torneo_partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_partidos_read ON public.torneo_partidos FOR SELECT USING (true);
CREATE POLICY torneo_partidos_write ON public.torneo_partidos FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE public.torneo_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL REFERENCES public.torneo_partidos(id) ON DELETE CASCADE,
  equipo_id uuid NOT NULL REFERENCES public.torneo_equipos(id) ON DELETE CASCADE,
  jugador text NOT NULL,
  tipo text NOT NULL DEFAULT 'gol',
  cantidad integer NOT NULL DEFAULT 1,
  minuto integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.torneo_eventos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneo_eventos TO authenticated;
GRANT ALL ON public.torneo_eventos TO service_role;
ALTER TABLE public.torneo_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY torneo_eventos_read ON public.torneo_eventos FOR SELECT USING (true);
CREATE POLICY torneo_eventos_write ON public.torneo_eventos FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.torneo_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_torneo_ediciones_touch BEFORE UPDATE ON public.torneo_ediciones FOR EACH ROW EXECUTE FUNCTION public.torneo_touch();
CREATE TRIGGER t_torneo_disciplinas_touch BEFORE UPDATE ON public.torneo_disciplinas FOR EACH ROW EXECUTE FUNCTION public.torneo_touch();
CREATE TRIGGER t_torneo_equipos_touch BEFORE UPDATE ON public.torneo_equipos FOR EACH ROW EXECUTE FUNCTION public.torneo_touch();
CREATE TRIGGER t_torneo_partidos_touch BEFORE UPDATE ON public.torneo_partidos FOR EACH ROW EXECUTE FUNCTION public.torneo_touch();

-- ============ SORTEO DE ZONAS ============
CREATE OR REPLACE FUNCTION public.torneo_sortear_zonas(p_disciplina_id uuid, p_num_zonas integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n integer;
  v_ids uuid[];
  v_i integer;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;
  SELECT COALESCE(p_num_zonas, num_zonas) INTO v_n FROM torneo_disciplinas WHERE id = p_disciplina_id;
  IF v_n IS NULL OR v_n < 1 THEN v_n := 1; END IF;
  UPDATE torneo_disciplinas SET num_zonas = v_n WHERE id = p_disciplina_id;
  SELECT array_agg(id ORDER BY random()) INTO v_ids FROM torneo_equipos WHERE disciplina_id = p_disciplina_id AND activo;
  IF v_ids IS NULL THEN RETURN jsonb_build_object('ok', false, 'msg', 'No hay equipos'); END IF;
  FOR v_i IN 1..array_length(v_ids,1) LOOP
    UPDATE torneo_equipos SET zona = chr(64 + (((v_i - 1) % v_n) + 1)) WHERE id = v_ids[v_i];
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'equipos', array_length(v_ids,1), 'zonas', v_n);
END; $$;

-- ============ GENERAR FIXTURE ============
CREATE OR REPLACE FUNCTION public.torneo_generar_fixture(p_disciplina_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_zona text;
  v_teams uuid[];
  v_m integer;
  v_r integer;
  v_i integer;
  v_a uuid; v_b uuid;
  v_count integer := 0;
  v_clasif integer;
  v_nzonas integer;
  v_total integer;
  v_final uuid; v_tercero uuid;
  v_sf1 uuid; v_sf2 uuid;
  v_qf uuid[];
  v_labels text[];
  v_k integer;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  DELETE FROM torneo_partidos WHERE disciplina_id = p_disciplina_id;

  SELECT num_zonas, clasifican_por_zona INTO v_nzonas, v_clasif FROM torneo_disciplinas WHERE id = p_disciplina_id;

  -- Fase de grupos (round robin por zona, metodo del circulo)
  FOR v_zona IN SELECT DISTINCT zona FROM torneo_equipos WHERE disciplina_id = p_disciplina_id AND activo AND zona IS NOT NULL ORDER BY 1 LOOP
    SELECT array_agg(id ORDER BY random()) INTO v_teams
      FROM torneo_equipos WHERE disciplina_id = p_disciplina_id AND activo AND zona = v_zona;
    v_m := COALESCE(array_length(v_teams,1), 0);
    IF v_m < 2 THEN CONTINUE; END IF;
    IF v_m % 2 = 1 THEN v_teams := v_teams || NULL::uuid; v_m := v_m + 1; END IF;
    FOR v_r IN 1..(v_m - 1) LOOP
      FOR v_i IN 1..(v_m / 2) LOOP
        v_a := v_teams[v_i];
        v_b := v_teams[v_m + 1 - v_i];
        IF v_a IS NOT NULL AND v_b IS NOT NULL THEN
          INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, zona, ronda, equipo_a_id, equipo_b_id)
          VALUES (p_disciplina_id, 'grupos', 1, v_zona, v_r, v_a, v_b);
          v_count := v_count + 1;
        END IF;
      END LOOP;
      v_teams := ARRAY[v_teams[1]] || ARRAY[v_teams[v_m]] || v_teams[2:v_m-1];
    END LOOP;
  END LOOP;

  -- Playoffs
  SELECT count(DISTINCT zona) INTO v_nzonas FROM torneo_equipos WHERE disciplina_id = p_disciplina_id AND activo AND zona IS NOT NULL;
  v_total := COALESCE(v_nzonas,0) * COALESCE(v_clasif,0);

  IF v_total >= 8 AND v_nzonas >= 4 THEN
    v_total := 8;
  ELSIF v_total >= 4 THEN
    v_total := 4;
  ELSIF v_total >= 2 THEN
    v_total := 2;
  ELSE
    v_total := 0;
  END IF;

  IF v_total >= 2 THEN
    INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, ronda, etiqueta_a, etiqueta_b)
    VALUES (p_disciplina_id, 'final', 9, 1, 'Ganador SF1', 'Ganador SF2') RETURNING id INTO v_final;
    v_count := v_count + 1;
  END IF;

  IF v_total = 2 THEN
    UPDATE torneo_partidos SET etiqueta_a = '1º Zona A', etiqueta_b = CASE WHEN v_nzonas >= 2 THEN '1º Zona B' ELSE '2º Zona A' END WHERE id = v_final;
  END IF;

  IF v_total >= 4 THEN
    INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, ronda, etiqueta_a, etiqueta_b)
    VALUES (p_disciplina_id, 'tercer_puesto', 8, 1, 'Perdedor SF1', 'Perdedor SF2') RETURNING id INTO v_tercero;
    v_count := v_count + 1;

    INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, ronda, etiqueta_a, etiqueta_b,
      avanza_ganador_partido_id, avanza_ganador_slot, avanza_perdedor_partido_id, avanza_perdedor_slot)
    VALUES (p_disciplina_id, 'semifinal', 7, 1, '1º Zona A', '2º Zona B', v_final, 'a', v_tercero, 'a') RETURNING id INTO v_sf1;
    INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, ronda, etiqueta_a, etiqueta_b,
      avanza_ganador_partido_id, avanza_ganador_slot, avanza_perdedor_partido_id, avanza_perdedor_slot)
    VALUES (p_disciplina_id, 'semifinal', 7, 2, '1º Zona B', '2º Zona A', v_final, 'b', v_tercero, 'b') RETURNING id INTO v_sf2;
    v_count := v_count + 2;
  END IF;

  IF v_total = 8 THEN
    v_labels := ARRAY['1º Zona A','2º Zona B','1º Zona C','2º Zona D','1º Zona B','2º Zona A','1º Zona D','2º Zona C'];
    v_qf := ARRAY[]::uuid[];
    FOR v_k IN 1..4 LOOP
      DECLARE v_new uuid; v_dest uuid; v_slot text;
      BEGIN
        v_dest := CASE WHEN v_k <= 2 THEN v_sf1 ELSE v_sf2 END;
        v_slot := CASE WHEN v_k % 2 = 1 THEN 'a' ELSE 'b' END;
        INSERT INTO torneo_partidos(disciplina_id, fase, fase_orden, ronda, etiqueta_a, etiqueta_b, avanza_ganador_partido_id, avanza_ganador_slot)
        VALUES (p_disciplina_id, 'cuartos', 5, v_k, v_labels[(v_k-1)*2+1], v_labels[(v_k-1)*2+2], v_dest, v_slot)
        RETURNING id INTO v_new;
        v_qf := v_qf || v_new;
        v_count := v_count + 1;
      END;
    END LOOP;
    UPDATE torneo_partidos SET etiqueta_a = 'Ganador CF1', etiqueta_b = 'Ganador CF2' WHERE id = v_sf1;
    UPDATE torneo_partidos SET etiqueta_a = 'Ganador CF3', etiqueta_b = 'Ganador CF4' WHERE id = v_sf2;
  END IF;

  RETURN jsonb_build_object('ok', true, 'partidos', v_count);
END; $$;

-- ============ TABLA DE POSICIONES ============
CREATE OR REPLACE FUNCTION public.torneo_tabla(p_disciplina_id uuid)
RETURNS TABLE(
  equipo_id uuid, equipo_nombre text, pueblo_id uuid, zona text,
  pj integer, pg integer, pe integer, pp integer,
  gf integer, gc integer, dif integer, puntos integer, pos integer
) LANGUAGE sql STABLE SET search_path = public AS $$
  WITH d AS (SELECT * FROM torneo_disciplinas WHERE id = p_disciplina_id),
  e AS (
    SELECT t.id, COALESCE(t.nombre, p.nombre) AS nombre, t.pueblo_id, t.zona
    FROM torneo_equipos t JOIN pueblos p ON p.id = t.pueblo_id
    WHERE t.disciplina_id = p_disciplina_id AND t.activo
  ),
  m AS (
    SELECT equipo_a_id AS eq, marcador_a AS gf, marcador_b AS gc FROM torneo_partidos
      WHERE disciplina_id = p_disciplina_id AND fase = 'grupos' AND estado = 'finalizado' AND marcador_a IS NOT NULL AND equipo_a_id IS NOT NULL
    UNION ALL
    SELECT equipo_b_id, marcador_b, marcador_a FROM torneo_partidos
      WHERE disciplina_id = p_disciplina_id AND fase = 'grupos' AND estado = 'finalizado' AND marcador_a IS NOT NULL AND equipo_b_id IS NOT NULL
  ),
  agg AS (
    SELECT e.id, e.nombre, e.pueblo_id, e.zona,
      COUNT(m.eq)::int AS pj,
      COUNT(*) FILTER (WHERE m.gf > m.gc)::int AS pg,
      COUNT(*) FILTER (WHERE m.gf = m.gc)::int AS pe,
      COUNT(*) FILTER (WHERE m.gf < m.gc)::int AS pp,
      COALESCE(SUM(m.gf),0)::int AS gf,
      COALESCE(SUM(m.gc),0)::int AS gc
    FROM e LEFT JOIN m ON m.eq = e.id
    GROUP BY e.id, e.nombre, e.pueblo_id, e.zona
  )
  SELECT a.id, a.nombre, a.pueblo_id, a.zona, a.pj, a.pg, a.pe, a.pp, a.gf, a.gc,
    (a.gf - a.gc)::int AS dif,
    (a.pg * d.puntos_victoria + a.pe * d.puntos_empate + a.pp * d.puntos_derrota)::int AS puntos,
    ROW_NUMBER() OVER (
      PARTITION BY a.zona
      ORDER BY (a.pg * d.puntos_victoria + a.pe * d.puntos_empate + a.pp * d.puntos_derrota) DESC,
               (a.gf - a.gc) DESC, a.gf DESC, a.nombre ASC
    )::int AS pos
  FROM agg a CROSS JOIN d
  ORDER BY a.zona, pos;
$$;

-- ============ GOLEADORES ============
CREATE OR REPLACE FUNCTION public.torneo_goleadores(p_disciplina_id uuid, p_tipo text DEFAULT 'gol')
RETURNS TABLE(jugador text, equipo_id uuid, equipo_nombre text, total integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT ev.jugador, ev.equipo_id, COALESCE(te.nombre, p.nombre) AS equipo_nombre, SUM(ev.cantidad)::int AS total
  FROM torneo_eventos ev
  JOIN torneo_partidos tp ON tp.id = ev.partido_id
  JOIN torneo_equipos te ON te.id = ev.equipo_id
  JOIN pueblos p ON p.id = te.pueblo_id
  WHERE tp.disciplina_id = p_disciplina_id AND ev.tipo = p_tipo
  GROUP BY ev.jugador, ev.equipo_id, COALESCE(te.nombre, p.nombre)
  ORDER BY total DESC, ev.jugador ASC;
$$;

-- ============ RESOLVER AVANCES (clasificados + ganadores) ============
CREATE OR REPLACE FUNCTION public.torneo_resolver_avances(p_disciplina_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_p record;
  v_pend integer;
  v_upd integer := 0;
  v_eq uuid;
  v_zona text; v_pos integer;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  SELECT count(*) INTO v_pend FROM torneo_partidos
    WHERE disciplina_id = p_disciplina_id AND fase = 'grupos' AND estado <> 'finalizado';

  -- Rellenar etiquetas tipo "1º Zona A" si la fase de grupos termino
  IF v_pend = 0 THEN
    FOR v_p IN SELECT id, etiqueta_a, etiqueta_b, equipo_a_id, equipo_b_id FROM torneo_partidos
      WHERE disciplina_id = p_disciplina_id AND fase <> 'grupos' LOOP
      IF v_p.equipo_a_id IS NULL AND v_p.etiqueta_a ~ '^[0-9]+º Zona ' THEN
        v_pos := (regexp_match(v_p.etiqueta_a, '^([0-9]+)º'))[1]::int;
        v_zona := trim(substring(v_p.etiqueta_a from 'Zona (.+)$'));
        SELECT t.equipo_id INTO v_eq FROM torneo_tabla(p_disciplina_id) t WHERE t.zona = v_zona AND t.pos = v_pos;
        IF v_eq IS NOT NULL THEN UPDATE torneo_partidos SET equipo_a_id = v_eq WHERE id = v_p.id; v_upd := v_upd + 1; END IF;
      END IF;
      IF v_p.equipo_b_id IS NULL AND v_p.etiqueta_b ~ '^[0-9]+º Zona ' THEN
        v_pos := (regexp_match(v_p.etiqueta_b, '^([0-9]+)º'))[1]::int;
        v_zona := trim(substring(v_p.etiqueta_b from 'Zona (.+)$'));
        SELECT t.equipo_id INTO v_eq FROM torneo_tabla(p_disciplina_id) t WHERE t.zona = v_zona AND t.pos = v_pos;
        IF v_eq IS NOT NULL THEN UPDATE torneo_partidos SET equipo_b_id = v_eq WHERE id = v_p.id; v_upd := v_upd + 1; END IF;
      END IF;
    END LOOP;
  END IF;

  -- Propagar ganadores/perdedores de playoffs finalizados
  FOR v_p IN SELECT * FROM torneo_partidos
    WHERE disciplina_id = p_disciplina_id AND estado = 'finalizado' AND marcador_a IS NOT NULL
      AND equipo_a_id IS NOT NULL AND equipo_b_id IS NOT NULL
      AND (avanza_ganador_partido_id IS NOT NULL OR avanza_perdedor_partido_id IS NOT NULL)
    ORDER BY fase_orden LOOP
    DECLARE v_gan uuid; v_per uuid;
    BEGIN
      IF v_p.marcador_a = v_p.marcador_b THEN CONTINUE; END IF;
      IF v_p.marcador_a > v_p.marcador_b THEN v_gan := v_p.equipo_a_id; v_per := v_p.equipo_b_id;
      ELSE v_gan := v_p.equipo_b_id; v_per := v_p.equipo_a_id; END IF;

      IF v_p.avanza_ganador_partido_id IS NOT NULL THEN
        IF v_p.avanza_ganador_slot = 'a' THEN
          UPDATE torneo_partidos SET equipo_a_id = v_gan WHERE id = v_p.avanza_ganador_partido_id;
        ELSE
          UPDATE torneo_partidos SET equipo_b_id = v_gan WHERE id = v_p.avanza_ganador_partido_id;
        END IF;
        v_upd := v_upd + 1;
      END IF;
      IF v_p.avanza_perdedor_partido_id IS NOT NULL THEN
        IF v_p.avanza_perdedor_slot = 'a' THEN
          UPDATE torneo_partidos SET equipo_a_id = v_per WHERE id = v_p.avanza_perdedor_partido_id;
        ELSE
          UPDATE torneo_partidos SET equipo_b_id = v_per WHERE id = v_p.avanza_perdedor_partido_id;
        END IF;
        v_upd := v_upd + 1;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'actualizados', v_upd, 'grupos_pendientes', v_pend);
END; $$;

-- ============ PROGRAMADOR AUTOMATICO ============
CREATE OR REPLACE FUNCTION public.torneo_programar(p_edicion_id uuid, p_reprogramar_todo boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Solo super_admin'; END IF;

  IF p_reprogramar_todo THEN
    UPDATE torneo_partidos SET inicio = NULL, fin = NULL, cancha_id = NULL
    WHERE disciplina_id IN (SELECT id FROM torneo_disciplinas WHERE edicion_id = p_edicion_id AND activa)
      AND estado <> 'finalizado';
  END IF;

  FOR v_p IN
    SELECT tp.*, td.duracion_min, td.buffer_min, td.orden AS d_orden
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

        -- cancha libre de esta disciplina
        SELECT c.id INTO v_cancha FROM torneo_canchas c
        WHERE c.disciplina_id = v_p.disciplina_id
          AND NOT EXISTS (
            SELECT 1 FROM torneo_partidos o
            WHERE o.cancha_id = c.id AND o.inicio IS NOT NULL
              AND o.inicio < v_end AND o.fin > v_cand
          )
        ORDER BY c.orden, c.nombre LIMIT 1;

        IF v_cancha IS NULL THEN v_cand := v_cand + v_step; CONTINUE; END IF;

        -- pueblo no puede jugar dos partidos a la vez (en ninguna disciplina)
        IF EXISTS (
          SELECT 1 FROM torneo_partidos o
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

    IF NOT v_ok THEN v_sin := v_sin + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'programados', v_prog, 'sin_horario', v_sin);
END; $$;
