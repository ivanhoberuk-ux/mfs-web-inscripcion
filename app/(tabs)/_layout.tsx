// FILE: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a7ea4',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12 },
        // ⚠️ No fijes height. Dejá que use el safe area.
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 10 : 8,
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inscribir"
        options={{
          title: 'Inscribirme',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pueblos"
        options={{
          title: 'Pueblos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscador"
        options={{
          title: 'Buscador',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documentos"
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Si 'firma' existe pero no querés que sea tab visible */}
      <Tabs.Screen name="firma" options={{ href: null }} />
    </Tabs>
  );
}
