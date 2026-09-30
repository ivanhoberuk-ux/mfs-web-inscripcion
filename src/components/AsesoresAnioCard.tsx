// FILE: src/components/AsesoresAnioCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { fetchAsesoresConfirmados, fetchAñoActivo, type AsesorRow } from '../lib/api'
import { colors, spacing, radius, shadows } from '../lib/designSystem'
import { Ionicons } from '@expo/vector-icons'
import { InitialAvatar } from './PageHeader'


const TIPO_LABEL: Record<string, string> = {
  padre_schoenstatt: 'Padre de Schoenstatt',
  diocesano: 'Sacerdote Diocesano',
  hermana_maria: 'Hermana de María',
}

export function AsesoresAnioCard() {
  const [loading, setLoading] = useState(true)
  const [AÑO, setAÑO] = useState<number | null>(null)
  const [asesores, setAsesores] = useState<AsesorRow[]>([])
  const [pueblosMap, setPueblosMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const año = await fetchAñoActivo()
        if (active) setAÑO(año)
        const [list, { data: pueblos }] = await Promise.all([
          fetchAsesoresConfirmados(año),
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
       ...shadows.md, borderWidth: 1, borderColor: colors.primary[50],
      width: '100%',
    }}>
       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}><Ionicons name="heart-outline" size={21} color={colors.primary[600]} /><Text style={{ fontSize: 14, fontWeight: '800', color: colors.text.primary.light }}>Asesores espirituales {AÑO ?? ''}</Text></View>
      {asesores.map((a) => {
        const pueblos = (a.pueblos_acompana ?? []).map(id => pueblosMap[id]).filter(Boolean)
        return (
           <View key={a.id} style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><InitialAvatar name={`${a.nombres} ${a.apellidos}`} /> <View style={{ flex: 1 }}>
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
           </View></View>
        )
      })}
    </View>
  )
}
