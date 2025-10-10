// FILE: app/(tabs)/admin.tsx — Panel Admin (tabla user_roles) — WEB / NATIVO
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { s } from '../../src/lib/theme'
import { supabase } from '../../src/lib/supabase'
import { shareOrDownload } from '../../src/lib/sharing'

// ===== Tipos base (ajusta si tu esquema difiere) =====
type Registro = {
  id: string
  created_at: string
  nombres: string
  apellidos: string
  ci: string | null
  email: string | null
  pueblo_id: string
  rol: 'Tio' | 'Misionero'
  nacimiento: string | null
  autorizacion_url: string | null
  ficha_medica_url: string | null
  firma_url: string | null
}

type Pueblo = { id: string; nombre: string }
type UserRoleRow = { role: 'admin' | 'user' }

export default function Admin() {
  const router = useRouter()

  // ===== Estado =====
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<{ id: string; email?: string | null; role?: string | null } | null>(null)
  const [pueblos, setPueblos] = useState<Pueblo[]>([])
  const pueblosMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of pueblos) m[p.id] = p.nombre
    return m
  }, [pueblos])

  // ===== Guard de autenticación + rol desde tabla user_roles =====
  useEffect(() => {
    ;(async () => {
      // 1) Usuario logueado
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        Alert.alert('Sesión requerida', 'Iniciá sesión para entrar al panel admin.')
        router.replace('/login')
        return
      }

      const user = userData?.user ?? null
      if (!user) {
        Alert.alert('Sesión requerida', 'Iniciá sesión para entrar al panel admin.')
        router.replace('/login')
        return
      }

      // 2) Leer rol desde la tabla user_roles (RLS permite que cada usuario lea su fila)
      const { data: roleRow, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle<UserRoleRow>()

      if (roleErr) {
        // Si no existe la fila aún o hay RLS bloqueando, mostramos mensaje genérico:
        console.warn('Error leyendo role:', roleErr)
      }

      const role = roleRow?.role ?? null
      setMe({ id: user.id, email: user.email, role })

      // 3) Guard de UI
      if (role !== 'admin') {
        Alert.alert('Acceso restringido', 'No tenés permisos de administrador.')
        router.replace('/pueblos')
        return
      }
    })()
  }, [router])

  // Prefetch de pueblos (para exportes con nombres)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('pueblos').select('id,nombre').order('nombre')
      setPueblos(data || [])
    })()
  }, [])

  // ===== Utilidades =====
  function csvEscape(v: string) {
    if (v == null) return ''
    const needs = /[",\n]/.test(v)
    return needs ? `"${v.replace(/"/g, '""')}"` : v
  }
  function yyyymmddhhmm(date = new Date()) {
    const p = (n: number, len = 2) => String(n).padStart(len, '0')
    return date.getFullYear() + p(date.getMonth() + 1) + p(date.getDate()) + '_' + p(date.getHours()) + p(date.getMinutes())
  }

  // ===== Exportes =====

  async function exportRegistrosJSON() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      const json = JSON.stringify((data || []) as Registro[], null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      await shareOrDownload(blob, `registros_${yyyymmddhhmm()}.json`)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  async function exportRegistrosCSV() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      const header = [
        'id',
        'fecha',
        'pueblo',
        'nombres',
        'apellidos',
        'ci',
        'email',
        'rol',
        'nacimiento',
        'url_aceptacion',
        'url_permiso',
        'url_firma',
      ]
      const rows: string[][] = [header]

      for (const r of (data || []) as Registro[]) {
        rows.push(
          [
            r.id,
            new Date(r.created_at).toISOString(),
            pueblosMap[r.pueblo_id] || r.pueblo_id,
            r.nombres,
            r.apellidos,
            r.ci || '',
            r.email || '',
            r.rol,
            r.nacimiento || '',
            r.autorizacion_url || '',
            r.ficha_medica_url || '',
            r.firma_url || '',
          ].map(csvEscape)
        )
      }

      const csv = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      await shareOrDownload(blob, `registros_${yyyymmddhhmm()}.csv`)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  async function exportPueblosCSV() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('pueblos').select('id,nombre').order('nombre')
      if (error) throw error

      const header = ['id', 'nombre']
      const rows: string[][] = [header]
      for (const p of (data || []) as Pueblo[]) {
        rows.push([p.id, p.nombre].map(csvEscape))
      }
      const csv = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      await shareOrDownload(blob, `pueblos_${yyyymmddhhmm()}.csv`)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  // ===== UI =====
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
      <Text style={s.title}>Panel administrativo</Text>

      <View style={s.card}>
        <Text style={[s.text, { marginBottom: 8 }]}>
          Usuario: <Text style={{ fontWeight: '700' }}>{me?.email || '—'}</Text> {me?.role ? `(${me.role})` : ''}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportRegistrosJSON} disabled={loading}>
            <Text style={s.buttonText}>Exportar Registros JSON</Text>
          </Pressable>

          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportRegistrosCSV} disabled={loading}>
            <Text style={s.buttonText}>Exportar Registros CSV</Text>
          </Pressable>

          <Pressable style={[s.button, { flexGrow: 1 }]} onPress={exportPueblosCSV} disabled={loading}>
            <Text style={s.buttonText}>Exportar Pueblos CSV</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Procesando…</Text>
          </View>
        )}
      </View>

      <View style={[s.card, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
        <Text style={[s.text, { fontWeight: '700', marginBottom: 6 }]}>Notas</Text>
        <Text style={[s.small, { color: '#555' }]}>
          • En <Text style={{ fontWeight: '700' }}>web</Text> los archivos se descargan automáticamente (o usan Web
          Share si el navegador lo permite).
        </Text>
        <Text style={[s.small, { color: '#555' }]}>
          • En <Text style={{ fontWeight: '700' }}>Android/iOS</Text> se abre el diálogo de compartir del sistema.
        </Text>
      </View>
    </ScrollView>
  )
}
