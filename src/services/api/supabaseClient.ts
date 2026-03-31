import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Requerido en React Native/Expo para Supabase

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

// Inicializamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configuración recomendada para React Native
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});