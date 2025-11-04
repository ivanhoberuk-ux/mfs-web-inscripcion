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
import { s, colors, spacing } from '../../src/lib/theme'
import { fetchOcupacion, type Ocupacion } from '../../src/lib/api'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { useUserRoles } from '../../src/hooks/useUserRoles'

export default function Pueblos() {
  const router = useRouter()
  const { isSuperAdmin, isPuebloAdmin, puebloId: userPuebloId, loading: rolesLoading } = useUserRoles();
  
  const [items, setItems] = useState<Ocupacion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchOcupacion()
      
      // Mostrar todos los pueblos sin importar el rol
      setItems(data);
      
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setLoading(false)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await fetchOcupacion()
      
      // Mostrar todos los pueblos sin importar el rol
      setItems(data);
      
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!rolesLoading) {
      load()
    }
  }, [load, rolesLoading])

  if (rolesLoading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Verificando permisos…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background.light }]}
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
        <Text style={s.title}>
          Pueblos
        </Text>
        <Button variant="secondary" onPress={load}>
          Actualizar
        </Button>
      </View>

      {!!lastUpdated && (
        <Text style={[s.small, { color: colors.text.tertiary.light, marginBottom: 10 }]}>
          Última actualización: {lastUpdated}
        </Text>
      )}

      {/* Lista de pueblos */}
      {loading ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>Cargando datos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={[s.text, { color: colors.text.tertiary.light }]}>No hay pueblos registrados.</Text>
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
          let barColor = colors.success
          if (completo) barColor = colors.error
          else if (pct >= 80) barColor = colors.warning

          return (
            <Card
              key={p.id}
              style={{
                marginBottom: 14,
                opacity: inactivo ? 0.6 : 1,
              }}
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
                    { fontWeight: '700', fontSize: 18, flex: 1 },
                  ]}
                >
                  {p.nombre}
                </Text>

                {inactivo && <Badge label="INACTIVO" color={colors.neutral[500]} />}
                {completo && <Badge label="COMPLETO" color={colors.error} />}
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
                    backgroundColor: colors.neutral[200],
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
                <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 4 }]}>
                  {pct}% ocupado
                </Text>
              </View>

              {/* Acciones */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() =>
                    router.push({ pathname: '/inscribir', params: { p: p.id } })
                  }
                >
                  Inscribir
                </Button>

                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() =>
                    router.push({
                      pathname: '/pueblos/[id]',
                      params: { id: p.id, hideCi: '1' },
                    })
                  }
                >
                  Ver inscriptos
                </Button>
              </View>

              {/* Nota si está completo */}
              {completo && (
                <Text style={[s.small, { color: colors.error, marginTop: 10 }]}>
                  Este pueblo ya no tiene lugares disponibles.
                </Text>
              )}
            </Card>
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
        backgroundColor: colors.neutral[100],
        borderRadius: 10,
      }}
    >
      <Text style={[s.small, { color: colors.text.tertiary.light }]}>{label}</Text>
      <Text style={[s.text, { fontWeight: '700' }]}>{value}</Text>
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
