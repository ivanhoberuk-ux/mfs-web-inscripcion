// FILE: src/components/PartidoEditor.tsx
// Editor de resultados de un partido (usado por el panel admin y por el área de operadores)
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { s, colors } from '../lib/theme';
import { radius } from '../lib/designSystem';
import {
  type TorneoPartido, type TorneoEvento,
  updatePartido, fetchEventos, addEvento, deleteEvento, resolverAvances,
  nombreEquipo, fmtDia, fmtHora, FASE_LABEL,
} from '../lib/torneo';

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

export function PartidoEditor({
  partido, onSaved, usaSets, defaultOpen = false,
}: { partido: TorneoPartido; onSaved: () => void; usaSets: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [a, setA] = useState(partido.marcador_a?.toString() ?? '');
  const [b, setB] = useState(partido.marcador_b?.toString() ?? '');
  const [sets, setSets] = useState(partido.detalle_sets ?? '');
  // Parciales por set (para vóley: 2 sets de 15 + desempate de 7)
  const [parciales, setParciales] = useState<{ a: string; b: string }[]>(() => {
    const base = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }];
    (partido.detalle_sets ?? '').split('/').forEach((seg, i) => {
      const m = seg.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      if (m && i < 3) base[i] = { a: m[1], b: m[2] };
    });
    return base;
  });

  function setParcial(i: number, campo: 'a' | 'b', val: string) {
    const next = parciales.map((p, idx) => (idx === i ? { ...p, [campo]: val.replace(/[^0-9]/g, '') } : p));
    setParciales(next);
    const jugados = next.filter((p) => p.a !== '' && p.b !== '');
    setSets(jugados.map((p) => `${p.a}-${p.b}`).join(' / '));
    setA(String(jugados.filter((p) => Number(p.a) > Number(p.b)).length));
    setB(String(jugados.filter((p) => Number(p.b) > Number(p.a)).length));
  }

  const [mvp, setMvp] = useState(partido.mvp_nombre ?? '');
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<TorneoEvento[]>([]);
  const [jug, setJug] = useState('');

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
      // Al finalizar un partido, recalcular clasificados y llenar llaves (SF1 vs SF2, etc.)
      if (estado === 'finalizado') {
        try { await resolverAvances(partido.disciplina_id); } catch { /* no bloquear el guardado */ }
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const enJuego = partido.estado === 'en_juego';

  return (
    <View style={{
      borderWidth: enJuego ? 2 : 1,
      borderColor: enJuego ? colors.success : colors.neutral[200],
      backgroundColor: enJuego ? 'rgba(34,197,94,0.12)' : 'transparent',
      borderRadius: radius.sm, padding: 10, marginBottom: 8,
    }}>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: '700' }}>
          {FASE_LABEL[partido.fase] ?? partido.fase}{partido.zona ? ` · Zona ${partido.zona}` : ''} · {fmtDia(partido.inicio)} {fmtHora(partido.inicio)} · {partido.cancha?.nombre ?? 'sin cancha'}
        </Text>
        <Text style={{ fontWeight: '800', color: colors.neutral[800], marginTop: 2 }}>
          {enJuego ? '🟢 ' : ''}{nomA} {partido.marcador_a ?? '-'} : {partido.marcador_b ?? '-'} {nomB}
        </Text>
        {enJuego && (
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.success, marginTop: 2 }}>EN JUEGO AHORA</Text>
        )}
      </Pressable>

      {open && (
        <View style={{ marginTop: 10 }}>
          {usaSets ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={[s.label, { marginBottom: 4 }]}>Parciales por set</Text>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 6 }}>
                Los primeros 2 sets se juegan hasta 15 puntos. El desempate (3er set) se juega hasta 7 puntos.
              </Text>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ width: 92, fontSize: 12, fontWeight: '700', color: colors.neutral[600] }}>
                    {i === 2 ? 'Desempate' : `Set ${i + 1}`}
                  </Text>
                  <TextInput value={parciales[i].a} onChangeText={(v) => setParcial(i, 'a', v)} keyboardType="numeric"
                    placeholder="0" style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
                  <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
                  <TextInput value={parciales[i].b} onChangeText={(v) => setParcial(i, 'b', v)} keyboardType="numeric"
                    placeholder="0" style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
                </View>
              ))}
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary[700] }}>
                Sets ganados: {a || 0} - {b || 0}{sets ? `  (${sets})` : ''}
              </Text>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>
                El marcador de la tabla usa los sets ganados. El 3er set solo se completa si hay empate 1-1.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput value={a} onChangeText={setA} keyboardType="numeric" placeholder="0"
                style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
              <Text style={{ marginHorizontal: 10, fontWeight: '800' }}>:</Text>
              <TextInput value={b} onChangeText={setB} keyboardType="numeric" placeholder="0"
                style={[s.input, { width: 60, textAlign: 'center', marginBottom: 0 }]} />
            </View>
          )}

          <TextInput value={mvp} onChangeText={setMvp} placeholder="MVP del partido" style={[s.input, { marginBottom: 8 }]} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <MiniBtn label="💾 Guardar marcador" color={colors.primary[700]} disabled={saving} onPress={() => guardar(partido.estado)} />
            <MiniBtn label="✅ Finalizar" color={colors.success} disabled={saving} onPress={() => guardar('finalizado')} />
            {enJuego
              ? <MiniBtn label="↩️ Deshacer 'En juego'" color={colors.warning} disabled={saving} onPress={() => guardar('programado')} />
              : <MiniBtn label="🔴 En juego" color={colors.warning} disabled={saving} onPress={() => guardar('en_juego')} />}
            <MiniBtn label="🕒 Programado" color={colors.neutral[500]} disabled={saving} onPress={() => guardar('programado')} />
            <MiniBtn label="⛔ Suspender" color={colors.error} disabled={saving} onPress={() => guardar('suspendido')} />
          </View>
          <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 4 }}>
            💾 "Guardar marcador" actualiza el resultado en vivo sin cambiar el estado del partido (ideal mientras se está jugando).
          </Text>

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

export default PartidoEditor;
