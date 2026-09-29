// FILE: src/components/PortadaInstitucional.tsx
// Portada institucional: se muestra entre temporadas, cuando las misiones ya terminaron
// y todavía no se abrieron las inscripciones del próximo año.
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, radius, typography } from '../lib/designSystem';
import { Card } from './Card';

export type ResumenPublicoTemporada = { año: number; misioneros: number; pueblos: number };

export function useResumenPublicoTemporada(año: number | null) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenPublicoTemporada | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!año) { setLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('resumen_publico_temporada', { p_año: año });
        if (error) throw error;
        const value = data as Partial<ResumenPublicoTemporada> | null;
        if (mounted) setResumen({
          año: Number(value?.año ?? año),
          misioneros: Number(value?.misioneros ?? 0),
          pueblos: Number(value?.pueblos ?? 0),
        });
      } catch (e) {
        console.warn('No se pudo cargar el resumen institucional:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [año]);

  return { resumen, loading };
}

export function PortadaInstitucional({ año, resumen, loading }: { año: number | null; resumen: ResumenPublicoTemporada | null; loading: boolean }) {

  const proximo = año ? año + 1 : null;

  return (
    <View style={{ width: '100%', gap: 16 }}>
      {/* Misión finalizada */}
      <Card
        style={{
          width: '100%',
          backgroundColor: colors.primary[50],
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surface.light, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart-outline" size={23} color={colors.primary[600]} />
          </View>
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
              <Text style={{ color: colors.primary[900], fontSize: 11, fontFamily: typography.family.bold, letterSpacing: 0.8 }}>
                MISIÓN FINALIZADA
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: typography.family.extrabold, color: colors.text.primary.light, lineHeight: 25 }}>
              ¡Gracias por las Misiones {año ?? ''}!
            </Text>
            <Text style={{ fontSize: 13, fontFamily: typography.family.regular, color: colors.text.secondary.light, lineHeight: 18 }}>
              Con María, de la mano del Padre, llevamos el Evangelio a cada pueblo. Hasta la próxima misión.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary[500]} />
        ) : resumen ? (
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Stat icon="people-outline" valor={String(resumen.misioneros)} label="misioneros" />
            <Stat icon="map-outline" valor={String(resumen.pueblos)} label="pueblos" />
          </View>
        ) : null}
      </Card>

      {/* Próximas inscripciones */}
      <Card style={{ width: '100%', gap: 8 }}>
        <Ionicons name="calendar-outline" size={30} color={colors.primary[600]} />
        <Text style={{ fontSize: 18, fontFamily: typography.family.extrabold, color: colors.text.primary.light }}>
          Inscripciones {proximo ?? ''} próximamente
        </Text>
        <Text style={{ fontSize: 13, fontFamily: typography.family.regular, color: colors.text.secondary.light, lineHeight: 19 }}>
          Todavía no están abiertas las inscripciones para la próxima misión. Cuando se habiliten, vas a poder
          inscribirte desde acá y te avisamos por nuestras redes. ¡Seguí atento!
        </Text>
      </Card>

      {/* Contacto */}
      <Card style={{ width: '100%', gap: 4 }}>
        <Text style={{ fontSize: 15, fontFamily: typography.family.extrabold, color: colors.text.primary.light }}>
          ¿Querés más información?
        </Text>
        <Text style={{ fontSize: 13, fontFamily: typography.family.regular, color: colors.text.secondary.light, lineHeight: 19 }}>
          Escribinos a mfspy.org.py o contactate con el coordinador de tu pueblo. También podés seguirnos en
          nuestras redes para enterarte de todas las novedades de las Misiones Familiares de Schoenstatt Paraguay.
        </Text>
      </Card>
    </View>
  );
}

function Stat({ icon, valor, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; valor: string; label: string }) {
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
      <Ionicons name={icon} size={21} color={colors.primary[600]} />
      <View>
        <Text style={{ fontSize: 18, fontFamily: typography.family.extrabold, color: colors.text.primary.light }}>{valor}</Text>
        <Text style={{ fontSize: 11, fontFamily: typography.family.medium, color: colors.text.secondary.light, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
