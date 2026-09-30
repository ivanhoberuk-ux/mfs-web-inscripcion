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
import { s, colors, radius, spacing } from '../../src/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { Picker } from '@react-native-picker/picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { generateExcelBase64, fileStamp, humanDate, safeFileName, type ExcelOptions } from '../../src/lib/excel'
import { useUserRoles } from '../../src/hooks/useUserRoles'
import { estadoDocumentos, edadDe } from '../../src/lib/documentos'
import { fetchAñoActivo } from '../../src/lib/api'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { Badge } from '../../src/components/Badge'
import { InitialAvatar, PageHeader } from '../../src/components/PageHeader'

const añoRef = { current: new Date().getFullYear() }

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
  cedula_frente_url: string | null
  cedula_dorso_url: string | null
}

type Pueblo = { id: string; nombre: string }

type RolFilter = 'todos' | 'Misionero' | 'Tio' | 'Hijo'
type DocStatusFilter = 'todos' | 'completos' | 'incompletos'

const PAGE = 30
const EXPORT_CHUNK = 500 // tamaño de lote para export "todo"

export default function Buscador() {
  const { isSuperAdmin, isPuebloAdmin, puebloId: userPuebloId, loading: rolesLoading } = useUserRoles();
  
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
    if (rolesLoading) return;
    
    (async () => {
      const { data, error } = await supabase.from('pueblos').select('id,nombre').order('nombre')
      if (!error) {
        const pueblos = data || [];
        // Si es pueblo_admin (no super admin), pre-seleccionar su pueblo y filtrar lista
        if (isPuebloAdmin && !isSuperAdmin && userPuebloId) {
          setPuebloList(pueblos.filter(p => p.id === userPuebloId));
          setPuebloId(userPuebloId);
        } else {
          setPuebloList(pueblos);
        }
      }
    })()
  }, [rolesLoading, isPuebloAdmin, isSuperAdmin, userPuebloId])

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('registros')
      .select(
        'id,created_at,nombres,apellidos,ci,email,pueblo_id,rol,nacimiento,autorizacion_url,ficha_medica_url,firma_url,cedula_frente_url,cedula_dorso_url'
      )
      .is('deleted_at', null)
      .eq('año', añoRef.current)
      .order('created_at', { ascending: false })

    const term = q.trim()
    if (term.length >= 2) {
      // Solo por nombre/apellido (POLÍTICA: no buscar por CI)
      query = query.or(`nombres.ilike.%${term}%,apellidos.ilike.%${term}%`)
    }
    
    // Si es pueblo_admin (no super admin), filtrar por su pueblo
    if (isPuebloAdmin && !isSuperAdmin && userPuebloId) {
      query = query.eq('pueblo_id', userPuebloId);
    } else if (puebloId !== 'todos') {
      query = query.eq('pueblo_id', puebloId);
    }
    
    if (rol !== 'todos') query = query.eq('rol', rol)

    return query
  }, [q, puebloId, rol, isPuebloAdmin, isSuperAdmin, userPuebloId])

  const calcAge = edadDe
  function requiredDocsOk(r: Row) {
    const st = estadoDocumentos(r)
    return { ...st, age: edadDe(r.nacimiento) }
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
        añoRef.current = await fetchAñoActivo()
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
  async function saveAndShareExcel(filename: string, data: any[][], opts: ExcelOptions = {}) {
    const base64 = generateExcelBase64(data, opts);
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: opts.title || filename,
      });
    } else {
      Alert.alert('Excel generado', uri);
    }
  }

  function buildExcelContext(scope: 'page' | 'all', count: number) {
    const puebloNombre = puebloId === 'todos' ? null : (pueblosMap[puebloId] || null);
    const tituloBase = puebloNombre
      ? `MFS — Buscador · ${puebloNombre}`
      : `MFS — Buscador · Todos los pueblos`;
    const partes: string[] = [];
    if (q?.trim()) partes.push(`Búsqueda: "${q.trim()}"`);
    if (rol && rol !== 'todos') partes.push(`Rol: ${rol}`);
    if (docStatus && docStatus !== 'todos') partes.push(`Documentos: ${docStatus}`);
    partes.push(scope === 'page' ? 'Página actual' : 'Todos los resultados');
    const subtitulo = `${partes.join(' · ')} · ${count} inscriptos · Generado el ${humanDate()}`;
    const fileBase = puebloNombre
      ? `MFS_buscador_${safeFileName(puebloNombre)}`
      : `MFS_buscador_general`;
    const fileName = `${fileBase}_${scope === 'page' ? 'pagina' : 'todo'}_${fileStamp()}.xlsx`;
    return {
      fileName,
      opts: {
        title: tituloBase,
        subtitle: subtitulo,
        sheetName: 'Buscador',
      } as ExcelOptions,
    };
  }
  function mapRowToCsvArray(r: Row) {
    const { age, okRequeridos, faltantes } = requiredDocsOk(r)
    return [
      r.id,
      r.nombres ?? '',
      r.apellidos ?? '',
      pueblosMap[r.pueblo_id] || r.pueblo_id,
      r.rol ?? '',
      age == null ? '' : String(age),
      r.email ?? '',
      // Documentos (solo etiquetas, no URLs)
      faltantes.join(', '),
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
      'documentos_faltantes',
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
      const ctx = buildExcelContext('page', rows.length);
      await saveAndShareExcel(ctx.fileName, data, ctx.opts);
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
      añoRef.current = await fetchAñoActivo()

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
      const ctx = buildExcelContext('all', all.length);
      await saveAndShareExcel(ctx.fileName, data, ctx.opts);
    } catch (e: any) {
      Alert.alert('No se pudo exportar CSV', e?.message ?? String(e))
    } finally {
      setExporting(null)
    }
  }

  // ===================== UI =====================
  if (rolesLoading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Verificando permisos…</Text>
      </View>
    );
  }

  if (!isSuperAdmin && !isPuebloAdmin) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <Text style={[s.text, { color: '#666', textAlign: 'center' }]}>
          Esta sección solo está disponible para administradores.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent}>
      <PageHeader icon="search-outline" title="Buscador de inscriptos" subtitle={isPuebloAdmin && !isSuperAdmin ? 'Personas de mi pueblo' : 'Encontrá personas y revisá su documentación'} />

      {/* Controles */}
      <Card style={{ gap: 8 }}> 
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary[100], borderRadius: radius.full, backgroundColor: colors.surface.light, paddingHorizontal: spacing.lg }}><Ionicons name="search" size={22} color={colors.primary[500]} /><TextInput value={q} onChangeText={setQ} style={[s.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} placeholder="Buscar por nombre o apellido" autoCapitalize="none" /></View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Pueblo</Text>
            <View style={[s.input, { padding: 0, overflow: 'hidden' }]}> 
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
            <View style={[s.input, { padding: 0, overflow: 'hidden' }]}> 
              <Picker selectedValue={rol} onValueChange={(v) => setRol(v as RolFilter)}>
                <Picker.Item label="Todos" value="todos" />
                <Picker.Item label="Misionero" value="Misionero" />
                <Picker.Item label="Tío" value="Tio" />
                <Picker.Item label="Hijo" value="Hijo" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={s.label}>Documentos (según edad)</Text>
        <View style={[s.input, { padding: 0, overflow: 'hidden' }]}> 
          <Picker selectedValue={docStatus} onValueChange={(v) => setDocStatus(v as DocStatusFilter)}>
            <Picker.Item label="Todos" value="todos" />
            <Picker.Item label="Completos (requeridos OK)" value="completos" />
            <Picker.Item label="Incompletos (falta alguno)" value="incompletos" />
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <Button variant="primary" onPress={() => runSearch(true)}>Aplicar filtros</Button>
          <Pressable
            style={[s.button, s.buttonGhost]}
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
            style={[s.button, s.buttonOutline]}
            onPress={exportCsvPage}
            disabled={exporting !== null || loading}
          >
            <Text style={s.buttonTextOutline}>
              {exporting === 'page' ? 'Exportando…' : 'Exportar Excel (página)'}
            </Text>
          </Pressable>

          <Pressable
            style={[s.button, s.buttonOutline]}
            onPress={exportCsvAll}
            disabled={exporting !== null || loading}
          >
            <Text style={s.buttonTextOutline}>
              {exporting === 'all' ? 'Exportando…' : 'Exportar Excel (todo)'}
            </Text>
          </Pressable>
        </View>

        <Text style={[s.small, { color: '#64748b', marginTop: 2 }]}>Resultados en pantalla: {total}</Text>
      </Card>

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
            const st = requiredDocsOk(r)

            return (
              <Card key={r.id} style={{ marginBottom: 10 }}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><InitialAvatar name={`${r.nombres} ${r.apellidos}`} /><View style={{ flex: 1 }}><Text style={s.cardTitle}>{r.nombres} {r.apellidos}</Text><Text style={s.small}>{pueblo} · {r.rol}</Text></View></View>

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
                  <Chip ok={st.okCedulaFrente} label="Céd. frente" />
                  <Chip ok={st.okCedulaDorso} label="Céd. dorso" />
                  <Chip ok={st.okFirma} label="Firma" />
                  {st.necesitaPermiso && <Chip ok={st.okPermiso} label="Permiso menor" />}
                  {st.necesitaAceptacion && <Chip ok={st.okAceptacion} label="Aceptación" />}
                  <Chip ok={st.okRequeridos} label="Completos" />
                </View>

                <Text style={[s.small, { color: '#666', marginTop: 6 }]}>
                  Fecha: {new Date(r.created_at).toLocaleString()}
                </Text>
              </Card>
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
  return <Badge tone={ok ? 'success' : 'neutral'}>{label}</Badge>
}
