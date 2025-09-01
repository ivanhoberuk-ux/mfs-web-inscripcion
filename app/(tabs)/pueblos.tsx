// FILE: app/(tabs)/pueblos.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { s } from '../../src/lib/theme';
import { fetchOcupacion, type Ocupacion } from '../../src/lib/api';
import { useRouter } from 'expo-router';

export default function Pueblos() {
  const router = useRouter();
  const [items, setItems] = useState<Ocupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOcupacion();
      setItems(data);
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchOcupacion();
      setItems(data);
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={s.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.title}>Pueblos</Text>
        <Pressable onPress={load} style={[s.button, { paddingVertical: 8 }]}>
          <Text style={s.buttonText}>Actualizar</Text>
        </Pressable>
      </View>

      {!!lastUpdated && (
        <Text style={[s.small, { color: '#666', marginBottom: 8 }]}>Actualizado: {lastUpdated}</Text>
      )}

      {loading ? (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        items.map((p) => {
          const total = p.cupo_max ?? 0;
          const usados = p.usados ?? 0;
          const libres = Math.max((p.libres ?? 0), 0);
          const pct = total > 0 ? Math.min(100, Math.round((usados / total) * 100)) : 0;

          const completo = libres <= 0;
          const inactivo = !p.activo;

          // color de progreso según disponibilidad
          let barColor = '#28a745'; // verde
          if (completo) barColor = '#d9534f'; // rojo
          else if (pct >= 80) barColor = '#f0ad4e'; // amarillo cuando queda <20%

          return (
            <View
              key={p.id}
              style={[
                s.card,
                { marginBottom: 12, opacity: inactivo ? 0.65 : 1 },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[s.text, { fontWeight: '700', flex: 1 }]}>{p.nombre}</Text>

                {inactivo && <Badge label="INACTIVO" color="#6c757d" />}
                {completo && <Badge label="COMPLETO" color="#d9534f" />}
              </View>

              {/* Métricas */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <Stat label="Cupo" value={String(total)} />
                <Stat label="Inscriptos" value={String(usados)} />
                <Stat label="Restantes" value={String(libres)} />
              </View>

              {/* Barra de progreso */}
              <View style={{ marginTop: 10 }}>
                <View
                  style={{
                    height: 10,
                    borderRadius: 6,
                    backgroundColor: '#eee',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: barColor,
                    }}
                  />
                </View>
                <Text style={[s.small, { color: '#666', marginTop: 4 }]}>{pct}% ocupado</Text>
              </View>

              {/* Acciones */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable
                  style={[s.button, { flex: 1, paddingVertical: 10 }]}
                  onPress={() =>
                    router.push({ pathname: '/inscribir', params: { p: p.id } })
                  }
                >
                  <Text style={s.buttonText}>Inscribir acá</Text>
                </Pressable>

                <Pressable
                  style={[s.button, { flex: 1, paddingVertical: 10, backgroundColor: '#6c757d' }]}
                  onPress={() =>
                    router.push({ pathname: '/pueblos/[id]', params: { id: p.id } })
                  }
                >
                  <Text style={s.buttonText}>Ver inscriptos</Text>
                </Pressable>
              </View>

              {/* Nota si está completo */}
              {completo && (
                <Text style={[s.small, { color: '#d9534f', marginTop: 8 }]}>
                  Este pueblo ya no tiene lugares disponibles.
                </Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#f7f7f7', borderRadius: 8 }}>
      <Text style={[s.small, { color: '#666' }]}>{label}</Text>
      <Text style={[s.text, { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}
