import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators'

export default class PlantillaPrecio extends Model {
  static table = 'plantillas_precios'
  
  @field('nombre') nombre!: string
  @field('estado') estado!: boolean
  @field('_version') version!: number
  @text('updated_by') updatedBy?: string
  @text('updated_device') updatedDevice?: string
  @field('deleted_at') deletedAt?: number
  @text('deleted_by') deletedBy?: string
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
