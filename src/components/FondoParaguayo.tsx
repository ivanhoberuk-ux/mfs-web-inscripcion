import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { colors } from '../lib/designSystem';

type Intensidad = 'suave' | 'normal';
type NandutiProps = { size: number; color: string; opacity: number; animated?: boolean; duration?: number };

const RADIOS = Array.from({ length: 20 }, (_, index) => index * 18);
const PETALS = Array.from({ length: 12 }, (_, index) => index * 30);

export function NandutiDecorativo({ size, color, opacity, animated = false, duration = 75000 }: NandutiProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const canAnimate = useMemo(() => {
    if (!animated || Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, [animated]);

  useEffect(() => {
    if (!canAnimate) return;
    const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [canAnimate, duration, rotation]);

  const artwork = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="50" cy="50" r="9" strokeWidth="1.2" />
        <Circle cx="50" cy="50" r="22" strokeWidth="0.8" />
        <Circle cx="50" cy="50" r="35" strokeWidth="0.65" />
        <Circle cx="50" cy="50" r="43" strokeWidth="1" />
        {RADIOS.map(angle => (
          <Line key={`r-${angle}`} x1="50" y1="41" x2="50" y2="7" strokeWidth="0.7" transform={`rotate(${angle} 50 50)`} />
        ))}
        {PETALS.map(angle => (
          <Ellipse key={`p-${angle}`} cx="50" cy="7" rx="4.4" ry="8" strokeWidth="0.75" transform={`rotate(${angle} 50 50)`} />
        ))}
        {PETALS.map(angle => (
          <Path key={`d-${angle}`} d="M50 28 L55 18 L50 8 L45 18 Z" strokeWidth="0.55" transform={`rotate(${angle + 15} 50 50)`} />
        ))}
      </G>
    </Svg>
  );

  if (!canAnimate) return <View style={{ opacity }}>{artwork}</View>;
  return (
    <Animated.View style={{ opacity, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      {artwork}
    </Animated.View>
  );
}

const motifs = [
  { top: 70, left: -46, size: 150, color: colors.paraguay.red, animated: true, duration: 82000 },
  { top: 310, right: -35, size: 104, color: colors.paraguay.blue },
  { top: 640, left: '8%', size: 68, color: colors.secondary[500] },
  { top: 920, right: '5%', size: 220, color: colors.paraguay.red, animated: true, duration: 68000 },
  { top: 1290, left: -72, size: 260, color: colors.paraguay.blue },
  { top: 1720, right: -24, size: 92, color: colors.secondary[500] },
  { top: 2080, left: '18%', size: 130, color: colors.paraguay.red },
] as const;

export function FondoParaguayo({ intensidad = 'suave' }: { intensidad?: Intensidad }) {
  const { width, height } = useWindowDimensions();
  const opacity = intensidad === 'normal' ? 0.11 : 0.06;
  const scale = width < 600 ? 0.78 : 1;
  const canvasHeight = Math.max(height, 2400);

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      <Svg width="100%" height={canvasHeight} viewBox="0 0 1000 2400" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, opacity: intensidad === 'normal' ? 0.13 : 0.08 }}>
        <Path d="M-80 170 C210 40 390 310 650 155 C820 55 930 100 1080 20" fill="none" stroke={colors.paraguay.red} strokeWidth="18" />
        <Path d="M-80 190 C210 60 390 330 650 175 C820 75 930 120 1080 40" fill="none" stroke={colors.paraguay.white} strokeWidth="18" />
        <Path d="M-80 210 C210 80 390 350 650 195 C820 95 930 140 1080 60" fill="none" stroke={colors.paraguay.blue} strokeWidth="18" />
        <Path d="M-100 2260 C150 2110 380 2390 620 2225 C800 2100 940 2180 1100 2080" fill="none" stroke={colors.paraguay.red} strokeWidth="18" />
        <Path d="M-100 2280 C150 2130 380 2410 620 2245 C800 2120 940 2200 1100 2100" fill="none" stroke={colors.paraguay.white} strokeWidth="18" />
        <Path d="M-100 2300 C150 2150 380 2430 620 2265 C800 2140 940 2220 1100 2120" fill="none" stroke={colors.paraguay.blue} strokeWidth="18" />
      </Svg>
      {motifs.map((motif, index) => (
        <View key={index} style={{ position: 'absolute', top: motif.top, left: 'left' in motif ? motif.left : undefined, right: 'right' in motif ? motif.right : undefined, transform: [{ scale }] }}>
          <NandutiDecorativo size={motif.size} color={motif.color} opacity={opacity} animated={'animated' in motif ? motif.animated : false} duration={'duration' in motif ? motif.duration : undefined} />
        </View>
      ))}
    </View>
  );
}

export function LineaTricolor() {
  return (
    <View pointerEvents="none" style={{ width: '100%', height: 4 }}>
      <View style={{ flex: 1, backgroundColor: colors.paraguay.red }} />
      <View style={{ flex: 1, backgroundColor: colors.paraguay.white }} />
      <View style={{ flex: 1, backgroundColor: colors.paraguay.blue }} />
    </View>
  );
}
