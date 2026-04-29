// FILE: src/components/InscripcionConfigPanel.tsx
// Panel admin con UX intuitiva para gestionar fechas/horas de inscripción y año activo.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { s, colors } from '../lib/theme';
import {
  fetchConfiguracionesInscripcion,
  upsertConfiguracionInscripcion,
  activarAñoInscripcion,
  type ConfiguracionInscripcion,
} from '../lib/api';

// ===== Helpers de fecha =====
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

type DateTimeParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
};

function isoToParts(iso: string | null | undefined): DateTimeParts | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

function partsToIso(p: DateTimeParts): string {
  const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
  return d.toISOString();
}

function formatPretty(p: DateTimeParts | null): string {
  if (!p) return '— sin definir —';
  const dow = new Date(p.year, p.month - 1, p.day).getDay();
  return `${DIAS_SEMANA[dow]} ${p.day} de ${MESES[p.month - 1]} de ${p.year}, ${pad(p.hour)}:${pad(p.minute)} hs`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ===== Mini-calendario =====
function MiniCalendar({
  value,
  onChange,
}: {
  value: DateTimeParts;
  onChange: (next: DateTimeParts) => void;
}) {
  const [viewYear, setViewYear] = useState(value.year);
  const [viewMonth, setViewMonth] = useState(value.month);

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
      {/* Header navegación */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Pressable onPress={() => shiftMonth(-1)} style={{ padding: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0a7ea4' }}>‹</Text>
        </Pressable>
        <Text style={{ fontWeight: '700', fontSize: 14 }}>
          {MESES[viewMonth - 1]} {viewYear}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} style={{ padding: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0a7ea4' }}>›</Text>
        </Pressable>
      </View>

      {/* Días de la semana */}
      <View style={{ flexDirection: 'row' }}>
        {DIAS_SEMANA.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Días */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, idx) => {
          const isSelected =
            d !== null &&
            d === value.day &&
            viewMonth === value.month &&
            viewYear === value.year;
          return (
            <View key={idx} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 }}>
              {d === null ? (
                <View style={{ width: 32, height: 32 }} />
              ) : (
                <Pressable
                  onPress={() => onChange({ ...value, year: viewYear, month: viewMonth, day: d })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? '#0a7ea4' : 'transparent',
                  }}
                >
                  <Text style={{ color: isSelected ? 'white' : '#111827', fontWeight: isSelected ? '700' : '500', fontSize: 13 }}>
                    {d}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ===== Selector de hora =====
function TimePicker({
  value,
  onChange,
}: {
  value: DateTimeParts;
  onChange: (next: DateTimeParts) => void;
}) {
  const [hourStr, setHourStr] = useState(pad(value.hour));
  const [minStr, setMinStr] = useState(pad(value.minute));

  useEffect(() => {
    setHourStr(pad(value.hour));
    setMinStr(pad(value.minute));
  }, [value.hour, value.minute]);

  function commit(h: string, m: string) {
    let hh = parseInt(h, 10);
    let mm = parseInt(m, 10);
    if (isNaN(hh) || hh < 0 || hh > 23) hh = value.hour;
    if (isNaN(mm) || mm < 0 || mm > 59) mm = value.minute;
    onChange({ ...value, hour: hh, minute: mm });
  }

  const presets = [
    { label: '00:00', h: 0, m: 0 },
    { label: '08:00', h: 8, m: 0 },
    { label: '12:00', h: 12, m: 0 },
    { label: '18:00', h: 18, m: 0 },
    { label: '23:59', h: 23, m: 59 },
  ];

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, color: '#374151' }}>🕒 Hora:</Text>
        <TextInput
          style={[s.input, { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '600' }]}
          value={hourStr}
          onChangeText={(t) => setHourStr(t.replace(/\D/g, '').slice(0, 2))}
          onBlur={() => commit(hourStr, minStr)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="HH"
        />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>:</Text>
        <TextInput
          style={[s.input, { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '600' }]}
          value={minStr}
          onChangeText={(t) => setMinStr(t.replace(/\D/g, '').slice(0, 2))}
          onBlur={() => commit(hourStr, minStr)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {presets.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => onChange({ ...value, hour: p.h, minute: p.m })}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: value.hour === p.h && value.minute === p.m ? '#0a7ea4' : '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: value.hour === p.h && value.minute === p.m ? 'white' : '#374151' }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ===== Campo fecha+hora colapsable =====
function DateTimeField({
  label,
  emoji,
  value,
  onChange,
  defaultValue,
  helpText,
}: {
  label: string;
  emoji: string;
  value: DateTimeParts | null;
  onChange: (next: DateTimeParts) => void;
  defaultValue: DateTimeParts;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = value ?? defaultValue;

  const handleToggle = () => {
    if (!value) onChange(defaultValue);
    setOpen((o) => !o);
  };

  return (
    <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: 'white', overflow: 'hidden' }}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        // @ts-ignore — RN Web acepta cursor
        style={({ pressed }) => ({
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: pressed ? '#F3F4F6' : open ? '#EFF6FF' : 'white',
          cursor: 'pointer',
        })}
      >
        <View style={{ flex: 1, pointerEvents: 'none' }}>
          <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 2 }}>
            {emoji} {label}  ·  {open ? 'tocá para cerrar' : 'tocá para editar'}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: value ? '#111827' : '#9CA3AF' }}>
            {formatPretty(value)}
          </Text>
          {helpText ? (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{helpText}</Text>
          ) : null}
        </View>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: open ? '#0a7ea4' : '#E5E7EB',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Text style={{ fontSize: 16, color: open ? 'white' : '#374151', fontWeight: '700' }}>
            {open ? '▲' : '▼'}
          </Text>
        </View>
      </Pressable>
      {open ? (
        <View style={{ padding: 12, gap: 10, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <MiniCalendar value={current} onChange={onChange} />
          <TimePicker value={current} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}

// ===== Drafts =====
type DraftRow = {
  año: number;
  apertura_anticipada: DateTimeParts | null;
  apertura_general: DateTimeParts | null;
  cierre: DateTimeParts | null;
  activo: boolean;
};

function defaultPartsForYear(año: number, month: number, day: number, hour = 8, minute = 0): DateTimeParts {
  return { year: año, month, day, hour, minute };
}

const emptyDraft = (año: number): DraftRow => ({
  año,
  apertura_anticipada: null,
  apertura_general: null,
  cierre: null,
  activo: false,
});

export function InscripcionConfigPanel() {
  const [items, setItems] = useState<ConfiguracionInscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [newDraft, setNewDraft] = useState<DraftRow>(emptyDraft(new Date().getFullYear() + 1));
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchConfiguracionesInscripcion();
      setItems(data);
      const map: Record<number, DraftRow> = {};
      data.forEach((c) => {
        map[c.año] = {
          año: c.año,
          apertura_anticipada: isoToParts(c.apertura_anticipada),
          apertura_general: isoToParts(c.apertura_general),
          cierre: isoToParts(c.cierre),
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
    if (!d.apertura_anticipada || !d.apertura_general || !d.cierre) {
      Alert.alert('Faltan fechas', 'Completá las tres fechas (anticipada, general y cierre).');
      return;
    }
    const ant = partsToIso(d.apertura_anticipada);
    const gen = partsToIso(d.apertura_general);
    const cie = partsToIso(d.cierre);
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
      Alert.alert('✅ Guardado', `Configuración del año ${año} actualizada.`);
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
      Alert.alert('✅ Activo', `El año ${año} es ahora el año activo.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function onCreate() {
    const año = newDraft.año;
    if (!año || año < 2000 || año > 2100) {
      Alert.alert('Año inválido', 'Ingresá un año válido (ej. 2027).');
      return;
    }
    if (items.some((i) => i.año === año)) {
      Alert.alert('Ya existe', `Ya hay configuración para el año ${año}.`);
      return;
    }
    if (!newDraft.apertura_anticipada || !newDraft.apertura_general || !newDraft.cierre) {
      Alert.alert('Faltan fechas', 'Completá las tres fechas.');
      return;
    }
    try {
      setCreating(true);
      await upsertConfiguracionInscripcion({
        año,
        apertura_anticipada: partsToIso(newDraft.apertura_anticipada),
        apertura_general: partsToIso(newDraft.apertura_general),
        cierre: partsToIso(newDraft.cierre),
        activo: newDraft.activo,
      });
      setNewDraft(emptyDraft(año + 1));
      setShowNew(false);
      await load();
      Alert.alert('✅ Creado', `Configuración del año ${año} creada.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  }

  function setDraftField<K extends keyof DraftRow>(año: number, key: K, val: DraftRow[K]) {
    setDrafts((prev) => ({ ...prev, [año]: { ...prev[año], [key]: val } }));
  }

  // Aplicar plantilla rápida (ejemplo: mes anterior al año, mitad de enero, fin de junio)
  function aplicarPlantilla(año: number) {
    const d: DraftRow = {
      año,
      apertura_anticipada: defaultPartsForYear(año - 1, 12, 1, 8, 0),
      apertura_general: defaultPartsForYear(año, 1, 15, 8, 0),
      cierre: defaultPartsForYear(año, 6, 30, 23, 59),
      activo: drafts[año]?.activo ?? false,
    };
    setDrafts((prev) => ({ ...prev, [año]: d }));
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
    <View style={{ gap: 14 }}>
      <Text style={[s.subtitle, { marginBottom: 0 }]}>📅 Fechas de inscripción</Text>
      <Text style={[s.small, { color: colors.text.tertiary.light, marginBottom: 4 }]}>
        Tocá cada fecha para abrir el calendario. Definí apertura anticipada (Tíos y Jefes Jóvenes),
        apertura general (todos) y cierre. Solo puede haber un año activo a la vez.
      </Text>

      {items.map((cfg) => {
        const d = drafts[cfg.año];
        if (!d) return null;
        const año = cfg.año;

        // Detectar inconsistencias entre fechas guardadas y "ahora"
        const ahora = new Date();
        const antDate = new Date(cfg.apertura_anticipada);
        const genDate = new Date(cfg.apertura_general);
        const cieDate = new Date(cfg.cierre);
        const estadoActual: string =
          ahora < antDate ? 'cerrado_antes' :
          ahora < genDate ? 'fase_anticipada' :
          ahora < cieDate ? 'fase_general' : 'cerrado_despues';
        const labelEstado: Record<string, { txt: string; bg: string; fg: string }> = {
          cerrado_antes: { txt: '⏳ Aún no abre', bg: '#FEF3C7', fg: '#92400E' },
          fase_anticipada: { txt: '🥇 Fase anticipada (Tíos/Jefes)', bg: '#DBEAFE', fg: '#1E40AF' },
          fase_general: { txt: '🎉 Abierto a todos', bg: '#D1FAE5', fg: '#065F46' },
          cerrado_despues: { txt: '🔒 Cerrado', bg: '#FEE2E2', fg: '#991B1B' },
        };

        return (
          <View
            key={año}
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: cfg.activo ? '#ECFDF5' : '#F9FAFB',
              borderWidth: 2,
              borderColor: cfg.activo ? '#10B981' : '#E5E7EB',
              gap: 12,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>📆 {año}</Text>
              {cfg.activo ? (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>● ACTIVO</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => onActivar(año)}
                  disabled={savingId === año}
                  style={{ backgroundColor: '#0a7ea4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
                >
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Activar este año</Text>
                </Pressable>
              )}
              {cfg.activo ? (
                <View style={{ backgroundColor: labelEstado[estadoActual].bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: labelEstado[estadoActual].fg }}>
                    Estado real ahora: {labelEstado[estadoActual].txt}
                  </Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => aplicarPlantilla(año)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FEF3C7' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>⚡ Plantilla rápida</Text>
              </Pressable>
            </View>

            {/* Aviso de inconsistencia: si el draft difiere de lo guardado */}
            {cfg.activo && estadoActual === 'fase_general' && ahora.getTime() - genDate.getTime() > 1000 * 60 * 60 * 24 * 30 ? (
              <View style={{ padding: 10, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '700' }}>
                  ⚠️ Atención: la "Apertura general" guardada es del pasado, por eso la portada muestra "Inscripciones abiertas".
                </Text>
                <Text style={{ fontSize: 11, color: '#7F1D1D', marginTop: 2 }}>
                  Si querés que vuelva a mostrar "muy pronto" o "fase anticipada", actualizá las 3 fechas y guardá los cambios.
                </Text>
              </View>
            ) : null}

            {/* Campos */}
            <DateTimeField
              label="Apertura anticipada"
              emoji="🥇"
              helpText="Solo Tíos y Jefes Jóvenes"
              value={d.apertura_anticipada}
              defaultValue={defaultPartsForYear(año - 1, 12, 1, 8, 0)}
              onChange={(p) => setDraftField(año, 'apertura_anticipada', p)}
            />
            <DateTimeField
              label="Apertura general"
              emoji="🌟"
              helpText="Abierto para todos los misioneros e hijos"
              value={d.apertura_general}
              defaultValue={defaultPartsForYear(año, 1, 15, 8, 0)}
              onChange={(p) => setDraftField(año, 'apertura_general', p)}
            />
            <DateTimeField
              label="Cierre de inscripciones"
              emoji="🔒"
              helpText="Después de esta fecha no se aceptan nuevas inscripciones"
              value={d.cierre}
              defaultValue={defaultPartsForYear(año, 6, 30, 23, 59)}
              onChange={(p) => setDraftField(año, 'cierre', p)}
            />

            <Pressable
              onPress={() => onSave(año)}
              disabled={savingId === año}
              style={[s.button, { opacity: savingId === año ? 0.6 : 1 }]}
            >
              <Text style={s.buttonText}>{savingId === año ? 'Guardando...' : '💾 Guardar cambios'}</Text>
            </Pressable>
          </View>
        );
      })}

      {/* Nuevo año */}
      {!showNew ? (
        <Pressable
          onPress={() => setShowNew(true)}
          style={{
            padding: 14,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: '#0EA5E9',
            borderStyle: 'dashed',
            backgroundColor: '#F0F9FF',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0369A1' }}>➕ Habilitar un nuevo año</Text>
        </Pressable>
      ) : (
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: '#F0F9FF', borderWidth: 2, borderColor: '#0EA5E9', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0369A1' }}>➕ Nuevo año</Text>
            <Pressable onPress={() => setShowNew(false)}>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Cancelar</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Año:</Text>
            <Pressable
              onPress={() => setNewDraft((p) => ({ ...p, año: p.año - 1 }))}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>−</Text>
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: '800', minWidth: 70, textAlign: 'center' }}>{newDraft.año}</Text>
            <Pressable
              onPress={() => setNewDraft((p) => ({ ...p, año: p.año + 1 }))}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>+</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() =>
                setNewDraft((p) => ({
                  ...p,
                  apertura_anticipada: defaultPartsForYear(p.año - 1, 12, 1, 8, 0),
                  apertura_general: defaultPartsForYear(p.año, 1, 15, 8, 0),
                  cierre: defaultPartsForYear(p.año, 6, 30, 23, 59),
                }))
              }
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FEF3C7' }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>⚡ Plantilla</Text>
            </Pressable>
          </View>

          <DateTimeField
            label="Apertura anticipada"
            emoji="🥇"
            helpText="Solo Tíos y Jefes Jóvenes"
            value={newDraft.apertura_anticipada}
            defaultValue={defaultPartsForYear(newDraft.año - 1, 12, 1, 8, 0)}
            onChange={(p) => setNewDraft((prev) => ({ ...prev, apertura_anticipada: p }))}
          />
          <DateTimeField
            label="Apertura general"
            emoji="🌟"
            helpText="Abierto para todos"
            value={newDraft.apertura_general}
            defaultValue={defaultPartsForYear(newDraft.año, 1, 15, 8, 0)}
            onChange={(p) => setNewDraft((prev) => ({ ...prev, apertura_general: p }))}
          />
          <DateTimeField
            label="Cierre de inscripciones"
            emoji="🔒"
            value={newDraft.cierre}
            defaultValue={defaultPartsForYear(newDraft.año, 6, 30, 23, 59)}
            onChange={(p) => setNewDraft((prev) => ({ ...prev, cierre: p }))}
          />

          <Pressable
            onPress={() => setNewDraft((p) => ({ ...p, activo: !p.activo }))}
            style={{
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: newDraft.activo ? '#10B981' : '#E5E7EB',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: newDraft.activo ? 'white' : '#374151', fontWeight: '700', fontSize: 13 }}>
              {newDraft.activo ? '✓ Se activará al crear' : 'Marcar como activo al crear'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCreate}
            disabled={creating}
            style={[s.button, { backgroundColor: '#0a7ea4', opacity: creating ? 0.6 : 1 }]}
          >
            <Text style={s.buttonText}>{creating ? 'Creando...' : '✨ Crear configuración'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
