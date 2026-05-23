import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Requerido en React Native/Expo para Supabase

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

// En web (Vercel/browser), usar localStorage nativo para que Supabase
// pueda gestionar el refresh token correctamente. En React Native usar AsyncStorage.
const isWeb = typeof window !== "undefined" && typeof localStorage !== "undefined";

// Inicializamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // En web usamos localStorage del browser; en native usamos AsyncStorage
    storage: isWeb ? undefined : AsyncStorage,
    persistSession: true,  // Mantener la sesión activa
    autoRefreshToken: true, // Refrescar el token automáticamente
    detectSessionInUrl: false, // No detectar sesión en URL (evita loops en Expo Router)
  },
});
