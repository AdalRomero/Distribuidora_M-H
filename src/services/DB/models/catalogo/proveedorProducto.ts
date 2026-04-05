import { Model, Relation } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Proveedor from '../bases/proveedor'
import Producto from './producto'

export default class ProveedorProducto extends Model {
  static table = 'proveedor_productos'
  @relation('proveedores', 'proveedor_id') proveedor!: Relation<Proveedor>
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @text('codigo_proveedor') codigoProveedor?: string
  @field('precio_compra') precioCompra!: number
  @field('tiempo_entrega_dias') tiempoEntregaDias!: number
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}