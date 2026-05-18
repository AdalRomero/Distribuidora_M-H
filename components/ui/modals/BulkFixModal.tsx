import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AffectedItem {
  id: string;
  label: string;       // display name
  subtitle?: string;   // secondary info (e.g. product code)
  currentValue?: string; // e.g. "IVA 16%"
}

export interface ReplacementOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface BulkFixModalProps {
  isOpen: boolean;
  onClose: () => void;

  // What was deactivated
  deactivatedName: string;         // e.g. "IVA 16%"
  entityType: string;              // e.g. "impuesto", "familia", "margen"
  entityLabel: string;             // e.g. "Impuesto", "Familia", "Margen"

  // The affected items
  affectedItems: AffectedItem[];
  affectedLabel: string;           // e.g. "productos"

  // Replacement options (active items of the same type)
  replacementOptions: ReplacementOption[];
  replacementLabel: string;        // e.g. "Impuesto de reemplazo"
  allowNoReplacement?: boolean;    // whether "none / remove" is a valid choice

  // Callback when user confirms the bulk fix
  onConfirmFix: (
    selectedItemIds: string[],   // which affected items to fix
    newValueId: string | null    // which replacement to assign (null = remove)
  ) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkFixModal({
  isOpen,
  onClose,
  deactivatedName,
  entityType,
  entityLabel,
  affectedItems,
  affectedLabel,
  replacementOptions,
  replacementLabel,
  allowNoReplacement = false,
  onConfirmFix,
}: BulkFixModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newValueId, setNewValueId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [done, setDone] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(affectedItems.map((i) => i.id)));
      setNewValueId(null);
      setIsApplying(false);
      setDone(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allSelected = selectedIds.size === affectedItems.length;
  const noneSelected = selectedIds.size === 0;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(affectedItems.map((i) => i.id)));
  };

  const canApply =
    selectedIds.size > 0 && (newValueId !== null || allowNoReplacement);

  const handleApply = async () => {
    if (!canApply) return;
    setIsApplying(true);
    try {
      await onConfirmFix(Array.from(selectedIds), newValueId);
      setDone(true);
    } catch (e) {
      console.error("BulkFixModal error:", e);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isApplying ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10 flex flex-col max-h-[90vh]">

            {/* ── Header ── */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      {entityLabel} desactivado — Corrección masiva
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {deactivatedName}
                      </span>{" "}
                      fue desactivado. Los {affectedLabel} listados abajo siguen
                      referenciándolo y podrían requerir actualización.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isApplying}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            {done ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    ¡Corrección aplicada!
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Los {selectedIds.size} {affectedLabel} seleccionados fueron
                    actualizados correctamente.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                {/* Step 1 – Select replacement */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {replacementLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allowNoReplacement && (
                      <button
                        onClick={() => setNewValueId(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          newValueId === null
                            ? "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-rose-300"
                        }`}
                      >
                        Sin {entityLabel.toLowerCase()} (eliminar)
                      </button>
                    )}
                    {replacementOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setNewValueId(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          newValueId === opt.id
                            ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-300 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700"
                        }`}
                      >
                        {opt.label}
                        {opt.subtitle && (
                          <span className="ml-1 opacity-60">{opt.subtitle}</span>
                        )}
                      </button>
                    ))}
                    {replacementOptions.length === 0 && !allowNoReplacement && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 italic">
                        No hay {affectedLabel} activos disponibles para sustituir.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2 – Select affected items */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        2
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Selecciona los {affectedLabel} a corregir
                      </p>
                    </div>
                    <button
                      onClick={toggleAll}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {allSelected ? "Deseleccionar todo" : "Seleccionar todo"} (
                      {affectedItems.length})
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {affectedItems.map((item) => {
                      const checked = selectedIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            checked
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                checked
                                  ? "text-blue-900 dark:text-blue-200"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {item.label}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-slate-400 truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {item.currentValue && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800/50">
                                {item.currentValue}
                              </span>
                              {newValueId !== null && checked && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800/50">
                                    {replacementOptions.find(
                                      (o) => o.id === newValueId
                                    )?.label ?? "—"}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {noneSelected && (
                    <p className="text-xs text-slate-400 italic mt-2">
                      Selecciona al menos un elemento para continuar.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            {!done && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedIds.size}
                  </span>{" "}
                  de {affectedItems.length} seleccionados
                  {newValueId &&
                    ` → ${
                      replacementOptions.find((o) => o.id === newValueId)?.label
                    }`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={isApplying}
                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium disabled:opacity-50"
                  >
                    Omitir por ahora
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!canApply || isApplying}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 rounded-xl transition-colors shadow-sm active:scale-95 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isApplying
                      ? "Aplicando..."
                      : `Corregir ${selectedIds.size} ${affectedLabel}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
