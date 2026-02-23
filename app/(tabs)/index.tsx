// FILE: app/(tabs)/index.tsx
import React, { useEffect, useState, useRef } from 'react'
import { ScrollView, View, Image, Text, Pressable, Animated } from 'react-native'
import { s, colors, spacing, shadows } from '../../src/lib/theme'
import { radius } from '../../src/lib/designSystem'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/context/AuthProvider'
import { supabase } from '../../src/lib/supabase'
import { Button } from '../../src/components/Button'

type UserRoleRow = { role: 'admin' | 'user' }

// Emojis para cada botón
const BUTTON_EMOJIS: Record<string, string> = {
  'Inscribirme': '✍️',
  'Documentos': '📄',
  'Pueblos': '🏠',
  'Admin': '⚙️',
}

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  // Animaciones de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // URL pública del logo en Supabase Storage
  const LOGO_URL = 'https://npekpdkywsneylddzzuu.supabase.co/storage/v1/object/public/logos/mfs-logo.png'
  const [loadErr, setLoadErr] = useState(false)

  // Rol desde tabla user_roles
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
        .maybeSingle();
      if (!mounted) return
      if (error) {
        console.warn('No se pudo leer user_roles:', error.message)
        setRole(null)
      } else {
        setRole((data as UserRoleRow | null)?.role ?? null)
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
    } catch (e: any) {
      console.warn('Error al cerrar sesión:', e?.message ?? e)
    }
  }

  // Saludo dinámico según hora
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '¡Buenos días! ☀️'
    if (hour < 18) return '¡Buenas tardes! 🌤️'
    return '¡Buenas noches! 🌙'
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background.light }]}
      contentContainerStyle={{
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 24,
        paddingBottom: 120,
      }}
    >
      {/* Saludo animado */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={{
          fontSize: 28,
          fontWeight: '800',
          textAlign: 'center',
          color: colors.text.primary.light,
        }}>
          {getGreeting()}
        </Text>
      </Animated.View>

      {/* HERO / LOGO con gradiente decorativo */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: radius.xl,
            overflow: 'hidden',
            backgroundColor: colors.surface.light,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 4,
            borderColor: colors.primary[200],
            ...shadows.lg,
          }}
        >
          {!loadErr ? (
            <Image
              source={{ uri: LOGO_URL }}
              style={{ width: '85%', height: '85%', resizeMode: 'contain' }}
              accessibilityLabel="Logo Misiones Familiares de Schoenstatt"
              onError={() => setLoadErr(true)}
            />
          ) : (
            <Text style={{ fontSize: 64 }}>🏕️</Text>
          )}
        </View>
      </Animated.View>

      {/* Título con emoji */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={{
          fontSize: 22,
          fontWeight: '700',
          textAlign: 'center',
          color: colors.text.primary.light,
          paddingHorizontal: 16,
          lineHeight: 30,
        }}>
          Bienvenido a las MFS 💒
        </Text>
        <Text style={{
          fontSize: 15,
          textAlign: 'center',
          color: colors.text.secondary.light,
          marginTop: 8,
        }}>
          Encendé tu corazón. La misión arranca acá 🔥💛
        </Text>
      </Animated.View>

      {/* Accesos rápidos con emojis */}
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
          emoji="✍️"
          color={colors.primary[500]}
          onPress={() => router.push('/inscribir')}
          delay={100}
        />
        <QuickButton
          icon="document-text-outline"
          label="Documentos"
          emoji="📄"
          color={colors.secondary[500]}
          onPress={() => router.push('/documentos')}
          delay={200}
        />
        <QuickButton
          icon="home-outline"
          label="Pueblos"
          emoji="🏠"
          color={colors.info}
          onPress={() => router.push('/pueblos')}
          delay={300}
        />
        {loadingRole ? (
          <SkeletonButton />
        ) : role === 'admin' ? (
          <QuickButton
            icon="settings-outline"
            label="Admin"
            emoji="⚙️"
            color={colors.warning}
            onPress={() => router.push('/admin')}
            delay={400}
          />
        ) : null}
      </View>

      {/* Sección de sesión */}
      {user ? (
        <View
          style={{
            width: '100%',
            backgroundColor: colors.primary[50],
            borderRadius: radius.lg,
            padding: 20,
            gap: 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.primary[100],
          }}
        >
          <Text style={{ fontSize: 24 }}>👋</Text>
          <Text style={{
            fontSize: 15,
            textAlign: 'center',
            color: colors.text.secondary.light,
          }}>
            Hola, <Text style={{ fontWeight: '700', color: colors.primary[600] }}>{user.email?.split('@')[0]}</Text>
          </Text>
          {role && (
            <View style={{
              backgroundColor: colors.primary[100],
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: radius.full,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.primary[700],
              }}>
                {role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
              </Text>
            </View>
          )}

          <Button
            variant="danger"
            onPress={onLogout}
            style={{ alignSelf: 'stretch', marginTop: 8 }}
          >
            Cerrar sesión 👋
          </Button>
        </View>
      ) : (
        <View style={{ width: '100%', gap: 16 }}>
          {/* Card para crear cuenta */}
          <View
            style={{
              backgroundColor: colors.surface.light,
              borderRadius: radius.lg,
              padding: 20,
              gap: 12,
              borderWidth: 2,
              borderColor: colors.primary[100],
              ...shadows.md,
            }}
          >
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🎉</Text>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              textAlign: 'center',
              color: colors.text.primary.light,
            }}>
              ¿Ya te inscribiste?
            </Text>
            <Text style={{
              fontSize: 14,
              textAlign: 'center',
              color: colors.text.secondary.light,
            }}>
              Creá tu cuenta para ver tus documentos y más info 📱
            </Text>
            <Button
              variant="primary"
              onPress={() => router.push('/login?mode=signup')}
              style={{ alignSelf: 'stretch' }}
            >
              Crear cuenta ✨
            </Button>
          </View>

          {/* Botón de login */}
          <Button
            variant="outline"
            onPress={() => router.push('/login')}
            style={{ alignSelf: 'stretch' }}
          >
            Ya tengo cuenta 🔑
          </Button>
        </View>
      )}

      {/* Footer amigable */}
      <Text style={{
        fontSize: 12,
        color: colors.text.tertiary.light,
        textAlign: 'center',
        marginTop: 8,
      }}>
        Hecho con 💙 para las MFS Paraguay
      </Text>
    </ScrollView>
  )
}

type QuickProps = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  emoji: string
  color: string
  onPress: () => void
  delay?: number
}

function QuickButton({ icon, label, emoji, color, onPress, delay = 0 }: QuickProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        minWidth: 155,
        flexGrow: 1,
        maxWidth: 360,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            backgroundColor: color,
            borderRadius: radius.lg,
            paddingVertical: 18,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            ...shadows.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={{ fontSize: 28 }}>{emoji}</Text>
        <Text style={{
          color: colors.surface.light,
          fontWeight: '700',
          fontSize: 15,
        }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

function SkeletonButton() {
  return (
    <View
      style={{
        minWidth: 155,
        flexGrow: 1,
        maxWidth: 360,
        height: 90,
        borderRadius: radius.lg,
        backgroundColor: colors.neutral[200],
      }}
    />
  )
}
