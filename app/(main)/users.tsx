import * as Crypto from "expo-crypto";
import {
  AlertTriangle,
  AtSign,
  Check,
  Edit2,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Unlock,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Importamos tus modales
import ErrorModal from "../../components/ui/modals/ErrorModal";
import SuccessModal from "../../components/ui/modals/SuccessModal";
import WarningModal from "../../components/ui/modals/WarningModal";
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";

import { supabase } from "../../src/services/api/supabaseClient";
import { database } from "../../src/services/DB/indexBD";
import { syncApp } from "../../src/sync";

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  Administrador: [
    "Inventario",
    "Clientes",
    "Facturas",
    "Precios",
    "Usuarios",
    "Configuraciones",
  ],
  Ventas: ["Inventario", "Clientes", "Facturas"],
  Cobranza: ["Clientes", "Facturas"],
  Empleado: ["Inventario", "Clientes"],
  Personalizado: [],
};

type RoleType =
  | "Administrador"
  | "Empleado"
  | "Ventas"
  | "Cobranza"
  | "Personalizado"
  | "DEV";

interface UserItem {
  id: string;
  username: string;
  nombres: string;
  apePaterno: string;
  apeMaterno: string;
  email: string;
  role: RoleType;
  status: boolean;
  permissions: string[];
}



export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estados de Bitácora y Modales Genéricos
  const tablesToWatch = useMemo(() => ["perfiles", "informacion_perfil", "permisos"], []);
  const { syncErrors, handleDismissError, loadSyncErrors } = useSyncErrors(tablesToWatch);
  const [errorToRecover, setErrorToRecover] = useState<SyncError | null>(null);
  const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);

  // Catch automatic recover from URL query
  useEffect(() => {
    // If syncErrors loads and there's a recoverErrorId in the URL, trigger it once
    const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
    if (autoRecoverId && syncErrors.length > 0) {
      const error = syncErrors.find(e => e.id === autoRecoverId);
      if (error && !errorToRecover) {
        triggerRecovery(error);
      }
    }
  }, [syncErrors]);

  const [warningModalConfig, setWarningModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  const [resetEmailConfig, setResetEmailConfig] = useState<{
    isOpen: boolean;
    userEmail: string;
    userName: string;
  }>({
    isOpen: false,
    userEmail: "",
    userName: "",
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Campos del formulario
  const [nombres, setNombres] = useState("");
  const [apePaterno, setApePaterno] = useState("");
  const [apeMaterno, setApeMaterno] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleType>("Empleado");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    DEFAULT_PERMISSIONS["Empleado"],
  );

  const permissionOptions = DEFAULT_PERMISSIONS["Administrador"];

  const PERM_KEYS: Record<string, string> = {
    Inventario: "inventario",
    Clientes: "clientes",
    Facturas: "facturas",
    Precios: "precios",
    Usuarios: "usuarios",
    Configuraciones: "configuraciones",
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingTable(true);
    try {
      const perfilesDb = database.collections.get("perfiles");
      const infoDb = database.collections.get("informacion_perfil");
      const permisosDb = database.collections.get("permisos");

      const allPerfiles = await perfilesDb.query().fetch();

      const combinedUsers = await Promise.all(
        allPerfiles.map(async (p: any) => {
          let info: any = null;
          let perms: any = null;
          try {
            info = await infoDb.find(p.id);
            perms = await permisosDb.find(p.id);
          } catch (e) { }

          const activePerms: string[] = [];
          if (perms) {
            for (const [label, key] of Object.entries(PERM_KEYS)) {
              if (perms[key]) activePerms.push(label);
            }
          }

          return {
            id: p.id,
            username: p.usuario,
            nombres: info ? info.nombres : "",
            apePaterno: info ? info.apePaterno : "",
            apeMaterno: info ? info.apeMaterno : "",
            email: info ? info.correo : "Sin correo",
            role: info ? info.rol : "Empleado",
            status: p.estado,
            permissions:
              info?.rol === "DEV" || info?.rol === "Administrador"
                ? DEFAULT_PERMISSIONS["Administrador"]
                : activePerms,
          };
        }),
      );

      setUsersList(combinedUsers.filter((u) => u.role !== "DEV"));
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setIsLoadingTable(false);
    }
  };



  // ==========================================
  // ✨ LÓGICA DE RECUPERACIÓN DE DATOS
  // ==========================================
  const triggerRecovery = (err: SyncError) => {
    setErrorToRecover(err);
    setRecoveringErrorId(err.id);
    setWarningModalConfig({
      isOpen: true,
      title: "Recuperar Información",
      message: "Los datos rescatados sobrescribirán la información actual del formulario. Por razones de seguridad, deberás escribir una nueva contraseña. ¿Deseas continuar?",
      onConfirm: confirmRecovery,
    });
  };

  const confirmRecovery = () => {
    if (!errorToRecover) return;

    const data = errorToRecover.datosAtrapados;

    if (data.nombres) setNombres(data.nombres);
    if (data.ape_paterno) setApePaterno(data.ape_paterno);
    if (data.ape_materno) setApeMaterno(data.ape_materno);
    if (data.correo) setEmail(data.correo);
    if (data.rol) setRole(data.rol as RoleType);
    if (data.estado !== undefined) setIsActive(data.estado);

    setPassword("");

    if (errorToRecover.accion === "updated" && data.id) {
      setEditingUserId(data.id);
      setMessage({
        type: "success",
        text: "Datos cargados en el formulario. Corrige la información y vuelve a guardar.",
      });
    } else {
      setEditingUserId(null);
      setMessage({
        type: "success",
        text: "Información rescatada exitosamente. Por favor, asigna una nueva contraseña y registra al usuario.",
      });
    }

    setWarningModalConfig((prev) => ({ ...prev, isOpen: false }));
    setErrorToRecover(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (DEFAULT_PERMISSIONS[role] && !editingUserId) {
      setSelectedPermissions(DEFAULT_PERMISSIONS[role]);
    }
  }, [role, editingUserId]);

  const resetForm = () => {
    setEditingUserId(null);
    setNombres("");
    setApePaterno("");
    setApeMaterno("");
    setEmail("");
    setPassword("");
    setRole("Empleado");
    setIsActive(true);
    setSelectedPermissions(DEFAULT_PERMISSIONS["Empleado"]);
  };

  const handleEditClick = (user: UserItem) => {
    setEditingUserId(user.id);
    setNombres(user.nombres);
    setApePaterno(user.apePaterno);
    setApeMaterno(user.apeMaterno || "");
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.status);
    setSelectedPermissions(user.permissions);
    setPassword("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = (
    userId: string,
    userName: string,
    currentStatus: boolean,
  ) => {
    const accion = currentStatus ? "desactivar" : "reactivar";

    setWarningModalConfig({
      isOpen: true,
      title: `Confirmar Acción`,
      message: `¿Estás seguro que deseas ${accion} al usuario ${userName}?`,
      onConfirm: async () => {
        setWarningModalConfig((prev) => ({ ...prev, isOpen: false }));
        await executeToggleStatus(userId, currentStatus);
      }
    });
  };

  const executeToggleStatus = async (userId: string, currentStatus: boolean) => {

    try {
      const perfilesDb = database.collections.get("perfiles");
      const perfilRecord = (await perfilesDb.find(userId)) as any;

      await database.write(async () => {
        await perfilRecord.update((p: any) => {
          p.estado = !currentStatus;
        });
      });

      setMessage({
        type: "success",
        text: `Usuario ${currentStatus ? "inactivado" : "activado"} correctamente. Sincronizando en segundo plano...`,
      });
      if (editingUserId === userId) resetForm();
      loadUsers();
      syncApp().catch(console.error);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error al actualizar el estado localmente.",
      });
    }
  };

  const cleanString = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "");
  };

  const generatePreviewUsername = () => {
    if (!nombres || !apePaterno) return "nombre.apellido";
    const nom = cleanString(nombres.split(" ")[0]);
    const pat = cleanString(apePaterno);
    return `${nom}.${pat}`;
  };

  const findAvailableUsername = async (
    nomBase: string,
    apePatBase: string,
    apeMatBase: string,
  ) => {
    const base = `${nomBase}.${apePatBase}`;

    const isAvailable = async (nick: string) => {
      const { data, error } = await supabase.rpc(
        "verificar_nickname_disponible",
        { p_nickname: nick },
      );
      if (error) throw new Error("Error comprobando usuario de acceso");
      return data;
    };

    if (await isAvailable(base)) return base;

    if (apeMatBase) {
      for (let i = 1; i <= apeMatBase.length; i++) {
        const attempt = `${base}${apeMatBase.substring(0, i)}`;
        if (await isAvailable(attempt)) return attempt;
      }
    }

    let counter = 1;
    while (true) {
      const attempt = `${base}${counter}`;
      if (await isAvailable(attempt)) return attempt;
      counter++;
      if (counter > 50)
        throw new Error("No se pudo generar un usuario de acceso único");
    }
  };

  const handleSendResetEmail = async () => {
    const emailToReset = resetEmailConfig.userEmail;
    if (!emailToReset || emailToReset === "Sin correo") {
      setMessage({ type: "error", text: "El usuario no tiene un correo válido registrado." });
      setResetEmailConfig((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    setResetEmailConfig((prev) => ({ ...prev, isOpen: false }));
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset);
      if (error) throw error;

      setMessage({
        type: "success",
        text: `Link de recuperación enviado correctamente a ${emailToReset}.`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Error al enviar correo de recuperación: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GUARDAR USUARIO (CREAR O EDITAR)
  // ==========================================
  const handleSubmit = async () => {
    if (!nombres || !apePaterno || (!email && !editingUserId)) {
      setMessage({
        type: "error",
        text: "Por favor, completa los campos obligatorios.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingUserId) {
        // 🔥 MODO EDICIÓN
        const infoDb = database.collections.get("informacion_perfil");
        const permisosDb = database.collections.get("permisos");
        const perfilesDb = database.collections.get("perfiles");

        const infoRecord = (await infoDb.find(editingUserId)) as any;
        const permRecord = (await permisosDb.find(editingUserId)) as any;
        const perfilRecord = (await perfilesDb.find(editingUserId)) as any;

        await database.write(async () => {
          await infoRecord.update((info: any) => {
            info.nombres = nombres;
            info.apePaterno = apePaterno;
            info.apeMaterno = apeMaterno;
            info.rol = role;
          });

          await permRecord.update((perm: any) => {
            const isDevOrAdmin = role === "DEV" || role === "Administrador";
            for (const [label, key] of Object.entries(PERM_KEYS)) {
              perm[key] = isDevOrAdmin ? true : selectedPermissions.includes(label);
            }
          });

          await perfilRecord.update((p: any) => {
            p.estado = isActive;
          });
        });

        setMessage({
          type: "success",
          text: "Información de usuario actualizada. Sincronizando en segundo plano...",
        });
        if (recoveringErrorId) {
          handleDismissError(recoveringErrorId);
          setRecoveringErrorId(null);
        }
        resetForm();
        loadUsers();
        syncApp().catch(console.error);
      } else {
        // 🔥 MODO CREACIÓN
        if (!password || password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }

        const nomBase = cleanString(nombres.split(" ")[0]);
        const patBase = cleanString(apePaterno);
        const matBase = cleanString(apeMaterno);
        const finalNickname = await findAvailableUsername(
          nomBase,
          patBase,
          matBase,
        );

        // Preparamos los permisos
        const pInv = selectedPermissions.includes("Inventario");
        const pCli = selectedPermissions.includes("Clientes");
        const pFac = selectedPermissions.includes("Facturas");
        const pPre = selectedPermissions.includes("Precios");
        const pUsu = selectedPermissions.includes("Usuarios");
        const pConf = selectedPermissions.includes("Configuraciones");

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: email,
            password: password,
            options: {
              data: {
                nickname: finalNickname,
                rol: role,
                nombres: nombres,
                ape_paterno: apePaterno,
                ape_materno: apeMaterno,
                p_inventario: pInv,
                p_clientes: pCli,
                p_facturas: pFac,
                p_precios: pPre,
                p_usuarios: pUsu,
                p_configuraciones: pConf,
              },
            },
          },
        );

        if (authError) throw authError;
        const newUserId = authData.user?.id;
        if (!newUserId) throw new Error("No se generó el UUID en Supabase");

        const hashedPass = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password,
        );

        await database.write(async () => {
          const perfilesDb = database.collections.get("perfiles");
          const infoDb = database.collections.get("informacion_perfil");
          const permisosDb = database.collections.get("permisos");

          await perfilesDb.create((perfil: any) => {
            perfil._raw.id = newUserId;
            perfil.usuario = finalNickname;
            perfil.hashLocal = hashedPass;
            perfil.estado = isActive;
            perfil._raw.syncStatus = "synced";
          });

          await infoDb.create((info: any) => {
            info._raw.id = newUserId;
            info.correo = email;
            info.rol = role;
            info.nombres = nombres;
            info.apePaterno = apePaterno;
            info.apeMaterno = apeMaterno;
            info._raw.syncStatus = "synced";
          });

          await permisosDb.create((perm: any) => {
            perm._raw.id = newUserId;
            perm.inventario = pInv;
            perm.clientes = pCli;
            perm.facturas = pFac;
            perm.precios = pPre;
            perm.usuarios = pUsu;
            perm.configuraciones = pConf;
            perm._raw.syncStatus = "synced";
          });
        });

        setMessage({
          type: "success",
          text: `Usuario creado exitosamente. Su usuario de acceso es: ${finalNickname}`,
        });
        if (recoveringErrorId) {
          handleDismissError(recoveringErrorId);
          setRecoveringErrorId(null);
        }
        resetForm();
        loadUsers();
        syncApp().catch(console.error);
      }
    } catch (error: any) {
      let errorMsg = error.message;
      if (errorMsg.includes("User already registered"))
        errorMsg = "Este correo electrónico ya está registrado.";
      else if (errorMsg.includes("Failed to fetch"))
        errorMsg =
          "Se requiere internet para comprobar y registrar nuevos usuarios.";

      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return usersList;
    const s = searchTerm.toLowerCase();
    return usersList.filter(
      (u) =>
        u.username?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.nombres?.toLowerCase().includes(s) ||
        u.apePaterno?.toLowerCase().includes(s),
    );
  }, [usersList, searchTerm]);

  const StatusBadge = ({ active }: { active: boolean }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${active ? "bg-emerald-100/80 text-emerald-700 border border-emerald-200/50" : "bg-rose-100/80 text-rose-700 border border-rose-200/50"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`}
      ></span>
      {active ? "Activo" : "Inactivo"}
    </span>
  );

  const RoleBadge = ({ roleName }: { roleName: string }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shadow-sm ${roleName === "Administrador" ? "bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-700 border-indigo-200" : "bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border-blue-200"}`}
    >
      <Shield className="w-3 h-3" />
      {roleName}
    </span>
  );

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans relative">
      <div className="max-w-7xl mx-auto">
        {/* MODALES REUTILIZABLES */}
        <SuccessModal
          isOpen={message?.type === "success"}
          onClose={() => setMessage(null)}
          title="¡Éxito!"
          message={message?.type === "success" ? message.text : ""}
        />
        <ErrorModal
          isOpen={message?.type === "error"}
          onClose={() => setMessage(null)}
          title="Ocurrió un problema"
          message={message?.type === "error" ? message.text : ""}
        />
        <WarningModal
          isOpen={warningModalConfig.isOpen}
          onClose={() => setWarningModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={warningModalConfig.onConfirm}
          title={warningModalConfig.title}
          message={warningModalConfig.message}
        />

        <WarningModal
          isOpen={resetEmailConfig.isOpen}
          onClose={() => setResetEmailConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleSendResetEmail}
          title="Enviar Recuperación"
          message={`¿Enviar link de recuperación de contraseña al correo de ${resetEmailConfig.userName} (${resetEmailConfig.userEmail})?`}
        />


        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Administra los accesos y roles de tu equipo de trabajo.
            </p>
          </div>
          {editingUserId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-lg transition-colors text-sm shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Cancelar Edición
            </button>
          )}
        </div>

        {/* ✨ BANNER DE ERRORES DE SINCRONIZACIÓN */}
        <SyncErrorBanner 
           errors={syncErrors} 
           onRecover={triggerRecovery} 
           onDismiss={handleDismissError} 
           contextName="Usuario" 
           isHighPriority={false} 
        />

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Panel Izquierdo: Lista de Usuarios */}
          <div className="w-full xl:w-2/3 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                  placeholder="Buscar usuarios por nombre, apellido o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3 xl:px-3">Usuario</th>
                      <th className="px-4 py-3 xl:px-3">Rol</th>
                      <th className="px-4 py-3 xl:px-3">Permisos</th>
                      <th className="px-4 py-3 xl:px-3">Estado</th>
                      <th className="px-4 py-3 xl:px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 relative">
                    {isLoadingTable ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-slate-500"
                        >
                          No hay usuarios que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={`transition-colors group ${editingUserId === user.id ? "bg-blue-50/50" : "hover:bg-slate-50/80"}`}
                        >
                          <td className="px-4 py-3 xl:px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border text-slate-700 font-bold text-sm shadow-sm">
                                {user.nombres[0]?.toUpperCase() || ""}
                                {user.apePaterno[0]?.toUpperCase() || ""}
                              </div>
                              <div>
                                <p className="text-slate-900 font-bold">
                                  {user.nombres} {user.apePaterno}
                                </p>
                                <p className="text-slate-500 text-xs mt-0.5 flex gap-2">
                                  <span>{user.username}</span> •{" "}
                                  <span className="text-blue-500">
                                    {user.email}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 xl:px-3">
                            <RoleBadge roleName={user.role} />
                          </td>
                          <td className="px-4 py-3 xl:px-3">
                            {user.role === "Administrador" ? (
                              <span className="text-xs font-bold text-slate-500 italic">
                                Acceso Total
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[140px] whitespace-normal">
                                {user.permissions &&
                                  user.permissions.length > 0 ? (
                                  user.permissions.map((p: string) => (
                                    <span
                                      key={p}
                                      className="px-2 py-0.5 bg-slate-100 border text-slate-600 rounded-md text-[10px] font-bold uppercase"
                                    >
                                      {p}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs font-medium text-slate-400 italic">
                                    Sin permisos
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 xl:px-3">
                            <StatusBadge active={user.status} />
                          </td>
                          <td className="px-4 py-3 xl:px-3 text-center text-slate-400">
                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditClick(user)}
                                className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setResetEmailConfig({
                                  isOpen: true,
                                  userEmail: user.email,
                                  userName: user.nombres,
                                })}
                                className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-sm"
                                title="Enviar Link de Recuperación"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleStatus(
                                    user.id,
                                    user.nombres,
                                    user.status,
                                  )
                                }
                                className={`p-2 rounded-lg shadow-sm ${user.status ? "hover:text-rose-600 hover:bg-rose-50" : "hover:text-emerald-600 hover:bg-emerald-50"}`}
                                title={user.status ? "Desactivar" : "Reactivar"}
                              >
                                {user.status ? (
                                  <Trash2 className="w-4 h-4" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Formulario de Captura */}
          <div className="w-full xl:w-1/3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5"
            >
              <h2 className="text-lg font-bold text-slate-800">
                {editingUserId ? "Editar Usuario" : "Registrar Nuevo Usuario"}
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nombre(s) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Ej: Ana María"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ap. Paterno <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Ej: Martinez"
                      value={apePaterno}
                      onChange={(e) => setApePaterno(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ap. Materno
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Ej: Hernandez"
                      value={apeMaterno}
                      onChange={(e) => setApeMaterno(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {!editingUserId && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                      <AtSign size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Usuario de Acceso (Auto-generado)
                      </p>
                      <p className="text-sm font-bold text-blue-700">
                        {generatePreviewUsername()}
                      </p>
                    </div>
                  </div>
                )}

                {!editingUserId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Correo Electrónico <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="ana@distribuidoramh.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {/* 🔥 CONTRASEÑA COMPLETAMENTE REMOVIDA EN MODO EDICIÓN */}
                {!editingUserId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Contraseña <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-blue-500 transition-colors z-10"
                      >
                        {showPassword ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium outline-none transition-all ${password.length > 0 && password.length < 6 ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500"}`}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Rol
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                      value={role}
                      onChange={(e) => setRole(e.target.value as RoleType)}
                      disabled={isLoading}
                    >
                      <option value="Empleado">Empleado</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Cobranza">Cobranza</option>
                      <option value="Personalizado">Personalizado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Estado
                    </label>
                    <div className="flex flex-col justify-center h-[42px] px-1">
                      <label className="flex items-center cursor-pointer relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isActive}
                          onChange={() => setIsActive(!isActive)}
                          disabled={isLoading}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                        <span
                          className={`ml-3 text-sm font-bold ${isActive ? "text-blue-700" : "text-slate-400"}`}
                        >
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Permisos de Acceso
                  </label>
                  {role === "Administrador" ? (
                    <p className="text-xs font-bold text-slate-500 italic py-2">
                      El rol Administrador tiene acceso total a todos los módulos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {permissionOptions.map((perm) => {
                        const isSelected = selectedPermissions.includes(perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            onClick={() => togglePermission(perm)}
                            disabled={isLoading}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${isSelected ? "bg-blue-50/50 border-blue-300 shadow-sm shadow-blue-500/10" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0 ${isSelected ? "bg-blue-600 text-white scale-110" : "bg-white border-2 border-slate-300"}`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3" strokeWidth={3} />
                              )}
                            </div>
                            <span
                              className={`text-xs font-bold tracking-wide truncate ${isSelected ? "text-blue-800" : "text-slate-600"}`}
                            >
                              {perm}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 active:scale-[0.98] ${isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : editingUserId ? (
                      <>
                        <Edit2 className="w-5 h-5" />
                        <span>Guardar Cambios</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        <span>Registrar Usuario</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <br />
      </div>
    </div>
  );
}
