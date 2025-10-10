// FILE: app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, View, Image, Text, Pressable, ActivityIndicator } from 'react-native'
import { s } from '../../src/lib/theme'
import { publicUrl } from '../../src/lib/api'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthProvider'
import { supabase } from '../../src/lib/supabase'

type UserRoleRow = { role: 'admin' | 'user' }

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  // URL pública del logo en Supabase Storage
  const LOGO_URL = useMemo(() => publicUrl('logos', 'mfs-logo.png') + `?cb=${Date.now()}`, [])
  const [loadErr, setLoadErr] = useState(false)

  // Rol desde tabla user_roles (RLS permite leer solo la propia fila)
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [loadingRole, setLoadingRole] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.id) {
        setRole(null)
        return
      }
      setLoadingRole(true)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle<UserRoleRow>()
      if (!mounted) return
      if (error) {
        console.warn('No se pudo leer user_roles:', error.message)
        setRole(null)
      } else {
        setRole((data?.role as 'admin' | 'user' | undefined) ?? null)
      }
      setLoadingRole(false)
    })()
    return () => {
      mounted = false
    }
  }, [user?.id])

  async function onLogout() {
    try {
      await signOut()
      // Si querés redirigir al login:
      // router.replace('/login')
    } catch (e: any) {
      console.warn('Error al cerrar sesión:', e?.message ?? e)
    }
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{
        paddingVertical: 32,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 20,
        paddingBottom: 96, // evita que tape la tab bar
      }}
    >
      {/* HERO / LOGO */}
      <View
        style={{
          width: 240,
          height: 240,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {!loadErr ? (
          <Image
            source={{ uri: LOGO_URL }}
            style={{ width: '90%', height: '90%', resizeMode: 'contain' }}
            accessibilityLabel="Logo Misiones Familiares de Schoenstatt"
            onError={() => setLoadErr(true)}
          />
        ) : (
          <Text style={[s.small, { color: '#666', padding: 12, textAlign: 'center' }]}>
            No se pudo cargar el logo
          </Text>
        )}
      </View>

      {/* Título */}
      <Text style={[s.title, { textAlign: 'center' }]}>
        Bienvenido a la WEB de inscripción a las MFS
      </Text>

      {/* Accesos rápidos (grid) */}
      <View
        style={{
          width: '100%',
          gap: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <QuickButton
          icon="person-add-outline"
          label="Inscribirme"
          onPress={() => router.push('/inscribir')}
        />
        <QuickButton
          icon="document-text-outline"
          label="Documentos"
          onPress={() => router.push('/documentos')}
        />
        <QuickButton
          icon="home-outline"
          label="Pueblos"
          onPress={() => router.push('/pueblos')}
        />
        {/* Admin solo si sos admin */}
        {loadingRole ? (
          <SkeletonButton />
        ) : role === 'admin' ? (
          <QuickButton
            icon="settings-outline"
            label="Admin"
            onPress={() => router.push('/admin')}
          />
        ) : null}
      </View>

      {/* Sección de sesión (si hay usuario) */}
      {user ? (
        <View
          style={{
            width: '100%',
            marginTop: 8,
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Text style={[s.text, { textAlign: 'center' }]}>
            Sesión iniciada como: <Text style={{ fontWeight: '700' }}>{user.email}</Text>
            {role ? <Text>{`  ·  Rol: ${role}`}</Text> : null}
          </Text>

          <Pressable
            onPress={onLogout}
            style={[
              s.button,
              {
                backgroundColor: '#d94646',
                paddingVertical: 12,
                paddingHorizontal: 20,
                alignSelf: 'stretch',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={s.buttonText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : (
        // Si no hay sesión, ofrecer login rápido
        <View style={{ width: '100%', marginTop: 4 }}>
          <Pressable
            onPress={() => router.push('/login')}
            style={[
              s.button,
              {
                paddingVertical: 12,
                paddingHorizontal: 20,
                alignSelf: 'stretch',
                backgroundColor: '#0a7ea4',
              },
            ]}
          >
            <Text style={s.buttonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

type QuickProps = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }

function QuickButton({ icon, label, onPress }: QuickProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          minWidth: 160,
          flexGrow: 1,
          maxWidth: 360,
          backgroundColor: '#0a7ea4',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: pressed ? 0.9 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

function SkeletonButton() {
  return (
    <View
      style={{
        minWidth: 160,
        flexGrow: 1,
        maxWidth: 360,
        height: 52,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
      }}
    />
  )
}
