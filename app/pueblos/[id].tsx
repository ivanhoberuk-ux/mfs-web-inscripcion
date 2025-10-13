// FILE: app/pueblos/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { generateExcelBase64 } from '../../src/lib/excel'
import { supabase } from '../../src/lib/supabase'
import { s } from '../../src/lib/theme'

export default function PuebloInscriptosScreen() {
  const params = useLocalSearchParams<{ id: string; hideCi?: string }>()
  const puebloId = String(params.id || '')
  const hideCi = params.hideCi === '1' // ← flag para ocultar CI
  const navigation = useNavigation()

  const [puebloNombre, setPuebloNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [inscriptos, setInscriptos] = useState<any[]>([])
  const [query, setQuery] = useState('')

  // ---------- Header con icono ----------
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people-outline" size={20} color="#0a7ea4" />
          <Text style={{ marginLeft: 8, fontWeight: '600' }}>
            Inscriptos {puebloNombre ? `· ${puebloNombre}` : ''}
          </Text>
        </View>
      ),
    } as any)
  }, [navigation, puebloNombre])

  // ---------- Helpers ----------
  function parseNacimientoToDate(s?: string | null): Date | null {
    if (!s) return null
    const t = s.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const d = new Date(t + 'T00:00:00')
      return isNaN(d.getTime()) ? null : d
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(t)) {
      const [dd, mm, yyyy] = t.split('-').map((x) => parseInt(x, 10))
      const d = new Date(yyyy, mm - 1, dd)
      return isNaN(d.getTime()) ? null : d
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) {
      const [dd, mm, yyyy] = t.split('/').map((x) => parseInt(x, 10))
      const d = new Date(yyyy, mm - 1, dd)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }

  function getAge(d: Date | null): number | null {
    if (!d) return null
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const m = today.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
    return age
  }

  function requiredDocKey(age: number | null): 'ficha' | 'autorizacion' | null {
    if (age == null) return null
    return age < 18 ? 'ficha' : 'autorizacion'
  }
  function requiredDocLabel(age: number | null): string {
    const k = requiredDocKey(age)
    if (k === 'ficha') return 'Permiso del Menor'
    if (k === 'autorizacion') return 'Aceptación de Protocolo'
    return 'Documento requerido'
  }
  function hasRequiredDoc(r: any, age: number | null): boolean | null {
    const k = requiredDocKey(age)
    if (k === 'ficha') return !!r.ficha_medica_url
    if (k === 'autorizacion') return !!r.autorizacion_url
    return null
  }
  const normalize = (v: string) =>
    (v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  // ---------- Carga ----------
  const load = useCallback(async () => {
    try {
      setLoading(true)
      // Nombre del pueblo
      const { data: pueblo, error: ep } = await supabase
        .from('pueblos')
        .select('id,nombre')
        .eq('id', puebloId)
        .maybeSingle()
      if (ep) throw ep
      setPuebloNombre(pueblo?.nombre ?? '')

      // Inscriptos del pueblo
      const { data, error } = await supabase
        .from('registros')
        .select(`
          id, created_at, pueblo_id,
          nombres, apellidos, ci, nacimiento, email, telefono,
          rol, es_jefe,
          autorizacion_url, ficha_medica_url
        `)
        .eq('pueblo_id', puebloId)
        .order('created_at', { ascending: true })
      if (error) throw error

      setInscriptos(data ?? [])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [puebloId])

  useEffect(() => {
    load()
  }, [load])

  // ---------- Filtro ----------
  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return inscriptos
    return inscriptos.filter((r: any) => {
      const full = `${r.nombres || ''} ${r.apellidos || ''}`
      // Si ocultamos CI, no lo usamos para buscar:
      return normalize(full).includes(q) || (!hideCi && normalize(r.ci || '').includes(q))
    })
  }, [query, inscriptos, hideCi])

  // ---------- Export CSV (respeta hideCi) ----------
  async function exportCsv() {
    try {
      if (!filtered.length) {
        Alert.alert('CSV', 'No hay inscriptos (según filtro) para exportar.')
        return
      }

      const headerBase = ['id', 'nombres', 'apellidos']
      const headerExtra = hideCi
        ? ['edad', 'email', 'telefono', 'rol', 'es_jefe', 'doc_requerido', 'estado_doc', 'autorizacion_url', 'ficha_medica_url', 'created_at']
        : ['ci', 'edad', 'email', 'telefono', 'rol', 'es_jefe', 'doc_requerido', 'estado_doc', 'autorizacion_url', 'ficha_medica_url', 'created_at']

      const rows: any[] = [[...headerBase, ...headerExtra]]

      for (const r of filtered) {
        const d = parseNacimientoToDate(r.nacimiento)
        const age = getAge(d)
        const req = requiredDocLabel(age)
        const ok = hasRequiredDoc(r, age)

        const base = [r.id, r.nombres ?? '', r.apellidos ?? '']
        const extra = hideCi
          ? [
              age == null ? '' : String(age),
              r.email ?? '',
              r.telefono ?? '',
              r.rol ?? '',
              r.es_jefe ? 'SI' : 'NO',
              req,
              ok == null ? '' : ok ? 'Cargada' : 'Falta',
              r.autorizacion_url ?? '',
              r.ficha_medica_url ?? '',
              r.created_at ?? '',
            ]
          : [
              r.ci ?? '',
              age == null ? '' : String(age),
              r.email ?? '',
              r.telefono ?? '',
              r.rol ?? '',
              r.es_jefe ? 'SI' : 'NO',
              req,
              ok == null ? '' : ok ? 'Cargada' : 'Falta',
              r.autorizacion_url ?? '',
              r.ficha_medica_url ?? '',
              r.created_at ?? '',
            ]

        rows.push([...base, ...extra]);
      }

      const fileName = `inscriptos_${(puebloNombre || 'pueblo').replace(/\s+/g, '_')}.xlsx`;
      const base64 = generateExcelBase64(rows, fileName);
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { 
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
          dialogTitle: fileName 
        });
      } else {
        Alert.alert('Excel generado', uri);
      }
    } catch (e: any) {
      Alert.alert('No se pudo exportar Excel', e?.message ?? String(e));
    }
  }

  // ---------- Render ----------
  const total = inscriptos.length
  const totalFiltrado = filtered.length

  const renderItem = useCallback(({ item }: { item: any }) => {
    const d = parseNacimientoToDate(item.nacimiento)
    const age = getAge(d)
    const reqLabel = requiredDocLabel(age)
    const ok = hasRequiredDoc(item, age)

    return (
      <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text style={[s.small, { fontWeight: '600' }]}>
          {item.nombres} {item.apellidos}
        </Text>

        {/* CI oculto si hideCi === true */}
        {!hideCi && <Text style={s.small}>CI: {item.ci || '-'}</Text>}

        <Text style={s.small}>
          Edad: {age == null ? '—' : age} · Rol: {item.rol || '-'}
          {item.rol === 'Misionero' && item.es_jefe ? ' (Jefe)' : ''}
        </Text>

        {/* Solo el documento requerido por edad */}
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={[s.small, { opacity: 0.9, marginRight: 8 }]}>{reqLabel}:</Text>
          {ok == null ? (
            <View style={{ backgroundColor: '#999', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontSize: 12 }}>Desconocido</Text>
            </View>
          ) : ok ? (
            <View style={{ backgroundColor: '#21a179', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontSize: 12 }}>Cargada</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#d94646', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontSize: 12 }}>Falta</Text>
            </View>
          )}
        </View>
      </View>
    )
  }, [hideCi])

  const keyExtractor = useCallback((item: any) => item.id, [])

  const headerList = useMemo(
    () => (
      <View style={{ marginBottom: 8 }}>
        <Text style={s.title}>{puebloNombre || 'Pueblo'}</Text>

        {/* Buscador */}
        <Text style={s.label}>{hideCi ? 'Buscar por nombre' : 'Buscar por nombre o CI'}</Text>
        <TextInput
          style={[s.input, { marginBottom: 6 }]}
          value={query}
          onChangeText={setQuery}
          placeholder={hideCi ? 'Ej: Ana' : 'Ej: Ana / 1234567'}
          autoCapitalize="none"
        />
        <Text style={s.text}>
          {totalFiltrado} de {total} inscriptos
        </Text>

        <Pressable
          onPress={exportCsv}
          style={[s.button, { alignSelf: 'flex-start', paddingVertical: 8, marginTop: 8 }]}
        >
          <Text style={s.buttonText}>Exportar CSV</Text>
        </Pressable>
      </View>
    ),
    [puebloNombre, query, total, totalFiltrado, hideCi]
  )

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[s.screen, { paddingBottom: 20 }]}>
      <FlatList
        ListHeaderComponent={headerList}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}
