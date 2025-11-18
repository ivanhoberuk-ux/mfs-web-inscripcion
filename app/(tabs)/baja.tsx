// FILE: app/(tabs)/baja.tsx
// Página para que los usuarios puedan buscar su inscripción y darse de baja

import React, { useState } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native'
import { Card } from '../../src/components/Card'
import { Field } from '../../src/components/Field'
import { Button } from '../../src/components/Button'
import { supabase } from '../../src/lib/supabase'

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
          'No encontrado',
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
      '¿Confirmar baja?',
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
      // Llamar al edge function
      const { data, error } = await supabase.functions.invoke('gestionar-baja', {
        body: {
          registro_id: registro.id,
          motivo: 'Usuario solicitó baja'
        }
      })

      if (error) throw error

      Alert.alert(
        '✓ Baja procesada',
        `Tu inscripción ha sido dada de baja exitosamente.${
          data.promovido 
            ? `\n\nSe notificó a ${data.promovido.nombres} ${data.promovido.apellidos} que ahora está confirmado.`
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
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Dar de baja inscripción
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Buscá tu inscripción por cédula o email para darte de baja
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
            {loading ? 'Buscando...' : 'Buscar mi inscripción'}
          </Button>
        )}
      </Card>

      {loading && (
        <View style={{ alignItems: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {registro && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            📋 Tu inscripción
          </Text>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Nombre</Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {registro.nombres} {registro.apellidos}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Cédula</Text>
              <Text style={{ fontSize: 16 }}>{registro.ci}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Email</Text>
              <Text style={{ fontSize: 16 }}>{registro.email}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Pueblo</Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{registro.pueblo_nombre}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Rol</Text>
              <Text style={{ fontSize: 16 }}>{registro.rol}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Estado</Text>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: registro.estado === 'confirmado' ? '#10b981' :
                       registro.estado === 'lista_espera' ? '#f59e0b' : '#ef4444'
              }}>
                {registro.estado === 'confirmado' ? '✓ Confirmado' :
                 registro.estado === 'lista_espera' ? '📋 Lista de espera' :
                 registro.estado === 'cancelado' ? '✗ Cancelado' : registro.estado}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Fecha de inscripción
              </Text>
              <Text style={{ fontSize: 14 }}>
                {new Date(registro.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {registro.estado !== 'cancelado' && (
            <View style={{ marginTop: 24, gap: 8 }}>
              <Button
                onPress={confirmarBaja}
                disabled={procesando}
                variant="danger"
              >
                {procesando ? 'Procesando...' : 'Dar de baja mi inscripción'}
              </Button>
              
              <Button
                onPress={() => {
                  setRegistro(null)
                  setBusqueda('')
                }}
                disabled={procesando}
                variant="outline"
              >
                Cancelar
              </Button>
            </View>
          )}

          {registro.estado === 'cancelado' && (
            <View style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#fee2e2', 
              borderRadius: 8 
            }}>
              <Text style={{ color: '#991b1b', fontSize: 14 }}>
                Esta inscripción ya fue cancelada anteriormente
              </Text>
            </View>
          )}
        </Card>
      )}

      {!registro && !loading && (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            💡 Podés buscar tu inscripción usando tu número de cédula o el email que usaste al inscribirte
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            Si te das de baja y había cupo lleno, la próxima persona en lista de espera será promovida automáticamente
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
