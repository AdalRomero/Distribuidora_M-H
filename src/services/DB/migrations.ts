import { schemaMigrations, addColumns, createTable } from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    {
      toVersion: 31,
      steps: [
        // 1. Alter perfiles
        addColumns({
          table: "perfiles",
          columns: [
            { name: "device_id", type: "string", isOptional: true },
            { name: "last_online_at", type: "number", isOptional: true },
            { name: "offline_ttl_hours", type: "number", isOptional: true },
            { name: "cached_permissions_json", type: "string", isOptional: true },
          ],
        }),
        // 2. Create sesiones_dispositivo
        createTable({
          name: "sesiones_dispositivo",
          columns: [
            { name: "perfil_id", type: "string", isIndexed: true },
            { name: "device_id", type: "string" },
            { name: "device_name", type: "string", isOptional: true },
            { name: "last_online_at", type: "number" },
            { name: "offline_ttl_hours", type: "number" },
            { name: "is_active", type: "boolean" },
            { name: "revoked_at", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // 3. Alter familias
        addColumns({
          table: "familias",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 4. Alter impuestos
        addColumns({
          table: "impuestos",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 5. Alter almacenes
        addColumns({
          table: "almacenes",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 6. Alter margenes
        addColumns({
          table: "margenes",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 7. Alter proveedores
        addColumns({
          table: "proveedores",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 8. Alter categorias_clientes
        addColumns({
          table: "categorias_clientes",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 9. Alter clientes
        addColumns({
          table: "clientes",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 10. Alter productos
        addColumns({
          table: "productos",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 11. Alter lotes
        addColumns({
          table: "lotes",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 12. Alter movimientos_inventario
        addColumns({
          table: "movimientos_inventario",
          columns: [
            { name: "documento_id", type: "string", isOptional: true, isIndexed: true },
            { name: "cantidad_anterior", type: "number", isOptional: true },
            { name: "cantidad_posterior", type: "number", isOptional: true },
            { name: "referencia", type: "string", isOptional: true },
            { name: "device_id", type: "string", isOptional: true },
          ],
        }),
        // 13. Alter documentos
        addColumns({
          table: "documentos",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
          ],
        }),
        // 14. Create operaciones_documento
        createTable({
          name: "operaciones_documento",
          columns: [
            { name: "documento_id", type: "string", isIndexed: true },
            { name: "tipo_operacion", type: "string" },
            { name: "usuario_id", type: "string" },
            { name: "device_id", type: "string", isOptional: true },
            { name: "motivo", type: "string", isOptional: true },
            { name: "monto", type: "number", isOptional: true },
            { name: "documento_relacionado_id", type: "string", isOptional: true },
            { name: "metadata_json", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
          ],
        }),
        // 15. Create audit_log
        createTable({
          name: "audit_log",
          columns: [
            { name: "tabla", type: "string", isIndexed: true },
            { name: "registro_id", type: "string", isIndexed: true },
            { name: "accion", type: "string" },
            { name: "usuario_id", type: "string", isIndexed: true },
            { name: "device_id", type: "string" },
            { name: "campos_cambiados", type: "string", isOptional: true },
            { name: "valores_anteriores", type: "string", isOptional: true },
            { name: "valores_nuevos", type: "string", isOptional: true },
            { name: "created_at", type: "number", isIndexed: true },
          ],
        }),
        // 16. Alter invoice_templates
        addColumns({
          table: "invoice_templates",
          columns: [
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 17. Alter plantillas_precios
        addColumns({
          table: "plantillas_precios",
          columns: [
            { name: "_version", type: "number", isOptional: true },
            { name: "updated_by", type: "string", isOptional: true },
            { name: "updated_device", type: "string", isOptional: true },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "deleted_by", type: "string", isOptional: true },
          ],
        }),
        // 18. Create sync_journal
        createTable({
          name: "sync_journal",
          columns: [
            { name: "sync_id", type: "string" },
            { name: "direction", type: "string" },
            { name: "status", type: "string" },
            { name: "tables_affected", type: "string" },
            { name: "records_pulled", type: "number" },
            { name: "records_pushed", type: "number" },
            { name: "records_rejected", type: "number" },
            { name: "conflicts_detected", type: "number" },
            { name: "duration_ms", type: "number" },
            { name: "error_message", type: "string", isOptional: true },
            { name: "device_id", type: "string" },
            { name: "created_at", type: "number" },
          ],
        }),
        // 19. Create stats_cache
        createTable({
          name: "stats_cache",
          columns: [
            { name: "fecha", type: "string" },
            { name: "tipo_metrica", type: "string" },
            { name: "valor", type: "number" },
            { name: "created_at", type: "number" },
          ],
        }),
      ],
    },
  ],
});
