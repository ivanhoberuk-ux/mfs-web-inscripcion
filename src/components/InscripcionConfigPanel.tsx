// FILE: src/components/InscripcionConfigPanel.tsx
// Panel admin para gestionar fechas de apertura/cierre y año activo de inscripciones.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { s, colors } from '../lib/theme';
import {
  fetchConfiguracionesInscripcion,
  upsertConfiguracionInscripcion,
  activarAñoInscripcion,
  type ConfiguracionInscripcion,
} from '../lib/api';

// Convierte ISO -> "YYYY-MM-DDTHH:MM" (input local)
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convierte "YYYY-MM-DDTHH:MM" -> ISO
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PY');
  } catch {
    return iso;
  }
}

type DraftRow = {
  año: string;
  apertura_anticipada: string;
  apertura_general: string;
  cierre: string;
  activo: boolean;
};

const emptyDraft: DraftRow = {
  año: String(new Date().getFullYear() + 1),
  apertura_anticipada: '',
  apertura_general: '',
  cierre: '',
  activo: false,
};

export function InscripcionConfigPanel() {
  const [items, setItems] = useState<ConfiguracionInscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [newDraft, setNewDraft] = useState<DraftRow>(emptyDraft);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchConfiguracionesInscripcion();
      setItems(data);
      const map: Record<number, DraftRow> = {};
      data.forEach((c) => {
        map[c.año] = {
          año: String(c.año),
          apertura_anticipada: isoToLocalInput(c.apertura_anticipada),
          apertura_general: isoToLocalInput(c.apertura_general),
          cierre: isoToLocalInput(c.cierre),
          activo: c.activo,
        };
      });
      setDrafts(map);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(año: number) {
    const d = drafts[año];
    if (!d) return;
    const ant = localInputToIso(d.apertura_anticipada);
    const gen = localInputToIso(d.apertura_general);
    const cie = localInputToIso(d.cierre);
    if (!ant || !gen || !cie) {
      Alert.alert('Faltan fechas', 'Completá las tres fechas (anticipada, general y cierre).');
      return;
    }
    if (new Date(ant) >= new Date(gen)) {
      Alert.alert('Fechas inválidas', 'La apertura anticipada debe ser anterior a la apertura general.');
      return;
    }
    if (new Date(gen) >= new Date(cie)) {
      Alert.alert('Fechas inválidas', 'La apertura general debe ser anterior al cierre.');
      return;
    }
    try {
      setSavingId(año);
      await upsertConfiguracionInscripcion({
        año,
        apertura_anticipada: ant,
        apertura_general: gen,
        cierre: cie,
        activo: d.activo,
      });
      await load();
      Alert.alert('Guardado', `Configuración del año ${año} actualizada.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function onActivar(año: number) {
    try {
      setSavingId(año);
      await activarAñoInscripcion(año);
      await load();
      Alert.alert('Activo', `El año ${año} es ahora el año activo de inscripciones.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function onCreate() {
    const año = parseInt(newDraft.año, 10);
    if (!año || año < 2000 || año > 2100) {
      Alert.alert('Año inválido', 'Ingresá un año válido (ej. 2027).');
      return;
    }
    if (items.some((i) => i.año === año)) {
      Alert.alert('Ya existe', `Ya hay configuración para el año ${año}.`);
      return;
    }
    const ant = localInputToIso(newDraft.apertura_anticipada);
    const gen = localInputToIso(newDraft.apertura_general);
    const cie = localInputToIso(newDraft.cierre);
    if (!ant || !gen || !cie) {
      Alert.alert('Faltan fechas', 'Completá las tres fechas.');
      return;
    }
    try {
      setCreating(true);
      await upsertConfiguracionInscripcion({
        año,
        apertura_anticipada: ant,
        apertura_general: gen,
        cierre: cie,
        activo: newDraft.activo,
      });
      setNewDraft(emptyDraft);
      await load();
      Alert.alert('Creado', `Configuración del año ${año} creada.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  }

  function setDraftField<K extends keyof DraftRow>(año: number, key: K, val: DraftRow[K]) {
    setDrafts((prev) => ({ ...prev, [año]: { ...prev[año], [key]: val } }));
  }

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={[s.small, { marginTop: 6 }]}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[s.subtitle, { marginBottom: 4 }]}>Fechas de inscripción por año</Text>
      <Text style={[s.small, { color: colors.text.tertiary.light }]}>
        Definí las fechas de apertura anticipada (solo Tíos y Jefes Jóvenes), apertura general (todos) y cierre.
        Solo puede haber un año activo a la vez.
      </Text>

      {items.map((cfg) => {
        const d = drafts[cfg.año];
        if (!d) return null;
        return (
          <View
            key={cfg.año}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: cfg.activo ? '#ECFDF5' : '#F9FAFB',
              borderWidth: 1,
              borderColor: cfg.activo ? '#10B981' : '#E5E7EB',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.text, { fontWeight: '700', fontSize: 18 }]}>Año {cfg.año}</Text>
              {cfg.activo ? (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>ACTIVO</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => onActivar(cfg.año)}
                  disabled={savingId === cfg.año}
                  style={[s.button, { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#0a7ea4' }]}
                >
                  <Text style={[s.buttonText, { fontSize: 12 }]}>Marcar como activo</Text>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.small}>Apertura anticipada (solo Tíos y Jefes Jóvenes):</Text>
              <TextInput
                style={s.input}
                value={d.apertura_anticipada}
                onChangeText={(t) => setDraftField(cfg.año, 'apertura_anticipada', t)}
                placeholder="2025-12-01T08:00"
              />
              <Text style={[s.small, { color: colors.text.tertiary.light }]}>
                Actual: {fmt(cfg.apertura_anticipada)}
              </Text>

              <Text style={[s.small, { marginTop: 6 }]}>Apertura general (todos):</Text>
              <TextInput
                style={s.input}
                value={d.apertura_general}
                onChangeText={(t) => setDraftField(cfg.año, 'apertura_general', t)}
                placeholder="2026-01-15T08:00"
              />
              <Text style={[s.small, { color: colors.text.tertiary.light }]}>
                Actual: {fmt(cfg.apertura_general)}
              </Text>

              <Text style={[s.small, { marginTop: 6 }]}>Cierre:</Text>
              <TextInput
                style={s.input}
                value={d.cierre}
                onChangeText={(t) => setDraftField(cfg.año, 'cierre', t)}
                placeholder="2026-06-30T23:59"
              />
              <Text style={[s.small, { color: colors.text.tertiary.light }]}>Actual: {fmt(cfg.cierre)}</Text>
            </View>

            <Pressable
              onPress={() => onSave(cfg.año)}
              disabled={savingId === cfg.año}
              style={[s.button, { marginTop: 8, opacity: savingId === cfg.año ? 0.6 : 1 }]}
            >
              <Text style={s.buttonText}>{savingId === cfg.año ? 'Guardando...' : 'Guardar cambios'}</Text>
            </Pressable>
          </View>
        );
      })}

      {/* Crear nuevo año */}
      <View
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: '#F0F9FF',
          borderWidth: 1,
          borderColor: '#0EA5E9',
          gap: 8,
          marginTop: 8,
        }}
      >
        <Text style={[s.text, { fontWeight: '700' }]}>➕ Habilitar nuevo año</Text>
        <Text style={s.small}>Año:</Text>
        <TextInput
          style={s.input}
          value={newDraft.año}
          onChangeText={(t) => setNewDraft((p) => ({ ...p, año: t.replace(/\D/g, '') }))}
          keyboardType="number-pad"
          placeholder="2027"
        />
        <Text style={s.small}>Apertura anticipada:</Text>
        <TextInput
          style={s.input}
          value={newDraft.apertura_anticipada}
          onChangeText={(t) => setNewDraft((p) => ({ ...p, apertura_anticipada: t }))}
          placeholder="2026-12-01T08:00"
        />
        <Text style={s.small}>Apertura general:</Text>
        <TextInput
          style={s.input}
          value={newDraft.apertura_general}
          onChangeText={(t) => setNewDraft((p) => ({ ...p, apertura_general: t }))}
          placeholder="2027-01-15T08:00"
        />
        <Text style={s.small}>Cierre:</Text>
        <TextInput
          style={s.input}
          value={newDraft.cierre}
          onChangeText={(t) => setNewDraft((p) => ({ ...p, cierre: t }))}
          placeholder="2027-06-30T23:59"
        />
        <Pressable
          onPress={() => setNewDraft((p) => ({ ...p, activo: !p.activo }))}
          style={[
            s.button,
            { paddingVertical: 6, backgroundColor: newDraft.activo ? '#10B981' : '#9CA3AF' },
          ]}
        >
          <Text style={s.buttonText}>
            {newDraft.activo ? '✓ Activar al crear' : 'Marcar como activo al crear'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onCreate}
          disabled={creating}
          style={[s.button, { backgroundColor: '#0a7ea4', opacity: creating ? 0.6 : 1 }]}
        >
          <Text style={s.buttonText}>{creating ? 'Creando...' : 'Crear configuración'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
