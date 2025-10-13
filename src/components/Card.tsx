import React from 'react';
import { View, ViewProps } from 'react-native';
import { s } from '../lib/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[s.card, style]} {...props}>
      {children}
    </View>
  );
}
