// FILE: app/login.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { s } from '../src/lib/theme'
import { Button } from '../src/components/Button'
import { Card } from '../src/components/Card'
import { Field } from '../src/components/Field'

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
        setErr(error.message)
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
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/`
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })
      if (error) {
        setErr(error.message)
        return
      }
      if (data.user) {
        setMsg('¡Cuenta creada! Revisá tu email para confirmar tu cuenta.')
      }
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
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      })
      if (error) {
        setErr(error.message)
        return
      }
      setMsg('¡Revisá tu email! Te enviamos un link para restablecer tu contraseña.')
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  const getTitle = () => {
    if (isForgot) return '🔑 Recuperar contraseña'
    if (isSignup) return 'Crear cuenta'
    return 'Iniciar sesión'
  }

  const getSubtitle = () => {
    if (isForgot) return 'Ingresá tu email y te enviaremos un link para restablecer tu contraseña'
    if (isSignup) return 'Creá tu cuenta con el email que usaste para inscribirte'
    return 'Accedé a tu cuenta para gestionar las misiones'
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ maxWidth: 560, alignSelf: 'center', width: '100%', paddingBottom: 120 }}>
      <Text style={s.title}>{getTitle()}</Text>
      <Text style={[s.text, s.mb3]}>{getSubtitle()}</Text>

      {meEmail ? (
        <Card>
          <Text style={s.text}>Ya estás logueado como</Text>
          <Text style={[s.cardTitle, s.mt1]}>{meEmail}</Text>
          <Button 
            variant="primary" 
            onPress={() => router.replace('/pueblos')}
            style={s.mt3}
          >
            Ir a Pueblos
          </Button>
        </Card>
      ) : (
        <Card>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@correo.com"
          />

          {!isForgot && (
            <Field
              label="Contraseña"
              value={pass}
              onChangeText={setPass}
              secureTextEntry
              placeholder="••••••••"
              onSubmitEditing={onLogin}
              returnKeyType="go"
            />
          )}

          <Button 
            variant="primary" 
            onPress={isForgot ? onForgot : (isSignup ? onSignup : onLogin)} 
            loading={busy}
            style={s.mt2}
          >
            {isForgot ? 'Enviar link de recuperación' : (isSignup ? 'Crear cuenta' : 'Ingresar')}
          </Button>

          {/* Olvidé mi contraseña (solo en login) */}
          {!isSignup && !isForgot && (
            <Button
              variant="outline"
              onPress={() => router.push('/login?mode=forgot')}
              style={s.mt2}
            >
              ¿Olvidaste tu contraseña? 🔑
            </Button>
          )}

          {/* Toggle entre login y signup */}
          <Button
            variant="outline"
            onPress={() => router.push(isSignup || isForgot ? '/login' : '/login?mode=signup')}
            style={s.mt2}
          >
            {isSignup || isForgot ? '¿Ya tenés cuenta? Iniciar sesión' : '¿No tenés cuenta? Crear cuenta'}
          </Button>

          {msg && (
            <View style={[s.mt2, { backgroundColor: '#e8f5ef', padding: 12, borderRadius: 8 }]}>
              <Text style={[s.small, { color: '#0b8d62' }]}>{msg}</Text>
            </View>
          )}
          {err && (
            <View style={[s.mt2, { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8 }]}>
              <Text style={[s.small, { color: '#b91c1c' }]}>{err}</Text>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  )
}
