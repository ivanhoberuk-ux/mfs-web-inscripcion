// FILE: app/(tabs)/buscador.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native'
import { s } from '../../src/lib/theme'
import { supabase } from '../../src/lib/supabase'
import { Picker } from '@react-native-picker/picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { generateExcelBase64 } from '../../src/lib/excel'

type Row = {
  id: string
  created_at: string
  nombres: string
  apellidos: string
  ci: string | null            // <- se mantiene en el tipo, pero NO se exporta ni se muestra
  email: string | null
  pueblo_id: string
  rol: 'Tio' | 'Misionero'
  nacimiento: string | null
  autorizacion_url: string | null     // Aceptación (adultos)
  ficha_medica_url: string | null     // Permiso (menores)
  firma_url: string | null
}

type Pueblo = { id: string; nombre: string }

type RolFilter = 'todos' | 'Misionero' | 'Tio'
type DocStatusFilter = 'todos' | 'completos' | 'incompletos'

const PAGE = 30
const EXPORT_CHUNK = 500 // tamaño de lote para export "todo"

export default function Buscador() {
  const [q, setQ] = useState('')
  const [puebloList, setPuebloList] = useState<Pueblo[]>([])
  const [puebloId, setPuebloId] = useState<string>('todos')
  const [rol, setRol] = useState<RolFilter>('todos')
  const [docStatus, setDocStatus] = useState<DocStatusFilter>('todos')

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [exporting, setExporting] = useState<'page' | 'all' | null>(null)
  const offsetRef = useRef(0)

  const pueblosMap = puebloList.reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.nombre
    return acc
  }, {})

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('pueblos').select('id,nombre').order('nombre')
      if (!error) setPuebloList(data || [])
    })()
  }, [])

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('registros')
      .select(
        'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url'
      )
      .order('created_at', { ascending: false })

    const term = q.trim()
    if (term.length >= 2) {
      // Solo por nombre/apellido (POLÍTICA: no buscar por CI)
      query = query.or(`nombres.ilike.%${term}%,apellidos.ilike.%${term}%`)
    }
    if (puebloId !== 'todos') query = query.eq('pueblo_id', puebloId)
    if (rol !== 'todos') query = query.eq('rol', rol)

    return query
  }, [q, puebloId, rol])

  function calcAge(iso?: string | null): number | null {
    if (!iso) return null
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const m = today.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
    return age
  }

  function requiredDocsOk(r: Row) {
    const age = calcAge(r.nacimiento)
    const isAdult = age === null ? true : age >= 18 // si no hay fecha, tratamos como adulto
    const okFirma = !!r.firma_url
    if (isAdult) {
      const okAcept = !!r.autorizacion_url
      return { isAdult, age, okRequeridos: okAcept && okFirma, okAcept, okPerm: !!r.ficha_medica_url, okFirma }
    } else {
      const okPerm = !!r.ficha_medica_url
      return { isAdult, age, okRequeridos: okPerm && okFirma, okAcept: !!r.autorizacion_url, okPerm, okFirma }
    }
  }

  const runSearch = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true)
        offsetRef.current = 0
      } else {
        setMoreLoading(true)
      }
      try {
        const query = buildQuery()
        const from = offsetRef.current
        const to = from + PAGE - 1
        const { data, error } = await query.range(from, to)
        if (error) throw error

        let page = (data || []) as Row[]

        // Filtro de documentos (según edad) del lado cliente
        if (docStatus !== 'todos') {
          page = page.filter((r) => {
            const { okRequeridos } = requiredDocsOk(r)
            return docStatus === 'completos' ? okRequeridos : !okRequeridos
          })
        }

        if (reset) setRows(page)
        else setRows((prev) => [...prev, ...page])

        const got = (data || []).length
        setHasMore(got === PAGE)
        if (got > 0) offsetRef.current += got
      } finally {
        setLoading(false)
        setMoreLoading(false)
      }
    },
    [buildQuery, docStatus]
  )

  useEffect(() => {
    runSearch(true)
  }, []) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => runSearch(true), 300)
    return () => clearTimeout(t)
  }, [q, puebloId, rol, docStatus, runSearch])

  const total = rows.length

  // ===================== CSV helpers (sin CI) =====================
  function csvEscape(v: string | number | null | undefined) {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  async function saveAndShareExcel(filename: string, data: any[][]) {
    const base64 = generateExcelBase64(data, filename);
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        dialogTitle: filename 
      });
    } else {
      Alert.alert('Excel generado', uri);
    }
  }
  function mapRowToCsvArray(r: Row) {
    const { age, okRequeridos, okAcept, okPerm, okFirma } = requiredDocsOk(r)
    return [
      r.id,
      r.nombres ?? '',
      r.apellidos ?? '',
      pueblosMap[r.pueblo_id] || r.pueblo_id,
      r.rol ?? '',
      age == null ? '' : String(age),
      r.email ?? '',
      // Documentos (solo etiquetas, no URLs)
      okFirma ? 'Firma OK' : 'Firma Falta',
      (age === null || age >= 18) ? (okAcept ? 'Aceptación OK' : 'Aceptación Falta') : (okPerm ? 'Permiso OK' : 'Permiso Falta'),
      okRequeridos ? 'Completo' : 'Incompleto',
      new Date(r.created_at).toISOString(),
    ]
  }
  function rowsToArray(rowsIn: Row[]) {
    const header = [
      'id',
      'nombres',
      'apellidos',
      'pueblo',
      'rol',
      'edad',
      'email',
      'firma',
      'doc_requerido',      // Aceptación (adultos) o Permiso (menores)
      'estado_documentos',  // Completo / Incompleto
      'created_at',
    ];
    const rows: any[][] = [header];
    for (const r of rowsIn) {
      rows.push(mapRowToCsvArray(r));
    }
    return rows;
  }

  async function exportCsvPage() {
    try {
      if (!rows.length) {
        Alert.alert('Excel', 'No hay resultados en la página para exportar.');
        return;
      }
      setExporting('page');
      const data = rowsToArray(rows);
      await saveAndShareExcel('buscador_pagina.xlsx', data);
    } catch (e: any) {
      Alert.alert('No se pudo exportar Excel', e?.message ?? String(e));
    } finally {
      setExporting(null);
    }
  }

  async function exportCsvAll() {
    try {
      setExporting('all')
      const all: Row[] = []
      let from = 0

      // Traemos TODO respetando filtros del servidor + docStatus en cliente
      while (true) {
        const to = from + EXPORT_CHUNK - 1
        const { data, error } = await buildQuery().range(from, to)
        if (error) throw error
        let chunk = (data || []) as Row[]

        if (docStatus !== 'todos') {
          chunk = chunk.filter((r) => {
            const { okRequeridos } = requiredDocsOk(r)
            return docStatus === 'completos' ? okRequeridos : !okRequeridos
          })
        }

        all.push(...chunk)
        if ((data || []).length < EXPORT_CHUNK) break
        from += EXPORT_CHUNK
      }

      if (!all.length) {
        Alert.alert('Excel', 'No hay resultados para exportar.');
        return;
      }

      const data = rowsToArray(all);
      await saveAndShareExcel('buscador_todo.xlsx', data);
    } catch (e: any) {
      Alert.alert('No se pudo exportar CSV', e?.message ?? String(e))
    } finally {
      setExporting(null)
    }
  }

  // ===================== UI =====================
  return (
    <ScrollView style={[s.screen, { backgroundColor: '#f9fafb' }]} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={[s.title, { color: '#0f172a' }]}>Buscador de inscriptos</Text>

      {/* Controles */}
      <View style={[s.card, { gap: 8 }]}>
        <Text style={s.label}>Buscar por nombre o apellido</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={s.input}
          placeholder="Ej: Juan / Pérez"
          autoCapitalize="none"
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Pueblo</Text>
            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }}>
              <Picker selectedValue={puebloId} onValueChange={setPuebloId}>
                <Picker.Item label="Todos" value="todos" />
                {puebloList.map((p) => (
                  <Picker.Item key={p.id} label={p.nombre} value={p.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.label}>Rol</Text>
            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }}>
              <Picker selectedValue={rol} onValueChange={(v) => setRol(v as RolFilter)}>
                <Picker.Item label="Todos" value="todos" />
                <Picker.Item label="Misionero" value="Misionero" />
                <Picker.Item label="Tío" value="Tio" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={s.label}>Documentos (según edad)</Text>
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }}>
          <Picker selectedValue={docStatus} onValueChange={(v) => setDocStatus(v as DocStatusFilter)}>
            <Picker.Item label="Todos" value="todos" />
            <Picker.Item label="Completos (requeridos OK)" value="completos" />
            <Picker.Item label="Incompletos (falta alguno)" value="incompletos" />
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={() => runSearch(true)}>
            <Text style={s.buttonText}>Aplicar filtros</Text>
          </Pressable>
          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#6c757d' }]}
            onPress={() => {
              setQ('')
              setPuebloId('todos')
              setRol('todos')
              setDocStatus('todos')
              runSearch(true)
            }}
          >
            <Text style={s.buttonText}>Limpiar</Text>
          </Pressable>

          {/* Botones de exporte */}
          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#0a7ea4' }]}
            onPress={exportCsvPage}
            disabled={exporting !== null || loading}
          >
            <Text style={s.buttonText}>
              {exporting === 'page' ? 'Exportando…' : 'Exportar CSV (página)'}
            </Text>
          </Pressable>

          <Pressable
            style={[s.button, { paddingVertical: 10, backgroundColor: '#0b6b86' }]}
            onPress={exportCsvAll}
            disabled={exporting !== null || loading}
          >
            <Text style={s.buttonText}>
              {exporting === 'all' ? 'Exportando…' : 'Exportar CSV (todo)'}
            </Text>
          </Pressable>
        </View>

        <Text style={[s.small, { color: '#64748b', marginTop: 2 }]}>Resultados en pantalla: {total}</Text>
      </View>

      {/* Resultados */}
      {loading ? (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={[s.small, { color: '#666', marginTop: 6 }]}>Buscando…</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={[s.text, { color: '#999' }]}>Sin resultados.</Text>
        </View>
      ) : (
        <>
          {rows.map((r) => {
            const pueblo = pueblosMap[r.pueblo_id] || r.pueblo_id
            const age = calcAge(r.nacimiento)
            const isAdult = age === null ? true : age >= 18
            const { okAcept, okPerm, okFirma } = requiredDocsOk(r)

            return (
              <View key={r.id} style={[s.card, { marginBottom: 10 }]}>
                <Text style={[s.text, { fontWeight: '700', color: '#0f172a' }]}>
                  {r.nombres} {r.apellidos}
                </Text>

                {/* PRIVACIDAD: CI oculto por política */}
                {/* <Text style={s.small}>CI: {r.ci || '-'}</Text> */}

                <Text style={s.small}>Email: {r.email || '-'}</Text>
                <Text style={[s.small, { marginTop: 4 }]}>Pueblo: {pueblo}</Text>
                <Text style={[s.small, { color: '#666' }]}>Rol: {r.rol}</Text>
                <Text style={[s.small, { color: '#666' }]}>
                  Edad: {age === null ? '—' : `${age}`} {age === null ? '' : isAdult ? '(Mayor)' : '(Menor)'}
                </Text>

                {/* Chips: solo los requeridos según edad */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {isAdult ? <Chip ok={okAcept} label="Aceptación" /> : <Chip ok={okPerm} label="Permiso" />}
                  <Chip ok={okFirma} label="Firma" />
                </View>

                <Text style={[s.small, { color: '#666', marginTop: 6 }]}>
                  Fecha: {new Date(r.created_at).toLocaleString()}
                </Text>
              </View>
            )
          })}

          {hasMore && (
            <Pressable
              style={[s.button, { paddingVertical: 10, marginTop: 6, alignSelf: 'center' }]}
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
        backgroundColor: ok ? '#16a34a' : '#e5e7eb',
      }}
    >
      <Text style={{ color: ok ? '#fff' : '#374151', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  )
}
