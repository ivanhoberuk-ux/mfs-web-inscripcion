// Paneles de super admin: Chequeo de temporada, Auditoría, Alertas y tareas.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchAñoActivo } from '../lib/api';

const db = supabase as any;

function aviso(titulo: string, msg: string) {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${msg}`);
  else Alert.alert(titulo, msg);
}

export function fechaPY(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function haceCuanto(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

const card = { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 } as const;
const input = { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', fontSize: 13 } as const;
const h2 = { fontSize: 16, fontWeight: '800', color: '#0a7ea4' } as const;
const small = { fontSize: 12, color: '#6B7280' } as const;

function Btn({ label, onPress, color = '#0a7ea4', disabled }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={{ backgroundColor: color, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', opacity: disabled ? 0.6 : 1 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? '#0a7ea4' : '#E5E7EB' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : '#374151' }}>{label}</Text>
    </Pressable>
  );
}

// ================= 🩺 Chequeo de temporada =================
type Fila = { orden: number; chequeo: string; estado: 'ok' | 'aviso' | 'error'; detalle: string | null };
const ESTADO = {
  ok: { icon: '✅', color: '#15803d', bg: '#DCFCE7' },
  aviso: { icon: '⚠️', color: '#a16207', bg: '#FEF9C3' },
  error: { icon: '❌', color: '#b91c1c', bg: '#FEE2E2' },
} as const;

export function ChequeoTemporadaPanel() {
  const [año, setAño] = useState('');
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAñoActivo().then((a) => setAño(String(a))).catch(() => {}); }, []);

  async function ejecutar() {
    try {
      setLoading(true);
      const n = parseInt(año, 10);
      const { data, error } = await db.rpc('diagnostico_temporada', Number.isFinite(n) ? { p_año: n } : {});
      if (error) throw error;
      setFilas(((data ?? []) as Fila[]).slice().sort((a, b) => a.orden - b.orden));
    } catch (e: any) {
      aviso('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const cnt = (e: string) => (filas ?? []).filter((f) => f.estado === e).length;

  return (
    <View style={card}>
      <Text style={h2}>🩺 Chequeo de temporada</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Text style={small}>Año:</Text>
        <TextInput value={año} onChangeText={(t) => setAño(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} style={[input, { width: 90 }]} />
        <Btn label={loading ? 'Ejecutando...' : '▶️ Ejecutar chequeo'} onPress={ejecutar} disabled={loading} />
      </View>
      {filas && (
        <>
          <Text style={{ fontSize: 14, fontWeight: '700' }}>
            ✅ {cnt('ok')} ok · ⚠️ {cnt('aviso')} avisos · ❌ {cnt('error')} errores
          </Text>
          {filas.map((f) => {
            const st = ESTADO[f.estado] ?? ESTADO.aviso;
            return (
              <View key={f.orden} style={{ backgroundColor: st.bg, borderRadius: 8, padding: 10 }}>
                <Text style={{ fontWeight: '700', color: st.color }}>{st.icon} {f.chequeo}</Text>
                {!!f.detalle && <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{f.detalle}</Text>}
              </View>
            );
          })}
          {filas.length === 0 && <Text style={small}>Sin resultados.</Text>}
        </>
      )}
    </View>
  );
}

// ================= 🕵️ Auditoría =================
type Aud = {
  id: number; tabla: string; registro_id: string | null; accion: string; actor: string | null;
  actor_email: string | null; resumen: string | null; cambios: any; created_at: string;
};
const TABLAS = ['registros', 'user_roles', 'pueblos', 'configuracion_inscripcion'];
const ACCIONES = ['INSERT', 'UPDATE', 'DELETE'];
const PAGE = 50;

function fmtVal(v: any) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function AuditoriaPanel() {
  const [tabla, setTabla] = useState<string | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Aud[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);

  async function load(p = page) {
    try {
      setLoading(true);
      let q = db.from('auditoria').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (tabla) q = q.eq('tabla', tabla);
      if (accion) q = q.eq('accion', accion);
      const t = texto.trim().replace(/[,()%]/g, ' ');
      if (t) q = q.or(`actor_email.ilike.%${t}%,resumen.ilike.%${t}%`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) q = q.gte('created_at', `${desde}T00:00:00-03:00`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) q = q.lte('created_at', `${hasta}T23:59:59-03:00`);
      const { data, error, count } = await q.range(p * PAGE, p * PAGE + PAGE - 1);
      if (error) throw error;
      setRows(data ?? []);
      setTotal(count ?? 0);
      setPage(p);
    } catch (e: any) {
      aviso('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0); /* eslint-disable-next-line */ }, [tabla, accion]);

  const paginas = Math.max(1, Math.ceil(total / PAGE));

  return (
    <View style={card}>
      <Text style={h2}>🕵️ Auditoría</Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Chip label="Todas las tablas" active={!tabla} onPress={() => setTabla(null)} />
        {TABLAS.map((t) => <Chip key={t} label={t} active={tabla === t} onPress={() => setTabla(t)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Chip label="Todas las acciones" active={!accion} onPress={() => setAccion(null)} />
        {ACCIONES.map((a) => <Chip key={a} label={a} active={accion === a} onPress={() => setAccion(a)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextInput value={texto} onChangeText={setTexto} placeholder="Buscar email o resumen" style={[input, { flex: 1, minWidth: 160 }]} />
        <TextInput value={desde} onChangeText={setDesde} placeholder="Desde AAAA-MM-DD" style={[input, { width: 140 }]} />
        <TextInput value={hasta} onChangeText={setHasta} placeholder="Hasta AAAA-MM-DD" style={[input, { width: 140 }]} />
        <Btn label="🔎 Filtrar" onPress={() => load(0)} disabled={loading} />
      </View>
      <Text style={small}>{total} registros · página {page + 1} de {paginas}</Text>
      {loading ? <ActivityIndicator /> : rows.map((r) => {
        const open = abierto === r.id;
        const cambios = r.cambios && typeof r.cambios === 'object' ? Object.entries(r.cambios) : [];
        return (
          <Pressable key={r.id} onPress={() => setAbierto(open ? null : r.id)}
            style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, backgroundColor: open ? '#F0F9FF' : '#fff' }}>
            <Text style={{ fontSize: 12, fontWeight: '700' }}>
              {r.accion === 'INSERT' ? '🟢' : r.accion === 'DELETE' ? '🔴' : '🟡'} {r.accion} · {r.tabla} · {fechaPY(r.created_at)}
            </Text>
            <Text style={{ fontSize: 12, color: '#374151' }}>{r.resumen || '—'}</Text>
            <Text style={small}>👤 {r.actor_email || r.actor || 'sistema'}{r.registro_id ? ` · id ${r.registro_id}` : ''}</Text>
            {open && (
              <View style={{ marginTop: 6, gap: 2 }}>
                {cambios.length === 0 && <Text style={small}>Sin detalle de cambios.</Text>}
                {cambios.map(([campo, v]: [string, any]) => (
                  <View key={campo} style={{ flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', width: 140 }}>{campo}</Text>
                    <Text style={{ fontSize: 12, color: '#b91c1c', flex: 1 }}>{fmtVal(v?.antes)}</Text>
                    <Text style={{ fontSize: 12 }}>→</Text>
                    <Text style={{ fontSize: 12, color: '#15803d', flex: 1 }}>{fmtVal(v?.despues)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <Btn label="◀ Anterior" onPress={() => load(page - 1)} disabled={loading || page === 0} color="#6b7280" />
        <Btn label="Siguiente ▶" onPress={() => load(page + 1)} disabled={loading || page + 1 >= paginas} color="#6b7280" />
      </View>
    </View>
  );
}

// ================= 🔔 Alertas y tareas =================
type Alerta = { id: number; origen: string; titulo: string; detalle: string | null; clave: string | null; created_at: string; enviada_at: string | null };
type Tarea = { id: number; tarea: string; ok: boolean; detalle: any; created_at: string };
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function AlertasTareasPanel() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [ultimas, setUltimas] = useState<Tarea[]>([]);
  const [dest, setDest] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [huerfanos, setHuerfanos] = useState<{ archivos: number; mb: number } | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [a, t, t2, aj] = await Promise.all([
        db.from('alertas').select('*').order('created_at', { ascending: false }).limit(100),
        db.from('tareas_log').select('*').order('created_at', { ascending: false }).limit(50),
        db.from('tareas_log').select('*').order('created_at', { ascending: false }).limit(1000),
        db.from('ajustes').select('valor').eq('clave', 'alertas_destinatarios').maybeSingle(),
      ]);
      if (a.error) throw a.error;
      if (t.error) throw t.error;
      setAlertas(a.data ?? []);
      setTareas(t.data ?? []);
      const map = new Map<string, Tarea>();
      for (const r of (t2.data ?? []) as Tarea[]) if (!map.has(r.tarea)) map.set(r.tarea, r);
      setUltimas([...map.values()].sort((x, y) => x.tarea.localeCompare(y.tarea)));
      setDest(aj.data?.valor ?? '');
    } catch (e: any) {
      aviso('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function guardarDest() {
    const emails = dest.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const malos = emails.filter((e) => !EMAIL_RE.test(e));
    if (emails.length === 0) return aviso('Falta email', 'Ingresá al menos un email.');
    if (malos.length) return aviso('Email inválido', `Revisá: ${malos.join(', ')}`);
    try {
      setSaving(true);
      const valor = [...new Set(emails)].join(', ');
      const { error } = await db.from('ajustes').upsert({ clave: 'alertas_destinatarios', valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' });
      if (error) throw error;
      setDest(valor);
      aviso('✅ Guardado', 'Destinatarios de alertas actualizados.');
    } catch (e: any) {
      aviso('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function buscarHuerfanos() {
    try {
      setBuscando(true);
      const { data, error } = await supabase.functions.invoke('limpiar-archivos-huerfanos', { body: { dryRun: true } });
      if (error) throw error;
      setHuerfanos({ archivos: data?.archivos ?? 0, mb: data?.mb ?? 0 });
    } catch (e: any) {
      aviso('Error', e?.message ?? String(e));
    } finally {
      setBuscando(false);
    }
  }

  if (loading) return <View style={card}><ActivityIndicator /></View>;

  return (
    <View style={{ gap: 12 }}>
      <View style={card}>
        <Text style={h2}>⏱️ Últimas ejecuciones por tarea</Text>
        {ultimas.length === 0 && <Text style={small}>Sin ejecuciones registradas.</Text>}
        {ultimas.map((t) => (
          <Text key={t.tarea} style={{ fontSize: 13 }}>
            {t.ok ? '✅' : '❌'} <Text style={{ fontWeight: '700' }}>{t.tarea}</Text> · {haceCuanto(t.created_at)} ({fechaPY(t.created_at)})
          </Text>
        ))}
        <Btn label="🔄 Actualizar" onPress={load} color="#6b7280" />
      </View>

      <View style={card}>
        <Text style={h2}>📧 Destinatarios de alertas</Text>
        <TextInput value={dest} onChangeText={setDest} placeholder="email1@ejemplo.com, email2@ejemplo.com" style={input} autoCapitalize="none" />
        <Text style={small}>Emails separados por coma.</Text>
        <Btn label={saving ? 'Guardando...' : '💾 Guardar destinatarios'} onPress={guardarDest} disabled={saving} />
      </View>

      <View style={card}>
        <Text style={h2}>🗂️ Archivos huérfanos</Text>
        <Btn label={buscando ? 'Buscando...' : '🔍 Buscar archivos huérfanos (simulación)'} onPress={buscarHuerfanos} disabled={buscando} color="#7c3aed" />
        {huerfanos && <Text style={{ fontSize: 13 }}>Se encontraron <Text style={{ fontWeight: '700' }}>{huerfanos.archivos}</Text> archivos ({huerfanos.mb} MB). No se borró nada.</Text>}
      </View>

      <View style={card}>
        <Text style={h2}>🔔 Alertas (últimas 100)</Text>
        {alertas.length === 0 && <Text style={small}>Sin alertas. 🎉</Text>}
        {alertas.map((a) => (
          <View key={a.id} style={{ borderWidth: 1, borderColor: a.enviada_at ? '#E5E7EB' : '#F59E0B', backgroundColor: a.enviada_at ? '#fff' : '#FFFBEB', borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700' }}>{a.enviada_at ? '📨' : '🕓 NO ENVIADA ·'} {a.titulo}</Text>
            <Text style={small}>{a.origen} · {fechaPY(a.created_at)}{a.enviada_at ? ` · enviada ${fechaPY(a.enviada_at)}` : ''}</Text>
            {!!a.detalle && <Text style={{ fontSize: 12, color: '#374151' }} numberOfLines={6}>{a.detalle}</Text>}
          </View>
        ))}
      </View>

      <View style={card}>
        <Text style={h2}>📜 Historial de tareas (últimas 50)</Text>
        {tareas.map((t) => (
          <View key={t.id} style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 4 }}>
            <Text style={{ fontSize: 12 }}>{t.ok ? '✅' : '❌'} <Text style={{ fontWeight: '700' }}>{t.tarea}</Text> · {fechaPY(t.created_at)}</Text>
            {t.detalle != null && <Text style={small} numberOfLines={3}>{JSON.stringify(t.detalle)}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}
