// FILE: src/components/MiInscripcionCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuth } from '../context/AuthProvider'
import { fetchMiInscripcion } from '../lib/api'
import { colors, spacing, radius, shadows } from '../lib/designSystem'

const AÑO = 2026

type Row = Awaited<ReturnType<typeof fetchMiInscripcion>>[number]

function estadoInfo(estado: string): { emoji: string; label: string; color: string } {
  if (estado === 'confirmado') return { emoji: '✅', label: 'Confirmada', color: '#16a34a' }
  if (estado === 'lista_espera') return { emoji: '⏳', label: 'En lista de espera', color: '#d97706' }
  if (estado === 'pendiente_validacion') return { emoji: '🕓', label: 'Pendiente de validación', color: '#7c3aed' }
  if (estado === 'baja' || estado === 'cancelado') return { emoji: '❌', label: 'Dada de baja', color: '#dc2626' }
  return { emoji: 'ℹ️', label: estado, color: colors.text.secondary.light }
}

export function MiInscripcionCard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user?.email) { setLoading(false); return }
      try {
        const data = await fetchMiInscripcion(user.email)
        if (!active) return
        setRows(data.filter(r => r.año === AÑO))
      } catch (e) {
        console.error('[MiInscripcionCard]', e)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [user?.email])

  if (!user?.email) return null
  if (loading) {
    return (
      <View style={{
        backgroundColor: colors.surface.light, borderRadius: radius.lg, padding: spacing.md,
        ...shadows.sm, borderWidth: 1, borderColor: colors.primary[100],
      }}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    )
  }
  if (rows.length === 0) return null

  return (
    <View style={{
      backgroundColor: colors.surface.light, borderRadius: radius.lg, padding: spacing.md,
      ...shadows.md, borderWidth: 2, borderColor: colors.primary[200],
    }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
        📋 Mi inscripción {AÑO}
      </Text>
      {rows.map((r) => {
        const info = estadoInfo(r.estado)
        return (
          <View key={r.id} style={{ paddingVertical: 6, borderTopWidth: rows.length > 1 ? 1 : 0, borderTopColor: '#eee' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary.light }}>
              {r.nombres} {r.apellidos}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary.light, marginTop: 2 }}>
              {r.rol === 'Asesor' ? '🙏 Asesor' : `🏠 ${r.pueblo_nombre}`} · {r.rol}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: info.color, marginTop: 4 }}>
              {info.emoji} {info.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
