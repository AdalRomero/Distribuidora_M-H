import { Model, Relation } from '@nozbe/watermelondb'
import { date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Producto from './producto'
import Impuesto from '../bases/impuesto'  

export default class ProductoImpuesto extends Model {
  static table = 'producto_impuestos'
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @relation('impuestos', 'impuesto_id') impuesto!: Relation<Impuesto>
  @readonly @date('created_at') createdAt!: number
}