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
    fontFamily: typography.family.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary.light,
    marginBottom: spacing.sm,
    fontFamily: typography.family.bold,
    letterSpacing: -0.3,
  },
  text: {
    fontSize: typography.size.base,
    color: colors.text.secondary.light,
    fontFamily: typography.family.regular,
  },
  small: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary.light,
    fontFamily: typography.family.regular,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary.light,
    marginBottom: spacing.xs,
    fontFamily: typography.family.medium,
  },
  
  // Cards
  card: {
    backgroundColor: colors.surface.light,
    padding: spacing.xl,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary.light,
    marginBottom: spacing.xs,
    fontFamily: typography.family.bold,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#E3E6F3',
    backgroundColor: colors.surface.light,
    borderRadius: radius.md,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary.light,
    fontFamily: typography.family.regular,
  },
  inputFocused: {
    borderColor: colors.primary[500],
    borderWidth: 2,
    shadowColor: colors.primary[500],
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  
  // Botones
  button: {
    backgroundColor: colors.secondary[500],
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  buttonText: {
    color: colors.surface.light,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.base,
    fontFamily: typography.family.semibold,
  },
  buttonTextOutline: {
    color: colors.primary[500],
    fontFamily: typography.family.semibold,
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
export { colors, typography, spacing, radius, shadows, opacity, animation, gradients } from './designSystem';
