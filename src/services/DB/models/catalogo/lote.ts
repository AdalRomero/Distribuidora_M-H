import { Model, Relation } from '@nozbe/watermelondb'
import { text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Producto from './producto'

export default class Lote extends Model {
  static table = 'lotes'
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  @text('identificador_lote') identificadorLote!: string
  @text('unidad_medida') unidadMedida!: string
  @date('fecha_caducidad') fechaCaducidad?: number
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}