import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps, ViewStyle, TextStyle, Platform } from 'react-native';
import { s, colors } from '../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
  textStyle?: TextStyle;
}

export function Button({ 
  variant = 'secondary', 
  loading = false, 
  disabled, 
  children, 
  style, textStyle,
  ...props 
}: ButtonProps) {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return s.buttonPrimary;
      case 'secondary':
        return s.buttonSecondary;
      case 'danger':
        return s.buttonDanger;
      case 'outline':
        return s.buttonOutline;
      case 'ghost':
        return s.buttonGhost;
      default:
        return s.buttonSecondary;
    }
  };

  const getTextStyle = (): TextStyle => {
    if (variant === 'outline' || variant === 'ghost') {
      return s.buttonTextOutline;
    }
    return s.buttonText;
  };

  return (
    <Pressable
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        s.button, getVariantStyle(), disabled && s.buttonDisabled,
        Platform.OS === 'web' && hovered && { opacity: 0.92 },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        typeof style === 'function' ? style({ pressed, hovered } as any) : style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary[500] : colors.surface.light} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
}
