// FILE: app/(tabs)/admin.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { s } from '../../src/lib/theme';
import { fetchOcupacion, updatePueblo, fetchPueblos } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type OcItem = {
  id: string;
  nombre: string;
  cupo_max: number;
  usados: number;
  libres: number;
  activo: boolean;
};

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<OcItem[]>([]);
  const [edit, setEdit] = useState<Record<string, number>>({}); // puebloId -> nuevo cupo_max

  async function load() {
    try {
      setLoading(true);
      const data = await fetchOcupacion();
      setItems(data as any);
      // precargar valores editables
      const ed: Record<string, number> = {};
      data.forEach((p) => (ed[p.id] = p.cupo_max));
      setEdit(ed);
    } catch (e: any) {
      Alert.alert('Error cargando ocupación', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = useMemo(() => {
    const tUsados = items.reduce((a, b) => a + (b.usados ?? 0), 0);
    const tMax = items.reduce((a, b) => a + (edit[b.id] ?? b.cupo_max ?? 0), 0);
    const tLibres = Math.max(tMax - tUsados, 0);
    return { tUsados, tMax, tLibres };
  }, [items, edit]);

  async function onSave(puebloId: string) {
    try {
      const nuevo = edit[puebloId];
      if (nuevo == null || Number.isNaN(nuevo) || nuevo < 0) {
        Alert.alert('Valor inválido', 'Ingresá un número válido para cupo máximo.');
        return;
      }
      setSaving(puebloId);
      await updatePueblo(puebloId, { cupo_max: nuevo });
      // refrescar
      await load();
      Alert.alert('Guardado', 'Cupo máximo actualizado.');
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  function inc(puebloId: string, delta: number) {
    setEdit((prev) => {
      const cur = prev[puebloId] ?? 0;
      const next = Math.max(cur + delta, 0);
      return { ...prev, [puebloId]: next };
    });
  }

  // === Exportar CSV de inscriptos ===
  async function exportCSV() {
    try {
      setExporting(true);

      // 1) Traer inscriptos
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,telefono,direccion,emergencia_nombre,emergencia_telefono,rol,es_jefe,pueblo_id,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      const registros = data ?? [];

      // 2) Mapa de pueblo_id -> nombre
      const pueblos = await fetchPueblos();
      const mapP: Record<string, string> = {};
      pueblos.forEach((p) => (mapP[p.id] = p.nombre));

      // 3) Construir CSV
      const header = [
        'id',
        'created_at',
        'nombres',
        'apellidos',
        'ci',
        'email',
        'telefono',
        'direccion',
        'emergencia_nombre',
        'emergencia_telefono',
        'rol',
        'es_jefe',
        'pueblo_id',
        'pueblo_nombre',
        'autorizacion_url',
        'ficha_medica_url',
        'firma_url',
      ];

      const escape = (v: any) => {
        if (v == null) return '';
        const s = String(v);
        // escapado CSV básico
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const lines = [header.join(',')];
      for (const r of registros as any[]) {
        const row = [
          r.id,
          r.created_at,
          r.nombres,
          r.apellidos,
          r.ci,
          r.email,
          r.telefono,
          r.direccion,
          r.emergencia_nombre,
          r.emergencia_telefono,
          r.rol,
          r.es_jefe,
          r.pueblo_id,
          mapP[r.pueblo_id] ?? '',
          r.autorizacion_url ?? '',
          r.ficha_medica_url ?? '',
          r.firma_url ?? '',
        ].map(escape);
        lines.push(row.join(','));
      }
      const csv = lines.join('\n');

      // 4) Guardar y compartir
      const ts = new Date();
      const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(
        ts.getDate()
      ).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(
        ts.getMinutes()
      ).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
      const uri = `${FileSystem.cacheDirectory}inscriptos_${stamp}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar inscriptos (CSV)',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('CSV listo', `Archivo guardado en:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('No se pudo exportar', e?.message ?? String(e));
    } finally {
      setExporting(false);
    }
  }

  // === UI ===
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
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
      <Text style={s.title}>Admin</Text>

      {/* Resumen */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.text}>
          Total usados: <Text style={{ fontWeight: '700' }}>{total.tUsados}</Text>
        </Text>
        <Text style={s.text}>
          Cupos máximos: <Text style={{ fontWeight: '700' }}>{total.tMax}</Text>
        </Text>
        <Text style={s.text}>
          Libres: <Text style={{ fontWeight: '700' }}>{total.tLibres}</Text>
        </Text>

        <Pressable
          style={[s.button, { marginTop: 10, paddingVertical: 10, opacity: exporting ? 0.6 : 1 }]}
          onPress={exportCSV}
          disabled={exporting}
        >
          <Text style={s.buttonText}>{exporting ? 'Exportando…' : 'Exportar CSV de inscriptos'}</Text>
        </Pressable>
      </View>

      {/* Lista de pueblos */}
      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator />
        </View>
      )}

      {!loading &&
        items.map((p) => {
          const max = edit[p.id] ?? p.cupo_max ?? 0;
          const usados = p.usados ?? 0;
          const libres = Math.max(max - usados, 0);
          const completo = libres <= 0;

          const pct = max > 0 ? Math.min(100, Math.round((usados / max) * 100)) : 0;

          return (
            <View key={p.id} style={[s.card, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[s.text, { fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                  {p.nombre}
                </Text>

                {/* Badge COMPLETO */}
                {completo && (
                  <View
                    style={{
                      backgroundColor: '#d94646',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>COMPLETO</Text>
                  </View>
                )}
              </View>

              {/* Barra de ocupación */}
              <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: completo ? '#d94646' : '#0a7ea4',
                  }}
                />
              </View>

              {/* Números */}
              <Text style={[s.small, { marginTop: 6 }]}>
                Usados: {usados} / Máximo: {max} · Libres: {libres}
              </Text>

              {/* Editor de cupo máximo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                <Pressable
                  onPress={() => inc(p.id, -1)}
                  style={[s.button, { paddingVertical: 6, paddingHorizontal: 12 }]}
                >
                  <Text style={s.buttonText}>-</Text>
                </Pressable>

                <TextInput
                  style={[s.input, { flex: 0, width: 100, textAlign: 'center' }]}
                  keyboardType="number-pad"
                  value={String(max)}
                  onChangeText={(t) =>
                    setEdit((prev) => ({ ...prev, [p.id]: Math.max(parseInt(t || '0', 10) || 0, 0) }))
                  }
                />

                <Pressable
                  onPress={() => inc(p.id, +1)}
                  style={[s.button, { paddingVertical: 6, paddingHorizontal: 12 }]}
                >
                  <Text style={s.buttonText}>+</Text>
                </Pressable>

                <Pressable
                  style={[
                    s.button,
                    { paddingVertical: 8, marginLeft: 'auto', opacity: saving === p.id ? 0.6 : 1 },
                  ]}
                  onPress={() => onSave(p.id)}
                  disabled={saving === p.id}
                >
                  <Text style={s.buttonText}>{saving === p.id ? 'Guardando…' : 'Guardar'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}
