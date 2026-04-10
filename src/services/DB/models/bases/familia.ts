import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'
import Producto from '../catalogo/producto'

export default class Familia extends Model {
  static table = 'familias'

  @text('codigo_familia') codigoFamilia!: string
  @text('nombre') nombre!: string
  @field('estado') estado!: boolean

  // Umbrales de aviso de caducidad (en días)
  @field('umbral_verde_dias') umbralVerdeDias!: number    // Default 90 → >90 días = verde
  @field('umbral_amarillo_dias') umbralAmarilloDias!: number // Default 30 → 30-90 días = amarillo
  @field('umbral_rojo_dias') umbralRojoDias!: number      // Default 30 → <30 días = rojo, <=0 = negro

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('productos') productos!: Query<Producto>
}