// FILE: src/components/AsesoresAnioCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { fetchAsesoresConfirmados, type AsesorRow } from '../lib/api'
import { colors, spacing, radius, shadows } from '../lib/designSystem'

const AÑO = 2026

const TIPO_LABEL: Record<string, string> = {
  padre_schoenstatt: 'Padre de Schoenstatt',
  diocesano: 'Sacerdote Diocesano',
  hermana_maria: 'Hermana de María',
}

export function AsesoresAnioCard() {
  const [loading, setLoading] = useState(true)
  const [asesores, setAsesores] = useState<AsesorRow[]>([])
  const [pueblosMap, setPueblosMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [list, { data: pueblos }] = await Promise.all([
          fetchAsesoresConfirmados(AÑO),
          supabase.from('pueblos').select('id, nombre'),
        ])
        if (!active) return
        setAsesores(list)
        const map: Record<string, string> = {}
        ;(pueblos ?? []).forEach((p: any) => { map[p.id] = p.nombre })
        setPueblosMap(map)
      } catch (e) {
        console.error('[AsesoresAnioCard]', e)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  if (loading) return null
  if (asesores.length === 0) return null

  return (
    <View style={{
      backgroundColor: colors.surface.light, borderRadius: radius.lg, padding: spacing.md,
      ...shadows.md, borderWidth: 2, borderColor: colors.sky?.[200] ?? '#bae6fd',
      width: '100%',
    }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
        🙏 Asesores espirituales {AÑO}
      </Text>
      {asesores.map((a) => {
        const pueblos = (a.pueblos_acompana ?? []).map(id => pueblosMap[id]).filter(Boolean)
        return (
          <View key={a.id} style={{ paddingVertical: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary.light }}>
              {a.nombres} {a.apellidos}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary.light }}>
              {TIPO_LABEL[a.tipo_asesor ?? ''] ?? 'Asesor'}
            </Text>
            {pueblos.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.primary[600], marginTop: 2 }}>
                Acompaña: {pueblos.join(', ')}
              </Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
