// FILE: app/(tabs)/inscribir.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { s } from '../../src/lib/theme';
import { fetchPueblos, registerIfCapacity, publicUrl } from '../../src/lib/api';

type Pueblo = { id: string; nombre: string; cupo_max: number; activo: boolean };
type Errs = Record<string, string | null>;

export default function Inscribir() {
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos base (obligatorios)
  const [puebloId, setPuebloId] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [ci, setCi] = useState('');
  const [nacimiento, setNacimiento] = useState(''); // DD-MM-AAAA (UI)
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [emNombre, setEmNombre] = useState('');
  const [emTelefono, setEmTelefono] = useState('');
  const [rol, setRol] = useState<'Tio' | 'Misionero'>('Misionero');
  const [esJefe, setEsJefe] = useState(false);

  // Nuevos (obligatorios)
  const [tratamiento, setTratamiento] = useState<boolean | null>(false);
  const [tratamientoDetalle, setTratamientoDetalle] = useState('');
  const [alimento, setAlimento] = useState<boolean | null>(false);
  const [alimentoDetalle, setAlimentoDetalle] = useState('');
  const [padreNombre, setPadreNombre] = useState('');
  const [padreTelefono, setPadreTelefono] = useState('');
  const [madreNombre, setMadreNombre] = useState('');
  const [madreTelefono, setMadreTelefono] = useState('');

  // Aceptación de términos (obligatorio)
  const [acepta, setAcepta] = useState(false);

  const [errs, setErrs] = useState<Errs>({});
  const scrollRef = useRef<ScrollView>(null);

  // URLs de plantillas (bucket público "plantillas")
  const URL_PERMISO = publicUrl('plantillas', 'permiso_menor.pdf');
  const URL_PROTOCOLO = publicUrl('plantillas', 'protocolo_prevencion.pdf');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPueblos();
        setPueblos(data.filter((p: any) => p.activo));
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- Helpers UI ----------
  function Label({ children }: { children: React.ReactNode }) {
    return (
      <Text style={s.label}>
        {children} <Text style={{ color: '#d94646' }}>*</Text>
      </Text>
    );
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
              { paddingVertical: 8, backgroundColor: value === false ? '#0a7ea4' : '#ccc' },
            ]}
          >
            <Text style={[s.buttonText, { color: 'white' }]}>{labels[0]}</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange(true)}
            style={[
              s.button,
              { paddingVertical: 8, backgroundColor: value === true ? '#0a7ea4' : '#ccc' },
            ]}
          >
            <Text style={[s.buttonText, { color: 'white' }]}>{labels[1]}</Text>
          </Pressable>
        </View>
        {!!err && <Text style={{ color: '#d94646', marginTop: 4, fontSize: 12 }}>{err}</Text>}
      </View>
    );
  }

  function SegRol() {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => { setRol('Misionero'); }}
          style={[s.button, { paddingVertical: 8, backgroundColor: rol === 'Misionero' ? '#0a7ea4' : '#ccc' }]}
        >
          <Text style={[s.buttonText, { color: 'white' }]}>Misionero</Text>
        </Pressable>
        <Pressable
          onPress={() => { setRol('Tio'); setEsJefe(false); }}
          style={[s.button, { paddingVertical: 8, backgroundColor: rol === 'Tio' ? '#0a7ea4' : '#ccc' }]}
        >
          <Text style={[s.buttonText, { color: 'white' }]}>Tío</Text>
        </Pressable>
      </View>
    );
  }

  async function openUrl(url?: string | null) {
    try {
      if (!url) return;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('No se pudo abrir', 'El dispositivo no reconoce la URL.');
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('No se pudo abrir', e?.message ?? String(e));
    }
  }

  // ---------- Fechas (DD-MM-AAAA en UI) ----------
  function isValidDateDDMMYYYY(s: string) {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(s)) return false;
    const [dd, mm, yyyy] = s.split('-').map((x) => parseInt(x, 10));
    // Mes válido 1..12 y día 1..31 aprox
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
    // Validación exacta con objeto Date
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    return d.getUTCFullYear() === yyyy && d.getUTCMonth() + 1 === mm && d.getUTCDate() === dd;
  }

  function toYYYYMMDD_fromDDMMYYYY(s: string): string | null {
    if (!isValidDateDDMMYYYY(s)) return null;
    const [dd, mm, yyyy] = s.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Mascara de entrada: convierte "31122008" -> "31-12-2008"
  function handleNacimientoChange(t: string) {
    const digits = t.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length >= 5) out = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    else if (digits.length >= 3) out = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    setNacimiento(out);
    if (out.length === 10) setErrs((e) => ({ ...e, nacimiento: null }));
  }

  // ---------- Validaciones ----------
  function validate(): boolean {
    const e: Errs = {};

    if (!puebloId) e.puebloId = 'Elegí un pueblo.';
    if (!nombres.trim()) e.nombres = 'Completá nombres.';
    if (!apellidos.trim()) e.apellidos = 'Completá apellidos.';
    if (!ci.trim()) e.ci = 'Completá la cédula.';
    if (!nacimiento.trim()) e.nacimiento = 'Completá fecha de nacimiento.';
    else if (!isValidDateDDMMYYYY(nacimiento.trim())) e.nacimiento = 'Usá formato DD-MM-AAAA.';
    if (!email.trim()) e.email = 'Completá email.';
    if (!telefono.trim()) e.telefono = 'Completá teléfono.';
    if (!direccion.trim()) e.direccion = 'Completá dirección.';
    if (!emNombre.trim()) e.emNombre = 'Completá nombre de emergencia.';
    if (!emTelefono.trim()) e.emTelefono = 'Completá teléfono de emergencia.';

    if (rol !== 'Misionero' && rol !== 'Tio') e.rol = 'Elegí un rol válido.';

    if (tratamiento !== true && tratamiento !== false) e.tratamiento = 'Elegí Sí o No.';
    if (alimento !== true && alimento !== false) e.alimento = 'Elegí Sí o No.';
    if (tratamiento === true && !tratamientoDetalle.trim()) e.tratamientoDetalle = 'Especificá el tratamiento/medicación.';
    if (alimento === true && !alimentoDetalle.trim()) e.alimentoDetalle = 'Especificá la alimentación especial.';

    if (!padreNombre.trim()) e.padreNombre = 'Completá nombre del padre.';
    if (!padreTelefono.trim()) e.padreTelefono = 'Completá teléfono del padre.';
    if (!madreNombre.trim()) e.madreNombre = 'Completá nombre de la madre.';
    if (!madreTelefono.trim()) e.madreTelefono = 'Completá teléfono de la madre.';

    if (!acepta) e.acepta = 'Debés aceptar los términos y protocolos para continuar.';

    setErrs(e);
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 50);
      return false;
    }
    return true;
  }

  async function onSubmit() {
    try {
      if (!validate()) {
        Alert.alert('Faltan datos', 'Revisá los campos marcados en rojo.');
        return;
      }
      // Convertimos la fecha de la UI (DD-MM-AAAA) al formato que espera el backend (YYYY-MM-DD)
      const nacimientoISO = toYYYYMMDD_fromDDMMYYYY(nacimiento.trim());
      if (!nacimientoISO) {
        setErrs((e) => ({ ...e, nacimiento: 'Usá formato DD-MM-AAAA.' }));
        Alert.alert('Fecha inválida', 'Verificá el formato de nacimiento.');
        return;
      }

      setSaving(true);

      const id = await registerIfCapacity({
        pueblo_id: puebloId,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        ci: ci.trim(),
        nacimiento: nacimientoISO, // <-- YYYY-MM-DD al RPC
        email: email.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        emergencia_nombre: emNombre.trim(),
        emergencia_telefono: emTelefono.trim(),
        rol,
        es_jefe: rol === 'Misionero' ? !!esJefe : false,

        tratamiento_especial: !!tratamiento,
        tratamiento_detalle: tratamiento ? tratamientoDetalle.trim() : null,
        alimentacion_especial: !!alimento,
        alimentacion_detalle: alimento ? alimentoDetalle.trim() : null,
        padre_nombre: padreNombre.trim(),
        padre_telefono: padreTelefono.trim(),
        madre_nombre: madreNombre.trim(),
        madre_telefono: madreTelefono.trim(),

        acepta_terminos: acepta,
      });

      Alert.alert(
        '¡Inscripto!',
        `Código de inscripción:\n${id}\n\nGuardá este código para cargar documentos.`,
      );

      // Reset
      setSaving(false);
      setErrs({});
      setPuebloId('');
      setNombres(''); setApellidos(''); setCi(''); setNacimiento('');
      setEmail(''); setTelefono(''); setDireccion('');
      setEmNombre(''); setEmTelefono('');
      setRol('Misionero'); setEsJefe(false);
      setTratamiento(false); setTratamientoDetalle('');
      setAlimento(false); setAlimentoDetalle('');
      setPadreNombre(''); setPadreTelefono('');
      setMadreNombre(''); setMadreTelefono('');
      setAcepta(false);
    } catch (e: any) {
      setSaving(false);
      Alert.alert('No se pudo inscribir', e?.message ?? String(e));
    }
  }

  return (
    <ScrollView ref={scrollRef} style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Inscripción</Text>

      {/* Pueblo */}
      <View style={s.card}>
        <Label>Pueblo</Label>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pueblos.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => { setPuebloId(p.id); setErrs((prev) => ({ ...prev, puebloId: null })); }}
                  style={[
                    s.button,
                    { paddingVertical: 8, backgroundColor: puebloId === p.id ? '#0a7ea4' : '#ccc' },
                  ]}
                >
                  <Text style={[s.buttonText, { color: 'white' }]}>{p.nombre}</Text>
                </Pressable>
              ))}
            </View>
            {!!errs.puebloId && <Text style={{ color: '#d94646', marginTop: 4, fontSize: 12 }}>{errs.puebloId}</Text>}
          </>
        )}
      </View>

      {/* Datos personales */}
      <View style={s.card}>
        <Label>Nombres</Label>
        <TextInput
          style={[s.input, errs.nombres && { borderColor: '#d94646', borderWidth: 1 }]}
          value={nombres}
          onChangeText={(t) => { setNombres(t); if (t) setErrs((e) => ({ ...e, nombres: null })); }}
        />

        <Label>Apellidos</Label>
        <TextInput
          style={[s.input, errs.apellidos && { borderColor: '#d94646', borderWidth: 1 }]}
          value={apellidos}
          onChangeText={(t) => { setApellidos(t); if (t) setErrs((e) => ({ ...e, apellidos: null })); }}
        />

        <Label>Cédula</Label>
        <TextInput
          style={[s.input, errs.ci && { borderColor: '#d94646', borderWidth: 1 }]}
          value={ci}
          onChangeText={(t) => { setCi(t); if (t) setErrs((e) => ({ ...e, ci: null })); }}
          keyboardType="number-pad"
        />

        <Label>Fecha de nacimiento (DD-MM-AAAA)</Label>
        <TextInput
          style={[s.input, errs.nacimiento && { borderColor: '#d94646', borderWidth: 1 }]}
          value={nacimiento}
          onChangeText={handleNacimientoChange}
          placeholder="15-08-2005"
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={10}
        />
        {!!errs.nacimiento && <Text style={{ color: '#d94646', marginTop: 4, fontSize: 12 }}>{errs.nacimiento}</Text>}

        <Label>Email</Label>
        <TextInput
          style={[s.input, errs.email && { borderColor: '#d94646', borderWidth: 1 }]}
          value={email}
          onChangeText={(t) => { setEmail(t); if (t) setErrs((e) => ({ ...e, email: null })); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Label>Teléfono</Label>
        <TextInput
          style={[s.input, errs.telefono && { borderColor: '#d94646', borderWidth: 1 }]}
          value={telefono}
          onChangeText={(t) => { setTelefono(t); if (t) setErrs((e) => ({ ...e, telefono: null })); }}
          keyboardType="phone-pad"
        />

        <Label>Dirección</Label>
        <TextInput
          style={[s.input, errs.direccion && { borderColor: '#d94646', borderWidth: 1 }]}
          value={direccion}
          onChangeText={(t) => { setDireccion(t); if (t) setErrs((e) => ({ ...e, direccion: null })); }}
        />
      </View>

      {/* Contacto de emergencia */}
      <View style={s.card}>
        <Text style={s.text}>(Emergencia)</Text>
        <Label>Nombre</Label>
        <TextInput
          style={[s.input, errs.emNombre && { borderColor: '#d94646', borderWidth: 1 }]}
          value={emNombre}
          onChangeText={(t) => { setEmNombre(t); if (t) setErrs((e) => ({ ...e, emNombre: null })); }}
        />
        <Label>Teléfono</Label>
        <TextInput
          style={[s.input, errs.emTelefono && { borderColor: '#d94646', borderWidth: 1 }]}
          value={emTelefono}
          onChangeText={(t) => { setEmTelefono(t); if (t) setErrs((e) => ({ ...e, emTelefono: null })); }}
          keyboardType="phone-pad"
        />
      </View>

      {/* Rol */}
      <View style={s.card}>
        <Label>Tipo de misionero</Label>
        <SegRol />
        {rol === 'Misionero' && (
          <View style={{ marginTop: 8 }}>
            <Text style={s.label}>¿Es Jefe?</Text>
            <SegToggle value={esJefe} onChange={setEsJefe} labels={['No', 'Sí']} />
          </View>
        )}
      </View>

      {/* Tratamiento / Medicación */}
      <View style={s.card}>
        <Label>¿Tratamiento o medicación especial?</Label>
        <SegToggle value={tratamiento} onChange={(v) => { setTratamiento(v); setErrs((e) => ({ ...e, tratamiento: null })); }} err={errs.tratamiento} />
        {tratamiento === true && (
          <>
            <Label>Especificar</Label>
            <TextInput
              style={[s.input, errs.tratamientoDetalle && { borderColor: '#d94646', borderWidth: 1, minHeight: 80 }]}
              value={tratamientoDetalle}
              onChangeText={(t) => { setTratamientoDetalle(t); if (t) setErrs((e) => ({ ...e, tratamientoDetalle: null })); }}
              multiline
              placeholder="Detalle del tratamiento/medicación…"
            />
          </>
        )}
      </View>

      {/* Alimentación */}
      <View style={s.card}>
        <Label>¿Alimentación especial?</Label>
        <SegToggle value={alimento} onChange={(v) => { setAlimento(v); setErrs((e) => ({ ...e, alimento: null })); }} err={errs.alimento} />
        {alimento === true && (
          <>
            <Label>Especificar</Label>
            <TextInput
              style={[s.input, errs.alimentoDetalle && { borderColor: '#d94646', borderWidth: 1, minHeight: 80 }]}
              value={alimentoDetalle}
              onChangeText={(t) => { setAlimentoDetalle(t); if (t) setErrs((e) => ({ ...e, alimentoDetalle: null })); }}
              multiline
              placeholder="Detalle de la alimentación (ej: celíaco, sin lactosa)…"
            />
          </>
        )}
      </View>

      {/* Padres */}
      <View style={s.card}>
        <Text style={s.text}>Padres / Tutores</Text>

        <Label>Nombre del Padre</Label>
        <TextInput
          style={[s.input, errs.padreNombre && { borderColor: '#d94646', borderWidth: 1 }]}
          value={padreNombre}
          onChangeText={(t) => { setPadreNombre(t); if (t) setErrs((e) => ({ ...e, padreNombre: null })); }}
        />

        <Label>Teléfono del Padre</Label>
        <TextInput
          style={[s.input, errs.padreTelefono && { borderColor: '#d94646', borderWidth: 1 }]}
          value={padreTelefono}
          onChangeText={(t) => { setPadreTelefono(t); if (t) setErrs((e) => ({ ...e, padreTelefono: null })); }}
          keyboardType="phone-pad"
        />

        <Label>Nombre de la Madre</Label>
        <TextInput
          style={[s.input, errs.madreNombre && { borderColor: '#d94646', borderWidth: 1 }]}
          value={madreNombre}
          onChangeText={(t) => { setMadreNombre(t); if (t) setErrs((e) => ({ ...e, madreNombre: null })); }}
        />

        <Label>Teléfono de la Madre</Label>
        <TextInput
          style={[s.input, errs.madreTelefono && { borderColor: '#d94646', borderWidth: 1 }]}
          value={madreTelefono}
          onChangeText={(t) => { setMadreTelefono(t); if (t) setErrs((e) => ({ ...e, madreTelefono: null })); }}
          keyboardType="phone-pad"
        />
      </View>

      {/* Aceptación de términos y plantillas */}
      <View style={s.card}>
        <Label>Aceptación</Label>
        <Pressable
          onPress={() => { setAcepta((v) => !v); if (!acepta) setErrs((e) => ({ ...e, acepta: null })); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 22, height: 22, borderRadius: 4, borderWidth: 2,
              borderColor: errs.acepta ? '#d94646' : (acepta ? '#0a7ea4' : '#999'),
              backgroundColor: acepta ? '#0a7ea4' : 'transparent',
            }}
          />
          <Text style={s.text}>
            Acepto el{' '}
            <Text style={{ color: '#0a7ea4', textDecorationLine: 'underline' }} onPress={() => openUrl(URL_PROTOCOLO)}>
              Protocolo de Prevención
            </Text>{' '}
            y el{' '}
            <Text style={{ color: '#0a7ea4', textDecorationLine: 'underline' }} onPress={() => openUrl(URL_PERMISO)}>
              Permiso del Menor
            </Text>{' '}
            (si corresponde).
          </Text>
        </Pressable>
        {!!errs.acepta && <Text style={{ color: '#d94646', marginTop: 4, fontSize: 12 }}>{errs.acepta}</Text>}
      </View>

      <Pressable
        style={[s.button, { marginTop: 12, paddingVertical: 12, opacity: saving ? 0.7 : 1 }]}
        onPress={onSubmit}
        disabled={saving}
      >
        <Text style={s.buttonText}>{saving ? 'Inscribiendo…' : 'Confirmar inscripción'}</Text>
      </Pressable>
    </ScrollView>
  );
}
