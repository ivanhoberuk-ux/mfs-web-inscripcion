// FILE: app/(tabs)/baja.tsx
// Página para que los usuarios puedan buscar su inscripción y darse de baja

import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native'
import { Card } from '../../src/components/Card'
import { Field } from '../../src/components/Field'
import { Button } from '../../src/components/Button'
import { supabase } from '../../src/lib/supabase'
import { colors, radius } from '../../src/lib/designSystem'
import { s } from '../../src/lib/theme'

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
  const [busqueda, setBusqueda] = useState('')
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

  const normalizeCi = (val: string) => val.replace(/\D/g, '')

  const buscarInscripcion = async () => {
    if (!busqueda.trim()) {
      Alert.alert('Error', 'Por favor ingresá tu cédula o email')
      return
    }

    setLoading(true)
    setRegistro(null)

    try {
      const esCi = /^\d+$/.test(busqueda.trim())
      
      let query = supabase
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
        .is('deleted_at', null)
        .limit(1)

      if (esCi) {
        query = query.eq('ci', normalizeCi(busqueda.trim()))
      } else {
        query = query.ilike('email', busqueda.trim())
      }

      const { data, error } = await query.single()

      if (error || !data) {
        Alert.alert(
          'No encontrado 🔍',
          'No se encontró ninguna inscripción con esos datos. Verificá que estén correctos.'
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

    Alert.alert(
      '¿Confirmar baja? 🤔',
      `¿Estás seguro que querés dar de baja tu inscripción ${estadoTexto} para ${registro.pueblo_nombre}?\n\nEsta acción no se puede deshacer.`,
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

      Alert.alert(
        '✅ Baja procesada',
        `Tu inscripción ha sido dada de baja exitosamente.${
          data.promovido 
            ? `\n\n🎉 Se notificó a ${data.promovido.nombres} ${data.promovido.apellidos} que ahora está confirmado.`
            : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRegistro(null)
              setBusqueda('')
            }
          }
        ]
      )

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
      contentContainerStyle={{ padding: 16 }}
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
            🔍 Ingresá tu cédula o email
          </Text>

          <Field
            label="Cédula o Email"
            placeholder="Ej: 12345678 o email@ejemplo.com"
            value={busqueda}
            onChangeText={setBusqueda}
            keyboardType="default"
            autoCapitalize="none"
            editable={!loading && !registro}
          />

          {!registro && (
            <Button
              onPress={buscarInscripcion}
              disabled={loading || !busqueda.trim()}
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
              <InfoRow label="Cédula" value={registro.ci} emoji="🪪" />
              <InfoRow label="Email" value={registro.email} emoji="📧" />
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
                    setBusqueda('')
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
          <Text style={{ fontSize: 14, color: colors.text.secondary.light, textAlign: 'center', marginBottom: 12 }}>
            💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> Podés buscar usando tu número de cédula o el email que usaste al inscribirte
          </Text>
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
