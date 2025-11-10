// FILE: app/(tabs)/documentos.tsx — Plantillas + Subida (foto) + Firma + PDF + Thumbnails + Delete — COMPATIBLE WEB/NATIVO (sin expo-print directo)

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { s } from '../../src/lib/theme';
import * as ImagePicker from 'expo-image-picker';
import SignaturePad, { SignaturePadHandle } from '../../src/components/SignaturePad';
import { generarAutorizacionPDF, type Datos } from '../../src/lib/pdf';
import { uploadToStorage, updateDocumento, publicUrl } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { shareOrDownload } from '../../src/lib/sharing';
import { useAuth } from '../../src/context/AuthProvider';
import { useUserRoles } from '../../src/hooks/useUserRoles';

export default function Documentos() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { isSuperAdmin, isPuebloAdmin, puebloId, loading: rolesLoading } = useUserRoles();
  
  const [mode, setMode] = useState<'code' | 'ci'>('code');

  // Búsqueda por CÓDIGO (UUID)
  const [code, setCode] = useState('');

  // Búsqueda por CÉDULA + EMAIL
  const [ci, setCi] = useState('');
  const [email, setEmail] = useState('');

  const [record, setRecord] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Firma
  const [savingSign, setSavingSign] = useState(false);
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);

  // ========= PLANTILLAS (URLs firmadas) =========
  const [URL_PERMISO, setUrlPermiso] = useState<string>('');
  const [URL_PROTOCOLO, setUrlProtocolo] = useState<string>('');
  const [URL_ACEPTACION, setUrlAceptacion] = useState<string>('');
  const [URL_ESTATUTOS, setUrlEstatutos] = useState<string>('');

  // URLs firmadas de los documentos del registro actual
  const [signedUrls, setSignedUrls] = useState<{
    autorizacion?: string;
    ficha?: string;
    firma?: string;
    cedula_frente?: string;
    cedula_dorso?: string;
  }>({});

  // Cargar URLs de plantillas al montar
  useEffect(() => {
    (async () => {
      setUrlPermiso(await publicUrl('plantillas', 'permiso_menor.pdf'));
      setUrlProtocolo(await publicUrl('plantillas', 'protocolo_prevencion.pdf'));
      setUrlAceptacion(await publicUrl('plantillas', 'aceptacion_protocolo_prevencion.pdf'));
      setUrlEstatutos(await publicUrl('plantillas', 'estatutos_mfs.pdf'));
    })();
  }, []);

  // Generar signed URLs cuando cambia el registro
  useEffect(() => {
    if (!record) {
      setSignedUrls({});
      return;
    }

    (async () => {
      const urls: typeof signedUrls = {};
      
      if (record.autorizacion_url) {
        const path = storagePathFromPublicUrl(record.autorizacion_url);
        if (path) urls.autorizacion = await publicUrl('documentos', path);
      }
      
      if (record.ficha_medica_url) {
        const path = storagePathFromPublicUrl(record.ficha_medica_url);
        if (path) urls.ficha = await publicUrl('documentos', path);
      }
      
      if (record.firma_url) {
        const path = storagePathFromPublicUrl(record.firma_url);
        if (path) urls.firma = await publicUrl('documentos', path);
      }
      
      if (record.cedula_frente_url) {
        const path = storagePathFromPublicUrl(record.cedula_frente_url);
        if (path) urls.cedula_frente = await publicUrl('documentos', path);
      }
      
      if (record.cedula_dorso_url) {
        const path = storagePathFromPublicUrl(record.cedula_dorso_url);
        if (path) urls.cedula_dorso = await publicUrl('documentos', path);
      }
      
      setSignedUrls(urls);
    })();
  }, [record]);

  // Auto-cargar registro del usuario actual si no es admin
  useEffect(() => {
    if (rolesLoading) return;

    const codeParam = Array.isArray(params.code) ? params.code[0] : params.code;
    
    // Si no es admin, cargar automáticamente su propio registro
    if (!isSuperAdmin && !isPuebloAdmin && user) {
      (async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('registros')
            .select(
              'id,nombres,apellidos,pueblo_id,nacimiento,autorizacion_url,ficha_medica_url,firma_url,ci,email,cedula_frente_url,cedula_dorso_url'
            )
            .eq('email', user.email)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            setResults([]);
            setRecord(data);
          } else {
            Alert.alert('Sin registro', 'No encontramos tu inscripción. Contactá al administrador.');
          }
        } catch (e: any) {
          Alert.alert('Error', e.message || String(e));
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    // Si es admin y viene código por parámetro, buscar ese registro
    if (codeParam && typeof codeParam === 'string' && (isSuperAdmin || isPuebloAdmin)) {
      setCode(codeParam);
      setMode('code');
      // Buscar automáticamente
      (async () => {
        try {
          setLoading(true);
          let query = supabase
            .from('registros')
            .select(
              'id,nombres,apellidos,pueblo_id,nacimiento,autorizacion_url,ficha_medica_url,firma_url,ci,email,cedula_frente_url,cedula_dorso_url'
            )
            .eq('id', codeParam.trim());

          // Si es pueblo_admin, solo puede ver su pueblo
          if (isPuebloAdmin && !isSuperAdmin && puebloId) {
            query = query.eq('pueblo_id', puebloId);
          }

          const { data, error } = await query.maybeSingle();
          if (error) throw error;
          if (data) {
            setResults([]);
            setRecord(data);
          } else if (isPuebloAdmin && !isSuperAdmin) {
            Alert.alert('Sin acceso', 'Solo podés ver inscriptos de tu pueblo.');
          }
        } catch (e: any) {
          Alert.alert('Error', e.message || String(e));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [params.code, rolesLoading, isSuperAdmin, isPuebloAdmin, puebloId, user]);

  // === Helpers ===
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
  // Cache busting timestamp fijo para evitar hydration mismatch
  const [cacheBuster] = useState(() => Date.now());
  function bust(url?: string | null) {
    if (!url) return url as any;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}cb=${cacheBuster}`;
  }
  function isImageUrl(url?: string | null) {
    if (!url) return false;
    const u = url.toLowerCase().split('?')[0];
    return (
      u.endsWith('.jpg') ||
      u.endsWith('.jpeg') ||
      u.endsWith('.png') ||
      u.endsWith('.webp') ||
      u.endsWith('.heic') ||
      u.endsWith('.heif')
    );
  }
  function storagePathFromPublicUrl(url: string): string | null {
    // Soporta tanto URLs públicas como signed URLs
    const publicMarker = '/storage/v1/object/public/documentos/';
    const signedMarker = '/storage/v1/object/sign/documentos/';
    
    let idx = url.indexOf(publicMarker);
    if (idx !== -1) {
      return url.slice(idx + publicMarker.length).split('?')[0];
    }
    
    idx = url.indexOf(signedMarker);
    if (idx !== -1) {
      return url.slice(idx + signedMarker.length).split('?')[0].split('/').slice(1).join('/');
    }
    
    // Intenta extraer el path después de /documentos/
    const docsIdx = url.indexOf('/documentos/');
    if (docsIdx !== -1) {
      return url.slice(docsIdx + 12).split('?')[0];
    }
    
    return null;
  }

  // === Edad ===
  function parseNacimiento(n?: string | null): Date | null {
    if (!n) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(n)) {
      const [Y, M, D] = n.split('-').map((x) => parseInt(x, 10));
      return new Date(Date.UTC(Y, M - 1, D));
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(n)) {
      const [D, M, Y] = n.split('-').map((x) => parseInt(x, 10));
      return new Date(Date.UTC(Y, M - 1, D));
    }
    return null;
  }
  function calcAge(d: Date): number {
    const t = new Date();
    let a = t.getUTCFullYear() - d.getUTCFullYear();
    const m = t.getUTCMonth() - d.getUTCMonth();
    if (m < 0 || (m === 0 && t.getUTCDate() < d.getUTCDate())) a--;
    return a;
  }
  const nacimientoDate = record ? parseNacimiento(record.nacimiento) : null;
  const edad = nacimientoDate ? calcAge(nacimientoDate) : null;
  const docMode: 'menor' | 'mayor' | 'desconocido' =
    edad == null ? 'desconocido' : edad < 18 ? 'menor' : 'mayor';

  // === BUSCAR POR CÓDIGO ===
  async function buscarPorCodigo() {
    try {
      if (!code) return Alert.alert('Ingresá el código de inscripción (UUID).');
      setLoading(true);
      let query = supabase
        .from('registros')
        .select(
          'id,nombres,apellidos,pueblo_id,nacimiento,autorizacion_url,ficha_medica_url,firma_url,ci,email,cedula_frente_url,cedula_dorso_url'
        )
        .eq('id', code.trim());

      // Si es pueblo_admin (no super admin), solo puede ver su pueblo
      if (isPuebloAdmin && !isSuperAdmin && puebloId) {
        query = query.eq('pueblo_id', puebloId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) {
        if (isPuebloAdmin && !isSuperAdmin) {
          return Alert.alert('No encontrado', 'Revisá el código o verificá que sea de tu pueblo.');
        }
        return Alert.alert('No encontrado', 'Revisá el código.');
      }
      setResults([]);
      setRecord(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // === BUSCAR POR CÉDULA (+ EMAIL recomendado) ===
  async function buscarPorCedula() {
    try {
      const ciSan = ci.trim();
      const emailSan = email.trim();
      if (!ciSan) return Alert.alert('Ingresá la cédula.');
      setLoading(true);
      let q = supabase
        .from('registros')
        .select(
          'id,nombres,apellidos,pueblo_id,nacimiento,autorizacion_url,ficha_medica_url,firma_url,ci,email,created_at,cedula_frente_url,cedula_dorso_url'
        )
        .eq('ci', ciSan)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Si es pueblo_admin (no super admin), filtrar por su pueblo
      if (isPuebloAdmin && !isSuperAdmin && puebloId) {
        q = q.eq('pueblo_id', puebloId);
      }
      
      if (emailSan) q = q.ilike('email', `%${emailSan}%`);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) {
        if (isPuebloAdmin && !isSuperAdmin) {
          return Alert.alert('Sin resultados', 'Verificá cédula y email, y que sea de tu pueblo.');
        }
        return Alert.alert('Sin resultados', 'Verificá cédula y email.');
      }
      if (data.length === 1) {
        setRecord(data[0]);
        setResults([]);
      } else {
        setResults(data);
        setRecord(null);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // === Subir IMAGEN (único método para todo) ===
  async function pickImage(
    kind: 'autorizacion' | 'ficha' | 'cedula_frente' | 'cedula_dorso'
  ) {
    try {
      if (!record) {
        Alert.alert('Seleccioná un inscripto', 'Buscá por código o cédula y elegí uno primero.');
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tus fotos para elegir la imagen. Abrí Configuración y otorgá el permiso a Expo Go.'
        );
        return;
      }

      let res: ImagePicker.ImagePickerResult | undefined;
      try {
        const mediaType =
          (ImagePicker as any).MediaType?.Images ??
          (ImagePicker as any).MediaTypeOptions?.Images;
        if (mediaType) {
          res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: mediaType,
            quality: 0.9,
            allowsMultipleSelection: false,
          });
        }
      } catch {}
      if (!res) {
        res = await ImagePicker.launchImageLibraryAsync({
          quality: 0.9,
          allowsMultipleSelection: false,
        });
      }
      if (res.canceled) return;

      const asset = (res as any).assets?.[0];
      if (!asset?.uri) {
        Alert.alert('No se pudo leer la imagen seleccionada');
        return;
      }

      const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
      const path = `registros/${record.id}/${kind}.${ext}`;
      const url = await uploadToStorage('documentos', path, asset.uri);
      if (!url) {
        Alert.alert('No se pudo subir la imagen');
        return;
      }

      if (kind === 'autorizacion') {
        await updateDocumento(record.id, { autorizacion_url: url });
        setRecord({ ...record, autorizacion_url: url });
      } else if (kind === 'ficha') {
        await updateDocumento(record.id, { ficha_medica_url: url });
        setRecord({ ...record, ficha_medica_url: url });
      } else if (kind === 'cedula_frente') {
        await updateDocumento(record.id, { cedula_frente_url: url });
        setRecord({ ...record, cedula_frente_url: url });
      } else {
        await updateDocumento(record.id, { cedula_dorso_url: url });
        setRecord({ ...record, cedula_dorso_url: url });
      }

      Alert.alert('Listo', 'Documento subido');
    } catch (e: any) {
      Alert.alert('Error al abrir/subir imagen', e?.message ?? String(e));
    }
  }

  // === Eliminar archivo subido ===
  async function deleteUploaded(
    kind: 'autorizacion' | 'ficha' | 'cedula_frente' | 'cedula_dorso' | 'firma'
  ) {
    try {
      if (!record) return;
      const fieldMap: Record<string, keyof typeof record> = {
        autorizacion: 'autorizacion_url',
        ficha: 'ficha_medica_url',
        cedula_frente: 'cedula_frente_url',
        cedula_dorso: 'cedula_dorso_url',
        firma: 'firma_url',
      };
      const field = fieldMap[kind];
      const url: string | null | undefined = record[field];
      if (!url) return;

      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Eliminar archivo',
          '¿Querés eliminar el archivo subido?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });
      if (!ok) return;

      const path = storagePathFromPublicUrl(url);
      if (path) {
        const { error: delErr } = await supabase.storage.from('documentos').remove([path]);
        if (delErr) {
          console.warn('Storage remove error:', delErr.message);
          Alert.alert(
            'Aviso',
            'No se pudo borrar del almacenamiento (puede requerir permisos de admin). Se quitará la referencia del registro.'
          );
        }
      }

      await updateDocumento(record.id, { [field]: null } as any);
      setRecord({ ...record, [field]: null });

      Alert.alert('Listo', 'Archivo eliminado.');
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? String(e));
    }
  }

  // === Guardar firma (usando SignaturePad multiplataforma) ===
  async function capturarYSubirFirma() {
    try {
      if (!record) {
        Alert.alert('Seleccioná un inscripto', 'Buscá por código o cédula y elegí uno primero.');
        return;
      }
      setSavingSign(true);
      const dataUrl = await padRef.current?.getDataURL();
      if (!dataUrl) {
        Alert.alert('Sin trazos', 'Dibujá tu firma antes de guardar.');
        return;
      }
      setFirmaPreview(dataUrl);
      const path = `registros/${record.id}/firma.png`;
      const url = await uploadToStorage('documentos', path, dataUrl);
      if (!url) throw new Error('No se pudo subir la firma');
      await updateDocumento(record.id, { firma_url: url });
      setRecord({ ...record, firma_url: url });
      Alert.alert('Firma guardada', 'Se subió la firma correctamente.');
    } catch (e: any) {
      Alert.alert('Error al subir la firma', e?.message ?? String(e));
    } finally {
      setSavingSign(false);
    }
  }

  // === Generar PDF con la firma y datos (helper multiplataforma) ===
  async function generarPDFConsentimiento() {
    try {
      if (!record) return Alert.alert('Seleccioná un inscripto primero');

      // necesitamos una imagen de firma: priorizamos la recién capturada; si no, usamos la guardada
      let firmaDataUrl: string | null = firmaPreview;
      if (!firmaDataUrl && record.firma_url) {
        // si hay una URL pública, la convertimos a dataURL para el PDF
        const resp = await fetch(record.firma_url);
        const blob = await resp.blob();
        firmaDataUrl = await blobToDataURL(blob);
      }
      if (!firmaDataUrl) {
        Alert.alert('Falta la firma', 'Capturá la firma antes de generar el PDF.');
        return;
      }

      // TODO: cargar los datos reales (si tenés más campos en tu tabla)
      const d: Datos = {
        nombres: record.nombres || '',
        apellidos: record.apellidos || '',
        ci: record.ci || '',
        nacimiento: record.nacimiento || '',
        email: record.email || '',
        telefono: '', // si lo tenés en la tabla, pásalo aquí
        direccion: '',
        puebloNombre: record.pueblo_id || '',
        rol: 'Participante',
        esJefe: false,
      };

      const uriOrUrl = await generarAutorizacionPDF(d, firmaDataUrl);

      // Subimos el PDF al storage (web: blob: URL; nativo: file:// URI)
      const storagePath = `registros/${record.id}/consentimiento.pdf`;
      const publicURL = await uploadToStorage('documentos', storagePath, uriOrUrl);
      if (!publicURL) throw new Error('No se pudo subir el PDF');

      // Actualizá tu registro si corresponde (descomentar si lo usás)
      // await updateDocumento(record.id, { autorizacion_url: publicURL });

      // Abrir y/o descargar
      if (Platform.OS === 'web') {
        await shareOrDownload(publicURL, `consentimiento_${record.id}.pdf`);
      } else {
        await openUrl(publicURL);
      }

      Alert.alert('PDF generado', 'Se subió el consentimiento.');
    } catch (e: any) {
      Alert.alert('No se pudo generar el PDF', e?.message ?? String(e));
    }
  }

  async function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }

  const badge = (txt: string) => (
    <Text
      style={{
        marginLeft: 8,
        fontSize: 12,
        color: 'white',
        backgroundColor: '#d97706',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {txt}
    </Text>
  );

  // ======== UI ========
  if (rolesLoading) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6, color: '#666' }]}>Verificando permisos…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32 }}
      style={s.screen}
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      <Text style={s.title}>
        {isSuperAdmin ? 'Documentos (Admin)' : isPuebloAdmin ? 'Documentos (Admin de Pueblo)' : 'Mis documentos'}
      </Text>

      {/* Banner edad */}
      {record && (
        <View style={[s.card, { marginBottom: 12, backgroundColor: '#f3f4f6' }]}>
          <Text style={s.text}>
            {edad == null
              ? 'No hay fecha de nacimiento: podés cargar cualquiera de los documentos.'
              : edad < 18
              ? `Edad: ${edad} años — Requerido: Permiso del Menor.`
              : `Edad: ${edad} años — Requerido: Aceptación del Protocolo.`}
          </Text>
        </View>
      )}

      {/* === PLANTILLAS === */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.text}>Plantillas para leer y firmar</Text>

        <Pressable
          style={[s.button, { marginTop: 8, paddingVertical: 10 }]}
          onPress={() => openUrl(bust(URL_ESTATUTOS))}
        >
          <Text style={s.buttonText}>Estatutos de las MFS (PDF)</Text>
        </Pressable>

        <Pressable
          style={[s.button, { marginTop: 8, paddingVertical: 10 }]}
          onPress={() => openUrl(bust(URL_PERMISO))}
        >
          <Text style={s.buttonText}>Permiso del Menor (PDF)</Text>
        </Pressable>

        <Pressable
          style={[s.button, { marginTop: 8, paddingVertical: 10 }]}
          onPress={() => openUrl(bust(URL_PROTOCOLO))}
        >
          <Text style={s.buttonText}>Protocolo de Prevención (PDF)</Text>
        </Pressable>

        <Pressable
          style={[s.button, { marginTop: 8, paddingVertical: 10 }]}
          onPress={() => openUrl(bust(URL_ACEPTACION))}
        >
          <Text style={s.buttonText}>Aceptación Protocolo Prevención (PDF)</Text>
        </Pressable>
      </View>

      {/* Selector de modo de búsqueda - solo para admins */}
      {(isSuperAdmin || isPuebloAdmin) && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Pressable
            style={[s.button, { paddingVertical: 8, opacity: mode === 'code' ? 1 : 0.6 }]}
            onPress={() => setMode('code')}
          >
            <Text style={s.buttonText}>Por código</Text>
          </Pressable>
          <Pressable
            style={[s.button, { paddingVertical: 8, opacity: mode === 'ci' ? 1 : 0.6 }]}
            onPress={() => setMode('ci')}
          >
            <Text style={s.buttonText}>Por cédula</Text>
          </Pressable>
        </View>
      )}

      {/* Búsqueda por CÓDIGO - solo para admins */}
      {(isSuperAdmin || isPuebloAdmin) && mode === 'code' && (
        <View style={s.card}>
          <Text style={s.text}>
            Ingresá el <Text style={{ fontWeight: '700' }}>Código de inscripción</Text> (UUID) para
            subir documentos.
          </Text>
          <Text style={s.label}>Código</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            style={s.input}
            autoCapitalize="none"
            placeholder="13ecaec8-0bbc-4613-8436-e22047214cde"
          />
          <Pressable
            style={[s.button, { marginTop: 8 }]}
            onPress={buscarPorCodigo}
            disabled={loading}
          >
            <Text style={s.buttonText}>{loading ? 'Buscando…' : 'Buscar'}</Text>
          </Pressable>
        </View>
      )}

      {/* Búsqueda por CÉDULA - solo para admins */}
      {(isSuperAdmin || isPuebloAdmin) && mode === 'ci' && (
        <View style={s.card}>
          <Text style={s.text}>
            Buscá al inscripto por <Text style={{ fontWeight: '700' }}>Cédula</Text> y (recomendado){' '}
            <Text style={{ fontWeight: '700' }}>Email</Text>.
          </Text>
          <Text style={s.label}>Cédula</Text>
          <TextInput
            value={ci}
            onChangeText={setCi}
            style={s.input}
            autoCapitalize="none"
            keyboardType="number-pad"
            placeholder="1234567"
          />
          <Text style={s.label}>Email (opcional, ayuda a filtrar)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="persona@ejemplo.com"
          />
          <Pressable
            style={[s.button, { marginTop: 8 }]}
            onPress={buscarPorCedula}
            disabled={loading}
          >
            <Text style={s.buttonText}>{loading ? 'Buscando…' : 'Buscar'}</Text>
          </Pressable>
        </View>
      )}

      {/* Resultados por cédula (si hay más de uno) */}
      {results.length > 0 && (
        <View style={s.card}>
          <Text style={s.text}>Elegí inscripto</Text>
          {results.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => {
                setRecord(r);
                setResults([]);
              }}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
            >
              <Text style={s.small}>
                {r.nombres} {r.apellidos}
              </Text>
              <Text style={s.small}>
                CI: {r.ci} · Email: {r.email}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {record && (
        <View style={s.card}>
          <Text style={s.text}>Inscripto</Text>
          <Text style={s.small}>
            {record.nombres} {record.apellidos}
          </Text>

          {/* Permiso del Menor (requerido si menor) */}
          {((docMode !== 'mayor') || !!record.ficha_medica_url) && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.label}>Permiso del Menor firmado</Text>
                {docMode === 'menor' && badge('Requerido')}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[s.button, { paddingVertical: 8 }]}
                  onPress={() => pickImage('ficha')}
                >
                  <Text style={s.buttonText}>Subir foto</Text>
                </Pressable>
              </View>
              {!!record.ficha_medica_url && (
                <View style={{ marginTop: 6 }}>
                  <Text style={s.small}>Cargada</Text>
                  {isImageUrl(record.ficha_medica_url) && signedUrls.ficha && (
                    <Image
                      source={{ uri: bust(signedUrls.ficha) }}
                      style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Pressable
                      style={[s.button, { paddingVertical: 8 }]}
                      onPress={() => openUrl(signedUrls.ficha || record.ficha_medica_url)}
                    >
                      <Text style={s.buttonText}>Ver archivo</Text>
                    </Pressable>
                    <Pressable
                      style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                      onPress={() => deleteUploaded('ficha')}
                    >
                      <Text style={s.buttonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Aceptación de Protocolo (requerido si mayor) */}
          {((docMode !== 'menor') || !!record.autorizacion_url) && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.label}>Aceptación de Protocolo firmada</Text>
                {docMode === 'mayor' && badge('Requerido')}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[s.button, { paddingVertical: 8 }]}
                  onPress={() => pickImage('autorizacion')}
                >
                  <Text style={s.buttonText}>Subir foto</Text>
                </Pressable>
              </View>
              {!!record.autorizacion_url && (
                <View style={{ marginTop: 6 }}>
                  <Text style={s.small}>Cargada</Text>
                  {isImageUrl(record.autorizacion_url) && signedUrls.autorizacion && (
                    <Image
                      source={{ uri: bust(signedUrls.autorizacion) }}
                      style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Pressable
                      style={[s.button, { paddingVertical: 8 }]}
                      onPress={() => openUrl(signedUrls.autorizacion || record.autorizacion_url)}
                    >
                      <Text style={s.buttonText}>Ver archivo</Text>
                    </Pressable>
                    <Pressable
                      style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                      onPress={() => deleteUploaded('autorizacion')}
                    >
                      <Text style={s.buttonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Cédula de identidad (frente/dorso) */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Cédula de identidad</Text>

            {record.cedula_frente_url &&
            record.cedula_dorso_url &&
            isImageUrl(record.cedula_frente_url) &&
            isImageUrl(record.cedula_dorso_url) &&
            signedUrls.cedula_frente &&
            signedUrls.cedula_dorso ? (
              <View style={{ marginTop: 6 }}>
                <Text style={s.small}>Cargadas</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Image
                    source={{ uri: bust(signedUrls.cedula_frente) }}
                    style={{ width: '49%', height: 150, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                  <Image
                    source={{ uri: bust(signedUrls.cedula_dorso) }}
                    style={{ width: '49%', height: 150, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(signedUrls.cedula_frente || record.cedula_frente_url)}
                  >
                    <Text style={s.buttonText}>Ver frente</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(signedUrls.cedula_dorso || record.cedula_dorso_url)}
                  >
                    <Text style={s.buttonText}>Ver dorso</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                    onPress={() => deleteUploaded('cedula_frente')}
                  >
                    <Text style={s.buttonText}>Eliminar frente</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                    onPress={() => deleteUploaded('cedula_dorso')}
                  >
                    <Text style={s.buttonText}>Eliminar dorso</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={[s.small, { marginTop: 6 }]}>Frente</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => pickImage('cedula_frente')}
                  >
                    <Text style={s.buttonText}>Subir foto</Text>
                  </Pressable>
                </View>
                {!!record.cedula_frente_url && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={s.small}>Cargada</Text>
                    {isImageUrl(record.cedula_frente_url) && signedUrls.cedula_frente && (
                      <Image
                        source={{ uri: bust(signedUrls.cedula_frente) }}
                        style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={() => openUrl(signedUrls.cedula_frente || record.cedula_frente_url)}
                      >
                        <Text style={s.buttonText}>Ver archivo</Text>
                      </Pressable>
                      <Pressable
                        style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                        onPress={() => deleteUploaded('cedula_frente')}
                      >
                        <Text style={s.buttonText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <Text style={[s.small, { marginTop: 12 }]}>Dorso</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => pickImage('cedula_dorso')}
                  >
                    <Text style={s.buttonText}>Subir foto</Text>
                  </Pressable>
                </View>
                {!!record.cedula_dorso_url && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={s.small}>Cargada</Text>
                    {isImageUrl(record.cedula_dorso_url) && signedUrls.cedula_dorso && (
                      <Image
                        source={{ uri: bust(signedUrls.cedula_dorso) }}
                        style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={() => openUrl(signedUrls.cedula_dorso || record.cedula_dorso_url)}
                      >
                        <Text style={s.buttonText}>Ver archivo</Text>
                      </Pressable>
                      <Pressable
                        style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                        onPress={() => deleteUploaded('cedula_dorso')}
                      >
                        <Text style={s.buttonText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Firma digital in-app (SignaturePad multiplataforma) */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Firma en el teléfono</Text>

            <SignaturePad ref={padRef} height={260} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={capturarYSubirFirma} disabled={savingSign}>
                <Text style={s.buttonText}>{savingSign ? 'Subiendo…' : 'Guardar firma'}</Text>
              </Pressable>
              <Pressable style={[s.button, { paddingVertical: 10 }]} onPress={() => { padRef.current?.clear(); setFirmaPreview(null); }}>
                <Text style={s.buttonText}>Borrar</Text>
              </Pressable>
            </View>

            {(record?.firma_url || firmaPreview) && (
              <View style={{ marginTop: 10 }}>
                <Text style={s.small}>Vista previa de la firma:</Text>
                <Image
                  source={{ uri: bust(firmaPreview || signedUrls.firma || record.firma_url) }}
                  style={{ width: '100%', height: 150, borderRadius: 6 }}
                  resizeMode="contain"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {record?.firma_url && (
                    <Pressable style={[s.button, { paddingVertical: 8 }]} onPress={() => openUrl(signedUrls.firma || record.firma_url)}>
                      <Text style={s.buttonText}>Ver archivo</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={generarPDFConsentimiento}
                  >
                    <Text style={s.buttonText}>Generar PDF con firma</Text>
                  </Pressable>
                  {record?.firma_url && (
                    <Pressable
                      style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                      onPress={() => deleteUploaded('firma')}
                    >
                      <Text style={s.buttonText}>Eliminar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {loading && (
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
    </ScrollView>
  );
}
