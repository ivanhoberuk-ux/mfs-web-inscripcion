// app/_layout.tsx
import { Stack } from 'expo-router'
import React from 'react'
import { View, Text } from 'react-native'
import { AuthProvider } from '../src/context/AuthProvider'
import { colors, spacing, typography } from '../src/lib/designSystem'

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: colors.background.light }}>
        {/* Header mejorado */}
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xl,
            paddingBottom: spacing.md,
            backgroundColor: colors.surface.light,
            borderBottomWidth: 1,
            borderBottomColor: colors.neutral[200],
          }}
        >
          <Text style={{ 
            fontSize: typography.size.xl, 
            fontWeight: typography.weight.bold,
            color: colors.primary[600],
            letterSpacing: -0.5,
          }}>
            Misiones Familiares Schoenstattianas
          </Text>
          <Text style={{ 
            fontSize: typography.size.sm, 
            color: colors.text.tertiary.light,
            marginTop: spacing.xs,
          }}>
            Paraguay
          </Text>
        </View>

        {/* Navegación principal */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.light },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </View>
    </AuthProvider>
  )
}
