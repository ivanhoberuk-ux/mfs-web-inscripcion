// FILE: src/components/InscripcionAvisoCard.tsx
// Aviso juvenil en la portada con fechas/horas de apertura de inscripciones por fase.
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchEstadoInscripcionActivo, type ConfiguracionInscripcion, type EstadoInscripcion } from '../lib/api';
import { colors } from '../lib/designSystem';
import { radius } from '../lib/designSystem';

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const pad = (n: number) => String(n).padStart(2, '0');

function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
}

function diffHumano(target: Date): string {
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 'ya';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((ms / (1000 * 60)) % 60);
  if (days >= 1) return `en ${days} día${days === 1 ? '' : 's'} ${hours}h`;
  if (hours >= 1) return `en ${hours}h ${mins}min`;
  return `en ${mins} min`;
}

export function InscripcionAvisoCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<EstadoInscripcion>('sin_config');
  const [config, setConfig] = useState<ConfiguracionInscripcion | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetchEstadoInscripcionActivo();
        if (!mounted) return;
        setConfig(r.config);
        setEstado(r.estado);
      } catch (e) {
        console.warn('No se pudo cargar estado inscripción:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={{ width: '100%', padding: 16, borderRadius: radius.lg, backgroundColor: colors.primary[50], alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  if (!config || estado === 'sin_config') return null;

  // Determinar mensaje según fase
  let bg = colors.primary[50];
  let border = colors.primary[200];
  let emoji = '📅';
  let titulo = '';
  let detalle: string[] = [];
  let cta: { label: string; onPress: () => void } | null = null;

  if (estado === 'cerrado_antes') {
    bg = '#FEF3C7';
    border = '#F59E0B';
    emoji = '⏳';
    titulo = `¡Inscripciones ${config.año} muy pronto!`;
    detalle = [
      `🥇 Apertura anticipada — solo Tíos y Jefes Jóvenes 🧡`,
      `   ${fmtFechaHora(config.apertura_anticipada)} (${diffHumano(new Date(config.apertura_anticipada))})`,
      `🌟 Apertura general — todos los misioneros e hijos`,
      `   ${fmtFechaHora(config.apertura_general)}`,
      `🔒 Cierre: ${fmtFechaHora(config.cierre)}`,
    ];
  } else if (estado === 'fase_anticipada') {
    bg = '#DBEAFE';
    border = '#3B82F6';
    emoji = '🥇';
    titulo = `¡Apertura anticipada ${config.año} activa!`;
    detalle = [
      `Hoy pueden inscribirse SOLO 🧡 Tíos y Jefes Jóvenes (Misioneros con cargo de jefe).`,
      `🌟 Apertura general (todos): ${fmtFechaHora(config.apertura_general)} (${diffHumano(new Date(config.apertura_general))})`,
      `🔒 Cierre: ${fmtFechaHora(config.cierre)}`,
    ];
    cta = { label: '✍️ Inscribirme (Tío / Jefe Joven)', onPress: () => router.push('/inscribir') };
  } else if (estado === 'fase_general') {
    bg = '#D1FAE5';
    border = '#10B981';
    emoji = '🎉';
    titulo = `¡Inscripciones ${config.año} ABIERTAS para todos!`;
    detalle = [
      `Tíos, Misioneros e Hijos pueden inscribirse 🚀`,
      `🔒 Cierran: ${fmtFechaHora(config.cierre)} (${diffHumano(new Date(config.cierre))})`,
    ];
    cta = { label: '✍️ ¡Inscribirme!', onPress: () => router.push('/inscribir') };
  } else if (estado === 'cerrado_despues') {
    bg = '#FEE2E2';
    border = '#EF4444';
    emoji = '🔒';
    titulo = `Inscripciones ${config.año} cerradas`;
    detalle = [`Cerraron el ${fmtFechaHora(config.cierre)}.`, `¡Nos vemos el próximo año! 💛`];
  }

  return (
    <View
      style={{
        width: '100%',
        padding: 18,
        borderRadius: radius.lg,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: '#111827' }}>{titulo}</Text>
      </View>
      <View style={{ gap: 4 }}>
        {detalle.map((d, i) => (
          <Text key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
            {d}
          </Text>
        ))}
      </View>
      {cta ? (
        <Pressable
          onPress={cta.onPress}
          style={({ pressed }) => ({
            marginTop: 6,
            backgroundColor: border,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: radius.md,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
          accessibilityRole="button"
        >
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
