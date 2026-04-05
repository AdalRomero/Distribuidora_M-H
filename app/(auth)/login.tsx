import { useRouter } from "expo-router";
import { Lock, Unlock, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../src/services/api/supabaseClient";

import { Q } from "@nozbe/watermelondb";
import * as Crypto from "expo-crypto";
import { database } from "../../src/services/DB/indexBD";

import { syncApp } from "../../src/sync";
// IMPORTAMOS EL CONTEXTO MÁGICO
import { useAuth } from "../../src/context/AuthContext";

// Images served from public/ directory
const logoCaja = "/images/logo-mh.svg";
const logoPastel = "/images/logo-repostero.svg";
const imgPaquetes = "/images/paquetes.jpg";
const imgPasteles = "/images/pasteles.jpg";

type BusinessType = "caja" | "pastel";

export default function Login() {
  const router = useRouter();

  // EXTRAEMOS LA FUNCIÓN DEL CONTEXTO
  const { loginLocal } = useAuth();

  const [accessNumber, setAccessNumber] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormLeft, setIsFormLeft] = useState(true);
  const [businessType, setBusinessType] = useState<BusinessType>("caja");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (businessType === "pastel") {
      setError(
        "El sistema de La Tiendita del Repostero estará disponible en una futura actualización.",
      );
      setLoading(false);
      return;
    }

    try {
      const inputIngresado = username.trim();

      const hashedInput = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        accessNumber,
      );

      const infoPerfiles = database.collections.get("informacion_perfil");
      const perfilesDb = database.collections.get("perfiles");

      // ==========================================
      // 1. TRADUCTOR Y BÚSQUEDA LOCAL
      // ==========================================
      let userIdLocal: string | null = null;
      let correoParaSupabase = inputIngresado;

      const busquedaCorreo = await infoPerfiles
        .query(Q.where("correo", inputIngresado))
        .fetch();

      if (busquedaCorreo.length > 0) {
        userIdLocal = busquedaCorreo[0].id;
        correoParaSupabase = (busquedaCorreo[0] as any).correo;
      } else {
        const busquedaUsuario = await perfilesDb
          .query(Q.where("usuario", inputIngresado))
          .fetch();

        if (busquedaUsuario.length > 0) {
          userIdLocal = busquedaUsuario[0].id;
          try {
            const infoLocal = (await infoPerfiles.find(userIdLocal)) as any;
            correoParaSupabase = infoLocal.correo;
          } catch (e) {
            console.log("No se pudo resolver el correo del usuario.");
          }
        }
      }

      // ==========================================
      // 2. NUEVA LÓGICA: ONLINE FIRST -> OFFLINE FALLBACK
      // ==========================================
      let accesoConcedido = false;
      let userId: string | null = null;

      try {
        console.log("Intentando inicio de sesión ONLINE con Supabase...");

        if (!userIdLocal && !inputIngresado.includes("@")) {
          throw new Error("primer_ingreso_requiere_correo");
        }

        // INTENTO ONLINE SIEMPRE PRIMERO
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: correoParaSupabase,
            password: accessNumber,
          });

        if (signInError) {
          // Si es error de red, lanzamos un error específico para caer al catch y activar el modo offline
          if (
            signInError.message.includes("Network request failed") ||
            signInError.message.includes("Failed to fetch") ||
            signInError.message.includes("network")
          ) {
            throw new Error("NETWORK_ERROR");
          }
          // Si la contraseña es incorrecta en la nube, rechazamos inmediatamente (bloquea contraseñas viejas)
          if (signInError.message.includes("Invalid login credentials")) {
            throw new Error("Usuario o contraseña incorrectos.");
          }
          throw signInError;
        }

        // SI LLEGAMOS AQUÍ, LA CONTRASEÑA ES CORRECTA EN LA NUBE
        userId = data.user.id;

        // VERIFICAR ESTADO EN LA NUBE
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("estado")
          .eq("id", userId)
          .single();

        let onlineDisabled = false;

        // Si la consulta fue exitosa y devuleve false
        if (perfilData && perfilData.estado === false) {
          onlineDisabled = true;
        }

        // Si hubo error 403 (Forbidden) u otro error de RLS, miramos nuestra base local
        if (perfilError && userIdLocal) {
          const checkLocal = (await perfilesDb.find(userIdLocal)) as any;
          if (checkLocal.estado === false) {
            onlineDisabled = true;
          }
        }

        if (onlineDisabled) {
          await supabase.auth.signOut();
          throw new Error("USUARIO_DESHABILITADO");
        }

        accesoConcedido = true;

        // GUARDADO DE HASH (Actualiza la base local con la nueva contraseña)
        if (userId) {
          try {
            const perfilAActualizar = (await perfilesDb.find(userId)) as any;

            await database.write(async () => {
              await perfilAActualizar.update((perfil: any) => {
                perfil.hashLocal = hashedInput;
              });
            });
            console.log(
              "Hash actualizado exitosamente con la contraseña de la nube.",
            );
          } catch (e) {
            console.log(
              "Primer inicio de sesión detectado. Sincronizando catálogo antes de entrar...",
            );

            await syncApp();

            try {
              const perfilDescargado = (await perfilesDb.find(userId)) as any;

              // Si en el sync bajó como falso, cerramos de inmediato
              if (perfilDescargado.estado === false) {
                await supabase.auth.signOut();
                throw new Error("USUARIO_DESHABILITADO");
              }

              await database.write(async () => {
                await perfilDescargado.update((perfil: any) => {
                  perfil.hashLocal = hashedInput;
                });
              });
              console.log("¡Éxito! Catálogo sincronizado y Hash guardado.");
            } catch (syncError: any) {
              if (syncError.message === "USUARIO_DESHABILITADO") {
                throw syncError;
              }
              console.error("No se pudo guardar el hash tras el sync inicial.");
            }
          }
        }
      } catch (onlineError: any) {
        // 3. MODO OFFLINE: Solo entramos aquí si el internet falló ("NETWORK_ERROR")
        if (onlineError.message === "NETWORK_ERROR") {
          console.log(
            "Sin conexión a la nube. Intentando inicio de sesión OFFLINE...",
          );

          if (userIdLocal) {
            const perfilLocal = (await perfilesDb.find(userIdLocal)) as any;

            if (perfilLocal.estado === false) {
              throw new Error("USUARIO_DESHABILITADO");
            }

            // Revisamos contra la base local
            if (perfilLocal.hashLocal === hashedInput) {
              console.log("Inicio de sesión OFFLINE exitoso");
              accesoConcedido = true;
              userId = userIdLocal;
            } else {
              throw new Error("Usuario o contraseña incorrectos.");
            }
          } else {
            throw new Error(
              "No hay internet. Si es tu primer ingreso, necesitas estar conectado.",
            );
          }
        } else {
          throw onlineError;
        }
      }

      // ==========================================
      // 4. INICIAR CONTEXTO Y REDIRECCIONAR
      // ==========================================
      if (accesoConcedido && userId) {
        // Le pasamos la estafeta (el UUID) al AuthContext
        await loginLocal(userId);

        // Redirigimos al Home
        router.replace("/home" as any);
      }
    } catch (err: any) {
      console.error("Error técnico:", err.message);

      let mensajeAmigable =
        "Ocurrió un problema al intentar iniciar sesión. Intenta nuevamente.";
      const errorReal = err.message || "";

      if (errorReal.includes("primer_ingreso_requiere_correo")) {
        mensajeAmigable =
          "Por ser la primera vez en este equipo, ingresa con tu Correo electrónico. Después podrás usar tu Usuario.";
      } else if (errorReal.includes("USUARIO_DESHABILITADO")) {
        mensajeAmigable =
          "Tu cuenta ha sido deshabilitada. No tienes permitido iniciar sesión.";
      } else if (
        errorReal.includes("Record perfiles#") &&
        errorReal.includes("not found")
      ) {
        mensajeAmigable =
          "Tu cuenta es nueva en este dispositivo. Asegúrate de tener internet para descargar tu perfil.";
      } else if (
        errorReal.includes("Invalid login credentials") ||
        errorReal.includes("Usuario o contraseña incorrectos")
      ) {
        mensajeAmigable =
          "El usuario o la contraseña que ingresaste no son correctos.";
      } else if (
        errorReal.includes("Email not confirmed") ||
        errorReal.includes("email unverified")
      ) {
        mensajeAmigable =
          "Debes confirmar tu correo electrónico antes de poder iniciar sesión. Revisa tu bandeja de entrada o spam.";
      } else if (
        errorReal.includes("Network request failed") ||
        errorReal.includes("Failed to fetch")
      ) {
        mensajeAmigable =
          "No hay conexión a internet. Si es tu primer ingreso, necesitas estar conectado.";
      } else if (
        errorReal.includes("timeout") ||
        errorReal.includes("network")
      ) {
        mensajeAmigable =
          "La conexión está inestable. Verifica tu internet y vuelve a intentarlo.";
      }

      setError(mensajeAmigable);
    } finally {
      setLoading(false);
    }
  };

  const isCaja = businessType === "caja";

  const bgImage = isCaja ? `url(${imgPaquetes})` : `url(${imgPasteles})`;

  const formThemeClass = isCaja
    ? "bg-mist-300 border-mist-300/30 backdrop-blur-xl"
    : "bg-[#cab6af]/95 border-[#cab6af]/30 backdrop-blur-xl";

  const whiteBorder =
    "[text-shadow:_-1px_-1px_0_#fff,_1px_-1px_0_#fff,_-1px_1px_0_#fff,_1px_1px_0_#fff,_0_3px_6px_rgba(0,0,0,0.15)]";

  const titleClass = `${isCaja ? "text-4xl text-blue-900 font-sans tracking-tight" : "text-5xl text-pink-800 font-cookie tracking-tight"} ${whiteBorder}`;
  const headingClass = `${isCaja ? "text-gray-900" : "text-rose-500"}`;
  const labelClass = isCaja ? "text-gray-800" : "text-rose-900 font-medium";

  const inputClass = `w-full pl-11 pr-4 py-3 mt-1 text-gray-900 bg-white/95 border rounded-xl shadow-sm outline-none transition-all duration-300 
    ${
      isCaja
        ? "border-blue-200/50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 placeholder:text-gray-400"
        : "border-rose-200/50 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-400/20 placeholder:text-rose-300"
    }`;

  const iconColorClass = isCaja ? "text-blue-500" : "text-rose-400";

  const submitButtonClass = `w-full py-3 px-4 mt-8 text-white font-medium text-lg rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98] 
    ${
      isCaja
        ? "bg-[#15335c] hover:bg-[#15335c]/80 focus:ring-4 focus:ring-[#15335c]/30"
        : "bg-rose-400 hover:bg-rose-500 focus:ring-4 focus:ring-rose-500/30"
    }`;

  return (
    <div
      className={`flex min-h-screen w-full transition-all duration-700 ease-in-out ${isFormLeft ? "flex-row" : "flex-row-reverse"}`}
    >
      <div
        className={`relative z-10 w-full lg:w-[400px] xl:w-[450px] shrink-0 flex flex-col justify-center px-8 sm:px-12 py-8 shadow-2xl transition-colors duration-500 ${formThemeClass}`}
      >
        <button
          type="button"
          onClick={() => setIsFormLeft(!isFormLeft)}
          className="absolute top-6 right-6 z-20 p-2 rounded-full hover:bg-black/10 transition-colors text-gray-800"
          title="Intercambiar vista"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h1 className={`font-bold transition-all duration-300 ${titleClass}`}>
            {isCaja ? "DISTRIBUIDORA M-H" : "La Tiendita del Repostero"}
          </h1>
          <h2
            className={`text-2xl font-bold mt-1 transition-all duration-300 ${headingClass}`}
          >
            Iniciar Sesión
          </h2>
          <p
            className={`mt-2 text-sm font-medium transition-colors duration-300 ${isCaja ? "text-gray-800" : "text-pink-900"}`}
          >
            Selecciona el área de trabajo
          </p>
        </div>

        <div className="flex justify-center gap-10 mb-8 relative">
          <button
            type="button"
            onClick={() => setBusinessType("caja")}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-500 ease-out overflow-visible ${
              isCaja
                ? "bg-white border-blue-500 shadow-[0_8px_24px_-6px_rgba(59,130,246,0.6)] scale-110 z-10"
                : "bg-white/40 border-white/50 shadow-sm hover:bg-white/70 hover:-translate-y-1 backdrop-blur-md"
            }`}
          >
            <div
              className={`w-8 h-8 transition-colors duration-500 ${isCaja ? "bg-blue-600" : "bg-gray-500/80 saturate-50"}`}
              style={{
                maskImage: `url(${logoCaja})`,
                WebkitMaskImage: `url(${logoCaja})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
            {isCaja && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs shadow-md border-2 border-white">
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setBusinessType("pastel")}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-500 ease-out overflow-visible ${
              !isCaja
                ? "bg-white border-rose-500 shadow-[0_8px_24px_-6px_rgba(244,63,94,0.6)] scale-110 z-10"
                : "bg-white/40 border-white/50 shadow-sm hover:bg-white/70 hover:-translate-y-1 backdrop-blur-md"
            }`}
          >
            <div
              className={`w-9 h-9 transition-colors duration-500 ${!isCaja ? "bg-rose-500" : "bg-gray-500/80 saturate-50"}`}
              style={{
                maskImage: `url(${logoPastel})`,
                WebkitMaskImage: `url(${logoPastel})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
            {!isCaja && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs shadow-md border-2 border-white">
                ✓
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-400 text-red-700 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className={`block text-sm font-semibold mb-1 pointer-events-none transition-colors duration-300 ${labelClass}`}
            >
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User
                  className={`w-5 h-5 transition-colors duration-300 ${iconColorClass}`}
                />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                required
                placeholder="Ingresa tu usuario"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="accessNumber"
              className={`block text-sm font-semibold mb-1 pointer-events-none transition-colors duration-300 ${labelClass}`}
            >
              Contraseña
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-4 flex items-center z-20 hover:opacity-70 transition-opacity"
                title={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <Unlock
                    className={`w-5 h-5 transition-colors duration-300 ${iconColorClass}`}
                  />
                ) : (
                  <Lock
                    className={`w-5 h-5 transition-colors duration-300 ${iconColorClass}`}
                  />
                )}
              </button>
              <input
                id="accessNumber"
                type={showPassword ? "text" : "password"}
                value={accessNumber}
                onChange={(e) => setAccessNumber(e.target.value)}
                className={inputClass}
                required
                placeholder="Ingresa tu contraseña"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={submitButtonClass}
          >
            {loading ? "Cargando..." : "Ingresar"}
          </button>
        </form>
      </div>

      <div
        className="hidden lg:block flex-1 relative bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: bgImage }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-700"></div>
      </div>
    </div>
  );
}
