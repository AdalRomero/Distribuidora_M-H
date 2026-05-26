-- ==============================================================
-- Migration: Fix tipos and date handling for movimientos_inventario and lotes
-- ==============================================================

-- 1. Ensure enum tipo_movimiento exists (already created earlier)
DO $$
BEGIN
  CREATE TYPE tipo_movimiento AS ENUM (
    'entrada','salida','ajuste_positivo','ajuste_negativo','merma','transferencia_entrada','transferencia_salida','apartado','liberacion_apartado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Convert "tipo" column to enum
DO $$
BEGIN
  ALTER TABLE public.movimientos_inventario
    ALTER COLUMN tipo TYPE tipo_movimiento USING tipo::tipo_movimiento;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not cast tipo: %', SQLERRM; END $$;

-- 3. Convert "fecha_caducidad" to date (handle numeric epoch or text)
DO $$
BEGIN
  ALTER TABLE public.lotes
    ALTER COLUMN fecha_caducidad TYPE date USING 
      CASE 
        WHEN fecha_caducidad IS NULL THEN NULL
        WHEN pg_typeof(fecha_caducidad)::text IN ('bigint','numeric','integer') THEN to_timestamp(fecha_caducidad/1000)::date
        ELSE fecha_caducidad::date
      END;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not cast fecha_caducidad: %', SQLERRM; END $$;

-- 4. Re‑create RPC functions to pick up new handling (SECURITY DEFINER, row_security off)
\! cat "c:/Users/adal/Documents/Programacion/reactjs/Distribuidora_M-H/dynamic_rpc_creator.sql"

-- 5. Grant execute rights (if not already granted)
GRANT EXECUTE ON FUNCTION public.pull_changes(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_changes(JSONB) TO authenticated;
