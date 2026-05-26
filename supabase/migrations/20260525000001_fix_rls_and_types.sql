-- =============================================================================
-- Migración: Fix RLS contactos + Sincronización de tipo_movimiento enum
-- Fecha: 2026-05-25
-- =============================================================================

-- 1. CREAR ENUM tipo_movimiento si no existe (para push_changes)
DO $$ BEGIN
  CREATE TYPE tipo_movimiento AS ENUM (
    'entrada',
    'salida',
    'ajuste_positivo',
    'ajuste_negativo',
    'merma',
    'transferencia_entrada',
    'transferencia_salida',
    'apartado',
    'liberacion_apartado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL; -- ya existe, ignorar
END $$;

-- 2. Si la columna tipo de movimientos_inventario es TEXT, convertirla al enum
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'movimientos_inventario'
     AND column_name  = 'tipo';

  IF col_type = 'text' OR col_type = 'character varying' THEN
    -- Convertir columna de text a enum
    ALTER TABLE public.movimientos_inventario
      ALTER COLUMN tipo TYPE tipo_movimiento
      USING tipo::tipo_movimiento;
  END IF;
END $$;

-- 3. Verificar que la columna fecha_caducidad de lotes es DATE (no BIGINT/numeric)
--    WatermelonDB la envía como epoch ms; el RPC ya hace la conversión correcta.
--    Si está como BIGINT/numeric, convertirla a DATE.
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'lotes'
     AND column_name  = 'fecha_caducidad';

  IF col_type IN ('bigint', 'integer', 'numeric') THEN
    ALTER TABLE public.lotes
      ALTER COLUMN fecha_caducidad TYPE date
      USING to_timestamp(fecha_caducidad / 1000.0)::date;
  END IF;
END $$;

-- 4. CONTACTOS - RLS policies
-- Habilitar RLS si no está habilitado
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas que puedan estar causando conflictos
DROP POLICY IF EXISTS "contactos_select" ON public.contactos;
DROP POLICY IF EXISTS "contactos_insert" ON public.contactos;
DROP POLICY IF EXISTS "contactos_update" ON public.contactos;
DROP POLICY IF EXISTS "contactos_delete" ON public.contactos;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.contactos;

-- Política: usuarios autenticados pueden leer todos los contactos
CREATE POLICY "contactos_select" ON public.contactos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: usuarios autenticados pueden insertar contactos
CREATE POLICY "contactos_insert" ON public.contactos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: usuarios autenticados pueden actualizar contactos
CREATE POLICY "contactos_update" ON public.contactos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: usuarios autenticados pueden eliminar contactos
CREATE POLICY "contactos_delete" ON public.contactos
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. FAMILIAS - Verificar que id es UUID (no text) para evitar "operator does not exist: text = uuid"
--    Esta verificación es informativa; el dynamic_rpc_creator ya detecta el tipo automáticamente.
DO $$
DECLARE
  col_udt text;
BEGIN
  SELECT udt_name INTO col_udt
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'familias'
     AND column_name  = 'id';

  RAISE NOTICE 'familias.id type: %', col_udt;
END $$;

-- 6. Otorgar permisos de ejecución en las funciones RPC al rol authenticated
GRANT EXECUTE ON FUNCTION public.pull_changes(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_changes(JSONB) TO authenticated;
