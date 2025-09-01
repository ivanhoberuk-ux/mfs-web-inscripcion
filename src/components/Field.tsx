import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { s } from '../lib/theme';
export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (<View style={{ marginBottom: 10 }}><Text style={s.label}>{label}</Text><TextInput style={s.input} {...props} /></View>);
}
