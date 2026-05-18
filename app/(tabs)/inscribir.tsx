// FILE: app/(tabs)/inscribir.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert as RNAlert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native'

// Web-compatible Alert wrapper. React Native's Alert.alert is a no-op on web,
// which made the "Confirmar inscripción" button appear to do nothing when
// validation errors or success dialogs were shown. This shim uses
// window.alert / window.confirm on web and triggers the appropriate button
// callback so flows that rely on onPress (e.g. navigation after success) work.
const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; style?: string; onPress?: () => void }>,
    options?: { onDismiss?: () => void }
  ) => {
    if (Platform.OS !== 'web') {
      return RNAlert.alert(title, message, buttons as any, options as any)
    }
    const text = [title, message].filter(Boolean).join('\n\n')
    const actionable = (buttons ?? []).filter(
      (b) => b.style !== 'cancel' && typeof b.onPress === 'function'
    )
    if (actionable.length === 0) {
      if (typeof window !== 'undefined') window.alert(text)
      return
    }
    if (typeof window !== 'undefined') {
      const ok = window.confirm(text)
      if (ok) actionable[0].onPress?.()
      else {
        const cancel = (buttons ?? []).find(
          (b) => b.style === 'cancel' && typeof b.onPress === 'function'
        )
        cancel?.onPress?.()
      }
    }
  },
}
import { useRouter, useLocalSearchParams } from 'expo-router'
import { s, colors, spacing, radius } from '../../src/lib/theme'
import { fetchPueblos, registerIfCapacity, publicUrl, fetchEstadoInscripcionActivo, type EstadoInscripcion, type ConfiguracionInscripcion } from '../../src/lib/api'
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
  const params = useLocalSearchParams<{ edit?: string; nuevoHijo?: string }>()
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
  const [rol, setRol] = useState<'Tio' | 'Misionero' | 'Hijo' | 'Asesor'>('Misionero')
  const [esJefe, setEsJefe] = useState(false)
  const [misionoAntes, setMisionoAntes] = useState<boolean | null>(null)
  // Asesor
  const [tipoAsesor, setTipoAsesor] = useState<'padre_schoenstatt' | 'diocesano' | 'hermana_maria' | ''>('')
  const [pueblosAcompana, setPueblosAcompana] = useState<string[]>([])

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

  const [acepta, setAcepta] = useState(false)
  const [talleRemera, setTalleRemera] = useState('')

  // Pertenencia al Movimiento de Schoenstatt
  const [perteneceSchoenstatt, setPerteneceSchoenstatt] = useState<boolean | null>(null)
  const [ramaSchoenstatt, setRamaSchoenstatt] = useState<string>('')

  const [errs, setErrs] = useState<Errs>({})
  const [registroExistente, setRegistroExistente] = useState<any>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  // Todas las inscripciones (propias + hijos) bajo el email del usuario
  const [misRegistros, setMisRegistros] = useState<any[]>([])
  const scrollRef = useRef<ScrollView>(null)

  // Estado de inscripción (fechas/año activo)
  const [estadoInsc, setEstadoInsc] = useState<EstadoInscripcion>('sin_config')
  const [configInsc, setConfigInsc] = useState<ConfiguracionInscripcion | null>(null)
  const [loadingEstado, setLoadingEstado] = useState(true)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)
  const [reintentoEstado, setReintentoEstado] = useState(0)

  // URLs de plantillas (carga asíncrona de URLs firmadas)
  const [URL_PERMISO, setUrlPermiso] = useState<string>('');
  const [URL_PROTOCOLO, setUrlProtocolo] = useState<string>('');
  const [URL_ESTATUTOS, setUrlEstatutos] = useState<string>('');

  // Cargar URLs de plantillas al montar (gestionadas por super admin desde panel de plantillas)
  useEffect(() => {
    (async () => {
      try {
        const { fetchPlantillasUrlMap } = await import('../../src/lib/api');
        const map = await fetchPlantillasUrlMap();
        if (map['permiso_menor']) setUrlPermiso(map['permiso_menor'].url);
        if (map['protocolo']) setUrlProtocolo(map['protocolo'].url);
        if (map['estatutos']) setUrlEstatutos(map['estatutos'].url);
      } catch (e) {
        console.warn('Error cargando plantillas, usando fallback:', e);
        setUrlPermiso(await publicUrl('plantillas', 'Permiso de menor MFS 2026.pdf'));
        setUrlProtocolo(await publicUrl('plantillas', 'protocolo_prevencion.pdf'));
        setUrlEstatutos(await publicUrl('plantillas', 'estatutos_mfs.pdf'));
      }
    })();
  }, []);

  // Cargar datos de un registro existente al formulario
  function cargarRegistroEnFormulario(registro: any) {
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
    } else {
      setNacimiento('')
    }
    setEmail(registro.email || '')
    setTelefono(registro.telefono || '')
    setDireccion(registro.direccion || '')
    setEmNombre(registro.emergencia_nombre || '')
    setEmTelefono(registro.emergencia_telefono || '')
    setRol(registro.rol || 'Misionero')
    setEsJefe(registro.es_jefe || false)
    setMisionoAntes(registro.misiono_antes ?? null)
    setTratamiento(registro.tratamiento_especial || false)
    setTratamientoDetalle(registro.tratamiento_detalle || '')
    setAlimento(registro.alimentacion_especial || false)
    setAlimentoDetalle(registro.alimentacion_detalle || '')
    setPadreNombre(registro.padre_nombre || '')
    setPadreTelefono(registro.padre_telefono || '')
    setMadreNombre(registro.madre_nombre || '')
    setMadreTelefono(registro.madre_telefono || '')
    setCiudad(registro.ciudad || '')
    setTalleRemera(registro.talle_remera || '')
    setPerteneceSchoenstatt(registro.pertenece_schoenstatt ?? null)
    setRamaSchoenstatt(registro.rama_schoenstatt || '')
    setAcepta(true)
    setErrs({})
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50)
  }

  // Inicia una nueva inscripción de hijo/a bajo el mismo email del usuario
  function iniciarInscribirHijo() {
    const titular = misRegistros.find((r: any) => r.rol === 'Tio') ?? null
    if (!titular) {
      Alert.alert('No disponible', 'Solo los Tíos pueden inscribir a sus hijos/as bajo su cuenta.')
      return
    }
    setRegistroExistente(null)
    setModoEdicion(false)
    // Preservar pueblo elegido por el padre como sugerencia
    setPuebloId(titular?.pueblo_id || '')
    setNombres(''); setApellidos(''); setCi(''); setNacimiento('')
    setTelefono(''); setDireccion(''); setCiudad(titular?.ciudad || '')
    setEmNombre(titular?.emergencia_nombre || '')
    setEmTelefono(titular?.emergencia_telefono || '')
    setRol('Hijo'); setEsJefe(false); setMisionoAntes(null)
    setTratamiento(false); setTratamientoDetalle('')
    setAlimento(false); setAlimentoDetalle('')
    // Pre-cargar uno de los tutores con datos del titular
    if (titular) {
      const nombreTitular = `${titular.nombres || ''} ${titular.apellidos || ''}`.trim()
      setPadreNombre(nombreTitular)
      setPadreTelefono(titular.telefono || '')
    } else {
      setPadreNombre(''); setPadreTelefono('')
    }
    setMadreNombre(''); setMadreTelefono('')
    setTalleRemera('')
    setPerteneceSchoenstatt(null); setRamaSchoenstatt('')
    setAcepta(true) // el titular ya aceptó términos
    setErrs({})
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50)
  }

  // Verificar autenticación
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        setUser(session?.user || null)
        if (mounted) setCheckingAuth(false)
        
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
        
        // Cargar TODAS las inscripciones del usuario (propias + hijos) del año vigente
        const { data: registros } = await supabase
          .from('registros')
          .select('*')
          .eq('email', session.user.email)
          .is('deleted_at', null)
          .eq('año', 2026)
          .order('created_at', { ascending: true })

        const lista = registros ?? []
        setMisRegistros(lista)

        // Si llega ?edit=<id>, abrir ese registro específico
        const editId = typeof params.edit === 'string' ? params.edit : null
        const wantNuevoHijo = params.nuevoHijo === '1' || params.nuevoHijo === 'true'
        const target = editId ? lista.find((r: any) => r.id === editId) : null

        if (target) {
          cargarRegistroEnFormulario(target)
        } else if (wantNuevoHijo && lista.some((r: any) => r.rol === 'Tio')) {
          // Diferimos para que misRegistros ya esté en state
          setTimeout(() => {
            const titular = lista.find((r: any) => r.rol === 'Tio') ?? null
            setRegistroExistente(null)
            setModoEdicion(false)
            setPuebloId(titular?.pueblo_id || '')
            setNombres(''); setApellidos(''); setCi(''); setNacimiento('')
            setTelefono(''); setDireccion(''); setCiudad(titular?.ciudad || '')
            setEmNombre(titular?.emergencia_nombre || '')
            setEmTelefono(titular?.emergencia_telefono || '')
            setRol('Hijo'); setEsJefe(false); setMisionoAntes(null)
            setTratamiento(false); setTratamientoDetalle('')
            setAlimento(false); setAlimentoDetalle('')
            if (titular) {
              setPadreNombre(`${titular.nombres || ''} ${titular.apellidos || ''}`.trim())
              setPadreTelefono(titular.telefono || '')
            }
            setMadreNombre(''); setMadreTelefono('')
            setTalleRemera('')
            setPerteneceSchoenstatt(null); setRamaSchoenstatt('')
            setAcepta(true)
            setErrs({})
          }, 0)
        } else {
          // Por defecto: cargar el titular si existe
          const titular = lista.find((r: any) => r.rol !== 'Hijo') ?? lista[0] ?? null
          if (titular) cargarRegistroEnFormulario(titular)
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

  // Cargar estado de inscripción (fechas/año activo)
  useEffect(() => {
    (async () => {
      try {
        setLoadingEstado(true)
        setErrorEstado(null)
        const { config, estado } = await fetchEstadoInscripcionActivo()
        setConfigInsc(config)
        setEstadoInsc(estado)
      } catch (e: any) {
        console.warn('No se pudo cargar estado de inscripción', e)
        setErrorEstado(e?.message || 'Error de conexión')
      } finally {
        setLoadingEstado(false)
      }
    })()
  }, [reintentoEstado])

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
    const options: { key: 'Misionero' | 'Tio' | 'Hijo' | 'Asesor'; label: string }[] = [
      { key: 'Misionero', label: 'Misionero' },
      { key: 'Tio', label: 'Tío' },
      { key: 'Hijo', label: 'Hijo' },
      { key: 'Asesor', label: 'Asesor' },
    ]
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => {
              setRol(o.key)
              if (o.key !== 'Misionero') { setEsJefe(false); setMisionoAntes(null) }
              if (o.key !== 'Asesor') { setTipoAsesor(''); setPueblosAcompana([]) }
            }}
            style={[ s.button, {
              paddingVertical: 8, flexGrow: 1, minWidth: 80,
              backgroundColor: rol === o.key ? colors.primary[500] : colors.neutral[300],
            }]}
          >
            <Text style={[s.buttonText, { color: 'white' }]}>{o.label}</Text>
          </Pressable>
        ))}
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

  // 🔴 Padres/Tutores: solo si rol=Misionero y menor de edad. Hijo no requiere (va con sus padres).
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
        talleRemera,
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

      // Límite de edad para Misioneros: máximo 25 años
      if (rol === 'Misionero' && computedAge !== null && computedAge > 25) {
        e.nacimiento = `¡Qué lindo que quieras seguir misionando! 💛 Lastimosamente ya pasó el límite de edad para ser Misionero en las Misiones Familiares.`
      }

      // Límite de edad para Hijos: máximo 14 años
      if (rol === 'Hijo' && computedAge !== null && computedAge > 14) {
        e.nacimiento = `¡Tu hijo/a ya es grande! 🌟 Es momento de que viva la misión como Misionero propiamente dicho. ¡Animate a inscribirlo/a como Misionero!`
      }

      // Edad mínima para Tío: 30 años
      if (rol === 'Tio' && computedAge !== null && computedAge < 30) {
        e.nacimiento = `Para inscribirte como Tío necesitás tener al menos 30 años cumplidos.`
      }

      // Asesor: requiere tipo
      if (rol === 'Asesor' && !tipoAsesor) {
        e.tipoAsesor = 'Elegí: Padre de Schoenstatt, Diocesano o Hermana de María.'
      }

      // Pertenencia a Schoenstatt
      if (perteneceSchoenstatt !== true && perteneceSchoenstatt !== false) {
        e.perteneceSchoenstatt = 'Elegí Sí o No.'
      }
      if (perteneceSchoenstatt === true && !ramaSchoenstatt) {
        e.ramaSchoenstatt = 'Elegí a qué rama pertenecés.'
      }

      // Misionó antes (solo para Misionero)
      if (rol === 'Misionero' && misionoAntes !== true && misionoAntes !== false) {
        e.misionoAntes = 'Elegí Sí o No.'
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

      // Validación de fase de inscripción (UI). El backend valida también.
      if (!modoEdicion) {
        if (estadoInsc === 'cerrado_antes' || estadoInsc === 'cerrado_despues' || estadoInsc === 'sin_config') {
          Alert.alert('Inscripciones cerradas', 'No es posible inscribirse en este momento.')
          return
        }
        if (estadoInsc === 'fase_anticipada') {
          const permitido =
            rol === 'Tio' ||
            rol === 'Hijo' ||
            (rol === 'Misionero' && (esJefe || misionoAntes === true))
          if (!permitido) {
            Alert.alert(
              'Fase anticipada',
              'En esta etapa solo pueden inscribirse Tíos, Hijos, Misioneros marcados como Jefes Jóvenes o Misioneros que ya misionaron antes en las MFS.'
            )
            return
          }
        }
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
            misiono_antes: rol === 'Misionero' ? !!misionoAntes : false,
            tratamiento_especial: !!tratamiento,
            tratamiento_detalle: tratamiento ? tratamientoDetalle.trim() : null,
            alimentacion_especial: !!alimento,
            alimentacion_detalle: alimento ? alimentoDetalle.trim() : null,
            padre_nombre: requierePadres ? padreNombre.trim() : null,
            padre_telefono: requierePadres ? normPhone(padreTelefono) : null,
            madre_nombre: requierePadres ? madreNombre.trim() : null,
            madre_telefono: requierePadres ? normPhone(madreTelefono) : null,
            ciudad: ciudad.trim() || null,
            talle_remera: talleRemera || null,
            pertenece_schoenstatt: !!perteneceSchoenstatt,
            rama_schoenstatt: perteneceSchoenstatt ? (ramaSchoenstatt || null) : null,
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
          .is('deleted_at', null)
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

        // Verificar duplicado por nombre+apellido+email (cubre tipeos de cédula)
        const emailCheck = (user?.email || normEmail(email)).toLowerCase()
        const { data: existePersona } = await supabase
          .from('registros')
          .select('id, ci, nombres, apellidos')
          .ilike('nombres', nombres.trim())
          .ilike('apellidos', apellidos.trim())
          .ilike('email', emailCheck)
          .is('deleted_at', null)
          .maybeSingle()

        if (existePersona) {
          setSaving(false)
          const msg = `⚠️ Inscripción duplicada\n\n${existePersona.nombres} ${existePersona.apellidos} ya está inscripto/a con este email (cédula ${existePersona.ci}).\n\nSi necesitás corregir datos, contactá con los organizadores.`
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(msg)
          } else {
            Alert.alert('Inscripción duplicada', msg)
          }
          return
        }

        const result = await registerIfCapacity({
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
          misiono_antes: rol === 'Misionero' ? !!misionoAntes : false,

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
          talle_remera: talleRemera || null,
          pertenece_schoenstatt: !!perteneceSchoenstatt,
          rama_schoenstatt: perteneceSchoenstatt ? (ramaSchoenstatt || null) : null,
          tipo_asesor: rol === 'Asesor' ? (tipoAsesor || null) : null,
          pueblos_acompana: rol === 'Asesor' ? pueblosAcompana : null,
        })
        
        // Actualizar el pueblo_id en el profile del usuario
        await supabase
          .from('profiles')
          .update({ pueblo_id: puebloId })
          .eq('id', user.id)

        // Copiar código al portapapeles
        try {
          await Clipboard.setStringAsync(String(result.id))
        } catch {}

        // Mostrar mensaje según el estado
        const titulo = result.estado === 'confirmado'
          ? '¡Inscripción confirmada!'
          : result.estado === 'pendiente_validacion'
          ? '🕓 Pendiente de validación'
          : '📋 Lista de espera'

        const mensaje = result.estado === 'confirmado'
          ? `🎉 ¡Bienvenido/a a esta hermosa locura de amor!\n\nAhora te llevamos a cargar tus documentos.`
          : result.estado === 'pendiente_validacion'
          ? `🙏 ¡Gracias por sumarte como Asesor espiritual!\n\nTu inscripción quedó pendiente de validación por un administrador. Te notificaremos cuando esté confirmada.\n\nMientras tanto podés cargar tus documentos.`
          : `${result.mensaje}\n\nEstás en lista de espera. Te notificaremos por email si un cupo se libera.\n\nAhora te llevamos a cargar tus documentos.`

        Alert.alert(
          titulo,
          mensaje,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push({ pathname: '/(tabs)/documentos', params: { code: result.id } })
              },
            },
          ],
          { onDismiss: () => {
            router.push({ pathname: '/(tabs)/documentos', params: { code: result.id } })
          }}
        )
        
        // Redirigir automáticamente después de 1 segundo como fallback
        setTimeout(() => {
          router.push({ pathname: '/(tabs)/documentos', params: { code: result.id } })
        }, 1000)
      }

      // Reset form solo si no estamos en modo edición
      if (!modoEdicion) {
        setErrs({})
        setPuebloId('')
        setNombres(''); setApellidos(''); setCi(''); setNacimiento('')
        setEmail(''); setTelefono(''); setDireccion(''); setCiudad('')
        setEmNombre(''); setEmTelefono('')
        setRol('Misionero'); setEsJefe(false); setMisionoAntes(null)
        setTratamiento(false); setTratamientoDetalle('')
        setAlimento(false); setAlimentoDetalle('')
        setPadreNombre(''); setPadreTelefono('')
        setMadreNombre(''); setMadreTelefono('')
        setAcepta(false); setTalleRemera('')
        setPerteneceSchoenstatt(null); setRamaSchoenstatt('')
        setTipoAsesor(''); setPueblosAcompana([])
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

  const añoActivo = configInsc?.año ?? new Date().getFullYear();
  const inscripcionesCerradas =
    estadoInsc === 'cerrado_antes' || estadoInsc === 'cerrado_despues' || estadoInsc === 'sin_config';
  const faseAnticipada = estadoInsc === 'fase_anticipada';

  // Pantalla de error de carga (red/Supabase) — diferente a "cerradas"
  if (!loadingEstado && errorEstado && !modoEdicion) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>📡</Text>
        <Text style={[s.title, { textAlign: 'center', marginBottom: 12 }]}>No pudimos cargar las inscripciones</Text>
        <Text style={[s.text, { textAlign: 'center', color: colors.text.secondary.light, marginBottom: 8 }]}>
          Parece un problema de conexión. Probá de nuevo en unos segundos.
        </Text>
        <Text style={[s.text, { textAlign: 'center', color: colors.text.tertiary.light, marginBottom: 24, fontSize: 12 }]}>
          {errorEstado}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="primary" onPress={() => setReintentoEstado((n) => n + 1)}>Reintentar</Button>
          <Button variant="secondary" onPress={() => router.push('/')}>Volver al inicio</Button>
        </View>
      </View>
    );
  }

  // Pantalla de cierre completo
  if (!loadingEstado && inscripcionesCerradas && !modoEdicion) {
    const titulo =
      estadoInsc === 'cerrado_despues'
        ? `Inscripciones ${añoActivo} cerradas`
        : estadoInsc === 'cerrado_antes'
        ? `Inscripciones ${añoActivo} aún no abiertas`
        : 'Inscripciones cerradas';
    const detalle =
      estadoInsc === 'cerrado_despues'
        ? `Las inscripciones para el año ${añoActivo} ya finalizaron.`
        : estadoInsc === 'cerrado_antes' && configInsc
        ? `Abren el ${new Date(configInsc.apertura_anticipada).toLocaleString('es-PY')}.`
        : 'Por el momento no hay inscripciones disponibles.';
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>🚫</Text>
        <Text style={[s.title, { textAlign: 'center', marginBottom: 12 }]}>{titulo}</Text>
        <Text style={[s.text, { textAlign: 'center', color: colors.text.secondary.light, marginBottom: 24 }]}>
          {detalle}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="secondary" onPress={() => setReintentoEstado((n) => n + 1)}>Reintentar</Button>
          <Button variant="secondary" onPress={() => router.push('/')}>Volver al inicio</Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>{modoEdicion ? 'Actualizar inscripción' : 'Inscripción'}</Text>

      <Card style={{ backgroundColor: '#10B981', borderLeftWidth: 4, borderLeftColor: '#059669', marginVertical: 8 }}>
        <Text style={[s.text, { fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }]}>
          📅 Inscripción para el año {añoActivo}
        </Text>
      </Card>

      {faseAnticipada && (
        <Card style={{ backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
          <Text style={[s.text, { fontWeight: '700', color: '#92400E' }]}>
            ⭐ Inscripción anticipada
          </Text>
          <Text style={[s.text, { color: '#92400E', marginTop: 4 }]}>
            En esta fase pueden inscribirse <Text style={{ fontWeight: '700' }}>Tíos</Text>,{' '}
            <Text style={{ fontWeight: '700' }}>Hijos</Text>,{' '}
            <Text style={{ fontWeight: '700' }}>Misioneros marcados como Jefes Jóvenes</Text> y{' '}
            <Text style={{ fontWeight: '700' }}>Misioneros que ya misionaron antes en las MFS</Text>.
            {configInsc && (
              <>
                {'\n'}La inscripción general abre el{' '}
                <Text style={{ fontWeight: '700' }}>
                  {new Date(configInsc.apertura_general).toLocaleString('es-PY')}
                </Text>
                .
              </>
            )}
          </Text>
        </Card>
      )}
      
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

      {/* Mis inscripciones (titular + hijos) */}
      {misRegistros.length > 0 && (
        <Card style={{ backgroundColor: '#ECFEFF', borderLeftWidth: 4, borderLeftColor: colors.primary[500] }}>
          <Text style={[s.text, { fontWeight: '700', marginBottom: 8 }]}>
            👨‍👩‍👧 Mis inscripciones {añoActivo}
          </Text>
          {misRegistros.map((r: any) => {
            const editando = registroExistente?.id === r.id
            return (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E0F2FE',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.text, { fontWeight: '600' }]}>
                    {r.rol === 'Hijo' ? '🧒' : r.rol === 'Tio' ? '🧑‍🏫' : '✝️'} {r.nombres} {r.apellidos}
                  </Text>
                  <Text style={[s.small, { color: colors.text.tertiary.light }]}>
                    {r.rol} · {r.estado === 'lista_espera' ? '📋 Lista de espera' : '✅ Confirmado'}
                  </Text>
                </View>
                <Pressable
                  disabled={editando}
                  onPress={() => cargarRegistroEnFormulario(r)}
                  style={[
                    s.button,
                    { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: editando ? colors.neutral[300] : colors.primary[500] },
                  ]}
                >
                  <Text style={[s.buttonText, { color: 'white', fontSize: 13 }]}>
                    {editando ? 'Editando' : 'Editar'}
                  </Text>
                </Pressable>
              </View>
            )
          })}
          {misRegistros.some((r: any) => r.rol === 'Tio') ? (
            <>
              <Pressable
                onPress={iniciarInscribirHijo}
                style={[
                  s.button,
                  { marginTop: 12, backgroundColor: '#10B981', paddingVertical: 10 },
                ]}
              >
                <Text style={[s.buttonText, { color: 'white' }]}>
                  ➕ Inscribir a un hijo/a
                </Text>
              </Pressable>
              <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 8 }]}>
                Los niños chicos sin email se inscriben bajo tu cuenta. Cada hijo necesita su propia cédula.
              </Text>
            </>
          ) : (
            <Text style={[s.small, { color: colors.text.tertiary.light, marginTop: 12, fontStyle: 'italic' }]}>
              ℹ️ Solo los Tíos pueden inscribir a sus hijos/as bajo su cuenta.
            </Text>
          )}
        </Card>
      )}

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
        {rol === 'Misionero' && computedAge !== null && computedAge > 25 && (
          <Text style={{ color: colors.error, marginTop: 4, fontSize: 12, fontWeight: '600' }}>
            💛 ¡Qué lindo que quieras seguir misionando! Lastimosamente ya pasó el límite de edad para ser Misionero en las Misiones Familiares.
          </Text>
        )}
        {rol === 'Hijo' && computedAge !== null && computedAge > 14 && (
          <Text style={{ color: colors.error, marginTop: 4, fontSize: 12, fontWeight: '600' }}>
            🌟 ¡Tu hijo/a ya es grande! Es momento de que viva la misión como Misionero propiamente dicho. ¡Animate a inscribirlo/a como Misionero! ✨
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
        <Label>Tipo de participante</Label>
        <SegRol />
        {rol === 'Hijo' && computedAge !== null && computedAge < 12 && (
          <View style={{
            marginTop: 8,
            padding: 10,
            backgroundColor: colors.primary[50],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.primary[200],
          }}>
            <Text style={{ color: colors.primary[700], fontSize: 13, fontWeight: '600' }}>
              🧒 Menor de 12 años: NO ocupa cupo de misionero, pero queda registrado como acompañante del pueblo.
            </Text>
          </View>
        )}
        <Text style={[s.small, { marginTop: 6, color: colors.text.tertiary.light }]}>
          <Text style={{ fontWeight: '700' }}>Hijo</Text>: va con sus padres, no requiere permiso del menor.
        </Text>
        <Text style={[s.small, { color: colors.text.tertiary.light }]}>
          <Text style={{ fontWeight: '700' }}>Tío</Text> y <Text style={{ fontWeight: '700' }}>Misionero mayor de edad</Text>: no se piden datos de Padres/Tutores.
        </Text>
        {rol === 'Misionero' && (
          <View style={{ marginTop: 8 }}>
            <Text style={s.label}>¿Es Jefe?</Text>
            <SegToggle value={esJefe} onChange={setEsJefe} labels={['No', 'Sí']} />

            <Text style={[s.label, { marginTop: 12 }]}>¿Ya misionaste antes en las MFS?</Text>
            <SegToggle
              value={misionoAntes}
              onChange={(v) => {
                setMisionoAntes(v)
                setErrs((e) => ({ ...e, misionoAntes: null }))
              }}
              labels={['No', 'Sí']}
              err={errs.misionoAntes}
            />
            {faseAnticipada && misionoAntes === true && !esJefe && (
              <Text style={[s.small, { color: '#059669', marginTop: 6, fontWeight: '600' }]}>
                ✨ Como ya misionaste antes, podés inscribirte en la fase anticipada.
              </Text>
            )}
          </View>
        )}
        {rol === 'Asesor' && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={s.label}>Tipo de Asesor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { v: 'padre_schoenstatt', l: 'Padre de Schoenstatt' },
                { v: 'diocesano', l: 'Diocesano' },
                { v: 'hermana_maria', l: 'Hermana de María' },
              ].map((o) => (
                <Pressable key={o.v}
                  onPress={() => { setTipoAsesor(o.v as any); setErrs((e) => ({ ...e, tipoAsesor: null })) }}
                  style={[s.button, { paddingVertical: 8, paddingHorizontal: 12,
                    backgroundColor: tipoAsesor === o.v ? colors.primary[500] : colors.neutral[300] }]}>
                  <Text style={[s.buttonText, { color: 'white', fontSize: 13 }]}>{o.l}</Text>
                </Pressable>
              ))}
            </View>
            {!!errs.tipoAsesor && <Text style={{ color: colors.error, fontSize: 12 }}>{errs.tipoAsesor}</Text>}

            <Text style={[s.label, { marginTop: 8 }]}>Pueblos que acompañás (referencial)</Text>
            <Text style={[s.small, { color: colors.text.tertiary.light }]}>Podés elegir varios. No ocupás cupo en ninguno.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {pueblos.map((p) => {
                const sel = pueblosAcompana.includes(p.id)
                return (
                  <Pressable key={p.id}
                    onPress={() => setPueblosAcompana((arr) => sel ? arr.filter(x => x !== p.id) : [...arr, p.id])}
                    style={[s.button, { paddingVertical: 6, paddingHorizontal: 10,
                      backgroundColor: sel ? colors.primary[500] : colors.neutral[300] }]}>
                    <Text style={[s.buttonText, { color: 'white', fontSize: 12 }]}>{sel ? '✓ ' : ''}{p.nombre}</Text>
                  </Pressable>
                )
              })}
            </View>

            <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FEF3C7', borderRadius: radius.md, borderWidth: 1, borderColor: '#F59E0B' }}>
              <Text style={{ color: '#78350F', fontSize: 12, fontWeight: '600' }}>
                🕓 Tu inscripción como Asesor quedará <Text style={{ fontWeight: '800' }}>pendiente</Text> hasta que un administrador la valide.
              </Text>
            </View>
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

      {/* Pertenencia al Movimiento de Schoenstatt */}
      <Card>
        <Label>¿Perteneces al Movimiento de Schoenstatt?</Label>
        <SegToggle
          value={perteneceSchoenstatt}
          onChange={(v) => {
            setPerteneceSchoenstatt(v)
            if (!v) setRamaSchoenstatt('')
            setErrs((e) => ({ ...e, perteneceSchoenstatt: null }))
          }}
          err={errs.perteneceSchoenstatt}
        />
        {perteneceSchoenstatt === true && (
          <View style={{ marginTop: 10 }}>
            <Label>¿Dónde?</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                'Pioneros',
                'Apóstoles de María',
                'Juventud Masculina',
                'Juventud Femenina',
                'Discernimiento',
                'Colaboradores',
                'Liga Apostólica',
                'Federación Apostólica',
                'Instituto Secular',
              ].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => {
                    setRamaSchoenstatt(r)
                    setErrs((e) => ({ ...e, ramaSchoenstatt: null }))
                  }}
                  style={[
                    s.button,
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: ramaSchoenstatt === r ? colors.primary[500] : colors.neutral[300],
                    },
                  ]}
                >
                  <Text style={[s.buttonText, { color: 'white', fontSize: 13 }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            {!!errs.ramaSchoenstatt && <Text style={{ color: colors.error, marginTop: 4, fontSize: 12 }}>{errs.ramaSchoenstatt}</Text>}
          </View>
        )}
      </Card>

      {/* Talle de remera */}
      <Card>
        <Label>Talle de remera</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(rol === 'Hijo'
            ? [
                { value: '2', label: 'Niño 2' },
                { value: '4', label: 'Niño 4' },
                { value: '6', label: 'Niño 6' },
                { value: '8', label: 'Niño 8' },
                { value: '10', label: 'Niño 10' },
                { value: '12', label: 'Niño 12' },
                { value: '14', label: 'Niño 14' },
              ]
            : [
                { value: 'XS', label: 'XS (PP)' },
                { value: 'S', label: 'S (P)' },
                { value: 'M', label: 'M (M)' },
                { value: 'L', label: 'L (G)' },
                { value: 'XL', label: 'XL (GG)' },
                { value: 'XXL', label: 'XXL (XGG / 2XL)' },
                { value: 'XXXL', label: 'XXXL (3XL)' },
              ]
          ).map((t) => (
            <Pressable
              key={t.value}
              onPress={() => {
                setTalleRemera(t.value)
                setErrs((e) => ({ ...e, talleRemera: null }))
              }}
              style={[
                s.button,
                {
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: talleRemera === t.value ? colors.primary[500] : colors.neutral[300],
                },
              ]}
            >
              <Text style={[s.buttonText, { color: 'white', fontSize: 13 }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        {!!errs.talleRemera && <Text style={{ color: colors.error, marginTop: 4, fontSize: 12 }}>{errs.talleRemera}</Text>}
      </Card>

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
