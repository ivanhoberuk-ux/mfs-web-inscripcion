// Archivo unificado de Supabase - detecta plataforma automáticamente
import { Platform } from 'react-native';

let supabase: any;

if (Platform.OS === 'web') {
  // En web, importa la versión web
  supabase = require('./supabase.web').supabase;
} else {
  // En iOS/Android, importa la versión nativa
  supabase = require('./supabase.native').supabase;
}

export { supabase };
