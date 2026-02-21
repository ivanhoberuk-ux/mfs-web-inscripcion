// FILE: app/(tabs)/historico.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
} from 'react-native'
import { s, colors, spacing } from '../../src/lib/theme'
import { radius } from '../../src/lib/designSystem'
import { supabase } from '../../src/lib/supabase'
import { Card } from '../../src/components/Card'
import { Button } from '../../src/components/Button'
import { Field } from '../../src/components/Field'
import { useUserRoles } from '../../src/hooks/useUserRoles'
import * as XLSX from 'xlsx'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

type HistoricoRow = {
  id: string
  nombres: string
  apellidos: string
  ci: string
  email: string
  telefono: string
  rol: string
  es_jefe: boolean
  pueblo_id: string
  pueblo_nombre?: string
  created_at: string
  año: number
  estado: string
}

type YearSummary = {
  año: number
  total: number
  confirmados: number
  lista_espera: number
  cancelados: number
}

export default function Historico() {
  const { isSuperAdmin, isPuebloAdmin, puebloId, loading: rolesLoading } = useUserRoles()
  const [years, setYears] = useState<YearSummary[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [registros, setRegistros] = useState<HistoricoRow[]>([])
  const [pueblosMap, setPueblosMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)

  const isAdmin = isSuperAdmin || isPuebloAdmin

  // Load available years
  const loadYears = useCallback(async () => {
    try {
      setLoading(true)
      // Load pueblos map
      const { data: pueblos } = await supabase.from('pueblos').select('id, nombre')
      const map: Record<string, string> = {}
      ;(pueblos ?? []).forEach((p: any) => { map[p.id] = p.nombre })
      setPueblosMap(map)

      // Get year summary
      let query = supabase
        .from('registros')
        .select('año, estado')
      
      if (isPuebloAdmin && !isSuperAdmin && puebloId) {
        query = query.eq('pueblo_id', puebloId)
      }

      const { data, error } = await query
      if (error) throw error

      // Group by year
      const yearMap = new Map<number, YearSummary>()
      ;(data ?? []).forEach((r: any) => {
        if (!yearMap.has(r.año)) {
          yearMap.set(r.año, { año: r.año, total: 0, confirmados: 0, lista_espera: 0, cancelados: 0 })
        }
        const y = yearMap.get(r.año)!
        y.total++
        if (r.estado === 'confirmado') y.confirmados++
        else if (r.estado === 'lista_espera') y.lista_espera++
        else if (r.estado === 'cancelado') y.cancelados++
      })

      const sorted = Array.from(yearMap.values()).sort((a, b) => b.año - a.año)
      setYears(sorted)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, isPuebloAdmin, puebloId])

  // Load registros for selected year
  const loadYear = useCallback(async (año: number) => {
    try {
      setLoadingDetail(true)
      setSelectedYear(año)

      let query = supabase
        .from('registros')
        .select('id, nombres, apellidos, ci, email, telefono, rol, es_jefe, pueblo_id, created_at, "año", estado')
        .eq('año', año)
        .order('created_at', { ascending: true })

      if (isPuebloAdmin && !isSuperAdmin && puebloId) {
        query = query.eq('pueblo_id', puebloId)
      }

      const { data, error } = await query
      if (error) throw error
      setRegistros((data ?? []) as unknown as HistoricoRow[])
    } finally {
      setLoadingDetail(false)
    }
  }, [isSuperAdmin, isPuebloAdmin, puebloId])

  useEffect(() => {
    if (!rolesLoading && isAdmin) loadYears()
  }, [rolesLoading, isAdmin, loadYears])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadYears()
    if (selectedYear) await loadYear(selectedYear)
    setRefreshing(false)
  }, [loadYears, loadYear, selectedYear])

  // Filter registros
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return registros
    const q = searchQuery.toLowerCase()
    return registros.filter(r =>
      r.nombres.toLowerCase().includes(q) ||
      r.apellidos.toLowerCase().includes(q) ||
      r.ci.toLowerCase().includes(q) ||
      (r.email && r.email.toLowerCase().includes(q))
    )
  }, [registros, searchQuery])

  // Stats for selected year
  const stats = useMemo(() => {
    const byPueblo = new Map<string, { confirmados: number; total: number }>()
    registros.forEach(r => {
      if (!byPueblo.has(r.pueblo_id)) byPueblo.set(r.pueblo_id, { confirmados: 0, total: 0 })
      const p = byPueblo.get(r.pueblo_id)!
      p.total++
      if (r.estado === 'confirmado') p.confirmados++
    })
    return byPueblo
  }, [registros])

  // Export
  const exportToExcel = useCallback(async () => {
    if (filtered.length === 0) return
    try {
      setExporting(true)
      const rows = filtered.map(r => ({
        'Año': r.año,
        'Pueblo': pueblosMap[r.pueblo_id] || r.pueblo_id,
        'Nombres': r.nombres,
        'Apellidos': r.apellidos,
        'CI': r.ci,
        'Email': r.email,
        'Teléfono': r.telefono,
        'Rol': r.rol,
        'Jefe': r.es_jefe ? 'Sí' : 'No',
        'Estado': r.estado,
        'Fecha inscripción': new Date(r.created_at).toLocaleDateString(),
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `Año ${selectedYear}`)
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })

      const fileName = `historico_${selectedYear}_${Date.now()}.xlsx`
      const filePath = FileSystem.cacheDirectory + fileName
      await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 })

      if (Platform.OS === 'web') {
        const link = document.createElement('a')
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`
        link.download = fileName
        link.click()
      } else {
        await Sharing.shareAsync(filePath, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }, [filtered, selectedYear, pueblosMap])

  // Access control
  if (rolesLoading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Verificando permisos…</Text>
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>
          Solo administradores pueden ver el histórico.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background.light }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={[s.title, { fontSize: 28, marginBottom: 12 }]}>📊 Histórico</Text>

      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" />
          <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>Cargando años…</Text>
        </View>
      ) : years.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={[s.text, { color: colors.text.tertiary.light, marginTop: 8 }]}>No hay datos históricos.</Text>
        </View>
      ) : (
        <>
          {/* Year cards */}
          {years.map(y => (
            <Pressable key={y.año} onPress={() => loadYear(y.año)}>
              <Card
                style={{
                  marginBottom: 10,
                  borderWidth: 2,
                  borderColor: selectedYear === y.año ? colors.primary[500] : colors.primary[100],
                  backgroundColor: selectedYear === y.año ? colors.primary[50] : undefined,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>📅</Text>
                    <Text style={[s.text, { fontWeight: '700', fontSize: 20 }]}>{y.año}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <MiniStat label="Total" value={y.total} emoji="👥" />
                    <MiniStat label="Confirmados" value={y.confirmados} emoji="✅" />
                    {y.lista_espera > 0 && <MiniStat label="Espera" value={y.lista_espera} emoji="⏳" />}
                    {y.cancelados > 0 && <MiniStat label="Cancelados" value={y.cancelados} emoji="❌" />}
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}

          {/* Detail view */}
          {selectedYear && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[s.text, { fontWeight: '700', fontSize: 18 }]}>
                  📋 Inscriptos {selectedYear}
                </Text>
                <Button
                  variant="secondary"
                  onPress={exportToExcel}
                  disabled={exporting || filtered.length === 0}
                >
                  {exporting ? '⏳ Exportando…' : '📥 Exportar Excel'}
                </Button>
              </View>

              <Field
                label=""
                placeholder="🔍 Buscar por nombre, CI o email…"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Per-pueblo summary */}
              {stats.size > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 12 }}>
                  {Array.from(stats.entries()).map(([pid, st]) => (
                    <View
                      key={pid}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: colors.primary[50],
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.primary[100],
                      }}
                    >
                      <Text style={{ fontSize: 11, color: colors.text.tertiary.light }}>
                        {pueblosMap[pid] || 'Desconocido'}
                      </Text>
                      <Text style={[s.text, { fontWeight: '600', fontSize: 13 }]}>
                        {st.confirmados} confirmados / {st.total} total
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {loadingDetail ? (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <ActivityIndicator />
                </View>
              ) : filtered.length === 0 ? (
                <Text style={[s.text, { color: colors.text.tertiary.light, textAlign: 'center', marginTop: 16 }]}>
                  No se encontraron registros.
                </Text>
              ) : (
                <>
                  <Text style={[s.small, { color: colors.text.tertiary.light, marginBottom: 8 }]}>
                    Mostrando {filtered.length} de {registros.length} registros
                  </Text>
                  {filtered.map(r => (
                    <Card key={r.id} style={{ marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.text, { fontWeight: '600' }]}>
                            {r.nombres} {r.apellidos}
                          </Text>
                          <Text style={[s.small, { color: colors.text.tertiary.light }]}>
                            CI: {r.ci} • {r.rol} {r.es_jefe ? '(Jefe)' : ''} • {pueblosMap[r.pueblo_id] || ''}
                          </Text>
                        </View>
                        <EstadoBadge estado={r.estado} />
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

function MiniStat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: colors.text.tertiary.light }}>{emoji} {label}</Text>
      <Text style={{ fontWeight: '700', fontSize: 14 }}>{value}</Text>
    </View>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; text: string; emoji: string }> = {
    confirmado: { bg: '#dcfce7', text: '#166534', emoji: '✅' },
    lista_espera: { bg: '#fef9c3', text: '#854d0e', emoji: '⏳' },
    cancelado: { bg: '#fee2e2', text: '#991b1b', emoji: '❌' },
  }
  const c = config[estado] || config.confirmado
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 10 }}>{c.emoji}</Text>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '600' }}>{estado}</Text>
    </View>
  )
}
