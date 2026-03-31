import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators'

export default class Impuesto extends Model {
  static table = 'impuestos'

  @text('nombre') nombre!: string
  @field('tasa') tasa!: number
  @field('activo') activo!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}