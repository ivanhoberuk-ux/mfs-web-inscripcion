// FILE: app/login.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image, Pressable, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../src/lib/supabase'
import { s, colors, spacing, radius, shadows, gradients, typography } from '../src/lib/theme'
import { Button } from '../src/components/Button'
import { Card } from '../src/components/Card'
import { Field } from '../src/components/Field'
// @ts-ignore
import capillitaImg from '../src/assets/capillita-hero.png'
import { NandutiDecorativo } from '../src/components/FondoParaguayo'
// @ts-ignore
import logoMfs from '../src/assets/mfs-logo.png'

function sanitizeNext(raw: unknown): string {
  const v = typeof raw === 'string' ? raw : ''
  try {
    const u = new URL(v, 'https://fallback.local') // base dummy
    return (u.pathname + u.search + u.hash) || '/pueblos'
  } catch {
    return '/pueblos'
  }
}

export default function Login() {
  const { width } = useWindowDimensions()
  const desktop = width >= 900
  const router = useRouter()
  const { next, mode } = useLocalSearchParams<{ next?: string; mode?: string }>()
  const dest = sanitizeNext(next)
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [meEmail, setMeEmail] = useState<string | null>(null)

  // Si ya hay sesión activa, redirigir a /pueblos
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }: any) => {
      if (!mounted) return
      if (error) {
        setErr(error.message)
        return
      }
      if (data.session?.user) {
        setMeEmail(data.session.user.email ?? null)
        router.replace(dest)
      }
    })

    // Suscripción a cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return
      if (session?.user) {
        setMeEmail(session.user.email ?? null)
        router.replace(dest)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [dest, router])

  async function onLogin() {
    setErr(null)
    setMsg(null)

    if (!email || !pass) {
      setErr('Ingresá tu email y contraseña.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      })
      if (error) {
        const m = (error.message || '').toLowerCase()
        setErr(m.includes('email not confirmed')
          ? 'Todavía no confirmaste tu email. Revisá tu correo o volvé a crear la cuenta para reenviar el link.'
          : error.message)
        return
      }
      setMeEmail(data.user?.email ?? null)
      setMsg('¡Ingreso exitoso!')
      // onAuthStateChange hará el redirect, pero por si acaso:
      router.replace(dest)
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onSignup() {
    setErr(null)
    setMsg(null)

    if (!email || !pass) {
      setErr('Ingresá tu email y contraseña.')
      return
    }
    if (pass.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setBusy(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.functions.invoke('create-account', {
        body: { email: cleanEmail, password: pass },
      })
      // supabase-js no parsea el body en respuestas no-2xx; leerlo manualmente
      if (error) {
        let serverMsg: string | null = null
        try {
          const ctx: any = (error as any).context
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json()
            serverMsg = body?.error ?? null
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text()
            try { serverMsg = JSON.parse(txt)?.error ?? null } catch { serverMsg = txt }
          }
        } catch {}
        setErr(serverMsg || 'No se pudo crear la cuenta. Intentá de nuevo.')
        return
      }
      if ((data as any)?.error) {
        setErr((data as any).error)
        return
      }
      setMsg(`¡Listo! Te enviamos un email a ${cleanEmail} para confirmar tu cuenta. Abrilo y tocá 'Confirmar mi email' (revisá también spam). Después podés iniciar sesión.`)
      setPass('')
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onForgot() {
    setErr(null)
    setMsg(null)

    if (!email) {
      setErr('Ingresá tu email.')
      return
    }
    setBusy(true)
    try {
      const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : 'https://mfspy.org.py'}/reset-password`
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: email.trim(), redirectTo },
      })
      if (error) {
        setErr('No se pudo enviar el link. Intentá de nuevo en unos minutos.')
        return
      }
      const waitSeconds = (data as any)?.waitSeconds
      setMsg(waitSeconds
        ? `Ya enviamos un link hace poco. Esperá ${waitSeconds} segundos antes de pedir otro.`
        : '¡Revisá tu email! Te enviamos un link para restablecer tu contraseña.')
    } catch (e: any) {
      setErr('No se pudo enviar el link. Intentá de nuevo en unos minutos.')
    } finally {
      setBusy(false)
    }
  }

  const getTitle = () => {
    if (isForgot) return 'Recuperar contraseña'
    if (isSignup) return 'Crear cuenta'
    return 'Iniciar sesión'
  }

  const getSubtitle = () => {
    if (isForgot) return 'Ingresá tu email y te enviaremos un link para restablecer tu contraseña'
    if (isSignup) return 'Creá tu cuenta con el email que usaste para inscribirte'
    return 'Accedé a tu cuenta para gestionar las misiones'
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.light }}>
      <ScrollView
        contentContainerStyle={{
          maxWidth: 1120,
          alignSelf: 'center',
          width: '100%',
          minHeight: desktop ? 760 : undefined,
          padding: desktop ? spacing['3xl'] : spacing.lg,
          paddingBottom: 120,
          justifyContent: 'center',
        }}
      >
        <View style={{ flexDirection: desktop ? 'row' : 'column', borderRadius: radius['2xl'], overflow: 'hidden', ...shadows.xl }}>
          <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: desktop ? 1 : undefined, minHeight: desktop ? 620 : 270, padding: desktop ? 48 : 28, justifyContent: 'space-between', overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -55, top: -45 }}><NandutiDecorativo size={220} color={colors.surface.light} opacity={0.18} /></View>
            <View pointerEvents="none" style={{ position: 'absolute', left: -30, bottom: -55 }}><NandutiDecorativo size={150} color={colors.surface.light} opacity={0.12} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 54, height: 54, borderRadius: radius.full, backgroundColor: colors.surface.light, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={logoMfs} style={{ width: 42, height: 42, resizeMode: 'contain' }} />
              </View>
              <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 18 }}>MFS Paraguay</Text>
            </View>
            <View style={{ maxWidth: 430 }}>
              <Image source={capillitaImg} style={{ width: 92, height: 92, resizeMode: 'contain', marginBottom: 16 }} accessibilityLabel="Capillita peregrina" />
              <Text style={{ color: colors.surface.light, fontFamily: typography.family.extrabold, fontSize: desktop ? 34 : 26, lineHeight: desktop ? 43 : 33 }}>Una familia que sale al encuentro.</Text>
              <Text style={{ color: colors.primary[50], fontFamily: typography.family.medium, fontSize: 15, lineHeight: 23, marginTop: 10 }}>Encendé tu corazón. La misión arranca acá.</Text>
            </View>
          </LinearGradient>

          <View style={{ flex: desktop ? 0.9 : undefined, backgroundColor: colors.surface.light, padding: desktop ? 48 : 24, justifyContent: 'center' }}>
            {!isForgot && !meEmail ? (
              <View style={[s.segmented, { marginBottom: spacing.xl }]}>
                <Pressable onPress={() => router.push('/login')} style={[s.segmentedItem, !isSignup && s.segmentedItemActive]}><Text style={{ fontFamily: typography.family.semibold, color: !isSignup ? colors.primary[700] : colors.text.tertiary.light }}>Entrar</Text></Pressable>
                <Pressable onPress={() => router.push('/login?mode=signup')} style={[s.segmentedItem, isSignup && s.segmentedItemActive]}><Text style={{ fontFamily: typography.family.semibold, color: isSignup ? colors.primary[700] : colors.text.tertiary.light }}>Crear cuenta</Text></Pressable>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Ionicons name={isForgot ? 'key-outline' : isSignup ? 'person-add-outline' : 'log-in-outline'} size={25} color={colors.primary[600]} />
              <Text style={[s.title, { fontSize: 26, marginBottom: 0 }]}>{getTitle()}</Text>
            </View>
            <Text style={[s.text, { marginBottom: spacing.xl }]}>{getSubtitle()}</Text>

            {meEmail ? (
              <View>
                <Text style={s.text}>Ya estás logueado como</Text>
                <Text style={[s.cardTitle, s.mt1]}>{meEmail}</Text>
                <Button variant="primary" onPress={() => router.replace('/pueblos')} style={s.mt3}>Ir a Pueblos</Button>
              </View>
            ) : (
              <View>
                <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="tu@correo.com" />
                {!isForgot && <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry placeholder="••••••••" onSubmitEditing={onLogin} returnKeyType="go" />}
                <Button variant="primary" onPress={isForgot ? onForgot : (isSignup ? onSignup : onLogin)} loading={busy} style={s.mt2}>
                  {isForgot ? 'Enviar link de recuperación' : (isSignup ? 'Crear cuenta' : 'Ingresar')}
                </Button>
                {!isSignup && !isForgot && <Button variant="ghost" onPress={() => router.push('/login?mode=forgot')} style={s.mt2}>¿Olvidaste tu contraseña?</Button>}
                {isForgot && <Button variant="ghost" onPress={() => router.push('/login')} style={s.mt2}>Volver a iniciar sesión</Button>}
                {msg && <View style={[s.mt2, { backgroundColor: colors.mint[100], padding: 12, borderRadius: radius.sm }]}><Text style={[s.small, { color: colors.mint[600] }]}>{msg}</Text></View>}
                {err && <View style={[s.mt2, { backgroundColor: colors.accent[50], padding: 12, borderRadius: radius.sm }]}><Text style={[s.small, { color: colors.accent[700] }]}>{err}</Text></View>}
              </View>
            )}
            <Text style={{ fontFamily: typography.family.medium, fontSize: 11, color: colors.text.tertiary.light, textAlign: 'center', marginTop: spacing.xl }}>MFS Paraguay · Servus Mariae nunquam peribit</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
