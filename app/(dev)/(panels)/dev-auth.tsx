import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Cloud,
  Database,
  Eye,
  EyeOff,
  Key,
  Mail,
  Power,
  PowerOff,
  ShieldCheck,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../src/services/api/supabaseClient";
import { database } from "../../../src/services/DB/indexBD";

// Interfaz para los usuarios combinados
interface UserData {
  id: string;
  usuario: string;
  correo: string | null;
  rol: string;
  estado: boolean;
  origen: "LOCAL" | "NUBE";
}

export default function DevAuth() {
  const router = useRouter();

  // Estados para creación de usuario completos
  const [nombres, setNombres] = useState("");
  const [apePaterno, setApePaterno] = useState("");
  const [apeMaterno, setApeMaterno] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Nuevos estados para la UI del formulario
  const [activeTab, setActiveTab] = useState<"general" | "credenciales">(
    "general",
  );
  const [showPassword, setShowPassword] = useState(false);

  // Estados para la lista de usuarios
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewMode, setViewMode] = useState<"LOCAL" | "NUBE">("LOCAL");

  useEffect(() => {
    loadUsers();
  }, [viewMode]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      if (viewMode === "LOCAL") {
        const perfilesDb = database.collections.get("perfiles");
        const infoDb = database.collections.get("informacion_perfil");
        const allPerfiles = await perfilesDb.query().fetch();

        const combinedUsers = await Promise.all(
          allPerfiles.map(async (p: any) => {
            let info: any = null;
            try {
              info = await infoDb.find(p.id);
            } catch (e) {}
            return {
              id: p.id,
              usuario: p.usuario,
              correo: info ? info.correo : "Sin correo",
              rol: info ? info.rol : "Empleado",
              estado: p.estado,
              origen: "LOCAL" as const,
            };
          }),
        );
        setUsersList(combinedUsers);
      } else {
        const { data, error } = await supabase
          .from("perfiles")
          .select("id, usuario, estado, informacion_perfil(correo, rol)");

        if (error) throw error;

        const onlineUsers = data.map((p: any) => {
          const info = Array.isArray(p.informacion_perfil)
            ? p.informacion_perfil[0]
            : p.informacion_perfil;
          return {
            id: p.id,
            usuario: p.usuario,
            correo: info ? info.correo : "Sin correo",
            rol: info ? info.rol : "Empleado",
            estado: p.estado,
            origen: "NUBE" as const,
          };
        });
        setUsersList(onlineUsers);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSendResetLink = async (userEmail: string | null) => {
    if (!userEmail || userEmail === "Sin correo") {
      alert("Este usuario no tiene un correo válido registrado.");
      return;
    }
    if (!confirm(`¿Enviar link de recuperación a ${userEmail}?`)) return;

    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) alert("Error: " + error.message);
    else alert("✅ Link de reseteo enviado a " + userEmail);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "DEV" ? "Empleado" : "DEV";
    if (!confirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) return;

    try {
      // 1. Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from("informacion_perfil")
        .update({ rol: newRole })
        .eq("id", userId);

      if (supabaseError) throw new Error(`Error en la nube: ${supabaseError.message}`);

      // 2. Actualizar localmente si existe
      try {
        const infoDb = database.collections.get("informacion_perfil");
        const infoRecord = (await infoDb.find(userId)) as any;

        await database.write(async () => {
          await infoRecord.update((info: any) => {
            info.rol = newRole;
          });
        });
      } catch (localError) {
        console.warn("Información no encontrada localmente, pero rol actualizado en la nube.");
      }

      alert(`✅ Rol actualizado a ${newRole} en la nube y localmente.`);
      loadUsers();
    } catch (error: any) {
      alert(`Error al actualizar rol: ${error.message}`);
    }
  };

  const handleToggleStatus = async (
    userId: string,
    currentStatus: boolean,
    username: string,
  ) => {
    const action = currentStatus ? "DESACTIVAR" : "REACTIVAR";
    if (!confirm(`¿Deseas ${action} el acceso de ${username}?`)) return;

    try {
      // 1. Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from("perfiles")
        .update({ estado: !currentStatus })
        .eq("id", userId);

      if (supabaseError) throw new Error(`Error en la nube: ${supabaseError.message}`);

      // 2. Actualizar localmente si existe
      try {
        const perfilesDb = database.collections.get("perfiles");
        const perfilRecord = (await perfilesDb.find(userId)) as any;

        await database.write(async () => {
          await perfilRecord.update((p: any) => {
            p.estado = !currentStatus;
          });
        });
      } catch (localError) {
        console.warn("Usuario no encontrado localmente, pero actualizado en la nube.");
      }

      alert(`✅ Usuario ${action}D en la nube y localmente.`);
      loadUsers();
    } catch (error: any) {
      alert(`Error al actualizar estado: ${error.message}`);
    }
  };

  // ==========================================
  // CREACIÓN DE USUARIO MAESTRO
  // ==========================================
  const createDevUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validación manual de campos obligatorios
    if (!nombres || !apePaterno || !nickname || !email || !password) {
      setMessage(
        "❌ Por favor, llena todos los campos obligatorios en ambas pestañas.",
      );
      return;
    }

    if (password.length < 6) {
      setMessage("❌ La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 2. PRE-CHECK: Verificar si el Nickname ya existe en la Nube antes de crear
      // Esto evita que el Trigger colapse y arroje el error 500 genérico
      const { data: existingUser, error: checkError } = await supabase
        .from("perfiles")
        .select("usuario")
        .eq("usuario", nickname)
        .maybeSingle();

      if (existingUser) {
        throw new Error("NICKNAME_DUPLICADO");
      }

      // 3. Mandamos la info a Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nickname: nickname,
            rol: "DEV",
            nombres: nombres,
            ape_paterno: apePaterno,
            ape_materno: apeMaterno,
          },
        },
      });

      // Si Supabase Auth tira error (ej. Correo duplicado), lo lanzamos
      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("No se generó el UUID en Supabase");

      const hashedPass = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
      );

      // 4. Guardamos en la base local de WatermelonDB (Marcándolos como sincronizados)
      await database.write(async () => {
        const perfilesDb = database.collections.get("perfiles");
        const infoDb = database.collections.get("informacion_perfil");
        const permisosDb = database.collections.get("permisos");

        await perfilesDb.create((perfil: any) => {
          perfil._raw.id = newUserId;
          perfil.usuario = nickname;
          perfil.hashLocal = hashedPass;
          perfil.estado = true;
          perfil._raw.syncStatus = "synced";
        });

        await infoDb.create((info: any) => {
          info._raw.id = newUserId;
          info.correo = email;
          info.rol = "DEV";
          info.nombres = nombres;
          info.apePaterno = apePaterno;
          info.apeMaterno = apeMaterno;
          info._raw.syncStatus = "synced";
        });

        await permisosDb.create((perm: any) => {
          perm._raw.id = newUserId;
          perm.inventario = true;
          perm.clientes = true;
          perm.facturas = true;
          perm.precios = true;
          perm.usuarios = true;
          perm.configuraciones = true;
          perm._raw.syncStatus = "synced";
        });
      });

      setMessage("✅ Usuario DEV creado exitosamente.");

      // Limpiamos el formulario y reiniciamos el tab
      setNombres("");
      setApePaterno("");
      setApeMaterno("");
      setEmail("");
      setPassword("");
      setNickname("");
      setActiveTab("general");

      loadUsers();
    } catch (error: any) {
      // 5. TRADUCTOR DE ERRORES AMIGABLES
      let errorMsg = error.message;

      if (errorMsg === "NICKNAME_DUPLICADO") {
        errorMsg =
          "El Nickname ya está en uso. Por favor, elige uno diferente.";
      } else if (errorMsg.includes("User already registered")) {
        errorMsg = "Este correo electrónico ya está registrado en el sistema.";
      } else if (errorMsg.includes("Database error saving new user")) {
        errorMsg =
          "Error en la base de datos (Es probable que el Nickname o Correo ya existan).";
      } else if (
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("Network request failed")
      ) {
        errorMsg = "Error de red. Verifica tu conexión a internet.";
      }

      setMessage(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group w-fit"
      >
        <ArrowLeft
          size={20}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="font-medium">Volver al Panel</span>
      </button>

      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="text-amber-500" size={32} />
        <h1 className="text-3xl font-bold">Gestión de Autenticación</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ==========================================
            FORMULARIO COMPLETO (TABS)
        ========================================== */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 xl:col-span-1 h-fit flex flex-col">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <UserPlus size={20} className="text-emerald-400" />
            Crear SuperUsuario
          </h2>

          {/* Navegación de Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === "general"
                  ? "text-amber-500 border-b-2 border-amber-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Info. General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("credenciales")}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === "credenciales"
                  ? "text-amber-500 border-b-2 border-amber-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Credenciales
            </button>
          </div>

          <form onSubmit={createDevUser} className="flex-1 flex flex-col">
            {/* CONTENIDO TAB 1: INFO GENERAL */}
            {activeTab === "general" && (
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Nombre(s) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                    placeholder="Ej. Juan Carlos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Ap. Paterno <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={apePaterno}
                      onChange={(e) => setApePaterno(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Ap. Materno
                    </label>
                    <input
                      type="text"
                      value={apeMaterno}
                      onChange={(e) => setApeMaterno(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("credenciales")}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded transition-colors"
                  >
                    Siguiente: Credenciales →
                  </button>
                </div>
              </div>
            )}

            {/* CONTENIDO TAB 2: CREDENCIALES */}
            {activeTab === "credenciales" && (
              <div className="space-y-4 flex-1 flex flex-col">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Usuario (Nickname) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                    placeholder="Ej. Rome"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Correo Electrónico <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Contraseña (Mín. 6){" "}
                    <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 pr-10 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      title={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:text-gray-400 text-white font-bold py-3 rounded transition-colors flex justify-center items-center gap-2"
                  >
                    {loading ? "Registrando..." : "Registrar DEV Master"}
                  </button>
                </div>
              </div>
            )}
          </form>

          {message && (
            <p
              className={`mt-4 text-sm font-mono text-center ${
                message.includes("✅") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        {/* ==========================================
            TABLA DIRECTORIO
        ========================================== */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key size={20} className="text-blue-400" />
              Directorio de Accesos
            </h2>

            <div className="flex items-center bg-gray-950 rounded-lg p-1 border border-gray-800">
              <button
                onClick={() => setViewMode("LOCAL")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "LOCAL"
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Database size={16} /> Local
              </button>
              <button
                onClick={() => setViewMode("NUBE")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "NUBE"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Cloud size={16} /> Nube
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-950 text-gray-400 uppercase font-semibold border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3 text-center">Rol</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando usuarios desde {viewMode}...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay usuarios en {viewMode}.
                    </td>
                  </tr>
                ) : (
                  usersList.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                        !user.estado && "opacity-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`flex w-2 h-2 rounded-full ${
                            user.estado ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          title={user.estado ? "Activo" : "Inactivo"}
                        ></span>
                      </td>
                      <td className="px-4 py-3 font-medium">{user.usuario}</td>
                      <td className="px-4 py-3 text-gray-400">{user.correo}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            user.rol === "DEV"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {user.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex justify-end gap-1">
                        <button
                          onClick={() => handleSendResetLink(user.correo)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Enviar link de reseteo"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleRole(user.id, user.rol)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                          title="Cambiar a DEV/Empleado"
                        >
                          <UserCog size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              user.id,
                              user.estado,
                              user.usuario,
                            )
                          }
                          className={`p-2 rounded transition-colors ${
                            user.estado
                              ? "text-red-400 hover:text-red-300 hover:bg-red-900/30"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                          }`}
                          title={
                            user.estado
                              ? "Desactivar Acceso"
                              : "Reactivar Acceso"
                          }
                        >
                          {user.estado ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
