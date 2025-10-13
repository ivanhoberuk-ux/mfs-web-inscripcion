// FILE: app/(tabs)/inscriptos.tsx — SOLO ADMIN — Ver inscriptos + Export CSV (incluye CI)
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native'
import { s, colors, spacing } from '../../src/lib/theme'
import { supabase } from '../../src/lib/supabase'
import { Picker } from '@react-native-picker/picker'
import { shareOrDownload } from '../../src/lib/sharing'
import { generateExcelBlob } from '../../src/lib/excel'
import { useRouter } from 'expo-router'
import { Card } from '../../src/components/Card'
import { Button } from '../../src/components/Button'

type Row = {
  id: string
  created_at: string
  nombres: string
  apellidos: string
  ci: string | null
  email: string | null
  pueblo_id: string
  rol: 'Tio' | 'Misionero'
  nacimiento: string | null
  autorizacion_url: string | null // (Aceptación adultos)
  ficha_medica_url: string | null // (Permiso menores)
  firma_url: string | null
}

type Pueblo = { id: string; nombre: string }
type UserRoleRow = { role: 'admin' | 'user' }

const PAGE = 200

export default function VerInscriptosAdmin() {
  const router = useRouter()

  // ===== Guard SOLO ADMIN =====
  const [accessChecked, setAccessChecked] = useState(false)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: udata, error: uerr } = await supabase.auth.getUser()
        if (!mounted) return;
        
        if (uerr || !udata?.user) {
          Alert.alert('Sesión requerida', 'Iniciá sesión para ver inscriptos.')
          router.replace('/login')
          return
        }
        
        const uid = udata.user.id
        const { data: roleRow, error: roleErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid)
          .single();

        if (!mounted) return;

        if (roleErr || !roleRow || roleRow.role !== 'admin') {
          console.log('Role check failed:', { roleErr, roleRow });
          Alert.alert('Acceso restringido', 'Esta sección es solo para administradores.')
          router.replace('/pueblos')
          return
        }
        
        setAccessChecked(true)
      } catch (err) {
        console.error('Error checking access:', err);
        if (mounted) {
          Alert.alert('Error', 'No se pudo verificar los permisos.')
          router.replace('/pueblos')
        }
      }
    })()
    
    return () => { mounted = false; }
  }, [router])

  // ===== Estado de datos =====
  const [pueblos, setPueblos] = useState<Pueblo[]>([])
  const [puebloId, setPuebloId] = useState<string>('todos')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const offRef = useRef(0)

  const pueblosMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of pueblos) m[p.id] = p.nombre
    return m
  }, [pueblos])

  useEffect(() => {
    if (!accessChecked) return
    ;(async () => {
      const { data } = await supabase.from('pueblos').select('id,nombre').order('nombre')
      setPueblos(data || [])
    })()
  }, [accessChecked])

  function calcAge(iso?: string | null): number | null {
    if (!iso) return null
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    const t = new Date()
    let age = t.getFullYear() - d.getFullYear()
    const m = t.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
    return age
  }

  function requiredDocsOk(r: Row) {
    const age = calcAge(r.nacimiento)
    const isAdult = age === null ? true : age >= 18 // sin fecha => asumimos adulto
    const okFirma = !!r.firma_url
    if (isAdult) {
      const okAcept = !!r.autorizacion_url
      return {
        age,
        isAdult,
        requiredName: 'Aceptación',
        okRequeridos: okAcept && okFirma,
        okAcept,
        okPerm: !!r.ficha_medica_url,
        okFirma,
      }
    } else {
      const okPerm = !!r.ficha_medica_url
      return {
        age,
        isAdult,
        requiredName: 'Permiso',
        okRequeridos: okPerm && okFirma,
        okAcept: !!r.autorizacion_url,
        okPerm,
        okFirma,
      }
    }
  }

  async function runSearch(reset: boolean) {
    if (!accessChecked) return
    if (reset) {
      setLoading(true)
      offRef.current = 0
    } else {
      setMoreLoading(true)
    }
    try {
      let q = supabase
        .from('registros')
        .select(
          'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
        )
        .order('created_at', { ascending: false })

      if (puebloId !== 'todos') q = q.eq('pueblo_id', puebloId)

      const from = offRef.current
      const to = from + PAGE - 1
      const { data, error } = await q.range(from, to)
      if (error) throw error

      const page = (data || []) as Row[]
      if (reset) setRows(page)
      else setRows((prev) => [...prev, ...page])

      const got = page.length
      setHasMore(got === PAGE)
      if (got > 0) offRef.current += got
    } finally {
      setLoading(false)
      setMoreLoading(false)
    }
  }

  useEffect(() => {
    if (accessChecked) runSearch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puebloId, accessChecked])

  // ===== CSV (INCLUYE CI) =====
  function csvEscape(v: string) {
    if (v == null) return ''
    const needs = /[",\n]/.test(v)
    return needs ? `"${v.replace(/"/g, '""')}"` : v
  }

  async function promoteToAdmin(email: string, nombre: string) {
    const confirmPromote = () => {
      if (typeof window !== 'undefined') {
        return window.confirm(`¿Promover a ${nombre} como administrador? Esta persona tendrá acceso completo al sistema.`)
      }
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Promover a Administrador',
          `¿Promover a ${nombre} como administrador? Esta persona tendrá acceso completo al sistema.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Promover',
              onPress: () => resolve(true),
            },
          ]
        )
      })
    }

    const confirmed = await confirmPromote()
    if (!confirmed) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        Alert.alert('Error', 'No hay sesión activa')
        return
      }

      const response = await fetch('https://npekpdkywsneylddzzuu.supabase.co/functions/v1/promote-to-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (typeof window !== 'undefined') {
          window.alert(result.error || 'No se pudo promover al usuario')
        } else {
          Alert.alert('Error', result.error || 'No se pudo promover al usuario')
        }
        return
      }

      if (typeof window !== 'undefined') {
        window.alert(result.message)
      } else {
        Alert.alert('Éxito', result.message)
      }
    } catch (err) {
      console.error('Error promoting to admin:', err)
      Alert.alert('Error', 'Ocurrió un error al promover al usuario')
    }
  }

  async function deleteInscripto(id: string, nombre: string) {
    // Usar window.confirm en web, Alert.alert en mobile
    const confirmDelete = () => {
      if (typeof window !== 'undefined') {
        return window.confirm(`¿Estás seguro que querés eliminar a ${nombre}? Esta acción no se puede deshacer.`)
      }
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Confirmar eliminación',
          `¿Estás seguro que querés eliminar a ${nombre}? Esta acción no se puede deshacer.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ]
        )
      })
    }

    const confirmed = await confirmDelete()
    if (!confirmed) return

    try {
      const { error } = await supabase.from('registros').delete().eq('id', id)
      if (error) throw error
      
      if (typeof window !== 'undefined') {
        window.alert('El inscripto fue eliminado correctamente.')
      } else {
        Alert.alert('Eliminado', 'El inscripto fue eliminado correctamente.')
      }
      
      runSearch(true) // Recargar lista
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    }
  }

  async function exportCSV() {
    const header = [
      'id',
      'fecha',
      'pueblo',
      'nombres',
      'apellidos',
      'ci',                // <- INCLUIMOS CI (solo admin accede a esta vista)
      'email',
      'rol',
      'nacimiento',
      'edad',
      'es_adulto',
      'requerido',        // Aceptación (adulto) o Permiso (menor)
      'ok_requerido',     // true/false
      'ok_firma',         // true/false
      'completos',        // true/false
      'url_aceptacion',
      'url_permiso',
      'url_firma',
    ]

    const dataRows: any[][] = [header];

    for (const r of rows) {
      const pueblo = pueblosMap[r.pueblo_id] || r.pueblo_id;
      const st = requiredDocsOk(r);
      const line = [
        r.id,
        new Date(r.created_at).toISOString(),
        pueblo,
        r.nombres,
        r.apellidos,
        r.ci || '',
        r.email || '',
        r.rol,
        r.nacimiento || '',
        st.age === null ? '' : String(st.age),
        st.isAdult ? 'true' : 'false',
        st.requiredName,
        st.isAdult ? (st.okAcept ? 'true' : 'false') : (st.okPerm ? 'true' : 'false'),
        st.okFirma ? 'true' : 'false',
        st.okRequeridos ? 'true' : 'false',
        r.autorizacion_url || '',
        r.ficha_medica_url || '',
        r.firma_url || '',
      ];

      dataRows.push(line);
    }

    const blob = generateExcelBlob(dataRows);
    await shareOrDownload(blob, `inscriptos_${Date.now()}.xlsx`);
  }

  if (!accessChecked) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Verificando permisos…</Text>
      </View>
    )
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>Inscriptos (solo admin)</Text>

      <Card>
        <Text style={s.label}>Pueblo</Text>
        <View style={{ borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <Picker selectedValue={puebloId} onValueChange={setPuebloId}>
            <Picker.Item label="Todos" value="todos" />
            {pueblos.map((p) => (
              <Picker.Item key={p.id} label={p.nombre} value={p.id} />
            ))}
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" onPress={() => runSearch(true)}>
            Actualizar
          </Button>
          <Button variant="secondary" onPress={exportCSV} disabled={!rows.length}>
            Exportar CSV
          </Button>
        </View>
      </Card>

      {loading ? (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : rows.length === 0 ? (
        <Text style={[s.text, { color: '#666' }]}>Sin inscriptos.</Text>
      ) : (
        <>
          {rows.map((r) => {
            const pueblo = pueblosMap[r.pueblo_id] || r.pueblo_id
            const st = requiredDocsOk(r)
            return (
              <Card key={r.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.text, { fontWeight: '700' }]}>{r.nombres} {r.apellidos}</Text>
                    {/* Aquí SÍ mostramos la cédula (solo admin tiene acceso a esta vista) */}
                    <Text style={s.small}>CI: {r.ci || '-'}</Text>
                    <Text style={s.small}>Email: {r.email || '-'}</Text>
                    <Text style={s.small}>Pueblo: {pueblo} · Rol: {r.rol}</Text>
                    <Text style={[s.small, { color: colors.text.tertiary.light }]}>
                      Nacimiento: {r.nacimiento || '—'} · Edad: {st.age === null ? '—' : st.age} {st.isAdult ? '(Mayor)' : '(Menor)'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <Chip ok={st.isAdult ? st.okAcept : st.okPerm} label={st.requiredName} />
                      <Chip ok={st.okFirma} label="Firma" />
                      <Chip ok={st.okRequeridos} label="Completos" />
                    </View>
                    <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 6 }]}>
                      Fecha: {new Date(r.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                    {r.email && (
                      <Pressable
                        onPress={() => promoteToAdmin(r.email!, `${r.nombres} ${r.apellidos}`)}
                        style={{
                          padding: 8,
                          backgroundColor: colors.primary[600],
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Hacer Admin</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => deleteInscripto(r.id, `${r.nombres} ${r.apellidos}`)}
                      style={{
                        padding: 8,
                        backgroundColor: colors.error,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            )
          })}
          {hasMore && (
            <Pressable
              style={[s.button, { paddingVertical: 10, alignSelf: 'center', marginTop: 6 }]}
              onPress={() => runSearch(false)}
              disabled={moreLoading}
            >
              <Text style={s.buttonText}>{moreLoading ? 'Cargando…' : 'Cargar más'}</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  )
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: ok ? colors.success : colors.neutral[300],
      }}
    >
      <Text style={{ color: ok ? '#fff' : colors.text.primary.light, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  )
}
