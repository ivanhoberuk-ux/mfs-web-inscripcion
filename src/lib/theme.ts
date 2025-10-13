import { StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows, opacity } from './designSystem';

// Theme usando tokens del sistema de diseño
export const s = StyleSheet.create({
  // Pantallas
  screen: {
    flex: 1,
    backgroundColor: colors.background.light,
    padding: spacing.lg,
  },
  
  // Tipografía
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary.light,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary.light,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: typography.size.base,
    color: colors.text.secondary.light,
  },
  small: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary.light,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary.light,
    marginBottom: spacing.xs,
  },
  
  // Cards
  card: {
    backgroundColor: colors.surface.light,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary.light,
    marginBottom: spacing.xs,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface.light,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary.light,
  },
  inputFocused: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  
  // Botones
  button: {
    backgroundColor: colors.secondary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary[500],
  },
  buttonSecondary: {
    backgroundColor: colors.secondary[500],
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  buttonText: {
    color: colors.surface.light,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.base,
  },
  buttonTextOutline: {
    color: colors.primary[500],
  },
  
  // Layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  
  // Chips/Tags
  chip: {
    backgroundColor: colors.secondary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.secondary[700],
  },
  chipSuccess: {
    backgroundColor: colors.secondary[50],
  },
  chipWarning: {
    backgroundColor: '#fef3c7',
  },
  chipError: {
    backgroundColor: '#fee2e2',
  },
  
  // Estados
  disabled: {
    opacity: opacity.disabled,
  },
  
  // Espaciado helpers
  mt1: { marginTop: spacing.xs },
  mt2: { marginTop: spacing.sm },
  mt3: { marginTop: spacing.md },
  mt4: { marginTop: spacing.lg },
  mb1: { marginBottom: spacing.xs },
  mb2: { marginBottom: spacing.sm },
  mb3: { marginBottom: spacing.md },
  mb4: { marginBottom: spacing.lg },
  p1: { padding: spacing.xs },
  p2: { padding: spacing.sm },
  p3: { padding: spacing.md },
  p4: { padding: spacing.lg },
});

// Re-exportar tokens para uso directo
export { colors, typography, spacing, radius, shadows, opacity, animation } from './designSystem';
