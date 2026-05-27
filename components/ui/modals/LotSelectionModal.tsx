import { X, Check, AlertTriangle, Layers } from "lucide-react";
import { useState, useEffect } from "react";

export interface Lote {
  id: string;
  codigo_lote: string;
  fecha_caducidad: number | null;
  cantidad: number;
}

interface LotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedLotes: { loteId: string; cantidad: number }[]) => void;
  productoNombre: string;
  cantidadRequerida: number;
  lotesDisponibles: Lote[];
  initialSelection?: { loteId: string; cantidad: number }[];
}

export function LotSelectionModal({
  isOpen,
  onClose,
  onSave,
  productoNombre,
  cantidadRequerida,
  lotesDisponibles,
  initialSelection = [],
}: LotSelectionModalProps) {
  const [selections, setSelections] = useState<{ loteId: string; cantidad: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialSelection.length > 0) {
        setSelections(initialSelection);
      } else {
        // Auto-assign FEFO initially if no selection
        let remaining = cantidadRequerida;
        const autoSelections: { loteId: string; cantidad: number }[] = [];
        
        const sortedLotes = [...lotesDisponibles].sort((a, b) => {
          const dateA = a.fecha_caducidad || Number.MAX_SAFE_INTEGER;
          const dateB = b.fecha_caducidad || Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        });

        for (const lote of sortedLotes) {
          if (remaining <= 0) break;
          if (lote.cantidad <= 0) continue;
          
          const qty = Math.min(lote.cantidad, remaining);
          autoSelections.push({ loteId: lote.id, cantidad: qty });
          remaining -= qty;
        }
        
        setSelections(autoSelections);
      }
    }
  }, [isOpen, cantidadRequerida, lotesDisponibles, initialSelection]);

  if (!isOpen) return null;

  const totalSelected = selections.reduce((sum, s) => sum + (s.cantidad || 0), 0);
  const isValid = totalSelected === cantidadRequerida;

  const updateSelection = (loteId: string, val: string) => {
    const numVal = parseFloat(val) || 0;
    setSelections(prev => {
      const existing = prev.find(p => p.loteId === loteId);
      if (existing) {
        if (numVal <= 0) return prev.filter(p => p.loteId !== loteId);
        return prev.map(p => p.loteId === loteId ? { ...p, cantidad: numVal } : p);
      } else {
        if (numVal <= 0) return prev;
        return [...prev, { loteId, cantidad: numVal }];
      }
    });
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return "Sin fecha";
    return new Date(ts).toLocaleDateString("es-MX");
  };

  const getDaysRemaining = (ts: number | null) => {
    if (!ts) return null;
    const diff = ts - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Desglose de Lotes
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Producto: <span className="font-bold">{productoNombre}</span></p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-500">Cantidad a surtir: <span className="font-bold text-slate-700 dark:text-slate-200">{cantidadRequerida}</span></span>
              <span className={`text-xs font-bold ${isValid ? 'text-green-500' : 'text-orange-500'}`}>
                Seleccionado: {totalSelected} / {cantidadRequerida}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {lotesDisponibles.length === 0 ? (
              <div className="text-center p-4 text-slate-500 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg">
                No hay lotes con stock disponible.
              </div>
            ) : (
              lotesDisponibles.map(lote => {
                const days = getDaysRemaining(lote.fecha_caducidad);
                const isWarning = days !== null && days < 30;
                const isCritical = days !== null && days <= 0;
                const selected = selections.find(s => s.loteId === lote.id)?.cantidad || "";

                return (
                  <div key={lote.id} className={`flex items-center justify-between p-3 border rounded-lg ${isCritical ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 opacity-70' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lote: {lote.codigo_lote || "S/N"}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        Vence: {formatDate(lote.fecha_caducidad)}
                        {days !== null && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ml-2 ${isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {days} días
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">Stock: <span className="font-bold text-slate-700 dark:text-slate-300">{lote.cantidad}</span></span>
                      <div className="w-24">
                        <input
                          type="number"
                          value={selected}
                          onChange={(e) => updateSelection(lote.id, e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-sm text-center focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:bg-slate-100"
                          max={lote.cantidad}
                          min={0}
                          disabled={isCritical}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          {!isValid && (
            <p className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              La cantidad seleccionada debe ser igual a {cantidadRequerida}
            </p>
          )}
          {isValid && <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 transition-colors">
              Cancelar
            </button>
            <button
              disabled={!isValid}
              onClick={() => {
                onSave(selections);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
