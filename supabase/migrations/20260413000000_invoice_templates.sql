-- Migración: invoice_templates
-- Crear tabla en Supabase para replicar WatermelonDB

CREATE TABLE IF NOT EXISTS public.invoice_templates (
    id text PRIMARY KEY, -- WatermelonDB usa texto de 16 chars para id
    name text NOT NULL,
    layout_json text NOT NULL,
    is_default boolean DEFAULT false,
    created_at bigint, -- Timestamp epoch usado por WatermelonDB
    updated_at bigint  -- Timestamp epoch usado por WatermelonDB
);

-- Habilitar Row Level Security (RLS) para proteger los templates si corresponde
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" 
ON public.invoice_templates
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
