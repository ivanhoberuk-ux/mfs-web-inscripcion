// FILE: app/(tabs)/admin.tsx — Panel Admin integrado (ocupación + exportes + guard admin)
/// <reference lib="dom" />
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { s } from '../../src/lib/theme';
import { supabase } from '../../src/lib/supabase';
import { fetchOcupacion, updatePueblo, fetchPueblos } from '../../src/lib/api';
import { shareOrDownload } from '../../src/lib/sharing';
import { useAuth } from '../../src/context/AuthProvider';

// ===== Tipos base =====
type Registro = {
  id: string;
  created_at: string;
  nombres: string;
  apellidos: string;
  ci: string | null;
  email: string | null;
  telefono?: string | null;
  direccion?: string | null;
  emergencia_nombre?: string | null;
  emergencia_telefono?: string | null;
  pueblo_id: string;
  rol: 'Tio' | 'Misionero';
  nacimiento: string | null;
  autorizacion_url: string | null;
  ficha_medica_url: string | null;
  firma_url: string | null;
};

type PuebloBase = { id: string; nombre: string };
type OcItem = {
  id: string;
  nombre: string;
  cupo_max: number;
  usados: number;
  libres: number;
  activo: boolean;
};

type UserRoleRow = { role: 'admin' | 'user' };

// ===== utilitarios =====
function csvEscape(v: any) {
  if (v == null) return '';
  const s = String(v);
  // Encapsular si hay comillas, coma o salto de línea
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' + p(d.getMonth() + 1) +
    '-' + p(d.getDate()) +
    '_' + p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

export default function Admin() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  // ===== Estado =====
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<OcItem[]>([]);
  const [edit, setEdit] = useState<Record<string, number>>({});
  const [toggle, setToggle] = useState<Record<string, boolean>>({});
  const [pueblosMap, setPueblosMap] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');

  // ===== Guards / carga de rol =====
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user) return;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (mounted) setRole((data as UserRoleRow | null)?.role ?? 'user');
      } catch {
        if (mounted) setRole('user');
      } finally {
        if (mounted) setCheckingRole(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // ===== Cargar datos =====
  async function load() {
    try {
      setLoading(true);
      const [oc, pueblos] = await Promise.all([fetchOcupacion(), fetchPueblos()]);
      setItems(oc as OcItem[]);
      const ed: Record<string, number> = {};
      const tg: Record<string, boolean> = {};
      (oc as OcItem[]).forEach((p) => {
        ed[p.id] = p.cupo_max;
        tg[p.id] = !!p.activo;
      });
      setEdit(ed);
      setToggle(tg);
      const map: Record<string, string> = {};
      (pueblos as PuebloBase[]).forEach((p) => (map[p.id] = p.nombre));
      setPueblosMap(map);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingRole && role === 'admin') load();
  }, [checkingRole, role]);

  // ===== Totales =====
  const total = useMemo(() => {
    const filtered = items.filter((p) => p.nombre.toLowerCase().includes(q.trim().toLowerCase()));
    const tUsados = filtered.reduce((a, b) => a + (b.usados ?? 0), 0);
    const tMax = filtered.reduce((a, b) => a + (edit[b.id] ?? b.cupo_max ?? 0), 0);
    const tLibres = Math.max(tMax - tUsados, 0);
    return { tUsados, tMax, tLibres };
  }, [items, edit, q]);

  const globalPct = useMemo(() => {
    if (!total.tMax) return 0;
    return Math.min(100, Math.round((total.tUsados / total.tMax) * 100));
  }, [total]);

  // ===== helpers =====
  const inc = (id: string, d: number) =>
    setEdit((prev) => ({ ...prev, [id]: Math.max((prev[id] ?? 0) + d, 0) }));

  // ordenar por mayor ocupación
  const filteredItems = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const arr = items.filter((p) => p.nombre.toLowerCase().includes(ql));
    return arr.sort((a, b) => {
      const maxA = edit[a.id] ?? a.cupo_max ?? 0;
      const maxB = edit[b.id] ?? b.cupo_max ?? 0;
      const usedA = a.usados ?? 0;
      const usedB = b.usados ?? 0;
      const pctA = maxA > 0 ? usedA / maxA : 0;
      const pctB = maxB > 0 ? usedB / maxB : 0;
      return pctB - pctA;
    });
  }, [items, q, edit]);

  // scroll a tarjeta desde chips
  const scrollRef = useRef<any>(null);
  const scrollToPueblo = (id: string) => {
    if (Platform.OS === 'web') {
      const el = document.getElementById(`pueblo-${id}`);
      if (el) (el as any).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // confirm web-safe
  const confirmAsync = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  // ===== Guardar cambios =====
  async function onSave(puebloId: string) {
    try {
      const nuevoMax = edit[puebloId];
      const nuevoActivo = toggle[puebloId];
      if (nuevoMax == null || Number.isNaN(nuevoMax) || nuevoMax < 0) {
        Alert.alert('Valor inválido', 'Ingresá un número válido para cupo máximo.');
        return;
      }

      const row = items.find((x) => x.id === puebloId);
      const usados = row?.usados ?? 0;
      if (nuevoMax < usados) {
        const ok = await confirmAsync(
          'Reducir cupo por debajo de inscriptos',
          `Estás fijando el cupo en ${nuevoMax}, pero ya hay ${usados} inscriptos. ¿Confirmás igualmente?`
        );
        if (!ok) return;
      }

      setSaving(puebloId);
      try {
        await updatePueblo(puebloId, { cupo_max: nuevoMax, activo: nuevoActivo } as any);
      } catch {
        const { error } = await supabase
          .from('pueblos')
          .update({ cupo_max: nuevoMax, activo: nuevoActivo })
          .eq('id', puebloId);
        if (error) throw error;
      }
      await load();
      Alert.alert('Guardado', 'Cambios aplicados.');
    } catch (e: any) {
      console.error(e);
      Alert.alert('No se pudo guardar', e?.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  // ===== Exportes =====
  async function exportRegistrosJSON() {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,telefono,direccion,emergencia_nombre,emergencia_telefono,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data ?? [], null, 2)], {
        type: 'application/json;charset=utf-8',
        lastModified: Date.now(),
      } as any);
      await shareOrDownload(blob, `registros_${stamp()}.json`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setExporting(false);
    }
  }

  async function exportRegistrosCSV() {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,telefono,direccion,emergencia_nombre,emergencia_telefono,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;

      const header = [
        'id','fecha','pueblo','nombres','apellidos','ci','email','telefono','direccion',
        'emergencia_nombre','emergencia_telefono','rol','nacimiento',
        'url_aceptacion','url_permiso','url_firma'
      ];
      const lines: string[] = [header.join(',')];

      (data ?? []).forEach((r: any) => {
        const row = [
          r.id,
          new Date(r.created_at).toISOString(),
          pueblosMap[r.pueblo_id] || r.pueblo_id,
          r.nombres, r.apellidos, r.ci ?? '', r.email ?? '', r.telefono ?? '',
          r.direccion ?? '', r.emergencia_nombre ?? '', r.emergencia_telefono ?? '',
          r.rol, r.nacimiento ?? '', r.autorizacion_url ?? '', r.ficha_medica_url ?? '', r.firma_url ?? ''
        ].map(csvEscape);
        lines.push(row.join(','));
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8', lastModified: Date.now() } as any);
      await shareOrDownload(blob, `registros_${stamp()}.csv`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setExporting(false);
    }
  }

  async function exportPueblosCSV() {
    try {
      setExporting(true);
      const pueblos = await fetchPueblos();

      const header = ['id', 'nombre'];
      const lines: string[] = [header.join(',')];

      (pueblos as any[]).forEach((p) => {
        lines.push([csvEscape(p.id), csvEscape(p.nombre)].join(','));
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8', lastModified: Date.now() } as any);
      await shareOrDownload(blob, `pueblos_${stamp()}.csv`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setExporting(false);
    }
  }

  // ===== Loading/redirección =====
  if (authLoading || checkingRole) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 6, color: '#666' }}>Verificando permisos…</Text>
      </View>
    );
  }
  if (!user) return null;
  if (role !== 'admin') {
    Alert.alert('Acceso restringido', 'No tenés permisos de administrador.');
    router.replace('/pueblos');
    return null;
  }

  // ===== UI =====
  return (
    <ScrollView
      ref={scrollRef}
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
      stickyHeaderIndices={[2]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            try {
              setRefreshing(true);
              await load();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <Text style={s.title}>Panel administrativo</Text>

      {/* Usuario y exportes */}
      <View style={s.card}>
        <Text style={[s.text, { marginBottom: 8 }]}>
          Usuario: <Text style={{ fontWeight: '700' }}>{user?.email || '—'}</Text> (admin)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportRegistrosJSON} disabled={exporting}>
            <Text style={s.buttonText}>{exporting ? 'Procesando…' : 'Exportar Registros JSON'}</Text>
          </Pressable>
          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportRegistrosCSV} disabled={exporting}>
            <Text style={s.buttonText}>{exporting ? 'Procesando…' : 'Exportar Registros CSV'}</Text>
          </Pressable>
          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportPueblosCSV} disabled={exporting}>
            <Text style={s.buttonText}>{exporting ? 'Procesando…' : 'Exportar Pueblos CSV'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Header: SOLO porcentaje global + buscador + chips */}
      <View
        style={[
          s.card,
          { gap: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', zIndex: 10 },
        ]}
      >
        <Text style={[s.title, { fontSize: 20 }]}>
          Ocupación total: <Text style={{ fontWeight: '800' }}>{globalPct}%</Text>
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="Buscar pueblo…"
            value={q}
            onChangeText={setQ}
          />
          <Pressable style={[s.button]} onPress={load}>
            <Text style={s.buttonText}>Actualizar</Text>
          </Pressable>
        </View>

        {/* Chips con % por pueblo (ordenados desc) */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
>
  {filteredItems.map((p) => {
    const max = edit[p.id] ?? p.cupo_max ?? 0;
    const usados = p.usados ?? 0;
    const pct = max > 0 ? Math.min(100, Math.round((usados / max) * 100)) : 0;

    // colores dinámicos
    let color = '#0b9850'; // verde base
    if (pct >= 70 && pct < 100) color = '#f59e0b'; // amarillo
    if (pct >= 100) color = '#dc2626'; // rojo

    return (
      <Pressable
        key={`chip-${p.id}`}
        onPress={() => scrollToPueblo(p.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: '#e5e7eb',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color }}>{pct}%</Text>
        <Text style={{ fontSize: 12, color: '#111827' }} numberOfLines={1}>
          {p.nombre}
        </Text>
      </Pressable>
    );
  })}
</ScrollView>


      </View>

      {/* Lista de pueblos */}
      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator />
        </View>
      )}

      {!loading &&
        filteredItems.map((p) => {
          const max = edit[p.id] ?? p.cupo_max ?? 0;
          const usados = p.usados ?? 0;
          const libres = Math.max(max - usados, 0);
          const completo = libres <= 0;
          const pct = max > 0 ? Math.min(100, Math.round((usados / max) * 100)) : 0;
          return (
            <View key={p.id} nativeID={`pueblo-${p.id}`} style={[s.card, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[s.text, { fontWeight: '700', flex: 1 }]} numberOfLines={1}>{p.nombre}</Text>
                {completo && (
                  <View style={{ backgroundColor: '#d94646', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginLeft: 8 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>COMPLETO</Text>
                  </View>
                )}
              </View>
              <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: completo ? '#d94646' : '#0a7ea4' }} />
              </View>
              <Text style={[s.small, { marginTop: 6 }]}>Usados: {usados} / Máximo: {max} · Libres: {libres}</Text>

              {/* Editor */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <Pressable onPress={() => inc(p.id, -1)} style={[s.button, { paddingVertical: 6, paddingHorizontal: 12 }]}>
                  <Text style={s.buttonText}>-</Text>
                </Pressable>
                <TextInput
                  style={[s.input, { width: 110, textAlign: 'center' }]}
                  keyboardType="number-pad"
                  value={String(max)}
                  onChangeText={(t) =>
                    setEdit((prev) => ({ ...prev, [p.id]: Math.max(parseInt(t || '0', 10) || 0, 0) }))
                  }
                />
                <Pressable onPress={() => inc(p.id, +1)} style={[s.button, { paddingVertical: 6, paddingHorizontal: 12 }]}>
                  <Text style={s.buttonText}>+</Text>
                </Pressable>

                <Pressable
                  onPress={() => setToggle((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  style={[s.button, { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: toggle[p.id] ? '#0b9850' : '#9ca3af' }]}
                >
                  <Text style={s.buttonText}>{toggle[p.id] ? 'Activo' : 'Inactivo'}</Text>
                </Pressable>

                <Pressable
                  style={[s.button, { paddingVertical: 8, marginLeft: 'auto', opacity: saving === p.id ? 0.6 : 1 }]}
                  onPress={() => onSave(p.id)}
                  disabled={saving === p.id}
                >
                  <Text style={s.buttonText}>{saving === p.id ? 'Guardando…' : 'Guardar'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

      {/* Cerrar sesión */}
      <Pressable
        onPress={signOut}
        style={{ marginTop: 6, padding: 12, borderRadius: 8, backgroundColor: '#d94646', alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
