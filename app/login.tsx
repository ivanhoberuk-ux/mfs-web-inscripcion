// FILE: app/login.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { s } from '../src/lib/theme'

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
  const { next } = useLocalSearchParams<{ next?: string }>()
  const dest = sanitizeNext(next)

  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [meEmail, setMeEmail] = useState<string | null>(null)

  // Si ya hay sesión activa, redirigir a /pueblos
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
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

  return (
    <View style={[s.screen, { gap: 12, maxWidth: 560 }]}>
      <Text style={s.title}>Iniciar sesión</Text>

      {meEmail ? (
        <View style={s.card}>
          <Text style={s.text}>Ya estás logueado como</Text>
          <Text style={[s.text, { fontWeight: '700' }]}>{meEmail}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable style={s.button} onPress={() => router.replace('/pueblos')} disabled={busy}>
              <Text style={s.buttonText}>Ir a Pueblos</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.input}
            placeholder="tu@correo.com"
          />

          <Text style={s.label}>Contraseña</Text>
          <TextInput
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            style={s.input}
            placeholder="••••••••"
            onSubmitEditing={onLogin}
            returnKeyType="go"
          />

          <Pressable style={[s.button, { marginTop: 8 }]} onPress={onLogin} disabled={busy}>
            <Text style={s.buttonText}>{busy ? 'Ingresando…' : 'Ingresar'}</Text>
          </Pressable>

          {busy && (
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          )}
          {msg && <Text style={[s.small, { color: '#0a7', marginTop: 8 }]}>{msg}</Text>}
          {err && <Text style={[s.small, { color: '#c00', marginTop: 8 }]}>{err}</Text>}
        </View>
      )}
    </View>
  )
}
