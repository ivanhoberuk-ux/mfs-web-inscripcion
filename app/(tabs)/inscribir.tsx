// FILE: app/(tabs)/inscribir.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { s, colors, spacing } from '../../src/lib/theme'
import { fetchPueblos, registerIfCapacity, publicUrl } from '../../src/lib/api'
import { supabase } from '../../src/lib/supabase'
import * as Clipboard from 'expo-clipboard'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { registrationSchema, normalizeEmail, normalizePhone, normalizeCi } from '../../src/lib/validation'
import { z } from 'zod'

type Pueblo = { id: string; nombre: string; cupo_max: number; activo: boolean }
type Errs = Record<string, string | null>

const inputErrorStyle = { borderColor: colors.error, borderWidth: 1 }

export default function Inscribir() {
  const router = useRouter()
  const [pueblos, setPueblos] = useState<Pueblo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Campos base (obligatorios)
  const [puebloId, setPuebloId] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [ci, setCi] = useState('')
  const [nacimiento, setNacimiento] = useState('') // DD-MM-AAAA (UI)
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [emNombre, setEmNombre] = useState('')
  const [emTelefono, setEmTelefono] = useState('')
  const [rol, setRol] = useState<'Tio' | 'Misionero'>('Misionero')
  const [esJefe, setEsJefe] = useState(false)

  // Nuevos (obligatorios)
  const [tratamiento, setTratamiento] = useState<boolean | null>(false)
  const [tratamientoDetalle, setTratamientoDetalle] = useState('')
  const [alimento, setAlimento] = useState<boolean | null>(false)
  const [alimentoDetalle, setAlimentoDetalle] = useState('')
  const [padreNombre, setPadreNombre] = useState('')
  const [padreTelefono, setPadreTelefono] = useState('')
  const [madreNombre, setMadreNombre] = useState('')
  const [madreTelefono, setMadreTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')

  // Aceptación de términos (obligatorio)
  const [acepta, setAcepta] = useState(false)

  const [errs, setErrs] = useState<Errs>({})
  const [registroExistente, setRegistroExistente] = useState<any>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  // URLs de plantillas (bucket público "plantillas")
  const URL_PERMISO = publicUrl('plantillas', 'permiso_menor.pdf')
  const URL_PROTOCOLO = publicUrl('plantillas', 'protocolo_prevencion.pdf')
  const URL_ESTATUTOS = publicUrl('plantillas', 'estatutos_mfs.pdf')

  // Verificar autenticación
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        setUser(session?.user || null)
        
        if (!session?.user) {
          // No mostrar alert durante la carga inicial para evitar problemas de hidratación
          setTimeout(() => {
            Alert.alert(
              'Autenticación requerida',
              'Debés iniciar sesión para inscribirte a un pueblo.',
              [
                {
                  text: 'Crear cuenta',
                  onPress: () => router.push('/login?mode=signup')
                },
                {
                  text: 'Iniciar sesión',
                  onPress: () => router.push('/login')
                }
              ]
            )
          }, 100)
          return
        }
        
        // Verificar si ya está inscripto
        const { data: registro } = await supabase
          .from('registros')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle()
        
        if (registro) {
          // Cargar datos existentes en el formulario
          setRegistroExistente(registro)
          setModoEdicion(true)
          setPuebloId(registro.pueblo_id || '')
          setNombres(registro.nombres || '')
          setApellidos(registro.apellidos || '')
          setCi(registro.ci || '')
          const fechaNac = registro.nacimiento ? new Date(registro.nacimiento) : null
          if (fechaNac) {
            const dd = String(fechaNac.getUTCDate()).padStart(2, '0')
            const mm = String(fechaNac.getUTCMonth() + 1).padStart(2, '0')
            const yyyy = fechaNac.getUTCFullYear()
            setNacimiento(`${dd}-${mm}-${yyyy}`)
          }
          setEmail(registro.email || '')
          setTelefono(registro.telefono || '')
          setDireccion(registro.direccion || '')
          setEmNombre(registro.emergencia_nombre || '')
          setEmTelefono(registro.emergencia_telefono || '')
          setRol(registro.rol || 'Misionero')
          setEsJefe(registro.es_jefe || false)
          setTratamiento(registro.tratamiento_especial || false)
          setTratamientoDetalle(registro.tratamiento_detalle || '')
          setAlimento(registro.alimentacion_especial || false)
          setAlimentoDetalle(registro.alimentacion_detalle || '')
          setPadreNombre(registro.padre_nombre || '')
          setPadreTelefono(registro.padre_telefono || '')
          setMadreNombre(registro.madre_nombre || '')
          setMadreTelefono(registro.madre_telefono || '')
          setCiudad(registro.ciudad || '')
          setAcepta(true) // Ya aceptó términos previamente
        }
        
      } catch (e: any) {
        console.error('Error verificando autenticación:', e)
      } finally {
        if (mounted) setCheckingAuth(false)
      }
    })()
    
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchPueblos()
        setPueblos((data as Pueblo[]).filter((p) => p.activo))
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  // ---------- Helpers UI ----------
  function Label({ children }: { children: React.ReactNode }) {
    return (
      <Text style={s.label}>
        {children} <Text style={{ color: colors.error }}>*</Text>
      </Text>
    )
  }

  function SegToggle({
    value,
    onChange,
    labels = ['No', 'Sí'],
    err,
  }: { value: boolean | null; onChange: (v: boolean) => void; labels?: [string, string] | string[]; err?: string | null }) {
    return (
      <View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => onChange(false)}
            style={[
              s.button,
              { paddingVertical: 8, backgroundColor: value === false ? colors.primary[500] : colors.neutral[300] },
            ]}
          >
            <Text style={[s.buttonText, { color: 'white' }]}>{labels[0]}</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange(true)}
            style={[
              s.button,
              { paddingVertical: 8, backgroundColor: value === true ? colors.primary[500] : colors.neutral[300] },
            ]}
          >
            <Text style={[s.buttonText, { color: 'white' }]}>{labels[1]}</Text>
          </Pressable>
        </View>
        {!!err && <Text style={{ color: colors.error, marginTop: 4, fontSize: 12 }}>{err}</Text>}
      </View>
    )
  }

  function SegRol() {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => {
            setRol('Misionero')
          }}
          style={[s.button, { paddingVertical: 8, backgroundColor: rol === 'Misionero' ? colors.primary[500] : colors.neutral[300] }]}
        >
          <Text style={[s.buttonText, { color: 'white' }]}>Misionero</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setRol('Tio')
            setEsJefe(false)
          }}
          style={[s.button, { paddingVertical: 8, backgroundColor: rol === 'Tio' ? colors.primary[500] : colors.neutral[300] }]}
        >
          <Text style={[s.buttonText, { color: 'white' }]}>Tío</Text>
        </Pressable>
      </View>
    )
  }

  async function openUrl(url?: string | null) {
    try {
      if (!url) return
      const supported = await Linking.canOpenURL(url)
      if (!supported) {
        Alert.alert('No se pudo abrir', 'El dispositivo no reconoce la URL.')
        return
      }
      await Linking.openURL(url)
    } catch (e: any) {
      Alert.alert('No se pudo abrir', e?.message ?? String(e))
    }
  }

  // ---------- Fechas (DD-MM-AAAA en UI) ----------
  function isValidDateDDMMYYYY(s: string) {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(s)) return false
    const [dd, mm, yyyy] = s.split('-').map((x) => parseInt(x, 10))
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false
    const d = new Date(Date.UTC(yyyy, mm - 1, dd))
    const today = new Date()
    const isFuture = d > today
    return d.getUTCFullYear() === yyyy && d.getUTCMonth() + 1 === mm && d.getUTCDate() === dd && !isFuture
  }
  function toYYYYMMDD_fromDDMMYYYY(s: string): string | null {
    if (!isValidDateDDMMYYYY(s)) return null
    const [dd, mm, yyyy] = s.split('-')
    return `${yyyy}-${mm}-${dd}`
  }
  function handleNacimientoChange(t: string) {
    const digits = t.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length >= 5) out = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
    else if (digits.length >= 3) out = `${digits.slice(0, 2)}-${digits.slice(2)}`
    setNacimiento(out)
    if (out.length === 10) setErrs((e) => ({ ...e, nacimiento: null }))
  }
  // Edad a partir de la entrada DD-MM-AAAA
  function ageFromDDMMYYYY(s: string): number | null {
    if (!isValidDateDDMMYYYY(s)) return null
    const [dd, mm, yyyy] = s.split('-').map(Number)
    const birth = new Date(yyyy, mm - 1, dd)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }
  const computedAge = ageFromDDMMYYYY(nacimiento)
  const isMinor = computedAge !== null ? computedAge < 18 : null

  // --------- Normalizadores rápidos (using validation lib) ---------
  const normEmail = normalizeEmail
  const normPhone = normalizePhone
  const normCi = normalizeCi

  // 🔴 Nueva regla: Padres/Tutores solo si rol=Misionero **y** menor de edad
  const requierePadres = rol === 'Misionero' && isMinor === true

  // ---------- Validaciones (using zod schema) ----------
  function validate(): boolean {
    const e: Errs = {}

    try {
      // Build data object for validation
      const formData = {
        puebloId,
        nombres,
        apellidos,
        ci,
        nacimiento,
        email,
        telefono,
        direccion,
        ciudad: ciudad || undefined,
        emNombre,
        emTelefono,
        rol,
        esJefe,
        tratamiento: tratamiento === true,
        tratamientoDetalle: tratamientoDetalle || undefined,
        alimento: alimento === true,
        alimentoDetalle: alimentoDetalle || undefined,
        padreNombre: padreNombre || undefined,
        padreTelefono: padreTelefono || undefined,
        madreNombre: madreNombre || undefined,
        madreTelefono: madreTelefono || undefined,
        acepta,
      };

      // Validate using zod schema
      registrationSchema.parse(formData);

      // Additional custom validations
      if (tratamiento !== true && tratamiento !== false) e.tratamiento = 'Elegí Sí o No.'
      if (alimento !== true && alimento !== false) e.alimento = 'Elegí Sí o No.'

      // Date validation
      if (!isValidDateDDMMYYYY(nacimiento.trim())) {
        e.nacimiento = 'Usá formato DD-MM-AAAA válido.'
      }

      // Padres/Tutores validation if required
      if (requierePadres) {
        if (!padreNombre.trim()) e.padreNombre = 'Completá nombre del padre.'
        if (!padreTelefono.trim()) e.padreTelefono = 'Completá teléfono del padre.'
        if (!madreNombre.trim()) e.madreNombre = 'Completá nombre de la madre.'
        if (!madreTelefono.trim()) e.madreTelefono = 'Completá teléfono de la madre.'
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map zod errors to form errors
        error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          e[path] = issue.message;
        });
      }
    }

    setErrs(e)
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true })
      }, 50)
      return false
    }
    return true
  }

  async function onSubmit() {
    if (saving) return // guard contra doble click
    try {
      if (!validate()) {
        Alert.alert('Faltan datos', 'Revisá los campos marcados en rojo.')
        return
      }
      const nacimientoISO = toYYYYMMDD_fromDDMMYYYY(nacimiento.trim())
      if (!nacimientoISO) {
        setErrs((e) => ({ ...e, nacimiento: 'Usá formato DD-MM-AAAA.' }))
        Alert.alert('Fecha inválida', 'Verificá el formato de nacimiento.')
        return
      }

      setSaving(true)

      const ciNormalizado = normCi(ci)
      
      if (modoEdicion && registroExistente) {
        // Modo edición: actualizar registro existente
        const { error: updateError } = await supabase
          .from('registros')
          .update({
            pueblo_id: puebloId,
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            ci: ciNormalizado,
            nacimiento: nacimientoISO,
            telefono: normPhone(telefono),
            direccion: direccion.trim(),
            emergencia_nombre: emNombre.trim(),
            emergencia_telefono: normPhone(emTelefono),
            rol,
            es_jefe: rol === 'Misionero' ? !!esJefe : false,
            tratamiento_especial: !!tratamiento,
            tratamiento_detalle: tratamiento ? tratamientoDetalle.trim() : null,
            alimentacion_especial: !!alimento,
            alimentacion_detalle: alimento ? alimentoDetalle.trim() : null,
            padre_nombre: requierePadres ? padreNombre.trim() : null,
            padre_telefono: requierePadres ? normPhone(padreTelefono) : null,
            madre_nombre: requierePadres ? madreNombre.trim() : null,
            madre_telefono: requierePadres ? normPhone(madreTelefono) : null,
            ciudad: ciudad.trim() || null,
          })
          .eq('id', registroExistente.id)

        if (updateError) throw updateError

        Alert.alert('Actualizado', 'Tus datos fueron actualizados correctamente.', [
          { text: 'OK', onPress: () => router.push('/') }
        ])
      } else {
        // Modo creación: verificar duplicados y crear nuevo registro
        const { data: existente, error: checkError } = await supabase
          .from('registros')
          .select('id, nombres, apellidos')
          .eq('ci', ciNormalizado)
          .maybeSingle()

        if (checkError) {
          throw new Error('No se pudo verificar la cédula: ' + checkError.message)
        }

        if (existente) {
          setSaving(false)
          setErrs((e) => ({ ...e, ci: 'Esta cédula ya está registrada.' }))
          
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(
              `⚠️ Cédula duplicada\n\nLa cédula ${ciNormalizado} ya está registrada para ${existente.nombres} ${existente.apellidos}.\n\nSi necesitás actualizar tus datos, contactá con los organizadores.`
            )
          } else {
            Alert.alert(
              'Cédula duplicada',
              `La cédula ${ciNormalizado} ya está registrada para ${existente.nombres} ${existente.apellidos}.\n\nSi necesitás actualizar tus datos, contactá con los organizadores.`
            )
          }
          return
        }

        const id = await registerIfCapacity({
          pueblo_id: puebloId,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          ci: ciNormalizado,
          nacimiento: nacimientoISO,
          email: user?.email || normEmail(email),
          telefono: normPhone(telefono),
          direccion: direccion.trim(),
          ciudad: ciudad.trim() || null,
          emergencia_nombre: emNombre.trim(),
          emergencia_telefono: normPhone(emTelefono),
          rol,
          es_jefe: rol === 'Misionero' ? !!esJefe : false,

          tratamiento_especial: !!tratamiento,
          tratamiento_detalle: tratamiento ? tratamientoDetalle.trim() : null,
          alimentacion_especial: !!alimento,
          alimentacion_detalle: alimento ? alimentoDetalle.trim() : null,

          // SOLOS si requierePadres=true (misionero menor)
          padre_nombre: requierePadres ? padreNombre.trim() : null,
          padre_telefono: requierePadres ? normPhone(padreTelefono) : null,
          madre_nombre: requierePadres ? madreNombre.trim() : null,
          madre_telefono: requierePadres ? normPhone(madreTelefono) : null,

          acepta_terminos: acepta,
        })
        
        // Actualizar el pueblo_id en el profile del usuario
        await supabase
          .from('profiles')
          .update({ pueblo_id: puebloId })
          .eq('id', user.id)

        // Copiar código al portapapeles
        try {
          await Clipboard.setStringAsync(String(id))
        } catch {}

        // Mostrar mensaje y redirigir
        Alert.alert(
          '¡Inscripción confirmada!',
          `Tu código: ${id}\n\nAhora te llevamos a cargar tus documentos.`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push({ pathname: '/(tabs)/documentos', params: { code: id } })
              },
            },
          ],
          { onDismiss: () => {
            router.push({ pathname: '/(tabs)/documentos', params: { code: id } })
          }}
        )
        
        // Redirigir automáticamente después de 1 segundo como fallback
        setTimeout(() => {
          router.push({ pathname: '/(tabs)/documentos', params: { code: id } })
        }, 1000)
      }

      // Reset form solo si no estamos en modo edición
      if (!modoEdicion) {
        setErrs({})
        setPuebloId('')
        setNombres(''); setApellidos(''); setCi(''); setNacimiento('')
        setEmail(''); setTelefono(''); setDireccion(''); setCiudad('')
        setEmNombre(''); setEmTelefono('')
        setRol('Misionero'); setEsJefe(false)
        setTratamiento(false); setTratamientoDetalle('')
        setAlimento(false); setAlimentoDetalle('')
        setPadreNombre(''); setPadreTelefono('')
        setMadreNombre(''); setMadreTelefono('')
        setAcepta(false)
      }
    } catch (e: any) {
      Alert.alert('No se pudo inscribir', e?.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  if (checkingAuth) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
        <Text style={[s.text, { marginTop: 8, color: colors.text.tertiary.light }]}>
          Verificando autenticación...
        </Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[s.title, { textAlign: 'center', marginBottom: 16 }]}>
          Autenticación requerida
        </Text>
        <Text style={[s.text, { textAlign: 'center', marginBottom: 24, color: colors.text.secondary.light }]}>
          Debés iniciar sesión para inscribirte a un pueblo
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="primary" onPress={() => router.push('/login?mode=signup')} style={{ flex: 1 }}>
            Crear cuenta
          </Button>
          <Button variant="secondary" onPress={() => router.push('/login')} style={{ flex: 1 }}>
            Iniciar sesión
          </Button>
        </View>
      </View>
    )
  }

  return (
    <ScrollView ref={scrollRef} style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>{modoEdicion ? 'Actualizar inscripción' : 'Inscripción'}</Text>
      
      {modoEdicion && (
        <Card style={{ backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
          <Text style={[s.text, { fontWeight: '700', color: '#92400e' }]}>
            Modo Edición
          </Text>
          <Text style={[s.text, { color: '#92400e', marginTop: 4 }]}>
            Ya estás inscripto. Podés actualizar tus datos y presionar "Guardar cambios" al final.
          </Text>
        </Card>
      )}
      
      <Card style={{ backgroundColor: colors.primary[50], borderLeftWidth: 4, borderLeftColor: colors.primary[500] }}>
        <Text style={[s.text, { fontWeight: '600' }]}>
          Usuario autenticado: {user.email}
        </Text>
        <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 4 }]}>
          {modoEdicion ? 'Actualizá tus datos según sea necesario' : 'Completá el formulario para inscribirte a un pueblo'}
        </Text>
      </Card>

      {/* Pueblo */}
      <Card>
        <Label>Pueblo (Elegí uno)</Label>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pueblos.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setPuebloId(p.id)
                    setErrs((prev) => ({ ...prev, puebloId: null }))
                  }}
                  style={[
                    s.button,
                    { paddingVertical: 8, backgroundColor: puebloId === p.id ? colors.primary[500] : colors.neutral[300] },
                  ]}
                >
                  <Text style={[s.buttonText, { color: 'white' }]}>{p.nombre}</Text>
                </Pressable>
              ))}
            </View>
            {!!errs.puebloId && <Text style={{ color: colors.error, marginTop: 4, fontSize: 12 }}>{errs.puebloId}</Text>}
          </>
        )}
      </Card>

      {/* Datos personales */}
      <Card>
        <Label>Nombres</Label>
        <TextInput
          style={[s.input, errs.nombres && inputErrorStyle]}
          value={nombres}
          onChangeText={(t) => {
            setNombres(t)
            if (t) setErrs((e) => ({ ...e, nombres: null }))
          }}
        />

        <Label>Apellidos</Label>
        <TextInput
          style={[s.input, errs.apellidos && inputErrorStyle]}
          value={apellidos}
          onChangeText={(t) => {
            setApellidos(t)
            if (t) setErrs((e) => ({ ...e, apellidos: null }))
          }}
        />

        <Label>Cédula</Label>
        <TextInput
          style={[s.input, errs.ci && inputErrorStyle]}
          value={ci}
          onChangeText={(t) => {
            setCi(t)
            if (t) setErrs((e) => ({ ...e, ci: null }))
          }}
          keyboardType="number-pad"
        />

        <Label>Fecha de nacimiento (DD-MM-AAAA)</Label>
        <TextInput
          style={[s.input, errs.nacimiento && inputErrorStyle]}
          value={nacimiento}
          onChangeText={handleNacimientoChange}
          placeholder="15-08-2005"
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={10}
        />
        {!!errs.nacimiento && <Text style={{ color: colors.error, marginTop: 4, fontSize: 12 }}>{errs.nacimiento}</Text>}

        {/* Info de edad para el usuario */}
        {computedAge !== null && (
          <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 4 }]}>
            Edad: {computedAge} {computedAge >= 18 ? '(Mayor de edad)' : '(Menor de edad)'}
          </Text>
        )}

        <Label>Email</Label>
        <TextInput
          style={[s.input, errs.email && inputErrorStyle]}
          value={email}
          onChangeText={(t) => {
            setEmail(t)
            if (t) setErrs((e) => ({ ...e, email: null }))
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Label>Teléfono</Label>
        <TextInput
          style={[s.input, errs.telefono && inputErrorStyle]}
          value={telefono}
          onChangeText={(t) => {
            setTelefono(t)
            if (t) setErrs((e) => ({ ...e, telefono: null }))
          }}
          keyboardType="phone-pad"
        />

        <Label>Dirección</Label>
        <TextInput
          style={[s.input, errs.direccion && inputErrorStyle]}
          value={direccion}
          onChangeText={(t) => {
            setDireccion(t)
            if (t) setErrs((e) => ({ ...e, direccion: null }))
          }}
        />
        
        <Label>Ciudad</Label>
        <TextInput
          style={[s.input, errs.ciudad && inputErrorStyle]}
          value={ciudad}
          onChangeText={(t) => {
            setCiudad(t)
            if (t) setErrs((e) => ({ ...e, ciudad: null }))
          }}
          placeholder="Ej: Asunción, Luque, etc."
        />
      </Card>

      {/* Contacto de emergencia */}
      <Card>
        <Text style={s.text}>(Emergencia)</Text>
        <Label>Nombre</Label>
        <TextInput
          style={[s.input, errs.emNombre && inputErrorStyle]}
          value={emNombre}
          onChangeText={(t) => {
            setEmNombre(t)
            if (t) setErrs((e) => ({ ...e, emNombre: null }))
          }}
        />
        <Label>Teléfono</Label>
        <TextInput
          style={[s.input, errs.emTelefono && inputErrorStyle]}
          value={emTelefono}
          onChangeText={(t) => {
            setEmTelefono(t)
            if (t) setErrs((e) => ({ ...e, emTelefono: null }))
          }}
          keyboardType="phone-pad"
        />
      </Card>

      {/* Rol */}
      <Card>
        <Label>Tipo de misionero</Label>
        <SegRol />
        <Text style={[s.small, { marginTop: 6, color: colors.text.tertiary.light }]}>
          Si elegís <Text style={{ fontWeight: '700' }}>Tío</Text>, no necesitás completar datos de Padres/Tutores.
        </Text>
        <Text style={[s.small, { color: colors.text.tertiary.light }]}>
          Si sos <Text style={{ fontWeight: '700' }}>Misionero</Text> y **mayor de edad**, tampoco se solicitarán datos de Padres/Tutores.
        </Text>
        {rol === 'Misionero' && (
          <View style={{ marginTop: 8 }}>
            <Text style={s.label}>¿Es Jefe?</Text>
            <SegToggle value={esJefe} onChange={setEsJefe} labels={['No', 'Sí']} />
          </View>
        )}
      </Card>

      {/* Tratamiento / Medicación */}
      <View style={s.card}>
        <Label>¿Tratamiento o medicación especial?</Label>
        <SegToggle
          value={tratamiento}
          onChange={(v) => {
            setTratamiento(v)
            setErrs((e) => ({ ...e, tratamiento: null }))
          }}
          err={errs.tratamiento}
        />
        {tratamiento === true && (
          <>
            <Label>Especificar</Label>
            <TextInput
              style={[s.input, errs.tratamientoDetalle && { ...inputErrorStyle, minHeight: 80 }]}
              value={tratamientoDetalle}
              onChangeText={(t) => {
                setTratamientoDetalle(t)
                if (t) setErrs((e) => ({ ...e, tratamientoDetalle: null }))
              }}
              multiline
              placeholder="Detalle del tratamiento/medicación…"
            />
          </>
        )}
      </View>

      {/* Alimentación */}
      <View style={s.card}>
        <Label>¿Alimentación especial?</Label>
        <SegToggle
          value={alimento}
          onChange={(v) => {
            setAlimento(v)
            setErrs((e) => ({ ...e, alimento: null }))
          }}
          err={errs.alimento}
        />
        {alimento === true && (
          <>
            <Label>Especificar</Label>
            <TextInput
              style={[s.input, errs.alimentoDetalle && { ...inputErrorStyle, minHeight: 80 }]}
              value={alimentoDetalle}
              onChangeText={(t) => {
                setAlimentoDetalle(t)
                if (t) setErrs((e) => ({ ...e, alimentoDetalle: null }))
              }}
              multiline
              placeholder="Detalle de la alimentación (ej: celíaco, sin lactosa)…"
            />
          </>
        )}
      </View>

      {/* Padres — SOLO si es Misionero y MENOR de edad */}
      {requierePadres && (
        <View style={s.card}>
          <Text style={s.text}>Padres / Tutores</Text>

          <Label>Nombre del Padre</Label>
          <TextInput
            style={[s.input, errs.padreNombre && inputErrorStyle]}
            value={padreNombre}
            onChangeText={(t) => {
              setPadreNombre(t)
              if (t) setErrs((e) => ({ ...e, padreNombre: null }))
            }}
          />

          <Label>Teléfono del Padre</Label>
          <TextInput
            style={[s.input, errs.padreTelefono && inputErrorStyle]}
            value={padreTelefono}
            onChangeText={(t) => {
              setPadreTelefono(t)
              if (t) setErrs((e) => ({ ...e, padreTelefono: null }))
            }}
            keyboardType="phone-pad"
          />

          <Label>Nombre de la Madre</Label>
          <TextInput
            style={[s.input, errs.madreNombre && inputErrorStyle]}
            value={madreNombre}
            onChangeText={(t) => {
              setMadreNombre(t)
              if (t) setErrs((e) => ({ ...e, madreNombre: null }))
            }}
          />

          <Label>Teléfono de la Madre</Label>
          <TextInput
            style={[s.input, errs.madreTelefono && inputErrorStyle]}
            value={madreTelefono}
            onChangeText={(t) => {
              setMadreTelefono(t)
              if (t) setErrs((e) => ({ ...e, madreTelefono: null }))
            }}
            keyboardType="phone-pad"
          />
        </View>
      )}

      {/* Aceptación de términos y plantillas */}
      <View style={s.card}>
        <Label>Aceptación</Label>
        <Pressable
          onPress={() => {
            setAcepta((v) => !v)
            if (!acepta) setErrs((e) => ({ ...e, acepta: null }))
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: errs.acepta ? '#d94646' : acepta ? '#0a7ea4' : '#999',
              backgroundColor: acepta ? '#0a7ea4' : 'transparent',
            }}
          />
          <Text style={s.text}>
            Acepto el{' '}
            <Text style={{ color: '#0a7ea4', textDecorationLine: 'underline' }} onPress={() => openUrl(URL_PROTOCOLO)}>
              Protocolo de Prevención
            </Text>{' '}
            y los{' '}
            <Text style={{ color: '#0a7ea4', textDecorationLine: 'underline' }} onPress={() => openUrl(URL_ESTATUTOS)}>
              Estatutos de las MFS
            </Text>{' '}
            (leer ambos).
          </Text>
        </Pressable>
        {!!errs.acepta && <Text style={{ color: '#d94646', marginTop: 4, fontSize: 12 }}>{errs.acepta}</Text>}

        <View style={{ marginTop: 8 }}>
          <Text style={s.small}>
            Si el participante es menor, acá podés revisar el{' '}
            <Text style={{ color: '#0a7ea4', textDecorationLine: 'underline' }} onPress={() => openUrl(URL_PERMISO)}>
              Permiso del Menor
            </Text>
            .
          </Text>
        </View>
      </View>

      <Pressable
        style={[s.button, { marginTop: 12, paddingVertical: 12, opacity: saving ? 0.7 : 1 }]}
        onPress={onSubmit}
        disabled={saving}
      >
        <Text style={s.buttonText}>
          {saving 
            ? (modoEdicion ? 'Guardando cambios…' : 'Inscribiendo…') 
            : (modoEdicion ? 'Guardar cambios' : 'Confirmar inscripción')
          }
        </Text>
      </Pressable>
    </ScrollView>
  )
}
