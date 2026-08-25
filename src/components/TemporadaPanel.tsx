// FILE: src/components/TemporadaPanel.tsx
// Panel de temporada: cerrar la misión (modo institucional) y abrir el año siguiente.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, shadows } from '../lib/designSystem';
import {
  fetchConfiguracionesInscripcion,
  setModoTemporada,
  abrirAñoInscripcion,
  type ConfiguracionInscripcion,
} from '../lib/api';

function shiftYear(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + delta);
  return d.toISOString();
}

export function TemporadaPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activa, setActiva] = useState<ConfiguracionInscripcion | null>(null);
  const [todas, setTodas] = useState<ConfiguracionInscripcion[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchConfiguracionesInscripcion();
      setTodas(list);
      setActiva(list.find(c => c.activo) ?? null);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cargar la temporada');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const esInstitucional = activa?.modo === 'institucional';
  const proximoAño = activa ? activa.año + 1 : new Date().getFullYear() + 1;
  const yaExisteProximo = todas.some(c => c.año === proximoAño);

  async function cambiarModo(modo: 'mision' | 'institucional') {
    if (!activa) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      await setModoTemporada(activa.año, modo);
      setMsg(modo === 'institucional'
        ? `Temporada ${activa.año} cerrada. La app quedó en modo institucional.`
        : `Temporada ${activa.año} reabierta en modo misión.`);
      await cargar();
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cambiar el modo');
    } finally {
      setBusy(false);
    }
  }

  async function abrirProximo() {
    if (!activa) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      await abrirAñoInscripcion({
        año: proximoAño,
        apertura_anticipada: shiftYear(activa.apertura_anticipada, 1),
        apertura_general: shiftYear(activa.apertura_general, 1),
        cierre: shiftYear(activa.cierre, 1),
        lista_espera_vence_at: activa.lista_espera_vence_at ? shiftYear(activa.lista_espera_vence_at, 1) : null,
      });
      setMsg(`Inscripciones ${proximoAño} abiertas. Las fechas se copiaron del año anterior: revisalas y ajustalas abajo.`);
      await cargar();
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo abrir el nuevo año');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.surface.light,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: 12,
        borderWidth: 2,
        borderColor: esInstitucional ? colors.secondary[400] : colors.primary[100],
        ...shadows.sm,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary[700] }}>
        🗓️ Temporada
      </Text>

      {activa ? (
        <View
          style={{
            backgroundColor: esInstitucional ? colors.secondary[100] : colors.primary[50],
            borderRadius: radius.md,
            padding: spacing.md,
            gap: 2,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary[800] }}>
            Año activo: {activa.año}
          </Text>
          <Text style={{ fontSize: 13, color: colors.text.secondary.light }}>
            Modo: {esInstitucional ? '🏛️ Institucional (inscripciones ocultas)' : '⛺ Misión (app completa)'}
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, color: colors.text.secondary.light }}>
          No hay ningún año activo configurado.
        </Text>
      )}

      {msg ? (
        <Text style={{ fontSize: 13, color: colors.primary[700], fontWeight: '600' }}>✅ {msg}</Text>
      ) : null}
      {err ? (
        <Text style={{ fontSize: 13, color: '#B91C1C', fontWeight: '600' }}>⚠️ {err}</Text>
      ) : null}

      <View style={{ gap: 10 }}>
        {!esInstitucional ? (
          <Accion
            label={`🏛️ Cerrar temporada ${activa?.año ?? ''} → modo institucional`}
            hint="Oculta inscripciones, documentos, mi familia y baja. La app queda como página institucional."
            color={colors.primary[700]}
            disabled={busy || !activa}
            onPress={() => cambiarModo('institucional')}
          />
        ) : (
          <Accion
            label={`⛺ Volver a modo misión ${activa?.año ?? ''}`}
            hint="Reactiva todas las secciones del año activo."
            color={colors.primary[600]}
            disabled={busy || !activa}
            onPress={() => cambiarModo('mision')}
          />
        )}

        <Accion
          label={yaExisteProximo ? `🔁 Activar inscripciones ${proximoAño}` : `🚀 Abrir inscripciones ${proximoAño}`}
          hint="Crea (o reactiva) el año siguiente copiando las fechas del año anterior +1 año, en modo misión. Los registros de años anteriores no se tocan."
          color={colors.secondary[600] ?? colors.secondary[500]}
          textColor={colors.primary[900] ?? '#0b2545'}
          disabled={busy || !activa}
          onPress={abrirProximo}
        />
      </View>

      <Text style={{ fontSize: 12, color: colors.text.tertiary.light, lineHeight: 17 }}>
        ℹ️ Nada se borra: los inscriptos de cada año quedan guardados y podés consultarlos desde 📊 Histórico.
      </Text>
    </View>
  );
}

function Accion({
  label, hint, color, textColor, disabled, onPress,
}: {
  label: string; hint: string; color: string; textColor?: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          backgroundColor: color,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignItems: 'center',
        })}
        accessibilityRole="button"
      >
        <Text style={{ color: textColor ?? '#ffffff', fontWeight: '800', fontSize: 14 }}>{label}</Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: colors.text.tertiary.light, lineHeight: 16 }}>{hint}</Text>
    </View>
  );
}
