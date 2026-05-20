import { database } from "./DB/indexBD";
import { Q } from "@nozbe/watermelondb";
import MovimientoInventario from "./DB/models/registros/movimientoInventario";

/**
 * Recalculates the stock of a lote based on its movements and updates the lote record.
 */
export async function recalcularStockLote(loteId: string): Promise<number> {
  if (!loteId) return 0;

  // 1. Fetch all movements for this lote
  const movements = await database
    .get<MovimientoInventario>("movimientos_inventario")
    .query(Q.where("lote_id", loteId))
    .fetch();

  // 2. Compute aggregate quantity
  let computedQty = 0;
  for (const m of movements) {
    const tipo = m.tipo;
    const cantidad = Number(m.cantidad) || 0;

    if (/^entrada/i.test(tipo)) {
      computedQty += cantidad;
    } else if (/^salida/i.test(tipo)) {
      computedQty -= cantidad;
    } else {
      computedQty += cantidad;
    }
  }

  // 3. Update the Lote record
  await database.write(async () => {
    try {
      const lote = await database.get("lotes").find(loteId);
      await lote.update((record: any) => {
        record.cantidad = computedQty;
        record.estado = computedQty > 0;
      });
    } catch (e) {
      console.error(`Error updating lote ${loteId} during recalculation:`, e);
    }
  });

  return computedQty;
}
