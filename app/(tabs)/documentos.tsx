// FILE: app/(tabs)/documentos.tsx — Plantillas + Subida (solo foto) + Firma + PDF + Thumbnails + Delete

import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { s } from '../../src/lib/theme';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import Signature from 'react-native-signature-canvas';
import { uploadToStorage, updateDocumento, publicUrl } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function Documentos() {
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
  const [showSign, setShowSign] = useState(false);
  const [signing, setSigning] = useState(false); // (ya no bloquea el scroll, pero lo dejamos para begin/end)
  const [savingSign, setSavingSign] = useState(false); // spinner mientras sube
  const sigRef = useRef<any>(null);

  // ========= PLANTILLAS =========
  const URL_PERMISO = publicUrl('plantillas', 'permiso_menor.pdf');
  const URL_PROTOCOLO = publicUrl('plantillas', 'protocolo_prevencion.pdf');
  const URL_ACEPTACION = publicUrl('plantillas', 'aceptacion_protocolo_prevencion.pdf');

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
  function bust(url?: string | null) {
    if (!url) return url as any;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}cb=${Date.now()}`;
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
    // Espera URLs como: {SUPABASE_URL}/storage/v1/object/public/documentos/<path>
    const marker = '/storage/v1/object/public/documentos/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length).split('?')[0];
  }

  // === BUSCAR POR CÓDIGO ===
  async function buscarPorCodigo() {
    try {
      if (!code) return Alert.alert('Ingresá el código de inscripción (UUID).');
      setLoading(true);
      const { data, error } = await supabase
        .from('registros')
        .select(
          'id,nombres,apellidos,pueblo_id,autorizacion_url,ficha_medica_url,firma_url,ci,email,cedula_frente_url,cedula_dorso_url'
        )
        .eq('id', code.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) return Alert.alert('No encontrado', 'Revisá el código.');
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
          'id,nombres,apellidos,pueblo_id,autorizacion_url,ficha_medica_url,firma_url,ci,email,created_at,cedula_frente_url,cedula_dorso_url'
        )
        .eq('ci', ciSan)
        .order('created_at', { ascending: false })
        .limit(10);
      if (emailSan) q = q.ilike('email', `%${emailSan}%`);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0)
        return Alert.alert('Sin resultados', 'Verificá cédula y email.');
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

      // 1) Intentar borrar del Storage
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

      // 2) Quitar referencia en la tabla
      await updateDocumento(record.id, { [field]: null } as any);
      setRecord({ ...record, [field]: null });

      Alert.alert('Listo', 'Archivo eliminado.');
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? String(e));
    }
  }

  // === Guardar firma (Signature) ===
  function onOK(base64: string) {
    (async () => {
      try {
        if (!record) return;
        setSavingSign(true);
        const path = `registros/${record.id}/firma.png`;
        const url = await uploadToStorage('documentos', path, base64); // dataURL
        if (!url) throw new Error('No se pudo subir la firma');
        await updateDocumento(record.id, { firma_url: url });
        setRecord({ ...record, firma_url: url });
        setShowSign(false);
        Alert.alert('Firma guardada', 'Se subió la firma correctamente.');
      } catch (e: any) {
        Alert.alert('Error al subir la firma', e?.message ?? String(e));
      } finally {
        setSavingSign(false);
        setSigning(false);
      }
    })();
  }

  // === Generar PDF con la firma y datos ===
  async function generarPDFConsentimiento() {
    try {
      if (!record) return Alert.alert('Seleccioná un inscripto primero');
      if (!record.firma_url) {
        Alert.alert('Falta la firma', 'Capturá la firma antes de generar el PDF.');
        return;
      }
      const fecha = new Date().toLocaleString();
      const html = `
        <html><head><meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.5; margin: 6px 0; }
          .box { border:1px solid #ccc; padding:12px; border-radius:8px; }
          .sig { margin-top: 16px; height: 140px; }
          .row { display:flex; justify-content:space-between; align-items:center; margin-top:6px; }
          small { color:#666; }
          img { max-width: 100%; }
        </style></head><body>
          <h1>Autorización / Consentimiento</h1>
          <div class="box">
            <p><b>Inscripto:</b> ${record.nombres} ${record.apellidos}</p>
            <p><b>CI:</b> ${record.ci || '-'}</p>
            <p><b>Email:</b> ${record.email || '-'}</p>
            <p><b>Pueblo:</b> ${record.pueblo_id}</p>
            <p><b>Fecha:</b> ${fecha}</p>
            <div class="sig"><img src="${record.firma_url}" style="height:100%;" /></div>
            <div class="row"><small>Firma</small><small>Código: ${record.id}</small></div>
          </div>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      const path = `registros/${record.id}/consentimiento.pdf`;
      const url = await uploadToStorage('documentos', path, uri);
      Alert.alert('PDF generado', 'Se subió el consentimiento.', [
        { text: 'Abrir', onPress: () => openUrl(url) },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('No se pudo generar el PDF', e?.message ?? String(e));
    }
  }

  // ======== UI ========
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32 }}
      style={s.screen}
      scrollEnabled={!signing}                // dejamos siempre el scroll habilitado
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      <Text style={s.title}>Documentos</Text>

      {/* === PLANTILLAS PARA FIRMAR === */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.text}>Descargar Plantillas para firmar</Text>

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

      {/* Selector de modo de búsqueda */}
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

      {/* Búsqueda por CÓDIGO */}
      {mode === 'code' && (
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

      {/* Búsqueda por CÉDULA */}
      {mode === 'ci' && (
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

          {/* Aceptación de Protocolo */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Aceptación de Protocolo firmada</Text>
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
                {isImageUrl(record.autorizacion_url) && (
                  <Image
                    source={{ uri: bust(record.autorizacion_url) }}
                    style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(bust(record.autorizacion_url))}
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

          {/* Permiso del Menor */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Permiso del Menor firmado</Text>
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
                {isImageUrl(record.ficha_medica_url) && (
                  <Image
                    source={{ uri: bust(record.ficha_medica_url) }}
                    style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(bust(record.ficha_medica_url))}
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

          {/* Cédula de identidad (frente/dorso) */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Cédula de identidad</Text>

            {/* Si hay las dos -> miniaturas lado a lado */}
            {record.cedula_frente_url &&
            record.cedula_dorso_url &&
            isImageUrl(record.cedula_frente_url) &&
            isImageUrl(record.cedula_dorso_url) ? (
              <View style={{ marginTop: 6 }}>
                <Text style={s.small}>Cargadas</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Image
                    source={{ uri: bust(record.cedula_frente_url) }}
                    style={{ width: '49%', height: 150, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                  <Image
                    source={{ uri: bust(record.cedula_dorso_url) }}
                    style={{ width: '49%', height: 150, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(bust(record.cedula_frente_url))}
                  >
                    <Text style={s.buttonText}>Ver frente</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 8 }]}
                    onPress={() => openUrl(bust(record.cedula_dorso_url))}
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
                {/* Frente (subida + preview individual si no hay ambas) */}
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
                    {isImageUrl(record.cedula_frente_url) && (
                      <Image
                        source={{ uri: bust(record.cedula_frente_url) }}
                        style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={() => openUrl(bust(record.cedula_frente_url))}
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

                {/* Dorso */}
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
                    {isImageUrl(record.cedula_dorso_url) && (
                      <Image
                        source={{ uri: bust(record.cedula_dorso_url) }}
                        style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={() => openUrl(bust(record.cedula_dorso_url))}
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

          {/* Firma digital in-app */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Firma en el teléfono</Text>

            {!showSign && (
              <View style={{ gap: 8 }}>
                <Pressable
                  style={[s.button, { paddingVertical: 8 }]}
                  onPress={() => setShowSign(true)}
                >
                  <Text style={s.buttonText}>
                    {record?.firma_url ? 'Re-capturar firma' : 'Capturar firma'}
                  </Text>
                </Pressable>

                {savingSign && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator />
                    <Text style={s.small}>Subiendo firma…</Text>
                  </View>
                )}

                {!!record?.firma_url && !savingSign && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={s.small}>Guardada</Text>
                    <Image
                      source={{ uri: bust(record.firma_url) }}
                      style={{ width: '100%', height: 150, marginTop: 6, borderRadius: 6 }}
                      resizeMode="contain"
                    />
                    <View
                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}
                    >
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={() => openUrl(bust(record.firma_url))}
                      >
                        <Text style={s.buttonText}>Ver archivo</Text>
                      </Pressable>
                      <Pressable
                        style={[s.button, { paddingVertical: 8, backgroundColor: '#d94646' }]}
                        onPress={() => deleteUploaded('firma')}
                      >
                        <Text style={s.buttonText}>Eliminar</Text>
                      </Pressable>
                      <Pressable
                        style={[s.button, { paddingVertical: 8 }]}
                        onPress={generarPDFConsentimiento}
                      >
                        <Text style={s.buttonText}>Generar PDF con firma</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            {showSign && (
              <View style={{ marginTop: 8 }}>
                <View style={{ height: 320 }}>
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                  <Signature
                    ref={sigRef}
                    onBegin={() => setSigning(true)}   // mientras dibuja
                    onEnd={() => setSigning(false)}    // al soltar el dedo
                    onOK={onOK}
                    onEmpty={() => Alert.alert('Sin trazos')}
                    descriptionText="Firmá aquí"
                    clearText="Borrar"
                    confirmText="Guardar"
                    webStyle={`
                      body, html { margin:0; padding:0; overscroll-behavior: contain; }
                      .m-signature-pad { box-shadow: none; border: 1px solid #ccc; }
                      .m-signature-pad--footer { display:none; } /* escondemos footer interno */
                      canvas { width: 100% !important; height: 100% !important; }
                      * { touch-action: none; }
                    `}
                  />
                </View>

                {/* Barra de acciones externa: siempre visible y con scroll */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Pressable
                    style={[s.button, { paddingVertical: 10 }]}
                    onPress={() => sigRef.current?.readSignature()}
                  >
                    <Text style={s.buttonText}>Guardar firma</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 10 }]}
                    onPress={() => sigRef.current?.clearSignature()}
                  >
                    <Text style={s.buttonText}>Borrar</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { paddingVertical: 10, backgroundColor: '#999' }]}
                    onPress={() => setShowSign(false)}
                  >
                    <Text style={s.buttonText}>Cancelar</Text>
                  </Pressable>
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
