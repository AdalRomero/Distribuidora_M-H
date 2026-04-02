import { useRouter } from "expo-router";
import { Lock, Unlock, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../src/services/api/supabaseClient";

import { Q } from "@nozbe/watermelondb";
import * as Crypto from "expo-crypto";
import { database } from "../../src/services/DB/indexBD";

// Images served from public/ directory
const logoCaja = "/images/logo-mh.svg";
const logoPastel = "/images/logo-repostero.svg";
const imgPaquetes = "/images/paquetes.jpg";
const imgPasteles = "/images/pasteles.jpg";

type BusinessType = "caja" | "pastel";

export default function Login() {
  const router = useRouter();

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
      const hashedInput = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        accessNumber,
      );

      const infoPerfiles = database.collections.get("informacion_perfil");
      const perfilesDb = database.collections.get("perfiles");

      const usuariosEncontrados = await infoPerfiles
        .query(Q.where("correo", username))
        .fetch();

      let accesoConcedido = false;
      let userId: string | null = null;

      if (usuariosEncontrados.length > 0) {
        userId = usuariosEncontrados[0].id;

        // CORRECCIÓN 1: Le decimos a TypeScript que trate esto como "any"
        const perfilLocal = (await perfilesDb.find(userId)) as any;

        if (perfilLocal.hashLocal === hashedInput) {
          console.log("Inicio de sesión OFFLINE exitoso");
          accesoConcedido = true;
        }
      }

      if (!accesoConcedido) {
        console.log("Intentando inicio de sesión ONLINE con Supabase...");

        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: username,
            password: accessNumber,
          });

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            throw new Error("Usuario o contraseña incorrectos.");
          }
          if (signInError.message.includes("Network request failed")) {
            throw new Error(
              "No hay internet. Si es tu primer inicio de sesión, necesitas conexión.",
            );
          }
          throw signInError;
        }

        userId = data.user.id;
        accesoConcedido = true;

        // CORRECCIÓN 2: Nos aseguramos de que userId exista antes de guardar
        if (userId) {
          await database.write(async () => {
            // Agregamos "!" para garantizar a TypeScript que no es nulo y lo casteamos a "any"
            const perfilAActualizar = (await perfilesDb.find(userId!)) as any;
            await perfilAActualizar.update((perfil: any) => {
              perfil.hashLocal = hashedInput;
            });
          });
          console.log(
            "Hash guardado exitosamente para futuros inicios sin internet.",
          );
        }
      }

      if (accesoConcedido && userId) {
        router.replace("/home" as any);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al intentar iniciar sesión.");
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
