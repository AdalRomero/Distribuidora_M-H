// src/context/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { database } from "../services/DB/indexBD";
import { supabase } from "../services/api/supabaseClient";
import { getDeviceId } from "../services/device";
import { Q } from "@nozbe/watermelondb";

interface AuthContextType {
  userId: string | null;
  userName: string;
  userRole: string;
  isDev: boolean;
  canDelete: boolean;
  loading: boolean;
  loginLocal: (id: string, isOnline?: boolean) => Promise<void>;
  logoutLocal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuario");
  const [userRole, setUserRole] = useState("Empleado");
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkOfflineTtl = async (id: string): Promise<boolean> => {
    // Permitir el uso de la app de manera local sin límites de expiración temporal
    return true;
  };

  // Al abrir la app, revisa si alguien dejó su sesión abierta
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedId = await AsyncStorage.getItem("activeUserId");
        if (storedId) {
          const isTtlValid = await checkOfflineTtl(storedId);
          if (isTtlValid) {
            await loadProfileData(storedId);
          } else {
            console.log("Sesión offline expirada. Cerrando sesión...");
            await logoutLocal();
          }
        }
      } catch (e) {
        console.log("No hay sesión guardada");
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  // Va a WatermelonDB, saca los datos y los pone a disposición de toda la app
  const loadProfileData = async (id: string) => {
    try {
      const perfilesDb = database.collections.get("perfiles");
      const infoPerfilesDb = database.collections.get("informacion_perfil");
      const permisosDb = database.collections.get("permisos");

      // 1. Buscamos el perfil principal
      const perfil = (await perfilesDb.find(id)) as any;

      // 2. Buscamos la información del perfil (Para sacar el ROL)
      let rolUsuario = "Empleado";
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
        // Fallback a permisos cacheados offline
        if (perfil && perfil.cachedPermissionsJson) {
          try {
            const cached = JSON.parse(perfil.cachedPermissionsJson);
            if (cached.borrar) {
              hasDeletePermission = true;
            }
          } catch (err) {}
        }
      }

      if (perfil) {
        setUserId(id);
        setUserName(perfil.usuario || "Usuario");
        setUserRole(rolUsuario);
        setCanDelete(
          rolUsuario === "Administrador" ||
            rolUsuario === "DEV" ||
            hasDeletePermission
        );
      }
    } catch (e) {
      console.log("No se pudo cargar el perfil de WatermelonDB");
    }
  };

  // Función que usarás en tu Login
  const loginLocal = async (id: string, isOnline = false) => {
    if (!isOnline) {
      const isTtlValid = await checkOfflineTtl(id);
      if (!isTtlValid) {
        throw new Error("SESION_OFFLINE_EXPIRADA");
      }
    }

    const perfilesDb = database.collections.get("perfiles");
    const infoPerfilesDb = database.collections.get("informacion_perfil");
    const permisosDb = database.collections.get("permisos");

    const perfil = (await perfilesDb.find(id)) as any;
    const deviceId = getDeviceId();

    let rolUsuario = "Empleado";
    try {
      const infoPerfil = (await infoPerfilesDb.find(id)) as any;
      if (infoPerfil && infoPerfil.rol) {
        rolUsuario = infoPerfil.rol;
      }
    } catch (e) {}

    let ttl = 168; // Vendedor / Empleado por defecto
    if (rolUsuario === "Administrador" || rolUsuario === "DEV") {
      ttl = 24;
    } else if (rolUsuario === "Supervisor") {
      ttl = 72;
    }

    let permissionsJson = "{}";
    try {
      const p = (await permisosDb.find(id)) as any;
      if (p) {
        permissionsJson = JSON.stringify({
          inventario: p.inventario,
          clientes: p.clientes,
          facturas: p.facturas,
          precios: p.precios,
          usuarios: p.usuarios,
          configuraciones: p.configuraciones,
          borrar: p.borrar,
        });
      }
    } catch (e) {}

    // Si es online, refrescamos lastOnlineAt, offlineTtlHours, deviceId, y cachedPermissionsJson
    if (isOnline && perfil) {
      await database.write(async () => {
        await perfil.update((r: any) => {
          r.deviceId = deviceId;
          r.lastOnlineAt = Date.now();
          r.offlineTtlHours = ttl;
          r.cachedPermissionsJson = permissionsJson;
        });
      });

      // Registrar sesión activa en sesiones_dispositivo
      await database.write(async () => {
        const sesionesDb = database.collections.get("sesiones_dispositivo");
        const activeSessions = await sesionesDb
          .query(Q.where("device_id", deviceId), Q.where("is_active", true))
          .fetch();

        await database.batch(
          ...activeSessions.map((s: any) =>
            s.prepareUpdate((record: any) => {
              record.isActive = false;
              record.revokedAt = Date.now();
            })
          )
        );

        await sesionesDb.create((record: any) => {
          record.perfilId = id;
          record.deviceId = deviceId;
          record.deviceName =
            typeof navigator !== "undefined"
              ? navigator.userAgent
              : "Dispositivo local";
          record.lastOnlineAt = Date.now();
          record.offlineTtlHours = ttl;
          record.isActive = true;
        });
      });
    }

    await AsyncStorage.setItem("activeUserId", id);
    await loadProfileData(id);
  };

  // Función que usarás en tu SideBarMenu
  const logoutLocal = async () => {
    const deviceId = getDeviceId();
    try {
      // Deactivar sesión local
      const sesionesDb = database.collections.get("sesiones_dispositivo");
      const activeSessions = await sesionesDb
        .query(Q.where("device_id", deviceId), Q.where("is_active", true))
        .fetch();

      if (activeSessions.length > 0) {
        await database.write(async () => {
          await database.batch(
            ...activeSessions.map((s: any) =>
              s.prepareUpdate((record: any) => {
                record.isActive = false;
                record.revokedAt = Date.now();
              })
            )
          );
        });
      }
    } catch (e) {
      console.log("Error al desactivar sesión en logout:", e);
    }

    await AsyncStorage.removeItem("activeUserId");
    try {
      await supabase.auth.signOut();
    } catch (e) {}

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
        isDev: userRole === "DEV",
        canDelete,
        loading,
        loginLocal,
        logoutLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
