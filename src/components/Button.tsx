import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { s, colors } from '../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'secondary', 
  loading = false, 
  disabled, 
  children, 
  style,
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
      default:
        return s.buttonSecondary;
    }
  };

  const getTextStyle = (): TextStyle => {
    if (variant === 'outline') {
      return s.buttonTextOutline;
    }
    return s.buttonText;
  };

  return (
    <TouchableOpacity
      style={[
        s.button,
        getVariantStyle(),
        disabled && s.buttonDisabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary[500] : colors.surface.light} />
      ) : (
        <Text style={getTextStyle()}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
