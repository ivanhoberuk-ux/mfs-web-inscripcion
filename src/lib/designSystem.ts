// Sistema de diseño MFS Paraguay — fresco, luminoso y multiplataforma.

export const colors = {
  paraguay: { red: '#D52B1E', white: '#FFFFFF', blue: '#0038A8' },
  primary: {
    50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC',
    400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
    800: '#3730A3', 900: '#1E1B4B',
  },
  
  secondary: {
    50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
    400: '#FBBF24', 500: '#FFC83D', 600: '#F59E0B', 700: '#B45309',
    800: '#92400E', 900: '#78350F',
  },
  accent: { 50: '#FFF1EC', 100: '#FFE0D5', 300: '#FFA98C', 500: '#FF7A59', 600: '#F25C3A', 700: '#C8401F' },
  mint: { 100: '#CCFBF1', 500: '#14B8A6', 600: '#0D9488' },
  
  // Celeste suave - acento Mater
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
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
  info: '#6366F1',
  
  // Fondos modernos - blanco cálido con tinte celeste
  background: {
    light: '#F7F8FD',
    dark: '#17172A',
  },
  
  // Superficie (cards, modales) con más contraste
  surface: {
    light: '#ffffff',
    dark: '#27272a',
  },
  
  // Texto con mejor contraste
  text: {
    primary: {
      light: '#1F2140',
      dark: '#fafafa',
    },
    secondary: {
      light: '#4B4F6B',
      dark: '#e4e4e7',
    },
    tertiary: {
      light: '#8A8FA8',
      dark: '#a1a1aa',
    },
    disabled: {
      light: '#d4d4d8',
      dark: '#52525b',
    },
  },
};

export const gradients = {
  hero: ['#4F46E5', '#7C6CF6', '#FF7A59'] as const,
  suave: ['#EEF2FF', '#FFF1EC'] as const,
  sol: ['#FFC83D', '#FF7A59'] as const,
};

// Tipografía moderna y juvenil
export const typography = {
  // Familia de fuente (React Native usa system fonts)
  family: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
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
  md: 18,
  lg: 24,
  xl: 28,
  '2xl': 36,
  full: 999,
};

// Sombras amplias con tinte índigo tenue.
export const shadows = {
  sm: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  xl: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
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
