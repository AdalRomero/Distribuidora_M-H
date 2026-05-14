import { Model } from '@nozbe/watermelondb'
import { text, field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class CategoriaCliente extends Model {
  static table = 'categorias_clientes'

  @text('nombre') nombre!: string
  @field('estado') estado!: boolean

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
