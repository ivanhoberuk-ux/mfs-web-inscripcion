// FILE: app/operador.tsx
// Área de operadores de cancha: login propio y carga de resultados en vivo
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { s, colors } from '../src/lib/theme';
import { radius, spacing } from '../src/lib/designSystem';
import { PartidoEditor } from '../src/components/PartidoEditor';
import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoPartido, type TorneoCancha,
  fetchEdicionActiva, fetchDisciplinas, fetchPartidos, fetchCanchas,
  fmtDia, fmtHora, claveDia,
} from '../src/lib/torneo';

export default function Operador() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  // login
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // datos
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [edicion, setEdicion] = useState<TorneoEdicion | null>(null);
  const [disciplinas, setDisciplinas] = useState<TorneoDisciplina[]>([]);
  const [canchas, setCanchas] = useState<TorneoCancha[]>([]);
  const [partidos, setPartidos] = useState<TorneoPartido[]>([]);
  const [canchaSel, setCanchaSel] = useState<string | 'todas'>('todas');
  const [soloPendientes, setSoloPendientes] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }: any) => { if (mounted) { setSession(data.session ?? null); setChecking(false); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, sess: any) => { if (mounted) setSession(sess ?? null); });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  // Verificar rol operador (o super admin)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.user) { setAutorizado(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
      const roles = (data ?? []).map((r: any) => r.role);
      if (mounted) setAutorizado(roles.includes('operador') || roles.includes('admin'));
    })();
    return () => { mounted = false; };
  }, [session]);

  const load = useCallback(async () => {
    const ed = await fetchEdicionActiva();
    setEdicion(ed);
    if (!ed) { setDisciplinas([]); setPartidos([]); setCanchas([]); return; }
    const ds = (await fetchDisciplinas(ed.id)).filter((d) => d.activa);
    setDisciplinas(ds);
    const ids = ds.map((d) => d.id);
    setCanchas(await fetchCanchas(ids));
    setPartidos(await fetchPartidos(ids));
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [autorizado, load]);

  // Live: si otro operador carga algo, se refresca
  useEffect(() => {
    if (!autorizado) return;
    const channel = supabase
      .channel('operador-partidos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneo_partidos' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [autorizado, load]);

  const discMap = useMemo(() => new Map(disciplinas.map((d) => [d.id, d])), [disciplinas]);

  const lista = useMemo(() => {
    let out = partidos;
    if (canchaSel !== 'todas') out = out.filter((p) => p.cancha_id === canchaSel);
    if (soloPendientes) out = out.filter((p) => p.estado !== 'finalizado');
    return [...out].sort((a, b) => (a.inicio ?? 'zzz').localeCompare(b.inicio ?? 'zzz'));
  }, [partidos, canchaSel, soloPendientes]);

  const porDia = useMemo(() => {
    const map = new Map<string, TorneoPartido[]>();
    for (const p of lista) {
      const k = claveDia(p.inicio);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [lista]);

  async function entrar() {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) setErr(error.message);
    setBusy(false);
  }

  if (checking) {
    return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator size="large" /></View>;
  }

  // ---------- Login propio del área de operadores ----------
  if (!session?.user) {
    return (
      <ScrollView style={[s.screen, { backgroundColor: colors.background.light }]} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={s.title}>🎛️ Área de operadores</Text>
        <Text style={[s.subtitle, { marginBottom: spacing.md }]}>
          Acceso exclusivo para la carga de resultados del torneo.
        </Text>
        <View style={s.card}>
          <Text style={s.label}>Usuario (email)</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            placeholder="operadores@..." style={s.input} />
          <Text style={s.label}>Contraseña</Text>
          <TextInput value={pass} onChangeText={setPass} secureTextEntry placeholder="••••••••" style={s.input} />
          {err && <Text style={{ color: colors.error, marginBottom: 8 }}>{err}</Text>}
          <Pressable onPress={entrar} disabled={busy} style={{
            backgroundColor: busy ? colors.neutral[300] : colors.primary[600],
            paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'Ingresando…' : 'Ingresar'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (!autorizado) {
    return (
      <ScrollView style={[s.screen, { backgroundColor: colors.background.light }]} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={s.title}>🎛️ Área de operadores</Text>
        <View style={s.card}>
          <Text style={s.text}>
            Esta cuenta ({session.user.email}) no tiene permisos de operador. Pedí al administrador que te habilite.
          </Text>
          <Pressable onPress={() => supabase.auth.signOut()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.primary[600], fontWeight: '800' }}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background.light }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.title}>🎛️ Carga de resultados</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: colors.error, fontWeight: '800', fontSize: 13 }}>Salir</Text>
        </Pressable>
      </View>
      <Text style={[s.subtitle, { marginBottom: spacing.md }]}>
        {edicion ? edicion.nombre : 'Sin edición activa'} · {session.user.email}
      </Text>

      {/* Selector de cancha */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {[{ id: 'todas', nombre: '🎯 Todas las canchas', disciplina_id: '' } as any, ...canchas].map((c: any) => {
          const sel = canchaSel === c.id;
          const d = discMap.get(c.disciplina_id);
          return (
            <Pressable key={c.id} onPress={() => setCanchaSel(c.id)} style={{
              paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, borderRadius: radius.full,
              backgroundColor: sel ? colors.primary[600] : '#fff',
              borderWidth: 2, borderColor: sel ? colors.primary[600] : colors.neutral[200],
            }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: sel ? '#fff' : colors.neutral[700] }}>
                {d ? `${d.emoji} ` : ''}{c.nombre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable onPress={() => setSoloPendientes(!soloPendientes)} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.primary[700], fontWeight: '700', fontSize: 13 }}>
          {soloPendientes ? '☑️ Ocultando partidos finalizados' : '⬜ Mostrando todos los partidos'}
        </Text>
      </Pressable>

      {loading && <ActivityIndicator size="large" />}

      {!loading && lista.length === 0 && (
        <View style={s.card}><Text style={s.text}>No hay partidos para esta cancha.</Text></View>
      )}

      {porDia.map(([dia, grupo]) => (
        <View key={dia} style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
            {fmtDia(grupo[0].inicio)}
          </Text>
          {grupo.map((p) => (
            <View key={p.id} style={[s.card, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: '700', marginBottom: 4 }}>
                🕒 {fmtHora(p.inicio)} · {discMap.get(p.disciplina_id)?.nombre ?? ''}
              </Text>
              <PartidoEditor
                partido={p}
                usaSets={!!discMap.get(p.disciplina_id)?.usa_sets}
                onSaved={load}
              />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
