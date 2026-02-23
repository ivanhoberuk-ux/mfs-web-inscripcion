// FILE: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthProvider';
import { Platform, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/designSystem';

// Componente de icono con emoji
function EmojiIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center',
      transform: [{ scale: focused ? 1.1 : 1 }],
    }}>
      <Text style={{ fontSize: focused ? 18 : 16 }}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPuebloAdmin, setIsPuebloAdmin] = useState(false);
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
          .eq('user_id', user.id);

        if (mounted) {
          const roles = data?.map(r => r.role) || [];
          setIsAdmin(roles.includes('admin'));
          setIsPuebloAdmin(roles.includes('pueblo_admin') || roles.includes('co_admin_pueblo'));
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
  const showInscriptos = !loading && !rolesLoading && !!user && (isAdmin || isPuebloAdmin);
  const showAdmin = !loading && !rolesLoading && isAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.text.tertiary.light,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { 
          fontSize: 9, 
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          paddingTop: 4,
          paddingBottom: Platform.OS === 'ios' ? 20 : 6,
          height: Platform.OS === 'ios' ? 75 : 56,
          backgroundColor: colors.surface.light,
          borderTopColor: colors.primary[100],
          borderTopWidth: 2,
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inscribir"
        options={{
          title: 'Inscribirme',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="✍️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pueblos"
        options={{
          title: 'Pueblos',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="🏕️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscador"
        options={{
          title: 'Buscador',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="🔍" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="documentos"
        options={{
          title: 'Docs',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="📄" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="baja"
        options={{
          title: 'Baja',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="👋" focused={focused} />
          ),
        }}
      />

      {/* Inscriptos: solo visible para usuarios logueados */}
      <Tabs.Screen
        name="inscriptos"
        options={{
          href: showInscriptos ? undefined : null,
          title: 'Inscriptos',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="👥" focused={focused} />
          ),
        }}
      />

      {/* Admin: solo visible para admins */}
      <Tabs.Screen
        name="admin"
        options={{
          href: showAdmin ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="⚙️" focused={focused} />
          ),
        }}
      />

      {/* Histórico: solo visible para admins */}
      <Tabs.Screen
        name="historico"
        options={{
          href: showAdmin ? undefined : null,
          title: 'Histórico',
          tabBarIcon: ({ focused }) => (
            <EmojiIcon emoji="📊" focused={focused} />
          ),
        }}
      />

      {/* Rutas que no deben verse como tab */}
      <Tabs.Screen name="firma" options={{ href: null }} />
      <Tabs.Screen name="test-email" options={{ href: showAdmin ? undefined : null, title: 'Test' }} />
    </Tabs>
  );
}
