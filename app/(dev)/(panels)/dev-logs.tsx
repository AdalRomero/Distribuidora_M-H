import { useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, Terminal, Trash } from "lucide-react";
import { useEffect, useState } from "react";

export default function DevLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Interceptar errores globales de la aplicación
    const handleError = (event: ErrorEvent) => {
      addLog(
        `[ERROR GLOBAL] ${event.message} en ${event.filename}:${event.lineno}`,
      );
    };

    // Interceptar promesas rechazadas (como fallos de Supabase)
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog(`[PROMISE FAILED] ${event.reason}`);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Logs iniciales
    addLog("[SYSTEM] Consola de desarrollo inicializada.");
    addLog("[WATERMELON DB] Conexión local establecida.");

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white flex flex-col">
      {/* Botón de Regreso */}
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

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-rose-500" size={32} />
          <h1 className="text-3xl font-bold">Consola de Logs</h1>
        </div>
        <button
          onClick={() => setLogs([])}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-900/50 text-red-400 hover:bg-red-900 rounded border border-red-800"
        >
          <Trash size={16} /> Limpiar Consola
        </button>
      </div>

      <div className="flex-1 bg-black rounded-lg border border-gray-800 p-4 font-mono text-sm overflow-y-auto shadow-inner">
        {logs.length === 0 ? (
          <p className="text-gray-600">Esperando eventos del sistema...</p>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`mb-1 pb-1 border-b border-gray-900/50 ${
                log.includes("[ERROR") || log.includes("FAILED")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {log.includes("[ERROR") && (
                <AlertTriangle size={12} className="inline mr-2" />
              )}
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
