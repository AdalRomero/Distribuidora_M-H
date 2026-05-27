// src/integrity/rules/clienteRules.ts
// ─── Integrity rules for the "Clientes" domain ───────────────────────────────

import { Q } from '@nozbe/watermelondb';
import { database } from '../../services/DB/indexBD';
import type { IntegrityRule } from '../types';

// ─── Rule: Clients assigned to an inactive/deleted price template ─────────────

interface ClientePlantillaRota {
  clienteId: string;
  clienteNombre: string;
  listaActual: string;
}

export const clienteConPlantillaInvalidaRule: IntegrityRule<ClientePlantillaRota> = {
  id: 'cliente_plantilla_invalida',
  label: 'Clientes con plantilla de precios inválida',
  severity: 'medium',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Listas de precios inválidas',
  incidentDescription: (count) =>
    `${count} cliente${count !== 1 ? 's tienen' : ' tiene'} una lista de precios desactivada o eliminada asignada.`,
  actionUrl: '/clients',

  async detect() {
    const plantillasDb = database.collections.get('plantillas_precios');
    const clientesDb = database.collections.get('clientes');

    const plantillas = (await plantillasDb.query().fetch()) as any[];
    const activeNombres = new Set(
      plantillas.filter(p => p.estado !== false && p.nombre).map(p => p.nombre.trim())
    );
    
    // Nombres estándar válidos
    activeNombres.add('lista');
    activeNombres.add('mayoreo');
    activeNombres.add('menudeo');
    activeNombres.add('personalizada');

    const clientes = (await clientesDb.query().fetch()) as any[];
    const broken: ClientePlantillaRota[] = [];

    for (const c of clientes) {
      const listaBase = c.listaPrecioBase?.trim();
      if (!listaBase) continue;

      if (!activeNombres.has(listaBase)) {
        broken.push({
          clienteId: c.id,
          clienteNombre: c.nombre ?? 'Cliente sin nombre',
          listaActual: listaBase,
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
      currentValue: item.listaActual,
    };
  },

  async getReplacements() {
    const plantillas = (await database.collections
      .get('plantillas_precios')
      .query()
      .fetch()) as any[];

    const options = plantillas
      .filter((p) => p.estado !== false)
      .map((p) => ({ id: p.nombre, label: p.nombre ?? 'Lista sin nombre' }));
      
    // Solo añadimos Precio Lista si no existe ya una plantilla con ese nombre (case insensitive)
    const existNamesLower = new Set(options.map(o => o.id.toLowerCase()));
    if (!existNamesLower.has('lista')) {
      options.unshift({ id: 'lista', label: 'Precio Lista' });
    }
    
    // Quitar duplicados por id (ignorando case para evitar duplicados visuales confusos)
    const uniqueOptions = [];
    const seenLower = new Set();
    for (const opt of options) {
      const lower = opt.id.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        uniqueOptions.push(opt);
      }
    }
    
    return uniqueOptions;
  },

  allowNoReplacement: true,

  async fix(selectedIds, newValueId) {
    await database.write(async () => {
      const clientesDb = database.collections.get('clientes');
      const junctionDb = database.collections.get('clientes_plantillas');
      const pProdDb = database.collections.get('precios_especiales_clientes');
      const pFamDb = database.collections.get('precios_especiales_familias_clientes');
      const plantillasDb = database.collections.get('plantillas_precios');
      const reglasDb = database.collections.get('reglas_plantilla');
      
      for (const clienteId of selectedIds) {
        try {
          const client = (await clientesDb.find(clienteId)) as any;
          await client.update((c: any) => {
            c.listaPrecioBase = newValueId || 'lista';
            if (newValueId === null || newValueId === 'lista' || newValueId === 'mayoreo' || newValueId === 'menudeo') {
                c.descuentoGlobal = 0;
            }
          });
          
          // Limpiar associations y reglas anteriores
          const oldJunctions = await junctionDb.query(Q.where('cliente_id', clienteId)).fetch();
          for (const oj of oldJunctions) await (oj as any).markAsDeleted();
          
          const oldProdRules = await pProdDb.query(Q.where('cliente_id', clienteId)).fetch();
          for (const or of oldProdRules) await (or as any).markAsDeleted();
          
          const oldFamRules = await pFamDb.query(Q.where('cliente_id', clienteId)).fetch();
          for (const or of oldFamRules) await (or as any).markAsDeleted();

          if (newValueId && newValueId !== 'lista' && newValueId !== 'mayoreo' && newValueId !== 'menudeo' && newValueId !== 'personalizada') {
              const [plantilla] = await plantillasDb.query(Q.where('nombre', newValueId)).fetch();
              if (plantilla) {
                  await junctionDb.create((j: any) => {
                      j._raw.id = require('expo-crypto').randomUUID();
                      j.clienteId = clienteId;
                      j.plantillaId = plantilla.id;
                  });
                  
                  // Copiar reglas de la plantilla al cliente
                  const reglas = await reglasDb.query(Q.where('plantilla_id', plantilla.id)).fetch();
                  for (const r of reglas as any[]) {
                      if (r.tipo === 'global') {
                          await client.update((c: any) => {
                              c.descuentoGlobal = Number(r.descuentoPorcentaje) || 0;
                          });
                      } else if (r.tipo === 'producto') {
                          await pProdDb.create((rec: any) => {
                              rec._raw.id = require('expo-crypto').randomUUID();
                              rec._raw.cliente_id = clienteId;
                              rec._raw.producto_id = r.targetId;
                              rec.descuentoPorcentaje = Number(r.descuentoPorcentaje) || 0;
                              rec.precioFijo = Number(r.precioFijo) || 0;
                          });
                      } else if (r.tipo === 'familia') {
                          await pFamDb.create((rec: any) => {
                              rec._raw.id = require('expo-crypto').randomUUID();
                              rec._raw.cliente_id = clienteId;
                              rec._raw.familia_id = r.targetId;
                              rec.descuentoPorcentaje = Number(r.descuentoPorcentaje) || 0;
                          });
                      }
                  }
              }
          }
        } catch (e) {
          console.warn(`[integrity] Could not fix client price list ${clienteId}:`, e);
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
