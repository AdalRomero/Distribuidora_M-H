import { Model, Relation } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Cliente from '../bases/cliente'
import Producto from './producto'

export default class PrecioEspecialCliente extends Model {
  static table = 'precios_especiales_clientes'
  @relation('clientes', 'cliente_id') cliente!: Relation<Cliente>
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @field('descuento_porcentaje') descuentoPorcentaje!: number
  @field('precio_fijo') precioFijo!: number
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}