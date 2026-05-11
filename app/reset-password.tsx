import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { s, colors } from '../src/lib/theme'
import { Button } from '../src/components/Button'
import { Card } from '../src/components/Card'
import { Field } from '../src/components/Field'

export default function ResetPassword() {
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)        // sesión de recuperación lista
  const [checking, setChecking] = useState(true)   // verificando link

  // 1) Procesar el link de recuperación al cargar la página
  useEffect(() => {
    let mounted = true

    async function processRecoveryLink() {
      try {
        if (typeof window === 'undefined') {
          setChecking(false)
          return
        }

        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const errorDescription = url.searchParams.get('error_description') || url.hash.match(/error_description=([^&]+)/)?.[1]

        if (errorDescription) {
          setErr(decodeURIComponent(errorDescription).replace(/\+/g, ' '))
          setChecking(false)
          return
        }

        // Flujo PKCE: ?code=... → intercambiar por sesión
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setErr('No se pudo validar el link de recuperación: ' + error.message)
            setChecking(false)
            return
          }
          // Limpiar la URL
          window.history.replaceState({}, '', window.location.pathname)
        }

        // Flujo implícito: tokens en el hash → supabase los procesa con detectSessionInUrl
        // Esperar un tick para que el cliente termine de procesar
        await new Promise((r) => setTimeout(r, 250))

        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        if (data.session) {
          setReady(true)
        } else {
          setErr('El link de recuperación es inválido o expiró. Pedí uno nuevo desde "Olvidaste tu contraseña".')
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? String(e))
      } finally {
        if (mounted) setChecking(false)
      }
    }

    processRecoveryLink()

    // También escuchar el evento PASSWORD_RECOVERY por si llega después
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function onReset() {
    setErr(null)
    setMsg(null)

    if (!pass || !confirm) {
      setErr('Completá ambos campos.')
      return
    }
    if (pass.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (pass !== confirm) {
      setErr('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) {
        setErr(error.message)
        return
      }
      setMsg('¡Contraseña actualizada exitosamente! Redirigiendo al inicio…')
      setTimeout(() => router.replace('/'), 1800)
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ maxWidth: 560, alignSelf: 'center', width: '100%', paddingBottom: 120 }}>
      <Text style={s.title}>🔐 Nueva contraseña</Text>
      <Text style={[s.text, s.mb3]}>
        Ingresá tu nueva contraseña para restablecer el acceso a tu cuenta.
      </Text>

      <Card>
        {checking ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={[s.text, s.mt2]}>Validando link de recuperación…</Text>
          </View>
        ) : !ready ? (
          <View>
            <Text style={s.text}>
              {err || 'No se pudo iniciar la recuperación de contraseña.'}
            </Text>
            <Button variant="primary" onPress={() => router.replace('/login?mode=forgot')} style={s.mt3}>
              Pedir nuevo link
            </Button>
          </View>
        ) : (
          <>
            <Field
              label="Nueva contraseña"
              value={pass}
              onChangeText={setPass}
              secureTextEntry
              placeholder="••••••••"
            />

            <Field
              label="Confirmar contraseña"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
              onSubmitEditing={onReset}
              returnKeyType="go"
            />

            <Button
              variant="primary"
              onPress={onReset}
              loading={busy}
              style={s.mt2}
            >
              Cambiar contraseña
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
          </>
        )}
      </Card>
    </ScrollView>
  )
}
