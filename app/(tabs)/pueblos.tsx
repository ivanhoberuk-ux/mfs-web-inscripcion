// FILE: app/(tabs)/pueblos.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { s } from '../../src/lib/theme'
import { fetchOcupacion, type Ocupacion } from '../../src/lib/api'
import { useRouter } from 'expo-router'

export default function Pueblos() {
  const router = useRouter()
  const [items, setItems] = useState<Ocupacion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchOcupacion()
      setItems(data)
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setLoading(false)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await fetchOcupacion()
      setItems(data)
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: '#f9fafb' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={[s.title, { color: '#0f172a' }]}>Pueblos</Text>
        <Pressable onPress={load} style={[s.button, { paddingVertical: 8 }]}>
          <Text style={s.buttonText}>Actualizar</Text>
        </Pressable>
      </View>

      {!!lastUpdated && (
        <Text style={[s.small, { color: '#64748b', marginBottom: 10 }]}>
          Última actualización: {lastUpdated}
        </Text>
      )}

      {/* Lista de pueblos */}
      {loading ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={[s.text, { marginTop: 8, color: '#666' }]}>Cargando datos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={[s.text, { color: '#999' }]}>No hay pueblos registrados.</Text>
        </View>
      ) : (
        items.map((p) => {
          const total = p.cupo_max ?? 0
          const usados = p.usados ?? 0
          const libres = Math.max(p.libres ?? 0, 0)
          const pct = total > 0 ? Math.min(100, Math.round((usados / total) * 100)) : 0

          const completo = libres <= 0
          const inactivo = !p.activo

          // color de progreso según disponibilidad
          let barColor = '#16a34a' // verde
          if (completo) barColor = '#dc2626' // rojo
          else if (pct >= 80) barColor = '#f59e0b' // amarillo

          return (
            <View
              key={p.id}
              style={[
                s.card,
                {
                  marginBottom: 14,
                  backgroundColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 5,
                  elevation: 2,
                  opacity: inactivo ? 0.6 : 1,
                },
              ]}
            >
              {/* Cabecera del pueblo */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    s.text,
                    { fontWeight: '700', fontSize: 18, flex: 1, color: '#111827' },
                  ]}
                >
                  {p.nombre}
                </Text>

                {inactivo && <Badge label="INACTIVO" color="#6b7280" />}
                {completo && <Badge label="COMPLETO" color="#dc2626" />}
              </View>

              {/* Métricas */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 10,
                  flexWrap: 'wrap',
                }}
              >
                <Stat label="Cupo" value={String(total)} />
                <Stat label="Inscriptos" value={String(usados)} />
                <Stat label="Restantes" value={String(libres)} />
              </View>

              {/* Barra de progreso */}
              <View style={{ marginTop: 12 }}>
                <View
                  style={{
                    height: 10,
                    borderRadius: 6,
                    backgroundColor: '#e5e7eb',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </View>
                <Text style={[s.small, { color: '#64748b', marginTop: 4 }]}>
                  {pct}% ocupado
                </Text>
              </View>

              {/* Acciones */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pressable
                  style={[s.button, { flex: 1, paddingVertical: 10 }]}
                  onPress={() =>
                    router.push({ pathname: '/inscribir', params: { p: p.id } })
                  }
                >
                  <Text style={s.buttonText}>Inscribir</Text>
                </Pressable>

                <Pressable
                  style={[
                    s.button,
                    {
                      flex: 1,
                      paddingVertical: 10,
                      backgroundColor: '#475569',
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/pueblos/[id]',
                      params: { id: p.id, hideCi: '1' }, // enviamos flag para ocultar CI
                    })
                  }
                >
                  <Text style={s.buttonText}>Ver inscriptos</Text>
                </Pressable>
              </View>

              {/* Nota si está completo */}
              {completo && (
                <Text style={[s.small, { color: '#dc2626', marginTop: 10 }]}>
                  Este pueblo ya no tiene lugares disponibles.
                </Text>
              )}
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

/* ==================== COMPONENTES AUXILIARES ==================== */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
      }}
    >
      <Text style={[s.small, { color: '#64748b' }]}>{label}</Text>
      <Text style={[s.text, { fontWeight: '700', color: '#0f172a' }]}>{value}</Text>
    </View>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  )
}
