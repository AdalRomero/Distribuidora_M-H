import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const mySchema = appSchema({
  version: 17,
  tables: [
    // ==================
    // 1. USUARIOS Y PERMISOS
    // ==================
    tableSchema({
      name: "perfiles",
      columns: [
        { name: "usuario", type: "string", isOptional: true },
        { name: "estado", type: "boolean" },
        { name: "hash_local", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "informacion_perfil",
      columns: [
        { name: "nombres", type: "string", isOptional: true },
        { name: "ape_paterno", type: "string", isOptional: true },
        { name: "ape_materno", type: "string", isOptional: true },
        { name: "correo", type: "string" },
        { name: "rol", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "permisos",
      columns: [
        { name: "inventario", type: "boolean" },
        { name: "clientes", type: "boolean" },
        { name: "facturas", type: "boolean" },
        { name: "precios", type: "boolean" },
        { name: "usuarios", type: "boolean" },
        { name: "configuraciones", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ==================
    // 2. CATÁLOGOS INDEPENDIENTES
    // ==================
    tableSchema({
      name: "familias",
      columns: [
        { name: "codigo_familia", type: "string" },
        { name: "nombre", type: "string" },
        { name: "estado", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "impuestos",
      columns: [
        { name: "nombre", type: "string" },
        { name: "tasa", type: "number" },
        { name: "activo", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "almacenes",
      columns: [
        { name: "nombre", type: "string" },
        { name: "estado", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "margenes",
      columns: [
        { name: "nombre", type: "string" },
        { name: "porcentaje", type: "number" },
        { name: "estado", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "proveedores",
      columns: [
        { name: "nombre_comercial", type: "string" },
        { name: "razon_social", type: "string", isOptional: true },
        { name: "rfc", type: "string", isOptional: true },
        { name: "telefono", type: "string", isOptional: true },
        { name: "correo_contacto", type: "string", isOptional: true },
        { name: "estado", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "clientes",
      columns: [
        { name: "nombre", type: "string" },
        { name: "rfc", type: "string", isOptional: true },
        { name: "categoria", type: "string", isOptional: true },
        { name: "lista_precio_base", type: "string" },
        { name: "descuento_global", type: "number" },
        { name: "contacto", type: "string", isOptional: true },
        { name: "calle", type: "string", isOptional: true },
        { name: "colonia", type: "string", isOptional: true },
        { name: "cp", type: "string", isOptional: true },
        { name: "ciudad", type: "string", isOptional: true },
        { name: "estado", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "contactos",
      columns: [
        { name: "cliente_id", type: "string", isIndexed: true },
        { name: "contenido", type: "string" },
        { name: "created_at", type: "number" },
      ],
    }),

    // ==================
    // 3. PRODUCTOS Y DEPENDENCIAS
    // ==================
    tableSchema({
      name: "productos",
      columns: [
        { name: "familia_id", type: "string", isIndexed: true },
        {
          name: "margen_id",
          type: "string",
          isOptional: true,
          isIndexed: true,
        },
        { name: "codigo_interno", type: "string" },
        { name: "descripcion", type: "string" },
        { name: "precio_lista", type: "number" },
        { name: "precio_mayoreo", type: "number" },
        { name: "precio_menudeo", type: "number" },
        { name: "costo_base", type: "number" },
        { name: "ultimo_costo_base", type: "number" },
        { name: "clave_sat", type: "string", isOptional: true },
        { name: "imagen", type: "string", isOptional: true },
        { name: "estado", type: "boolean" }, // BORRADO LÓGICO
        { name: "umbral_verde_dias", type: "number" },
        { name: "umbral_amarillo_dias", type: "number" },
        { name: "umbral_rojo_dias", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "producto_impuestos",
      columns: [
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "impuesto_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "codigos_alternos",
      columns: [
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "codigo_barras", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "lotes",
      columns: [
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "identificador_lote", type: "string" },
        { name: "unidad_medida", type: "string" },
        { name: "costo_adquisicion", type: "number" },
        { name: "fecha_caducidad", type: "number", isOptional: true },
        { name: "estado", type: "boolean" },
        { name: "cantidad", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "proveedor_productos",
      columns: [
        { name: "proveedor_id", type: "string", isIndexed: true },
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "codigo_proveedor", type: "string", isOptional: true },
        { name: "precio_compra", type: "number" },
        { name: "tiempo_entrega_dias", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "precios_especiales_clientes",
      columns: [
        { name: "cliente_id", type: "string", isIndexed: true },
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "descuento_porcentaje", type: "number" },
        { name: "precio_fijo", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ==================
    // 4. TRANSACCIONES E INVENTARIO
    // ==================
    tableSchema({
      name: "movimientos_inventario",
      columns: [
        { name: "almacen_id", type: "string", isIndexed: true },
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "lote_id", type: "string", isIndexed: true, isOptional: true },
        { name: "usuario_id", type: "string", isIndexed: true },
        { name: "tipo", type: "string" },
        { name: "cantidad", type: "number" },
        { name: "created_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "documentos",
      columns: [
        { name: "cliente_id", type: "string", isIndexed: true },
        { name: "usuario_id", type: "string", isIndexed: true },
        { name: "tipo", type: "string" },
        { name: "folio", type: "string", isOptional: true },
        { name: "estado", type: "string" },
        { name: "subtotal", type: "number" },
        { name: "total_impuestos", type: "number" },
        { name: "total", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "documentos_detalles",
      columns: [
        { name: "documento_id", type: "string", isIndexed: true },
        { name: "producto_id", type: "string", isIndexed: true },
        { name: "cantidad", type: "number" },
        { name: "descripcion_aplicada", type: "string", isOptional: true }, // FOTOGRAFÍA DEL NOMBRE
        { name: "precio_unitario_aplicado", type: "number" },
        { name: "descuento_aplicado", type: "number" },
        { name: "json_impuestos_aplicados", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    // ==================
    // 5. AUDITORÍA Y ERRORES
    // ==================
    tableSchema({
      name: "bitacora_errores",
      columns: [
        { name: "tabla_origen", type: "string" }, // ej. 'productos', 'documentos'
        { name: "registro_id", type: "string", isIndexed: true }, // ID del registro problemático
        { name: "accion", type: "string" }, // 'crear', 'editar', 'sincronizar'
        { name: "payload_json", type: "string", isOptional: true }, // Respaldo de los datos para no perderlos
        { name: "mensaje_error", type: "string" }, // Lo que falló (ej. "Código duplicado")
        { name: "estado", type: "string" }, // 'pendiente', 'resuelto', 'ignorado'
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    // ==================
    // 6. CONFIGURACIONES
    // ==================
    tableSchema({
      name: "invoice_templates",
      columns: [
        { name: "name", type: "string" },
        { name: "layout_json", type: "string" },
        { name: "is_default", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
