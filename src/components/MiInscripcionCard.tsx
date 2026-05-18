// FILE: src/components/MiInscripcionCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Modal, Pressable, Platform } from 'react-native'
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

function storageGet(key: string): string | null {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage.getItem(key)
  } catch {}
  return null
}
function storageSet(key: string, value: string) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.localStorage.setItem(key, value)
  } catch {}
}

export function MiInscripcionCard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [welcome, setWelcome] = useState<Row | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user?.email) { setLoading(false); return }
      try {
        const data = await fetchMiInscripcion(user.email)
        if (!active) return
        const filtered = data.filter(r => r.año === AÑO)
        setRows(filtered)
        // Primera vez que aparece confirmado → popup de bienvenida (titular, no hijos)
        const propio = filtered.find(r => r.estado === 'confirmado' && r.rol !== 'Hijo')
        if (propio) {
          const key = `welcome_shown_${propio.id}`
          if (!storageGet(key)) {
            setWelcome(propio)
            storageSet(key, '1')
          }
        }
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

  const isAsesor = welcome?.rol === 'Asesor'

  return (
    <>
      <View style={{
        backgroundColor: colors.surface.light, borderRadius: radius.lg, padding: spacing.md,
        ...shadows.md, borderWidth: 2, borderColor: colors.primary[200],
      }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary[700], marginBottom: 8 }}>
          📋 Mi inscripción {AÑO}
        </Text>
        {rows.map((r) => {
          const info = estadoInfo(r.estado)
          const confirmado = r.estado === 'confirmado'
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
              {confirmado && (
                <View style={{
                  marginTop: 8, padding: 10, backgroundColor: '#dcfce7', borderRadius: radius.sm,
                  borderLeftWidth: 4, borderLeftColor: '#16a34a',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d' }}>
                    🎉 ¡Bienvenido/a a esta hermosa locura de amor!
                  </Text>
                </View>
              )}
            </View>
          )
        })}
      </View>

      <Modal
        visible={!!welcome}
        transparent
        animationType="fade"
        onRequestClose={() => setWelcome(null)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center', alignItems: 'center', padding: 24,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg,
            maxWidth: 420, width: '100%', ...shadows.md,
          }}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', textAlign: 'center', color: colors.primary[700], marginBottom: 12 }}>
              {isAsesor ? '¡Tu inscripción fue confirmada!' : '¡Bienvenido/a!'}
            </Text>
            <Text style={{ fontSize: 15, textAlign: 'center', color: colors.text.primary.light, marginBottom: 16, lineHeight: 22 }}>
              {isAsesor
                ? `🙏 ¡Gracias por sumarte como Asesor espiritual! Un administrador validó tu inscripción. ¡Bienvenido/a a esta hermosa locura de amor!`
                : `¡Bienvenido/a a esta hermosa locura de amor! Tu inscripción está confirmada para la misión ${AÑO}.`}
            </Text>
            <Pressable
              onPress={() => setWelcome(null)}
              style={{
                backgroundColor: colors.primary[600], paddingVertical: 12,
                borderRadius: radius.sm, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>¡Vamos! 🚀</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}
