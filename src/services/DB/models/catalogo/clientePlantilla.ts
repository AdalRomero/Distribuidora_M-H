import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class ClientePlantilla extends Model {
  static table = 'clientes_plantillas'

  @field('cliente_id') clienteId!: string
  @field('plantilla_id') plantillaId!: string
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
