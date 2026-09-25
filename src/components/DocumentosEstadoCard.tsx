// FILE: src/components/DocumentosEstadoCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { colors, spacing, radius, shadows } from '../lib/designSystem'
import { Button } from './Button'
import { documentosFaltantes } from '../lib/documentos'

type Reg = {
  id: string
  nombres: string
  apellidos: string
  rol: string | null
  nacimiento: string | null
  cedula_frente_url: string | null
  cedula_dorso_url: string | null
  autorizacion_url: string | null
  ficha_medica_url: string | null
  firma_url: string | null
}

export function DocumentosEstadoCard() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [registros, setRegistros] = useState<Reg[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user?.email) { setLoading(false); return }
      setLoading(true)
      const { fetchAñoActivo } = await import('../lib/api')
      const añoVigente = await fetchAñoActivo()
      const { data } = await supabase
        .from('registros')
        .select('id,nombres,apellidos,rol,nacimiento,cedula_frente_url,cedula_dorso_url,autorizacion_url,ficha_medica_url,firma_url')
        .eq('email', user.email)
        .is('deleted_at', null)
        .eq('año', añoVigente)
        .order('created_at', { ascending: true })
      if (!active) return
      setRegistros((data ?? []) as Reg[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [user?.email])

  if (!user) return null

  if (loading) {
    return (
      <View style={{
        width: '100%', backgroundColor: colors.surface.light, borderRadius: radius.lg,
        padding: spacing.lg, ...shadows.sm, alignItems: 'center',
      }}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    )
  }

  if (registros.length === 0) return null

  // Calcular faltantes por inscripto
  const detalles = registros.map(r => {
    const faltan = documentosFaltantes(r)
    return { reg: r, faltan }
  })

  const todoCompleto = detalles.every(d => d.faltan.length === 0)

  if (todoCompleto) {
    return (
      <View style={{
        width: '100%',
        backgroundColor: '#ECFDF5',
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: '#34D399',
        ...shadows.sm,
        gap: 8,
      }}>
        <Text style={{ fontSize: 28, textAlign: 'center' }}>✅</Text>
        <Text style={{
          fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#065F46',
        }}>
          ¡Ya cargaste todos los documentos! 🎉
        </Text>
        <Text style={{ fontSize: 13, textAlign: 'center', color: '#047857' }}>
          Está todo en orden para la misión.
        </Text>
      </View>
    )
  }

  return (
    <View style={{
      width: '100%',
      backgroundColor: '#FFFBEB',
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: '#F59E0B',
      ...shadows.sm,
      gap: 10,
    }}>
      <Text style={{ fontSize: 28, textAlign: 'center' }}>📄</Text>
      <Text style={{
        fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#78350F',
      }}>
        Te faltan documentos por cargar
      </Text>

      <View style={{ gap: 8, marginTop: 4 }}>
        {detalles.map(({ reg, faltan }) => (
          <View key={reg.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: radius.md,
            padding: spacing.sm,
            borderLeftWidth: 3,
            borderLeftColor: faltan.length === 0 ? '#10B981' : '#F59E0B',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary[700] }}>
              {faltan.length === 0 ? '✅ ' : '⚠️ '}{reg.nombres} {reg.apellidos}
            </Text>
            {faltan.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                Documentos completos
              </Text>
            ) : (
              <View style={{ marginTop: 4, gap: 2 }}>
                {faltan.map(k => (
                  <Text key={k} style={{ fontSize: 12, color: '#92400E' }}>
                    • {k}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <Button
        variant="primary"
        onPress={() => router.push('/documentos')}
        style={{ marginTop: 6 }}
      >
        📤 Cargar mis documentos
      </Button>
    </View>
  )
}
