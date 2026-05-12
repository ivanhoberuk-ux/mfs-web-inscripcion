// FILE: src/components/PlantillasManagerPanel.tsx
// Panel de super admin para gestionar las plantillas / documentos comunes (Permiso del Menor, Protocolo, Estatutos, etc.)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { s } from '../lib/theme';
import {
  fetchPlantillas,
  upsertPlantilla,
  deletePlantilla,
  uploadToStorage,
  publicUrl,
  deleteStorageObject,
  type PlantillaDocumento,
} from '../lib/api';

async function pickFileWeb(): Promise<{ name: string; dataUrl: string; mime: string } | null> {
  if (Platform.OS !== 'web') return null;
  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, dataUrl: String(reader.result), mime: f.type || 'application/octet-stream' });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    };
    input.click();
  });
}

function openUrl(url: string) {
  if (!url) return;
  if (Platform.OS === 'web') window.open(url, '_blank');
  else Linking.openURL(url).catch(() => {});
}

export function PlantillasManagerPanel() {
  const [items, setItems] = useState<PlantillaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Form para nueva plantilla
  const [showNew, setShowNew] = useState(false);
  const [nKey, setNKey] = useState('');
  const [nTitulo, setNTitulo] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nEmoji, setNEmoji] = useState('📄');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlantillas();
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReplace(p: PlantillaDocumento) {
    if (Platform.OS !== 'web') {
      Alert.alert('Solo web', 'La carga de archivos está disponible desde la versión web.');
      return;
    }
    const file = await pickFileWeb();
    if (!file) return;

    setBusyKey(p.key);
    try {
      // Conserva el nombre del archivo subido para que sea reconocible
      const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
      const newPath = safeName;
      const uploaded = await uploadToStorage(p.bucket, newPath, file.dataUrl);
      if (!uploaded) throw new Error('No se pudo subir el archivo');

      // Si el path cambió, borrar el anterior (best effort)
      if (p.path && p.path !== newPath) {
        try { await deleteStorageObject(p.bucket, p.path); } catch (e) { console.warn('No se pudo borrar el anterior', e); }
      }

      await upsertPlantilla({
        key: p.key,
        titulo: p.titulo,
        descripcion: p.descripcion,
        emoji: p.emoji,
        bucket: p.bucket,
        path: newPath,
        orden: p.orden,
        activo: p.activo,
      });
      await load();
      Alert.alert('Listo', `"${p.titulo}" actualizado.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo reemplazar el archivo');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleActivo(p: PlantillaDocumento) {
    setBusyKey(p.key);
    try {
      await upsertPlantilla({ ...p, activo: !p.activo });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo actualizar');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete(p: PlantillaDocumento) {
    const ok = Platform.OS === 'web'
      ? window.confirm(`¿Eliminar "${p.titulo}"? Esto NO borra el archivo del storage.`)
      : true;
    if (!ok) return;
    setBusyKey(p.key);
    try {
      await deletePlantilla(p.key);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo eliminar');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleView(p: PlantillaDocumento) {
    try {
      const url = await publicUrl(p.bucket, p.path);
      openUrl(`${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(p.updated_at)}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir');
    }
  }

  async function handleCreate() {
    if (!nKey.trim() || !nTitulo.trim()) {
      Alert.alert('Faltan datos', 'Clave y título son obligatorios.');
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('Solo web', 'La carga de archivos está disponible desde la versión web.');
      return;
    }
    const file = await pickFileWeb();
    if (!file) return;

    setBusyKey('__new__');
    try {
      const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
      const uploaded = await uploadToStorage('plantillas', safeName, file.dataUrl);
      if (!uploaded) throw new Error('No se pudo subir el archivo');

      await upsertPlantilla({
        key: nKey.trim(),
        titulo: nTitulo.trim(),
        descripcion: nDesc.trim() || null,
        emoji: nEmoji.trim() || '📄',
        bucket: 'plantillas',
        path: safeName,
        orden: (items[items.length - 1]?.orden ?? 0) + 10,
        activo: true,
      });
      setNKey(''); setNTitulo(''); setNDesc(''); setNEmoji('📄'); setShowNew(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear la plantilla');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[s.subtitle, { marginBottom: 4 }]}>📚 Plantillas / Documentos comunes</Text>
      <Text style={[s.text, { color: '#6b7280', marginBottom: 8 }]}>
        Acá podés actualizar año a año los PDFs que ven todos los misioneros (Permiso del Menor, Protocolo, Estatutos, etc.). Al subir un nuevo archivo, se reemplaza para todos.
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((p) => {
            const busy = busyKey === p.key;
            return (
              <View key={p.key} style={[s.card, { padding: 12, gap: 6, opacity: p.activo ? 1 : 0.6 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22 }}>{p.emoji || '📄'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.text, { fontWeight: '700' }]}>{p.titulo}</Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }} numberOfLines={1}>
                      {p.path} · clave: <Text style={{ fontFamily: 'monospace' as any }}>{p.key}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                      Actualizado: {new Date(p.updated_at).toLocaleString('es-PY')}
                    </Text>
                  </View>
                </View>
                {p.descripcion ? (
                  <Text style={{ fontSize: 12, color: '#374151' }}>{p.descripcion}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <Pressable
                    style={[s.button, { backgroundColor: '#0a7ea4', paddingVertical: 8, paddingHorizontal: 12 }]}
                    onPress={() => handleView(p)}
                    disabled={busy}
                  >
                    <Text style={[s.buttonText, { fontSize: 12 }]}>👁️ Ver actual</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { backgroundColor: '#0b9850', paddingVertical: 8, paddingHorizontal: 12 }]}
                    onPress={() => handleReplace(p)}
                    disabled={busy}
                  >
                    <Text style={[s.buttonText, { fontSize: 12 }]}>{busy ? 'Subiendo…' : '⬆️ Reemplazar PDF'}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { backgroundColor: p.activo ? '#f59e0b' : '#6b7280', paddingVertical: 8, paddingHorizontal: 12 }]}
                    onPress={() => handleToggleActivo(p)}
                    disabled={busy}
                  >
                    <Text style={[s.buttonText, { fontSize: 12 }]}>{p.activo ? 'Desactivar' : 'Activar'}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.button, { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 12 }]}
                    onPress={() => handleDelete(p)}
                    disabled={busy}
                  >
                    <Text style={[s.buttonText, { fontSize: 12 }]}>🗑️ Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 8 }}>
        {!showNew ? (
          <Pressable
            style={[s.button, { backgroundColor: '#7c3aed' }]}
            onPress={() => setShowNew(true)}
          >
            <Text style={s.buttonText}>➕ Agregar nueva plantilla</Text>
          </Pressable>
        ) : (
          <View style={[s.card, { gap: 8 }]}>
            <Text style={[s.text, { fontWeight: '700' }]}>Nueva plantilla</Text>
            <Text style={s.label}>Clave (sin espacios, ej: reglamento_2027)</Text>
            <TextInput style={s.input} value={nKey} onChangeText={setNKey} placeholder="reglamento_2027" autoCapitalize="none" />
            <Text style={s.label}>Título visible</Text>
            <TextInput style={s.input} value={nTitulo} onChangeText={setNTitulo} placeholder="Reglamento 2027" />
            <Text style={s.label}>Emoji (opcional)</Text>
            <TextInput style={s.input} value={nEmoji} onChangeText={setNEmoji} placeholder="📄" />
            <Text style={s.label}>Descripción (opcional)</Text>
            <TextInput style={s.input} value={nDesc} onChangeText={setNDesc} placeholder="Breve descripción" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[s.button, { flex: 1, backgroundColor: '#0b9850' }]}
                onPress={handleCreate}
                disabled={busyKey === '__new__'}
              >
                <Text style={s.buttonText}>{busyKey === '__new__' ? 'Subiendo…' : 'Subir y crear'}</Text>
              </Pressable>
              <Pressable
                style={[s.button, { flex: 1, backgroundColor: '#6b7280' }]}
                onPress={() => setShowNew(false)}
                disabled={busyKey === '__new__'}
              >
                <Text style={s.buttonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
