import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/designSystem';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<BadgeTone, { backgroundColor: string; color: string }> = {
  primary: { backgroundColor: colors.primary[50], color: colors.primary[700] },
  success: { backgroundColor: colors.mint[100], color: colors.mint[600] },
  warning: { backgroundColor: colors.secondary[100], color: colors.secondary[800] },
  danger: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  neutral: { backgroundColor: colors.neutral[100], color: colors.text.secondary.light },
};

export function Badge({ children, tone = 'neutral', style, ...props }: ViewProps & { children: React.ReactNode; tone?: BadgeTone }) {
  const palette = tones[tone];
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: palette.backgroundColor, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }, style]} {...props}>
      <Text style={{ color: palette.color, fontFamily: typography.family.semibold, fontSize: typography.size.xs }}>{children}</Text>
    </View>
  );
}