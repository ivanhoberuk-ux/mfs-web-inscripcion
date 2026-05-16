// FILE: app/(tabs)/baja.tsx
// Página para que los usuarios autenticados puedan buscar su inscripción y darse de baja

import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator, Animated, Platform } from 'react-native'
import { Card } from '../../src/components/Card'
import { Field } from '../../src/components/Field'
import { Button } from '../../src/components/Button'
import { supabase } from '../../src/lib/supabase'
import { colors, radius } from '../../src/lib/designSystem'
import { s } from '../../src/lib/theme'
import { useAuth } from '../../src/context/AuthProvider'

type Registro = {
  id: string
  nombres: string
  apellidos: string
  ci: string
  email: string
  telefono: string
  rol: string
  estado: string
  pueblo_nombre: string
  created_at: string
}

export default function BajaScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [procesando, setProcesando] = useState(false)

  // Animación de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <ScrollView 
        style={[s.screen, { backgroundColor: colors.background.light }]}
        contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}
      >
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={[s.title, { textAlign: 'center', marginTop: 12 }]}>
          Iniciar sesión requerido
        </Text>
        <Text style={[s.text, { textAlign: 'center', color: colors.text.secondary.light, marginTop: 8 }]}>
          Para dar de baja tu inscripción, primero necesitás iniciar sesión con tu cuenta.
        </Text>
      </ScrollView>
    )
  }

  const buscarMiInscripcion = async () => {
    setLoading(true)
    setRegistro(null)

    try {
      // Only search by the authenticated user's email
      const { data, error } = await supabase
        .from('registros')
        .select(`
          id,
          nombres,
          apellidos,
          ci,
          email,
          telefono,
          rol,
          estado,
          created_at,
          pueblo_id,
          pueblos!inner(nombre)
        `)
        .eq('email', user.email!)
        .is('deleted_at', null)
        .limit(1)
        .single()

      if (error || !data) {
        Alert.alert(
          'No encontrado 🔍',
          'No se encontró ninguna inscripción asociada a tu cuenta de email.'
        )
        return
      }

      // @ts-ignore - pueblos viene como array
      const pueblo_nombre = data.pueblos?.nombre || 'Desconocido'

      setRegistro({
        ...data,
        pueblo_nombre,
      })

    } catch (error: any) {
      console.error('Error al buscar:', error)
      Alert.alert('Error', 'Hubo un problema al buscar tu inscripción')
    } finally {
      setLoading(false)
    }
  }

  const confirmarBaja = () => {
    if (!registro) return

    const estadoTexto = 
      registro.estado === 'confirmado' ? 'confirmada' :
      registro.estado === 'lista_espera' ? 'en lista de espera' :
      registro.estado

    const mensaje = `¿Estás seguro que querés dar de baja tu inscripción ${estadoTexto} para ${registro.pueblo_nombre}?\n\nEsta acción no se puede deshacer.`

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Confirmar baja?\n\n${mensaje}`)) {
        procesarBaja()
      }
      return
    }

    Alert.alert(
      '¿Confirmar baja? 🤔',
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, dar de baja', 
          style: 'destructive',
          onPress: procesarBaja 
        },
      ]
    )
  }

  const procesarBaja = async () => {
    if (!registro) return

    setProcesando(true)

    try {
      const { data, error } = await supabase.functions.invoke('gestionar-baja', {
        body: {
          registro_id: registro.id,
          motivo: 'Usuario solicitó baja'
        }
      })

      if (error) throw error

      const mensajeOk = `Tu inscripción ha sido dada de baja exitosamente.${
        data.promovido ? `\n\n🎉 Se notificó a la siguiente persona en lista de espera.` : ''
      }`

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(`✅ Baja procesada\n\n${mensajeOk}`)
        setRegistro(null)
      } else {
        Alert.alert('✅ Baja procesada', mensajeOk, [
          { text: 'OK', onPress: () => setRegistro(null) }
        ])
      }

    } catch (error: any) {
      console.error('Error al procesar baja:', error)
      Alert.alert(
        'Error',
        'Hubo un problema al procesar tu baja. Por favor contactá con los organizadores.'
      )
    } finally {
      setProcesando(false)
    }
  }

  return (
    <ScrollView 
      style={[s.screen, { backgroundColor: colors.background.light }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Header con emoji */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 48 }}>👋</Text>
          <Text style={[s.title, { textAlign: 'center', marginTop: 8 }]}>
            Dar de baja
          </Text>
          <Text style={[s.text, { textAlign: 'center', color: colors.text.secondary.light }]}>
            Buscá tu inscripción para solicitar la baja
          </Text>
        </View>

        <Card style={{ 
          marginBottom: 16,
          borderWidth: 2,
          borderColor: colors.primary[100],
        }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary.light, marginBottom: 16 }}>
            🔍 Buscando inscripción para: <Text style={{ fontWeight: '600' }}>{user.email}</Text>
          </Text>

          {!registro && (
            <Button
              onPress={buscarMiInscripcion}
              disabled={loading}
              variant="primary"
            >
              {loading ? '🔄 Buscando...' : '🔍 Buscar mi inscripción'}
            </Button>
          )}
        </Card>
      </Animated.View>

      {loading && (
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48 }}>🔎</Text>
          <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 16 }} />
          <Text style={[s.text, { marginTop: 8 }]}>Buscando...</Text>
        </View>
      )}

      {registro && (
        <Animated.View
          style={{
            opacity: fadeAnim,
          }}
        >
          <Card style={{ 
            marginBottom: 16,
            borderWidth: 2,
            borderColor: registro.estado === 'confirmado' ? colors.success : colors.warning,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 8 }}>
                Tu inscripción
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <InfoRow label="Nombre" value={`${registro.nombres} ${registro.apellidos}`} emoji="👤" />
              <InfoRow label="Pueblo" value={registro.pueblo_nombre} emoji="🏠" />
              <InfoRow label="Rol" value={registro.rol} emoji="🎭" />
              
              <View style={{
                backgroundColor: registro.estado === 'confirmado' ? '#dcfce7' :
                               registro.estado === 'lista_espera' ? '#fef3c7' : '#fee2e2',
                padding: 12,
                borderRadius: radius.md,
              }}>
                <Text style={{ fontSize: 12, color: colors.text.tertiary.light }}>📊 Estado</Text>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '700',
                  color: registro.estado === 'confirmado' ? '#10b981' :
                         registro.estado === 'lista_espera' ? '#f59e0b' : '#ef4444'
                }}>
                  {registro.estado === 'confirmado' ? '✅ Confirmado' :
                   registro.estado === 'lista_espera' ? '📋 Lista de espera' :
                   registro.estado === 'cancelado' ? '❌ Cancelado' : registro.estado}
                </Text>
              </View>

              <InfoRow 
                label="Fecha de inscripción" 
                value={new Date(registro.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} 
                emoji="📅" 
              />
            </View>

            {registro.estado !== 'cancelado' && (
              <View style={{ marginTop: 24, gap: 8 }}>
                <Button
                  onPress={confirmarBaja}
                  disabled={procesando}
                  variant="danger"
                >
                  {procesando ? '⏳ Procesando...' : '🚪 Dar de baja mi inscripción'}
                </Button>
                
                <Button
                  onPress={() => {
                    setRegistro(null)
                  }}
                  disabled={procesando}
                  variant="outline"
                >
                  ← Cancelar
                </Button>
              </View>
            )}

            {registro.estado === 'cancelado' && (
              <View style={{ 
                marginTop: 16, 
                padding: 12, 
                backgroundColor: '#fee2e2', 
                borderRadius: radius.md,
              }}>
                <Text style={{ color: '#991b1b', fontSize: 14 }}>
                  ❌ Esta inscripción ya fue cancelada anteriormente
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>
      )}

      {!registro && !loading && (
        <View style={{ 
          padding: 20, 
          backgroundColor: colors.primary[50],
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.primary[100],
        }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary.light, textAlign: 'center' }}>
            🔄 Si te das de baja y el cupo estaba lleno, la próxima persona en lista de espera será promovida automáticamente
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

function InfoRow({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: colors.text.tertiary.light, marginBottom: 2 }}>
        {emoji} {label}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.primary.light }}>
        {value}
      </Text>
    </View>
  )
}
