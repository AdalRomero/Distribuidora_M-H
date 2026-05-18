// src/context/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { database } from "../services/DB/indexBD"; // Ajusta la ruta a tu BD
import { supabase } from "../services/api/supabaseClient"; // Ajusta la ruta

interface AuthContextType {
  userId: string | null;
  userName: string;
  userRole: string;
  isDev: boolean;
  canDelete: boolean;
  loginLocal: (id: string) => Promise<void>;
  logoutLocal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuario");
  const [userRole, setUserRole] = useState("Empleado");
  const [canDelete, setCanDelete] = useState(false);

  // Al abrir la app, revisa si alguien dejó su sesión abierta
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedId = await AsyncStorage.getItem("activeUserId");
        if (storedId) {
          await loadProfileData(storedId);
        }
      } catch (e) {
        console.log("No hay sesión guardada");
      }
    };
    loadSession();
  }, []);

  // Va a WatermelonDB, saca los datos y los pone a disposición de toda la app
  const loadProfileData = async (id: string) => {
    try {
      // Instanciamos las colecciones que necesitamos
      const perfilesDb = database.collections.get("perfiles");
      const infoPerfilesDb = database.collections.get("informacion_perfil");
      const permisosDb = database.collections.get("permisos");

      // 1. Buscamos el perfil principal (Para sacar el nickname/usuario)
      const perfil = (await perfilesDb.find(id)) as any;

      // 2. Buscamos la información del perfil (Para sacar el ROL)
      let rolUsuario = "Empleado"; // Valor por defecto en caso de fallo
      try {
        const infoPerfil = (await infoPerfilesDb.find(id)) as any;
        if (infoPerfil && infoPerfil.rol) {
          rolUsuario = infoPerfil.rol;
        }
      } catch (errorInfo) {
        console.log("No se encontró la informacion_perfil para este usuario.");
      }

      let hasDeletePermission = false;
      try {
        const permisosUsuario = (await permisosDb.find(id)) as any;
        if (permisosUsuario && permisosUsuario.borrar) {
          hasDeletePermission = true;
        }
      } catch (e) {
        console.log("No se encontraron permisos o no tiene borrar");
      }

      // Si el perfil existe, actualizamos todo el estado global de la App
      if (perfil) {
        setUserId(id);
        setUserName(perfil.usuario || "Usuario");
        setUserRole(rolUsuario);
        setCanDelete(rolUsuario === "Administrador" || rolUsuario === "DEV" || hasDeletePermission);
      }
    } catch (e) {
      console.log("No se pudo cargar el perfil de WatermelonDB");
    }
  };

  // Función que usarás en tu Login
  const loginLocal = async (id: string) => {
    await AsyncStorage.setItem("activeUserId", id);
    await loadProfileData(id);
  };

  // Función que usarás en tu SideBarMenu
  const logoutLocal = async () => {
    await AsyncStorage.removeItem("activeUserId");
    await supabase.auth.signOut();
    setUserId(null);
    setUserName("Usuario");
    setUserRole("Empleado");
    setCanDelete(false);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        userName,
        userRole,
        isDev: userRole === "DEV", // Esto ahora se calculará correctamente
        canDelete,
        loginLocal,
        logoutLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Este es el hook que usarás en cualquier pantalla
export const useAuth = () => useContext(AuthContext);
