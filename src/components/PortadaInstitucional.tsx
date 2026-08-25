// FILE: src/components/PortadaInstitucional.tsx
// Portada institucional: se muestra entre temporadas, cuando las misiones ya terminaron
// y todavía no se abrieron las inscripciones del próximo año.
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, shadows } from '../lib/designSystem';

type Resumen = { misioneros: number; pueblos: number };

export function PortadaInstitucional({ año }: { año: number | null }) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!año) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('registros')
          .select('pueblo_id')
          .eq('año', año)
          .eq('estado', 'confirmado')
          .is('deleted_at', null)
          .eq('no_clasifico', false);
        if (error) throw error;
        const rows = (data ?? []) as { pueblo_id: string }[];
        if (mounted) {
          setResumen({
            misioneros: rows.length,
            pueblos: new Set(rows.map(r => r.pueblo_id).filter(Boolean)).size,
          });
        }
      } catch (e) {
        console.warn('No se pudo cargar el resumen institucional:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [año]);

  const proximo = año ? año + 1 : null;

  return (
    <View style={{ width: '100%', gap: 16 }}>
      {/* Misión finalizada */}
      <View
        style={{
          width: '100%',
          padding: 20,
          borderRadius: radius.xl,
          backgroundColor: colors.primary[50],
          borderWidth: 2,
          borderColor: colors.secondary[400],
          gap: 12,
          ...shadows.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 40 }}>🙏</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.secondary[500],
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: colors.primary[800], fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                MISIÓN FINALIZADA
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary[700], lineHeight: 25 }}>
              ¡Gracias por las Misiones {año ?? ''}! 💛
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary.light, lineHeight: 18 }}>
              Con María, de la mano del Padre, llevamos el Evangelio a cada pueblo. Hasta la próxima misión 🌹
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary[500]} />
        ) : resumen ? (
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Stat emoji="🧑‍🤝‍🧑" valor={String(resumen.misioneros)} label="misioneros" />
            <Stat emoji="🏕️" valor={String(resumen.pueblos)} label="pueblos" />
          </View>
        ) : null}
      </View>

      {/* Próximas inscripciones */}
      <View
        style={{
          width: '100%',
          padding: 20,
          borderRadius: radius.xl,
          backgroundColor: colors.surface.light,
          borderWidth: 2,
          borderColor: colors.primary[100],
          gap: 8,
          ...shadows.sm,
        }}
      >
        <Text style={{ fontSize: 34 }}>📅</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary[700] }}>
          Inscripciones {proximo ?? ''} próximamente
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.secondary.light, lineHeight: 19 }}>
          Todavía no están abiertas las inscripciones para la próxima misión. Cuando se habiliten, vas a poder
          inscribirte desde acá y te avisamos por nuestras redes. ¡Seguí atento! ✨
        </Text>
      </View>

      {/* Contacto */}
      <View
        style={{
          width: '100%',
          padding: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surface.light,
          borderLeftWidth: 4,
          borderLeftColor: colors.secondary[500],
          gap: 4,
          ...shadows.sm,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary[700] }}>
          ¿Querés más información? 💬
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.secondary.light, lineHeight: 19 }}>
          Escribinos a mfspy.org.py o contactate con el coordinador de tu pueblo. También podés seguirnos en
          nuestras redes para enterarte de todas las novedades de las Misiones Familiares de Schoenstatt Paraguay.
        </Text>
      </View>
    </View>
  );
}

function Stat({ emoji, valor, label }: { emoji: string; valor: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary[700] }}>{valor}</Text>
        <Text style={{ fontSize: 11, color: colors.text.secondary.light, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
