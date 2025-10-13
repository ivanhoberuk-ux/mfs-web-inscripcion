// FILE: src/lib/supabase.native.ts
import { createClient } from '@supabase/supabase-js';

// Detecta prerender/SSR (Node): ahí NO debemos tocar AsyncStorage
const isSSR = typeof globalThis === 'undefined' || (typeof globalThis !== 'undefined' && !(globalThis as any).window);

export const SUPABASE_URL = 'https://npekpdkywsneylddzzuu.supabase.co'; // ← tu URL
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZWtwZGt5d3NuZXlsZGR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDYxNDEsImV4cCI6MjA3MTk4MjE0MX0.RNuHThLkvwMzq6WMUna7P6WFUovG2CwT18LNJwtwNoI';     // ← tu anon key

let supabaseOptions: Parameters<typeof createClient>[2];

if (isSSR) {
  supabaseOptions = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };
} else {
  // Cargar AsyncStorage SOLO en entorno nativo real
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  supabaseOptions = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      },
    },
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);
