// src/integrity/rules/inventarioRules.ts
// ─── Integrity rules for the "Inventario / Productos" domain ─────────────────

import { database } from '../../services/DB/indexBD';
import type { IntegrityRule } from '../types';

// ─── Rule: Products pointing to an inactive or deleted family ─────────────────

interface ProductoFamiliaRota {
  productoId: string;
  productoDescripcion: string;
  codigoInterno: string;
  familiaId: string;
  familiaNombre: string;
}

export const productoConFamiliaInvalidaRule: IntegrityRule<ProductoFamiliaRota> = {
  id: 'producto_familia_invalida',
  label: 'Productos con familia inactiva o eliminada',
  severity: 'high',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Familias de producto inválidas',
  incidentDescription: (count) =>
    `${count} producto${count !== 1 ? 's apuntan' : ' apunta'} a una familia desactivada o eliminada.`,
  actionUrl: '/inventory',

  async detect() {
    const productos = (await database.collections
      .get('productos')
      .query()
      .fetch()) as any[];

    const familiasDb = database.collections.get('familias');
    const broken: ProductoFamiliaRota[] = [];

    for (const prod of productos) {
      if (!prod._raw.familia_id) continue;

      try {
        const familia = (await familiasDb.find(prod._raw.familia_id)) as any;
        // Active family — no problem
        if (familia && familia.estado !== false) continue;

        broken.push({
          productoId: prod.id,
          productoDescripcion: prod.descripcion ?? 'Sin descripción',
          codigoInterno: prod.codigoInterno ?? prod._raw.codigo_interno ?? '—',
          familiaId: prod._raw.familia_id,
          familiaNombre: familia?.nombre ?? 'Familia desactivada',
        });
      } catch (_) {
        // familia.find() threw — record is deleted
        broken.push({
          productoId: prod.id,
          productoDescripcion: prod.descripcion ?? 'Sin descripción',
          codigoInterno: prod.codigoInterno ?? prod._raw.codigo_interno ?? '—',
          familiaId: prod._raw.familia_id,
          familiaNombre: 'Familia eliminada',
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.productoId,
      label: item.productoDescripcion,
      subtitle: `Código: ${item.codigoInterno}`,
      currentValue: item.familiaNombre,
    };
  },

  async getReplacements() {
    const familias = (await database.collections
      .get('familias')
      .query()
      .fetch()) as any[];

    return familias
      .filter((f) => f.estado !== false)
      .map((f) => ({ id: f.id, label: f.nombre ?? 'Familia sin nombre' }));
  },

  allowNoReplacement: false,

  async fix(selectedIds, newValueId) {
    if (!newValueId) return; // allowNoReplacement is false, should always have a value

    await database.write(async () => {
      for (const productoId of selectedIds) {
        try {
          const prod = (await database.collections
            .get('productos')
            .find(productoId)) as any;

          await prod.update((p: any) => {
            p._raw.familia_id = newValueId;
          });
        } catch (e) {
          console.warn(`[integrity] Could not fix producto ${productoId}:`, e);
        }
      }
    });
  },
};

// ─── Rule: Products pointing to an inactive or deleted margin ──────────────────

interface ProductoMargenRoto {
  productoId: string;
  productoDescripcion: string;
  codigoInterno: string;
  margenId: string;
  margenNombre: string;
}

export const productoConMargenInvalidoRule: IntegrityRule<ProductoMargenRoto> = {
  id: 'producto_margen_invalido',
  label: 'Productos con margen de ganancia inválido',
  severity: 'medium',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Márgenes de ganancia inválidos',
  incidentDescription: (count) =>
    `${count} producto${count !== 1 ? 's tienen' : ' tiene'} un margen de ganancia desactivado o eliminado.`,
  actionUrl: '/inventory',

  async detect() {
    const productos = (await database.collections
      .get('productos')
      .query()
      .fetch()) as any[];

    const margenesDb = database.collections.get('margenes');
    const broken: ProductoMargenRoto[] = [];

    for (const prod of productos) {
      const margenId = prod._raw.margen_id;
      if (!margenId) continue;

      try {
        const margen = (await margenesDb.find(margenId)) as any;
        // Active margin — no problem
        if (margen && margen.estado !== false) continue;

        broken.push({
          productoId: prod.id,
          productoDescripcion: prod.descripcion ?? 'Sin descripción',
          codigoInterno: prod.codigoInterno ?? prod._raw.codigo_interno ?? '—',
          margenId,
          margenNombre: margen ? `${margen.nombre} (${margen.porcentaje}%)` : 'Margen desactivado',
        });
      } catch (_) {
        broken.push({
          productoId: prod.id,
          productoDescripcion: prod.descripcion ?? 'Sin descripción',
          codigoInterno: prod.codigoInterno ?? prod._raw.codigo_interno ?? '—',
          margenId,
          margenNombre: 'Margen eliminado',
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.productoId,
      label: item.productoDescripcion,
      subtitle: `Código: ${item.codigoInterno}`,
      currentValue: item.margenNombre,
    };
  },

  async getReplacements() {
    const margenes = (await database.collections
      .get('margenes')
      .query()
      .fetch()) as any[];

    return margenes
      .filter((m) => m.estado !== false)
      .map((m) => ({ id: m.id, label: `${m.nombre} (${m.porcentaje}%)` }));
  },

  allowNoReplacement: true,

  async fix(selectedIds, newValueId) {
    await database.write(async () => {
      for (const productoId of selectedIds) {
        try {
          const prod = (await database.collections
            .get('productos')
            .find(productoId)) as any;

          await prod.update((p: any) => {
            p._raw.margen_id = newValueId || null;
          });
        } catch (e) {
          console.warn(`[integrity] Could not fix producto margen ${productoId}:`, e);
        }
      }
    });
  },
};

// ─── Rule: Products associated with inactive or deleted taxes ───────────────────

interface ProductoImpuestoRoto {
  joinId: string; // producto_impuestos.id
  productoId: string;
  productoDescripcion: string;
  impuestoId: string;
  impuestoNombre: string;
}

export const productoConImpuestoInvalidoRule: IntegrityRule<ProductoImpuestoRoto> = {
  id: 'producto_impuesto_invalido',
  label: 'Productos con impuestos inválidos asociados',
  severity: 'high',
  triggers: ['deactivate', 'soft_delete', 'startup'],
  incidentTitle: 'Impuestos de producto inválidos',
  incidentDescription: (count) =>
    `${count} impuesto${count !== 1 ? 's inválidos están asociados' : ' inválido está asociado'} a productos de la tienda.`,
  actionUrl: '/inventory',

  async detect() {
    const joins = (await database.collections
      .get('producto_impuestos')
      .query()
      .fetch()) as any[];

    const impuestosDb = database.collections.get('impuestos');
    const productosDb = database.collections.get('productos');

    const broken: ProductoImpuestoRoto[] = [];

    for (const join of joins) {
      const impId = join._raw.impuesto_id;
      const prodId = join._raw.producto_id;

      try {
        const impuesto = (await impuestosDb.find(impId)) as any;
        // Active tax — no problem
        if (impuesto && impuesto.activo !== false) continue;

        let prodDesc = prodId;
        try {
          const prod = (await productosDb.find(prodId)) as any;
          prodDesc = prod?.descripcion ?? prodId;
        } catch (_) {}

        broken.push({
          joinId: join.id,
          productoId: prodId,
          productoDescripcion: prodDesc,
          impuestoId: impId,
          impuestoNombre: impuesto ? `${impuesto.nombre} (${impuesto.tasa}%)` : 'Impuesto desactivado',
        });
      } catch (_) {
        let prodDesc = prodId;
        try {
          const prod = (await productosDb.find(prodId)) as any;
          prodDesc = prod?.descripcion ?? prodId;
        } catch (_2) {}

        broken.push({
          joinId: join.id,
          productoId: prodId,
          productoDescripcion: prodDesc,
          impuestoId: impId,
          impuestoNombre: 'Impuesto eliminado',
        });
      }
    }

    return broken;
  },

  formatItem(item) {
    return {
      id: item.joinId,
      label: item.productoDescripcion,
      subtitle: `Impuesto ID: ${item.impuestoId}`,
      currentValue: item.impuestoNombre,
    };
  },

  async getReplacements() {
    const impuestos = (await database.collections
      .get('impuestos')
      .query()
      .fetch()) as any[];

    return impuestos
      .filter((i) => i.activo !== false)
      .map((i) => ({ id: i.id, label: `${i.nombre} (${i.tasa}%)` }));
  },

  allowNoReplacement: true,

  async fix(selectedIds, newValueId) {
    await database.write(async () => {
      for (const joinId of selectedIds) {
        try {
          const join = (await database.collections
            .get('producto_impuestos')
            .find(joinId)) as any;

          if (newValueId === null) {
            await join.markAsDeleted();
          } else {
            await join.update((j: any) => {
              j._raw.impuesto_id = newValueId;
            });
          }
        } catch (e) {
          console.warn(`[integrity] Could not fix product-tax association ${joinId}:`, e);
        }
      }
    });
  },
};
