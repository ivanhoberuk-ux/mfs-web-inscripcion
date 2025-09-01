// FILE: app/(tabs)/index.tsx
import React, { useState } from 'react';
import { ScrollView, View, Image, Text, Pressable } from 'react-native';
import { s } from '../../src/lib/theme';
import { publicUrl } from '../../src/lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();

  // URL pública del logo en Supabase Storage
  const LOGO_URL = publicUrl('logos', 'mfs-logo.png') + `?cb=${Date.now()}`;
  const [loadErr, setLoadErr] = useState(false);

  // (opcional) cache-buster si reemplazás el archivo y no se actualiza al toque:
  // const LOGO_URL = publicUrl('plantillas', 'mfs-logo.png') + `?cb=${Date.now()}`;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{
        paddingVertical: 40,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 20,
        paddingBottom: 100, // evita que tape la tab bar
      }}
    >
      {/* Tarjeta con el logo */}
      <View
        style={{
          width: 220,
          height: 220,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {!loadErr ? (
          <Image
            source={{ uri: LOGO_URL }}
            style={{ width: '90%', height: '90%', resizeMode: 'contain' }}
            accessibilityLabel="Logo Misiones Familiares de Schoenstatt"
            onError={() => setLoadErr(true)}
          />
        ) : (
          <Text style={[s.small, { color: '#666', padding: 12, textAlign: 'center' }]}>
            No se pudo cargar el logo
          </Text>
        )}
      </View>

      {/* Texto de bienvenida (texto pedido literalmente) */}
      <Text style={[s.title, { textAlign: 'center' }]}>
        Bienvenido a la aplicacion de incripcion a las MFS
      </Text>

      {/* Acciones rápidas */}
      <View
        style={{
          width: '100%',
          gap: 12,
        }}
      >
        <QuickButton
          icon="person-add-outline"
          label="Inscribirme"
          onPress={() => router.push('/inscribir')}
        />
        <QuickButton
          icon="document-text-outline"
          label="Documentos"
          onPress={() => router.push('/documentos')}
        />
        <QuickButton
          icon="settings-outline"
          label="Admin"
          onPress={() => router.push('/admin')}
        />
      </View>
    </ScrollView>
  );
}

type QuickProps = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };

function QuickButton({ icon, label, onPress }: QuickProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingVertical: 14,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
