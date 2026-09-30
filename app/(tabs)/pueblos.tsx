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
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { s, colors, spacing } from '../../src/lib/theme'
import { radius } from '../../src/lib/designSystem'
import { fetchOcupacion, type Ocupacion } from '../../src/lib/api'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { useUserRoles } from '../../src/hooks/useUserRoles'
import { Badge as StatusBadge } from '../../src/components/Badge'
import { PageHeader } from '../../src/components/PageHeader'

export default function Pueblos() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const columns = width >= 1180 ? 3 : width >= 720 ? 2 : 1
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
    load()
  }, [load])

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={[s.pageContent, { paddingHorizontal: width < 600 ? 0 : spacing.md }]}
    >
      {/* Header con emoji */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <PageHeader icon="map-outline" title="Pueblos" subtitle="Elegí dónde querés vivir la misión" trailing={<Button variant="ghost" onPress={load}><Ionicons name="refresh" size={20} color={colors.primary[600]} /></Button>} />

        {!!lastUpdated && (
          <Text style={[s.small, { color: colors.text.tertiary.light, marginBottom: 10 }]}>
            Última actualización: {lastUpdated}
          </Text>
        )}
      </Animated.View>

      {/* Lista de pueblos */}
      {loading ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Ionicons name="map-outline" size={48} color={colors.primary[300]} />
          <ActivityIndicator size="large" style={{ marginTop: 16 }} />
          <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>Cargando pueblos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Ionicons name="map-outline" size={48} color={colors.text.tertiary.light} />
          <Text style={[s.text, { color: colors.text.tertiary.light, marginTop: 8 }]}>No hay pueblos registrados.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {items.map((p, index) => <View key={p.id} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><PuebloCard pueblo={p} router={router} delay={index * 70} /></View>)}
        </View>
      )}
    </ScrollView>
  )
}

/* ==================== COMPONENTES AUXILIARES ==================== */

function PuebloActions({ puebloId, router }: { puebloId: string; router: any }) {
  const { isSuperAdmin, isPuebloAdmin, isCoAdmin, puebloId: userPuebloId } = useUserRoles();
  const canVerInscriptos = isSuperAdmin || ((isPuebloAdmin || isCoAdmin) && userPuebloId === puebloId);

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
      <Button
        variant="primary"
        style={{ flex: 1 }}
        onPress={() => router.push({ pathname: '/inscribir', params: { p: puebloId } })}
      >
        Inscribirme
      </Button>
      {canVerInscriptos && (
        <Button
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/pueblos/[id]', params: { id: puebloId, hideCi: '1' } })}
        >
          Ver inscriptos
        </Button>
      )}
    </View>
  );
}

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
  const menores = p.menores ?? 0
  const totalPersonas = p.total_personas ?? (usados + menores)
  const libres = Math.max(p.libres ?? 0, 0)
  const enEspera = p.en_espera ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((usados / total) * 100)) : 0


  const completo = libres <= 0
  const inactivo = !p.activo

  let barColor = colors.success
  if (completo) {
    barColor = colors.accent[500]
  } else if (pct >= 80) {
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
          borderWidth: 1,
          borderColor: colors.primary[50],
          minHeight: 330,
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
             <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: completo ? colors.accent[50] : colors.mint[100], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="location-outline" size={22} color={completo ? colors.accent[700] : colors.mint[600]} /></View>
            <Text
              style={[
                s.text,
                { fontWeight: '700', fontSize: 18 },
              ]}
            >
              {p.nombre}
            </Text>
          </View>

           {inactivo && <StatusBadge tone="neutral">Inactivo</StatusBadge>}
           {completo && <StatusBadge tone="danger">Lista de espera</StatusBadge>}
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
          <Stat label="Cupo" value={String(total)} />
          <Stat label="Misioneros" value={String(usados)} />
          <Stat label="Libres" value={String(libres)} />
          {menores > 0 && (
            <Stat label="Menores" value={String(menores)} />
          )}
          <Stat label="En espera" value={String(enEspera)} />

        </View>

        {menores > 0 && (
          <Text style={[s.small, { marginTop: 8, color: colors.text.tertiary.light, fontStyle: 'italic' }]}>
            👨‍👩‍👧‍👦 Total de personas inscriptas: <Text style={{ fontWeight: '700' }}>{totalPersonas}</Text> (incluye {menores} {menores === 1 ? 'menor' : 'menores'} de 12). Estar inscripto no asegura el lugar para viajar: luego se hace una selección según el compromiso en las reuniones.
          </Text>
        )}

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
        <PuebloActions puebloId={p.id} router={router} />

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

function Stat({ label, value }: { label: string; value: string }) {
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
      <Text style={{ fontSize: 12, color: colors.text.tertiary.light }}>{label}</Text>
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
