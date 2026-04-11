import { Model } from '@nozbe/watermelondb'
import { text, field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class Margen extends Model {
  static table = 'margenes'

  @text('nombre') nombre!: string
  @field('porcentaje') porcentaje!: number
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
