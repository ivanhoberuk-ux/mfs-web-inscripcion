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

  // Paleta y contenido por fase
  let gradient: [string, string] = ['#FEF3C7', '#FDE68A'];
  let border = '#F59E0B';
  let accent = '#B45309';
  let emoji = '📅';
  let chip = '';
  let titulo = '';
  let subtitulo = '';
  let highlights: { icon: string; label: string; value: string; sub?: string; color: string }[] = [];
  let cta: { label: string; onPress: () => void } | null = null;
  let wiggle = false;

  if (estado === 'cerrado_antes') {
    gradient = ['#FFF7ED', '#FED7AA'];
    border = '#FB923C';
    accent = '#C2410C';
    emoji = '🎈';
    chip = '¡SE VIENE!';
    titulo = `Inscripciones ${config.año} muy pronto`;
    subtitulo = '¡Preparate que arranca la aventura! 🚀✨';
    wiggle = true;
    highlights = [
      {
        icon: '🥇',
        label: 'Apertura anticipada',
        value: fmtFechaHora(config.apertura_anticipada),
        sub: `${diffHumano(new Date(config.apertura_anticipada))} · solo Tíos y Jefes Jóvenes 🧡`,
        color: '#3B82F6',
      },
      {
        icon: '🌟',
        label: 'Apertura general',
        value: fmtFechaHora(config.apertura_general),
        sub: 'Todos los misioneros e hijos 💛',
        color: '#10B981',
      },
      {
        icon: '🔒',
        label: 'Cierre',
        value: fmtFechaHora(config.cierre),
        color: '#EF4444',
      },
    ];
  } else if (estado === 'fase_anticipada') {
    gradient = ['#DBEAFE', '#BFDBFE'];
    border = '#3B82F6';
    accent = '#1D4ED8';
    emoji = '🥇';
    chip = '¡YA ABRIÓ!';
    titulo = `Apertura anticipada ${config.año} activa`;
    subtitulo = 'Hoy se inscriben SOLO 🧡 Tíos y Jefes Jóvenes';
    highlights = [
      {
        icon: '🌟',
        label: 'Apertura general (todos)',
        value: fmtFechaHora(config.apertura_general),
        sub: diffHumano(new Date(config.apertura_general)),
        color: '#10B981',
      },
      {
        icon: '🔒',
        label: 'Cierre',
        value: fmtFechaHora(config.cierre),
        color: '#EF4444',
      },
    ];
    cta = { label: '✍️ Inscribirme (Tío / Jefe Joven)', onPress: () => router.push('/inscribir') };
  } else if (estado === 'fase_general') {
    gradient = ['#D1FAE5', '#A7F3D0'];
    border = '#10B981';
    accent = '#047857';
    emoji = '🎉';
    chip = '¡ABIERTAS!';
    titulo = `Inscripciones ${config.año} ABIERTAS`;
    subtitulo = 'Tíos, Misioneros e Hijos: ¡a inscribirse! 🚀💛';
    wiggle = true;
    highlights = [
      {
        icon: '🔒',
        label: 'Cierran',
        value: fmtFechaHora(config.cierre),
        sub: diffHumano(new Date(config.cierre)),
        color: '#EF4444',
      },
    ];
    cta = { label: '✍️ ¡Quiero inscribirme!', onPress: () => router.push('/inscribir') };
  } else if (estado === 'cerrado_despues') {
    gradient = ['#FEE2E2', '#FECACA'];
    border = '#EF4444';
    accent = '#991B1B';
    emoji = '🔒';
    chip = 'CERRADAS';
    titulo = `Inscripciones ${config.año} cerradas`;
    subtitulo = '¡Nos vemos el próximo año! 💛✨';
    highlights = [
      {
        icon: '📅',
        label: 'Cerraron el',
        value: fmtFechaHora(config.cierre),
        color: '#6B7280',
      },
    ];
  }

  // Web: aplicamos clase para animación de wiggle al emoji
  const emojiExtra: any = wiggle ? { className: 'mfs-wiggle' } : {};

  return (
    <View
      style={{
        width: '100%',
        padding: 20,
        borderRadius: radius.xl,
        backgroundColor: gradient[1],
        // @ts-ignore - web only
        backgroundImage: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        borderWidth: 2,
        borderColor: border,
        gap: 14,
        // @ts-ignore
        boxShadow: `0 10px 30px -10px ${border}66`,
      }}
    >
      {/* Header con chip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text {...emojiExtra} style={{ fontSize: 44 }}>{emoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: border,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
              {chip}
            </Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#111827', lineHeight: 24 }}>
            {titulo}
          </Text>
          <Text style={{ fontSize: 13, color: accent, fontWeight: '600' }}>
            {subtitulo}
          </Text>
        </View>
      </View>

      {/* Highlights tipo cards */}
      <View style={{ gap: 8 }}>
        {highlights.map((h, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderRadius: radius.md,
              padding: 10,
              borderLeftWidth: 4,
              borderLeftColor: h.color,
            }}
          >
            <Text style={{ fontSize: 22 }}>{h.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: h.color, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                {h.label}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                {h.value}
              </Text>
              {h.sub ? (
                <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{h.sub}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {cta ? (
        <Pressable
          onPress={cta.onPress}
          style={({ pressed }) => ({
            marginTop: 4,
            backgroundColor: border,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: radius.lg,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
            // @ts-ignore
            boxShadow: `0 6px 16px -4px ${border}99`,
          })}
          accessibilityRole="button"
        >
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 }}>
            {cta.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
