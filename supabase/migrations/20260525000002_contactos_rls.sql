-- ==============================================================
-- Migration: Add proper RLS policies for table contactos
-- Ejecutar después de habilitar RLS (si aún no está habilitado)
-- ==============================================================

-- 1. Habilitar RLS (si no lo estaba)
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas anteriores (en caso de que existan)
DROP POLICY IF EXISTS contactos_select ON public.contactos;
DROP POLICY IF EXISTS contactos_insert ON public.contactos;
DROP POLICY IF EXISTS contactos_update ON public.contactos;
DROP POLICY IF EXISTS contactos_delete ON public.contactos;

-- 3. Crear políticas permisivas para usuarios autenticados
CREATE POLICY contactos_select ON public.contactos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY contactos_insert ON public.contactos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY contactos_update ON public.contactos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY contactos_delete ON public.contactos
  FOR DELETE TO authenticated
  USING (true);

-- 4. (Opcional) Grant execute on RPC functions to authenticated role
GRANT EXECUTE ON FUNCTION public.pull_changes(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_changes(JSONB) TO authenticated;
