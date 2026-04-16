-- Supabase Migration: Trigger for Lotes Deactivation

-- 1. Create the Function
CREATE OR REPLACE FUNCTION check_lote_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la cantidad nueva es 0 o menor, desactivamos el lote automáticamente
    IF NEW.cantidad <= 0 THEN
        NEW.estado := false;
        -- Opcional: asegurarnos que no baje a números negativos
        NEW.cantidad := 0; 
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS trg_check_lote_status ON lotes;
CREATE TRIGGER trg_check_lote_status
BEFORE INSERT OR UPDATE ON lotes
FOR EACH ROW
EXECUTE FUNCTION check_lote_status();

-- Opcional: Si deseas que 'movimientos_inventario' sea realmente una "vista" de bases centralizadas y no una tabla transaccional:
-- Se tendría que reescribir la lógica de la App local ya que WatermelonDB necesita tablas físicas para funcionar offline.
