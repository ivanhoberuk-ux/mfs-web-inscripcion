// FILE: app/pueblos/[id].tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { s } from '../../src/lib/theme';
import { supabase } from '../../src/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type Item = {
  id: string;
  created_at: string;
  nombres: string;
  apellidos: string;
  ci: string | null;
  email: string | null;
  autorizacion_url: string | null; // => Aceptación
  ficha_medica_url: string | null; // => Permiso
  firma_url: string | null;
};

export default function PuebloDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  const baseSelect =
    'id,created_at,nombres,apellidos,ci,email,autorizacion_url,ficha_medica_url,firma_url';

  const fetchData = useCallback(
    async (term?: string) => {
      let query = supabase.from('registros').select(baseSelect).eq('pueblo_id', id);
      query = query.order('created_at', { ascending: false });
      if (term && term.trim().length >= 2) {
        const t = term.trim();
        query = query.or(`nombres.ilike.%${t}%,apellidos.ilike.%${t}%,ci.ilike.%${t}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Item[];
    },
    [id],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await fetchData());
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setRows(await fetchData(q));
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSearch() {
    try {
      setSearching(true);
      setRows(await fetchData(q));
    } finally {
      setSearching(false);
    }
  }

  function csvEscape(v: any): string {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return /[",;]/.test(s) ? `"${s}"` : s;
  }

  async function exportCsv(all: boolean) {
    try {
      const data = all ? await fetchData() : rows;
      if (!data.length) {
        Alert.alert('Exportar CSV', 'No hay datos para exportar.');
        return;
      }
      // ⇢ Encabezados actualizados
      const header = [
        'id',
        'fecha',
        'nombres',
        'apellidos',
        'ci',
        'email',
        'aceptacion',
        'permiso',
        'firma',
      ].join(';');

      const lines = data.map((r) =>
        [
          csvEscape(r.id),
          csvEscape(new Date(r.created_at).toISOString()),
          csvEscape(r.nombres),
          csvEscape(r.apellidos),
          csvEscape(r.ci),
          csvEscape(r.email),
          r.autorizacion_url ? 'SI' : 'NO',   // Aceptación
          r.ficha_medica_url ? 'SI' : 'NO',   // Permiso
          r.firma_url ? 'SI' : 'NO',
        ].join(';'),
      );

      const csv = [header, ...lines].join('\n');
      const fileUri = FileSystem.cacheDirectory + `inscriptos_${id}${all ? '_todos' : '_filtro'}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
    } catch (e: any) {
      Alert.alert('No se pudo exportar', e?.message ?? String(e));
    }
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.title}>Inscriptos del pueblo</Text>

      <View style={s.card}>
        <Text style={s.label}>Buscar por nombre / apellido / CI</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={s.input}
          placeholder="Ej: Ana / Gómez / 1234567"
          autoCapitalize="none"
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={onSearch} disabled={searching}>
            <Text style={s.buttonText}>{searching ? 'Buscando…' : 'Buscar'}</Text>
          </Pressable>
          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#6c757d' }]}
            onPress={() => {
              setQ('');
              onSearch();
            }}
          >
            <Text style={s.buttonText}>Limpiar</Text>
          </Pressable>
        </View>

        {/* Exportar CSV */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={() => exportCsv(false)}>
            <Text style={s.buttonText}>Exportar CSV (filtro)</Text>
          </Pressable>
          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#0a7ea4' }]}
            onPress={() => exportCsv(true)}
          >
            <Text style={s.buttonText}>Exportar CSV (todo)</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : rows.length === 0 ? (
        <Text style={[s.text, { color: '#666', marginTop: 8 }]}>No hay inscriptos.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.id} style={[s.card, { marginBottom: 10 }]}>
            <Text style={[s.text, { fontWeight: '700' }]}>{r.nombres} {r.apellidos}</Text>
            <Text style={s.small}>CI: {r.ci || '-'}</Text>
            <Text style={s.small}>Email: {r.email || '-'}</Text>
            <Text style={[s.small, { color: '#666' }]}>
              Fecha: {new Date(r.created_at).toLocaleString()}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <DocChip ok={!!r.autorizacion_url} label="Aceptación" />
              <DocChip ok={!!r.ficha_medica_url} label="Permiso" />
              <DocChip ok={!!r.firma_url} label="Firma" />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function DocChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: ok ? '#28a745' : '#ddd',
      }}
    >
      <Text style={{ color: ok ? '#fff' : '#333', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}
