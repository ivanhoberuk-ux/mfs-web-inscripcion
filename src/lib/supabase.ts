import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://npekpdkywsneylddzzuu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZWtwZGt5d3NuZXlsZGR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDYxNDEsImV4cCI6MjA3MTk4MjE0MX0.RNuHThLkvwMzq6WMUna7P6WFUovG2CwT18LNJwtwNoI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

