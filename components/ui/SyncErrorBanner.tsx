import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import React from "react";
import { errorTranslator } from "../../src/utils/errorTranslator";

export interface SyncError {
  id: string;
  accion: string;
  mensaje: string;
  tabla_origen?: string;
  datosAtrapados: any;
}

interface SyncErrorBannerProps {
  errors: SyncError[];
  onRecover: (error: SyncError) => void;
  onDismiss: (id: string) => void;
  contextName?: string; // e.g. "producto", "factura", "usuario"
  isHighPriority?: boolean; // If true, make it red instead of amber
}

export default function SyncErrorBanner({
  errors,
  onRecover,
  onDismiss,
  contextName = "registro",
  isHighPriority = false,
}: SyncErrorBannerProps) {
  if (!errors || errors.length === 0) return null;

  const bgContainer = isHighPriority ? "bg-red-50 border-red-200" : "bg-amber-50 dark:bg-amber-500/10 border-amber-200";
  const textHeaderColor = isHighPriority ? "text-red-800" : "text-amber-800";
  const textDescColor = isHighPriority ? "text-red-700" : "text-amber-700";
  const bgCard = isHighPriority ? "border-red-100" : "border-amber-100";
  const textHighlight = isHighPriority ? "text-red-600" : "text-amber-600 dark:text-amber-500";
  const bgButton = isHighPriority ? "bg-red-100 hover:bg-red-200 text-red-700" : "bg-amber-100 hover:bg-amber-200 text-amber-700";

  return (
    <div className={`mb-6 border rounded-2xl p-5 shadow-sm ${bgContainer}`}>
      <h3 className={`${textHeaderColor} font-bold flex items-center gap-2 mb-3`}>
        <AlertTriangle className="w-5 h-5" />
        Problemas detectados al sincronizar
      </h3>
      <p className={`text-sm mb-4 ${textDescColor}`}>
        Se detectaron registros que fueron creados o editados sin conexión pero rechazados por la nube.
        Se rescató la información; haz clic en &quot;Recuperar y Corregir&quot; para cargar los datos y reenviarlos.
      </p>
      <div className="space-y-3">
        {errors.map((err) => {
          // Identify a display name from caught data
          const targetItem =
            err.datosAtrapados?.nombre ||
            err.datosAtrapados?.descripcion ||
            err.datosAtrapados?.correo ||
            err.datosAtrapados?.usuario ||
            err.datosAtrapados?.folio ||
            err.datosAtrapados?.codigo_interno ||
            `${contextName} Desconocido`;

          const accionText = err.accion === "created" ? "crear" : "modificar";
          const mensajeRevisado = errorTranslator(err.mensaje, err.tabla_origen);

          return (
            <div
              key={err.id}
              className={`flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-slate-800 p-4 rounded-xl border ${bgCard} gap-4 shadow-sm`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Error al intentar {accionText}:{" "}
                  <span className={textHighlight}>{targetItem}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <span className="font-bold">Motivo:</span> {mensajeRevisado}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  onClick={() => onRecover(err)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${bgButton}`}
                  title="Cargar estos datos rescatados para solucionar el problema"
                >
                  <RotateCcw className="w-4 h-4" />
                  Recuperar y Corregir
                </button>
                <button
                  onClick={() => onDismiss(err.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                  title="Eliminar esta notificación (y los datos rescatados)"
                >
                  <Trash2 className="w-4 h-4" />
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
