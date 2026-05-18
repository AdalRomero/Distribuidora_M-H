// src/integrity/useIntegrityEngine.ts
// ─── Hook: scans rules and produces IntegrityIncidents ───────────────────────

import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { ALL_RULES } from './rules/index';
import type { IntegrityIncident, IntegrityTrigger } from './types';

/**
 * Low-level hook that runs integrity rules and returns raw incidents.
 * Consume this inside IntegrityContext — don't use it directly in components.
 */
export function useIntegrityEngine() {
  /**
   * Runs all rules matching the given trigger (or ALL rules if no trigger given).
   * Returns a list of new IntegrityIncidents for any rules that found problems.
   * Returns an empty array for rules that found nothing (caller should clear those).
   */
  const scan = useCallback(
    async (
      trigger?: IntegrityTrigger
    ): Promise<{ incidents: IntegrityIncident[]; cleanRuleIds: string[] }> => {
      const rulesToRun = trigger
        ? ALL_RULES.filter((r) => r.triggers.includes(trigger))
        : ALL_RULES;

      const incidents: IntegrityIncident[] = [];
      const cleanRuleIds: string[] = [];

      await Promise.allSettled(
        rulesToRun.map(async (rule) => {
          try {
            const affected = await rule.detect();

            if (affected.length === 0) {
              cleanRuleIds.push(rule.id);
              return;
            }

            const incident: IntegrityIncident = {
              id: await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA1,
                `${rule.id}-${Date.now()}`
              ),
              ruleId: rule.id,
              severity: rule.severity,
              title: rule.incidentTitle,
              description: rule.incidentDescription(affected.length),
              affectedCount: affected.length,
              resolvedCount: 0,
              detectedAt: Date.now(),
              updatedAt: Date.now(),
              status: 'pending',
              actionUrl: rule.actionUrl,
            };

            incidents.push(incident);
          } catch (e) {
            console.error(`[IntegrityEngine] Rule "${rule.id}" threw:`, e);
          }
        })
      );

      return { incidents, cleanRuleIds };
    },
    []
  );

  return { scan };
}
