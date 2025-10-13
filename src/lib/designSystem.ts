// Sistema de diseño MFS Paraguay - Inspirado en Schoenstatt
// Colores, tipografía, espaciado y tokens semánticos para React Native

export const colors = {
  // Paleta primaria - Indigo vibrante moderno
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // Primary base - Indigo vibrante
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Paleta secundaria - Cyan/Teal vibrante
  secondary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // Secondary base - Cyan vibrante
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  
  // Neutros - Grises modernos para textos y fondos
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  
  // Estados con colores vibrantes
  success: '#10b981',  // Verde esmeralda
  warning: '#f59e0b',  // Naranja
  error: '#ef4444',    // Rojo vibrante
  info: '#3b82f6',     // Azul cielo
  
  // Fondos modernos
  background: {
    light: '#fafafa',
    dark: '#18181b',
  },
  
  // Superficie (cards, modales) con más contraste
  surface: {
    light: '#ffffff',
    dark: '#27272a',
  },
  
  // Texto con mejor contraste
  text: {
    primary: {
      light: '#18181b',
      dark: '#fafafa',
    },
    secondary: {
      light: '#3f3f46',
      dark: '#e4e4e7',
    },
    tertiary: {
      light: '#71717a',
      dark: '#a1a1aa',
    },
    disabled: {
      light: '#d4d4d8',
      dark: '#52525b',
    },
  },
};

// Tipografía moderna y juvenil
export const typography = {
  // Familia de fuente (React Native usa system fonts)
  family: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Tamaños más generosos y modernos
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Pesos más variados
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Altura de línea más espaciada
  lineHeight: {
    tight: 1.25,
    normal: 1.6,
    relaxed: 1.8,
  },
};

// Espaciado (sistema de 4px)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius más redondeados y modernos
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  full: 999,
};

// Sombras modernas con colores (para iOS/Android)
export const shadows = {
  sm: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Opacidades
export const opacity = {
  disabled: 0.4,
  hover: 0.8,
  active: 0.6,
};

// Transiciones (duración en ms)
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
};
