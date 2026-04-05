import { Model, Relation } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Almacen from '../bases/almacen'
import Producto from '../catalogo/producto'
import Lote from '../catalogo/lote'

export default class MovimientoInventario extends Model {
  static table = 'movimientos_inventario'

  @relation('almacenes', 'almacen_id') almacen!: Relation<Almacen>
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @relation('lotes', 'lote_id') lote!: Relation<Lote> // Relación opcional
  @text('usuario_id') usuarioId!: string
  
  @text('tipo') tipo!: string
  @field('cantidad') cantidad!: number
  @readonly @date('created_at') createdAt!: number
}