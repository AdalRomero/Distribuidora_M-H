import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 2, 
  tables: [
    // ==================
    // 1. USUARIOS Y PERMISOS
    // ==================
    tableSchema({
      name: 'perfiles',
      columns: [
        { name: 'usuario', type: 'string', isOptional: true },
        { name: 'estado', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'informacion_perfil',
      columns: [
        { name: 'nombres', type: 'string', isOptional: true },
        { name: 'ape_paterno', type: 'string', isOptional: true },
        { name: 'ape_materno', type: 'string', isOptional: true },
        { name: 'correo', type: 'string' },
        { name: 'rol', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'permisos',
      columns: [
        { name: 'inventario', type: 'boolean' },
        { name: 'clientes', type: 'boolean' },
        { name: 'facturas', type: 'boolean' },
        { name: 'precios', type: 'boolean' },
        { name: 'usuarios', type: 'boolean' },
        { name: 'configuraciones', type: 'boolean' },
        { name: 'multi_usuarios', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'empresas',
      columns: [
        { name: 'distribuidora', type: 'boolean' },
        { name: 'reposteria', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // ==================
    // 2. CATÁLOGOS INDEPENDIENTES
    // ==================
    tableSchema({
      name: 'familias',
      columns: [
        { name: 'codigo_familia', type: 'string' },
        { name: 'nombre', type: 'string' },
        { name: 'estado', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'impuestos',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'tasa', type: 'number' },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'almacenes',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'estado', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'proveedores',
      columns: [
        { name: 'nombre_comercial', type: 'string' },
        { name: 'razon_social', type: 'string', isOptional: true },
        { name: 'rfc', type: 'string', isOptional: true },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'correo_contacto', type: 'string', isOptional: true },
        { name: 'estado', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'clientes',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'lista_precio_base', type: 'string' },
        { name: 'descuento_global', type: 'number' },
        { name: 'estado', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // ==================
    // 3. PRODUCTOS Y DEPENDENCIAS
    // ==================
    tableSchema({
      name: 'productos',
      columns: [
        { name: 'familia_id', type: 'string', isIndexed: true },
        { name: 'codigo_interno', type: 'string' },
        { name: 'descripcion', type: 'string' },
        { name: 'precio_lista', type: 'number' },
        { name: 'precio_mayoreo', type: 'number' },
        { name: 'precio_menudeo', type: 'number' },
        { name: 'estado', type: 'boolean' }, // BORRADO LÓGICO
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'producto_impuestos',
      columns: [
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'impuesto_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'codigos_alternos',
      columns: [
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'codigo_barras', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'lotes',
      columns: [
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'identificador_lote', type: 'string' },
        { name: 'unidad_medida', type: 'string' },
        { name: 'fecha_caducidad', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'proveedor_productos',
      columns: [
        { name: 'proveedor_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'codigo_proveedor', type: 'string', isOptional: true },
        { name: 'precio_compra', type: 'number' },
        { name: 'tiempo_entrega_dias', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'precios_especiales_clientes',
      columns: [
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'descuento_porcentaje', type: 'number' },
        { name: 'precio_fijo', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // ==================
    // 4. TRANSACCIONES E INVENTARIO
    // ==================
    tableSchema({
      name: 'movimientos_inventario',
      columns: [
        { name: 'almacen_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'usuario_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' }, 
        { name: 'cantidad', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'documentos',
      columns: [
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'usuario_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'folio', type: 'string', isOptional: true },
        { name: 'estado', type: 'string' },
        { name: 'subtotal', type: 'number' },
        { name: 'total_impuestos', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'documentos_detalles',
      columns: [
        { name: 'documento_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'cantidad', type: 'number' },
        { name: 'descripcion_aplicada', type: 'string', isOptional: true }, // FOTOGRAFÍA DEL NOMBRE
        { name: 'precio_unitario_aplicado', type: 'number' },
        { name: 'descuento_aplicado', type: 'number' },
        { name: 'json_impuestos_aplicados', type: 'string', isOptional: true }, 
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    })
  ]
})