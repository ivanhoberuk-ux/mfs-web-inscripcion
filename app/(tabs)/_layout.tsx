// FILE: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthProvider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Fetch admin status from server-side user_roles table
  useEffect(() => {
    let mounted = true;
    
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setRolesLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (mounted) {
          setIsAdmin(!!data);
          setRolesLoading(false);
        }
      } catch (e) {
        console.error('Error checking admin status:', e);
        if (mounted) {
          setIsAdmin(false);
          setRolesLoading(false);
        }
      }
    }

    checkAdminStatus();
    return () => { mounted = false };
  }, [user]);
  
  // Durante la carga inicial, ocultar tabs condicionales para evitar hydration mismatch
  const showInscriptos = !loading && !rolesLoading && !!user;
  const showAdmin = !loading && !rolesLoading && isAdmin;

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

      <Tabs.Screen
        name="baja"
        options={{
          title: 'Dar de baja',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="close-circle" size={size} color={color} />
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
      <Tabs.Screen name="test-email" options={{ href: showAdmin ? undefined : null, title: 'Test Email' }} />
    </Tabs>
  );
}
