import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Requerido en React Native/Expo para Supabase

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

// Inicializamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configuración recomendada para React Native
    storage: AsyncStorage, // Para guardar el token de sesión(inicio de sesión)
    persistSession: true, // Para mantener la sesión activa
    autoRefreshToken: true, // Para refrescar el token automáticamente
    detectSessionInUrl: false, // Para detectar la sesión en la URL
  },
});
