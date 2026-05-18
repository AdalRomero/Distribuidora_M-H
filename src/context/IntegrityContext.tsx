// src/context/IntegrityContext.tsx
// ─── Global state for integrity incidents (offline-first, localStorage) ───────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useIntegrityEngine } from '../integrity/useIntegrityEngine';
import { ALL_RULES } from '../integrity/rules/index';
import type { IntegrityIncident, IntegrityTrigger } from '../integrity/types';

const STORAGE_KEY = 'dist_mh_integrity_incidents';

// ─── Context type ─────────────────────────────────────────────────────────────

interface IntegrityContextType {
  /** All active (non-resolved) incidents */
  incidents: IntegrityIncident[];

  /** Total count of pending/partial incidents (for badges) */
  pendingCount: number;

  /**
   * Trigger a full or filtered scan.
   * Call this after deactivating or soft-deleting a record.
   */
  scan: (trigger?: IntegrityTrigger) => Promise<void>;

  /**
   * Mark a specific number of items in an incident as resolved.
   * If resolvedNow + existing resolvedCount >= affectedCount, marks as resolved.
   * Otherwise marks as partial.
   */
  markProgress: (incidentId: string, resolvedNow: number) => void;

  /**
   * Dismiss (remove) a resolved incident from the list.
   */
  dismiss: (incidentId: string) => void;

  /** Whether a scan is currently running */
  isScanning: boolean;
}

const IntegrityContext = createContext<IntegrityContextType>(
  {} as IntegrityContextType
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function IntegrityProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<IntegrityIncident[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { scan: engineScan } = useIntegrityEngine();

  // ── Persistence helpers ──────────────────────────────────────────────────────

  const saveToStorage = (items: IntegrityIncident[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[IntegrityContext] Could not persist incidents:', e);
    }
  };

  const loadFromStorage = (): IntegrityIncident[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as IntegrityIncident[];
    } catch (e) {
      return [];
    }
  };

  // ── Startup: restore persisted incidents then re-validate ────────────────────

  useEffect(() => {
    const init = async () => {
      const stored = loadFromStorage();
      // Optimistic restore — show immediately, then re-validate
      setIncidents(stored.filter((i) => i.status !== 'resolved'));

      // Re-run startup rules to auto-resolve stale incidents and catch new ones
      setIsScanning(true);
      try {
        const { incidents: newIncidents, cleanRuleIds } =
          await engineScan('startup');

        setIncidents((prev) => {
          // Remove resolved ones and stale incidents for clean rules
          let next = prev.filter(
            (i) =>
              i.status !== 'resolved' && !cleanRuleIds.includes(i.ruleId)
          );

          // Upsert new incidents (replace by ruleId to avoid duplicates)
          for (const ni of newIncidents) {
            const idx = next.findIndex((i) => i.ruleId === ni.ruleId);
            if (idx >= 0) {
              next[idx] = { ...ni, id: next[idx].id }; // keep same ID
            } else {
              next.push(ni);
            }
          }

          saveToStorage(next);
          return next;
        });
      } finally {
        setIsScanning(false);
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── scan() — called by modules after destructive actions ────────────────────

  const scan = useCallback(
    async (trigger?: IntegrityTrigger) => {
      if (isScanning) return;
      setIsScanning(true);
      try {
        const { incidents: newIncidents, cleanRuleIds } =
          await engineScan(trigger);

        setIncidents((prev) => {
          let next = [...prev];

          // Auto-resolve rules that detected nothing
          next = next.map((i) =>
            cleanRuleIds.includes(i.ruleId)
              ? { ...i, status: 'resolved' as const, updatedAt: Date.now() }
              : i
          );

          // Upsert new incidents (replace by ruleId)
          for (const ni of newIncidents) {
            const idx = next.findIndex((i) => i.ruleId === ni.ruleId);
            if (idx >= 0) {
              next[idx] = {
                ...ni,
                id: next[idx].id,
                resolvedCount: next[idx].resolvedCount, // preserve progress
              };
            } else {
              next.push(ni);
            }
          }

          // Persist everything but remove fully resolved for storage cleanliness
          const toSave = next.filter((i) => i.status !== 'resolved');
          saveToStorage(toSave);
          return next.filter((i) => i.status !== 'resolved');
        });
      } finally {
        setIsScanning(false);
      }
    },
    [engineScan, isScanning]
  );

  // ── markProgress() — called by IntegrityFixModal after fixing ───────────────

  const markProgress = useCallback(
    (incidentId: string, resolvedNow: number) => {
      setIncidents((prev) => {
        const next = prev.map((i) => {
          if (i.id !== incidentId) return i;
          const totalResolved = i.resolvedCount + resolvedNow;
          const status: IntegrityIncident['status'] =
            totalResolved >= i.affectedCount ? 'resolved' : 'partial';
          return {
            ...i,
            resolvedCount: totalResolved,
            affectedCount: i.affectedCount,
            status,
            updatedAt: Date.now(),
          };
        });
        const toSave = next.filter((i) => i.status !== 'resolved');
        saveToStorage(toSave);
        return next.filter((i) => i.status !== 'resolved');
      });
    },
    []
  );

  // ── dismiss() — manually remove an incident ──────────────────────────────────

  const dismiss = useCallback((incidentId: string) => {
    setIncidents((prev) => {
      const next = prev.filter((i) => i.id !== incidentId);
      saveToStorage(next);
      return next;
    });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const pendingCount = incidents.filter(
    (i) => i.status === 'pending' || i.status === 'partial'
  ).length;

  return (
    <IntegrityContext.Provider
      value={{ incidents, pendingCount, scan, markProgress, dismiss, isScanning }}
    >
      {children}
    </IntegrityContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntegrity() {
  return useContext(IntegrityContext);
}
