// FILE: src/components/TorneoEquipoDetalle.tsx
// Delegado (contacto privado) y jugadores de un equipo. Lo usan los coordinadores de pueblo y el super admin.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { s, colors } from '../lib/theme';
import { radius } from '../lib/designSystem';
import { spacing } from '../lib/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { InitialAvatar } from './PageHeader';
import { avisar, confirmar } from '../lib/dialogs';
import {
  type TorneoEquipo, type TorneoContacto, type TorneoJugador, type MisioneroMin,
  fetchContactos, guardarContacto, fetchJugadores, addJugador, deleteJugador, fetchMisionerosConfirmados,
} from '../lib/torneo';

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

export function TorneoEquipoDetalle({
  equipo, anio, editable, permitirNombreLibre = false, onChanged,
}: {
  equipo: TorneoEquipo;
  anio: number;
  editable: boolean;
  permitirNombreLibre?: boolean;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [contacto, setContacto] = useState<TorneoContacto>({ equipo_id: equipo.id, delegado_nombre: '', delegado_telefono: '' });
  const [jugadores, setJugadores] = useState<TorneoJugador[]>([]);
  const [misioneros, setMisioneros] = useState<MisioneroMin[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [libre, setLibre] = useState('');
  const [busy, setBusy] = useState(false);

  async function cargar() {
    const [cs, js] = await Promise.all([fetchContactos([equipo.id]), fetchJugadores([equipo.id])]);
    setContacto(cs[0] ?? { equipo_id: equipo.id, delegado_nombre: '', delegado_telefono: '' });
    setJugadores(js);
  }

  useEffect(() => {
    setLoading(true);
    cargar().catch((e) => avisar('Error', e?.message ?? String(e))).finally(() => setLoading(false));
  }, [equipo.id]);

  useEffect(() => {
    if (!editable) return;
    fetchMisionerosConfirmados(equipo.pueblo_id, anio).then(setMisioneros).catch(() => setMisioneros([]));
  }, [editable, equipo.pueblo_id, anio]);

  const yaAnotados = useMemo(() => new Set(jugadores.map((j) => j.registro_id).filter(Boolean)), [jugadores]);
  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q || !misioneros) return [];
    return misioneros
      .filter((m) => !yaAnotados.has(m.id))
      .filter((m) => `${m.nombres} ${m.apellidos} ${m.ci}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [busqueda, misioneros, yaAnotados]);

  async function hacer(fn: () => Promise<any>) {
    setBusy(true);
    try { await fn(); await cargar(); onChanged?.(); }
    catch (e: any) { avisar('Error', e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <ActivityIndicator style={{ marginVertical: 8 }} />;

  return (
    <View style={{ marginTop: 12, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[100] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Ionicons name="person-outline" size={19} color={colors.primary[600]} /><Text style={s.cardTitle}>Delegado del equipo</Text></View>
      {editable ? (
        <>
          <TextInput value={contacto.delegado_nombre ?? ''} placeholder="Nombre del delegado"
            onChangeText={(t) => setContacto({ ...contacto, delegado_nombre: t })} style={[s.input, { marginBottom: 6 }]} />
          <TextInput value={contacto.delegado_telefono ?? ''} placeholder="Teléfono" keyboardType="phone-pad"
            onChangeText={(t) => setContacto({ ...contacto, delegado_telefono: t })} style={[s.input, { marginBottom: 6 }]} />
          <Btn label="💾 Guardar delegado" color={colors.success} disabled={busy} onPress={() => hacer(() => guardarContacto({
            equipo_id: equipo.id,
            delegado_nombre: (contacto.delegado_nombre ?? '').trim() || null,
            delegado_telefono: (contacto.delegado_telefono ?? '').trim() || null,
          }))} />
        </>
      ) : (
        <Text style={[s.small, { marginBottom: 8 }]}>
          {contacto.delegado_nombre || 'Sin delegado'}{contacto.delegado_telefono ? ` · 📞 ${contacto.delegado_telefono}` : ''}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6 }}><Ionicons name="people-outline" size={19} color={colors.primary[600]} /><Text style={s.cardTitle}>Jugadores ({jugadores.length})</Text></View>
      {jugadores.length === 0 && <Text style={s.small}>Todavía no hay jugadores cargados.</Text>}
      {jugadores.map((j) => (
        <View key={j.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, gap: 10 }}><InitialAvatar name={j.nombre} tone="mint" />
          <Text style={[s.text, { flex: 1 }]}>{j.nombre}{!j.registro_id ? ' (nombre libre)' : ''}</Text>
          {editable && (
            <Pressable disabled={busy} onPress={() => confirmar('Quitar jugador', `¿Quitar a ${j.nombre} del equipo?`, () => hacer(() => deleteJugador(j.id)))}>
              <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>Quitar</Text>
            </Pressable>
          )}
        </View>
      ))}

      {editable && (
        <View style={{ marginTop: 8 }}>
          <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="🔎 Buscar misionero confirmado (nombre o CI)"
            style={[s.input, { marginBottom: 6 }]} />
          {misioneros === null && <ActivityIndicator />}
          {misioneros && misioneros.length === 0 && (
            <Text style={s.small}>No hay misioneros confirmados de este pueblo para {anio}.</Text>
          )}
          {resultados.map((m) => (
            <Pressable key={m.id} disabled={busy} onPress={() => hacer(async () => { await addJugador(equipo.id, m.id, `${m.nombres} ${m.apellidos}`); setBusqueda(''); })}
              style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.surface.light, borderRadius: radius.md, marginBottom: 4, borderWidth: 1, borderColor: colors.primary[100] }}>
              <Text style={{ fontWeight: '700', color: colors.neutral[800] }}>{m.nombres} {m.apellidos}</Text>
              <Text style={s.small}>CI {m.ci}</Text>
            </Pressable>
          ))}
          {busqueda.trim() !== '' && misioneros && resultados.length === 0 && (
            <Text style={s.small}>Sin resultados.</Text>
          )}

          {permitirNombreLibre && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <TextInput value={libre} onChangeText={setLibre} placeholder="Nombre libre (solo super admin)"
                style={[s.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} />
              <Btn label="➕" color={colors.neutral[600]} disabled={busy || !libre.trim()}
                onPress={() => hacer(async () => { await addJugador(equipo.id, null, libre.trim()); setLibre(''); })} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default TorneoEquipoDetalle;
