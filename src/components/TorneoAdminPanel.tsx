// FILE: src/components/TorneoAdminPanel.tsx
// Panel de administración del Torneo Interpueblos (solo super_admin)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, Switch, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { s, colors } from '../lib/theme';
import { radius, spacing } from '../lib/designSystem';
import { fetchPueblos, type Pueblo } from '../lib/api';
import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoEquipo, type TorneoCancha,
  type TorneoBloque, type TorneoPartido, type TorneoEvento,
  fetchDisciplinas, updateDisciplina, fetchEquipos, addEquipo, deleteEquipo, updateEquipo,
  fetchCanchas, addCancha, deleteCancha, renameCancha, fetchBloques, addBloque, deleteBloque, updateBloque,
  fetchPartidos, updatePartido, fetchEventos, addEvento, deleteEvento,
  sortearZonas, generarFixture, programarTorneo, resolverAvances, correrHorarios, limpiarHorarios,
  nombreEquipo, fmtDia, fmtHora, FASE_LABEL,
} from '../lib/torneo';

type Seccion = 'disciplinas' | 'equipos' | 'horarios' | 'resultados';

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { marginBottom: spacing.lg }]}>
      <Text style={[s.cardTitle, { marginBottom: spacing.md }]}>{emoji} {title}</Text>
      {children}
    </View>
  );
}

function MiniBtn({ label, onPress, color = colors.primary[600], disabled }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? colors.neutral[300] : color,
        paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: radius.sm, marginRight: 8, marginBottom: 8,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Continuar', onPress: onConfirm },
  ]);
}

function actionMessage(result: any, fallback: string): string {
  if (!result || typeof result !== 'object') return fallback;
  if (result.ok === false) return result.msg || 'La operación no pudo completarse.';
  if (typeof result.partidos === 'number') return `${result.partidos} partidos generados.`;
  if (typeof result.programados === 'number') {
    const pending = Number(result.sin_horario || 0);
    if (pending === 0) return `${result.programados} partidos programados correctamente.`;
    const porReglas = Number(result.bloqueados_por_reglas || 0);
    const resumen = Array.isArray(result.resumen) ? result.resumen : [];
    const detalle = resumen
      .filter((r: any) => Number(r.sin_horario) > 0)
      .map((r: any) => `• ${r.disciplina}: ${r.sin_horario} sin horario (necesita ${Math.round(Number(r.minutos_necesarios || 0))} min en total, hay ${Math.round(Number(r.minutos_disponibles || 0))} min disponibles en ${r.canchas} cancha/s)`)
      .join('\n');
    const causa = porReglas > 0
      ? `\n\n${porReglas} de esos partidos SÍ entraban en los bloques, pero los bloquearon las reglas: máximo ${result.max_dia_pueblo} partidos por pueblo por día y ${result.descanso_min} min de descanso mínimo entre partidos de un mismo pueblo. Podés aflojar esas reglas arriba del botón “Programar todo”.`
      : '';
    return `${result.programados} partidos programados. ${pending} quedaron sin horario.\n\n${detalle}${causa}\n\nAbajo, en “Partidos sin horario”, ves el detalle partido por partido.`;
  }
  return fallback;
}


export function TorneoAdminPanel({ edicion, onChanged }: { edicion: TorneoEdicion; onChanged?: () => void }) {
  const [seccion, setSeccion] = useState<Seccion>('disciplinas');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [disciplinas, setDisciplinas] = useState<TorneoDisciplina[]>([]);
  const [equipos, setEquipos] = useState<TorneoEquipo[]>([]);
  const [canchas, setCanchas] = useState<TorneoCancha[]>([]);
  const [bloques, setBloques] = useState<TorneoBloque[]>([]);
  const [editandoBloque, setEditandoBloque] = useState<string | null>(null);
  const [partidos, setPartidos] = useState<TorneoPartido[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [selDisc, setSelDisc] = useState<string | null>(null);
  const [ultimoProg, setUltimoProg] = useState<any>(null);
  const [maxDiaPueblo, setMaxDiaPueblo] = useState('4');
  const [descansoMin, setDescansoMin] = useState('30');



  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ds = await fetchDisciplinas(edicion.id);
      setDisciplinas(ds);
      const ids = ds.map((d) => d.id);
      const [eq, ca, bl, pa, pu] = await Promise.all([
        fetchEquipos(ids), fetchCanchas(ids), fetchBloques(edicion.id), fetchPartidos(ids), fetchPueblos(),
      ]);
      setEquipos(eq); setCanchas(ca); setBloques(bl); setPartidos(pa); setPueblos(pu);
      setSelDisc((prev) => prev ?? ds[0]?.id ?? null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [edicion.id]);

  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<any>, okMsg?: string) {
    setBusy(true);
    try {
      const r = await fn();
      await load();
      onChanged?.();
      if (okMsg) notify('Listo', actionMessage(r, okMsg));
    } catch (e: any) {
      notify('Error', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  const disc = disciplinas.find((d) => d.id === selDisc) || null;
  const equiposDisc = equipos.filter((e) => e.disciplina_id === selDisc);
  const canchasDisc = canchas.filter((c) => c.disciplina_id === selDisc);
  const partidosDisc = partidos.filter((p) => p.disciplina_id === selDisc);
  const partidosProgramados = partidos.filter((p) => p.inicio != null).length;

  async function generarTodosLosFixtures() {
    const activas = disciplinas.filter((d) => d.activa);
    const incompletas = activas.filter((d) => equipos.filter((e) => e.disciplina_id === d.id && e.activo).some((e) => !e.zona));
    if (incompletas.length > 0) {
      notify('Faltan zonas', `Asigná una zona a todos los equipos de: ${incompletas.map((d) => d.nombre).join(', ')}.`);
      return;
    }
    confirmAction(
      'Generar todos los fixtures',
      'Se reemplazarán los partidos actuales de todas las disciplinas activas. ¿Continuar?',
      () => run(async () => {
        let total = 0;
        for (const d of activas) {
          const result = await generarFixture(d.id);
          total += Number(result?.partidos || 0);
        }
        return { ok: true, partidos: total };
      }, 'Fixtures generados'),
    );
  }

  function programar(reprogramarTodo: boolean) {
    if (partidos.length === 0) {
      notify('Primero generá el fixture', 'No hay partidos para programar. Entrá en “Equipos y zonas” y generá el fixture de cada disciplina, o usá “Generar todos los fixtures”.');
      return;
    }
    if (bloques.length === 0) {
      notify('Faltan horarios', 'Agregá por lo menos un bloque con fecha, hora de inicio y hora de fin.');
      return;
    }
    const sinCancha = disciplinas.filter((d) => d.activa && !canchas.some((c) => c.disciplina_id === d.id));
    if (sinCancha.length > 0) {
      notify('Faltan canchas', `Agregá una cancha para: ${sinCancha.map((d) => d.nombre).join(', ')}.`);
      return;
    }
    run(async () => {
      const r = await programarTorneo(edicion.id, reprogramarTodo, Number(maxDiaPueblo) || 4, Number(descansoMin) || 0);
      setUltimoProg(r);
      return r;
    }, reprogramarTodo ? 'Torneo programado' : 'Pendientes programados');

  }

  function borrarHorarios() {
    confirmAction(
      'Borrar todos los horarios',
      'Se quitarán día, hora y cancha de todos los partidos (los resultados y los partidos se mantienen). ¿Continuar?',
      () => run(async () => {
        const r = await limpiarHorarios(edicion.id, false);
        setUltimoProg(null);
        return { ok: true, msg: `${r?.limpiados ?? 0} partidos quedaron sin horario.` };
      }, 'Horarios borrados'),
    );
  }



  return (
    <View>
      {/* Tabs de sección */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {([
          ['disciplinas', '⚙️ Disciplinas'],
          ['equipos', '🏘️ Equipos y zonas'],
          ['horarios', '🗓️ Horarios y canchas'],
          ['resultados', '📝 Resultados'],
        ] as [Seccion, string][]).map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => setSeccion(k)}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, marginRight: 8,
              borderRadius: radius.full,
              backgroundColor: seccion === k ? colors.primary[600] : colors.neutral[100],
            }}
          >
            <Text style={{ color: seccion === k ? '#fff' : colors.neutral[700], fontWeight: '700', fontSize: 13 }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Selector de disciplina */}
      {seccion !== 'horarios' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {disciplinas.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => setSelDisc(d.id)}
              style={{
                paddingVertical: 6, paddingHorizontal: 12, marginRight: 8,
                borderRadius: radius.full, borderWidth: 2,
                borderColor: selDisc === d.id ? colors.secondary[500] : colors.neutral[200],
                backgroundColor: selDisc === d.id ? colors.secondary[50] : '#fff',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: colors.neutral[800] }}>
                {d.emoji} {d.nombre}{d.activa ? '' : ' (off)'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {busy && <ActivityIndicator style={{ marginBottom: 8 }} />}

      {seccion === 'disciplinas' && disc && (
        <DisciplinaEditor disc={disc} onSave={(patch) => run(() => updateDisciplina(disc.id, patch), 'Disciplina actualizada')} />
      )}

      {seccion === 'equipos' && disc && (
        <SectionCard title={`Equipos — ${disc.nombre}`} emoji={disc.emoji}>
          <Text style={[s.small, { marginBottom: 8 }]}>
            Anotá los pueblos que participan en esta disciplina. No todos los pueblos tienen que anotarse a todas.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
            {pueblos
              .filter((p) => !equiposDisc.some((e) => e.pueblo_id === p.id))
              .map((p) => (
                <MiniBtn key={p.id} label={`+ ${p.nombre}`} color={colors.neutral[600]}
                  onPress={() => run(() => addEquipo(disc.id, p.id), 'Equipo agregado')} />
              ))}
          </View>

          {equiposDisc.length === 0 ? (
            <Text style={s.small}>Todavía no hay equipos anotados.</Text>
          ) : (
            equiposDisc.map((e) => (
              <View key={e.id} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.neutral[800] }}>{nombreEquipo(e as any)}</Text>
                  <Text style={s.small}>Zona {e.zona ?? '—'}</Text>
                </View>
                <TextInput
                  placeholder="Zona"
                  defaultValue={e.zona ?? ''}
                  onEndEditing={(ev) => run(() => updateEquipo(e.id, { zona: ev.nativeEvent.text.toUpperCase() || null }))}
                  style={[s.input, { width: 70, marginRight: 8, marginBottom: 0, textAlign: 'center' }]}
                />
                <MiniBtn label="🗑" color={colors.error} onPress={() => run(() => deleteEquipo(e.id), 'Equipo eliminado')} />
              </View>
            ))
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md }}>
            <MiniBtn label={`🎲 Sortear ${disc.num_zonas} zonas`} color={colors.info}
              onPress={() => run(() => sortearZonas(disc.id, disc.num_zonas), 'Zonas sorteadas')} />
            <MiniBtn label="📋 Generar fixture" color={colors.success}
              onPress={() => {
                const sinZona = equiposDisc.some((e) => !e.zona);
                if (equiposDisc.length < 2) {
                  notify('Faltan equipos', 'Esta disciplina necesita por lo menos dos equipos.');
                  return;
                }
                if (sinZona) {
                  notify('Faltan zonas', 'Todos los equipos deben tener una zona antes de generar el fixture.');
                  return;
                }
                confirmAction(
                  'Generar fixture',
                  `Se reemplazarán los ${partidosDisc.length} partidos actuales de ${disc.nombre}. ¿Continuar?`,
                  () => run(() => generarFixture(disc.id), 'Fixture generado'),
                );
              }} />
          </View>
        </SectionCard>
      )}

      {seccion === 'horarios' && (
        <>
          <SectionCard title="Bloques horarios del torneo" emoji="🗓️">
            {bloques.map((b) => (
              editandoBloque === b.id ? (
                <View key={b.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                  <NuevoBloque
                    initial={{ fecha: b.fecha, hora_inicio: b.hora_inicio, hora_fin: b.hora_fin, etiqueta: b.etiqueta }}
                    submitLabel="💾 Guardar cambios"
                    onCancel={() => setEditandoBloque(null)}
                    onAdd={(v) => { setEditandoBloque(null); run(() => updateBloque(b.id, v), 'Bloque actualizado'); }}
                  />
                </View>
              ) : (
              <View key={b.id} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.neutral[800] }}>
                    {b.etiqueta || b.fecha}
                  </Text>
                  <Text style={s.small}>{b.fecha} · {b.hora_inicio.slice(0, 5)} a {b.hora_fin.slice(0, 5)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <MiniBtn label="✏️" color={colors.primary[600]} onPress={() => setEditandoBloque(b.id)} />
                  <MiniBtn label="🗑" color={colors.error} onPress={() => run(() => deleteBloque(b.id), 'Bloque eliminado')} />
                </View>
              </View>
              )
            ))}
            <NuevoBloque onAdd={(b) => run(() => addBloque({ ...b, edicion_id: edicion.id }), 'Bloque agregado')} />
          </SectionCard>


          <SectionCard title="Canchas por disciplina" emoji="🥅">
            {disciplinas.map((d) => (
              <View key={d.id} style={{ marginBottom: spacing.md }}>
                <Text style={{ fontWeight: '800', color: colors.primary[700], marginBottom: 4 }}>{d.emoji} {d.nombre}</Text>
                {canchas.filter((c) => c.disciplina_id === d.id).map((c) => (
                  <CanchaRow
                    key={c.id}
                    cancha={c}
                    onRename={(nombre) => run(() => renameCancha(c.id, nombre), 'Cancha actualizada')}
                    onDelete={() => run(() => deleteCancha(c.id), 'Cancha eliminada')}
                  />
                ))}
                <NuevaCancha onAdd={(nombre) => run(() => addCancha(d.id, nombre, canchas.filter((c) => c.disciplina_id === d.id).length + 1), 'Cancha agregada')} />
              </View>
            ))}
          </SectionCard>

          <SectionCard title="Organizador automático" emoji="🤖">
            <Text style={[s.small, { marginBottom: spacing.md }]}>
              Asigna día, hora y cancha a todos los partidos de las disciplinas activas, evitando que un pueblo
              juegue dos partidos a la vez y que se solapen las canchas. Los partidos ya finalizados no se tocan.
            </Text>
            <View style={{ backgroundColor: colors.primary[50], padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md }}>
              <Text style={{ fontWeight: '800', color: colors.primary[800], marginBottom: 4 }}>Orden para organizar el torneo</Text>
              <Text style={s.small}>1. Equipos con zonas → 2. Generar fixtures → 3. Revisar bloques y canchas → 4. Programar todo</Text>
              <Text style={[s.small, { marginTop: 6 }]}>
                Estado: {partidos.length} partidos creados · {partidosProgramados} con horario · {bloques.length} bloques · {canchas.length} canchas
              </Text>
            </View>

            <View style={{ backgroundColor: colors.surface.light, borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
              <Text style={{ fontWeight: '800', color: colors.neutral[800], marginBottom: 4 }}>⚙️ Reglas de descanso</Text>
              <Text style={[s.small, { marginBottom: spacing.sm }]}>
                Si te quedan partidos sin horario aunque sobre tiempo, suele ser por estas reglas. Aflojalas y volvé a programar.
              </Text>
              <Text style={s.small}>Máximo de partidos por pueblo por día</Text>
              <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden', marginBottom: 10 }}>
                <Picker selectedValue={maxDiaPueblo} onValueChange={(v) => setMaxDiaPueblo(String(v))} style={{ height: 48, color: colors.neutral[800] }}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((v) => (
                    <Picker.Item key={v} label={`${v} partidos por día`} value={v} />
                  ))}
                </Picker>
              </View>
              <Text style={s.small}>Descanso mínimo entre partidos del mismo pueblo</Text>
              <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden' }}>
                <Picker selectedValue={descansoMin} onValueChange={(v) => setDescansoMin(String(v))} style={{ height: 48, color: colors.neutral[800] }}>
                  {Array.from({ length: 13 }, (_, i) => String(i * 5)).map((v) => (
                    <Picker.Item key={v} label={v === '0' ? 'Sin descanso mínimo' : `${v} minutos`} value={v} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <MiniBtn label="📋 Generar todos los fixtures" color={colors.success}
                onPress={generarTodosLosFixtures} disabled={busy} />
              <MiniBtn label="🤖 Programar todo" color={colors.primary[600]}
                onPress={() => programar(true)} disabled={busy} />
              <MiniBtn label="➕ Programar solo los pendientes" color={colors.info}
                onPress={() => programar(false)} disabled={busy} />
              <MiniBtn label="🧹 Borrar todos los horarios" color={colors.error}
                onPress={borrarHorarios} disabled={busy} />
            </View>
            <Text style={[s.small, { marginTop: spacing.sm }]}>
              “Borrar todos los horarios” deja todos los partidos sin día, hora ni cancha para empezar
              la programación desde cero (no borra los partidos ni los resultados).
            </Text>

          </SectionCard>

          {ultimoProg && Number(ultimoProg.sin_horario || 0) > 0 && (
            <SectionCard title="Partidos sin horario" emoji="⚠️">
              <Text style={[s.small, { marginBottom: spacing.md }]}>
                Quedaron {ultimoProg.sin_horario} partidos sin lugar. Ampliá los bloques horarios,
                agregá canchas o reducí la duración de los partidos.
              </Text>
              {(ultimoProg.resumen ?? []).filter((r: any) => Number(r.sin_horario) > 0).map((r: any, i: number) => (
                <View key={i} style={{ backgroundColor: colors.primary[50], padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }}>
                  <Text style={{ fontWeight: '800', color: colors.primary[800] }}>{r.disciplina}</Text>
                  <Text style={s.small}>
                    {r.sin_horario} sin horario · {r.programados} programados · {r.minutos_por_partido} min por partido ·
                    {' '}{r.canchas} cancha/s · necesita {Math.round(Number(r.minutos_necesarios || 0))} min y hay {Math.round(Number(r.minutos_disponibles || 0))} min disponibles
                  </Text>
                </View>
              ))}
              {(ultimoProg.pendientes ?? []).map((p: any) => (
                <Text key={p.partido_id} style={[s.small, { marginBottom: 2 }]}>
                  • {p.disciplina} — {p.fase}{p.zona ? ` (Zona ${p.zona})` : ''} · Fecha {p.ronda}: {p.equipo_a} vs {p.equipo_b}{p.motivo ? ` — ${p.motivo}` : ''}
                </Text>
              ))}
            </SectionCard>
          )}


          <SectionCard title="Partidos por día y disciplina" emoji="📅">
            <PartidosPorDia partidos={partidos} disciplinas={disciplinas} />
          </SectionCard>

          <SectionCard title="Reprogramar por atrasos" emoji="⏰">
            <Text style={[s.small, { marginBottom: spacing.md }]}>
              Si un partido se atrasa, elegí desde qué partido corregir y cuántos minutos correr.
              Se desplaza ese partido y todos los que vienen después (los finalizados no se tocan).
            </Text>
            <CorrerHorarios
              partidos={partidos.filter((p) => p.inicio && p.estado !== 'finalizado')}
              disciplinas={disciplinas}
              onRun={(pid, mins, soloCancha) =>
                run(() => correrHorarios(pid, mins, soloCancha), 'Horarios actualizados')}
              disabled={busy}
            />
          </SectionCard>
        </>
      )}


      {seccion === 'resultados' && disc && (
        <SectionCard title={`Resultados — ${disc.nombre}`} emoji="📝">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
            <MiniBtn label="⏭️ Actualizar clasificados / llaves" color={colors.info}
              onPress={() => run(() => resolverAvances(disc.id), 'Llaves actualizadas')} />
          </View>
          {partidosDisc.length === 0 && <Text style={s.small}>No hay partidos generados.</Text>}
          {partidosDisc.map((p) => (
            <PartidoEditor key={p.id} partido={p} onSaved={load} usaSets={disc.usa_sets} />
          ))}
        </SectionCard>
      )}
    </View>
  );
}

// ---------- Resumen: partidos por día y disciplina ----------
function PartidosPorDia({ partidos, disciplinas }: { partidos: TorneoPartido[]; disciplinas: TorneoDisciplina[] }) {
  const dias = useMemo(() => {
    const map = new Map<string, { iso: string | null; total: number; porDisc: Map<string, number> }>();
    for (const p of partidos) {
      const key = p.inicio ? new Date(p.inicio).toISOString().slice(0, 10) : 'zzz-sin-horario';
      if (!map.has(key)) map.set(key, { iso: p.inicio, total: 0, porDisc: new Map() });
      const e = map.get(key)!;
      if (p.inicio && !e.iso) e.iso = p.inicio;
      e.total += 1;
      e.porDisc.set(p.disciplina_id, (e.porDisc.get(p.disciplina_id) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [partidos]);

  if (!dias.length) return <Text style={s.small}>No hay partidos generados.</Text>;

  return (
    <View>
      {dias.map(([key, e]) => (
        <View key={key} style={{ backgroundColor: colors.primary[50], padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }}>
          <Text style={{ fontWeight: '800', color: colors.primary[800] }}>
            {key === 'zzz-sin-horario' ? '🕓 Sin horario asignado' : fmtDia(e.iso)} — {e.total} partido{e.total === 1 ? '' : 's'}
          </Text>
          {disciplinas
            .filter((d) => (e.porDisc.get(d.id) || 0) > 0)
            .map((d) => (
              <Text key={d.id} style={s.small}>
                • {d.emoji} {d.nombre}: {e.porDisc.get(d.id)} partido{e.porDisc.get(d.id) === 1 ? '' : 's'}
              </Text>
            ))}
        </View>
      ))}
    </View>
  );
}


// ---------- Correr horarios por atrasos ----------
function CorrerHorarios({ partidos, disciplinas, onRun, disabled }: {
  partidos: TorneoPartido[];
  disciplinas: TorneoDisciplina[];
  onRun: (partidoId: string, minutos: number, soloCancha: boolean) => void;
  disabled?: boolean;
}) {
  const ordenados = useMemo(
    () => [...partidos].sort((a, b) => String(a.inicio).localeCompare(String(b.inicio))),
    [partidos]
  );
  const [pid, setPid] = useState('');
  const [mins, setMins] = useState('15');
  const [soloCancha, setSoloCancha] = useState(true);

  useEffect(() => {
    if (!pid && ordenados.length) setPid(ordenados[0].id);
  }, [ordenados.length]);

  const pickerBox = { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden' as const, marginBottom: 10 };
  const pickerStyle = { height: 48, color: colors.neutral[800] };

  if (ordenados.length === 0) {
    return <Text style={s.small}>No hay partidos con horario para reprogramar.</Text>;
  }

  return (
    <View>
      <Text style={[s.small, { marginBottom: 4 }]}>Partido desde el que se corre</Text>
      <View style={pickerBox}>
        <Picker selectedValue={pid} onValueChange={(v) => setPid(String(v))} style={pickerStyle}>
          {ordenados.map((p) => {
            const d = disciplinas.find((x) => x.id === p.disciplina_id);
            const label = `${fmtDia(p.inicio)} ${fmtHora(p.inicio)} · ${d?.emoji ?? ''} ${nombreEquipo(p.equipo_a)} vs ${nombreEquipo(p.equipo_b)}`;
            return <Picker.Item key={p.id} label={label} value={p.id} />;
          })}
        </Picker>
      </View>

      <Text style={[s.small, { marginBottom: 4 }]}>Minutos de atraso</Text>
      <View style={pickerBox}>
        <Picker selectedValue={mins} onValueChange={(v) => setMins(String(v))} style={pickerStyle}>
          {[5, 10, 15, 20, 25, 30, 40, 45, 60, 90, -5, -10, -15, -30].map((v) => (
            <Picker.Item key={v} label={v > 0 ? `Atrasar ${v} min` : `Adelantar ${Math.abs(v)} min`} value={String(v)} />
          ))}
        </Picker>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={[s.text, { flex: 1 }]}>
          {soloCancha ? 'Solo los partidos de esa misma cancha' : 'Todos los partidos de esa disciplina'}
        </Text>
        <Switch value={soloCancha} onValueChange={setSoloCancha} />
      </View>

      <MiniBtn
        label="⏰ Correr horarios"
        color={colors.warning ?? colors.primary[600]}
        disabled={disabled || !pid}
        onPress={() => confirmAction(
          'Correr horarios',
          `Se van a mover los horarios ${Number(mins) > 0 ? `+${mins}` : mins} minutos desde el partido elegido. ¿Continuar?`,
          () => onRun(pid, Number(mins), soloCancha)
        )}
      />
    </View>
  );
}


// ---------- Editor de disciplina ----------
function DisciplinaEditor({ disc, onSave }: { disc: TorneoDisciplina; onSave: (p: Partial<TorneoDisciplina>) => void }) {
  const [form, setForm] = useState(disc);
  useEffect(() => setForm(disc), [disc.id]);

  const num = (k: keyof TorneoDisciplina) => ({
    value: String((form as any)[k] ?? ''),
    keyboardType: 'numeric' as const,
    onChangeText: (t: string) => setForm({ ...form, [k]: Number(t.replace(/[^0-9]/g, '')) || 0 } as any),
  });

  return (
    <SectionCard title={disc.nombre} emoji={disc.emoji}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', color: colors.neutral[800] }}>
          {form.activa ? '✅ Disciplina lanzada' : '⛔ Disciplina no lanzada'}
        </Text>
        <Switch value={form.activa} onValueChange={(v) => setForm({ ...form, activa: v })} />
      </View>

      <Text style={[s.small, { marginBottom: 4 }]}>⏱️ Duración de cada tiempo (son 2 tiempos)</Text>
      <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden', marginBottom: 10 }}>
        <Picker selectedValue={String(form.tiempo_min ?? 0)} onValueChange={(v) => setForm({ ...form, tiempo_min: Number(v) })} style={{ height: 48, color: colors.neutral[800] }}>
          {Array.from({ length: 120 }, (_, i) => i + 1).map((v) => (
            <Picker.Item key={v} label={`${v} min por tiempo`} value={String(v)} />
          ))}
        </Picker>
      </View>

      <Text style={[s.small, { marginBottom: 4 }]}>⏸️ Entretiempo (descanso dentro del partido)</Text>
      <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden', marginBottom: 10 }}>
        <Picker selectedValue={String(form.entretiempo_min ?? 0)} onValueChange={(v) => setForm({ ...form, entretiempo_min: Number(v) })} style={{ height: 48, color: colors.neutral[800] }}>
          {Array.from({ length: 61 }, (_, i) => i).map((v) => (
            <Picker.Item key={v} label={v === 0 ? 'Sin entretiempo' : `${v} min`} value={String(v)} />
          ))}
        </Picker>
      </View>

      <Text style={[s.small, { marginBottom: 4 }]}>😮‍💨 Descanso entre partidos (cambio de equipos)</Text>
      <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden', marginBottom: 10 }}>
        <Picker selectedValue={String(form.buffer_min ?? 0)} onValueChange={(v) => setForm({ ...form, buffer_min: Number(v) })} style={{ height: 48, color: colors.neutral[800] }}>
          {Array.from({ length: 61 }, (_, i) => i).map((v) => (
            <Picker.Item key={v} label={v === 0 ? 'Sin descanso' : `${v} min`} value={String(v)} />
          ))}
        </Picker>
      </View>

      <Text style={[s.small, { marginBottom: 6, fontWeight: '700' }]}>
        Partido: {(form.tiempo_min || 0) * 2 + (form.entretiempo_min || 0)} min
        {'  •  '}Ocupa cancha: {(form.tiempo_min || 0) * 2 + (form.entretiempo_min || 0) + (form.buffer_min || 0)} min
      </Text>

      {([
        ['num_zonas', 'Cantidad de zonas'],
        ['clasifican_por_zona', 'Clasifican por zona'],
        ['puntos_victoria', 'Puntos por victoria'],
        ['puntos_empate', 'Puntos por empate'],
      ] as [keyof TorneoDisciplina, string][]).map(([k, label]) => (
        <View key={String(k)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[s.text, { flex: 1 }]}>{label}</Text>
          <TextInput {...num(k)} style={[s.input, { width: 90, marginBottom: 0, textAlign: 'center' }]} />
        </View>
      ))}


      <MiniBtn label="💾 Guardar" color={colors.success} onPress={() => onSave({
        activa: form.activa,
        tiempo_min: form.tiempo_min,
        entretiempo_min: form.entretiempo_min,
        buffer_min: form.buffer_min,
        num_zonas: form.num_zonas,
        clasifican_por_zona: form.clasifican_por_zona,
        puntos_victoria: form.puntos_victoria,
        puntos_empate: form.puntos_empate,
      })} />

    </SectionCard>
  );
}

// ---------- Form de bloque (alta y edición) ----------
type BloqueValue = Omit<TorneoBloque, 'id' | 'edicion_id'>;
function NuevoBloque({ onAdd, initial, submitLabel, onCancel }: {
  onAdd: (b: BloqueValue) => void;
  initial?: BloqueValue;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const hoy = new Date();
  const [dia, setDia] = useState(initial ? initial.fecha.slice(8, 10) : String(hoy.getDate()).padStart(2, '0'));
  const [mes, setMes] = useState(initial ? initial.fecha.slice(5, 7) : String(hoy.getMonth() + 1).padStart(2, '0'));
  const [anio, setAnio] = useState(initial ? initial.fecha.slice(0, 4) : String(hoy.getFullYear()));
  const [hiHora, setHiHora] = useState(initial ? initial.hora_inicio.slice(0, 2) : '08');
  const [hiMin, setHiMin] = useState(initial ? initial.hora_inicio.slice(3, 5) : '00');
  const [hfHora, setHfHora] = useState(initial ? initial.hora_fin.slice(0, 2) : '11');
  const [hfMin, setHfMin] = useState(initial ? initial.hora_fin.slice(3, 5) : '30');
  const [et, setEt] = useState(initial?.etiqueta ?? '');
  const dias = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const meses = [
    ['01', 'Enero'], ['02', 'Febrero'], ['03', 'Marzo'], ['04', 'Abril'],
    ['05', 'Mayo'], ['06', 'Junio'], ['07', 'Julio'], ['08', 'Agosto'],
    ['09', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre'],
  ];
  const anios = Array.from({ length: 5 }, (_, i) => String(hoy.getFullYear() + i));
  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutos = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  const pickerStyle = { height: 48, color: colors.neutral[800] };
  const pickerBox = { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, backgroundColor: colors.surface.light, overflow: 'hidden' as const };
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[s.label, { marginBottom: 4 }]}>{initial ? 'Editar bloque' : 'Agregar bloque'}</Text>
      <Text style={[s.small, { marginBottom: 4 }]}>Fecha</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <View style={[pickerBox, { width: 82 }]}><Picker selectedValue={dia} onValueChange={setDia} style={pickerStyle}>{dias.map((v) => <Picker.Item key={v} label={v} value={v} />)}</Picker></View>
        <View style={[pickerBox, { flex: 1, minWidth: 150 }]}><Picker selectedValue={mes} onValueChange={setMes} style={pickerStyle}>{meses.map(([v, label]) => <Picker.Item key={v} label={label} value={v} />)}</Picker></View>
        <View style={[pickerBox, { width: 110 }]}><Picker selectedValue={anio} onValueChange={setAnio} style={pickerStyle}>{anios.map((v) => <Picker.Item key={v} label={v} value={v} />)}</Picker></View>
      </View>
      <Text style={[s.small, { marginBottom: 4 }]}>Hora de inicio</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={[pickerBox, { width: 95 }]}><Picker selectedValue={hiHora} onValueChange={setHiHora} style={pickerStyle}>{horas.map((v) => <Picker.Item key={v} label={`${v} h`} value={v} />)}</Picker></View>
        <View style={[pickerBox, { width: 95 }]}><Picker selectedValue={hiMin} onValueChange={setHiMin} style={pickerStyle}>{minutos.map((v) => <Picker.Item key={v} label={`${v} min`} value={v} />)}</Picker></View>
      </View>
      <Text style={[s.small, { marginBottom: 4 }]}>Hora de fin</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={[pickerBox, { width: 95 }]}><Picker selectedValue={hfHora} onValueChange={setHfHora} style={pickerStyle}>{horas.map((v) => <Picker.Item key={v} label={`${v} h`} value={v} />)}</Picker></View>
        <View style={[pickerBox, { width: 95 }]}><Picker selectedValue={hfMin} onValueChange={setHfMin} style={pickerStyle}>{minutos.map((v) => <Picker.Item key={v} label={`${v} min`} value={v} />)}</Picker></View>
      </View>
      <TextInput placeholder="Etiqueta opcional (ej. Domingo mañana)" value={et} onChangeText={setEt} style={[s.input, { marginBottom: 8 }]} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <MiniBtn label={submitLabel || '➕ Agregar bloque'} color={colors.success} onPress={() => {
          const fechaOk = `${anio}-${mes}-${dia}`;
          const fechaReal = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
          if (fechaReal.getUTCMonth() !== Number(mes) - 1 || fechaReal.getUTCDate() !== Number(dia)) {
            notify('Fecha inválida', 'El día seleccionado no existe en ese mes. Elegí otra fecha.');
            return;
          }
          const hiOk = `${hiHora}:${hiMin}`;
          const hfOk = `${hfHora}:${hfMin}`;
          if (hfOk <= hiOk) {
            notify('Horario inválido', 'La hora de fin debe ser posterior a la hora de inicio.');
            return;
          }
          onAdd({ fecha: fechaOk, hora_inicio: hiOk, hora_fin: hfOk, etiqueta: et.trim() || null });
          if (!initial) setEt('');
        }} />
        {onCancel && <MiniBtn label="Cancelar" color={colors.text.secondary} onPress={onCancel} />}
      </View>
    </View>
  );
}


function CanchaRow({ cancha, onRename, onDelete }: { cancha: TorneoCancha; onRename: (nombre: string) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [n, setN] = useState(cancha.nombre);
  if (edit) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
        <TextInput value={n} onChangeText={setN} style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} />
        <MiniBtn label="💾" color={colors.success} onPress={() => { if (n.trim()) { onRename(n.trim()); setEdit(false); } }} />
        <MiniBtn label="✖" color={colors.text.secondary} onPress={() => { setN(cancha.nombre); setEdit(false); }} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={s.text}>• {cancha.nombre}</Text>
      <View style={{ flexDirection: 'row' }}>
        <MiniBtn label="✏️" color={colors.primary[600]} onPress={() => setEdit(true)} />
        <MiniBtn label="🗑" color={colors.error} onPress={onDelete} />
      </View>
    </View>
  );
}

function NuevaCancha({ onAdd }: { onAdd: (nombre: string) => void }) {
  const [n, setN] = useState('');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <TextInput placeholder="Nombre de cancha" value={n} onChangeText={setN}
        style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} />
      <MiniBtn label="➕" color={colors.success} onPress={() => { if (n.trim()) { onAdd(n.trim()); setN(''); } }} />
    </View>
  );
}

// ---------- Editor de partido ----------
function PartidoEditor({ partido, onSaved, usaSets }: { partido: TorneoPartido; onSaved: () => void; usaSets: boolean }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(partido.marcador_a?.toString() ?? '');
  const [b, setB] = useState(partido.marcador_b?.toString() ?? '');
  const [sets, setSets] = useState(partido.detalle_sets ?? '');
  const [mvp, setMvp] = useState(partido.mvp_nombre ?? '');
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<TorneoEvento[]>([]);
  const [jug, setJug] = useState('');
  const [jugEquipo, setJugEquipo] = useState<string | null>(null);

  const nomA = partido.equipo_a ? nombreEquipo(partido.equipo_a as any) : (partido.etiqueta_a || 'A definir');
  const nomB = partido.equipo_b ? nombreEquipo(partido.equipo_b as any) : (partido.etiqueta_b || 'A definir');

  useEffect(() => { if (open) fetchEventos(partido.id).then(setEventos).catch(() => {}); }, [open, partido.id]);

  async function guardar(estado: string) {
    setSaving(true);
    try {
      await updatePartido(partido.id, {
        marcador_a: a === '' ? null : Number(a),
        marcador_b: b === '' ? null : Number(b),
        detalle_sets: sets || null,
        mvp_nombre: mvp || null,
        estado,
      } as any);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.sm, padding: 10, marginBottom: 8 }}>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: '700' }}>
          {FASE_LABEL[partido.fase] ?? partido.fase}{partido.zona ? ` · Zona ${partido.zona}` : ''} · {fmtDia(partido.inicio)} {fmtHora(partido.inicio)} · {partido.cancha?.nombre ?? 'sin cancha'}
        </Text>
        <Text style={{ fontWeight: '800', color: colors.neutral[800], marginTop: 2 }}>
          {nomA} {partido.marcador_a ?? '-'} : {partido.marcador_b ?? '-'} {nomB}
        </Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput value={a} onChangeText={setA} keyboardType="numeric" placeholder="0"
              style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
            <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
            <TextInput value={b} onChangeText={setB} keyboardType="numeric" placeholder="0"
              style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
          </View>
          {usaSets && (
            <TextInput value={sets} onChangeText={setSets} placeholder="Sets: 25-20 / 23-25 / 15-11"
              style={[s.input, { marginBottom: 8 }]} />
          )}
          <TextInput value={mvp} onChangeText={setMvp} placeholder="MVP del partido" style={[s.input, { marginBottom: 8 }]} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <MiniBtn label="✅ Finalizar" color={colors.success} disabled={saving} onPress={() => guardar('finalizado')} />
            <MiniBtn label="🔴 En juego" color={colors.warning} disabled={saving} onPress={() => guardar('en_juego')} />
            <MiniBtn label="🕒 Programado" color={colors.neutral[500]} disabled={saving} onPress={() => guardar('programado')} />
            <MiniBtn label="⛔ Suspender" color={colors.error} disabled={saving} onPress={() => guardar('suspendido')} />
          </View>

          {/* Goleadores */}
          {(partido.equipo_a_id || partido.equipo_b_id) && (
            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 8 }}>
              <Text style={[s.label, { marginBottom: 4 }]}>Goles / puntos destacados</Text>
              {eventos.map((ev) => (
                <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.small}>⚽ {ev.jugador} ({ev.cantidad})</Text>
                  <Pressable onPress={async () => { await deleteEvento(ev.id); setEventos(await fetchEventos(partido.id)); }}>
                    <Text style={{ color: colors.error, fontSize: 12 }}>Quitar</Text>
                  </Pressable>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <TextInput value={jug} onChangeText={setJug} placeholder="Nombre del jugador"
                  style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {partido.equipo_a_id && (
                  <MiniBtn label={`+ ${nomA}`} color={colors.primary[600]} onPress={async () => {
                    if (!jug.trim()) return;
                    await addEvento({ partido_id: partido.id, equipo_id: partido.equipo_a_id!, jugador: jug.trim(), tipo: 'gol', cantidad: 1, minuto: null });
                    setJug(''); setEventos(await fetchEventos(partido.id));
                  }} />
                )}
                {partido.equipo_b_id && (
                  <MiniBtn label={`+ ${nomB}`} color={colors.primary[600]} onPress={async () => {
                    if (!jug.trim()) return;
                    await addEvento({ partido_id: partido.id, equipo_id: partido.equipo_b_id!, jugador: jug.trim(), tipo: 'gol', cantidad: 1, minuto: null });
                    setJug(''); setEventos(await fetchEventos(partido.id));
                  }} />
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
