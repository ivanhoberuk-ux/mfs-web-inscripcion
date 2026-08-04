// FILE: app/(tabs)/torneo.tsx
// Torneo Interpueblos: fixture, posiciones, goleadores y administración
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Alert } from 'react-native';
import { s, colors } from '../../src/lib/theme';
import { radius, spacing } from '../../src/lib/designSystem';
import { useUserRoles } from '../../src/hooks/useUserRoles';
import { TorneoAdminPanel } from '../../src/components/TorneoAdminPanel';
import { generateExcelBlob, fileStamp, humanDate, safeFileName } from '../../src/lib/excel';
import { shareOrDownload } from '../../src/lib/sharing';
import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoPartido, type TorneoFilaTabla, type TorneoGoleador,
  type TorneoEquipo,
  fetchEdicionActiva, fetchDisciplinas, fetchPartidos, fetchTabla, fetchGoleadores, fetchEquipos,
  nombreEquipo, fmtDia, fmtHora, claveDia, FASE_LABEL, ESTADO_LABEL,
} from '../../src/lib/torneo';

type Vista = 'fixture' | 'pueblo' | 'posiciones' | 'goleadores' | 'admin';

export default function Torneo() {
  const { isSuperAdmin, puebloId } = useUserRoles();
  const [vista, setVista] = useState<Vista>('fixture');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edicion, setEdicion] = useState<TorneoEdicion | null>(null);
  const [disciplinas, setDisciplinas] = useState<TorneoDisciplina[]>([]);
  const [partidos, setPartidos] = useState<TorneoPartido[]>([]);
  const [filtroDisc, setFiltroDisc] = useState<string | 'todas'>('todas');
  const [tabla, setTabla] = useState<TorneoFilaTabla[]>([]);
  const [goleadores, setGoleadores] = useState<TorneoGoleador[]>([]);
  const [equipos, setEquipos] = useState<TorneoEquipo[]>([]);
  const [puebloSel, setPuebloSel] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const ed = await fetchEdicionActiva();
      setEdicion(ed);
      if (!ed) { setDisciplinas([]); setPartidos([]); setEquipos([]); return; }
      const ds = await fetchDisciplinas(ed.id);
      const activas = ds.filter((d) => d.activa);
      setDisciplinas(activas);
      const ids = activas.map((d) => d.id);
      setPartidos(await fetchPartidos(ids));
      setEquipos(await fetchEquipos(ids));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    }
  }, []);

  // Pueblos que participan del torneo
  const pueblos = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of equipos) map.set(e.pueblo_id, e.pueblo?.nombre ?? 'Pueblo');
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [equipos]);

  useEffect(() => {
    if (puebloSel || pueblos.length === 0) return;
    const mio = puebloId && pueblos.some((p) => p.id === puebloId) ? puebloId : pueblos[0].id;
    setPuebloSel(mio);
  }, [pueblos, puebloId, puebloSel]);

  // Partidos del pueblo seleccionado (todas las disciplinas)
  const partidosPueblo = useMemo(() => {
    if (!puebloSel) return [];
    const misEquipos = new Set(equipos.filter((e) => e.pueblo_id === puebloSel).map((e) => e.id));
    return partidos
      .filter((p) => (p.equipo_a_id && misEquipos.has(p.equipo_a_id)) || (p.equipo_b_id && misEquipos.has(p.equipo_b_id)))
      .sort((a, b) => (a.inicio ?? 'zzz').localeCompare(b.inicio ?? 'zzz'));
  }, [partidos, equipos, puebloSel]);

  const porDiaPueblo = useMemo(() => {
    const map = new Map<string, TorneoPartido[]>();
    for (const p of partidosPueblo) {
      const k = claveDia(p.inicio);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [partidosPueblo]);


  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  // Disciplina concreta para posiciones/goleadores
  const discSel = useMemo(() => {
    if (filtroDisc !== 'todas') return disciplinas.find((d) => d.id === filtroDisc) ?? disciplinas[0] ?? null;
    return disciplinas[0] ?? null;
  }, [filtroDisc, disciplinas]);

  useEffect(() => {
    if (!discSel) { setTabla([]); setGoleadores([]); return; }
    if (vista === 'posiciones') fetchTabla(discSel.id).then(setTabla).catch(() => setTabla([]));
    if (vista === 'goleadores') fetchGoleadores(discSel.id).then(setGoleadores).catch(() => setGoleadores([]));
  }, [vista, discSel?.id]);

  const partidosFiltrados = useMemo(
    () => partidos.filter((p) => filtroDisc === 'todas' || p.disciplina_id === filtroDisc),
    [partidos, filtroDisc],
  );

  const porDia = useMemo(() => {
    const map = new Map<string, TorneoPartido[]>();
    for (const p of partidosFiltrados) {
      const k = claveDia(p.inicio);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [partidosFiltrados]);

  const discNombre = (id: string) => disciplinas.find((d) => d.id === id);

  async function exportarPueblo() {
    try {
      const nombrePueblo = pueblos.find((p) => p.id === puebloSel)?.nombre ?? 'Pueblo';
      const rows: any[][] = [['Disciplina', 'Fase', 'Zona', 'Día', 'Hora', 'Cancha', 'Equipo A', 'Equipo B', 'Marcador', 'Estado']];
      for (const p of partidosPueblo) {
        const d = discNombre(p.disciplina_id);
        rows.push([
          d ? `${d.emoji} ${d.nombre}` : '',
          FASE_LABEL[p.fase] ?? p.fase,
          p.zona ?? '',
          fmtDia(p.inicio),
          p.inicio ? fmtHora(p.inicio) : 'A confirmar',
          p.cancha?.nombre ?? '',
          p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? ''),
          p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? ''),
          p.marcador_a != null ? `${p.marcador_a} - ${p.marcador_b}` : '',
          p.estado,
        ]);
      }
      const blob = generateExcelBlob(rows, {
        title: `Partidos de ${nombrePueblo}`,
        subtitle: `${partidosPueblo.length} partidos · Generado el ${humanDate()}`,
        sheetName: 'Mis partidos',
      });
      await shareOrDownload(blob, `Torneo_${safeFileName(nombrePueblo)}_${fileStamp()}.xlsx`);
    } catch (e: any) {
      Alert.alert('No se pudo exportar', e?.message ?? String(e));
    }
  }



  async function exportarFixture() {
    try {
      const rows: any[][] = [['Disciplina', 'Fase', 'Zona', 'Día', 'Hora', 'Cancha', 'Equipo A', 'Equipo B', 'Marcador', 'Estado']];
      for (const p of partidosFiltrados) {
        const d = discNombre(p.disciplina_id);
        rows.push([
          d ? `${d.emoji} ${d.nombre}` : '',
          FASE_LABEL[p.fase] ?? p.fase,
          p.zona ?? '',
          fmtDia(p.inicio),
          fmtHora(p.inicio),
          p.cancha?.nombre ?? '',
          p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? ''),
          p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? ''),
          p.marcador_a != null ? `${p.marcador_a} - ${p.marcador_b}` : '',
          p.estado,
        ]);
      }
      const blob = generateExcelBlob(rows, {
        title: `Fixture — ${edicion?.nombre ?? 'Torneo'}`,
        subtitle: `${partidosFiltrados.length} partidos · Generado el ${humanDate()}`,
        sheetName: 'Fixture',
      });
      await shareOrDownload(blob, `Torneo_fixture_${fileStamp()}.xlsx`);
    } catch (e: any) {
      Alert.alert('No se pudo exportar', e?.message ?? String(e));
    }
  }

  if (loading) {
    return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background.light }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={s.title}>🏆 Torneo Interpueblos</Text>
      <Text style={[s.subtitle, { marginBottom: spacing.md }]}>
        {edicion ? `${edicion.nombre}` : 'Todavía no hay una edición activa del torneo.'}
      </Text>

      {/* Vistas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {([
          ['fixture', '📅 Fixture'],
          ['pueblo', '🏘️ Mi pueblo'],
          ['posiciones', '📊 Posiciones'],
          ['goleadores', '🥇 Goleadores'],
          ...(isSuperAdmin ? [['admin', '⚙️ Administrar'] as [Vista, string]] : []),
        ] as [Vista, string][]).map(([k, label]) => (
          <Pressable key={k} onPress={() => setVista(k)} style={{
            paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, borderRadius: radius.full,
            backgroundColor: vista === k ? colors.primary[600] : '#fff',
            borderWidth: 2, borderColor: vista === k ? colors.primary[600] : colors.neutral[200],
          }}>
            <Text style={{ color: vista === k ? '#fff' : colors.neutral[700], fontWeight: '800', fontSize: 13 }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {vista === 'admin' && isSuperAdmin && edicion && (
        <TorneoAdminPanel edicion={edicion} onChanged={load} />
      )}

      {vista !== 'admin' && disciplinas.length === 0 && (
        <View style={s.card}>
          <Text style={s.text}>Todavía no hay disciplinas lanzadas. Volvé más tarde 🏐⚽🏀</Text>
        </View>
      )}

      {vista !== 'admin' && vista !== 'pueblo' && disciplinas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {(vista === 'fixture' ? [{ id: 'todas', emoji: '🎯', nombre: 'Todas' } as any, ...disciplinas] : disciplinas).map((d: any) => {
            const sel = vista === 'fixture' ? filtroDisc === d.id : discSel?.id === d.id;
            return (
              <Pressable key={d.id} onPress={() => setFiltroDisc(d.id)} style={{
                paddingVertical: 7, paddingHorizontal: 13, marginRight: 8, borderRadius: radius.full,
                backgroundColor: sel ? colors.secondary[500] : colors.neutral[100],
              }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: sel ? colors.primary[800] : colors.neutral[700] }}>
                  {d.emoji} {d.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* MI PUEBLO */}
      {vista === 'pueblo' && disciplinas.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {pueblos.map((p) => {
              const sel = puebloSel === p.id;
              return (
                <Pressable key={p.id} onPress={() => setPuebloSel(p.id)} style={{
                  paddingVertical: 7, paddingHorizontal: 13, marginRight: 8, borderRadius: radius.full,
                  backgroundColor: sel ? colors.secondary[500] : colors.neutral[100],
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: sel ? colors.primary[800] : colors.neutral[700] }}>
                    🏘️ {p.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {pueblos.length === 0 && (
            <View style={s.card}><Text style={s.text}>Todavía no hay pueblos anotados en el torneo.</Text></View>
          )}

          {puebloSel && (
            <Pressable onPress={exportarPueblo} style={{
              alignSelf: 'flex-start', backgroundColor: colors.success, paddingVertical: 8,
              paddingHorizontal: 14, borderRadius: radius.sm, marginBottom: spacing.md,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📥 Descargar mis partidos</Text>
            </Pressable>
          )}

          {puebloSel && partidosPueblo.length === 0 && (
            <View style={s.card}><Text style={s.text}>Este pueblo todavía no tiene partidos generados.</Text></View>
          )}

          {porDiaPueblo.map(([dia, lista]) => (
            <View key={dia} style={{ marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
                {fmtDia(lista[0].inicio)}
              </Text>
              {lista.map((p) => {
                const d = discNombre(p.disciplina_id);
                const finalizado = p.estado === 'finalizado';
                return (
                  <View key={p.id} style={[s.card, { marginBottom: 8, paddingVertical: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {d ? `${d.emoji} ${d.nombre}` : ''} · {FASE_LABEL[p.fase] ?? p.fase}{p.zona ? ` ${p.zona}` : ''}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {ESTADO_LABEL[p.estado] ?? p.estado}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontWeight: '800', color: colors.neutral[800], textAlign: 'right' }} numberOfLines={2}>
                        {p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? 'A definir')}
                      </Text>
                      <View style={{
                        marginHorizontal: 12, paddingVertical: 4, paddingHorizontal: 10,
                        borderRadius: radius.sm, backgroundColor: finalizado ? colors.primary[600] : colors.neutral[100],
                      }}>
                        <Text style={{ fontWeight: '900', color: finalizado ? '#fff' : colors.neutral[600] }}>
                          {p.marcador_a != null ? `${p.marcador_a} - ${p.marcador_b}` : fmtHora(p.inicio)}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, fontWeight: '800', color: colors.neutral[800] }} numberOfLines={2}>
                        {p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? 'A definir')}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 6, textAlign: 'center' }}>
                      🕒 {p.inicio ? fmtHora(p.inicio) : 'Horario a confirmar'} · 📍 {p.cancha?.nombre ?? 'Cancha a confirmar'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}


      {/* FIXTURE */}
      {vista === 'fixture' && disciplinas.length > 0 && (
        <>
          <Pressable onPress={exportarFixture} style={{
            alignSelf: 'flex-start', backgroundColor: colors.success, paddingVertical: 8,
            paddingHorizontal: 14, borderRadius: radius.sm, marginBottom: spacing.md,
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📥 Descargar fixture</Text>
          </Pressable>

          {porDia.length === 0 && (
            <View style={s.card}><Text style={s.text}>Todavía no hay partidos programados.</Text></View>
          )}

          {porDia.map(([dia, lista]) => (
            <View key={dia} style={{ marginBottom: spacing.lg }}>
              <Text style={{
                fontSize: 15, fontWeight: '800', color: colors.primary[700], marginBottom: 8,
              }}>
                {fmtDia(lista[0].inicio)}
              </Text>
              {lista.map((p) => {
                const d = discNombre(p.disciplina_id);
                const finalizado = p.estado === 'finalizado';
                return (
                  <View key={p.id} style={[s.card, { marginBottom: 8, paddingVertical: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {d ? `${d.emoji} ${d.nombre}` : ''} · {FASE_LABEL[p.fase] ?? p.fase}{p.zona ? ` ${p.zona}` : ''}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {ESTADO_LABEL[p.estado] ?? p.estado}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontWeight: '800', color: colors.neutral[800], textAlign: 'right' }} numberOfLines={2}>
                        {p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? 'A definir')}
                      </Text>
                      <View style={{
                        marginHorizontal: 12, paddingVertical: 4, paddingHorizontal: 10,
                        borderRadius: radius.sm, backgroundColor: finalizado ? colors.primary[600] : colors.neutral[100],
                      }}>
                        <Text style={{ fontWeight: '900', color: finalizado ? '#fff' : colors.neutral[600] }}>
                          {p.marcador_a != null ? `${p.marcador_a} - ${p.marcador_b}` : fmtHora(p.inicio)}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, fontWeight: '800', color: colors.neutral[800] }} numberOfLines={2}>
                        {p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? 'A definir')}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 6, textAlign: 'center' }}>
                      🕒 {fmtHora(p.inicio)} · 📍 {p.cancha?.nombre ?? 'Cancha a confirmar'}
                      {p.detalle_sets ? ` · ${p.detalle_sets}` : ''}
                      {p.mvp_nombre ? ` · ⭐ MVP: ${p.mvp_nombre}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}

      {/* POSICIONES */}
      {vista === 'posiciones' && discSel && (
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 10 }]}>{discSel.emoji} {discSel.nombre}</Text>
          {tabla.length === 0 && <Text style={s.small}>Todavía no hay datos de posiciones.</Text>}
          {Array.from(new Set(tabla.map((t) => t.zona ?? '—'))).map((zona) => (
            <View key={zona} style={{ marginBottom: spacing.md }}>
              <Text style={{ fontWeight: '800', color: colors.primary[700], marginBottom: 6 }}>Zona {zona}</Text>
              <View style={{ flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.neutral[200] }}>
                <Text style={[hdr, { flex: 3 }]}>Equipo</Text>
                <Text style={hdr}>PJ</Text><Text style={hdr}>G</Text><Text style={hdr}>E</Text><Text style={hdr}>P</Text>
                <Text style={hdr}>DIF</Text><Text style={[hdr, { fontWeight: '900' }]}>Pts</Text>
              </View>
              {tabla.filter((t) => (t.zona ?? '—') === zona).map((t) => (
                <View key={t.equipo_id} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                  <Text style={[cel, { flex: 3, textAlign: 'left', fontWeight: '700' }]} numberOfLines={1}>
                    {t.pos}. {t.equipo_nombre}
                  </Text>
                  <Text style={cel}>{t.pj}</Text><Text style={cel}>{t.pg}</Text><Text style={cel}>{t.pe}</Text><Text style={cel}>{t.pp}</Text>
                  <Text style={cel}>{t.dif}</Text><Text style={[cel, { fontWeight: '900', color: colors.primary[700] }]}>{t.puntos}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* GOLEADORES */}
      {vista === 'goleadores' && discSel && (
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 10 }]}>🥇 Goleadores — {discSel.nombre}</Text>
          {goleadores.length === 0 && <Text style={s.small}>Todavía no se cargaron goles.</Text>}
          {goleadores.map((g, i) => (
            <View key={`${g.jugador}-${g.equipo_id}`} style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
              borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
            }}>
              <Text style={{ width: 28, fontWeight: '900', color: colors.secondary[600] }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.neutral[800] }}>{g.jugador}</Text>
                <Text style={s.small}>{g.equipo_nombre}</Text>
              </View>
              <Text style={{ fontWeight: '900', color: colors.primary[700], fontSize: 16 }}>{g.total}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const hdr = { flex: 1, fontSize: 11, fontWeight: '700' as const, color: colors.neutral[500], textAlign: 'center' as const };
const cel = { flex: 1, fontSize: 12, color: colors.neutral[700], textAlign: 'center' as const };
