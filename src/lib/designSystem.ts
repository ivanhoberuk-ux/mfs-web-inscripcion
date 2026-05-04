// Sistema de diseño MFS Paraguay - Inspirado en Schoenstatt
// Colores, tipografía, espaciado y tokens semánticos para React Native

export const colors = {
  // Paleta primaria - Azul marino MFS (logo 10 pueblos)
  primary: {
    50: '#eef2fb',
    100: '#d6def4',
    200: '#aebde9',
    300: '#7e94d8',
    400: '#4d6cc4',
    500: '#2848aa',  // Primary base - Azul MFS
    600: '#0E2A6B',  // Azul marino oficial logo
    700: '#0b2057',
    800: '#091944',
    900: '#06122f',
  },
  
  // Paleta secundaria - Amarillo sol MFS
  secondary: {
    50: '#fffbea',
    100: '#fff3c4',
    200: '#fce588',
    300: '#fadb5f',
    400: '#f7c948',
    500: '#F5C518',  // Amarillo sol oficial logo
    600: '#d4a90f',
    700: '#a8850b',
    800: '#7c6208',
    900: '#574505',
  },
  
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
  info: '#3b82f6',     // Azul cielo
  
  // Fondos modernos - blanco cálido con tinte celeste
  background: {
    light: '#f7faff',
    dark: '#0a1428',
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

// Sombras con tinte azul marino MFS
export const shadows = {
  sm: {
    shadowColor: '#0E2A6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0E2A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0E2A6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0E2A6B',
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
