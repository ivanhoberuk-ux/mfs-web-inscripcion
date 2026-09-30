// FILE: src/components/PartidoEditor.tsx
// Editor de resultados de un partido (panel admin y área de operadores). Pensado para usar en el celular en la cancha.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { s, colors } from '../lib/theme';
import { radius } from '../lib/designSystem';
import { shadows, spacing, typography } from '../lib/designSystem';
import { Badge } from './Badge';
import { Ionicons } from '@expo/vector-icons';
import { avisar, confirmar } from '../lib/dialogs';
import {
  type TorneoPartido, type TorneoDisciplina,
  updatePartido, sumarPartido, nombreEquipo, fmtDia, fmtHora, FASE_LABEL, ESTADO_LABEL,
} from '../lib/torneo';

function MiniBtn({ label, onPress, color = colors.primary[600], disabled }: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{
      backgroundColor: disabled ? colors.neutral[300] : color,
       minHeight: 48, paddingVertical: 10, paddingHorizontal: 15, borderRadius: radius.md, marginRight: 8, marginBottom: 8, alignItems: 'center', justifyContent: 'center', flexGrow: 1,
    }}>
       <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function BigBtn({ label, onPress, color, disabled }: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{
      minHeight: 56, minWidth: 64, flexGrow: 1, marginHorizontal: 3, marginBottom: 6,
       borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', ...shadows.sm,
      backgroundColor: disabled ? colors.neutral[300] : color,
    }}>
       <Text style={{ color: colors.surface.light, fontFamily: typography.family.extrabold, fontSize: 22 }}>{label}</Text>
    </Pressable>
  );
}

type Parcial = { a: string; b: string };
const OBJETIVO = [15, 15, 7];

function parsearSets(txt: string | null): Parcial[] {
  const base: Parcial[] = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }];
  (txt ?? '').split('/').forEach((seg, i) => {
    const m = seg.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (m && i < 3) base[i] = { a: m[1], b: m[2] };
  });
  return base;
}

/** Evalúa un set: ganador 'a'|'b', null si incompleto/vacío, o un texto de error. */
function evaluarSet(p: Parcial, i: number): { ganador: 'a' | 'b' | null; error?: string } {
  if (p.a === '' || p.b === '') return { ganador: null };
  const a = Number(p.a), b = Number(p.b), obj = OBJETIVO[i];
  const w = Math.max(a, b), l = Math.min(a, b);
  const nombre = i === 2 ? 'El desempate' : `El set ${i + 1}`;
  if (w < obj) return { ganador: null, error: `${nombre} todavía no terminó (se juega a ${obj}).` };
  if (w - l < 2) return { ganador: null, error: `${nombre} se gana por 2 puntos de diferencia.` };
  if (w > obj && w - l !== 2) return { ganador: null, error: `${nombre}: si se pasa de ${obj}, la diferencia final debe ser exactamente 2 (ej. ${obj + 1}-${obj - 1}).` };
  return { ganador: a > b ? 'a' : 'b' };
}

function valoresDe(p: TorneoPartido) {
  return {
    a: p.marcador_a?.toString() ?? '',
    b: p.marcador_b?.toString() ?? '',
    penA: p.penales_a?.toString() ?? '',
    penB: p.penales_b?.toString() ?? '',
    sets: p.detalle_sets ?? '',
    mvp: p.mvp_nombre ?? '',
  };
}
const firma = (p: TorneoPartido) => JSON.stringify([p.marcador_a, p.marcador_b, p.penales_a, p.penales_b, p.detalle_sets, p.mvp_nombre, p.estado]);

export function PartidoEditor({
  partido, onSaved, disciplina, usaSets: usaSetsProp, defaultOpen = false,
}: {
  partido: TorneoPartido;
  onSaved: () => void;
  disciplina?: TorneoDisciplina | null;
  usaSets?: boolean;
  defaultOpen?: boolean;
}) {
  const usaSets = disciplina ? disciplina.usa_sets : !!usaSetsProp;
  const esBasquet = /basq|básq|basket/i.test(`${disciplina?.codigo ?? ''} ${disciplina?.nombre ?? ''}`);
  const permiteEmpate = disciplina ? disciplina.permite_empate : true;
  const eliminatoria = partido.fase !== 'grupos';

  const [open, setOpen] = useState(defaultOpen);
  const [v, setV] = useState(() => valoresDe(partido));
  const [parciales, setParciales] = useState<Parcial[]>(() => parsearSets(partido.detalle_sets));
  const [editando, setEditando] = useState(false); // hay cambios locales sin guardar
  const [aviso, setAviso] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ultimaFirma = useRef(firma(partido));

  // Sincronizar con la base cuando llega un cambio (realtime)
  useEffect(() => {
    const f = firma(partido);
    if (f === ultimaFirma.current) return;
    ultimaFirma.current = f;
    if (editando) setAviso('⚠️ Otro operador actualizó este partido. Se recargaron los valores.');
    setV(valoresDe(partido));
    setParciales(parsearSets(partido.detalle_sets));
    setEditando(false);
  }, [partido]);

  const set = (campo: keyof ReturnType<typeof valoresDe>, val: string) => {
    setEditando(true); setAviso(null);
    setV((prev) => ({ ...prev, [campo]: campo === 'mvp' ? val : val.replace(/[^0-9]/g, '') }));
  };

  // ----- Vóley -----
  const evalSets = useMemo(() => parciales.map((p, i) => evaluarSet(p, i)), [parciales]);
  const ganados = useMemo(() => ({
    a: evalSets.filter((e) => e.ganador === 'a').length,
    b: evalSets.filter((e) => e.ganador === 'b').length,
  }), [evalSets]);
  const tercerBloqueado = evalSets[0].ganador != null && evalSets[0].ganador === evalSets[1].ganador;

  function setParcial(i: number, campo: 'a' | 'b', val: string) {
    setEditando(true); setAviso(null);
    let next = parciales.map((p, idx) => (idx === i ? { ...p, [campo]: val.replace(/[^0-9]/g, '') } : p));
    const e0 = evaluarSet(next[0], 0).ganador, e1 = evaluarSet(next[1], 1).ganador;
    if (e0 && e0 === e1) next = next.map((p, idx) => (idx === 2 ? { a: '', b: '' } : p));
    setParciales(next);
    const jugados = next.filter((p) => p.a !== '' && p.b !== '');
    const ev = next.map((p, idx) => evaluarSet(p, idx).ganador);
    setV((prev) => ({
      ...prev,
      sets: jugados.map((p) => `${p.a}-${p.b}`).join(' / '),
      a: jugados.length ? String(ev.filter((g) => g === 'a').length) : '',
      b: jugados.length ? String(ev.filter((g) => g === 'b').length) : '',
    }));
  }
  const advertenciasSets = evalSets.map((e) => e.error).filter(Boolean) as string[];

  // ----- Validaciones para finalizar -----
  const hayMarcador = v.a !== '' && v.b !== '';
  const empatado = hayMarcador && Number(v.a) === Number(v.b);
  const mostrarPenales = !usaSets && eliminatoria && empatado;
  const motivoNoFinalizar = (() => {
    if (!hayMarcador) return 'Cargá el marcador antes de finalizar.';
    if (usaSets) {
      if (advertenciasSets.length) return advertenciasSets[0];
      if (ganados.a < 2 && ganados.b < 2) return 'Nadie ganó 2 sets todavía: no se puede finalizar.';
      return null;
    }
    if (empatado && eliminatoria) {
      if (v.penA === '' || v.penB === '') return 'Partido de eliminación empatado: cargá los penales / desempate.';
      if (v.penA === v.penB) return 'Los penales no pueden quedar empatados.';
    }
    if (empatado && !eliminatoria && !permiteEmpate) return 'Esta disciplina no permite empates.';
    return null;
  })();

  async function guardar(estado: string) {
    if (estado === 'finalizado' && motivoNoFinalizar) { avisar('No se puede finalizar', motivoNoFinalizar); return; }
    setSaving(true);
    try {
      const conPen = !usaSets && eliminatoria && empatado;
      await updatePartido(partido.id, {
        marcador_a: v.a === '' ? null : Number(v.a),
        marcador_b: v.b === '' ? null : Number(v.b),
        penales_a: conPen && v.penA !== '' ? Number(v.penA) : null,
        penales_b: conPen && v.penB !== '' ? Number(v.penB) : null,
        detalle_sets: usaSets ? (v.sets || null) : partido.detalle_sets,
        mvp_nombre: v.mvp.trim() || null,
        estado,
      } as any);
      setEditando(false); setAviso(null);
      onSaved();
    } catch (e: any) {
      avisar('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function sumar(lado: 'a' | 'b', delta: number) {
    setSaving(true);
    try {
      await sumarPartido(partido.id, lado, delta);
      onSaved();
    } catch (e: any) {
      avisar('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const nomA = partido.equipo_a ? nombreEquipo(partido.equipo_a as any) : (partido.etiqueta_a || 'A definir');
  const nomB = partido.equipo_b ? nombreEquipo(partido.equipo_b as any) : (partido.etiqueta_b || 'A definir');
  const enJuego = partido.estado === 'en_juego';
  const finalizado = partido.estado === 'finalizado';
  const pasos = esBasquet ? [1, 2, 3] : [1];
  const verbo = esBasquet ? 'puntos' : 'goles';

  const columnaEquipo = (lado: 'a' | 'b', nombre: string) => (
     <View style={{ flex: 1 }}>
       <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: lado === 'a' ? colors.primary[100] : colors.accent[100], alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 }}><Text style={{ fontFamily: typography.family.bold, color: lado === 'a' ? colors.primary[700] : colors.accent[700] }}>{nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</Text></View><Text style={{ textAlign: 'center', fontWeight: '800', color: colors.neutral[800], marginBottom: 8 }} numberOfLines={2}>{nombre}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {pasos.map((n) => (
          <BigBtn key={n} label={`+${n}`} color={colors.success} disabled={saving || finalizado} onPress={() => sumar(lado, n)} />
        ))}
      </View>
      <BigBtn label="−1" color={colors.error} disabled={saving || finalizado || Number(lado === 'a' ? partido.marcador_a : partido.marcador_b) <= 0}
        onPress={() => sumar(lado, -1)} />
    </View>
  );

  return (
    <View style={{
       borderWidth: 1, borderColor: enJuego ? colors.mint[500] : colors.primary[100],
       backgroundColor: enJuego ? colors.mint[100] : colors.surface.light,
       borderRadius: radius.lg, padding: spacing.md, marginBottom: 8, ...shadows.sm,
    }}>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: '700' }}>
          {FASE_LABEL[partido.fase] ?? partido.fase}{partido.zona ? ` · Zona ${partido.zona}` : ''} · {fmtDia(partido.inicio)} {fmtHora(partido.inicio)} · {partido.cancha?.nombre ?? 'sin cancha'} · {ESTADO_LABEL[partido.estado] ?? partido.estado}
        </Text>
         <Text style={{ fontFamily: typography.family.bold, color: colors.neutral[800], marginTop: 4 }}>
           {nomA} {partido.marcador_a ?? '-'} : {partido.marcador_b ?? '-'} {nomB}
          {partido.penales_a != null && partido.penales_b != null ? `  (${partido.penales_a}-${partido.penales_b} pen.)` : ''}
        </Text>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary[600]} /><Text style={{ fontSize: 11, color: colors.primary[600], fontWeight: '700' }}>{open ? 'Cerrar' : 'Cargar resultado'}</Text></View>
      </Pressable>

      {open && (
        <View style={{ marginTop: 10 }}>
          {aviso && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', padding: 8, borderRadius: radius.sm, marginBottom: 8 }}>
              <Text style={{ color: colors.neutral[800], fontWeight: '700', fontSize: 12 }}>{aviso}</Text>
            </View>
          )}

          {usaSets ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={[s.label, { marginBottom: 4 }]}>Parciales por set</Text>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 6 }}>
                Sets 1 y 2 a 15 puntos, desempate a 7. Se gana por 2 de diferencia (se puede pasar: ej. 16-14).
              </Text>
              {[0, 1, 2].map((i) => {
                const bloqueado = i === 2 && tercerBloqueado;
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, opacity: bloqueado ? 0.4 : 1 }}>
                    <Text style={{ width: 92, fontSize: 12, fontWeight: '700', color: colors.neutral[600] }}>
                      {i === 2 ? 'Desempate' : `Set ${i + 1}`} {evalSets[i].ganador ? '✅' : ''}
                    </Text>
                    <TextInput editable={!bloqueado && !finalizado} value={parciales[i].a} onChangeText={(t) => setParcial(i, 'a', t)} keyboardType="numeric"
                      placeholder="0" style={[s.input, { width: 64, height: 48, fontSize: 18, textAlign: 'center', marginBottom: 0 }]} />
                    <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
                    <TextInput editable={!bloqueado && !finalizado} value={parciales[i].b} onChangeText={(t) => setParcial(i, 'b', t)} keyboardType="numeric"
                      placeholder="0" style={[s.input, { width: 64, height: 48, fontSize: 18, textAlign: 'center', marginBottom: 0 }]} />
                  </View>
                );
              })}
              {tercerBloqueado && <Text style={{ fontSize: 11, color: colors.neutral[500] }}>No hace falta desempate: alguien ganó 2-0.</Text>}
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary[700], textAlign: 'center', marginVertical: 6 }}>
                Sets: {ganados.a} - {ganados.b}
              </Text>
              {advertenciasSets.map((w, i) => (
                <Text key={i} style={{ fontSize: 12, color: colors.warning, fontWeight: '700' }}>⚠️ {w}</Text>
              ))}
            </View>
          ) : (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {columnaEquipo('a', nomA)}
                <View style={{ paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minWidth: 90 }}>
                   <Text style={{ fontFamily: typography.family.extrabold, fontSize: 46, color: colors.primary[700] }}>
                    {partido.marcador_a ?? 0}-{partido.marcador_b ?? 0}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.neutral[500] }}>{verbo}</Text>
                </View>
                {columnaEquipo('b', nomB)}
              </View>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 4 }}>
                Los botones suman al instante. Si el partido estaba programado, pasa solo a "En juego".
              </Text>

              <Text style={[s.small, { marginTop: 8, marginBottom: 4 }]}>Corrección manual del marcador</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput value={v.a} onChangeText={(t) => set('a', t)} keyboardType="numeric" placeholder="0"
                  style={[s.input, { width: 64, textAlign: 'center', marginBottom: 0 }]} />
                <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
                <TextInput value={v.b} onChangeText={(t) => set('b', t)} keyboardType="numeric" placeholder="0"
                  style={[s.input, { width: 64, textAlign: 'center', marginBottom: 0 }]} />
              </View>

              {mostrarPenales && (
                <View style={{ marginTop: 10, padding: 8, borderRadius: radius.sm, backgroundColor: colors.primary[50] }}>
                  <Text style={[s.label, { marginBottom: 4 }]}>Penales / desempate</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput value={v.penA} onChangeText={(t) => set('penA', t)} keyboardType="numeric" placeholder={nomA.slice(0, 8)}
                      style={[s.input, { width: 80, textAlign: 'center', marginBottom: 0 }]} />
                    <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
                    <TextInput value={v.penB} onChangeText={(t) => set('penB', t)} keyboardType="numeric" placeholder={nomB.slice(0, 8)}
                      style={[s.input, { width: 80, textAlign: 'center', marginBottom: 0 }]} />
                  </View>
                </View>
              )}
            </View>
          )}

           <TextInput value={v.mvp} onChangeText={(t) => set('mvp', t)} placeholder="MVP del partido" style={[s.input, { marginBottom: 8 }]} />

          {motivoNoFinalizar && !finalizado && (
            <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '700', marginBottom: 6 }}>⚠️ {motivoNoFinalizar}</Text>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {finalizado ? (
              <MiniBtn label="↩️ Reabrir" color={colors.warning} disabled={saving}
                onPress={() => confirmar('Reabrir partido', 'El partido volverá a "En juego" para corregir el resultado. ¿Continuar?', () => guardar('en_juego'))} />
            ) : (
              <>
                <MiniBtn label="💾 Guardar" color={colors.primary[700]} disabled={saving} onPress={() => guardar(partido.estado)} />
                <MiniBtn label="✅ Finalizar" color={colors.success} disabled={saving || !!motivoNoFinalizar} onPress={() => guardar('finalizado')} />
                {enJuego
                  ? <MiniBtn label="↩️ Deshacer 'En juego'" color={colors.neutral[500]} disabled={saving} onPress={() => guardar('programado')} />
                  : <MiniBtn label="🔴 En juego" color={colors.warning} disabled={saving} onPress={() => guardar('en_juego')} />}
                <MiniBtn label="⛔ Suspender" color={colors.error} disabled={saving} onPress={() => guardar('suspendido')} />
              </>
            )}
          </View>
          <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
            💾 "Guardar" actualiza los datos sin cambiar el estado del partido.
          </Text>
        </View>
      )}
    </View>
  );
}

export default PartidoEditor;
