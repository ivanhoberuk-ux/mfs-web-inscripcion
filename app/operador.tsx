// FILE: app/operador.tsx
// Área de operadores de cancha: login propio y carga de resultados en vivo
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, RefreshControl, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { s, colors } from '../src/lib/theme';
import { gradients, radius, shadows, spacing, typography } from '../src/lib/designSystem';
import { PartidoEditor } from '../src/components/PartidoEditor';
import { NandutiDecorativo } from '../src/components/FondoParaguayo';
import { Field } from '../src/components/Field';
import { Button } from '../src/components/Button';
import { PageHeader } from '../src/components/PageHeader';
// @ts-ignore
import logoMfs from '../src/assets/mfs-logo.png';
import { useTorneoPartidosLive } from '../src/hooks/useTorneoPartidosLive';
import { avisar } from '../src/lib/dialogs';
import {
  type TorneoEdicion, type TorneoDisciplina, type TorneoPartido, type TorneoCancha,
  fetchEdicionActiva, fetchDisciplinas, fetchPartidos, fetchCanchas,
  fmtDia, fmtHora, claveDia, resolverAvances,
} from '../src/lib/torneo';

export default function Operador() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
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

  // Live eficiente: solo se vuelve a pedir el partido que cambió
  const { refrescar } = useTorneoPartidosLive({
    enabled: autorizado, channel: 'operador-partidos-live', setPartidos, reloadAll: load,
  });

  const discMap = useMemo(() => new Map(disciplinas.map((d) => [d.id, d])), [disciplinas]);

  const lista = useMemo(() => {
    let out = partidos;
    if (canchaSel !== 'todas') out = out.filter((p) => p.cancha_id === canchaSel);
    if (soloPendientes) out = out.filter((p) => p.estado !== 'finalizado');
    return [...out].sort((a, b) => (a.inicio ?? 'zzz').localeCompare(b.inicio ?? 'zzz'));
  }, [partidos, canchaSel, soloPendientes]);

  const enJuego = useMemo(
    () => partidos.filter((p) => p.estado === 'en_juego' && (canchaSel === 'todas' || p.cancha_id === canchaSel)),
    [partidos, canchaSel],
  );
  const [resolviendo, setResolviendo] = useState(false);
  async function actualizarLlaves(discId: string) {
    setResolviendo(true);
    try { await resolverAvances(discId); await load(); avisar('Listo', 'Llaves actualizadas.'); }
    catch (e: any) { avisar('Error', e?.message ?? String(e)); }
    finally { setResolviendo(false); }
  }

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
      <ScrollView style={[s.screen, { backgroundColor: colors.background.light }]} contentContainerStyle={{ maxWidth: 1120, alignSelf: 'center', width: '100%', minHeight: desktop ? 760 : undefined, padding: desktop ? spacing['3xl'] : spacing.lg, paddingBottom: 120, justifyContent: 'center' }}>
        <View style={{ flexDirection: desktop ? 'row' : 'column', borderRadius: radius['2xl'], overflow: 'hidden', ...shadows.xl }}>
        <LinearGradient colors={[...gradients.hero]} style={{ flex: 1, minHeight: desktop ? 560 : 240, padding: desktop ? 44 : 28, justifyContent: 'space-between', overflow: 'hidden' }}><View pointerEvents="none" style={{ position: 'absolute', right: -45, top: -40 }}><NandutiDecorativo size={210} color={colors.surface.light} opacity={0.18} /></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.surface.light, alignItems: 'center', justifyContent: 'center' }}><Image source={logoMfs} style={{ width: 40, height: 40, resizeMode: 'contain' }} /></View><Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 18 }}>MFS Paraguay</Text></View><View><Ionicons name="football-outline" size={42} color={colors.surface.light} /><Text style={{ color: colors.surface.light, fontFamily: typography.family.extrabold, fontSize: desktop ? 34 : 26, marginTop: 12 }}>Resultados desde la cancha.</Text></View></LinearGradient>
        <View style={[s.card, { flex: desktop ? 0.9 : undefined, borderRadius: 0, padding: desktop ? 44 : 24, justifyContent: 'center' }]}>
          <PageHeader icon="keypad-outline" title="Área de operadores" subtitle="Acceso exclusivo para la carga de resultados del torneo" />
          <Field label="Usuario (email)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="operadores@..." />
          <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry placeholder="••••••••" />
          {err && <Text style={{ color: colors.error, marginBottom: 8 }}>{err}</Text>}
          <Button variant="primary" onPress={entrar} disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</Button>
        </View>
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
      contentContainerStyle={s.pageContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PageHeader icon="keypad-outline" title="Carga de resultados" subtitle={edicion ? `${edicion.nombre} · ${session.user.email}` : `Sin edición activa · ${session.user.email}`} />
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: colors.error, fontWeight: '800', fontSize: 13 }}>Salir</Text>
        </Pressable>
      </View>

      {/* Selector de cancha */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {[{ id: 'todas', nombre: '🎯 Todas las canchas', disciplina_id: '' } as any, ...canchas].map((c: any) => {
          const sel = canchaSel === c.id;
          const d = discMap.get(c.disciplina_id);
          return (
            <Pressable key={c.id} onPress={() => setCanchaSel(c.id)} style={{
              paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, borderRadius: radius.full,
               backgroundColor: sel ? colors.primary[600] : colors.surface.light,
               borderWidth: 1, borderColor: sel ? colors.primary[600] : colors.primary[100],
            }}>
               <Text style={{ fontWeight: '800', fontSize: 13, color: sel ? colors.surface.light : colors.neutral[700] }}>
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

      {enJuego.length > 0 && (
        <View style={{ marginBottom: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.mint[50], borderWidth: 1, borderColor: colors.mint[200] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><View style={{ width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.mint[600] }} /><Text style={{ fontSize: 16, fontWeight: '900', color: colors.mint[700] }}>En juego ahora</Text></View>
          {enJuego.map((p) => (
            <View key={`live-${p.id}`} style={[s.card, { marginBottom: 8 }]}>
              <PartidoEditor partido={p} disciplina={discMap.get(p.disciplina_id)} defaultOpen onSaved={() => refrescar(p.id)} />
            </View>
          ))}
        </View>
      )}

      {!loading && lista.length === 0 && (
        <View style={s.card}><Text style={s.text}>No hay partidos para esta cancha.</Text></View>
      )}

      {porDia.map(([dia, grupo]) => (
        <View key={dia} style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
            {fmtDia(grupo[0].inicio)}
          </Text>
          {grupo.filter((p) => p.estado !== 'en_juego').map((p) => (
            <View key={p.id} style={[s.card, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: '700', marginBottom: 4 }}>
                🕒 {fmtHora(p.inicio)} · {discMap.get(p.disciplina_id)?.nombre ?? ''}
              </Text>
              <PartidoEditor
                partido={p}
                disciplina={discMap.get(p.disciplina_id)}
                onSaved={() => refrescar(p.id)}
              />
            </View>
          ))}
        </View>
      ))}

      {disciplinas.length > 0 && (
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 4 }]}>⏭️ Clasificados y llaves</Text>
          <Text style={[s.small, { marginBottom: 8 }]}>
            Se actualizan solas al finalizar cada partido. Usá esto solo si algo no se completó.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {disciplinas.map((d) => (
              <Pressable key={d.id} disabled={resolviendo} onPress={() => actualizarLlaves(d.id)} style={{
                backgroundColor: resolviendo ? colors.neutral[300] : colors.info, paddingVertical: 10,
                paddingHorizontal: 12, borderRadius: radius.sm, marginRight: 8, marginBottom: 8,
              }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{d.emoji} Actualizar {d.nombre}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
