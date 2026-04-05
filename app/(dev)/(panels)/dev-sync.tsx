import { useRouter } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Code2,
    Database,
    RefreshCw,
    Server
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";

// Interfaz adaptada a tu modelo BitacoraError
interface SyncError {
  id: string;
  tablaOrigen: string;
  registroId: string;
  accion: string;
  payloadJson: string | null;
  mensajeError: string;
  estado: string;
  createdAt: number;
}

export default function DevSyncPanel() {
  const router = useRouter();
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SyncError | null>(null);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      // Traemos todos los errores ordenados por el más reciente
      const records = await bitacoraDb.query().fetch();

      const formattedErrors = records.map((r: any) => ({
        id: r.id,
        tablaOrigen: r.tablaOrigen,
        registroId: r.registroId,
        accion: r.accion,
        payloadJson: r.payloadJson,
        mensajeError: r.mensajeError,
        estado: r.estado,
        createdAt: r.createdAt,
      }));

      // Ordenar descendente (más recientes primero)
      formattedErrors.sort((a, b) => b.createdAt - a.createdAt);
      setErrors(formattedErrors);
    } catch (error) {
      console.error("Error cargando bitácora:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveError = async (errorId: string) => {
    if (
      !confirm(
        "¿Marcar como resuelto? Esto eliminará el log de error localmente.",
      )
    )
      return;

    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      const record = await bitacoraDb.find(errorId);

      await database.write(async () => {
        await record.destroyPermanently();
      });

      if (selectedError?.id === errorId) {
        setSelectedError(null);
      }

      loadErrors();
    } catch (error) {
      alert("No se pudo eliminar el error.");
    }
  };

  const formatPayload = (jsonString: string | null) => {
    if (!jsonString) return "No hay datos de payload disponibles.";
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString; // Devuelve el string crudo si no es JSON válido
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white flex flex-col">
      {/* Header */}
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

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Server size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Estado de Sincronización</h1>
            <p className="text-slate-400 text-sm mt-1">
              Resolución de conflictos y píldoras envenenadas locales
            </p>
          </div>
        </div>

        <button
          onClick={loadErrors}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refrescar
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Error List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500" />
              Cola de Errores
            </h2>
            <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {errors.length}
            </span>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {loading ? (
              <p className="text-center text-gray-500 py-8 text-sm">
                Cargando bitácora...
              </p>
            ) : errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                <CheckCircle2 size={40} className="text-emerald-500/50" />
                <p className="text-sm">Todo sincronizado perfectamente.</p>
              </div>
            ) : (
              errors.map((error) => (
                <button
                  key={error.id}
                  onClick={() => setSelectedError(error)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedError?.id === error.id
                      ? "bg-indigo-900/30 border-indigo-500/50"
                      : "bg-gray-950 border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-medium text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                      {error.tablaOrigen}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(error.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-1 mb-1">
                    {error.mensajeError}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                    <span
                      className={`px-1.5 rounded uppercase text-[10px] ${
                        error.accion === "created"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : error.accion === "updated"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {error.accion}
                    </span>
                    <span className="truncate">
                      {error.registroId.split("-")[0]}...
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Error Details */}
        <div className="w-full lg:w-2/3 flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {selectedError ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Detalle del Conflicto
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Database size={14} /> Tabla:{" "}
                        <strong className="text-gray-200">
                          {selectedError.tablaOrigen}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="font-mono text-xs">
                        ID: {selectedError.registroId}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveError(selectedError.id)}
                    className="flex items-center gap-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckCircle2 size={16} />
                    Descartar Log
                  </button>
                </div>

                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-rose-400 font-medium flex gap-2 items-start text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span className="break-words">
                      {selectedError.mensajeError}
                    </span>
                  </p>
                </div>
              </div>

              {/* Payload Code Viewer */}
              <div className="flex-1 p-6 flex flex-col overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Code2 size={16} />
                  Payload Atrapado (JSON)
                </h3>
                <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-lg overflow-auto p-4">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
                    {formatPayload(selectedError.payloadJson)}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Server size={48} className="text-gray-800" />
              <p>
                Selecciona un error de la lista para ver los detalles y el
                payload.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
