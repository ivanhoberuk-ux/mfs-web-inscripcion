// FILE: src/components/TorneoMisEquipos.tsx
// Inscripción de equipos por los coordinadores de pueblo (pueblo_admin / co_admin_pueblo)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { s, colors } from '../lib/theme';
import { radius, spacing } from '../lib/designSystem';
import { avisar, confirmar } from '../lib/dialogs';
import { supabase } from '../lib/supabase';
import { TorneoEquipoDetalle } from './TorneoEquipoDetalle';
import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoEquipo,
  fetchEquipos, updateEquipo, deleteEquipo, inscripcionEquiposAbierta, fmtFechaHoraAsu,
} from '../lib/torneo';

const ESTADO: Record<string, string> = { pendiente: '⏳ Pendiente', aprobado: '✅ Aprobado', rechazado: '❌ Rechazado' };

function Btn({ label, onPress, color = colors.primary[600], disabled }: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{
      backgroundColor: disabled ? colors.neutral[300] : color, paddingVertical: 9, paddingHorizontal: 12,
      borderRadius: radius.sm, marginRight: 8, marginBottom: 8,
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function NombreEquipo({ equipo, editable, onSave }: { equipo: TorneoEquipo; editable: boolean; onSave: (n: string | null) => void }) {
  const [n, setN] = useState(equipo.nombre ?? '');
  useEffect(() => setN(equipo.nombre ?? ''), [equipo.nombre]);
  if (!editable) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
      <TextInput value={n} onChangeText={setN} placeholder="Nombre del equipo (opcional)"
        style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} />
      <Btn label="💾" color={colors.success} disabled={(equipo.nombre ?? '') === n} onPress={() => onSave(n.trim() || null)} />
    </View>
  );
}

export function TorneoMisEquipos({ edicion, disciplinas, puebloId }: {
  edicion: TorneoEdicion; disciplinas: TorneoDisciplina[]; puebloId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState(false);
  const [equipos, setEquipos] = useState<TorneoEquipo[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!puebloId) return;
    const [ab, eq] = await Promise.all([
      inscripcionEquiposAbierta(edicion.id).catch(() => false),
      fetchEquipos(disciplinas.map((d) => d.id)),
    ]);
    setAbierta(ab && !edicion.finalizada);
    setEquipos(eq.filter((e) => e.pueblo_id === puebloId));
  }, [edicion.id, edicion.finalizada, disciplinas, puebloId]);

  useEffect(() => { setLoading(true); load().catch((e) => avisar('Error', e?.message ?? String(e))).finally(() => setLoading(false)); }, [load]);

  async function hacer(fn: () => Promise<any>) {
    setBusy(true);
    try { await fn(); await load(); }
    catch (e: any) { avisar('Error', e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  if (!puebloId) {
    return <View style={s.card}><Text style={s.text}>Tu cuenta no tiene un pueblo asignado.</Text></View>;
  }
  if (loading) return <ActivityIndicator style={{ marginTop: 16 }} />;

  return (
    <View>
      <View style={[s.card, { marginBottom: spacing.md, backgroundColor: abierta ? 'rgba(34,197,94,0.12)' : colors.neutral[100] }]}>
        <Text style={{ fontWeight: '800', color: colors.neutral[800] }}>
          {abierta ? '🟢 Inscripción de equipos abierta' : '🔒 Inscripción de equipos cerrada'}
        </Text>
        <Text style={s.small}>
          {edicion.inscripcion_equipos_desde ? `Desde ${fmtFechaHoraAsu(edicion.inscripcion_equipos_desde)} ` : ''}
          {edicion.inscripcion_equipos_hasta ? `hasta ${fmtFechaHoraAsu(edicion.inscripcion_equipos_hasta)} (hora de Asunción)` : ''}
          {!abierta ? ' · Solo lectura.' : ''}
        </Text>
      </View>

      {disciplinas.map((d) => {
        const eq = equipos.find((e) => e.disciplina_id === d.id);
        return (
          <View key={d.id} style={[s.card, { marginBottom: spacing.md }]}>
            <Text style={s.cardTitle}>{d.emoji} {d.nombre}</Text>
            {!eq ? (
              abierta ? (
                <Btn label="📝 Inscribir equipo" color={colors.success} disabled={busy}
                  onPress={() => hacer(async () => {
                    const { error } = await supabase.from('torneo_equipos').insert({ disciplina_id: d.id, pueblo_id: puebloId } as any);
                    if (error) throw error;
                  })} />
              ) : <Text style={s.small}>Tu pueblo no inscribió equipo en esta disciplina.</Text>
            ) : (
              <View>
                <Text style={{ fontWeight: '800', marginTop: 6, color: colors.neutral[800] }}>
                  {ESTADO[eq.estado_inscripcion] ?? eq.estado_inscripcion}{eq.nombre ? ` · ${eq.nombre}` : ''}
                </Text>
                {eq.estado_inscripcion === 'rechazado' && eq.motivo_rechazo && (
                  <Text style={{ color: colors.error, fontSize: 12 }}>Motivo: {eq.motivo_rechazo}</Text>
                )}
                <NombreEquipo equipo={eq} editable={abierta} onSave={(n) => hacer(() => updateEquipo(eq.id, { nombre: n }))} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  <Btn label={abierto === eq.id ? '▲ Ocultar delegado y jugadores' : '👥 Delegado y jugadores'}
                    onPress={() => setAbierto(abierto === eq.id ? null : eq.id)} />
                  {abierta && eq.estado_inscripcion !== 'aprobado' && (
                    <Btn label="🗑 Quitar inscripción" color={colors.error} disabled={busy}
                      onPress={() => confirmar('Quitar inscripción', `¿Quitar el equipo de ${d.nombre}?`, () => hacer(() => deleteEquipo(eq.id)))} />
                  )}
                </View>
                {abierto === eq.id && (
                  <TorneoEquipoDetalle equipo={eq} anio={edicion.anio} editable={!edicion.finalizada} />
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default TorneoMisEquipos;
