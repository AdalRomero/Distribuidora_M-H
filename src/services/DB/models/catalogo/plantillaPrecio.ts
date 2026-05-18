import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class PlantillaPrecio extends Model {
  static table = 'plantillas_precios'
  
  @field('nombre') nombre!: string
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
