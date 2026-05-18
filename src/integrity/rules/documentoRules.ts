// src/integrity/rules/documentoRules.ts
// ─── Integrity rules for the "Documentos / Facturas" domain ─────────────────

import { database } from '../../services/DB/indexBD';
import type { IntegrityRule } from '../types';

// ─── Rule: Invoices linked to an inactive/deleted user profile ───────────────

interface DocumentoUsuarioRoto {
  documentoId: string;
  documentoFolio: string;
  documentoTotal: number;
  usuarioId: string;
  usuarioNombre: string;
}

export const documentoConUsuarioInactivoRule: IntegrityRule<DocumentoUsuarioRoto> = {
  id: 'documento_usuario_inactivo',
  label: 'Facturas relacionadas a usuarios inactivos o eliminados',
  severity: 'high',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Facturas con usuarios inactivos',
  incidentDescription: (count) =>
    `${count} factura${count !== 1 ? 's están asociadas' : ' está asociada'} a un usuario inactivo o eliminado.`,
  actionUrl: '/invoices',

  async detect() {
    const documentos = (await database.collections
      .get('documentos')
      .query()
      .fetch()) as any[];

    const perfilesDb = database.collections.get('perfiles');
    const infoPerfilDb = database.collections.get('informacion_perfil');

    const broken: DocumentoUsuarioRoto[] = [];

    for (const doc of documentos) {
      const uId = doc._raw.usuario_id;
      if (!uId) continue;

      try {
        const perfil = (await perfilesDb.find(uId)) as any;
        // Active profile — no problem
        if (perfil && perfil.estado !== false) continue;

        let usrName = uId;
        try {
          const info = (await infoPerfilDb.find(uId)) as any;
          usrName = info ? `${info.nombres || ''} ${info.apePaterno || ''}`.trim() || info.correo : uId;
        } catch (_) {}

        broken.push({
          documentoId: doc.id,
          documentoFolio: doc.folio || `ID: ${doc.id.substring(0, 8)}`,
          documentoTotal: doc.total || 0,
          usuarioId: uId,
          usuarioNombre: usrName || 'Usuario inactivo',
        });
      } catch (_) {
        // perfil.find() threw — record is deleted
        broken.push({
          documentoId: doc.id,
          documentoFolio: doc.folio || `ID: ${doc.id.substring(0, 8)}`,
          documentoTotal: doc.total || 0,
          usuarioId: uId,
          usuarioNombre: 'Usuario eliminado',
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.documentoId,
      label: `Folio: ${item.documentoFolio}`,
      subtitle: `Total: $${item.documentoTotal.toFixed(2)}`,
      currentValue: item.usuarioNombre,
    };
  },

  async getReplacements() {
    const perfiles = (await database.collections
      .get('perfiles')
      .query()
      .fetch()) as any[];

    const infoPerfilDb = database.collections.get('informacion_perfil');
    const options: { id: string; label: string }[] = [];

    for (const p of perfiles) {
      if (p.estado === false) continue;
      try {
        const info = (await infoPerfilDb.find(p.id)) as any;
        const name = info ? `${info.nombres || ''} ${info.apePaterno || ''}`.trim() || info.correo : p.usuario;
        options.push({ id: p.id, label: name });
      } catch (_) {
        options.push({ id: p.id, label: p.usuario || 'Usuario activo' });
      }
    }

    return options;
  },

  allowNoReplacement: false,

  async fix(selectedIds, newValueId) {
    if (!newValueId) return; // Must assign a valid user

    await database.write(async () => {
      for (const docId of selectedIds) {
        try {
          const doc = (await database.collections
            .get('documentos')
            .find(docId)) as any;

          await doc.update((d: any) => {
            d._raw.usuario_id = newValueId;
          });
        } catch (e) {
          console.warn(`[integrity] Could not fix document user ${docId}:`, e);
        }
      }
    });
  },
};
