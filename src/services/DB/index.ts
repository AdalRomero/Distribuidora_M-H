import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { mySchema } from './shema'

import Familia from './models/bases/familia'
import Impuesto from './models/bases/impuesto'
import Almacen from './models/bases/almacen'
import Proveedor from './models/bases/proveedor'
import Cliente from './models/bases/cliente'

import Producto from './models/catalogo/producto'
import CodigoAlterno from './models/catalogo/codigoAlterno'
import Lote from './models/catalogo/lote'
import ProductoImpuesto from './models/catalogo/productoImpuesto'
import ProveedorProducto from './models/catalogo/proveedorProducto'
import PrecioEspecialCliente from './models/catalogo/precioEspecialCliente'

import MovimientoInventario from './models/registros/movimientoInventario'
import Documento from './models/registros/documento'
import DocumentoDetalle from './models/registros/documentoDetalle'

const adapter = new SQLiteAdapter({
  schema: mySchema,
  jsi: true, 
  dbName: 'distribuidora_mh',
  onSetUpError: error => {
    console.error('Error al inicializar WatermelonDB:', error)
  }
})

export const database = new Database({
  adapter,
  modelClasses: [
    Familia,
    Impuesto,
    Almacen,
    Proveedor,
    Cliente,
    
    Producto,
    CodigoAlterno,
    Lote,
    ProductoImpuesto,
    ProveedorProducto,
    PrecioEspecialCliente,
    
    MovimientoInventario,
    Documento,
    DocumentoDetalle
  ],
})