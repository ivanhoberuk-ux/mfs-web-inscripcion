// app/_layout.tsx
import { Stack } from 'expo-router'
import React from 'react'
import { View, Text, Image } from 'react-native'
import { AuthProvider } from '../src/context/AuthProvider'
import { colors, spacing, typography, radius, shadows } from '../src/lib/designSystem'
import { ChatWidget } from '../src/components/ChatWidget'
// @ts-ignore
import logoMfs from '../src/assets/mfs-logo.png'

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: colors.background.light }}>
        {/* Header con logo MFS */}
        <View
          style={{
            backgroundColor: colors.primary[600],
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
            ...shadows.md,
          }}
        >
          <View
            style={{
              maxWidth: 1100,
              width: '100%',
              marginLeft: 'auto',
              marginRight: 'auto',
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            {/* Logo en círculo amarillo */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.full,
                backgroundColor: colors.secondary[500],
                alignItems: 'center',
                justifyContent: 'center',
                ...shadows.sm,
              }}
            >
              <Image
                source={logoMfs}
                style={{ width: 38, height: 38, resizeMode: 'contain' }}
                accessibilityLabel="Logo MFS Paraguay"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.extrabold,
                  color: '#ffffff',
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                MFS Paraguay
              </Text>
              <Text
                style={{
                  fontSize: typography.size.xs,
                  color: colors.secondary[200],
                  fontWeight: typography.weight.medium,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                Misiones Familiares de Schoenstatt 💛
              </Text>
            </View>
          </View>
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

        {/* Chat Widget flotante */}
        <ChatWidget />
      </View>
    </AuthProvider>
  )
}
