// src/integrity/rules/index.ts
// ─── Central registry of all IntegrityRules ──────────────────────────────────
//
// To add a new rule:
//   1. Create a new file in this folder (e.g. facturaRules.ts)
//   2. Export your IntegrityRule object from it
//   3. Import and add it to the ALL_RULES array below — that's it.

import { clienteConPlantillaInvalidaRule, clienteConCategoriaInvalidaRule } from './clienteRules';
import {
  productoConFamiliaInvalidaRule,
  productoConMargenInvalidoRule,
  productoConImpuestoInvalidoRule,
} from './inventarioRules';
import { documentoConUsuarioInactivoRule } from './documentoRules';
import type { IntegrityRule } from '../types';

export const ALL_RULES: IntegrityRule[] = [
  clienteConPlantillaInvalidaRule,
  clienteConCategoriaInvalidaRule,
  productoConFamiliaInvalidaRule,
  productoConMargenInvalidoRule,
  productoConImpuestoInvalidoRule,
  documentoConUsuarioInactivoRule,
];
