import React, { useEffect, useState } from "react";
import { AlertOctagon, RefreshCw, ShieldAlert, Check, Loader2 } from "lucide-react";
import { syncApp } from "../../src/sync";
import { database } from "../../src/services/DB/indexBD";
import WarningModal from "./modals/WarningModal";
import SuccessModal from "./modals/SuccessModal";

export default function SyncProtectionGuard() {
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for custom modals
  const [warningConfig, setWarningConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Comprobamos si hay un bloqueo activo
  const checkBlockStatus = () => {
    if (typeof localStorage !== "undefined") {
      const reason = localStorage.getItem("sync_blocked_reason");
      setBlockedReason(reason);
    }
  };

  useEffect(() => {
    checkBlockStatus();

    // Escuchamos eventos de storage para reaccionar inmediatamente en la pestaña actual
    const handleStorageChange = () => {
      checkBlockStatus();
    };

    window.addEventListener("storage", handleStorageChange);
    // Intervalo de seguridad para revisar el estado cada 2 segundos
    const interval = setInterval(checkBlockStatus, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (!blockedReason) return null;

  // Acción 1: Recuperación Segura (Limpiar local y descargar todo fresco de Supabase)
  const doRecoverFresh = async () => {
    setWarningConfig(prev => ({ ...prev, isOpen: false }));
    setLoading(true);
    setErrorMsg(null);
    try {
      // En web (LokiJS), database.write() + unsafeResetDatabase() tiene un bug conocido
      // donde isWriterRunning puede ser false. Accedemos directamente al adapter.
      const adapter = (database.adapter as any);
      if (typeof adapter.unsafeResetDatabase === 'function') {
        await adapter.unsafeResetDatabase();
      } else if (adapter._adapter && typeof adapter._adapter.unsafeResetDatabase === 'function') {
        await adapter._adapter.unsafeResetDatabase();
      }
      // Limpiar caché de colecciones manualmente
      const cols = (database as any).collections?.map;
      if (cols) Object.values(cols).forEach((col: any) => col._cache?.unsafeClear?.());

      // 2. Limpiamos las banderas de bloqueo e incidencias antiguas locales
      localStorage.removeItem("sync_blocked_reason");
      localStorage.removeItem("wdb_last_known_schema_version"); // Reiniciar guard de versión

      // 3. Forzar limpieza de incidencias locales en localStorage
      const rawIncidents = localStorage.getItem("dist_mh_integrity_incidents");
      if (rawIncidents) {
        const incidents = JSON.parse(rawIncidents);
        const filtered = incidents.filter((i: any) => i.ruleId !== "sync_masivo_bloqueado");
        localStorage.setItem("dist_mh_integrity_incidents", JSON.stringify(filtered));
      }

      setBlockedReason(null);
      setSuccessConfig({
        isOpen: true,
        title: "Base de Datos Restablecida",
        message: "Base de datos local restablecida con éxito. Iniciando sincronización fresca..."
      });

      // 4. Sincronizamos
      await syncApp();
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Error al restablecer la base local: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverFresh = () => {
    setWarningConfig({
      isOpen: true,
      title: "¿Restablecer Base de Datos Local?",
      message: "Esta acción borrará los registros locales del dispositivo y los volverá a descargar todos limpios desde Supabase. Es completamente seguro y no afectará los datos en la nube. ¿Deseas continuar?",
      onConfirm: doRecoverFresh
    });
  };

  // Acción 2: Bypass del Bloqueo (Bajo responsabilidad del Dev/Admin)
  const handleBypassSync = async () => {
    if (confirmInput.toUpperCase() !== "CONFIRMAR") {
      setErrorMsg("Debes escribir la palabra 'CONFIRMAR' exactamente para continuar.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Establecer token temporal de bypass en localStorage
      localStorage.setItem("bypass_bulk_delete_protection", "true");
      
      // 2. Remover bloqueo para permitir el intento de sync
      localStorage.removeItem("sync_blocked_reason");

      // 3. Ejecutar sincronización
      await syncApp();

      // 4. Limpiar incidencia del Integrity Panel
      const rawIncidents = localStorage.getItem("dist_mh_integrity_incidents");
      if (rawIncidents) {
        const incidents = JSON.parse(rawIncidents);
        const filtered = incidents.filter((i: any) => i.ruleId !== "sync_masivo_bloqueado");
        localStorage.setItem("dist_mh_integrity_incidents", JSON.stringify(filtered));
      }

      setBlockedReason(null);
      setSuccessConfig({
        isOpen: true,
        title: "Bypass Aplicado",
        message: "Sincronización forzada con éxito. Los borrados masivos han sido aplicados."
      });
    } catch (e: any) {
      console.error(e);
      // Volver a colocar el bloqueo si falla
      localStorage.setItem("sync_blocked_reason", e.message || "Error al forzar sincronización");
      setBlockedReason(e.message || "Error al forzar sincronización");
      setErrorMsg("Error al sincronizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-md p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
          
          {/* Glow Decorativo de Alerta */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl shrink-0">
              <AlertOctagon size={36} className="animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                Protección Activa contra Pérdida de Datos
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-3">
                Sincronización Bloqueada
              </h2>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                El sistema interceptó un intento de borrado masivo en la base de datos local que se iba a propagar a Supabase.
              </p>
            </div>
          </div>

          {/* Caja de Detalles */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 my-6">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm mb-2">
              <ShieldAlert size={18} />
              <span>Detalles del Incidente</span>
            </div>
            <p className="text-slate-300 text-sm font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              {blockedReason}
            </p>
            <p className="text-slate-400 text-xs mt-3 leading-normal">
              💡 **¿Por qué ocurre esto?** Si modificaste recientemente el esquema de la base de datos local sin una migración definida, WatermelonDB restableció la base local vaciando las tablas. El motor de sincronización interpretó esto como eliminaciones del usuario e intentó vaciar Supabase.
            </p>
          </div>

          {/* Caja de Errores de Acción */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Opciones de Resolución */}
          <div className="space-y-4">
            {/* Opción A: Seguro y Recomendado */}
            <div className="border border-emerald-500/20 hover:border-emerald-500/30 bg-emerald-950/10 rounded-2xl p-5 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  Método Seguro (Recomendado)
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  Restablecer Local y Descargar Todo Fresh
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  Vuelve a descargar toda la base de datos limpia desde Supabase. No corres ningún riesgo de perder información.
                </p>
              </div>
              <button
                onClick={handleRecoverFresh}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/30 transition-all shrink-0 w-full md:w-auto justify-center"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Restablecer Base Local
              </button>
            </div>

            {/* Opción B: Bypass del Developer (Riesgoso) */}
            <div className="border border-red-500/10 bg-red-950/5 rounded-2xl p-5">
              <span className="text-xs font-bold text-red-400 uppercase">
                Método Avanzado (Solo Administradores / Devs)
              </span>
              <h3 className="text-sm font-bold text-white mt-1">
                Sincronizar y Forzar la Eliminación en Supabase
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                Si realmente eliminaste estos registros de forma intencional y deseas replicar el vaciado en la base de datos de producción.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Escribe CONFIRMAR para autorizar"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 focus:border-red-500/50 rounded-xl text-white text-sm font-medium focus:outline-none"
                />
                <button
                  onClick={handleBypassSync}
                  disabled={loading || confirmInput.toUpperCase() !== "CONFIRMAR"}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-950/30 transition-all justify-center"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Bypass y Forzar Sincronización
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <WarningModal
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={warningConfig.onConfirm}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <SuccessModal
        isOpen={successConfig.isOpen}
        onClose={() => setSuccessConfig(prev => ({ ...prev, isOpen: false }))}
        title={successConfig.title}
        message={successConfig.message}
      />
    </>
  );
}
