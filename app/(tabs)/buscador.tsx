// FILE: app/(tabs)/buscador.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { s } from '../../src/lib/theme';
import { supabase } from '../../src/lib/supabase';
import { Picker } from '@react-native-picker/picker';

type Row = {
  id: string;
  created_at: string;
  nombres: string;
  apellidos: string;
  ci: string | null;
  email: string | null;
  pueblo_id: string;
  rol: 'Tio' | 'Misionero';
  autorizacion_url: string | null; // => Aceptación
  ficha_medica_url: string | null; // => Permiso
  firma_url: string | null;
};

type Pueblo = { id: string; nombre: string };

type RolFilter = 'todos' | 'Misionero' | 'Tio';
type DocStatusFilter = 'todos' | 'completos' | 'incompletos';

const PAGE = 30;

export default function Buscador() {
  const [q, setQ] = useState('');
  const [puebloList, setPuebloList] = useState<Pueblo[]>([]);
  const [puebloId, setPuebloId] = useState<string>('todos');
  const [rol, setRol] = useState<RolFilter>('todos');
  const [docStatus, setDocStatus] = useState<DocStatusFilter>('todos');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const pueblosMap = puebloList.reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.nombre;
    return acc;
  }, {});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pueblos').select('id,nombre').order('nombre');
      setPuebloList(data || []);
    })();
  }, []);

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('registros')
      .select(
        'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,autorizacion_url,ficha_medica_url,firma_url'
      )
      .order('created_at', { ascending: false });

    const term = q.trim();
    if (term.length >= 2) {
      query = query.or(`nombres.ilike.%${term}%,apellidos.ilike.%${term}%`);
    }
    if (puebloId !== 'todos') query = query.eq('pueblo_id', puebloId);
    if (rol !== 'todos') query = query.eq('rol', rol);

    if (docStatus === 'completos') {
      query = query
        .not('autorizacion_url', 'is', null)
        .not('ficha_medica_url', 'is', null)
        .not('firma_url', 'is', null);
    } else if (docStatus === 'incompletos') {
      query = query.or('autorizacion_url.is.null,ficha_medica_url.is.null,firma_url.is.null');
    }
    return query;
  }, [q, puebloId, rol, docStatus]);

  const runSearch = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setMoreLoading(true);
      }
      try {
        const query = buildQuery();
        const from = offsetRef.current;
        const to = from + PAGE - 1;
        const { data, error } = await query.range(from, to);
        if (error) throw error;

        if (reset) setRows(data || []);
        else setRows((prev) => [...prev, ...(data || [])]);

        const got = (data || []).length;
        setHasMore(got === PAGE);
        if (got > 0) offsetRef.current += got;
      } finally {
        setLoading(false);
        setMoreLoading(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    runSearch(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => runSearch(true), 300);
    return () => clearTimeout(t);
  }, [q, puebloId, rol, docStatus, runSearch]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>Buscador de inscriptos</Text>

      {/* Filtros */}
      <View style={s.card}>
        <Text style={s.label}>Buscar por nombre o apellido</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={s.input}
          placeholder="Ej: Juan / Pérez"
          autoCapitalize="none"
        />

        <Text style={[s.label, { marginTop: 10 }]}>Pueblo</Text>
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <Picker selectedValue={puebloId} onValueChange={setPuebloId}>
            <Picker.Item label="Todos" value="todos" />
            {puebloList.map((p) => (
              <Picker.Item key={p.id} label={p.nombre} value={p.id} />
            ))}
          </Picker>
        </View>

        <Text style={s.label}>Rol</Text>
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <Picker selectedValue={rol} onValueChange={(v) => setRol(v as RolFilter)}>
            <Picker.Item label="Todos" value="todos" />
            <Picker.Item label="Misionero" value="Misionero" />
            <Picker.Item label="Tío" value="Tio" />
          </Picker>
        </View>

        <Text style={s.label}>Documentos</Text>
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <Picker selectedValue={docStatus} onValueChange={(v) => setDocStatus(v as DocStatusFilter)}>
            <Picker.Item label="Todos" value="todos" />
            <Picker.Item label="Completos (3/3)" value="completos" />
            <Picker.Item label="Incompletos" value="incompletos" />
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={() => runSearch(true)}>
            <Text style={s.buttonText}>Aplicar filtros</Text>
          </Pressable>
          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#6c757d' }]}
            onPress={() => {
              setQ(''); setPuebloId('todos'); setRol('todos'); setDocStatus('todos');
              runSearch(true);
            }}
          >
            <Text style={s.buttonText}>Limpiar</Text>
          </Pressable>
        </View>
      </View>

      {/* Resultados */}
      {loading ? (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : rows.length === 0 ? (
        <Text style={[s.text, { color: '#666', marginTop: 8 }]}>Sin resultados.</Text>
      ) : (
        <>
          {rows.map((r) => {
            const pueblo = pueblosMap[r.pueblo_id] || r.pueblo_id;
            const okAcept = !!r.autorizacion_url;
            const okPerm = !!r.ficha_medica_url;
            const okFir = !!r.firma_url;

            return (
              <View key={r.id} style={[s.card, { marginBottom: 10 }]}>
                <Text style={[s.text, { fontWeight: '700' }]}>{r.nombres} {r.apellidos}</Text>
                <Text style={s.small}>CI: {r.ci || '-'}</Text>
                <Text style={s.small}>Email: {r.email || '-'}</Text>
                <Text style={[s.small, { marginTop: 4 }]}>Pueblo: {pueblo}</Text>
                <Text style={[s.small, { color: '#666' }]}>Rol: {r.rol}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <Chip ok={okAcept} label="Aceptación" />
                  <Chip ok={okPerm} label="Permiso" />
                  <Chip ok={okFir} label="Firma" />
                </View>

                <Text style={[s.small, { color: '#666', marginTop: 6 }]}>
                  Fecha: {new Date(r.created_at).toLocaleString()}
                </Text>
              </View>
            );
          })}

          {hasMore && (
            <Pressable
              style={[s.button, { paddingVertical: 10, marginTop: 6, alignSelf: 'center' }]}
              onPress={() => runSearch(false)}
              disabled={moreLoading}
            >
              <Text style={s.buttonText}>{moreLoading ? 'Cargando…' : 'Cargar más'}</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
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
