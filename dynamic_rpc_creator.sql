DO $$
DECLARE
  table_names text[] := ARRAY[
    'perfiles', 'informacion_perfil', 'permisos', 'familias', 'impuestos', 'almacenes', 'margenes', 'proveedores', 'categorias_clientes', 'clientes', 'contactos', 'precios_especiales_familias_clientes', 'productos', 'producto_impuestos', 'codigos_alternos', 'lotes', 'proveedor_productos', 'precios_especiales_clientes', 'movimientos_inventario', 'documentos', 'documentos_detalles', 'bitacora_errores', 'invoice_templates', 'plantillas_precios', 'reglas_plantilla', 'clientes_plantillas', 'proveedor_contactos', 'sesiones_dispositivo', 'operaciones_documento', 'audit_log'
  ];
  t text;
  c record;
  id_type text;
  pull_sql text;
  push_sql text;
  
  pull_tables text[] := ARRAY[]::text[];
  push_tables text[] := ARRAY[]::text[];
  
  json_args text;
  insert_cols text;
  insert_vals text;
  update_assigns text;
  has_updated_at boolean;
  updated_cond text;
  extra_filter text;
BEGIN

  -- Drop existing pull_changes signatures to prevent overload conflicts
  EXECUTE 'DROP FUNCTION IF EXISTS public.pull_changes(BIGINT);';
  EXECUTE 'DROP FUNCTION IF EXISTS public.pull_changes(BIGINT, TEXT, UUID);';

  pull_sql := 'CREATE OR REPLACE FUNCTION public.pull_changes(last_pulled_at BIGINT, platform TEXT DEFAULT NULL, usuario_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET row_security = off AS $func$ ' ||
              '#variable_conflict use_column ' ||
              'DECLARE _server_time BIGINT; _result JSONB; v_role TEXT; ' ||
              'BEGIN _server_time := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT; ' ||
              'IF pull_changes.usuario_id IS NOT NULL THEN ' ||
              '  SELECT rol INTO v_role FROM public.informacion_perfil WHERE id = pull_changes.usuario_id; ' ||
              'END IF; ' ||
              'IF v_role IS NULL THEN v_role := ''Vendedor''; END IF; ' ||
              '_result := jsonb_build_object(''changes'', jsonb_build_object(';

  push_sql := 'CREATE OR REPLACE FUNCTION public.push_changes(changes JSONB) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET row_security = off AS $func$ ' ||
              'DECLARE record JSONB; record_id text; v_rechazados JSONB := ''[]''::jsonb; ' ||
              'BEGIN ';

  FOREACH t IN ARRAY table_names LOOP
    json_args    := '';
    insert_cols  := '';
    insert_vals  := '';
    update_assigns := '';
    has_updated_at := false;

    -- Detect the actual PostgreSQL type of the "id" column to avoid text = uuid errors
    SELECT udt_name INTO id_type
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t AND column_name = 'id';
    IF id_type IS NULL THEN id_type := 'uuid'; END IF;

    FOR c IN (
      SELECT column_name, data_type, udt_name
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t
       ORDER BY ordinal_position
    ) LOOP

      -- ── PULL direction: build json_args ───────────────────────────────────
      IF c.column_name = 'created_at' OR c.column_name = 'updated_at' THEN
        -- timestamptz → epoch ms
        json_args := json_args || '''' || c.column_name || ''', (EXTRACT(EPOCH FROM ' || c.column_name || ')*1000)::BIGINT, ';
      ELSIF c.data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone') THEN
        -- Any other date/timestamp column → epoch ms (NULL-safe)
        json_args := json_args || '''' || c.column_name || ''', CASE WHEN ' || c.column_name || ' IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM ' || c.column_name || ')*1000)::BIGINT END, ';
      ELSE
        json_args := json_args || '''' || c.column_name || ''', ' || c.column_name || ', ';
      END IF;

      IF c.column_name = 'updated_at' THEN
        has_updated_at := true;
      END IF;

      -- ── PUSH direction: build insert_vals ─────────────────────────────────
      insert_cols := insert_cols || c.column_name || ', ';

      IF c.column_name = 'id' THEN
        -- Cast id to the detected Postgres type (uuid, text, etc.)
        insert_vals := insert_vals || 'CAST(record->>''' || c.column_name || ''' AS ' || id_type || '), ';

      ELSIF c.column_name = 'created_at' OR c.column_name = 'updated_at' THEN
        -- Epoch ms → timestamptz
        insert_vals := insert_vals || 'to_timestamp((record->>''' || c.column_name || ''')::numeric / 1000.0), ';

      ELSIF c.data_type = 'boolean' THEN
        insert_vals := insert_vals || '(record->>''' || c.column_name || ''')::boolean, ';

      ELSIF c.data_type IN ('numeric', 'integer', 'bigint', 'double precision', 'real') THEN
        insert_vals := insert_vals || 'NULLIF(record->>''' || c.column_name || ''', '''')::numeric, ';

      ELSIF c.data_type = 'uuid' THEN
        insert_vals := insert_vals || 'NULLIF(record->>''' || c.column_name || ''', '''')::uuid, ';

      ELSIF c.data_type IN ('jsonb', 'json') THEN
        insert_vals := insert_vals || 'NULLIF(record->>''' || c.column_name || ''', '''')::jsonb, ';

      ELSIF c.data_type = 'USER-DEFINED' THEN
        -- Enum or custom type: cast from text to the specific udt_name
        insert_vals := insert_vals || 'CAST(NULLIF(record->>''' || c.column_name || ''','''') AS ' || c.udt_name || '), ';

      ELSIF c.data_type = 'date' THEN
        -- Handle null, numeric epoch, or ISO date string
        insert_vals := insert_vals || 'CASE
              WHEN (record->>''' || c.column_name || ''') = '''' THEN NULL
              WHEN (record->>''' || c.column_name || ''') ~ ''^[0-9]+$'' THEN to_timestamp((record->>''' || c.column_name || ''')::numeric / 1000.0)::date
              ELSE (record->>''' || c.column_name || ''')::date
            END, ';

      ELSIF c.data_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
        -- Epoch ms → timestamp
        insert_vals := insert_vals || 'CASE WHEN NULLIF(record->>''' || c.column_name || ''', '''') IS NULL THEN NULL ELSE to_timestamp(NULLIF(record->>''' || c.column_name || ''', '''')::numeric / 1000.0) END, ';

      ELSE
        -- Handles text, varchar, char, etc.
        insert_vals := insert_vals || 'NULLIF(record->>''' || c.column_name || ''', ''''), ';
      END IF;

      -- ── PUSH direction: build update_assigns ──────────────────────────────
      IF c.column_name != 'id' AND c.column_name != 'created_at' THEN

        IF c.column_name = 'updated_at' THEN
          update_assigns := update_assigns || c.column_name || ' = to_timestamp((record->>''' || c.column_name || ''')::numeric / 1000.0), ';

        ELSIF c.data_type = 'boolean' THEN
          update_assigns := update_assigns || c.column_name || ' = (record->>''' || c.column_name || ''')::boolean, ';

        ELSIF c.data_type IN ('numeric', 'integer', 'bigint', 'double precision', 'real') THEN
          update_assigns := update_assigns || c.column_name || ' = NULLIF(record->>''' || c.column_name || ''', '''')::numeric, ';

        ELSIF c.data_type = 'uuid' THEN
          update_assigns := update_assigns || c.column_name || ' = NULLIF(record->>''' || c.column_name || ''', '''')::uuid, ';

        ELSIF c.data_type IN ('jsonb', 'json') THEN
          update_assigns := update_assigns || c.column_name || ' = NULLIF(record->>''' || c.column_name || ''', '''')::jsonb, ';

        ELSIF c.data_type = 'USER-DEFINED' THEN
          -- Enum or custom type: cast from text to udt_name
          update_assigns := update_assigns || c.column_name || ' = CAST(NULLIF(record->>''' || c.column_name || ''','''') AS ' || c.udt_name || '), ';

        ELSIF c.data_type = 'date' THEN
          -- Handle null, numeric epoch, or ISO date string for updates
          update_assigns := update_assigns || c.column_name || ' = CASE
              WHEN (record->>''' || c.column_name || ''') = '''' THEN NULL
              WHEN (record->>''' || c.column_name || ''') ~ ''^[0-9]+$'' THEN to_timestamp((record->>''' || c.column_name || ''')::numeric / 1000.0)::date
              ELSE (record->>''' || c.column_name || ''')::date
            END, ';

        ELSIF c.data_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
          update_assigns := update_assigns || c.column_name || ' = CASE WHEN NULLIF(record->>''' || c.column_name || ''', '''') IS NULL THEN NULL ELSE to_timestamp(NULLIF(record->>''' || c.column_name || ''', '''')::numeric / 1000.0) END, ';

        ELSE
          -- Handles text, varchar, etc.
          update_assigns := update_assigns || c.column_name || ' = NULLIF(record->>''' || c.column_name || ''', ''''), ';
        END IF;

      END IF;

    END LOOP;

    -- Trim trailing commas
    json_args      := rtrim(json_args,      ', ');
    insert_cols    := rtrim(insert_cols,    ', ');
    insert_vals    := rtrim(insert_vals,    ', ');
    update_assigns := rtrim(update_assigns, ', ');

    IF has_updated_at THEN
      updated_cond := '(EXTRACT(EPOCH FROM updated_at)*1000) > pull_changes.last_pulled_at AND (EXTRACT(EPOCH FROM created_at)*1000) <= pull_changes.last_pulled_at';
    ELSE
      updated_cond := 'false';
    END IF;

    -- Extra RLS-equivalent filtering per table (applied inside SECURITY DEFINER context)
    IF t IN ('perfiles', 'informacion_perfil', 'permisos') THEN
      extra_filter := '(id = pull_changes.usuario_id OR v_role IN (''Administrador'', ''DEV''))';
    ELSIF t = 'sesiones_dispositivo' THEN
      extra_filter := '(perfil_id = pull_changes.usuario_id OR v_role IN (''Administrador'', ''DEV''))';
    ELSIF t = 'documentos' THEN
      extra_filter := '(usuario_id = pull_changes.usuario_id OR v_role NOT IN (''Vendedor'', ''Empleado''))' ||
                      ' AND (pull_changes.platform IS DISTINCT FROM ''web'' OR created_at > (NOW() - INTERVAL ''30 days''))';
    ELSIF t = 'documentos_detalles' THEN
      extra_filter := '(v_role NOT IN (''Vendedor'', ''Empleado'') OR documento_id IN (SELECT id FROM public.documentos WHERE usuario_id = pull_changes.usuario_id))' ||
                      ' AND (pull_changes.platform IS DISTINCT FROM ''web'' OR documento_id IN (SELECT id FROM public.documentos WHERE created_at > (NOW() - INTERVAL ''30 days'')))';
    ELSIF t = 'operaciones_documento' THEN
      extra_filter := '(usuario_id = pull_changes.usuario_id OR v_role NOT IN (''Vendedor'', ''Empleado''))' ||
                      ' AND (pull_changes.platform IS DISTINCT FROM ''web'' OR documento_id IN (SELECT id FROM public.documentos WHERE created_at > (NOW() - INTERVAL ''30 days'')))';
    ELSIF t = 'movimientos_inventario' THEN
      extra_filter := '(usuario_id = pull_changes.usuario_id OR v_role NOT IN (''Vendedor'', ''Empleado''))' ||
                      ' AND (pull_changes.platform IS DISTINCT FROM ''web'')';
    ELSIF t = 'audit_log' THEN
      extra_filter := 'false'; -- Push-only, pull nothing
    ELSE
      extra_filter := 'true';
    END IF;

    -- Pull logic for table
    pull_tables := array_append(pull_tables,
      '''' || t || ''', jsonb_build_object(' ||
      '''created'', (SELECT COALESCE(jsonb_agg(jsonb_build_object(' || json_args || ')), ''[]''::jsonb) FROM public.' || t || ' WHERE (EXTRACT(EPOCH FROM created_at)*1000) > pull_changes.last_pulled_at AND ' || extra_filter || '), ' ||
      '''updated'', (SELECT COALESCE(jsonb_agg(jsonb_build_object(' || json_args || ')), ''[]''::jsonb) FROM public.' || t || ' WHERE ' || updated_cond || ' AND ' || extra_filter || '), ' ||
      '''deleted'', ''[]''::jsonb)'
    );

    -- Push logic for table
    push_tables := array_append(push_tables,
      'IF changes->''' || t || '''->''created'' IS NOT NULL THEN ' ||
      'FOR record IN SELECT * FROM jsonb_array_elements(changes->''' || t || '''->''created'') LOOP ' ||
      'BEGIN INSERT INTO public.' || t || ' (' || insert_cols || ') VALUES (' || insert_vals || '); ' ||
      'EXCEPTION WHEN OTHERS THEN v_rechazados := v_rechazados || jsonb_build_object(''tabla'', ''' || t || ''', ''id'', record->>''id'', ''accion'', ''created'', ''mensaje'', SQLERRM); END; END LOOP; END IF; ' ||

      'IF changes->''' || t || '''->''updated'' IS NOT NULL THEN ' ||
      'FOR record IN SELECT * FROM jsonb_array_elements(changes->''' || t || '''->''updated'') LOOP ' ||
      'BEGIN UPDATE public.' || t || ' SET ' || update_assigns || ' WHERE id = CAST(record->>''id'' AS ' || id_type || '); ' ||
      'EXCEPTION WHEN OTHERS THEN v_rechazados := v_rechazados || jsonb_build_object(''tabla'', ''' || t || ''', ''id'', record->>''id'', ''accion'', ''updated'', ''mensaje'', SQLERRM); END; END LOOP; END IF; ' ||

      'IF changes->''' || t || '''->''deleted'' IS NOT NULL THEN ' ||
      'FOR record_id IN SELECT * FROM jsonb_array_elements_text(changes->''' || t || '''->''deleted'') LOOP ' ||
      'BEGIN DELETE FROM public.' || t || ' WHERE id = CAST(record_id AS ' || id_type || '); ' ||
      'EXCEPTION WHEN OTHERS THEN v_rechazados := v_rechazados || jsonb_build_object(''tabla'', ''' || t || ''', ''id'', record_id, ''accion'', ''deleted'', ''mensaje'', SQLERRM); END; END LOOP; END IF;'
    );

  END LOOP;

  pull_sql := pull_sql || array_to_string(pull_tables, ', ') || '), ''timestamp'', _server_time); RETURN _result; END; $func$;';

  push_sql := push_sql || array_to_string(push_tables, ' ') || ' RETURN jsonb_build_object(''rechazados'', v_rechazados); END; $func$;';

  EXECUTE pull_sql;
  EXECUTE push_sql;

END $$;
