// FILE: app/(tabs)/torneo.tsx
// Torneo Interpueblos: fixture, posiciones, llaves, inscripción de equipos y administración
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { s, colors } from '../../src/lib/theme';
import { gradients, radius, shadows, spacing, typography } from '../../src/lib/designSystem';
import { NandutiDecorativo } from '../../src/components/FondoParaguayo';
import { Badge } from '../../src/components/Badge';
import { useUserRoles } from '../../src/hooks/useUserRoles';
import { TorneoAdminPanel } from '../../src/components/TorneoAdminPanel';
import { generateExcelBlob, fileStamp, humanDate, safeFileName } from '../../src/lib/excel';
import { shareOrDownload } from '../../src/lib/sharing';
import { useTorneoPartidosLive } from '../../src/hooks/useTorneoPartidosLive';
import { TorneoMisEquipos } from '../../src/components/TorneoMisEquipos';
import { Llaves } from '../../src/components/TorneoLlaves';

import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoPartido, type TorneoFilaTabla,
  type TorneoEquipo,
  fetchEdiciones, fetchDisciplinas, fetchPartidos, fetchTabla, fetchEquipos, inscripcionEquiposAbierta,
  nombreEquipo, fmtDia, fmtHora, claveDia, FASE_LABEL, ESTADO_LABEL, marcadorTexto,
} from '../../src/lib/torneo';

type Vista = 'fixture' | 'pueblo' | 'posiciones' | 'llaves' | 'misequipos' | 'admin';

const VISTAS: Record<Vista, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  fixture: { label: 'Fixture', icon: 'calendar-outline' }, pueblo: { label: 'Mi pueblo', icon: 'home-outline' },
  posiciones: { label: 'Posiciones', icon: 'podium-outline' }, llaves: { label: 'Llaves', icon: 'trophy-outline' },
  misequipos: { label: 'Mis equipos', icon: 'people-outline' }, admin: { label: 'Administrar', icon: 'settings-outline' },
};

function EquipoAvatar({ nombre, lado }: { nombre: string; lado: 'a' | 'b' }) {
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return <View style={{ width: 46, height: 46, borderRadius: radius.full, backgroundColor: lado === 'a' ? colors.primary[100] : colors.accent[100], alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: typography.family.bold, color: lado === 'a' ? colors.primary[700] : colors.accent[700] }}>{iniciales || '?'}</Text></View>;
}

function EstadoPartido({ estado }: { estado: string }) {
  const live = estado === 'en_juego';
  const tone = estado === 'suspendido' ? 'danger' : estado === 'finalizado' || live ? 'success' : 'neutral';
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{live ? <View style={{ width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.mint[600] }} /> : null}<Badge tone={tone}>{ESTADO_LABEL[estado] ?? estado}</Badge></View>;
}

function PartidoScoreboard({ p, disciplina }: { p: TorneoPartido; disciplina?: TorneoDisciplina }) {
  const nomA = p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? 'A definir');
  const nomB = p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? 'A definir');
  const hayMarcador = p.marcador_a != null && p.marcador_b != null;
  return <View style={[s.card, { marginBottom: spacing.md, padding: spacing.lg, borderColor: p.estado === 'en_juego' ? colors.mint[200] : colors.primary[50], ...shadows.sm }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: spacing.md }}><Text style={{ flex: 1, fontFamily: typography.family.semibold, color: colors.text.tertiary.light, fontSize: 11 }}>{disciplina ? `${disciplina.emoji} ${disciplina.nombre}` : ''} · {FASE_LABEL[p.fase] ?? p.fase}{p.zona ? ` ${p.zona}` : ''}</Text><EstadoPartido estado={p.estado} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1, alignItems: 'center', gap: 7 }}><EquipoAvatar nombre={nomA} lado="a" /><Text style={{ textAlign: 'center', fontFamily: typography.family.bold, color: colors.text.primary.light, fontSize: 12 }} numberOfLines={2}>{nomA}</Text></View><View style={{ minWidth: 90, alignItems: 'center' }}><Text style={{ fontFamily: typography.family.extrabold, fontSize: 30, color: colors.primary[700] }}>{hayMarcador ? `${p.marcador_a} – ${p.marcador_b}` : fmtHora(p.inicio)}</Text>{p.penales_a != null && p.penales_b != null ? <Text style={{ fontFamily: typography.family.semibold, fontSize: 11, color: colors.text.tertiary.light }}>({p.penales_a}-{p.penales_b} pen.)</Text> : null}</View><View style={{ flex: 1, alignItems: 'center', gap: 7 }}><EquipoAvatar nombre={nomB} lado="b" /><Text style={{ textAlign: 'center', fontFamily: typography.family.bold, color: colors.text.primary.light, fontSize: 12 }} numberOfLines={2}>{nomB}</Text></View></View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.md }}><Ionicons name="location-outline" size={14} color={colors.text.tertiary.light} /><Text style={s.small}>{p.cancha?.nombre ?? 'Cancha a confirmar'} · {p.inicio ? fmtHora(p.inicio) : 'Horario a confirmar'}{p.detalle_sets ? ` · ${p.detalle_sets}` : ''}{p.mvp_nombre ? ` · MVP: ${p.mvp_nombre}` : ''}</Text></View>
  </View>;
}

export default function Torneo() {
  const { width } = useWindowDimensions();
  const { isSuperAdmin, isPuebloAdmin, isCoAdmin, puebloId } = useUserRoles();
  const esCoordinador = isPuebloAdmin || isCoAdmin;
  const [ediciones, setEdiciones] = useState<TorneoEdicion[]>([]);
  const [edicionSel, setEdicionSel] = useState<string | null>(null);
  const [inscAbierta, setInscAbierta] = useState(false);
  const [vista, setVista] = useState<Vista>('fixture');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edicion, setEdicion] = useState<TorneoEdicion | null>(null);
  const [disciplinas, setDisciplinas] = useState<TorneoDisciplina[]>([]);
  const [partidos, setPartidos] = useState<TorneoPartido[]>([]);
  const [filtroDisc, setFiltroDisc] = useState<string | 'todas'>('todas');
  const [tabla, setTabla] = useState<TorneoFilaTabla[]>([]);
  const [equipos, setEquipos] = useState<TorneoEquipo[]>([]);
  const [puebloSel, setPuebloSel] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const eds = await fetchEdiciones();
      setEdiciones(eds);
      const ed = eds.find((e) => e.id === edicionSel) ?? eds.find((e) => e.activo) ?? eds[0] ?? null;
      setEdicion(ed);
      if (ed && !edicionSel) setEdicionSel(ed.id);
      setInscAbierta(ed && !ed.finalizada ? await inscripcionEquiposAbierta(ed.id).catch(() => false) : false);
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
  }, [edicionSel]);

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

  // Actualización en vivo eficiente (solo el partido que cambió)
  useTorneoPartidosLive({ enabled: true, channel: 'torneo-partidos-live', setPartidos, reloadAll: load });

  const enJuego = useMemo(() => partidos.filter((p) => p.estado === 'en_juego'), [partidos]);

  // Disciplina concreta para posiciones
  const discSel = useMemo(() => {
    if (filtroDisc !== 'todas') return disciplinas.find((d) => d.id === filtroDisc) ?? disciplinas[0] ?? null;
    return disciplinas[0] ?? null;
  }, [filtroDisc, disciplinas]);

  // Se recalcula también cuando cambian los partidos (p.ej. por un evento en vivo),
  // así la tabla de posiciones se actualiza en tiempo real.
  useEffect(() => {
    if (!discSel) { setTabla([]); return; }
    if (vista === 'posiciones') fetchTabla(discSel.id).then(setTabla).catch(() => setTabla([]));
  }, [vista, discSel?.id, partidos]);

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
          marcadorTexto(p) ?? '',
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
          marcadorTexto(p) ?? '',
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
      style={[s.screen, { backgroundColor: 'transparent' }]}
      contentContainerStyle={s.pageContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius['2xl'], padding: width >= 900 ? spacing['3xl'] : spacing.xl, minHeight: width >= 900 ? 230 : 190, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: spacing.lg, ...shadows.lg }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, top: -52 }}><NandutiDecorativo size={210} color={colors.surface.light} opacity={0.18} /></View>
        <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface.light, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}><Ionicons name="trophy-outline" size={25} color={colors.primary[600]} /></View>
        <Text style={{ fontFamily: typography.family.extrabold, fontSize: width >= 900 ? 36 : 28, color: colors.surface.light }}>Torneo Interpueblos</Text>
        <Text style={{ fontFamily: typography.family.medium, color: colors.primary[50], marginTop: 5 }}>{edicion ? edicion.nombre : 'Todavía no hay una edición activa del torneo.'}</Text>
      </LinearGradient>

      {/* Selector de edición (histórico) */}
      {ediciones.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          {ediciones.map((e) => {
            const sel = edicion?.id === e.id;
            return (
              <Pressable key={e.id} onPress={() => { setEdicionSel(e.id); setPuebloSel(null); setFiltroDisc('todas'); if (vista === 'misequipos') setVista('fixture'); }} style={{
                paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, borderRadius: radius.full,
                backgroundColor: sel ? colors.primary[700] : colors.surface.light, borderWidth: 1, borderColor: sel ? colors.primary[700] : colors.primary[100],
              }}>
                <Text style={{ fontWeight: '700', fontSize: 12, color: sel ? colors.surface.light : colors.neutral[700] }}>
                  {e.anio}{e.activo ? ' · Actual' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {edicion?.finalizada && (
        <View style={[s.card, { marginBottom: spacing.md, backgroundColor: colors.neutral[100] }]}>
          <Text style={{ fontWeight: '800', color: colors.neutral[700] }}>📜 Edición finalizada (histórico)</Text>
        </View>
      )}

      {/* En juego ahora */}
      {enJuego.length > 0 && vista !== 'admin' && (
        <View style={{ marginBottom: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.mint[50], borderWidth: 1, borderColor: colors.mint[200] }}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><View style={{ width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.mint[600] }} /><Text style={{ fontFamily: typography.family.extrabold, color: colors.mint[700], fontSize: 17 }}>En juego ahora</Text></View>
          {enJuego.map((p) => {
            const d = discNombre(p.disciplina_id);
            return (
              <PartidoScoreboard key={p.id} p={p} disciplina={d} />
            );
          })}
        </View>
      )}

      {esCoordinador && inscAbierta && vista !== 'misequipos' && (
        <Pressable onPress={() => setVista('misequipos')} style={{
          backgroundColor: colors.success, paddingVertical: 12, paddingHorizontal: 16,
          borderRadius: radius.md, marginBottom: spacing.md, alignItems: 'center',
        }}>
          <Text style={{ color: colors.surface.light, fontWeight: '800' }}>Inscribir equipos de mi pueblo</Text>
        </Pressable>
      )}

      {/* Vistas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {(['fixture', 'pueblo', 'posiciones', 'llaves', ...(esCoordinador ? ['misequipos' as Vista] : []), ...(isSuperAdmin ? ['admin' as Vista] : [])] as Vista[]).map((k) => (
          <Pressable key={k} onPress={() => setVista(k)} style={{
            paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, borderRadius: radius.full,
            backgroundColor: vista === k ? colors.primary[600] : colors.surface.light,
            borderWidth: 1, borderColor: vista === k ? colors.primary[600] : colors.primary[100], flexDirection: 'row', alignItems: 'center', gap: 7,
          }}>
            <Ionicons name={VISTAS[k].icon} size={16} color={vista === k ? colors.surface.light : colors.primary[600]} /><Text style={{ color: vista === k ? colors.surface.light : colors.neutral[700], fontWeight: '800', fontSize: 13 }}>{VISTAS[k].label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {vista === 'admin' && isSuperAdmin && edicion && (
        <TorneoAdminPanel edicion={edicion} onChanged={load} onEdicionCreada={(id) => setEdicionSel(id ?? null)} />
      )}

      {vista === 'misequipos' && esCoordinador && edicion && (
        <TorneoMisEquipos edicion={edicion} disciplinas={disciplinas} puebloId={puebloId} />
      )}

      {vista === 'llaves' && disciplinas.length > 0 && (
        <Llaves disciplinas={disciplinas} partidos={partidos} />
      )}

      {vista !== 'admin' && vista !== 'misequipos' && disciplinas.length === 0 && (
        <View style={s.card}>
          <Text style={s.text}>Todavía no hay disciplinas lanzadas. Volvé más tarde 🏐⚽🏀</Text>
        </View>
      )}

      {(vista === 'fixture' || vista === 'posiciones') && disciplinas.length > 0 && (
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
                    {p.nombre}
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
                const enJuego = p.estado === 'en_juego';
                return (
                  <View key={p.id} style={[s.card, { marginBottom: 8, paddingVertical: 12 },
                    enJuego && { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 2, borderColor: colors.success }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {d ? `${d.emoji} ${d.nombre}` : ''} · {FASE_LABEL[p.fase] ?? p.fase}{p.zona ? ` ${p.zona}` : ''}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: enJuego ? colors.success : colors.neutral[500] }}>
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
                          {marcadorTexto(p) ?? fmtHora(p.inicio)}
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
                const enJuego = p.estado === 'en_juego';
                return (
                  <View key={p.id} style={[s.card, { marginBottom: 8, paddingVertical: 12 },
                    enJuego && { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 2, borderColor: colors.success }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.neutral[500] }}>
                        {d ? `${d.emoji} ${d.nombre}` : ''} · {FASE_LABEL[p.fase] ?? p.fase}{p.zona ? ` ${p.zona}` : ''}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: enJuego ? colors.success : colors.neutral[500] }}>
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
                          {marcadorTexto(p) ?? fmtHora(p.inicio)}
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

    </ScrollView>
  );
}

const hdr = { flex: 1, fontSize: 11, fontWeight: '700' as const, color: colors.neutral[500], textAlign: 'center' as const };
const cel = { flex: 1, fontSize: 12, color: colors.neutral[700], textAlign: 'center' as const };
