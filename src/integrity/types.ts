// src/integrity/types.ts
// ─── Core Types for the Global Data Integrity System ─────────────────────────

/** Severity levels that map to notification priorities */
export type IntegritySeverity = 'critical' | 'high' | 'medium' | 'low';

/** Lifecycle status of a detected integrity incident */
export type IntegrityStatus = 'pending' | 'partial' | 'resolved';

/** When a rule should be executed */
export type IntegrityTrigger = 'deactivate' | 'soft_delete' | 'on_demand' | 'startup';

/**
 * A single detected integrity problem.
 * These are stored in localStorage (not WatermelonDB) since they are
 * derived/transient and should not bloat the sync queue.
 */
export interface IntegrityIncident {
  id: string;             // UUID — unique per incident instance
  ruleId: string;         // which rule generated this
  severity: IntegritySeverity;
  title: string;          // e.g. "Clientes con lista de precios inválida"
  description: string;    // e.g. "3 clientes referencian una lista desactivada"
  affectedCount: number;  // total detected
  resolvedCount: number;  // how many have been fixed so far
  detectedAt: number;     // Date.now() when first found
  updatedAt: number;      // Date.now() when last modified
  status: IntegrityStatus;
  actionUrl?: string;     // route to navigate to for fixing
  meta?: Record<string, any>; // rule-specific extra data for the modal
}

/**
 * A formatted item ready for display in the IntegrityFixModal.
 * The rule's formatItem() produces these.
 */
export interface IntegrityItem {
  id: string;           // the record ID that needs fixing
  label: string;        // primary display name
  subtitle?: string;    // secondary info (e.g. RFC, code)
  currentValue?: string; // current broken value (e.g. "Lista Desactivada")
}

/**
 * A replacement option shown to the user in the fix modal.
 */
export interface IntegrityReplacement {
  id: string;
  label: string;
  subtitle?: string;
}

/**
 * Declarative definition of an integrity rule.
 * Register rules in src/integrity/rules/index.ts.
 *
 * @template TItem - the raw DB item returned by detect()
 */
export interface IntegrityRule<TItem = any> {
  /** Unique stable identifier for this rule */
  id: string;

  /** Human-readable name for debugging/logs */
  label: string;

  /** Severity level */
  severity: IntegritySeverity;

  /** Which triggers cause this rule to run */
  triggers: IntegrityTrigger[];

  /**
   * Async function that queries WatermelonDB and returns all
   * raw records that violate this rule.
   */
  detect: () => Promise<TItem[]>;

  /**
   * Converts a raw detected item into a display-ready IntegrityItem
   * for the fix modal.
   */
  formatItem: (item: TItem) => IntegrityItem;

  /**
   * Optional: loads the list of valid replacement options
   * (e.g. active price lists, active families).
   * If undefined, no replacement selector is shown.
   */
  getReplacements?: () => Promise<IntegrityReplacement[]>;

  /**
   * If true, the user can choose "no replacement" (remove the relation).
   * Default: false
   */
  allowNoReplacement?: boolean;

  /**
   * Applies the correction for the selected item IDs.
   * @param selectedIds - the item IDs the user chose to fix
   * @param newValueId - the chosen replacement ID, or null if allowNoReplacement
   */
  fix: (selectedIds: string[], newValueId: string | null) => Promise<void>;

  /** Title shown in notification and modal header */
  incidentTitle: string;

  /** Generates the description string given the affected count */
  incidentDescription: (count: number) => string;

  /** Optional route for the "Ver módulo" button */
  actionUrl?: string;
}
