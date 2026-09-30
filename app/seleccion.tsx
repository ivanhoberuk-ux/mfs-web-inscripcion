// FILE: app/seleccion.tsx — ✅ Selección de misioneros (coordinadores de pueblo y super admin)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import { s, colors, radius, spacing, shadows, typography } from '../src/lib/theme'
import { supabase } from '../src/lib/supabase'
import { useUserRoles } from '../src/hooks/useUserRoles'
import { fetchAñoActivo } from '../src/lib/api'
import { documentosCompletos, documentosFaltantes, edadDe } from '../src/lib/documentos'
import { avisar, confirmar } from '../src/lib/dialogs'
import { generateExcelBlob, fileStamp, humanDate, safeFileName } from '../src/lib/excel'
import { shareOrDownload } from '../src/lib/sharing'
import { PageHeader, InitialAvatar } from '../src/components/PageHeader'
import { Badge } from '../src/components/Badge'
import { Button } from '../src/components/Button'

type Reg = {
  id: string; nombres: string; apellidos: string; ci: string; nacimiento: string | null
  email: string; telefono: string; rol: string; es_jefe: boolean; misiono_antes: boolean
  created_at: string; seleccion: 'seleccionado' | 'suplente' | null; orden_suplente: number | null
  cedula_frente_url: string | null; cedula_dorso_url: string | null; firma_url: string | null
  ficha_medica_url: string | null; autorizacion_url: string | null
}
type Resumen = {
  año: number; cupo_mision: number | null; inscriptos: number; inscriptos_total: number
  seleccionados: number; seleccionados_total: number; suplentes: number; sin_definir: number
  publicada_at: string | null; pendientes_notificar: number
}
type Vista = 'lista' | 'suplentes' | 'general'

const fmtFecha = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-PY', {
  timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}) : '—'
const norm = (v: string) => (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Igual que ocupa_cupo de la BD: Hijo con <12 años al 1-ene del año no ocupa cupo. */
function ocupaCupo(r: Reg, año: number) {
  if (r.rol !== 'Hijo' || !r.nacimiento) return true
  const [Y, M, D] = r.nacimiento.slice(0, 10).split('-').map((x) => parseInt(x, 10))
  let edad = año - Y
  if (M > 1 || (M === 1 && D > 1)) edad--
  return edad >= 12
}

function Chip({ r }: { r: Reg }) {
  return <Badge tone={r.seleccion === 'seleccionado' ? 'success' : r.seleccion === 'suplente' ? 'warning' : 'neutral'}>{r.seleccion === 'seleccionado' ? 'Seleccionado' : r.seleccion === 'suplente' ? `Suplente N° ${r.orden_suplente ?? '—'}` : 'Sin definir'}</Badge>
}

function Btn({ label, onPress, color, disabled, small }: { label: string; onPress: () => void; color?: string; disabled?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={{ backgroundColor: color || colors.primary[600], opacity: disabled ? 0.5 : 1, minHeight: small ? 38 : 46, justifyContent: 'center', alignItems: 'center', paddingVertical: small ? 6 : 10, paddingHorizontal: small ? 12 : 16, borderRadius: radius.full }}>
      <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: small ? 12 : 14 }}>{label}</Text>
    </Pressable>
  )
}

export default function SeleccionScreen() {
  const router = useRouter()
  const { isSuperAdmin, isPuebloAdmin, isCoAdmin, puebloId: miPueblo, loading: rolesLoading } = useUserRoles()
  const puedeVer = isSuperAdmin || isPuebloAdmin || isCoAdmin

  const [año, setAño] = useState<number | null>(null)
  const [pueblos, setPueblos] = useState<{ id: string; nombre: string; cupo_mision: number | null }[]>([])
  const [puebloId, setPuebloId] = useState<string>('')
  const [vista, setVista] = useState<Vista>('lista')
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [fSel, setFSel] = useState<'todos' | 'seleccionado' | 'suplente' | 'sin'>('todos')
  const [fRol, setFRol] = useState('todos')
  const [fDoc, setFDoc] = useState<'todos' | 'completos' | 'faltan'>('todos')
  const [q, setQ] = useState('')
  const [orden, setOrden] = useState<'fecha' | 'nombre' | 'edad'>('fecha')
  const [general, setGeneral] = useState<Array<{ id: string; nombre: string; r: Resumen | null }>>([])

  useEffect(() => { fetchAñoActivo().then(setAño).catch(() => {}) }, [])

  useEffect(() => {
    if (rolesLoading || !puedeVer) return
    ;(async () => {
      const { data } = await supabase.from('pueblos').select('id, nombre, cupo_mision').eq('activo', true).order('nombre')
      const lista = (data ?? []) as any[]
      setPueblos(lista)
      if (!isSuperAdmin && miPueblo) setPuebloId(miPueblo)
      else if (lista.length && !puebloId) setPuebloId(lista[0].id)
    })()
  }, [rolesLoading, puedeVer, isSuperAdmin, miPueblo])

  const puebloNombre = pueblos.find((p) => p.id === puebloId)?.nombre ?? ''

  const load = useCallback(async () => {
    if (!puebloId || !año) return
    setLoading(true)
    try {
      const [{ data: rs, error: e1 }, { data: lista, error: e2 }] = await Promise.all([
        supabase.rpc('seleccion_resumen' as any, { p_pueblo_id: puebloId, p_año: año }),
        supabase.from('registros').select(`id, nombres, apellidos, ci, nacimiento, email, telefono, rol, es_jefe, misiono_antes,
          created_at, seleccion, orden_suplente, cedula_frente_url, cedula_dorso_url, firma_url, ficha_medica_url, autorizacion_url`)
          .eq('pueblo_id', puebloId).eq('año', año).eq('estado', 'confirmado')
          .is('deleted_at', null).eq('no_clasifico', false)
          .order('created_at', { ascending: true }),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setResumen(rs as any)
      setRegs((lista ?? []) as any)
      setSel({})
    } catch (e: any) {
      avisar('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [puebloId, año])

  useEffect(() => { load() }, [load])

  async function loadGeneral() {
    if (!año) return
    setLoading(true)
    try {
      const res = await Promise.all(pueblos.map(async (p) => {
        const { data } = await supabase.rpc('seleccion_resumen' as any, { p_pueblo_id: p.id, p_año: año })
        return { id: p.id, nombre: p.nombre, r: (data ?? null) as any }
      }))
      setGeneral(res)
    } finally { setLoading(false) }
  }
  useEffect(() => { if (vista === 'general') loadGeneral() }, [vista, año, pueblos.length])

  const filtrados = useMemo(() => {
    const nq = norm(q)
    let r = regs.filter((x) => {
      if (fSel === 'seleccionado' && x.seleccion !== 'seleccionado') return false
      if (fSel === 'suplente' && x.seleccion !== 'suplente') return false
      if (fSel === 'sin' && x.seleccion != null) return false
      if (fRol !== 'todos' && x.rol !== fRol) return false
      if (fDoc !== 'todos') { const ok = documentosCompletos(x); if (fDoc === 'completos' ? !ok : ok) return false }
      if (nq && !norm(`${x.nombres} ${x.apellidos}`).includes(nq) && !norm(x.ci || '').includes(nq)) return false
      return true
    })
    r = [...r].sort((a, b) => orden === 'nombre'
      ? `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`)
      : orden === 'edad' ? (edadDe(a.nacimiento) ?? 0) - (edadDe(b.nacimiento) ?? 0)
      : a.created_at.localeCompare(b.created_at))
    return r
  }, [regs, fSel, fRol, fDoc, q, orden])

  const suplentes = useMemo(() => regs.filter((r) => r.seleccion === 'suplente')
    .sort((a, b) => (a.orden_suplente ?? 9999) - (b.orden_suplente ?? 9999)), [regs])
  const roles = useMemo(() => Array.from(new Set(regs.map((r) => r.rol).filter(Boolean))).sort(), [regs])
  const idsSel = Object.keys(sel).filter((k) => sel[k])

  async function marcar(ids: string[], estado: 'seleccionado' | 'suplente' | null) {
    if (!ids.length) return avisar('Selección', 'Marcá al menos una persona.')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('seleccion_marcar' as any, { p_registro_ids: ids, p_estado: estado })
      if (error) throw error
      if (data && (data as any).ok === false) throw new Error((data as any).msg || (data as any).error || 'No se pudo marcar')
      await load()
    } catch (e: any) { avisar('No se pudo', e?.message ?? String(e)) } finally { setBusy(false) }
  }

  async function mover(r: Reg, delta: number) {
    const nuevo = (r.orden_suplente ?? 1) + delta
    if (nuevo < 1 || nuevo > suplentes.length) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('seleccion_mover_suplente' as any, { p_registro_id: r.id, p_nuevo_orden: nuevo })
      if (error) throw error
      await load()
    } catch (e: any) { avisar('No se pudo', e?.message ?? String(e)) } finally { setBusy(false) }
  }

  async function notificar() {
    const { data, error } = await supabase.functions.invoke('notificar-seleccion', { body: { pueblo_id: puebloId } })
    if (error) throw error
    return data as any
  }

  function publicar() {
    if (!resumen) return
    const nuevosSup = resumen.sin_definir
    confirmar('📣 Publicar selección',
      `Los ${resumen.seleccionados_total} seleccionados y los ${resumen.suplentes + nuevosSup} suplentes recibirán un email. Los que no marcaste quedarán como suplentes por orden de inscripción.`,
      async () => {
        setBusy(true)
        try {
          const { data, error } = await supabase.rpc('seleccion_publicar' as any, { p_pueblo_id: puebloId, p_año: año })
          if (error) throw error
          if (data && (data as any).ok === false) throw new Error((data as any).msg || 'No se pudo publicar')
          let msg = '✅ Selección publicada.'
          try { const n = await notificar(); msg += `\n📧 Emails enviados: ${n?.enviados ?? 0}${n?.errores ? ` · errores: ${n.errores}` : ''}` }
          catch (e: any) { msg += `\n⚠️ No se pudieron enviar los avisos: ${e?.message ?? e}` }
          avisar('Publicada', msg)
          await load()
        } catch (e: any) { avisar('No se pudo publicar', e?.message ?? String(e)) } finally { setBusy(false) }
      })
  }

  async function enviarPendientes() {
    setBusy(true)
    try {
      const n = await notificar()
      avisar('Avisos', `📧 Emails enviados: ${n?.enviados ?? 0} (${n?.personas ?? 0} personas)${n?.errores ? ` · errores: ${n.errores}` : ''}`)
      await load()
    } catch (e: any) { avisar('No se pudo', e?.message ?? String(e)) } finally { setBusy(false) }
  }

  function despublicar() {
    confirmar('Volver a borrador', 'La selección dejará de ser visible para los inscriptos. ¿Continuar?', async () => {
      setBusy(true)
      try {
        const { error } = await supabase.rpc('seleccion_despublicar' as any, { p_pueblo_id: puebloId, p_año: año })
        if (error) throw error
        await load()
      } catch (e: any) { avisar('No se pudo', e?.message ?? String(e)) } finally { setBusy(false) }
    })
  }

  async function exportar(tipo: 'seleccionado' | 'suplente') {
    const lista = tipo === 'seleccionado' ? regs.filter((r) => r.seleccion === 'seleccionado') : suplentes
    if (!lista.length) return avisar('Excel', 'No hay personas en esta lista.')
    const rows: any[][] = [[...(tipo === 'suplente' ? ['N°'] : []), 'Nombre', 'CI', 'Edad', 'Rol', 'Teléfono', 'Email', 'Documentos']]
    lista.forEach((r) => {
      const f = documentosFaltantes(r)
      rows.push([...(tipo === 'suplente' ? [r.orden_suplente ?? ''] : []), `${r.nombres} ${r.apellidos}`, r.ci ?? '',
        edadDe(r.nacimiento) ?? '', r.rol ?? '', r.telefono ?? '', r.email ?? '', f.length ? `Faltan: ${f.join(', ')}` : 'Completos'])
    })
    const t = tipo === 'seleccionado' ? 'Seleccionados' : 'Suplentes'
    const blob = generateExcelBlob(rows, {
      title: `MFS — ${t} de ${puebloNombre} ${año}`,
      subtitle: `${lista.length} personas · Generado el ${humanDate()}`,
      sheetName: t,
    })
    await shareOrDownload(blob, `MFS_${t.toLowerCase()}_${safeFileName(puebloNombre)}_${fileStamp()}.xlsx`)
  }

  if (rolesLoading) return <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator /></View>
  if (!puedeVer) {
    return (
      <View style={[s.screen, { padding: 20 }]}>
        <Text style={s.title}>Selección de misioneros</Text>
        <Text style={s.text}>No tenés permisos para ver esta sección.</Text>
      </View>
    )
  }

  const cupo = resumen?.cupo_mision ?? null
  const pct = cupo ? Math.min(100, Math.round(((resumen?.seleccionados ?? 0) / cupo) * 100)) : 0
  const publicada = !!resumen?.publicada_at

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent}>
      <PageHeader icon="checkmark-done-outline" title={`Selección de misioneros ${año ?? ''}`} subtitle="Definí quiénes misionan y el orden de suplentes" trailing={<Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/inscriptos' as any))} style={{ padding: 10 }}><Ionicons name="close" size={22} color={colors.text.secondary.light} /></Pressable>} />

      {isSuperAdmin && (
        <View style={[s.input, { padding: 0, marginBottom: 8 }]}>
          <Picker selectedValue={puebloId} onValueChange={(v) => setPuebloId(String(v))}>
            {pueblos.map((p) => <Picker.Item key={p.id} label={p.nombre} value={p.id} />)}
          </Picker>
        </View>
      )}

      <View style={[s.segmented, { marginBottom: spacing.lg, flexWrap: 'wrap' }]}>
        {([['lista', 'Inscriptos'], ['suplentes', `Suplentes (${suplentes.length})`], ...(isSuperAdmin ? [['general', 'Todos los pueblos']] : [])] as [Vista, string][])
          .map(([k, l]) => (
            <Pressable key={k} onPress={() => setVista(k)} style={[s.segmentedItem, vista === k && s.segmentedItemActive, { minWidth: 120 }]}>
              <Text style={{ color: vista === k ? colors.primary[700] : colors.text.secondary.light, fontFamily: typography.family.bold }}>{l}</Text>
            </Pressable>
          ))}
      </View>

      {vista === 'general' ? (
        <View style={s.card}>
          {loading ? <ActivityIndicator /> : general.map((g) => (
            <Pressable key={g.id} onPress={() => { setPuebloId(g.id); setVista('lista') }}
              style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ fontWeight: '700' }}>{g.nombre}</Text>
              <Text style={s.small}>
                Cupo: {g.r?.cupo_mision ?? 'sin definir'} · ✅ {g.r?.seleccionados ?? 0} · 🕒 {g.r?.suplentes ?? 0} · ⚪ {g.r?.sin_definir ?? 0} · {g.r?.publicada_at ? '📣 Publicada' : '📝 Borrador'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          {/* Resumen */}
          <View style={[s.card, { marginBottom: 10, borderColor: publicada ? colors.mint[500] : colors.primary[50] }]}> 
            {cupo == null && (
              <View style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                <Text style={{ color: '#92400e', fontWeight: '700' }}>⚠️ El super admin tiene que definir el cupo para misionar de este pueblo.</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><Text style={{ fontSize: 28, fontFamily: typography.family.extrabold, color: colors.primary[700] }}>
              Seleccionados {resumen?.seleccionados ?? 0} / {cupo ?? '—'}
            </Text><Badge tone={publicada ? 'success' : 'neutral'}>{publicada ? 'Publicada' : 'Borrador'}</Badge></View>
            <View style={{ height: 12, backgroundColor: colors.neutral[100], borderRadius: radius.full, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? colors.mint[500] : colors.primary[500] }} />
            </View>
            <Text style={[s.small, { marginTop: 6 }]}>
              🕒 Suplentes: {resumen?.suplentes ?? 0} · ⚪ Sin definir: {resumen?.sin_definir ?? 0} · Inscriptos que ocupan cupo: {resumen?.inscriptos ?? 0}
              {resumen && resumen.seleccionados_total !== resumen.seleccionados ? ` · (${resumen.seleccionados_total} seleccionados contando hijos menores)` : ''}
            </Text>
            <Text style={{ marginTop: 6, fontFamily: typography.family.semibold, color: publicada ? colors.mint[600] : colors.text.tertiary.light }}>
              {publicada ? `Publicada el ${fmtFecha(resumen?.publicada_at)}` : 'Todavía no es visible para los inscriptos'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {!publicada && <Btn label="📣 Publicar selección" color="#16a34a" onPress={publicar} disabled={busy || cupo == null} />}
              {publicada && (resumen?.pendientes_notificar ?? 0) > 0 &&
                <Btn label={`📣 Enviar avisos pendientes (${resumen?.pendientes_notificar})`} onPress={enviarPendientes} disabled={busy} />}
              {publicada && <Btn label="↩️ Volver a borrador" color="#6b7280" onPress={despublicar} disabled={busy} />}
              <Btn label="📊 Excel seleccionados" color="#0369a1" onPress={() => exportar('seleccionado')} />
              <Btn label="📊 Excel suplentes" color="#d97706" onPress={() => exportar('suplente')} />
            </View>
          </View>

          {loading ? <ActivityIndicator /> : vista === 'suplentes' ? (
            <View style={s.card}>
              {!suplentes.length && <Text style={s.small}>No hay suplentes todavía.</Text>}
              {suplentes.map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], gap: 8 }}>
                  <Text style={{ fontWeight: '800', width: 36 }}>N° {r.orden_suplente}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{r.nombres} {r.apellidos}</Text>
                    <Text style={s.small}>{r.rol} · {edadDe(r.nacimiento) ?? '—'} años</Text>
                  </View>
                  <Btn small label="↑" onPress={() => mover(r, -1)} disabled={busy || i === 0} />
                  <Btn small label="↓" onPress={() => mover(r, +1)} disabled={busy || i === suplentes.length - 1} />
                  <Btn small label="✅" color="#16a34a" onPress={() => marcar([r.id], 'seleccionado')} disabled={busy} />
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Filtros */}
              <View style={[s.card, { marginBottom: 10 }]}>
                <TextInput style={[s.input, { marginBottom: 6 }]} value={q} onChangeText={setQ} placeholder="🔎 Buscar por nombre o CI" autoCapitalize="none" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {([['todos', 'Todos'], ['seleccionado', '✅ Seleccionados'], ['suplente', '🕒 Suplentes'], ['sin', '⚪ Sin definir']] as const).map(([k, l]) => (
                    <Pressable key={k} onPress={() => setFSel(k)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: fSel === k ? '#0a7ea4' : '#f3f4f6' }}>
                      <Text style={{ color: fSel === k ? '#fff' : '#111', fontSize: 12, fontWeight: '700' }}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <View style={[s.input, { padding: 0, flex: 1, minWidth: 120 }]}>
                    <Picker selectedValue={fRol} onValueChange={(v) => setFRol(String(v))}>
                      <Picker.Item label="Rol: todos" value="todos" />
                      {roles.map((r) => <Picker.Item key={r} label={r} value={r} />)}
                    </Picker>
                  </View>
                  <View style={[s.input, { padding: 0, flex: 1, minWidth: 120 }]}>
                    <Picker selectedValue={fDoc} onValueChange={(v) => setFDoc(v as any)}>
                      <Picker.Item label="Documentos: todos" value="todos" />
                      <Picker.Item label="Completos" value="completos" />
                      <Picker.Item label="Faltan" value="faltan" />
                    </Picker>
                  </View>
                  <View style={[s.input, { padding: 0, flex: 1, minWidth: 120 }]}>
                    <Picker selectedValue={orden} onValueChange={(v) => setOrden(v as any)}>
                      <Picker.Item label="Orden: inscripción" value="fecha" />
                      <Picker.Item label="Orden: nombre" value="nombre" />
                      <Picker.Item label="Orden: edad" value="edad" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Acciones masivas */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <Pressable onPress={() => {
                  const all = filtrados.every((r) => sel[r.id])
                  const n: Record<string, boolean> = { ...sel }; filtrados.forEach((r) => (n[r.id] = !all)); setSel(n)
                }}>
                  <Text style={{ color: '#0a7ea4', fontWeight: '700' }}>☑️ Marcar/desmarcar visibles</Text>
                </Pressable>
                <Text style={s.small}>{idsSel.length} marcados · {filtrados.length} de {regs.length}</Text>
              </View>
               <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }, idsSel.length > 0 && { backgroundColor: colors.primary[700], padding: 10, borderRadius: radius.xl, ...shadows.md }, Platform.OS === 'web' && idsSel.length > 0 ? ({ position: 'sticky', top: 82, zIndex: 20 } as any) : null]}>
                <Btn label="✅ Seleccionar" color="#16a34a" onPress={() => marcar(idsSel, 'seleccionado')} disabled={busy || !idsSel.length} />
                <Btn label="🕒 Pasar a suplente" color="#d97706" onPress={() => marcar(idsSel, 'suplente')} disabled={busy || !idsSel.length} />
                <Btn label="⚪ Quitar (sin definir)" color="#6b7280" onPress={() => marcar(idsSel, null)} disabled={busy || !idsSel.length} />
              </View>

              <View style={s.card}>
                {!filtrados.length && <Text style={s.small}>No hay inscriptos con estos filtros.</Text>}
                {filtrados.map((r) => {
                  const faltan = documentosFaltantes(r)
                  const noCupo = año ? !ocupaCupo(r, año) : false
                  return (
                     <View key={r.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                      <Pressable onPress={() => setSel((p) => ({ ...p, [r.id]: !p[r.id] }))} hitSlop={8}>
                        <Text style={{ fontSize: 22 }}>{sel[r.id] ? '☑️' : '⬜'}</Text>
                      </Pressable>
                       <InitialAvatar name={`${r.nombres} ${r.apellidos}`} tone={r.seleccion === 'suplente' ? 'coral' : 'primary'} /><View style={{ flex: 1, gap: 3 }}>
                         <Text style={{ fontFamily: typography.family.bold, color: colors.text.primary.light }}>{r.nombres} {r.apellidos}</Text>
                        <Text style={s.small}>
                          {edadDe(r.nacimiento) ?? '—'} años · {r.rol}{r.es_jefe ? ' (Jefe)' : ''} · {r.misiono_antes ? 'Misionó antes' : 'Primera vez'} · Inscripto {fmtFecha(r.created_at)}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          <Chip r={r} />
                          <View style={{ backgroundColor: faltan.length ? '#fee2e2' : '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                            <Text style={{ fontSize: 12, color: faltan.length ? '#b91c1c' : '#15803d' }}>
                              {faltan.length ? `📄 Falta: ${faltan.join(', ')}` : '📄 Docs completos'}
                            </Text>
                          </View>
                          {noCupo && (
                            <View style={{ backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                              <Text style={{ fontSize: 12, color: '#3730a3' }}>👶 No ocupa cupo</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {r.seleccion !== 'seleccionado' && <Btn small label="✅" color="#16a34a" onPress={() => marcar([r.id], 'seleccionado')} disabled={busy} />}
                          {r.seleccion !== 'suplente' && <Btn small label="🕒" color="#d97706" onPress={() => marcar([r.id], 'suplente')} disabled={busy} />}
                          {r.seleccion != null && <Btn small label="⚪" color="#6b7280" onPress={() => marcar([r.id], null)} disabled={busy} />}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}
