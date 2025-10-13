// FILE: app/(tabs)/firma.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { View, Text, Pressable, Alert, Image, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { s, colors, spacing } from '../../src/lib/theme'
import SignaturePad, { SignaturePadHandle } from '../../src/components/SignaturePad'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { generarAutorizacionPDF, type Datos } from '../../src/lib/pdf'
// Si tenés un generador específico para menores, podés habilitarlo:
// import { generarPermisoPDF } from '../../src/lib/pdf'
import { uploadToStorage, updateDocumento } from '../../src/lib/api'
import { supabase } from '../../src/lib/supabase'

type Registro = {
  id: string
  nombres: string
  apellidos: string
  ci: string | null
  nacimiento: string | null
  email: string | null
  telefono: string | null
  direccion?: string | null
  pueblo_id: string
  rol: 'Tio' | 'Misionero' | 'Participante' | string
  es_jefe?: boolean | null
  autorizacion_url?: string | null
  ficha_medica_url?: string | null
  created_at?: string
}

type Pueblo = { id: string; nombre: string }

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}
function calcAge(date: Date | null): number | null {
  if (!date) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--
  return age
}

export default function Firma() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [pueblo, setPueblo] = useState<Pueblo | null>(null)

  const [sig, setSig] = useState<string | null>(null)
  const padRef = useRef<SignaturePadHandle | null>(null)
  const [saving, setSaving] = useState(false)

  // ------- Cargar registro y pueblo -------
  const load = useCallback(async () => {
    if (!id) {
      Alert.alert('Falta parámetro', 'Esta pantalla requiere un id de registro.')
      router.replace('/pueblos')
      return
    }
    try {
      setLoading(true)
      const { data: reg, error: er } = await supabase
        .from('registros')
        .select('id,nombres,apellidos,ci,nacimiento,email,telefono,direccion,pueblo_id,rol,es_jefe,autorizacion_url,ficha_medica_url,created_at')
        .eq('id', id)
        .maybeSingle();
      if (er) throw er
      if (!reg) {
        Alert.alert('No encontrado', 'No se encontró el registro.')
        router.replace('/pueblos')
        return
      }
      setRegistro(reg)

      const { data: p, error: ep } = await supabase
        .from('pueblos')
        .select('id,nombre')
        .eq('id', reg.pueblo_id)
        .maybeSingle();
      if (ep) throw ep
      setPueblo(p ?? null)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  const age = useMemo(() => calcAge(parseDate(registro?.nacimiento ?? null)), [registro?.nacimiento])
  const isAdult = useMemo(() => (age == null ? true : age >= 18), [age])

  const docLabel = useMemo(() => (isAdult ? 'Aceptación de Protocolo (Adultos)' : 'Permiso del Menor'), [isAdult])
  const docKey: 'autorizacion_url' | 'ficha_medica_url' = isAdult ? 'autorizacion_url' : 'ficha_medica_url'

  async function tomarFirma() {
    try {
      const dataUrl = await padRef.current?.getDataURL()
      if (!dataUrl) return Alert.alert('Sin firma', 'Por favor, firmá en el recuadro.')
      setSig(dataUrl)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e))
    }
  }

  async function guardarPDF() {
    if (!registro) return Alert.alert('Error', 'No hay registro cargado.')
    if (!sig) return Alert.alert('Falta la firma', 'Tomá la firma antes de generar el PDF.')

    try {
      setSaving(true)

      // Armar datos para el PDF (incluí CI aquí; en UI lo ocultamos si hace falta, pero en documentos es necesario)
      const datos: Datos = {
        nombres: registro.nombres,
        apellidos: registro.apellidos,
        ci: registro.ci ?? '',
        nacimiento: registro.nacimiento ?? '',
        email: registro.email ?? '',
        telefono: registro.telefono ?? '',
        direccion: registro.direccion ?? '',
        puebloNombre: pueblo?.nombre ?? '',
        rol: registro.rol || 'Participante',
        esJefe: !!registro.es_jefe,
      }

      // Elegí el generador: si tenés dos funciones, cambia acá según isAdult
      // const pdfUriOrUrl = isAdult ? await generarAutorizacionPDF(datos, sig) : await generarPermisoPDF(datos, sig)
      const pdfUriOrUrl = await generarAutorizacionPDF(datos, sig)

      // Subir SIEMPRE a Supabase (web o nativo) para uniformidad
      const storagePath = `${isAdult ? 'autorizaciones' : 'permisos'}/${registro.id}_${Date.now()}.pdf`
      const publicUrl = await uploadToStorage('documentos', pdfUriOrUrl, storagePath)
      if (!publicUrl) throw new Error('No se pudo subir el PDF a Storage')

      // Actualizar el campo correcto del registro
      await updateDocumento(registro.id, { [docKey]: publicUrl })

      Alert.alert('Listo', `PDF generado y subido (${docLabel}).`)
      // Opcional: navegar atrás
      // router.back()
    } catch (e: any) {
      Alert.alert('Error al generar/subir PDF', e?.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 8, color: colors.text.tertiary.light }]}>Cargando…</Text>
      </View>
    )
  }

  if (!registro) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.text}>No se pudo cargar el registro.</Text>
      </View>
    )
  }

  return (
    <View style={[s.screen, { gap: 12 }]}>
      <Text style={s.title}>Firma</Text>

      {/* Resumen del inscrito (sin mostrar CI aquí para privacidad visual) */}
      <Card>
        <Text style={[s.text, { fontWeight: '700' }]}>
          {registro.nombres} {registro.apellidos}
        </Text>
        <Text style={[s.small, { color: colors.text.tertiary.light }]}>
          Pueblo: {pueblo?.nombre || registro.pueblo_id} · Rol: {registro.rol}
        </Text>
        <Text style={[s.small, { color: colors.text.tertiary.light }]}>
          Edad: {age == null ? '—' : age} {age == null ? '' : isAdult ? '(Adulto)' : '(Menor)'}
        </Text>
        <View style={{ marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: colors.neutral[100] }}>
          <Text style={[s.small, { fontWeight: '700', marginBottom: 4 }]}>Documento requerido</Text>
          <Text style={s.small}>{docLabel}</Text>
        </View>
      </Card>

      {/* Pad de firma */}
      <SignaturePad ref={padRef} height={280} />

      {/* Acciones del pad */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button variant="primary" style={{ flex: 1 }} onPress={tomarFirma}>
          Usar firma
        </Button>
        <Button variant="danger" style={{ flex: 1 }} onPress={() => { padRef.current?.clear(); setSig(null) }}>
          Borrar
        </Button>
      </View>

      {/* Vista previa de la firma capturada */}
      {sig && (
        <Card style={{ alignItems: 'center' }}>
          <Text style={[s.small, { marginBottom: 6, color: colors.text.tertiary.light }]}>Vista previa</Text>
          <Image source={{ uri: sig }} style={{ width: '100%', height: 140, resizeMode: 'contain' }} />
        </Card>
      )}

      {/* Generar y subir PDF */}
      <Button 
        variant="primary" 
        onPress={guardarPDF} 
        loading={saving}
      >
        {`Generar PDF (${isAdult ? 'Aceptación' : 'Permiso'})`}
      </Button>
    </View>
  )
}
