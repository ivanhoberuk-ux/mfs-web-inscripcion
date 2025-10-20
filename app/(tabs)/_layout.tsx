// FILE: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthProvider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';

function useIsAdmin(user: any): boolean {
  if (!user) return false;
  const um = user?.user_metadata ?? {};
  const am = user?.app_metadata ?? {};
  if (um?.is_admin === true) return true;
  if (Array.isArray(am?.roles) && am.roles.includes('admin')) return true;
  if (user?.role === 'admin' || user?.is_admin === true) return true;
  return false;
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user);
  
  // Durante la carga inicial, ocultar tabs condicionales para evitar hydration mismatch
  const showInscriptos = !loading && !!user;
  const showAdmin = !loading && isAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a7ea4',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12 },
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
            <Ionicons name="home-sharp" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inscribir"
        options={{
          title: 'Inscribirme',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pueblos"
        options={{
          title: 'Pueblos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscador"
        options={{
          title: 'Buscador',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documentos"
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="reader" size={size} color={color} />
          ),
        }}
      />

      {/* Inscriptos: solo visible para usuarios logueados */}
      <Tabs.Screen
        name="inscriptos"
        options={{
          href: showInscriptos ? undefined : null,
          title: 'Inscriptos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-circle" size={size} color={color} />
          ),
        }}
      />

      {/* Admin: solo visible para admins */}
      <Tabs.Screen
        name="admin"
        options={{
          href: showAdmin ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />

      {/* Rutas que no deben verse como tab */}
      <Tabs.Screen name="firma" options={{ href: null }} />
    </Tabs>
  );
}
