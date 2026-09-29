// app/_layout.tsx
import { Stack } from 'expo-router'
import React from 'react'
import { View } from 'react-native'
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans'
import { AuthProvider } from '../src/context/AuthProvider'
import { colors } from '../src/lib/designSystem'
import { ChatWidget } from '../src/components/ChatWidget'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  })

  return (
    <AuthProvider>
      <View key={fontsLoaded ? 'fonts-ready' : 'fonts-loading'} style={{ flex: 1, backgroundColor: colors.background.light }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.light },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="operador" options={{ headerShown: false }} />
        </Stack>

        {/* Chat Widget flotante */}
        <ChatWidget />
      </View>
    </AuthProvider>
  )
}
