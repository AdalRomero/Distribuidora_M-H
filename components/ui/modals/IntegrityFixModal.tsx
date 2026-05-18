// components/ui/modals/IntegrityFixModal.tsx
// ─── Generic modal for reviewing and fixing any integrity incident ─────────────

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ALL_RULES } from '../../../src/integrity/rules/index';
import { useIntegrity } from '../../../src/context/IntegrityContext';
import type { IntegrityIncident, IntegrityItem, IntegrityReplacement } from '../../../src/integrity/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IntegrityFixModalProps {
  incident: IntegrityIncident | null;
  onClose: () => void;
}

// ─── Severity config ──────────────────────────────────────────────────────────

const severityConfig = {
  critical: {
    header: 'bg-rose-50 dark:bg-rose-900/20',
    icon: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'Crítico',
  },
  high: {
    header: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    label: 'Alto',
  },
  medium: {
    header: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Medio',
  },
  low: {
    header: 'bg-sky-50 dark:bg-sky-900/20',
    icon: 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    label: 'Bajo',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrityFixModal({
  incident,
  onClose,
}: IntegrityFixModalProps) {
  const { markProgress } = useIntegrity();
  const router = useRouter();

  const [items, setItems] = useState<IntegrityItem[]>([]);
  const [replacements, setReplacements] = useState<IntegrityReplacement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newValueId, setNewValueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [done, setDone] = useState(false);

  const rule = incident ? ALL_RULES.find((r) => r.id === incident.ruleId) : null;
  const sev = incident ? severityConfig[incident.severity] : null;
  const allowNoReplacement = rule?.allowNoReplacement ?? false;

  // Load items and replacements whenever incident changes
  useEffect(() => {
    if (!incident || !rule) return;
    setDone(false);
    setNewValueId(null);
    setIsApplying(false);

    const load = async () => {
      setIsLoading(true);
      try {
        const [rawItems, rawReplacements] = await Promise.all([
          rule.detect(),
          rule.getReplacements ? rule.getReplacements() : Promise.resolve([]),
        ]);
        const formatted = rawItems.map((i) => rule.formatItem(i));
        setItems(formatted);
        setSelectedIds(new Set(formatted.map((i) => i.id)));
        setReplacements(rawReplacements);
      } catch (e) {
        console.error('[IntegrityFixModal] Error loading items:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [incident?.id, rule]);

  if (!incident || !rule || !sev) return null;

  // ── Toggle helpers ────────────────────────────────────────────────────────────

  const allSelected = selectedIds.size === items.length && items.length > 0;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(items.map((i) => i.id))
    );
  };

  const canApply =
    !isLoading &&
    selectedIds.size > 0 &&
    (newValueId !== null || allowNoReplacement);

  // ── Apply fix ────────────────────────────────────────────────────────────────

  const handleApply = async () => {
    if (!canApply) return;
    setIsApplying(true);
    try {
      await rule.fix(Array.from(selectedIds), newValueId);
      markProgress(incident.id, selectedIds.size);
      setDone(true);
    } catch (e) {
      console.error('[IntegrityFixModal] Fix failed:', e);
    } finally {
      setIsApplying(false);
    }
  };

  // ── Navigate to module ────────────────────────────────────────────────────────

  const handleNavigate = () => {
    if (incident.actionUrl) {
      onClose();
      router.push(incident.actionUrl as any);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isApplying ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10 flex flex-col max-h-[90vh]">

            {/* ── Header ── */}
            <div className={`px-6 py-5 border-b border-slate-100 dark:border-slate-700 ${sev.header} shrink-0`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${sev.icon}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {incident.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
                        {sev.label}
                      </span>
                      {incident.status === 'partial' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                          Parcialmente resuelto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {incident.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {incident.actionUrl && (
                    <button
                      onClick={handleNavigate}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Ir al módulo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    disabled={isApplying}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress bar (if partial) */}
              {incident.status === 'partial' && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>Progreso de corrección</span>
                    <span>{incident.resolvedCount} / {incident.affectedCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(incident.resolvedCount / incident.affectedCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Body ── */}
            {done ? (
              // ── Success state ──
              <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    ¡Corrección aplicada!
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedIds.size === items.length
                      ? 'Todos los elementos fueron corregidos.'
                      : `${selectedIds.size} de ${items.length} elementos corregidos. Los restantes permanecen como pendientes.`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : isLoading ? (
              // ── Loading state ──
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Cargando registros afectados...
                </p>
              </div>
            ) : items.length === 0 ? (
              // ── No items (already resolved externally) ──
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                  No hay registros afectados
                </p>
                <p className="text-sm text-slate-400">
                  Este problema ya fue resuelto o los registros fueron eliminados.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">

                {/* ── Step 1: Select replacement (only if rule has replacements) ── */}
                {(replacements.length > 0 || allowNoReplacement) && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Selecciona el valor de reemplazo
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowNoReplacement && (
                        <button
                          onClick={() => setNewValueId(null)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            newValueId === null
                              ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-rose-300'
                          }`}
                        >
                          Sin asignación (desasociar)
                        </button>
                      )}
                      {replacements.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setNewValueId(opt.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            newValueId === opt.id
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-300 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          {opt.label}
                          {opt.subtitle && (
                            <span className="ml-1 opacity-60">{opt.subtitle}</span>
                          )}
                        </button>
                      ))}
                      {replacements.length === 0 && !allowNoReplacement && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 italic">
                          No hay opciones activas disponibles para sustituir.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Select affected items ── */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {replacements.length > 0 || allowNoReplacement ? '2' : '1'}
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Selecciona los registros a corregir
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">
                        {selectedIds.size} de {items.length}
                      </span>
                      <button
                        onClick={toggleAll}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {items.map((item) => {
                      const checked = selectedIds.has(item.id);
                      const replacement = replacements.find((r) => r.id === newValueId);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            checked
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              checked ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {item.label}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          {item.currentValue && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800/50">
                                {item.currentValue}
                              </span>
                              {(newValueId !== null || allowNoReplacement) && checked && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800/50">
                                    {newValueId === null ? 'Sin asignación' : replacement?.label ?? '—'}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            {!done && !isLoading && items.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedIds.size}
                  </span>{' '}
                  de {items.length} seleccionados
                  {newValueId && replacements.length > 0 && (
                    <>
                      {' '}→{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {replacements.find((r) => r.id === newValueId)?.label}
                      </span>
                    </>
                  )}
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
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 rounded-xl transition-colors shadow-sm active:scale-95 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isApplying ? 'Aplicando...' : `Corregir ${selectedIds.size} registro${selectedIds.size !== 1 ? 's' : ''}`}
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
