// FILE: src/components/AsesoresValidacionPanel.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { fetchAsesoresPendientes, validarAsesor, type AsesorRow } from '../lib/api'
import { colors, spacing, radius, shadows } from '../lib/designSystem'

const TIPO_LABEL: Record<string, string> = {
  padre_schoenstatt: 'Padre de Schoenstatt',
  diocesano: 'Sacerdote Diocesano',
  hermana_maria: 'Hermana de María',
}

export function AsesoresValidacionPanel() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AsesorRow[]>([])
  const [pueblosMap, setPueblosMap] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, { data: pueblos }] = await Promise.all([
        fetchAsesoresPendientes(),
        supabase.from('pueblos').select('id, nombre'),
      ])
      setItems(list)
      const map: Record<string, string> = {}
      ;(pueblos ?? []).forEach((p: any) => { map[p.id] = p.nombre })
      setPueblosMap(map)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function onValidar(id: string, nombre: string) {
    const ok = typeof window !== 'undefined' ? window.confirm(`¿Confirmar a ${nombre} como Asesor?`) : true
    if (!ok) return
    setValidating(id)
    try {
      await validarAsesor(id)
      setItems(prev => prev.filter(x => x.id !== id))
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo validar')
    } finally {
      setValidating(null)
    }
  }

  if (loading) {
    return <View style={{ padding: 16 }}><ActivityIndicator color={colors.primary[600]} /></View>
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary[700] }}>
          🙏 Asesores pendientes de validación ({items.length})
        </Text>
        <Pressable
          onPress={load}
          style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary[100], borderRadius: radius.sm }}
        >
          <Text style={{ fontWeight: '700', color: colors.primary[700] }}>↻ Refrescar</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={{ padding: 16, backgroundColor: colors.surface.light, borderRadius: radius.md, ...shadows.sm }}>
          <Text style={{ color: colors.text.secondary.light }}>No hay asesores pendientes ✨</Text>
        </View>
      ) : (
        items.map((a) => {
          const pueblos = (a.pueblos_acompana ?? []).map(id => pueblosMap[id]).filter(Boolean)
          return (
            <View key={a.id} style={{
              backgroundColor: colors.surface.light, borderRadius: radius.md, padding: spacing.md,
              ...shadows.sm, borderWidth: 1, borderColor: colors.primary[100], gap: 4,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text.primary.light }}>
                {a.nombres} {a.apellidos}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary.light }}>
                {TIPO_LABEL[a.tipo_asesor ?? ''] ?? '—'} · CI {a.ci}
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary.light }}>
                📧 {a.email} · 📞 {a.telefono}
              </Text>
              {pueblos.length > 0 && (
                <Text style={{ fontSize: 12, color: colors.primary[600] }}>
                  Acompaña: {pueblos.join(', ')}
                </Text>
              )}
              <Pressable
                onPress={() => onValidar(a.id, `${a.nombres} ${a.apellidos}`)}
                disabled={validating === a.id}
                style={{
                  marginTop: 8, alignSelf: 'flex-start',
                  paddingHorizontal: 14, paddingVertical: 8,
                  backgroundColor: '#16a34a', borderRadius: radius.sm,
                  opacity: validating === a.id ? 0.6 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {validating === a.id ? 'Validando…' : '✅ Validar'}
                </Text>
              </Pressable>
            </View>
          )
        })
      )}
    </View>
  )
}
