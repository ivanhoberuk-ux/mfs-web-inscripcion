import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, gradients, radius, shadows, spacing, typography } from '../../src/lib/designSystem';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/Button';
import { InscripcionAvisoCard } from '../../src/components/InscripcionAvisoCard';
import { DocumentosEstadoCard } from '../../src/components/DocumentosEstadoCard';
import { MiInscripcionCard } from '../../src/components/MiInscripcionCard';
import { AsesoresAnioCard } from '../../src/components/AsesoresAnioCard';
import { ContactosPuebloCard } from '../../src/components/ContactosPuebloCard';
import { PortadaInstitucional } from '../../src/components/PortadaInstitucional';
import { useTemporada } from '../../src/hooks/useTemporada';
import { fetchEdicionActiva, fetchDisciplinas, TorneoDisciplina } from '../../src/lib/torneo';
// @ts-ignore
import familiaImg from '../../src/assets/familia-misionera.png';
// @ts-ignore
import logoMfs from '../../src/assets/mfs-logo.png';
// @ts-ignore
import banderaPy from '../../src/assets/bandera-paraguay.png';
// @ts-ignore
import materParaguay from '../../src/assets/mater-paraguay.png';
// @ts-ignore
import santuarioImg from '../../src/assets/santuario.png';
// @ts-ignore
import torneoFutbolImg from '../../src/assets/torneo-futbol.jpg';
// @ts-ignore
import torneoVoleyImg from '../../src/assets/torneo-voley.jpg';
// @ts-ignore
import torneoBasquetImg from '../../src/assets/torneo-basquet.jpg';
// @ts-ignore
import torneoTodosImg from '../../src/assets/torneo-todos.jpg';
// @ts-ignore
import torneoFutbolVoleyImg from '../../src/assets/torneo-futbol-voley.jpg';

type UserRoleRow = { role: 'admin' | 'user' };
type IconName = React.ComponentProps<typeof Ionicons>['name'];

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    const reduceMotion = Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { opacity.setValue(1); translateY.setValue(0); return; }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = width < 600;
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [disciplinas, setDisciplinas] = useState<TorneoDisciplina[]>([]);
  const [torneoVisible, setTorneoVisible] = useState(false);
  const { esInstitucional, año: añoTemporada } = useTemporada();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ed = await fetchEdicionActiva();
        if (!mounted || !ed) return;
        setTorneoVisible(ed.visible_en_inicio !== false);
        const list = await fetchDisciplinas(ed.id);
        if (mounted) setDisciplinas(list);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) { setRole(null); return; }
      setLoadingRole(true);
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (!mounted) return;
      if (error) setRole(null);
      else {
        const roles = ((data ?? []) as UserRoleRow[]).map(item => item.role);
        setRole(roles.includes('admin') ? 'admin' : (roles[0] ?? null));
      }
      setLoadingRole(false);
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const activas = disciplinas.filter(item => item.activa);
  const matchDisc = (item: { codigo?: string | null; nombre?: string | null }, re: RegExp) => re.test(item.codigo ?? '') || re.test(item.nombre ?? '');
  const hayFutbol = activas.some(item => matchDisc(item, /f[uú]tbol|futbol|soccer/i));
  const hayVoley = activas.some(item => matchDisc(item, /v[oó]ley|volley/i));
  const hayBasquet = activas.some(item => matchDisc(item, /b[aá]squet|basket/i));
  const torneoHero = useMemo(() => {
    const total = [hayFutbol, hayVoley, hayBasquet].filter(Boolean).length;
    if (total === 1) return hayFutbol ? torneoFutbolImg : hayVoley ? torneoVoleyImg : torneoBasquetImg;
    if (total === 2 && hayFutbol && hayVoley) return torneoFutbolVoleyImg;
    return torneoTodosImg;
  }, [hayFutbol, hayVoley, hayBasquet]);
  const torneoTitle = activas.length === 1 ? `Torneo de ${activas[0].nombre}` : 'Torneo Interpueblos';
  const torneoSubtitle = activas.length ? `${activas.map(item => item.nombre).join(' · ')} — fixture, horarios y posiciones` : 'Fútbol, vóley y básquet — fixture, horarios y posiciones';
  const año = añoTemporada ?? new Date().getFullYear();

  const quickItems = [
    ...(!esInstitucional ? [
      { title: 'Inscribirme', description: 'Sumate a la próxima misión', icon: 'create-outline' as IconName, color: colors.primary[600], tint: colors.primary[50], path: '/inscribir' },
      { title: 'Documentos', description: 'Completá tu legajo', icon: 'document-text-outline' as IconName, color: colors.mint[600], tint: colors.mint[100], path: '/documentos' },
    ] : []),
    { title: 'Pueblos', description: 'Conocé cada comunidad', icon: 'map-outline' as IconName, color: colors.accent[600], tint: colors.accent[50], path: '/pueblos' },
    ...(role === 'admin' ? [{ title: 'Administración', description: 'Gestión y seguimiento', icon: 'settings-outline' as IconName, color: colors.secondary[700], tint: colors.secondary[100], path: '/admin' }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.light }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: compact ? 14 : 24, paddingTop: compact ? 14 : 28, gap: desktop ? 34 : 24 }}>
          <FadeIn>
            <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius['2xl'], overflow: 'hidden', minHeight: desktop ? 430 : 560, ...shadows.xl }}>
              <View pointerEvents="none" style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, right: -60, top: -70, backgroundColor: 'rgba(255,200,61,0.22)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, left: '36%', bottom: -110, backgroundColor: 'rgba(255,122,89,0.28)' }} />
              <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column', padding: compact ? 24 : 42, alignItems: 'center' }}>
                <View style={{ flex: 1, width: '100%', zIndex: 2, alignItems: compact ? 'center' : 'flex-start' }}>
                  <View style={{ width: 70, height: 70, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', marginBottom: 22, ...shadows.md }}>
                    <Image source={logoMfs} style={{ width: 54, height: 54, resizeMode: 'contain' }} accessibilityLabel="Logo MFS" />
                  </View>
                  <Text style={{ maxWidth: 620, color: colors.surface.light, fontFamily: typography.family.extrabold, fontSize: compact ? 34 : 50, lineHeight: compact ? 40 : 57, letterSpacing: -1.2, textAlign: compact ? 'center' : 'left' }}>
                    Misiones Familiares de Schoenstatt
                  </Text>
                  <Text style={{ marginTop: 14, color: colors.secondary[100], fontFamily: typography.family.bold, fontSize: 16 }}>Misiones {año}</Text>
                  <Text style={{ maxWidth: 520, marginTop: 7, color: colors.surface.light, opacity: 0.92, fontFamily: typography.family.regular, fontSize: compact ? 15 : 17, lineHeight: 25, textAlign: compact ? 'center' : 'left' }}>
                    Encendé tu corazón. La misión arranca acá.
                  </Text>
                  <View style={{ marginTop: 25, width: compact ? '100%' : undefined, flexDirection: compact ? 'column' : 'row', gap: 10 }}>
                    <Pressable onPress={() => router.push(esInstitucional ? '/pueblos' : '/inscribir')} style={({ pressed }) => ({ minHeight: 50, paddingHorizontal: 24, borderRadius: radius.full, backgroundColor: colors.secondary[500], alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.86 : 1 })}>
                      <Text style={{ color: colors.text.primary.light, fontFamily: typography.family.bold, fontSize: 14 }}>{esInstitucional ? 'Conocé más' : 'Inscribirme'}</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push('/pueblos')} style={({ pressed }) => ({ minHeight: 50, paddingHorizontal: 24, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
                      <Text style={{ color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 14 }}>Ver pueblos</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={{ width: desktop ? '42%' : '100%', height: desktop ? 350 : 245, alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'center', marginTop: desktop ? 0 : 8 }}>
                  <Image source={familiaImg} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} accessibilityLabel="Familia misionera" />
                  <Image source={banderaPy} style={{ position: 'absolute', right: 4, bottom: 0, width: 62, height: 40, resizeMode: 'contain', opacity: 0.9 }} accessibilityLabel="Bandera de Paraguay" />
                </View>
              </View>
            </LinearGradient>
          </FadeIn>

          <FadeIn delay={80} style={{ marginTop: desktop ? -56 : -42, paddingHorizontal: compact ? 10 : 30, zIndex: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Stat icon="calendar-outline" value={String(año)} label="Año de misión" />
              <Stat icon="people-outline" value="En familia" label="Una misión compartida" />
              <Stat icon="heart-outline" value="Servir" label="Con alegría y fe" />
            </View>
          </FadeIn>

          <FadeIn delay={120}>{esInstitucional ? <PortadaInstitucional año={añoTemporada} /> : <InscripcionAvisoCard />}</FadeIn>

          {torneoVisible ? (
            <FadeIn delay={160}>
              <Pressable onPress={() => router.push('/torneo')} style={({ pressed }) => ({ borderRadius: radius.xl, overflow: 'hidden', minHeight: desktop ? 360 : 310, opacity: pressed ? 0.94 : 1, transform: [{ scale: pressed ? 0.995 : 1 }], ...shadows.lg })} accessibilityRole="button">
                <Image source={torneoHero} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} accessibilityLabel={torneoTitle} />
                <LinearGradient colors={['transparent', 'rgba(20,18,49,0.92)']} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: compact ? 22 : 30 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.secondary[500], paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full }}>
                    <Text style={{ color: colors.text.primary.light, fontFamily: typography.family.bold, fontSize: 11 }}>🏆 TORNEO INTERPUEBLOS</Text>
                  </View>
                  <Text style={{ marginTop: 12, color: colors.surface.light, fontFamily: typography.family.extrabold, fontSize: compact ? 26 : 34, letterSpacing: -0.5 }}>{torneoTitle}</Text>
                  <Text style={{ marginTop: 5, color: colors.primary[100], fontFamily: typography.family.medium, fontSize: 13 }}>{torneoSubtitle}</Text>
                  <Text style={{ marginTop: 14, color: colors.surface.light, fontFamily: typography.family.bold, fontSize: 13 }}>Ver torneo  →</Text>
                </View>
              </Pressable>
            </FadeIn>
          ) : null}

          {user && !esInstitucional ? (
            <FadeIn delay={200}>
              <SectionHeading eyebrow="TU MISIÓN" title="Todo lo importante, en un solo lugar" />
              <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: 'flex-start', gap: 14 }}>
                <View style={{ flex: 1, width: '100%', gap: 14 }}><MiInscripcionCard /><ContactosPuebloCard /></View>
                <View style={{ flex: 1, width: '100%', gap: 14 }}><DocumentosEstadoCard /><AsesoresAnioCard /></View>
              </View>
            </FadeIn>
          ) : !esInstitucional ? <AsesoresAnioCard /> : null}

          <FadeIn delay={240}>
            <SectionHeading eyebrow="ACCESOS RÁPIDOS" title="Tu próximo paso" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {quickItems.map(item => <QuickCard key={item.title} {...item} onPress={() => router.push(item.path as never)} desktop={desktop} />)}
              {loadingRole ? <View style={{ flexBasis: desktop ? '23%' : '47%', flexGrow: 1, minHeight: 130, borderRadius: radius.xl, backgroundColor: colors.neutral[100] }} /> : null}
            </View>
          </FadeIn>

          <FadeIn delay={280}>
            <LinearGradient colors={[...gradients.suave]} style={{ borderRadius: radius['2xl'], padding: compact ? 20 : 34, overflow: 'hidden' }}>
              <SectionHeading eyebrow="NUESTRA ESPIRITUALIDAD" title="Con María, salimos al encuentro" />
              <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 16 }}>
                <Image source={santuarioImg} style={{ flex: desktop ? 1.1 : undefined, width: '100%', height: desktop ? 280 : 210, resizeMode: 'cover', borderRadius: radius.xl }} accessibilityLabel="Santuario de Schoenstatt" />
                <View style={{ flex: 1, minHeight: 230, backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: radius.xl, padding: 24, justifyContent: 'center', alignItems: compact ? 'center' : 'flex-start' }}>
                  <Image source={materParaguay} style={{ width: 88, height: 120, resizeMode: 'contain' }} accessibilityLabel="Mater Paraguay" />
                  <Text style={{ marginTop: 10, color: colors.primary[900], fontFamily: typography.family.extrabold, fontSize: 21, textAlign: compact ? 'center' : 'left' }}>Mater Paraguay</Text>
                  <Text style={{ marginTop: 6, color: colors.text.secondary.light, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 20, textAlign: compact ? 'center' : 'left' }}>Madre y reina de nuestras misiones.</Text>
                  <Text style={{ marginTop: 18, color: colors.primary[700], fontFamily: typography.family.bold, fontSize: 14, fontStyle: 'italic', textAlign: compact ? 'center' : 'left' }}>“Servus Mariae nunquam peribit”</Text>
                  <Text style={{ color: colors.text.tertiary.light, fontFamily: typography.family.regular, fontSize: 11, marginTop: 3 }}>El servidor de María nunca perecerá.</Text>
                </View>
              </View>
            </LinearGradient>
          </FadeIn>

          <FadeIn delay={320}>
            <View style={{ borderRadius: radius['2xl'], padding: compact ? 24 : 34, backgroundColor: colors.surface.light, borderWidth: 1, borderColor: colors.primary[50], ...shadows.sm, alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: user ? colors.mint[100] : colors.secondary[100], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={user ? 'person-outline' : 'sparkles-outline'} size={23} color={user ? colors.mint[600] : colors.secondary[700]} />
              </View>
              <Text style={{ marginTop: 14, color: colors.primary[900], fontFamily: typography.family.extrabold, fontSize: 21, textAlign: 'center' }}>{user ? `Hola, ${user.email?.split('@')[0]}` : '¿Ya te inscribiste?'}</Text>
              <Text style={{ marginTop: 6, maxWidth: 520, color: colors.text.secondary.light, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{user ? 'Desde tu cuenta podés seguir tu inscripción y mantener tus documentos al día.' : 'Creá tu cuenta para ver tu inscripción, tus documentos y toda la información de tu misión.'}</Text>
              <View style={{ marginTop: 18, width: compact ? '100%' : 320, gap: 8 }}>
                {user ? <Button variant="ghost" onPress={async () => { try { await signOut(); } catch {} }}>Cerrar sesión</Button> : <><Button variant="primary" onPress={() => router.push('/login?mode=signup')}>Crear cuenta</Button><Button variant="outline" onPress={() => router.push('/login')}>Ya tengo cuenta</Button></>}
              </View>
            </View>
          </FadeIn>

          <View style={{ paddingVertical: 22, flexDirection: compact ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTopWidth: 1, borderTopColor: colors.primary[100] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Image source={logoMfs} style={{ width: 28, height: 28, resizeMode: 'contain' }} /><Text style={{ color: colors.text.secondary.light, fontFamily: typography.family.semibold, fontSize: 12 }}>Misiones Familiares de Schoenstatt · Paraguay</Text></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 }}>
              {[['Pueblos', '/pueblos'], ['Torneo', '/torneo'], ['Inscribirme', '/inscribir']].map(([label, path]) => <Pressable key={path} onPress={() => router.push(path as never)}><Text style={{ color: colors.primary[600], fontFamily: typography.family.semibold, fontSize: 12 }}>{label}</Text></Pressable>)}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <View style={{ marginBottom: 15 }}><Text style={{ color: colors.accent[600], fontFamily: typography.family.bold, fontSize: 11, letterSpacing: 1 }}>{eyebrow}</Text><Text style={{ marginTop: 4, color: colors.primary[900], fontFamily: typography.family.extrabold, fontSize: 25, letterSpacing: -0.5 }}>{title}</Text></View>;
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return <View style={{ flex: 1, minWidth: 130, minHeight: 90, padding: 15, borderRadius: radius.xl, backgroundColor: colors.surface.light, borderWidth: 1, borderColor: colors.primary[50], ...shadows.sm, flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={19} color={colors.primary[600]} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.primary[900], fontFamily: typography.family.extrabold, fontSize: 16 }}>{value}</Text><Text style={{ marginTop: 2, color: colors.text.tertiary.light, fontFamily: typography.family.medium, fontSize: 10, lineHeight: 14 }}>{label}</Text></View></View>;
}

function QuickCard({ title, description, icon, color, tint, onPress, desktop }: { title: string; description: string; icon: IconName; color: string; tint: string; onPress: () => void; desktop: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed, hovered }: any) => ({ flexBasis: desktop ? '23%' : '46%', flexGrow: 1, minWidth: 150, minHeight: 142, padding: 18, borderRadius: radius.xl, backgroundColor: colors.surface.light, borderWidth: 1, borderColor: hovered ? colors.primary[200] : colors.primary[50], opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], ...shadows.sm })}><View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={color} /></View><Text style={{ marginTop: 14, color: colors.primary[900], fontFamily: typography.family.bold, fontSize: 15 }}>{title}</Text><Text style={{ marginTop: 4, color: colors.text.tertiary.light, fontFamily: typography.family.regular, fontSize: 11, lineHeight: 16 }}>{description}</Text></Pressable>;
}