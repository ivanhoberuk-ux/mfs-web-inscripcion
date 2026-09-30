import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../lib/designSystem';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function PageHeader({ icon, title, subtitle, trailing }: { icon: IconName; title: string; subtitle?: string; trailing?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl, width: '100%' }}>
      <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={colors.primary[600]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: typography.family.extrabold, fontSize: typography.size['2xl'], color: colors.text.primary.light }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.text.secondary.light, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function SectionHeader({ step, icon, title, subtitle }: { step?: number; icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
      <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }}>
        {step ? <Text style={{ fontFamily: typography.family.extrabold, fontSize: typography.size.base, color: colors.primary[700] }}>{step}</Text> : <Ionicons name={icon} size={21} color={colors.primary[600]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.text.primary.light }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.text.tertiary.light, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function InitialAvatar({ name, tone = 'primary' }: { name: string; tone?: 'primary' | 'mint' | 'coral' }) {
  const backgroundColor = tone === 'mint' ? colors.mint[100] : tone === 'coral' ? colors.accent[100] : colors.primary[100];
  const color = tone === 'mint' ? colors.mint[600] : tone === 'coral' ? colors.accent[700] : colors.primary[700];
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'M';
  return <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color }}>{initials}</Text></View>;
}