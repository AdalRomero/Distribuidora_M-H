-- Supabase Migration: Trigger for Lote Parity driven by Movimientos

-- 1. Create the function that aggregates movements
CREATE OR REPLACE FUNCTION recalculate_lote_quantity()
RETURNS TRIGGER AS $$
DECLARE
    computed_qty NUMERIC;
    target_lote_id UUID;
BEGIN
    -- Determinar el lote_id modificado (manejo seguro para DELETE, UPDATE y INSERT)
    IF TG_OP = 'DELETE' THEN
        target_lote_id := OLD.lote_id;
    ELSE
        target_lote_id := NEW.lote_id;
    END IF;

    -- Solo procesar si hay lote
    IF target_lote_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calcular la suma real de "movimientos_inventario" donde Entradas suman y Salidas restan
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo ILIKE 'ENTRADA%' THEN cantidad
            WHEN tipo ILIKE 'SALIDA%' THEN -cantidad
            ELSE cantidad
        END
    ), 0)
    INTO computed_qty
    FROM movimientos_inventario
    WHERE lote_id = target_lote_id;

    -- Actualizar obligatoriamente el Lote para que refleje esta cantidad
    -- Forzando su estado y una estampa temporal nueva para decirle a Watermelon que se descargue
    UPDATE lotes
    SET 
        cantidad = computed_qty,
        estado = CASE WHEN computed_qty <= 0 THEN false ELSE true END,
        updated_at = (extract(epoch from now()) * 1000)::numeric
    WHERE id = target_lote_id::text;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the trigger to movimientos_inventario table
DROP TRIGGER IF EXISTS trg_aggregate_movimientos_inventario ON movimientos_inventario;
CREATE TRIGGER trg_aggregate_movimientos_inventario
AFTER INSERT OR UPDATE OR DELETE ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION recalculate_lote_quantity();
