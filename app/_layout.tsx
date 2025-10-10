// app/_layout.tsx
import { Stack } from 'expo-router'
import React from 'react'
import { View, Text } from 'react-native'
import { AuthProvider } from '../src/context/AuthProvider'

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#f7f9fb' }}>
        {/* Header simple y reutilizable */}
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Misiones Familiares Schoenstattianas del Paraguay</Text>
        </View>

        {/* Navegación principal */}
        <Stack
          screenOptions={{
            headerShown: false,
            // Fondo homogéneo para todas las pantallas
            contentStyle: { backgroundColor: '#f7f9fb' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </View>
    </AuthProvider>
  )
}
