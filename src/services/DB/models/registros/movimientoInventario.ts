import { Model, Relation } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Almacen from '../bases/almacen'
import Producto from '../catalogo/producto'
import Lote from '../catalogo/lote'
import Documento from './documento'

export default class MovimientoInventario extends Model {
  static table = 'movimientos_inventario'
  static associations = {
    documentos: { type: 'belongs_to' as const, key: 'documento_id' },
  }

  @relation('almacenes', 'almacen_id') almacen!: Relation<Almacen>
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @relation('lotes', 'lote_id') lote!: Relation<Lote> // Relación opcional
  @relation('documentos', 'documento_id') documento!: Relation<Documento>
  @text('usuario_id') usuarioId!: string
  
  @text('tipo') tipo!: string
  @field('cantidad') cantidad!: number
  @field('cantidad_anterior') cantidadAnterior!: number
  @field('cantidad_posterior') cantidadPosterior!: number
  @text('referencia') referencia?: string
  @text('device_id') deviceId?: string
  @readonly @date('created_at') createdAt!: number
}