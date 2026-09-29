// FILE: src/components/MiInscripcionCard.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Modal, Pressable, Platform, Alert } from 'react-native'
import { useAuth } from '../context/AuthProvider'
import { fetchMiInscripcion, fetchAñoActivo } from '../lib/api'
import { supabase } from '../lib/supabase'
import { colors, spacing, radius, shadows } from '../lib/designSystem'

function fechaAsuncion(iso: string) {
  return new Date(iso).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function promocionPendiente(r: Row, now: number) {
  return r.estado === 'confirmado' && !!r.promocion_vence_at && !r.promocion_confirmada_at
    && new Date(r.promocion_vence_at).getTime() > now
}

function restante(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

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
  const [AÑO, setAño] = useState<number>(new Date().getFullYear())
  const [now, setNow] = useState(Date.now())
  const [reload, setReload] = useState(0)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  async function confirmar(r: Row) {
    try {
      setConfirmando(r.id)
      const { data, error } = await supabase.rpc('confirmar_promocion' as any, { p_registro_id: r.id })
      if (error) throw error
      if (data && (data as any).ok === false) throw new Error((data as any).error || (data as any).mensaje || 'No se pudo confirmar')
      const msg = `🎉 ¡Listo! Tu lugar en ${r.pueblo_nombre} quedó confirmado.`
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Confirmado', msg)
      setReload((x) => x + 1)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg)
    } finally {
      setConfirmando(null)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user?.email) { setLoading(false); return }
      try {
        const [data, año] = await Promise.all([fetchMiInscripcion(user.email), fetchAñoActivo()])
        if (!active) return
        setAño(año)
        const filtered = data.filter(r => r.año === año)
        setRows(filtered)
        // Primera vez que aparece confirmado → popup de bienvenida (titular, no hijos)
        const propio = filtered.find(r => r.estado === 'confirmado' && r.rol !== 'Hijo' && !promocionPendiente(r, Date.now()))
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
  }, [user?.email, reload])

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
          const pendiente = promocionPendiente(r, now)
          const confirmado = r.estado === 'confirmado' && !pendiente
          const enEspera = r.estado === 'lista_espera'
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
              {enEspera && r.lista_espera_pos != null && (
                <View style={{
                  marginTop: 8, padding: 10, backgroundColor: '#fef3c7', borderRadius: radius.sm,
                  borderLeftWidth: 4, borderLeftColor: '#d97706',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400e' }}>
                    ⏳ Estás en la posición {r.lista_espera_pos} de la lista de espera de {r.pueblo_nombre}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                    Si alguien se da de baja, subirás automáticamente.
                  </Text>
                </View>
              )}
              {pendiente && r.promocion_vence_at && (
                <View style={{
                  marginTop: 8, padding: 12, backgroundColor: '#e0f2fe', borderRadius: radius.sm,
                  borderWidth: 2, borderColor: '#0284c7',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#075985' }}>
                    🎉 ¡Se liberó un lugar para vos en {r.pueblo_nombre}! Confirmá antes del {fechaAsuncion(r.promocion_vence_at)}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#0369a1', marginTop: 4 }}>
                    ⏱️ Te quedan {restante(r.promocion_vence_at, now)}. Si no confirmás, el lugar pasa a la siguiente persona.
                  </Text>
                  <Pressable
                    onPress={() => confirmar(r)}
                    disabled={confirmando === r.id}
                    style={{ marginTop: 10, backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center', opacity: confirmando === r.id ? 0.6 : 1 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                      {confirmando === r.id ? 'Confirmando...' : '✅ Confirmar mi lugar'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {r.seleccion_publicada && r.estado === 'confirmado' && r.seleccion === 'seleccionado' && (
                <View style={{ marginTop: 8, padding: 12, backgroundColor: '#dcfce7', borderRadius: radius.sm, borderWidth: 2, borderColor: '#16a34a' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803d' }}>
                    🎉 ¡Fuiste seleccionado/a para misionar en {r.pueblo_nombre}!
                  </Text>
                </View>
              )}
              {r.seleccion_publicada && r.estado === 'confirmado' && r.seleccion === 'suplente' && (
                <View style={{ marginTop: 8, padding: 10, backgroundColor: '#fef3c7', borderRadius: radius.sm, borderLeftWidth: 4, borderLeftColor: '#d97706' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400e' }}>
                    🕒 Quedaste como suplente N° {r.orden_suplente ?? '—'}. Si se libera un lugar te avisamos por email.
                  </Text>
                </View>
              )}
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
