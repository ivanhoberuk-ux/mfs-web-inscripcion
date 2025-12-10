// FILE: app/(tabs)/pueblos.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native'
import { s, colors, spacing } from '../../src/lib/theme'
import { radius } from '../../src/lib/designSystem'
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

  // Animación de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchOcupacion()
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
      {/* Header con emoji */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={[s.title, { fontSize: 28 }]}>
            🏠 Pueblos
          </Text>
          <Button variant="secondary" onPress={load}>
            🔄 Actualizar
          </Button>
        </View>

        {!!lastUpdated && (
          <Text style={[s.small, { color: colors.text.tertiary.light, marginBottom: 10 }]}>
            ⏰ Última actualización: {lastUpdated}
          </Text>
        )}
      </Animated.View>

      {/* Lista de pueblos */}
      {loading ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>🏕️</Text>
          <ActivityIndicator size="large" style={{ marginTop: 16 }} />
          <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>Cargando pueblos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 48 }}>🤷</Text>
          <Text style={[s.text, { color: colors.text.tertiary.light, marginTop: 8 }]}>No hay pueblos registrados.</Text>
        </View>
      ) : (
        items.map((p, index) => (
          <PuebloCard key={p.id} pueblo={p} router={router} delay={index * 100} />
        ))
      )}
    </ScrollView>
  )
}

/* ==================== COMPONENTES AUXILIARES ==================== */

function PuebloCard({ pueblo: p, router, delay }: { pueblo: Ocupacion; router: any; delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const total = p.cupo_max ?? 0
  const usados = p.usados ?? 0
  const libres = Math.max(p.libres ?? 0, 0)
  const pct = total > 0 ? Math.min(100, Math.round((usados / total) * 100)) : 0

  const completo = libres <= 0
  const inactivo = !p.activo

  // Emoji y color según estado
  let emoji = '🟢'
  let barColor = colors.success
  if (completo) {
    emoji = '🔴'
    barColor = colors.error
  } else if (pct >= 80) {
    emoji = '🟡'
    barColor = colors.warning
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <Card
        style={{
          marginBottom: 14,
          opacity: inactivo ? 0.6 : 1,
          borderWidth: 2,
          borderColor: completo ? colors.error : colors.primary[100],
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
            <Text
              style={[
                s.text,
                { fontWeight: '700', fontSize: 18 },
              ]}
            >
              {p.nombre}
            </Text>
          </View>

          {inactivo && <Badge label="INACTIVO" color={colors.neutral[500]} emoji="⏸️" />}
          {completo && <Badge label="COMPLETO" color={colors.error} emoji="🚫" />}
        </View>

        {/* Métricas con emojis */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <Stat label="Cupo" value={String(total)} emoji="👥" />
          <Stat label="Inscriptos" value={String(usados)} emoji="✅" />
          <Stat label="Restantes" value={String(libres)} emoji="🎫" />
        </View>

        {/* Barra de progreso */}
        <View style={{ marginTop: 12 }}>
          <View
            style={{
              height: 12,
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
                borderRadius: 6,
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
            ✍️ Inscribir
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
            👀 Ver inscriptos
          </Button>
        </View>

        {/* Nota si está completo */}
        {completo && (
          <View style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: '#fee2e2',
            borderRadius: radius.md,
          }}>
            <Text style={{ color: colors.error, fontSize: 13 }}>
              🚫 Este pueblo ya no tiene lugares disponibles.
            </Text>
          </View>
        )}
      </Card>
    </Animated.View>
  )
}

function Stat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: colors.primary[50],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary[100],
      }}
    >
      <Text style={{ fontSize: 12, color: colors.text.tertiary.light }}>{emoji} {label}</Text>
      <Text style={[s.text, { fontWeight: '700', fontSize: 16 }]}>{value}</Text>
    </View>
  )
}

function Badge({ label, color, emoji }: { label: string; color: string; emoji?: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {emoji && <Text style={{ fontSize: 12 }}>{emoji}</Text>}
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  )
}
