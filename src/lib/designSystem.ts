// Sistema de diseño MFS Paraguay - Inspirado en Schoenstatt
// Colores, tipografía, espaciado y tokens semánticos para React Native

export const colors = {
  // Paleta primaria - Azul Schoenstatt
  primary: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#0b73e6',  // Primary base
    600: '#095bb3',
    700: '#074380',
    800: '#042b4d',
    900: '#02141a',
  },
  
  // Paleta secundaria - Verde esperanza
  secondary: {
    50: '#e8f5ef',
    100: '#c2e5d3',
    200: '#9bd5b7',
    300: '#74c59b',
    400: '#4db57f',
    500: '#0b8d62',  // Secondary base
    600: '#09714e',
    700: '#07553b',
    800: '#053927',
    900: '#021d14',
  },
  
  // Neutros - Para textos y fondos
  neutral: {
    50: '#f6f9f7',
    100: '#e8eeec',
    200: '#dde5ea',
    300: '#c5d3d8',
    400: '#a0b4bc',
    500: '#7a8f99',
    600: '#5a7077',
    700: '#3d5259',
    800: '#25353b',
    900: '#0b2433',
  },
  
  // Estados
  success: '#0b8d62',
  warning: '#f59e0b',
  error: '#b91c1c',
  info: '#0b73e6',
  
  // Fondos
  background: {
    light: '#f6f9f7',
    dark: '#0b2433',
  },
  
  // Superficie (cards, modales)
  surface: {
    light: '#ffffff',
    dark: '#173e4d',
  },
  
  // Texto
  text: {
    primary: {
      light: '#0b2433',
      dark: '#f6f9f7',
    },
    secondary: {
      light: '#10313f',
      dark: '#dde5ea',
    },
    tertiary: {
      light: '#35505b',
      dark: '#a0b4bc',
    },
    disabled: {
      light: '#a0b4bc',
      dark: '#5a7077',
    },
  },
};

// Tipografía
export const typography = {
  // Familia de fuente (React Native usa system fonts)
  family: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Tamaños
  size: {
    xs: 12,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 26,
    '4xl': 32,
  },
  
  // Pesos
  weight: {
    regular: '400' as const,
    medium: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Altura de línea
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
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

// Border radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// Sombras (para iOS/Android)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
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
