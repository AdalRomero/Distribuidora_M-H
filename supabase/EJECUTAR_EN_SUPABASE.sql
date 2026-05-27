-- =====================================================================
-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Orden: 1) Esta migración  2) dynamic_rpc_creator.sql
-- =====================================================================

-- PASO 1: Enum tipo_movimiento
DO $$ BEGIN
  CREATE TYPE tipo_movimiento AS ENUM (
    'entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo',
    'merma', 'transferencia_entrada', 'transferencia_salida',
    'apartado', 'liberacion_apartado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Convertir columna tipo a enum si es TEXT
DO $$
DECLARE col_type text;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='movimientos_inventario' AND column_name='tipo';
  IF col_type IN ('text','character varying') THEN
    ALTER TABLE public.movimientos_inventario
      ALTER COLUMN tipo TYPE tipo_movimiento USING tipo::tipo_movimiento;
  END IF;
END $$;

-- PASO 2: fecha_caducidad como DATE en lotes
DO $$
DECLARE col_type text;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='lotes' AND column_name='fecha_caducidad';
  IF col_type IN ('bigint','integer','numeric') THEN
    ALTER TABLE public.lotes
      ALTER COLUMN fecha_caducidad TYPE date
      USING to_timestamp(fecha_caducidad/1000.0)::date;
  END IF;
END $$;

-- PASO 3: RLS contactos — permitir a usuarios autenticados operar
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contactos_select" ON public.contactos;
DROP POLICY IF EXISTS "contactos_insert" ON public.contactos;
DROP POLICY IF EXISTS "contactos_update" ON public.contactos;
DROP POLICY IF EXISTS "contactos_delete" ON public.contactos;

CREATE POLICY "contactos_select" ON public.contactos FOR SELECT TO authenticated USING (true);
CREATE POLICY "contactos_insert" ON public.contactos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contactos_update" ON public.contactos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "contactos_delete" ON public.contactos FOR DELETE TO authenticated USING (true);

-- PASO 4: Cambiar limite de longitud de lista_precio_base
ALTER TABLE public.clientes ALTER COLUMN lista_precio_base TYPE text;

-- PASO 5: Ejecutar ahora el dynamic_rpc_creator.sql (ver archivo)
-- El script regenera pull_changes y push_changes con SECURITY DEFINER
-- y manejo correcto de enums, fechas y tipos de ID.

SELECT 'Migracion completada exitosamente' AS resultado;
