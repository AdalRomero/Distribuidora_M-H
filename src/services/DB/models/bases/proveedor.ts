import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'
import ProveedorProducto from '../catalogo/proveedorProducto'

export default class Proveedor extends Model {
  static table = 'proveedores'

  @text('nombre_comercial') nombreComercial!: string
  @text('razon_social') razonSocial?: string
  @text('rfc') rfc?: string
  @text('telefono') telefono?: string
  @text('correo_contacto') correoContacto?: string
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('proveedor_productos') productosOfertados!: Query<ProveedorProducto>
}