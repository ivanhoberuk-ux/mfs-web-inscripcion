// FILE: app/(tabs)/mi-familia.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { s, colors, spacing, radius } from '../../src/lib/theme'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'

type Registro = {
  id: string
  nombres: string
  apellidos: string
  ci: string
  rol: string
  pueblo_id: string
  email: string
  telefono: string
  año?: number
}

export default function MiFamilia() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [pueblos, setPueblos] = useState<Record<string, string>>({})

  async function cargar() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setUser(null)
        return
      }
      setUser(session.user)

      const { data: regs } = await supabase
        .from('registros')
        .select('*')
        .eq('email', session.user.email)
        .is('deleted_at', null)
        .eq('año', 2026)
        .order('created_at', { ascending: true })

      const lista = (regs ?? []) as Registro[]
      setRegistros(lista)

      const puebloIds = Array.from(new Set(lista.map(r => r.pueblo_id).filter(Boolean)))
      if (puebloIds.length > 0) {
        const { data: pbls } = await supabase
          .from('pueblos')
          .select('id, nombre')
          .in('id', puebloIds)
        const map: Record<string, string> = {}
        ;(pbls ?? []).forEach((p: any) => { map[p.id] = p.nombre })
        setPueblos(map)
      }
    } catch (e) {
      console.error('Error cargando mi familia', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.light }}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.background.light }}>
        <Card>
          <Text style={s.cardTitle}>👨‍👩‍👧 Mi Familia</Text>
          <Text style={[s.text, s.mt2]}>Iniciá sesión para ver tus inscripciones.</Text>
          <Button variant="primary" onPress={() => router.push('/login')} style={s.mt3}>
            Iniciar sesión 🔑
          </Button>
        </Card>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.light }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md, maxWidth: 720, alignSelf: 'center', width: '100%' }}
    >
      <View>
        <Text style={[s.cardTitle, { fontSize: 24 }]}>👨‍👩‍👧 Mi Familia</Text>
        <Text style={[s.small, s.mt1]}>Inscripciones bajo tu cuenta ({user.email})</Text>
      </View>

      {registros.length === 0 ? (
        <Card>
          <Text style={s.text}>Todavía no tenés inscripciones cargadas.</Text>
          <Button variant="primary" style={s.mt2} onPress={() => router.push('/inscribir')}>
            ✍️ Inscribirme
          </Button>
        </Card>
      ) : (
        <>
          {registros.map((r) => (
            <Card key={r.id} style={{ borderLeftWidth: 4, borderLeftColor: r.rol === 'Hijo' ? colors.secondary[500] : colors.primary[600] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>
                    {r.rol === 'Hijo' ? '👶 ' : '👤 '}{r.nombres} {r.apellidos}
                  </Text>
                  <Text style={[s.small, s.mt1]}>
                    {r.rol} · CI {r.ci || '—'}
                  </Text>
                  <Text style={[s.small]}>
                    🏕️ {pueblos[r.pueblo_id] || '—'}
                  </Text>
                  {r.telefono ? <Text style={[s.small]}>📞 {r.telefono}</Text> : null}
                </View>
              </View>
              <Button
                variant="outline"
                style={s.mt2}
                onPress={() => router.push(`/inscribir?edit=${r.id}`)}
              >
                ✏️ Editar
              </Button>
            </Card>
          ))}

          <Card style={{ backgroundColor: '#ECFEFF', borderWidth: 1, borderColor: colors.primary[300] }}>
            <Text style={s.cardTitle}>➕ Agregar a un hijo/a</Text>
            <Text style={[s.small, s.mt1]}>
              Podés inscribir a tus hijos bajo tu mismo email. Cada hijo necesita su propio CI.
            </Text>
            <Button
              variant="primary"
              style={s.mt2}
              onPress={() => router.push('/inscribir?nuevoHijo=1')}
            >
              👶 Inscribir un hijo/a
            </Button>
          </Card>
        </>
      )}
    </ScrollView>
  )
}
