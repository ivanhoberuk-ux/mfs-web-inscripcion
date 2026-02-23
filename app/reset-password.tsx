import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { s } from '../src/lib/theme'
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
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the magic link
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => { sub.subscription.unsubscribe() }
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
      setMsg('¡Contraseña actualizada exitosamente! Redirigiendo...')
      setTimeout(() => router.replace('/'), 2000)
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
      </Card>
    </ScrollView>
  )
}
