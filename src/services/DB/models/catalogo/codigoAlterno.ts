import { Model, Relation } from '@nozbe/watermelondb'
import { text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Producto from './producto'

export default class CodigoAlterno extends Model {
  static table = 'codigos_alternos'
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @text('codigo_barras') codigoBarras!: string
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}