import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { s } from '../lib/theme';
export function Field({ label, style, onFocus, onBlur, ...props }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, focused && s.inputFocused, style]}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        {...props}
      />
    </View>
  );
}
