// FILE: src/components/TorneoLlaves.tsx
// Cuadro de eliminatorias por disciplina: una columna por fase, con scroll horizontal en celular
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { s, colors } from '../lib/theme';
import { radius, spacing } from '../lib/designSystem';
import { shadows, typography } from '../lib/designSystem';
import { Badge } from './Badge';
import {
  type TorneoDisciplina, type TorneoPartido,
  nombreEquipo, ganadorPartido, FASE_LABEL, fmtDia, fmtHora,
} from '../lib/torneo';

const FASES = ['cuartos', 'semifinal', 'final', 'tercer_puesto'];

function Fila({ nombre, marcador, penales, gana }: { nombre: string; marcador: number | null; penales: number | null; gana: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8,
      backgroundColor: gana ? colors.mint[100] : 'transparent', borderRadius: radius.sm, borderLeftWidth: gana ? 3 : 0, borderLeftColor: colors.mint[500],
    }}>
      <Text style={{ flex: 1, fontWeight: gana ? '900' : '600', color: colors.neutral[800], fontSize: 13 }} numberOfLines={1}>
        {nombre}
      </Text>
      <Text style={{ fontWeight: '900', color: colors.primary[700], marginLeft: 6 }}>
        {marcador ?? ''}{penales != null ? ` (${penales})` : ''}
      </Text>
    </View>
  );
}

function Tarjeta({ p }: { p: TorneoPartido }) {
  const g = ganadorPartido(p);
  const nomA = p.equipo_a ? nombreEquipo(p.equipo_a as any) : (p.etiqueta_a ?? 'A definir');
  const nomB = p.equipo_b ? nombreEquipo(p.equipo_b as any) : (p.etiqueta_b ?? 'A definir');
  return (
    <View style={{
      width: 220, backgroundColor: colors.surface.light, borderRadius: radius.lg, marginBottom: 14, padding: 6,
      borderWidth: 1, borderColor: p.estado === 'en_juego' ? colors.mint[500] : colors.primary[100], ...shadows.sm,
    }}>
      <Fila nombre={nomA} marcador={p.marcador_a} penales={p.penales_a} gana={g === 'a'} />
      <View style={{ height: 1, backgroundColor: colors.neutral[100] }} />
      <Fila nombre={nomB} marcador={p.marcador_b} penales={p.penales_b} gana={g === 'b'} />
      <Text style={{ fontSize: 10, color: colors.neutral[500], textAlign: 'center', marginTop: 2 }}>
        {p.estado === 'en_juego' ? 'En juego' : p.inicio ? `${fmtDia(p.inicio)} ${fmtHora(p.inicio)}` : 'Horario a confirmar'}
      </Text>
    </View>
  );
}

export function Llaves({ disciplinas, partidos }: { disciplinas: TorneoDisciplina[]; partidos: TorneoPartido[] }) {
  return (
    <View>
      {disciplinas.map((d) => {
        const elim = partidos.filter((p) => p.disciplina_id === d.id && p.fase !== 'grupos');
        const fases = FASES.filter((f) => elim.some((p) => p.fase === f));
        const otras = Array.from(new Set(elim.map((p) => p.fase))).filter((f) => !FASES.includes(f));
        const columnas = [...fases, ...otras];
        return (
          <View key={d.id} style={[s.card, { marginBottom: spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><Text style={s.cardTitle}>{d.emoji} {d.nombre}</Text><Badge tone="primary">Eliminatorias</Badge></View>
            {columnas.length === 0 ? (
              <Text style={s.small}>Todavía no hay llaves de eliminación.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                {columnas.map((f) => (
                  <View key={f} style={{ marginRight: 28, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.primary[100], paddingTop: 10 }}>
                    <Text style={{ fontFamily: typography.family.bold, color: colors.primary[700], marginBottom: 10, textAlign: 'center' }}>
                      {FASE_LABEL[f] ?? f}
                    </Text>
                    {elim.filter((p) => p.fase === f)
                      .sort((a, b) => (a.ronda - b.ronda) || (a.inicio ?? '').localeCompare(b.inicio ?? ''))
                      .map((p) => <Tarjeta key={p.id} p={p} />)}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default Llaves;
