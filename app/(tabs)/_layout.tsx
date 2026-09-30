import React, { useEffect, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, shadows, spacing, typography } from '../../src/lib/designSystem';
import { useTemporada } from '../../src/hooks/useTemporada';
import { FondoParaguayo, LineaTricolor } from '../../src/components/FondoParaguayo';
// @ts-ignore
import logoMfs from '../../src/assets/mfs-logo.png';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={{
      minWidth: 38, height: 30, paddingHorizontal: 10, borderRadius: radius.full,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? colors.primary[100] : 'transparent',
    }}>
      <Ionicons name={name} size={21} color={focused ? colors.primary[600] : colors.text.tertiary.light} />
    </View>
  );
}

type NavItem = { label: string; path: string; icon: IconName; visible: boolean };

function DesktopHeader({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{
      zIndex: 30, backgroundColor: 'rgba(255,255,255,0.94)', borderBottomWidth: 1,
      borderBottomColor: colors.primary[50], ...shadows.sm,
      // @ts-ignore web only
      backdropFilter: 'blur(18px)',
    }}>
      <View style={{
        width: '100%', maxWidth: 1120, minHeight: 72, alignSelf: 'center', paddingHorizontal: spacing.xl,
        flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
      }}>
        <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.secondary[100], alignItems: 'center', justifyContent: 'center' }}>
            <Image source={logoMfs} style={{ width: 34, height: 34, resizeMode: 'contain' }} accessibilityLabel="MFS Paraguay" />
          </View>
          <View>
            <Text style={{ fontFamily: typography.family.extrabold, fontSize: 15, color: colors.primary[900] }}>MFS Paraguay</Text>
            <Text style={{ fontFamily: typography.family.medium, fontSize: 10, color: colors.text.tertiary.light }}>Familias en misión</Text>
          </View>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', gap: 3 }}>
          {items.filter(item => item.visible).map(item => {
            const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            return (
              <Pressable key={item.path} onPress={() => router.push(item.path as never)} style={({ pressed, hovered }: any) => ({
                minHeight: 40, paddingHorizontal: 12, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: active ? colors.primary[50] : hovered ? colors.neutral[50] : 'transparent', opacity: pressed ? 0.75 : 1,
              })}>
                <Ionicons name={item.icon} size={16} color={active ? colors.primary[600] : colors.text.secondary.light} />
                <Text style={{ fontFamily: typography.family.semibold, fontSize: 12, color: active ? colors.primary[700] : colors.text.secondary.light }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {user ? (
          <View>
            <Pressable onPress={() => setMenuOpen(value => !value)} style={({ pressed }) => ({
              height: 42, maxWidth: 180, paddingHorizontal: 12, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.primary[50], opacity: pressed ? 0.8 : 1,
            })}>
              <View style={{ width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 12 }}>{(user.email?.[0] ?? 'M').toUpperCase()}</Text>
              </View>
              <Text numberOfLines={1} style={{ maxWidth: 105, color: colors.primary[900], fontFamily: typography.family.semibold, fontSize: 11 }}>{user.email}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary[600]} />
            </Pressable>
            {menuOpen ? (
              <View style={{ position: 'absolute', right: 0, top: 48, width: 190, padding: 8, borderRadius: radius.md, backgroundColor: colors.surface.light, ...shadows.md, borderWidth: 1, borderColor: colors.primary[50] }}>
                <Pressable onPress={async () => { setMenuOpen(false); await signOut(); }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 10, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="log-out-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontFamily: typography.family.semibold, fontSize: 13 }}>Cerrar sesión</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable onPress={() => router.push('/login')} style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 20, borderRadius: radius.full, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 13 }}>Entrar</Text>
          </Pressable>
        )}
      </View>
      <LineaTricolor />
    </View>
  );
}

function MobileTabBackground() {
  return (
    <View style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.96)' }}>
      <LineaTricolor />
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPuebloAdmin, setIsPuebloAdmin] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const { esInstitucional, loading: temporadaLoading } = useTemporada();

  useEffect(() => {
    let mounted = true;
    async function checkAdminStatus() {
      if (!user) { setIsAdmin(false); setIsPuebloAdmin(false); setRolesLoading(false); return; }
      try {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (mounted) {
          const roles = data?.map(r => r.role) || [];
          setIsAdmin(roles.includes('admin'));
          setIsPuebloAdmin(roles.includes('pueblo_admin') || roles.includes('co_admin_pueblo'));
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (mounted) { setIsAdmin(false); setIsPuebloAdmin(false); }
      } finally { if (mounted) setRolesLoading(false); }
    }
    checkAdminStatus();
    return () => { mounted = false; };
  }, [user]);

  const showInscriptos = !loading && !rolesLoading && !!user && (isAdmin || isPuebloAdmin);
  const showAdmin = !loading && !rolesLoading && isAdmin;
  const modoMision = temporadaLoading || !esInstitucional;
  const navItems: NavItem[] = [
    { label: 'Inicio', path: '/', icon: 'home-outline', visible: true },
    { label: 'Inscribirme', path: '/inscribir', icon: 'create-outline', visible: modoMision },
    { label: 'Mi familia', path: '/mi-familia', icon: 'people-outline', visible: modoMision && !loading && !!user },
    { label: 'Pueblos', path: '/pueblos', icon: 'map-outline', visible: true },
    { label: 'Buscador', path: '/buscador', icon: 'search-outline', visible: true },
    { label: 'Documentos', path: '/documentos', icon: 'document-text-outline', visible: modoMision },
    { label: 'Baja', path: '/baja', icon: 'exit-outline', visible: modoMision },
    { label: 'Inscriptos', path: '/inscriptos', icon: 'list-outline', visible: showInscriptos },
    { label: 'Admin', path: '/admin', icon: 'settings-outline', visible: showAdmin },
    { label: 'Histórico', path: '/historico', icon: 'stats-chart-outline', visible: showAdmin },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.light, overflow: 'hidden' }}>
      {isDesktop ? <DesktopHeader items={navItems} /> : null}
      <Tabs screenLayout={({ children, route }) => (
        <View style={{ flex: 1, backgroundColor: colors.background.light }}>
          <FondoParaguayo intensidad={route.name === 'index' ? 'normal' : 'suave'} />
          {children}
        </View>
      )} screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background.light },
        tabBarActiveTintColor: colors.primary[600], tabBarInactiveTintColor: colors.text.tertiary.light,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 9, fontFamily: typography.family.semibold, marginTop: 1 },
        tabBarBackground: isDesktop ? undefined : () => <MobileTabBackground />,
        tabBarStyle: isDesktop ? { display: 'none' } : {
          position: 'absolute', left: 10, right: 10, bottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 18 : 7,
          height: Platform.OS === 'ios' ? 72 : 62, borderRadius: radius.xl,
          backgroundColor: 'transparent', borderTopWidth: 0, ...shadows.lg,
          // @ts-ignore web only
          backdropFilter: 'blur(18px)',
        },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} /> }} />
        <Tabs.Screen name="inscribir" options={{ href: modoMision ? undefined : null, title: 'Inscribirme', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'create' : 'create-outline'} focused={focused} /> }} />
        <Tabs.Screen name="mi-familia" options={{ href: modoMision && !loading && !!user ? undefined : null, title: 'Mi Familia', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} /> }} />
        <Tabs.Screen name="pueblos" options={{ title: 'Pueblos', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} /> }} />
        <Tabs.Screen name="buscador" options={{ title: 'Buscador', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} /> }} />
        <Tabs.Screen name="torneo" options={{ href: null, title: 'Torneo' }} />
        <Tabs.Screen name="documentos" options={{ href: modoMision ? undefined : null, title: 'Docs', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} /> }} />
        <Tabs.Screen name="baja" options={{ href: modoMision ? undefined : null, title: 'Baja', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'exit' : 'exit-outline'} focused={focused} /> }} />
        <Tabs.Screen name="inscriptos" options={{ href: showInscriptos ? undefined : null, title: 'Inscriptos', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} /> }} />
        <Tabs.Screen name="admin" options={{ href: showAdmin ? undefined : null, title: 'Admin', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} /> }} />
        <Tabs.Screen name="historico" options={{ href: showAdmin ? undefined : null, title: 'Histórico', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} focused={focused} /> }} />
        <Tabs.Screen name="firma" options={{ href: null }} />
        <Tabs.Screen name="test-email" options={{ href: showAdmin ? undefined : null, title: 'Test' }} />
      </Tabs>
    </View>
  );
}