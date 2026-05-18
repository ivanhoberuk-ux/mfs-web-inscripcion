// FILE: app/(tabs)/index.tsx
import React, { useEffect, useState, useRef } from 'react'
import { ScrollView, View, Image, Text, Pressable, Animated } from 'react-native'
import { colors, spacing, shadows, radius, typography } from '../../src/lib/designSystem'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthProvider'
import { supabase } from '../../src/lib/supabase'
import { Button } from '../../src/components/Button'
import { InscripcionAvisoCard } from '../../src/components/InscripcionAvisoCard'
import { DocumentosEstadoCard } from '../../src/components/DocumentosEstadoCard'
import { MiInscripcionCard } from '../../src/components/MiInscripcionCard'
import { AsesoresAnioCard } from '../../src/components/AsesoresAnioCard'
// @ts-ignore
import familiaImg from '../../src/assets/familia-misionera.png'
// @ts-ignore
import capillitaImg from '../../src/assets/capillita-hero.png'
// @ts-ignore
import logoMfs from '../../src/assets/mfs-logo.png'
// @ts-ignore
import banderaPy from '../../src/assets/bandera-paraguay.png'
// @ts-ignore
import materIcono from '../../src/assets/mater-icono.png'
// @ts-ignore
import materParaguay from '../../src/assets/mater-paraguay.png'
// @ts-ignore
import santuarioImg from '../../src/assets/santuario.png'

type UserRoleRow = { role: 'admin' | 'user' }

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start()
  }, [])

  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [loadingRole, setLoadingRole] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.id) { setRole(null); return }
      setLoadingRole(true)
      const { data, error } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      if (!mounted) return
      if (error) { setRole(null) } else { setRole((data as UserRoleRow | null)?.role ?? null) }
      setLoadingRole(false)
    })()
    return () => { mounted = false }
  }, [user?.id])

  async function onLogout() {
    try { await signOut() } catch {}
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '¡Buenos días! ☀️'
    if (hour < 18) return '¡Buenas tardes! 🌤️'
    return '¡Buenas noches! 🌙'
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.light }}>
      {/* Bandera de Paraguay esfumada de fondo (toda la pantalla) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0.28,
        }}
      >
        <Image
          source={banderaPy}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </View>
      {/* Velo blanco para suavizar la bandera */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(247, 250, 255, 0.55)',
        }}
      />
      {/* Logo MFS difuminado en esquina */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 60, right: -40,
          opacity: 0.10,
        }}
      >
        <Image source={logoMfs} style={{ width: 260, height: 260, resizeMode: 'contain' }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{
          paddingVertical: 20,
          paddingHorizontal: 16,
          alignItems: 'center',
          gap: 20,
          paddingBottom: 120,
          maxWidth: 700,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        {/* Logo MFS destacado */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', marginTop: 4 }}>
          <View style={{
            width: 110, height: 110, borderRadius: radius.full,
            backgroundColor: '#ffffff',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 4, borderColor: colors.secondary[500],
            ...shadows.lg,
          }}>
            <Image source={logoMfs} style={{ width: 88, height: 88, resizeMode: 'contain' }} accessibilityLabel="Logo MFS" />
          </View>
        </Animated.View>

        {/* Saludo */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}>
          <Text style={{
            fontSize: 26,
            fontWeight: '800',
            textAlign: 'center',
            color: colors.primary[700],
          }}>
            {getGreeting()}
          </Text>
          <Text style={{
            fontSize: 15,
            textAlign: 'center',
            color: colors.text.secondary.light,
            marginTop: 4,
          }}>
            Bienvenido a las MFS Paraguay 💛
          </Text>
        </Animated.View>

        {/* HERO con familia misionera */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%',
            backgroundColor: colors.surface.light,
            borderRadius: radius.xl,
            padding: spacing.lg,
            ...shadows.lg,
            borderWidth: 2,
            borderColor: colors.secondary[200],
            overflow: 'hidden',
          }}
        >
          {/* Decoración esquina */}
          <View style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: colors.secondary[100],
            opacity: 0.5,
          }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Image
              source={familiaImg}
              style={{ width: 130, height: 130, resizeMode: 'contain' }}
              accessibilityLabel="Familia misionera"
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '800',
                color: colors.primary[700],
                lineHeight: 24,
              }}>
                Juntos formamos una familia 🤗
              </Text>
              <Text style={{
                fontSize: 13,
                color: colors.text.secondary.light,
                lineHeight: 18,
              }}>
                Encendé tu corazón. La misión arranca acá 🔥
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Aviso de fechas */}
        <View style={{ width: '100%' }}>
          <InscripcionAvisoCard />
        </View>

        {/* Estado de documentos del usuario */}
        {user ? (
          <View style={{ width: '100%', gap: 12 }}>
            <MiInscripcionCard />
            <DocumentosEstadoCard />
          </View>
        ) : null}

        {/* Asesores espirituales del año */}
        <AsesoresAnioCard />

        {/* Accesos rápidos */}
        <View style={{ width: '100%' }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: colors.primary[700],
            marginBottom: spacing.md,
            paddingLeft: 4,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            ✨ Accesos rápidos
          </Text>

          <View style={{
            gap: 12,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <QuickButton
              label="Inscribirme"
              emoji="✍️"
              bg={colors.primary[600]}
              onPress={() => router.push('/inscribir')}
              delay={100}
            />
            <QuickButton
              label="Documentos"
              emoji="📄"
              bg={colors.sky[500]}
              onPress={() => router.push('/documentos')}
              delay={200}
            />
            <QuickButton
              label="Pueblos"
              emoji="🏠"
              bg={colors.secondary[500]}
              textColor={colors.primary[800]}
              onPress={() => router.push('/pueblos')}
              delay={300}
            />
            {loadingRole ? (
              <SkeletonButton />
            ) : role === 'admin' ? (
              <QuickButton
                label="Admin"
                emoji="⚙️"
                bg={colors.primary[800]}
                onPress={() => router.push('/admin')}
                delay={400}
              />
            ) : null}
          </View>
        </View>

        {/* Banda con Santuario y Mater Paraguay */}
        <View style={{
          width: '100%',
          flexDirection: 'row',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <View style={{
            flex: 1, minWidth: 220,
            backgroundColor: colors.surface.light,
            borderRadius: radius.lg,
            overflow: 'hidden',
            ...shadows.md,
            borderWidth: 2, borderColor: colors.primary[100],
          }}>
            <Image
              source={santuarioImg}
              style={{ width: '100%', height: 140, resizeMode: 'cover' }}
              accessibilityLabel="Santuario de Schoenstatt"
            />
            <View style={{ padding: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary[700] }}>
                Nuestro Santuario ⛪
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary.light, marginTop: 2 }}>
                Lugar de gracia y misión
              </Text>
            </View>
          </View>
          <View style={{
            flex: 1, minWidth: 220,
            backgroundColor: colors.surface.light,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row', alignItems: 'center', gap: 12,
            ...shadows.md,
            borderWidth: 2, borderColor: colors.secondary[200],
          }}>
            <Image
              source={materParaguay}
              style={{ width: 80, height: 110, resizeMode: 'contain' }}
              accessibilityLabel="Mater Paraguay"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary[700] }}>
                Mater Paraguay 💛
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary.light, marginTop: 2, lineHeight: 16 }}>
                Madre y reina de nuestras misiones
              </Text>
            </View>
          </View>
        </View>

        {/* Card capillita decorativa */}
        <View style={{
          width: '100%',
          backgroundColor: colors.surface.light,
          borderRadius: radius.lg,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          ...shadows.sm,
          borderLeftWidth: 4,
          borderLeftColor: colors.secondary[500],
        }}>
          <Image
            source={capillitaImg}
            style={{ width: 80, height: 80, resizeMode: 'contain' }}
            accessibilityLabel="Capillita peregrina"
          />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.primary[700],
              marginBottom: 2,
            }}>
              Servus Mariae nunquam peribit ⛪
            </Text>
            <Text style={{
              fontSize: 12,
              color: colors.text.secondary.light,
              fontStyle: 'italic',
            }}>
              "El servidor de María nunca perecerá"
            </Text>
          </View>
        </View>

        {/* Sección de sesión */}
        {user ? (
          <View style={{
            width: '100%',
            backgroundColor: colors.primary[50],
            borderRadius: radius.lg,
            padding: 20,
            gap: 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.primary[200],
          }}>
            <Text style={{ fontSize: 28 }}>👋</Text>
            <Text style={{
              fontSize: 15,
              textAlign: 'center',
              color: colors.text.secondary.light,
            }}>
              Hola, <Text style={{ fontWeight: '800', color: colors.primary[700] }}>{user.email?.split('@')[0]}</Text>
            </Text>
            {role && (
              <View style={{
                backgroundColor: role === 'admin' ? colors.secondary[500] : colors.primary[100],
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: radius.full,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: role === 'admin' ? colors.primary[800] : colors.primary[700],
                }}>
                  {role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
                </Text>
              </View>
            )}
            <Button variant="danger" onPress={onLogout} style={{ alignSelf: 'stretch', marginTop: 8 }}>
              Cerrar sesión 👋
            </Button>
          </View>
        ) : (
          <View style={{ width: '100%', gap: 12 }}>
            <View style={{
              backgroundColor: colors.surface.light,
              borderRadius: radius.lg,
              padding: 20,
              gap: 10,
              borderWidth: 2,
              borderColor: colors.secondary[300],
              ...shadows.md,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 36 }}>🎉</Text>
              <Text style={{
                fontSize: 18,
                fontWeight: '800',
                textAlign: 'center',
                color: colors.primary[700],
              }}>
                ¿Ya te inscribiste?
              </Text>
              <Text style={{
                fontSize: 13,
                textAlign: 'center',
                color: colors.text.secondary.light,
              }}>
                Creá tu cuenta para ver tus documentos y más info 📱
              </Text>
              <Button variant="primary" onPress={() => router.push('/login?mode=signup')} style={{ alignSelf: 'stretch' }}>
                Crear cuenta ✨
              </Button>
            </View>
            <Button variant="outline" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }}>
              Ya tengo cuenta 🔑
            </Button>
          </View>
        )}

        <Text style={{
          fontSize: 12,
          color: colors.text.tertiary.light,
          textAlign: 'center',
          marginTop: 8,
        }}>
          Hecho con 💛 para las MFS Paraguay
        </Text>
      </ScrollView>
    </View>
  )
}

type QuickProps = {
  label: string
  emoji: string
  bg: string
  textColor?: string
  onPress: () => void
  delay?: number
}

function QuickButton({ label, emoji, bg, textColor = '#ffffff', onPress, delay = 0 }: QuickProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={{
      transform: [{ scale: scaleAnim }],
      opacity: opacityAnim,
      minWidth: 145,
      flexGrow: 1,
      maxWidth: 200,
    }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{
          backgroundColor: bg,
          borderRadius: radius.lg,
          paddingVertical: 20,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...shadows.md,
        }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
        <Text style={{ color: textColor, fontWeight: '800', fontSize: 14 }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

function SkeletonButton() {
  return (
    <View style={{
      minWidth: 145,
      flexGrow: 1,
      maxWidth: 200,
      height: 100,
      borderRadius: radius.lg,
      backgroundColor: colors.neutral[200],
    }} />
  )
}
