import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class ReglaPlantilla extends Model {
  static table = 'reglas_plantilla'
  
  @field('plantilla_id') plantillaId!: string
  @field('tipo') tipo!: string
  @field('target_id') targetId!: string
  @field('descuento_porcentaje') descuentoPorcentaje!: number
  @field('precio_fijo') precioFijo!: number
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
