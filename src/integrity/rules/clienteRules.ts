// src/integrity/rules/clienteRules.ts
// ─── Integrity rules for the "Clientes" domain ───────────────────────────────

import { Q } from '@nozbe/watermelondb';
import { database } from '../../services/DB/indexBD';
import type { IntegrityRule } from '../types';

// ─── Rule: Clients assigned to an inactive/deleted price template ─────────────

interface ClientePlantillaJoin {
  joinId: string;         // clientes_plantillas.id
  clienteId: string;
  clienteNombre: string;
  plantillaId: string;
  plantillaNombre: string;
}

export const clienteConPlantillaInvalidaRule: IntegrityRule<ClientePlantillaJoin> = {
  id: 'cliente_plantilla_invalida',
  label: 'Clientes con plantilla de precios inválida',
  severity: 'medium',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Listas de precios inválidas',
  incidentDescription: (count) =>
    `${count} cliente${count !== 1 ? 's tienen' : ' tiene'} una lista de precios desactivada o eliminada asignada.`,
  actionUrl: '/clients',

  async detect() {
    const joins = (await database.collections
      .get('clientes_plantillas')
      .query()
      .fetch()) as any[];

    const plantillasDb = database.collections.get('plantillas_precios');
    const clientesDb = database.collections.get('clientes');

    const broken: ClientePlantillaJoin[] = [];

    for (const join of joins) {
      const plantillaId = join._raw.plantilla_id;
      const clienteId = join._raw.cliente_id;

      try {
        const plantilla = (await plantillasDb.find(plantillaId)) as any;
        // If we can find it and it's active, it's fine
        if (plantilla && plantilla.estado !== false) continue;

        // Broken: plantilla is inactive or deleted
        let clienteNombre = clienteId;
        try {
          const cliente = (await clientesDb.find(clienteId)) as any;
          clienteNombre = cliente?.nombre ?? clienteId;
        } catch (_) {}

        broken.push({
          joinId: join.id,
          clienteId,
          clienteNombre,
          plantillaId,
          plantillaNombre: plantilla?.nombre ?? 'Lista eliminada',
        });
      } catch (_) {
        // plantilla.find() threw — record is deleted, definitely broken
        let clienteNombre = clienteId;
        try {
          const cliente = (await clientesDb.find(clienteId)) as any;
          clienteNombre = cliente?.nombre ?? clienteId;
        } catch (_2) {}

        broken.push({
          joinId: join.id,
          clienteId,
          clienteNombre,
          plantillaId,
          plantillaNombre: 'Lista eliminada',
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.joinId,
      label: item.clienteNombre,
      subtitle: `Cliente ID: ${item.clienteId}`,
      currentValue: item.plantillaNombre,
    };
  },

  async getReplacements() {
    const plantillas = (await database.collections
      .get('plantillas_precios')
      .query()
      .fetch()) as any[];

    return plantillas
      .filter((p) => p.estado !== false)
      .map((p) => ({ id: p.id, label: p.nombre ?? 'Lista sin nombre' }));
  },

  allowNoReplacement: true,

  async fix(selectedIds, newValueId) {
    await database.write(async () => {
      for (const joinId of selectedIds) {
        try {
          const join = (await database.collections
            .get('clientes_plantillas')
            .find(joinId)) as any;

          if (newValueId === null) {
            // Remove the assignment
            await join.markAsDeleted();
          } else {
            // Reassign to new template
            await join.update((j: any) => {
              j._raw.plantilla_id = newValueId;
            });
          }
        } catch (e) {
          console.warn(`[integrity] Could not fix join ${joinId}:`, e);
        }
      }
    });
  },
};

// ─── Rule: Clients assigned to an inactive/deleted customer category ─────────

interface ClienteCategoriaRota {
  clienteId: string;
  clienteNombre: string;
  categoriaActual: string;
}

export const clienteConCategoriaInvalidaRule: IntegrityRule<ClienteCategoriaRota> = {
  id: 'cliente_categoria_invalida',
  label: 'Clientes con categoría inactiva o eliminada',
  severity: 'low',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Categorías de cliente inválidas',
  incidentDescription: (count) =>
    `${count} cliente${count !== 1 ? 's tienen' : ' tiene'} una categoría desactivada o eliminada.`,
  actionUrl: '/clients',

  async detect() {
    const categorias = (await database.collections
      .get('categorias_clientes')
      .query()
      .fetch()) as any[];

    const activeCatNames = new Set(
      categorias
        .filter((c) => c.estado !== false)
        .map((c) => c.nombre.trim().toLowerCase())
    );

    const clientes = (await database.collections
      .get('clientes')
      .query()
      .fetch()) as any[];

    const broken: ClienteCategoriaRota[] = [];

    for (const c of clientes) {
      const cat = (c.categoria || 'General').trim();
      // If client's category is not in the set of active categories, it is broken
      if (!activeCatNames.has(cat.toLowerCase())) {
        broken.push({
          clienteId: c.id,
          clienteNombre: c.nombre ?? 'Cliente sin nombre',
          categoriaActual: cat,
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.clienteId,
      label: item.clienteNombre,
      subtitle: `ID: ${item.clienteId}`,
      currentValue: item.categoriaActual,
    };
  },

  async getReplacements() {
    const categorias = (await database.collections
      .get('categorias_clientes')
      .query()
      .fetch()) as any[];

    return categorias
      .filter((c) => c.estado !== false)
      .map((c) => ({ id: c.nombre, label: c.nombre }));
  },

  allowNoReplacement: false,

  async fix(selectedIds, newValueId) {
    if (!newValueId) return; // Should always assign a valid category

    await database.write(async () => {
      for (const clienteId of selectedIds) {
        try {
          const client = (await database.collections
            .get('clientes')
            .find(clienteId)) as any;

          await client.update((c: any) => {
            c.categoria = newValueId;
          });
        } catch (e) {
          console.warn(`[integrity] Could not fix client category ${clienteId}:`, e);
        }
      }
    });
  },
};
